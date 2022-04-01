// Copyright (C) 2021 Edge Network Technologies Limited
// Use of this source code is governed by a GNU GPL-style license
// that can be found in the LICENSE.md file. All rights reserved.

/* eslint-disable max-len */

import Dotenv from 'dotenv'
import { version } from '../package.json'

Dotenv.config()

const ONE_DAY_MS = 86400000

export class Config {
  static readonly corsDomain = process.env.CORS_DOMAIN || '*'

  static readonly httpPort = process.env.HTTP_PORT ? parseInt(process.env.HTTP_PORT) : 8000

  static readonly logLevel = process.env.LOG_LEVEL || 'WARN'
  static readonly logtailEnabled = process.env.LOGTAIL_ENABLED === 'true'
  static readonly logtailSourceToken = process.env.LOGTAIL_SOURCE_TOKEN || ''

  static readonly metricsBearerToken = process.env.METRICS_BEARER_TOKEN || ''

  static readonly newrelicApiKey = process.env.NEWRELIC_API_KEY || ''
  static readonly newrelicUrl = process.env.NEWRELIC_URL || undefined

  static readonly requestAmount = process.env.REQUEST_AMOUNT ? parseInt(process.env.REQUEST_AMOUNT) : 2500 * 1e6
  static readonly requestCooldownMs = process.env.REQUEST_COOLDOWN_MS ? parseInt(process.env.REQUEST_COOLDOWN_MS) : ONE_DAY_MS
  static readonly requestProcessingInterval = process.env.REQUEST_PROCESSING_INTERVAL || '* * * * *'

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
