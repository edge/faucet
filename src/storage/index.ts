// Copyright (C) 2021 Edge Network Technologies Limited
// Use of this source code is governed by a GNU GPL-style license
// that can be found in the LICENSE.md file. All rights reserved.

/* eslint-disable nonblock-statement-body-position */

import { Config } from '../config'
import { Log } from'@edge/log'
import leveldown from 'leveldown'
import mkdirp from 'mkdirp'
import levelup, { LevelUp } from 'levelup'

export type KeyValue = {
  key: string
  value: string
}

export class Storage {
  private log: Log
  private db: LevelUp

  constructor(log: Log) {
    this.log = log

    // Initialize the database
    mkdirp.sync(Config.storageDirectory)
    this.db = levelup(leveldown(`${Config.storageDirectory}/faucet.db`))
  }

  public async get(key: string): Promise<KeyValue | undefined> {
    try {
      const value = await this.db.get(key)
      return { key, value }
    }
    catch (e) {
      // This is expected if the key doesn't exist
      return undefined
    }
  }

  public async getByPrefix(prefix: string): Promise<KeyValue[] | undefined> {
    try {
      return await new Promise((resolve, reject) => {
        const keys: string[] = []
        this.db.createKeyStream()
          .on('data', (data) => {
            const key = data.toString()
            const keyParts = key.split(':')
            const keyPrefix = keyParts.length > 1 && keyParts[0]
            if (keyPrefix && keyPrefix === prefix) keys.push(key)
          })
          .on('error', (err) => reject(err))
          .on('end', async () => {
            const results: KeyValue[] = []
            for (const key of keys) {
              const value = await this.db.get(key, { asBuffer: false })
              results.push({ key, value })
            }
            resolve(results)
          })
      })
    }
    catch (error) {
      this.log.error(`Error getting keys with prefix ${prefix} from storage`, { error })
      return undefined
    }
  }

  public async getCountByPrefix(prefix: string): Promise<number> {
    try {
      return await new Promise((resolve, reject) => {
        const keys: string[] = []
        this.db.createKeyStream()
          .on('data', (data) => {
            const key = data.toString()
            const keyParts = key.split(':')
            const keyPrefix = keyParts.length > 1 && keyParts[0]
            if (keyPrefix && keyPrefix === prefix) keys.push(key)
          })
          .on('error', (err) => reject(err))
          .on('end', async () => resolve(keys.length))
      })
    }
    catch (error) {
      this.log.error(`Error getting count of keys with prefix ${prefix} from storage`, { error })
      return 0
    }
  }

  public async set(key: string, value: string): Promise<void> {
    try {
      const data = typeof value === 'object' ? JSON.stringify(value) : value
      await this.db.put(key, data)
    }
    catch (error) {
      this.log.error(`Error setting ${key} in storage`, { error })
    }
  }
}
