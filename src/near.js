import fs from 'fs';
import bs58 from 'bs58';
import { FUNDING_AMOUNT } from './config.js';

const GAS = BigInt('30000000000000');

// Sleep for the specified number of milliseconds
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function createAccount(contractId, masterAccount, contractAccount) {
    // Check if the contract account exists and delete it if it does
    try {
        await contractAccount.getBalance();
        console.log("Account already exists, deleting...");
        await contractAccount.deleteAccount(masterAccount.accountId);
        console.log("Account deleted successfully");
        await sleep(1000);
    } catch (e) {
        if (e.type === 'AccountDoesNotExist') {
            console.log("Account does not exist, creating new one...");
        } else {
            console.log('Error checking account existence', e);
            await contractAccount.deleteAccount(masterAccount.accountId);
            console.log("Account deleted successfully");
            await sleep(1000);
        }
    }

    // Create the contract account
    try {
        await masterAccount.createAccount(
            contractId,
            await masterAccount.getSigner().getPublicKey(),
            FUNDING_AMOUNT,
        );
        console.log('Contract account created:', contractId);
        await sleep(1000);
        return true;
    } catch (e) {
        console.log('Error creating account', e);
        return false;
    }
}

export async function deployCustomContract(contractAccount, wasmPath) {
    try {
        // Deploys the contract bytes (requires more funding)
        const file = fs.readFileSync(wasmPath);
        await contractAccount.deployContract(file);
        console.log('Custom contract deployed:', contractAccount.accountId);
        await sleep(1000);
        return true;
    } catch (e) {
        console.log('Error deploying custom contract', e);
        return false;
    }
}

export async function deployGlobalContract(contractAccount, globalContractHash) {
    try {
        // Deploys the global contract
        // Converts from base58 to hex
        const hexHash = Buffer.from(bs58.decode(globalContractHash)).toString('hex');
        await contractAccount.useGlobalContract({codeHash: hexHash});
        console.log('Global contract deployed:', contractAccount.accountId);
        await sleep(1000);
        return true;
    } catch (e) {
        console.log('Error deploying global contract', e);
        return false;
    }
}

export async function initContract(contractAccount, contractId, masterAccount) {
    // Initializes the contract
    try {
        const initRes = await contractAccount.callFunctionRaw({
            contractId,
            methodName: 'init',
            args: {
                owner_id: masterAccount.accountId,
            },
            gas: GAS,
        });
        console.log('Contract initialized:', initRes.status.SuccessValue === '');
        await sleep(1000);
        return true;
    } catch (e) {
        console.log('Error initializing contract', e);
        return false;
    }
}

export async function approveCodehash(masterAccount, contractId, codehash) {
    // Approves the specified codehash
    try {
        const approveRes = await masterAccount.callFunctionRaw({
            contractId,
            methodName: 'approve_codehash',
            args: {
                codehash: codehash,
            },
            gas: GAS,
        });
        console.log('Codehash approved:', approveRes.status.SuccessValue === '');
        await sleep(1000);
        return true;
    } catch (e) {
        console.log('Error approving codehash', e);
        return false;
    }
}
