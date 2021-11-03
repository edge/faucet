// Copyright (C) 2021 Edge Network Technologies Limited
// Use of this source code is governed by a GNU GPL-style license
// that can be found in the LICENSE.md file. All rights reserved.

/* eslint-disable max-len */

import Dotenv from 'dotenv'
import { version } from '../package.json'

Dotenv.config()

const ONE_DAY = 86400000

export class Config {
  static readonly httpPort = process.env.HTTP_PORT ? parseInt(process.env.HTTP_PORT) : 8000

  static readonly indexUrl = process.env.INDEX_API_URL || 'https://index.test.network'

  static readonly logLevel = process.env.LOG_LEVEL || 'WARN'
  static readonly logtailEnabled = process.env.LOGTAIL_ENABLED === 'true'
  static readonly logtailSourceToken = process.env.LOGTAIL_SOURCE_TOKEN || ''

  static readonly metricsBearerToken = process.env.METRICS_BEARER_TOKEN || ''

  static readonly minRequestInterval = process.env.MIN_REQUEST_INTERVAL ? parseInt(process.env.MIN_REQUEST_INTERVAL) : ONE_DAY

  static readonly storageDirectory = process.env.STORAGE_DIRECTORY || '.storage'

  static readonly twitterApiKey = process.env.TWITTER_API_KEY || ''
  static readonly twitterSecret = process.env.TWITTER_SECRET || ''
  static readonly twitterBearerToken = process.env.TWITTER_BEARER_TOKEN || ''

  static readonly version = version

  static readonly xeUrl = process.env.XE_API_URL || 'https://xe1.test.network'
  static readonly xeWalletAddress = process.env.XE_WALLET_ADDRESS || ''
  static readonly xeWalletPrivateKey = process.env.XE_WALLET_PRIVATE_KEY || ''
}

export default Config