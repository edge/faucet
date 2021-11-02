// Copyright (C) 2021 Edge Network Technologies Limited
// Use of this source code is governed by a GNU GPL-style license
// that can be found in the LICENSE.md file. All rights reserved.

import { Config } from '../config'
import { Log } from'@edge/log'
import { checksumAddressIsValid } from '@edge/wallet-utils'
import cors from 'cors'
import express from 'express'

type AuthenticatedRequest = express.Request & {
  token?: string
}

export class API {
  private app: express.Express
  private log: Log
  private requestCount: number

  constructor(app: express.Express, log: Log) {
    this.app = app
    this.log = log

    this.initializeRoutes()
  }

  private initializeRoutes(): void {
    // Middleware
    this.app.use(cors())
    this.app.use(this.logRequest)
    this.app.use(this.parseBearerToken)

    // Routes
    this.app.get('/', this.getIndex)
    this.app.get('/metrics', this.getMetrics.bind(this))

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

    this.requestCount++

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
  private getIndex(req: AuthenticatedRequest, res: express.Response): void {
    res.json({
      name: 'xe faucet',
      version: Config.version
    })
  }

  private getMetrics(req: AuthenticatedRequest, res: express.Response): void {
    if (!req.token || req.token !== Config.metricsBearerToken) return this.forbidden(req, res)

    const metrics = []
    metrics.push(`requests ${this.requestCount}`)
    res.type('txt').send(metrics.join('\n'))

    this.requestCount = 0
  }

  //
  // Faucet requests
  //
  private postRequest(req: AuthenticatedRequest, res: express.Response): void {
    try {
      const address = 'test'
      if (checksumAddressIsValid(address)) return this.badRequest(req, res, { address })

      this.notImplemented(req, res)
    }
    catch (e) {
      this.log.error('postRequest error', e)
      return this.serviceUnavailable(req, res)
    }
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
  private internalServerError(req: AuthenticatedRequest, res: express.Response, next: express.NextFunction): void {
    res.status(500).json({
      error: 'internal server error',
      path: req.path
    })
  }

  private notImplemented(req: AuthenticatedRequest, res: express.Response, msg?: Record<string, unknown>): void {
    res.status(501).json({
      error: 'not implemented',
      path: req.path,
      ...msg
    })
  }
}

module.exports = API
