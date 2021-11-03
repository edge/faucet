// Copyright (C) 2021 Edge Network Technologies Limited
// Use of this source code is governed by a GNU GPL-style license
// that can be found in the LICENSE.md file. All rights reserved.

import { API } from './api'
import { Config } from '../config'
import { Storage } from './storage'
import express from 'express'
import http from 'http'
import { Adaptor, Log, LogLevelFromString, LogtailAdaptor, StdioAdaptor } from'@edge/log'

export class Faucet {
  private app: express.Express
  private httpServer: http.Server
  private log: Log
  private storage: Storage

  constructor() {
    // Initialize log
    const adaptors: [Adaptor] = [new StdioAdaptor()]
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

    this.log.info(`Initialized XE Faucet v${Config.version}`)
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
  }
}
