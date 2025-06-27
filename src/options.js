import { program } from 'commander';

/**
 * CLI options
 */
function setupOptions() {
    program.option('-w, --wasm <string>', 'wasm path to deploy custom contract');
    
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