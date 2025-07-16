import { execSync } from 'child_process';

// Use native fetch if available, otherwise require node-fetch
let fetchFn;
if (typeof fetch === 'function') {
    fetchFn = fetch;
} else {
    fetchFn = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
}

function loginToPhala(phalaApiKey) {
    // Logs in to Phala Cloud using local phala package
    console.log('logging in to Phala Cloud...');
    try {
        execSync(`npx phala auth login ${phalaApiKey}`);
        console.log('Successfully logged in to Phala Cloud');
        return true;
    } catch (e) {
        console.log('Error authenticating with Phala Cloud', e);
        return false;
    }
}

function deployToPhala(dockerTag) {
    // Deploys the app to Phala Cloud using local phala package
    console.log('deploying to Phala Cloud...');
    const appNameSplit = dockerTag.split('/');
    const appName = appNameSplit[appNameSplit.length - 1];
    
    try {
        const result = execSync(
            `npx phala cvms create --name ${appName} --vcpu 1 --compose ./docker-compose.yaml --env-file ./.env.development.local`,
            { encoding: 'utf-8' }
        );
        console.log('deployed to Phala Cloud');

        const deploymentUrlMatch = result.match(/App URL\s*│\s*(https:\/\/[^\s]+)/);
        if (deploymentUrlMatch) {
            const deploymentUrl = deploymentUrlMatch[1];
            console.log(`\n You can find your deployment at: ${deploymentUrl}`);
        }
        
        // Extract App ID from the output 
        const appId = result.match(/App ID\s*│\s*(app_[a-f0-9]+)/);
        if (appId) {
            return appId[1];
        } else {
            console.log('Could not extract App ID from output');
            return null;
        }
    } catch (e) {
        console.log('Error deploying to Phala Cloud', e);
        return null;
    }
}

export async function getAppUrl(appId, phalaApiKey) {
    console.log('Getting app url...');
    const url = `https://cloud-api.phala.network/api/v1/cvms/${appId}`;
    const maxAttempts = 30;
    const delay = 1000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const response = await fetchFn(url, { headers: { 'X-API-Key': phalaApiKey } });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (!data.error) {
                // Find the app url with port 3000
                if (Array.isArray(data.public_urls)) {
                    const url3000 = data.public_urls.find(u => u.app && u.app.includes('-3000.'));
                    if (url3000 && url3000.app) {
                        console.log(`\n🎉 Your app is live at: ${url3000.app}`);
                        return url3000.app;
                    }
                }
            }
        } catch (e) {
            console.error(`Error fetching CVM network info (attempt ${attempt}):`, e);
        }
        if (attempt < maxAttempts) {
            await new Promise(res => setTimeout(res, delay));
        }
    }
    console.error(`CVM Network Info did not become ready after ${maxAttempts} attempts.`);
    return null;
}

export async function deployPhalaWorkflow(phalaApiKey, dockerTag) {
    // Logs in to Phala Cloud
    if (!loginToPhala(phalaApiKey)) {
        return false;
    }

    // Deploys the app to Phala Cloud
    const appId = deployToPhala(dockerTag);

    if (!appId) {
        return false;
    }

    return appId;
}
