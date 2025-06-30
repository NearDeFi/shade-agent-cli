#!/usr/bin/env node

import { initializeOptions } from './options.js';
import { contractId, IS_SANDBOX, API_CODEHASH, PHALA_API_KEY, GLOBAL_CONTRACT_HASH, FUNDING_AMOUNT, GAS, DOCKER_TAG, WASM_PATH, masterAccount, contractAccount} from './config.js';
import { dockerImage, runApiLocally } from './docker.js';
import { createAccount, deployCustomContract, deployGlobalContract, initContract, approveCodehash } from './near.js';
import { deployPhalaWorkflow } from './phala.js';

// Setup CLI options
initializeOptions();

async function main() {
    // Builds and pushes the docker image if in sandbox mode
    let NEW_APP_CODEHASH;
    if (IS_SANDBOX) {
        NEW_APP_CODEHASH = dockerImage(DOCKER_TAG);
        if (!NEW_APP_CODEHASH) {
            return;
        }
    }

    // Create an account for the contract
    const accountCreated = await createAccount(contractId, masterAccount, contractAccount, FUNDING_AMOUNT);
    if (!accountCreated) {
        return;
    }

    // Deploy the contract
    let contractDeployed = false;
    if (WASM_PATH) {
        contractDeployed = await deployCustomContract(contractAccount, WASM_PATH);
    } else { // Deploy global contract
        contractDeployed = await deployGlobalContract(contractAccount, GLOBAL_CONTRACT_HASH);
    }
    if (!contractDeployed) {
        return;
    }

    // Initialize the contract
    const contractInitialized = await initContract(contractAccount, contractId, masterAccount, GAS);
    if (!contractInitialized) {
        return;
    }

    // Approve the API codehash
    const apiCodehashApproved = await approveCodehash(masterAccount, contractId, API_CODEHASH, GAS);
    if (!apiCodehashApproved) {
        return;
    }

    // Approve the app codehash
    if (IS_SANDBOX) {
        const appCodehashApproved = await approveCodehash(masterAccount, contractId, NEW_APP_CODEHASH, GAS);
        if (!appCodehashApproved) {
            return;
        }

        // Deploy the app to Phala Cloud
        if (!deployPhalaWorkflow(PHALA_API_KEY, DOCKER_TAG)) {
            return;
        }
    } else {
        // Run the API locally
        if (!runApiLocally(API_CODEHASH)) {
            return;
        }
    }
}

main();
