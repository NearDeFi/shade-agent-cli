import { execSync } from 'child_process';

export function loginToPhala(phalaApiKey) {
    // Logs in to Phala Cloud
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
    // Deploys the app to Phala Cloud
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

export function deployPhalaWorkflow(phalaApiKey, dockerTag) {
    // Logs in to Phala Cloud
    if (!loginToPhala(phalaApiKey)) {
        return false;
    }

    // Deploys the app to Phala Cloud
    if (!deployToPhala(dockerTag)) {
        return false;
    }

    return true;
}
