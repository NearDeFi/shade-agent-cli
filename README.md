# Shade Agent CLI

## Installation

```
npm i -g @neardefi/shade-agent-cli
```

Create `.env.development.local` in root.

## Env Vars

Note:

-   ac-proxy.[YOUR_NEAR_ACCOUNT_ID] == local development e.g. yarn dev/start and testing against shade-agent-api running on your machine (NOT A TEE)
-   ac-sandbox.[YOUR_NEAR_ACCOUNT_ID] == remote deployment to Phala Cloud, running in a TEE

```bash
# get this from cargo-near or near-cli-rs
NEAR_ACCOUNT_ID=...
NEAR_SEED_PHRASE="..." # will need quotes around seed phrase
# ac-proxy is running locally so you can use yarn dev/start and test your app against the locally running shade agent api
NEXT_PUBLIC_contractId=ac-proxy.[YOUR_NEAR_ACCOUNT_ID (from above)]
# including this will give you a fixed account every time, remove for production use as each TEE should boot with a new ephemeral NEAR account ID
ENTROPY=foobar
# do not change the api codehash, this is the shade-agent-api
API_CODEHASH=1952010c00a8b59bc91d9fe3429f45cb97003e67d6dade554dac7231caa65ab5
# SANDBOX: this will update automatically each time you deploy to Phala with a new image of your app pushed to docker hub
APP_CODEHASH=e25f360bca7ebc6822536d9af2ce926582277e54f37e8c0855bccbf74aac1731
# SANDBOX: what is the docker tag of your app? used for sandbox deployments on Phala
DOCKER_TAG=mattdlockyer/shade-agent-api-test
# SANDBOX: you will need your own Phala API KEY
PHALA_API_KEY=...
```

## Running

```bash
yarn shade-agent-cli
```

## Test the Endpoints

-   http://localhost:3140/api/address
-   http://localhost:3140/api/test-sign
