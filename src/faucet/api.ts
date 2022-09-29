// Copyright (C) 2021 Edge Network Technologies Limited
// Use of this source code is governed by a GNU GPL-style license
// that can be found in the LICENSE.md file. All rights reserved.

/* eslint-disable nonblock-statement-body-position */

import { Config } from '../config'
import { Log } from'@edge/log'
import { Storage } from './storage'
import Twitter from 'twitter'
import { checksumAddressIsValid } from '@edge/wallet-utils'
import cors from 'cors'
import express from 'express'

const twitterRegex = /^https:\/\/twitter\.com\/.*\/status\/(\d+)/
const corsOrigin = new RegExp(Config.corsDomain)

type AuthenticatedRequest = express.Request & {
  token?: string
}

export class API {
  private app: express.Express
  private log: Log
  private storage: Storage
  private twitter: Twitter

  constructor(app: express.Express, storage: Storage, log: Log) {
    this.app = app
    this.log = log
    this.storage = storage

    // Initialize twitter
    this.twitter = new Twitter({
      consumer_key: Config.twitterApiKey,
      consumer_secret: Config.twitterSecret,
      bearer_token: Config.twitterBearerToken
    })

    this.initializeRoutes()
  }

  private initializeRoutes(): void {
    // Middleware
    this.app.use(cors({ origin: corsOrigin }))
    this.app.use(express.json())
    this.app.use(this.logRequest.bind(this))
    this.app.use(this.parseBearerToken)

    // Routes
    this.app.get('/', this.getIndex.bind(this))
    this.app.get('/metrics', this.getMetrics.bind(this))
    this.app.post('/request', this.postRequest.bind(this))

    // Error handlers
    this.app.use(this.notFound)
    this.app.use(this.internalServerError)
  }

  //
  // Middleware
  //
  private logRequest(req: express.Request, res: express.Response, next: express.NextFunction): void {
    const { headers, httpVersion, method, socket, url } = req
    const { remoteAddress, remoteFamily } = socket

    this.log.info(`${method} ${url}`, {
      httpVersion,
      method,
      url,
      remoteAddress,
      remoteFamily,
      userAgent: headers['user-agent']
    })

    next()
  }

  private parseBearerToken(req: AuthenticatedRequest, res: express.Response, next: express.NextFunction): void {
    const bearerHeader = req.headers['authorization']

    if (bearerHeader) {
      const bearer = bearerHeader.split(' ')
      const bearerToken = bearer[1]
      req.token = bearerToken
    }

    next()
  }

  //
  // Routes
  //
  private async getIndex(req: AuthenticatedRequest, res: express.Response): Promise<void> {
    res.json({
      name: 'xe faucet',
      version: Config.version
    })
  }

  private async getMetrics(req: AuthenticatedRequest, res: express.Response): Promise<void> {
    if (!req.token || req.token !== Config.metricsBearerToken) return this.forbidden(req, res)

    const pendingRequests = await this.storage.getCountByPrefix('pending')
    const totalRequests = await this.storage.getCountByPrefix('request')

    const metrics = []
    metrics.push(`pending_requests ${pendingRequests}`)
    metrics.push(`total_requests ${totalRequests}`)
    res.type('txt').send(metrics.join('\n'))
  }

  private async postRequest(req: AuthenticatedRequest, res: express.Response): Promise<void> {
    try {
      const url = req.body && req.body.url

      if (!url) return this.badRequest(req, res, { message: 'missing request url' })
      if (!this.isValidTweetUrl(url)) return this.badRequest(req, res, { message: 'invalid request url' })

      // Check if the tweet has already been processed
      const tweet = await this.storage.get(`url:${url}`)
      if (tweet) return this.badRequest(req, res, { message: 'url already processed' })

      // Use Twitter api to get tweet by status id
      const tweetId = url.match(twitterRegex)[1]
      this.twitter.get(`statuses/show/${tweetId}`, {}, async (error, tweet) => {
        if (error) {
          this.log.error('Error retrieving tweet', { tweetId, error })
          return this.internalServerError(req, res)
        }

        if (!tweet || !tweet.id_str || !tweet.text)
          return this.badRequest(req, res, { message: 'invalid tweet' })

        // Extract valid XE address from tweet body
        const matches = tweet.text.match(/\bxe_[0-9a-f]{40}\b/i)
        const address = matches && matches[0]
        if (!address || !checksumAddressIsValid(address))
          return this.badRequest(req, res, { message: 'tweet does not contain valid xe address' })

        // Ensure address hasn't requested XE recently
        const lastRequestKV = await this.storage.get(`request:${address}`)
        const lastRequest = lastRequestKV ? parseInt(lastRequestKV.value) : 0
        if (lastRequest > Date.now() - Config.requestCooldownMs)
          return this.badRequest(req, res, { message: 'request for address received recently' })

        // Store url, last request time, and enqueue address for processing
        await this.storage.set(`url:${url}`, address)
        await this.storage.set(`pending:${address}`, address)
        await this.storage.set(`request:${address}`, Date.now().toString())

        res.status(200).json({ success: true, message: 'request queued' })
      })
    }
    catch (error) {
      this.log.error('Error handling request', { error })
      return this.serviceUnavailable(req, res)
    }
  }

  private isValidTweetUrl(url: string): boolean {
    const match = url && url.match(twitterRegex)
    return match !== null
  }

  //
  // Error handlers
  //
  private badRequest(req: AuthenticatedRequest, res: express.Response, msg?: Record<string, unknown>): void {
    res.status(400).json({
      error: 'bad request',
      path: req.path,
      ...msg
    })
  }

  private forbidden(req: AuthenticatedRequest, res: express.Response, msg?: Record<string, unknown>): void {
    res.status(403).json({
      error: 'forbidden',
      path: req.path,
      ...msg
    })
  }

  private serviceUnavailable(req: AuthenticatedRequest, res: express.Response, msg?: Record<string, unknown>): void {
    res.status(503).json({
      error: 'service unavailable',
      path: req.path,
      ...msg
    })
  }

  // Express requires msg to be type Object to be used as middleware
  // eslint-disable-next-line @typescript-eslint/ban-types
  private notFound(req: AuthenticatedRequest, res: express.Response, msg?: Object): void {
    res.status(404).json({
      error: 'not found',
      path: req.path,
      ...msg
    })
  }

  // Express requires the next parameter to be present to make this the internal server error handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private internalServerError(req: AuthenticatedRequest, res: express.Response, next?: express.NextFunction): void {
    res.status(500).json({
      error: 'internal server error',
      path: req.path
    })
  }
}
