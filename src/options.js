import { program } from 'commander';

/**
 * CLI options
 */
function setupOptions() {
    program.option('-w, --wasm <string>', 'WASM path to deploy custom contract');
    program.option('-f, --funding <number>', 'Funding amount for contract account in NEAR');
    program.option('-r, --rpc <string>', 'Select custom RPC endpoint');
    program.option('-b, --no-build', 'Skip building and pushing the docker image');
    program.option('-i, --no-init', 'Skip initializing the contract and approving codehashes');
    program.option('-p, --no-phala', 'Skip deploying the app to Phala Cloud');
    program.option('-d, --no-redeploy', 'Skip redeploying the contract');
    
    return program;
}

/**
 * Setup options and parse arguments
 */
export function initializeOptions() {
    setupOptions();
    program.parse();
    console.log('CLI OPTIONS SET:\n\n', program.opts(), '\n\n');
}

/**
 * Get options
 */
export function getOptions() {
    return program.opts();
} 