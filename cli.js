#!/usr/bin/env node

const dir = process.cwd();

/**
 * Setup and docs for commander here
 */

import { program } from 'commander';
program.option('-w, --wasm <string>', 'wasm path to deploy custom contract');
program.parse();
const options = program.opts();
// deploy the contract bytes NOT the global contract if this is set... to any valid wasm file
const WASM_PATH = options.wasm;
/**
 * Continue regular imports
 */

import * as dotenv from 'dotenv';
if (process.env.NODE_ENV !== 'production') {
    // will load for browser and backend
    dotenv.config({ path: `${dir}/.env.development.local` });
} else {
    // load .env in production
    dotenv.config();
}

import fs from 'fs';
import { readFileSync, writeFileSync } from 'fs';
import { spawn, execSync } from 'child_process';
import { parseSeedPhrase } from 'near-seed-phrase';
import { KeyPairSigner } from '@near-js/signers';
import { JsonRpcProvider } from "@near-js/providers";
import { Account } from "@near-js/accounts";
import { NEAR } from "@near-js/tokens";
import { KeyPair } from "@near-js/crypto";
import bs58 from 'bs58';

if (!process.env.NEXT_PUBLIC_contractId) {
    console.log('env var: NEXT_PUBLIC_contractId not found');
    process.exit(-1);
}

const _contractId = process.env.NEXT_PUBLIC_contractId.replaceAll('"', '');
export const contractId = _contractId;

const IS_SANDBOX = /sandbox/gim.test(contractId);

const PHALA_API_KEY = process.env.PHALA_API_KEY;

// default codehash is "proxy" for local development, contract will NOT verify anything in register_worker
const API_CODEHASH = process.env.API_CODEHASH || 'api';
const APP_CODEHASH = process.env.APP_CODEHASH || 'proxy';
const GLOBAL_CONTRACT_HASH = IS_SANDBOX
    ? '31x2yS1DZHUjMQQFXPBjbfojb4FQ8pBaER39YoReTpJb'
    : '2pSLLgLnAM9PYD7Rj6SpdK9tJRz48GQ7GrnAXK6tmm8u';
const FUNDING_AMOUNT = WASM_PATH ? NEAR.toUnits('5') : NEAR.toUnits('1');
const GAS = BigInt('300000000000000');

// local vars for module
export const networkId = /testnet/gi.test(contractId) ? 'testnet' : 'mainnet';
// setup keystore, set funding account and key
let _accountId = process.env.NEAR_ACCOUNT_ID.replaceAll('"', '');
// console.log('accountId, contractId', _accountId, _contractId);
const { secretKey } = parseSeedPhrase(
    process.env.NEAR_SEED_PHRASE.replaceAll('"', ''),
);
const keyPair = KeyPair.fromString(secretKey);
const signer = new KeyPairSigner(keyPair);

const provider = new JsonRpcProvider({ 
    url: networkId === 'testnet' 
        ? "https://test.rpc.fastnear.com" 
        : "https://free.rpc.fastnear.com" 
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const getAccount = (id = _accountId) => new Account(id, provider, signer);

// output CLI options before calling main
console.log('CLI OPTIONS SET:\n\n', options, '\n\n');

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
                `sudo docker build --no-cache --platform=linux/amd64 -t ${process.env.DOCKER_TAG}:latest .`,
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
                `sudo docker push ${process.env.DOCKER_TAG}`,
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
                process.env.DOCKER_TAG +
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

    const accountId = _accountId;
    try {
        const account = getAccount(contractId);
        await account.deleteAccount(accountId);
    } catch (e) {
        console.log('error deleteAccount', e);
    }

    console.log('contract account deleted:', contractId);
    await sleep(1000);

    try {
        const account = getAccount(accountId);
        await account.createAccount(
            contractId,
            keyPair.getPublicKey(),
            FUNDING_AMOUNT,
        );
    } catch (e) {
        console.log('error createAccount', e);
    }

    console.log('contract account created:', contractId);
    await sleep(1000);

    let account = getAccount(contractId);
    if (WASM_PATH) {
        // deploys the contract bytes (original method and requires more funding)
        const file = fs.readFileSync(WASM_PATH);
        await account.deployContract(file);
        console.log('deployed bytes', file.byteLength);
        const balance = await account.getBalance();
        console.log('contract balance', balance);
    } else {
        // deploys global contract using near-js
        try {
            // convert base58 to hex
            const hexHash = Buffer.from(bs58.decode(GLOBAL_CONTRACT_HASH)).toString('hex');
            await account.useGlobalContract({codeHash: hexHash});
        } catch (e) {
            console.log('Error deploying global contract', e);
        }
    }

    console.log('contract deployed:', contractId);
    await sleep(1000);

    const initRes = await account.callFunction({
        contractId,
        methodName: 'init',
        args: {
            owner_id: accountId,
        },
        gas: GAS,
    });
    console.log('initRes', initRes);

    await sleep(1000);

    // NEEDS TO MATCH docker-compose.yaml shade-agent-api-image
    account = getAccount(accountId);
    const approveApiRes = await account.callFunction({
        contractId,
        methodName: 'approve_codehash',
        args: {
            codehash: API_CODEHASH,
        },
        gas: GAS,
    });
    console.log('approveApiRes', approveApiRes);

    await sleep(1000);

    if (IS_SANDBOX) {
        // NEEDS TO MATCH docker-compose.yaml shade-agent-app-image
        account = getAccount(accountId);
        const approveAppRes = await account.callFunction({
            contractId,
            methodName: 'approve_codehash',
            args: {
                codehash: NEW_APP_CODEHASH,
            },
            gas: GAS,
        });
        console.log('approveAppRes', approveAppRes);

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
        const appNameSplit = process.env.DOCKER_TAG.split('/');
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
            const child = spawn(
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
