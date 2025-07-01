#!/usr/bin/env node
import { initializeOptions } from './options.js';
import { contractId, IS_SANDBOX, API_CODEHASH, PHALA_API_KEY, GLOBAL_CONTRACT_HASH, DOCKER_TAG, masterAccount, contractAccount} from './config.js';
import { dockerImage, runApiLocally } from './docker.js';
import { createAccount, deployCustomContract, deployGlobalContract, initContract, approveCodehash } from './near.js';
import { deployPhalaWorkflow } from './phala.js';
import { getOptions } from './options.js';

// Setup CLI options
initializeOptions();
const options = getOptions();

async function main() {
    // Builds and pushes the docker image if in sandbox mode
    let NEW_APP_CODEHASH;
    if (IS_SANDBOX && !options.noBuild) {
        NEW_APP_CODEHASH = dockerImage(DOCKER_TAG);
        if (!NEW_APP_CODEHASH) {
            return;
        }
    }

    // Deploy the contract
    if (!options.noDeploy) {
        // Create an account for the contract
        const accountCreated = await createAccount(contractId, masterAccount, contractAccount);
        if (!accountCreated) {
            return;
        }

        let contractDeployed = false;
        if (options.wasm) {
            contractDeployed = await deployCustomContract(contractAccount, options.wasm);
        } else { // Deploy global contract
            contractDeployed = await deployGlobalContract(contractAccount, GLOBAL_CONTRACT_HASH);
        }
        if (!contractDeployed) {
            return;
        }
    }

    // Initialize the contract and approve codehashes
    if (!options.noInit) {
        if (!options.noDeploy) {
            // Initialize the contract
            const contractInitialized = await initContract(contractAccount, contractId, masterAccount);
            if (!contractInitialized) {
                return;
            }
        }

        // Approve the API codehash
        const apiCodehashApproved = await approveCodehash(masterAccount, contractId, API_CODEHASH);
        if (!apiCodehashApproved) {
            return;
        }
    }

    // Approve the app codehash
    if (IS_SANDBOX) {
        if (!options.noInit) {
        const appCodehashApproved = await approveCodehash(masterAccount, contractId, NEW_APP_CODEHASH);
            if (!appCodehashApproved) {
                return;
            }
        }

        if (!options.noPhala) {
            // Deploy the app to Phala Cloud
            if (!deployPhalaWorkflow(PHALA_API_KEY, DOCKER_TAG)) {
                return;
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
