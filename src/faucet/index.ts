// Copyright (C) 2021 Edge Network Technologies Limited
// Use of this source code is governed by a GNU GPL-style license
// that can be found in the LICENSE.md file. All rights reserved.

import * as xe from '@edge/xe-utils'
import { API } from './api'
import { Config } from '../config'
import { CronJob } from 'cron'
import { Storage } from './storage'
import express from 'express'
import http from 'http'
import { Adaptor, Log, LogLevelFromString, LogtailAdaptor, StdioAdaptor } from'@edge/log'

export class Faucet {
  private app: express.Express
  private httpServer: http.Server
  private job: CronJob
  private log: Log
  private storage: Storage
  private processing = false

  constructor() {
    // Initialize log
    const adaptors: Adaptor[] = [new StdioAdaptor()]
    if (Config.logtailEnabled) adaptors.push(new LogtailAdaptor(Config.logtailSourceToken))
    this.log = new Log(adaptors, 'faucet', LogLevelFromString(Config.logLevel))

    // Initialize storage
    this.log.info('Initializing Storage')
    this.storage = new Storage(this.log.extend('storage'))

    // Initialize API
    this.log.info('Initializing API')
    this.app = express()
    this.httpServer = http.createServer(this.app)
    new API(this.app, this.storage, this.log.extend('api'))

    // Initialize pending request processor
    this.log.info('Initializing Request Processor')
    this.job = new CronJob(Config.requestProcessingInterval,
      this.processPendingRequests.bind(this),
      null, false, 'Europe/London', this)

    // Handle unhandled promises
    process.on('unhandledRejection', (reason: unknown) => {
      this.log.error('Unhandled promise rejection', { reason })
    })

    this.log.info(`Initialized XE Faucet v${Config.version}`)
  }

  private async processPendingRequests(): Promise<void> {
    if (this.processing) return
    this.processing = true

    try {
      const requests = await this.storage.getByPrefix('pending')
      if (!requests || requests.length === 0) {
        this.processing = false
        return
      }

      this.log.info(`Fetching wallet info for faucet wallet ${Config.xeWalletAddress}`)
      const walletInfo = await xe.wallet.infoWithNextNonce(Config.xeUrl, Config.xeWalletAddress)
      const txs = []

      this.log.info(`Processing ${requests.length} pending requests`)
      for (let i = 0; i < requests.length; i++) {
        this.log.info(`Processing pending request ${requests[i].value}`)
        txs.push(xe.tx.sign({
          timestamp: Date.now(),
          sender: Config.xeWalletAddress,
          recipient: requests[i].value,
          amount: Config.requestAmount,
          data: { memo: 'Automated faucet request' },
          nonce: walletInfo.nonce++
        }, Config.xeWalletPrivateKey))
      }

      const response = await xe.tx.createTransactions(Config.xeUrl, txs)
      if (response.results) {
        response.results.forEach(async (r) => {
          if (!r.success) return this.log.error(`Failed to send transaction: ${r.hash}`)

          this.log.info(`Sent transaction ${r.hash}`)
          await this.storage.delete(`pending:${r.recipient}`)
        })
      }

      this.log.info('Finished processing requests')
    }
    catch (error) {
      this.log.error('Error processing request', { error })
    }
    finally {
      this.processing = false
    }
  }

  private async listen(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.httpServer.listen(Config.httpPort, () => {
          this.log.info(`Listening on port ${Config.httpPort}`)
          resolve()
        })
      }
      catch (e) {
        reject(e)
      }
    })
  }

  async start(): Promise<void> {
    await this.listen()
    this.job.start()
  }
}
