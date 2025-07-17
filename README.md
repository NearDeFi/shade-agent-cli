# Shade Agent CLI

This CLI tool will let you deploy the Shade Agent API docker image **both** locally and remotely on Phala Cloud.

## Installation

```bash
npm i -g @neardefi/shade-agent-cli
```

#### Create your env file

Create `.env.development.local` in root.

## Using the CLI

Simply run 

```bash
shade-agent-cli
```

in the same directory as your `.env.development.local` and `docker-compose.yaml` files.

## Options 

| Option / Flag                | Description                                                     |
|-----------------------------|------------------------------------------------------------------|
| `-w, --wasm <string>`       | WASM path to deploy custom contract                              |
| `-f, --funding <string>`    | Funding amount for contract account in NEAR                      |
| `-i, --image`               | Just build and push the Docker image                             |
| `-c, --contract`            | Build and push the Docker image, and deploy the contract         |
| `-o, --phala-only`          | Just deploy the app to Phala Cloud                               |
| `-d, --no-redeploy`         | Skip redeploying the contract                                    |
| `-b, --no-build`            | Skip building and pushing the Docker image                       |
| `-p, --no-phala`            | Skip deploying the app to Phala Cloud                            |
| `-e, --no-endpoint`         | Skip printing the endpoint of the app                            |
| `-s, --no-cache`            | Run docker build with --no-cache                                 |

> **Note:** Some options are mutually exclusive. See error messages for details if you use conflicting flags.

## Env Vars

### Local Development (proxy) or Phala Deployment (sandbox) Contract?

#### Local Development

`NEXT_PUBLIC_contractId=ac-proxy.[NEAR_ACCOUNT_ID]` is for local development.

You can test against the shade-agent-api running on your machine (NOT A TEE). The contract at `ac-proxy.[NEAR_ACCOUNT_ID]` does NOT check any attestation information. Although it does make sure your codehashes are approved and has a somewhat similar interface to the real contract.

#### Phala Deployment

`NEXT_PUBLIC_contractId=ac-sandbox.[NEAR_ACCOUNT_ID]` is for remote deployments to Phala Cloud.

These deployments are running in a TEE and the agent contract `ac-sandbox.[NEAR_ACCOUNT_ID]` will be checking the attestation of the TEE. This is a full stack shade agent.

### The Full ENV File

```env
# Get this from near-cli-rs 
NEAR_ACCOUNT_ID=
NEAR_SEED_PHRASE="" 

# ac-proxy.[NEAR_ACCOUNT_ID] for running locally, ac-sandbox.[NEAR_ACCOUNT_ID] for running on Phala Cloud
NEXT_PUBLIC_contractId=ac-proxy.NEAR_ACCOUNT_ID

# Do not change this API codehash, this is the code hash for the shade-agent-api
API_CODEHASH=a86e3a4300b069c08d629a38d61a3d780f7992eaf36aa505e4527e466553e2e5


# FOR PHALA DEPLOYMENTS
# Everything below will be needed for deployments to Phala Cloud

# Your App's code hash, this will update automatically each time you run shade-agent-cli
APP_CODEHASH=03418bb6bc5d35fd8bf3c36f2087ec5206b47e7c93876f265dbd3c7097290381

# Your Docker tag docker_username/image_name
DOCKER_TAG=pivortex/my-app

# Your Phala API key, get from https://cloud.phala.network/dashboard/tokens  
PHALA_API_KEY=
```
## Custom RPC 

To use a non default RPC with the CLI create a `near-rpc.json` file in the same directory as your `docker-compose.yaml` file

```json
{
  "nearRpcProviders": [
    {
      "connectionInfo": {
        "url": "https://neart.lava.build:443"
      },
      "options": {
        "retries": 5,
        "backoff": 2,
        "wait": 1500
      }
    },
    {
      "connectionInfo": {
        "url": "https://test.rpc.fastnear.com"
      },
      "options": {
        "retries": 3,
        "backoff": 2,
        "wait": 1000
      }
    }
  ]
}
```

If required you can specify `headers` under `connectionInfo`.