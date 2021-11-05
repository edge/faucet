# Copyright (C) 2021 Edge Network Technologies Limited
# Use of this source code is governed by a GNU GPL-style license
# that can be found in the LICENSE.md file. All rights reserved.

FROM node:lts AS build
RUN npm install -g pkg-fetch

# Configure, download target Node base binary
ARG targetNode=node16
ARG targetPlatform=alpine
ARG targetArch=x64
RUN pkg-fetch -n ${targetNode} -p ${targetPlatform} -a ${targetArch}

WORKDIR /build

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy and transpile app src
COPY src ./src
COPY tsconfig.json ./
RUN npm run build:src

# Package binary
RUN npx pkg . \
  --target $targetNode-$targetPlatform-$targetArch \
  --output bin/faucet

# Copy binary to clean alpine image
FROM alpine:latest
COPY --from=build /build/bin/faucet /usr/local/bin/faucet

ENTRYPOINT ["faucet"]
CMD [""]
