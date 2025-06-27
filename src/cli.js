#!/usr/bin/env node

import { initializeOptions } from './options.js';
import fs from 'fs';
import { readFileSync, writeFileSync } from 'fs';
import { spawn, execSync } from 'child_process';
import bs58 from 'bs58';
import { contractId, IS_SANDBOX, API_CODEHASH, PHALA_API_KEY, GLOBAL_CONTRACT_HASH, FUNDING_AMOUNT, GAS, DOCKER_TAG, WASM_PATH, masterAccount, contractAccount} from './config.js';

// Setup CLI options
initializeOptions();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
    // restart docker service and all networking

    console.log('docker restarting...');
    if (process.platform === 'darwin') {
        try {
            execSync(`docker restart $(docker ps -q)`);
            console.log('docker restarted');
        } catch (e) {
            console.warn('WARNING: Error restarting docker service');
        }
    } else {
        try {
            execSync(`sudo systemctl restart docker`);
            console.log('docker restarted');
        } catch (e) {
            console.warn('WARNING: Error restarting docker service');
        }
    }

    let NEW_APP_CODEHASH;
    if (IS_SANDBOX) {
        // docker image build

        console.log('docker building image...');
        try {
            execSync(
                `sudo docker build --no-cache --platform=linux/amd64 -t ${DOCKER_TAG}:latest .`,
            );
        } catch (e) {
            console.log('Error docker build', e);
            return;
        }
        console.log('docker image built');

        // docker hub push and get codehash

        console.log('docker pushing image...');
        try {
            const output = execSync(
                `sudo docker push ${DOCKER_TAG}`,
            );
            NEW_APP_CODEHASH = output
                .toString()
                .match(/sha256:[a-f0-9]{64}/gim)[0]
                .split('sha256:')[1];
        } catch (e) {
            console.log('Error docker push', e);
            return;
        }
        console.log('docker image pushed');
        // replace codehash in .env.development.local

        try {
            const path = '.env.development.local';
            const data = readFileSync(path).toString();
            const match = data.match(/APP_CODEHASH=[a-f0-9]{64}/gim)[0];
            const updated = data.replace(
                match,
                `APP_CODEHASH=${NEW_APP_CODEHASH}`,
            );
            writeFileSync(path, updated, 'utf8');
        } catch (e) {
            console.log(
                'Error replacing codehash in .env.development.local',
                e,
            );
            return;
        }
        console.log('codehash replaced in .env.development.local');

        // replace codehash in docker-compose.yaml

        try {
            const path = 'docker-compose.yaml';
            let data = readFileSync(path).toString();
            const match = data.match(/@sha256:[a-f0-9]{64}/gim)[1];
            const replacementHash = `@sha256:${NEW_APP_CODEHASH}`;
            data = data.replace(match, replacementHash);
            const index = data.indexOf(replacementHash);
            const lastIndex = data.lastIndexOf('image:', index);
            data =
                data.slice(0, lastIndex) +
                `image: ` +
                DOCKER_TAG +
                data.slice(index);
            writeFileSync(path, data, 'utf8');
        } catch (e) {
            console.log('Error replacing codehash in docker-compose.yaml', e);
            return;
        }
        console.log('codehash replaced in docker-compose.yaml');
    }
    /**
     * Deploying Global Contract
     */

    try {
        await contractAccount.deleteAccount(masterAccount.accountId);
    } catch (e) {
        console.log('error deleteAccount', e);
    }

    console.log('contract account deleted:', contractId);
    await sleep(1000);

    try {
        await masterAccount.createAccount(
            contractId,
            await masterAccount.getSigner().getPublicKey(),
            FUNDING_AMOUNT,
        );
    } catch (e) {
        console.log('error createAccount', e);
    }

    console.log('contract account created:', contractId);
    await sleep(1000);

    if (WASM_PATH) {
        // deploys the contract bytes (original method and requires more funding)
        const file = fs.readFileSync(WASM_PATH);
        await contractAccount.deployContract(file);
        console.log('deployed bytes', file.byteLength);
        const balance = await contractAccount.getBalance();
        console.log('contract balance', balance);
    } else {
        // deploys global contract using near-js
        try {
            // convert base58 to hex
            const hexHash = Buffer.from(bs58.decode(GLOBAL_CONTRACT_HASH)).toString('hex');
            await contractAccount.useGlobalContract({codeHash: hexHash});
        } catch (e) {
            console.log('Error deploying global contract', e);
        }
    }

    console.log('contract deployed:', contractId);
    await sleep(1000);

    const initRes = await contractAccount.functionCall({
        contractId,
        methodName: 'init',
        args: {
            owner_id: masterAccount.accountId,
        },
        gas: GAS,
    });
    console.log('Contract init result', initRes.status.SuccessValue === '');

    await sleep(1000);

    // NEEDS TO MATCH docker-compose.yaml shade-agent-api-image
    const approveApiRes = await masterAccount.functionCall({
        contractId,
        methodName: 'approve_codehash',
        args: {
            codehash: API_CODEHASH,
        },
        gas: GAS,
    });
    console.log('Approve API codehash result', approveApiRes.status.SuccessValue === '');

    await sleep(1000);

    if (IS_SANDBOX) {
        // NEEDS TO MATCH docker-compose.yaml shade-agent-app-image
        const approveAppRes = await masterAccount.functionCall({
            contractId,
            methodName: 'approve_codehash',
            args: {
                codehash: NEW_APP_CODEHASH,
            },
            gas: GAS,
        });
        console.log('Approve App codehash result', approveAppRes.status.SuccessValue === '');

        /**
         * Deploy on Phala
         */

        console.log('logging in to Phala Cloud...');
        try {
            execSync(`phala auth login ${PHALA_API_KEY}`);
        } catch (e) {
            console.log('Error authenticating with Phala Cloud', e);
            return;
        }

        console.log('deploying to Phala Cloud...');
        const appNameSplit = DOCKER_TAG.split('/');
        const appName = appNameSplit[appNameSplit.length - 1];
        try {
            execSync(
                `phala cvms create --name ${appName} --vcpu 1 --compose ./docker-compose.yaml --env-file ./.env.development.local`,
            );
        } catch (e) {
            console.log('Error deploying to Phala Cloud', e);
            return;
        }
        console.log('deployed to Phala Cloud');
    } else {
        /**
         * Run api locally so app can use it
         */

        console.log(
            'running shade-agent-api in docker locally at http://localhost:3140',
        );
        try {
            spawn(
                `sudo`,
                `docker run -p 0.0.0.0:3140:3140 --platform=linux/amd64 --env-file .env.development.local --rm -e PORT=3140 mattdlockyer/shade-agent-api@sha256:${API_CODEHASH}`.split(
                    ' ',
                ),
                {
                    cwd: process.cwd(),
                    stdio: 'inherit',
                },
            );
        } catch (e) {
            console.log(e);
        }
    }
}

main();
