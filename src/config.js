import { getOptions, initializeOptions } from './options.js';
import { readFileSync, writeFileSync } from 'fs';
import * as dotenv from 'dotenv';
import { parseSeedPhrase } from 'near-seed-phrase';
import { KeyPairSigner } from '@near-js/signers';
import { JsonRpcProvider, FailoverRpcProvider } from "@near-js/providers";
import { Account } from "@near-js/accounts";
import { NEAR } from "@near-js/tokens";

// Set up CLI options
initializeOptions();
const options = getOptions();

if (process.env.NODE_ENV !== 'production') {
    // will load for browser and backend
    const dir = process.cwd();
    dotenv.config({ path: `${dir}/.env.development.local` });
} else {
    // load .env in production
    dotenv.config();
}

if (!process.env.NEAR_ACCOUNT_ID) {
    console.log('Make sure you have set the NEAR_ACCOUNT_ID in .env.development.local');
    process.exit(1);
}
export const accountId = process.env.NEAR_ACCOUNT_ID;

if (!process.env.NEAR_SEED_PHRASE) {
    console.log('Make sure you have set the NEAR_SEED_PHRASE in .env.development.local');
    process.exit(1);
}
export const { secretKey } = parseSeedPhrase(
    process.env.NEAR_SEED_PHRASE
);

if (!process.env.NEXT_PUBLIC_contractId) {
    console.log('Make sure you have set the NEXT_PUBLIC_contractId in .env.development.local');
    process.exit(1);
}
export const contractId = process.env.NEXT_PUBLIC_contractId;

if (!process.env.API_CODEHASH) {
    console.log('Make sure you have set the API_CODEHASH in .env.development.local');
    process.exit(1);
}
export const API_CODEHASH = process.env.API_CODEHASH;

if (!options.build) {
    if (!process.env.APP_CODEHASH) {
        console.log('Make sure you have set the APP_CODEHASH in .env.development.local');
        process.exit(1);
    }
}
export const APP_CODEHASH = process.env.APP_CODEHASH;


if (!process.env.DOCKER_TAG) {
    console.log('Make sure you have set the DOCKER_TAG in .env.development.local');
    process.exit(1);
}
export const DOCKER_TAG = process.env.DOCKER_TAG;

// Set IS_SANDBOX to true if the contract ID prefix is 'ac-sandbox'
// If the contract ID prefix is 'ac-proxy', set IS_SANDBOX to false
// If the contract ID prefix is not 'ac-sandbox' or 'ac-proxy', exit with an error
const prefix = contractId.split('.')[0];
if (!['ac-sandbox', 'ac-proxy'].includes(prefix)) {
    console.error(`Invalid contract ID prefix: ${prefix}. Expected 'ac-sandbox' or 'ac-proxy'`);
    process.exit(1);
}
export const IS_SANDBOX = prefix === 'ac-sandbox';

if (IS_SANDBOX && options.phala) { // Don't require PHALA_API_KEY if in local or if phala is turned off
    if (!process.env.PHALA_API_KEY) {
        console.log('Make sure you have set the PHALA_API_KEY in .env.development.local');
        process.exit(1);
    }
}
export const PHALA_API_KEY = process.env.PHALA_API_KEY;

// Hash of the global contract for sandbox or proxy
export const GLOBAL_CONTRACT_HASH = IS_SANDBOX
    ? 'GMXJXnVK9vYd7CSYPtbA56rPau2h5J4YjsSsCfegGi4G' // Sandbox
    : 'Du58nfK5sfXPjyqsuju327tVJWtBYap2WdTSbimsfRrP'; // Proxy

// NEAR configuration and signer
const networkId = /testnet/gi.test(contractId) ? 'testnet' : 'mainnet';
const signer = KeyPairSigner.fromSecretKey(secretKey);


// Function to create the default RPC provider
function createDefaultProvider() {
    return new JsonRpcProvider(
    {
        url: networkId === 'testnet'
            ? "https://test.rpc.fastnear.com"
            : "https://free.rpc.fastnear.com"
    },
    {
        retries: 3,
        backoff: 2,
        wait: 1000,
    }
    );
}

// Function to update the .env.development.local file with the NEAR_RPC_JSON variable
function updateEnvFile(nearRpcProvidersJson) {
    const path = '.env.development.local';
    const data = readFileSync(path).toString();

    if (nearRpcProvidersJson.nearRpcProviders) {
        // Add or update NEAR_RPC_JSON
        const envValue = JSON.stringify(nearRpcProvidersJson);
        const quotedEnvValue = `'${envValue}'`;
        
        const updated = data.includes('NEAR_RPC_JSON=')
            ? data.replace(/NEAR_RPC_JSON=.*/g, `NEAR_RPC_JSON=${quotedEnvValue}`)
            : data + `\nNEAR_RPC_JSON=${quotedEnvValue}`;
        
        writeFileSync(path, updated, 'utf8');
        console.log('NEAR_RPC_JSON updated in .env.development.local');
    } else {
        // Remove NEAR_RPC_JSON if it exists
        const updated = data.replace(/NEAR_RPC_JSON=.*\n?/g, '');
        writeFileSync(path, updated, 'utf8');
    }
}

// Sets the RPC provider
let provider;
try {
    const nearRpcProviders = readFileSync('./near-rpc.json', 'utf8');
    const nearRpcProvidersJson = JSON.parse(nearRpcProviders);
    updateEnvFile(nearRpcProvidersJson);
    if (nearRpcProvidersJson.nearRpcProviders) {
        console.log('Using custom RPC providers');
        const providers = nearRpcProvidersJson.nearRpcProviders.map(config =>
            new JsonRpcProvider(
                config.connectionInfo,
                config.options || {}
            )
        );
        provider = new FailoverRpcProvider(providers);
    } else {
        console.log('Using default RPC provider');
        provider = createDefaultProvider();
    }
} catch (error) {
    console.log('Using default RPC provider');
    provider = createDefaultProvider();
}

export const masterAccount = new Account(accountId, provider, signer);
export const contractAccount = new Account(contractId, provider, signer);

// Get the funding amount from the options
export let FUNDING_AMOUNT;
if (options.funding) {
    FUNDING_AMOUNT = NEAR.toUnits(options.funding);
} else if (options.wasm) {
    FUNDING_AMOUNT = NEAR.toUnits('8');
} else {
    FUNDING_AMOUNT = NEAR.toUnits('1');
}
