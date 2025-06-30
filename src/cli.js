#!/usr/bin/env node

import { initializeOptions } from './options.js';
import { contractId, IS_SANDBOX, API_CODEHASH, PHALA_API_KEY, GLOBAL_CONTRACT_HASH, FUNDING_AMOUNT, GAS, DOCKER_TAG, WASM_PATH, masterAccount, contractAccount} from './config.js';
import { restartDocker, dockerImage } from './docker.js';
import { createAccount, deployCustomContract, deployGlobalContract, initContract, approveCodehash } from './near.js';
import { deployPhalaWorkflow, runApiLocally } from './phala.js';

// Setup CLI options
initializeOptions();

async function main() {
    // restart docker service and all networking
    restartDocker();

    // Build and push docker image if in sandbox mode
    let NEW_APP_CODEHASH;
    if (IS_SANDBOX) {
        NEW_APP_CODEHASH = dockerImage(DOCKER_TAG);
        if (!NEW_APP_CODEHASH) {
            return;
        }
    }

    // Create account for contract
    await createAccount(contractId, masterAccount, contractAccount, FUNDING_AMOUNT);

    // Deploy contract
    if (WASM_PATH) {
        await deployCustomContract(contractAccount, WASM_PATH);
    } else { // Deploy global contract
        await deployGlobalContract(contractAccount, GLOBAL_CONTRACT_HASH);
    }

    await initContract(contractAccount, contractId, masterAccount, GAS);

    // NEEDS TO MATCH docker-compose.yaml shade-agent-api-image
    await approveCodehash(masterAccount, contractId, API_CODEHASH, GAS);

    if (IS_SANDBOX) {
        // NEEDS TO MATCH docker-compose.yaml shade-agent-app-image
        await approveCodehash(masterAccount, contractId, NEW_APP_CODEHASH, GAS);

        // Deploy to Phala Cloud
        if (!deployPhalaWorkflow(PHALA_API_KEY, DOCKER_TAG)) {
            return;
        }
    } else {
        // Run API locally
        runApiLocally(API_CODEHASH);
    }
}

main();
