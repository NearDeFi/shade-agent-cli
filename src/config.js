import * as dotenv from 'dotenv';
import { parseSeedPhrase } from 'near-seed-phrase';
import { KeyPairSigner } from '@near-js/signers';
import { JsonRpcProvider } from "@near-js/providers";
import { Account } from "@near-js/accounts";
import { getOptions } from './options.js';
import { NEAR } from "@near-js/tokens";

// Get the options
const options = getOptions();

if (process.env.NODE_ENV !== 'production') {
    // will load for browser and backend
    const dir = process.cwd();
    dotenv.config({ path: `${dir}/.env.development.local` });
} else {
    // load .env in production
    dotenv.config();
}

if (!process.env.NEXT_PUBLIC_contractId || !process.env.PHALA_API_KEY || !process.env.API_CODEHASH || !process.env.NEAR_ACCOUNT_ID || !process.env.NEAR_SEED_PHRASE) {
    console.log('Make sure you have set the following env vars: NEXT_PUBLIC_contractId, PHALA_API_KEY, API_CODEHASH, NEAR_ACCOUNT_ID, NEAR_SEED_PHRASE');
    process.exit(-1);
}

export const contractId = process.env.NEXT_PUBLIC_contractId.replaceAll('"', '');
export const PHALA_API_KEY = process.env.PHALA_API_KEY.replaceAll('"', '');
export const API_CODEHASH = process.env.API_CODEHASH.replaceAll('"', '');
export const accountId = process.env.NEAR_ACCOUNT_ID.replaceAll('"', '');
export const DOCKER_TAG = process.env.DOCKER_TAG.replaceAll('"', '');
export const { secretKey } = parseSeedPhrase(
    process.env.NEAR_SEED_PHRASE.replaceAll('"', '')
);

// Set IS_SANDBOX to true if the contract ID prefix is 'ac-sandbox'
// If the contract ID prefix is 'ac-proxy', set IS_SANDBOX to false
// If the contract ID prefix is not 'ac-sandbox' or 'ac-proxy', exit with an error
const prefix = contractId.split('.')[0];
if (!['ac-sandbox', 'ac-proxy'].includes(prefix)) {
    console.error(`Invalid contract ID prefix: ${prefix}. Expected 'ac-sandbox' or 'ac-proxy'`);
    process.exit(1);
}
export const IS_SANDBOX = prefix === 'ac-sandbox';

// Hash of the global contract for sandbox or proxy
export const GLOBAL_CONTRACT_HASH = IS_SANDBOX
    ? '31x2yS1DZHUjMQQFXPBjbfojb4FQ8pBaER39YoReTpJb'
    : '2pSLLgLnAM9PYD7Rj6SpdK9tJRz48GQ7GrnAXK6tmm8u';

// NEAR configuration and signer
const networkId = /testnet/gi.test(contractId) ? 'testnet' : 'mainnet';
const signer = KeyPairSigner.fromSecretKey(secretKey);

// Sets the RPC endpoint depending on the network and the options
const provider = new JsonRpcProvider({ 
    url: options.rpc || (networkId === 'testnet' 
        ? "https://test.rpc.fastnear.com" 
        : "https://free.rpc.fastnear.com") 
});

export const masterAccount = new Account(accountId, provider, signer);
export const contractAccount = new Account(contractId, provider, signer);

// Get the funding amount from the options
let FUNDING_AMOUNT;
if (options.funding) {
    FUNDING_AMOUNT = options.funding;
} else if (options.wasm) {
    FUNDING_AMOUNT = NEAR.toUnits('5');
} else {
    FUNDING_AMOUNT = NEAR.toUnits('1');
}
