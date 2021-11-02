// Copyright (C) 2021 Edge Network Technologies Limited
// Use of this source code is governed by a GNU GPL-style license
// that can be found in the LICENSE.md file. All rights reserved.

import { API } from '../api'
import { Config } from '../config'
import express from 'express'
import http from 'http'
import { Adaptor, Log, LogLevelFromString, LogtailAdaptor, StdioAdaptor } from'@edge/log'

export class Faucet {
  private api: API
  private app: express.Express
  private log: Log
  private httpServer: http.Server

  constructor() {
    this.initializeLog()
    this.initializeAPI()
    this.log.info(`Initialized XE Faucet v${Config.version}`)
  }

  private initializeLog(): void {
    const adaptors: [Adaptor] = [new StdioAdaptor()]
    if (Config.logtailEnabled) adaptors.push(new LogtailAdaptor(Config.logtailSourceToken))
    this.log = new Log(adaptors, 'faucet', LogLevelFromString(Config.logLevel))
  }

  private initializeAPI(): void {
    this.app = express()
    this.httpServer = http.createServer(this.app)
    this.api = new API(this.app, this.log.extend('api'))
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
    this.log.info('Starting...')
    await this.listen()
  }
}
