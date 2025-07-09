#!/usr/bin/env node
import { contractId, IS_SANDBOX, API_CODEHASH, APP_CODEHASH, PHALA_API_KEY, GLOBAL_CONTRACT_HASH, DOCKER_TAG, masterAccount, contractAccount} from './config.js';
import { dockerImage, runApiLocally } from './docker.js';
import { createAccount, deployCustomContract, deployGlobalContract, initContract, approveCodehash } from './near.js';
import { deployPhalaWorkflow, getAppUrl } from './phala.js';
import { getOptions } from './options.js';
import { versionCheck } from './version-check.js';

// Get CLI options
const options = getOptions();

async function main() {
    // Version check 
    await versionCheck();

    // Deploy the app to Phala Cloud if --phala-only is set
    if (options.phalaOnly) {
        const appId = await deployPhalaWorkflow(PHALA_API_KEY, DOCKER_TAG);
        if (!appId) {
            return;
        }
        if (options.endpoint) {
            await getAppUrl(appId, PHALA_API_KEY);
        }
        return;
    }

    // Builds and pushes the docker image if in sandbox mode
    let NEW_APP_CODEHASH;
    if (IS_SANDBOX) {
        if (options.build) {
            NEW_APP_CODEHASH = dockerImage(DOCKER_TAG, options.cache ? '' : '--no-cache');
            if (!NEW_APP_CODEHASH) {
                return;
            }
        } else {
            NEW_APP_CODEHASH = APP_CODEHASH;
        }
    }

    // Stop if --image is set
    if (options.image) {
        return;
    }

    // Create an account for the contract
    const accountCreated = await createAccount(contractId, masterAccount, contractAccount);
    if (!accountCreated) {
        return;
    }

    // Deploy the contract
    let contractDeployed = false;
    if (options.wasm) { // Deploy custom contract
        contractDeployed = await deployCustomContract(contractAccount, options.wasm);
    } else { // Deploy global contract
        contractDeployed = await deployGlobalContract(contractAccount, GLOBAL_CONTRACT_HASH);
    }
    if (!contractDeployed) {
        return;
    }

    // Stop if --contract is set
    if (options.contract) {
        return;
    }

    // Initialize the contract
    const contractInitialized = await initContract(contractAccount, contractId, masterAccount);
    if (!contractInitialized) {
        return;
    }

    // Approve the API codehash
    const apiCodehashApproved = await approveCodehash(masterAccount, contractId, API_CODEHASH);
    if (!apiCodehashApproved) {
        return;
    }

    // Approve the app codehash
    if (IS_SANDBOX) {
        const appCodehashApproved = await approveCodehash(masterAccount, contractId, NEW_APP_CODEHASH);
        if (!appCodehashApproved) {
            return;
        }
        
        if (options.phala) {
            // Deploy the app to Phala Cloud
            const appId = await deployPhalaWorkflow(PHALA_API_KEY, DOCKER_TAG);
            if (!appId) {
                return;
            }
            // Print the endpoint of the app
            if (options.endpoint) {
                await getAppUrl(appId, PHALA_API_KEY);
            }
        }
    } else {
        // Run the API locally
        if (!runApiLocally(API_CODEHASH)) {
            return;
        }
    }
}

main();
