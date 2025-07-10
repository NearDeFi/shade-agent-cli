import { program } from 'commander';

/**
 * CLI options
 */
function setupOptions() {
    program
        .option('-w, --wasm <string>', 'WASM path to deploy custom contract')
        .option('-f, --funding <string>', 'Funding amount for contract account in NEAR')

        .option('-i, --image', 'Just build and push the Docker image')
        .option('-c, --contract', 'Build and push the Docker image, and deploy the contract')
        .option('-o, --phala-only', 'Just deploy the app to Phala Cloud')

        // Flags with --no prefix are true by default if not specified
        .option('-d, --no-redeploy', 'Skip redeploying the contract')
        .option('-b, --no-build', 'Skip building and pushing the Docker image')
        .option('-p, --no-phala', 'Skip deploying the app to Phala Cloud')
        .option('-e, --no-endpoint', 'Skip printing the endpoint of the app')
        .option('-s, --no-cache', 'Run docker build with --no-cache')

    return program;
}

/**
 * Setup options and parse arguments
 */
export function initializeOptions() {
    setupOptions();
    program.parse();
    
    const options = program.opts();
    
    if (options.phalaOnly && !options.phala) {
        console.error('Error: Cannot use --phala-only and --no-phala together');
        process.exit(1);
    }

    if (options.phalaOnly && options.contract) {
        console.error('Error: Cannot use --phala-only and --contract together');
        process.exit(1);
    }

    if (options.phalaOnly && options.image) {
        console.error('Error: Cannot use --phala-only and --image together');
        process.exit(1);
    }

    if (options.image && options.contract) {
        console.error('Error: Cannot use --image and --contract together');
        process.exit(1);
    }

    if (options.image && !options.build) {
        console.error('Error: Cannot use --image and --no-build together');
        process.exit(1);
    }

    if (options.image && !options.cache) {
        console.error('Error: Cannot use --image and --no-cache together');
        process.exit(1);
    }
}

/**
 * Get options
 */
export function getOptions() {
    return program.opts();
} 