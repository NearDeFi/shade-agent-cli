import fs from 'fs';
import bs58 from 'bs58';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function createAccount(contractId, masterAccount, contractAccount, fundingAmount) {
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
            fundingAmount,
        );
    } catch (e) {
        console.log('error createAccount', e);
    }

    console.log('contract account created:', contractId);
    await sleep(1000);
}

export async function deployCustomContract(contractAccount, wasmPath) {
    // deploys the contract bytes (original method and requires more funding)
    const file = fs.readFileSync(wasmPath);
    await contractAccount.deployContract(file);
    console.log('deployed bytes', file.byteLength);
    const balance = await contractAccount.getBalance();
    console.log('contract balance', balance);
    console.log('Custom contract deployed:', contractId);
    await sleep(1000);
}

export async function deployGlobalContract(contractAccount, globalContractHash) {
    // deploys global contract using near-js
    try {
        // convert base58 to hex
        const hexHash = Buffer.from(bs58.decode(globalContractHash)).toString('hex');
        await contractAccount.useGlobalContract({codeHash: hexHash});
    } catch (e) {
        console.log('Error deploying global contract', e);
    }
    await sleep(1000);
}

export async function initContract(contractAccount, contractId, masterAccount, gas) {
    const initRes = await contractAccount.functionCall({
        contractId,
        methodName: 'init',
        args: {
            owner_id: masterAccount.accountId,
        },
        gas: gas,
    });
    console.log('Contract init result', initRes.status.SuccessValue === '');
    await sleep(1000);
}

export async function approveCodehash(masterAccount, contractId, codehash, gas) {
    const approveRes = await masterAccount.functionCall({
        contractId,
        methodName: 'approve_codehash',
        args: {
            codehash: codehash,
        },
        gas: gas,
    });
    console.log('Approve codehash result', approveRes.status.SuccessValue === '');
    await sleep(1000);
}
