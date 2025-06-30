import { execSync } from 'child_process';
import { spawn } from 'child_process';

export function loginToPhala(phalaApiKey) {
    console.log('logging in to Phala Cloud...');
    try {
        execSync(`phala auth login ${phalaApiKey}`);
        console.log('Successfully logged in to Phala Cloud');
        return true;
    } catch (e) {
        console.log('Error authenticating with Phala Cloud', e);
        return false;
    }
}

export function deployToPhala(dockerTag) {
    console.log('deploying to Phala Cloud...');
    const appNameSplit = dockerTag.split('/');
    const appName = appNameSplit[appNameSplit.length - 1];
    
    try {
        execSync(
            `phala cvms create --name ${appName} --vcpu 1 --compose ./docker-compose.yaml --env-file ./.env.development.local`,
        );
        console.log('deployed to Phala Cloud');
        return true;
    } catch (e) {
        console.log('Error deploying to Phala Cloud', e);
        return false;
    }
}

export function runApiLocally(apiCodehash) {
    console.log(
        'running shade-agent-api in docker locally at http://localhost:3140',
    );
    try {
        spawn(
            `sudo`,
            `docker run -p 0.0.0.0:3140:3140 --platform=linux/amd64 --env-file .env.development.local --rm -e PORT=3140 mattdlockyer/shade-agent-api@sha256:${apiCodehash}`.split(
                ' ',
            ),
            {
                cwd: process.cwd(),
                stdio: 'inherit',
            },
        );
        return true;
    } catch (e) {
        console.log('Error running API locally', e);
        return false;
    }
}

export function deployPhalaWorkflow(phalaApiKey, dockerTag) {
    // Login to Phala Cloud
    if (!loginToPhala(phalaApiKey)) {
        return false;
    }

    // Deploy to Phala Cloud
    if (!deployToPhala(dockerTag)) {
        return false;
    }

    return true;
}
