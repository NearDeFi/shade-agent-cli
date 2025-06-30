import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { spawn } from 'child_process';

export function stopContainer() {
    console.log('stopping container on port 3140...');
    if (process.platform === 'darwin') {
        try {
            const containerId = execSync(`docker ps -q --filter "publish=3140"`, { encoding: 'utf8' }).trim();
            if (containerId) {
                execSync(`docker stop ${containerId}`);
                console.log(`stopped container ${containerId} on port 3140`);
            } else {
                console.log('no container found on port 3140');
            }
        } catch (e) {
            console.warn('WARNING: Error stopping container on port 3140');
        }
    } else {
        try {
            const containerId = execSync(`sudo docker ps -q --filter "publish=3140"`, { encoding: 'utf8' }).trim();
            if (containerId) {
                execSync(`sudo docker stop ${containerId}`);
                console.log(`stopped container ${containerId} on port 3140`);
            } else {
                console.log('no container found on port 3140');
            }
        } catch (e) {
            console.warn('WARNING: Error stopping container on port 3140');
        }
    }
}

export function buildImage(dockerTag) {
    console.log('docker building image...');
    try {
        execSync(
            `docker build --no-cache --platform=linux/amd64 -t ${dockerTag}:latest .`,
        );
        console.log('docker image built');
        return true;
    } catch (e) {
        console.log('Error docker build', e);
        return false;
    }
}

export function pushImage(dockerTag) {
    console.log('docker pushing image...');
    try {
        const output = execSync(
            `docker push ${dockerTag}`,
        );
        const newAppCodehash = output
            .toString()
            .match(/sha256:[a-f0-9]{64}/gim)[0]
            .split('sha256:')[1];
        console.log('docker image pushed');
        return newAppCodehash;
    } catch (e) {
        console.log('Error docker push', e);
        return null;
    }
}

export function replaceInEnvFile(codehash) {
    try {
        const path = '.env.development.local';
        const data = readFileSync(path).toString();
        const match = data.match(/APP_CODEHASH=[a-f0-9]{64}/gim)[0];
        const updated = data.replace(
            match,
            `APP_CODEHASH=${codehash}`,
        );
        writeFileSync(path, updated, 'utf8');
        console.log('codehash replaced in .env.development.local');
        return true;
    } catch (e) {
        console.log(
            'Error replacing codehash in .env.development.local',
            e,
        );
        return false;
    }
}

export function replaceInYaml(dockerTag, codehash) {
    try {
        const path = 'docker-compose.yaml';
        let data = readFileSync(path).toString();
        const match = data.match(/@sha256:[a-f0-9]{64}/gim)[1];
        const replacementHash = `@sha256:${codehash}`;
        data = data.replace(match, replacementHash);
        const index = data.indexOf(replacementHash);
        const lastIndex = data.lastIndexOf('image:', index);
        data =
            data.slice(0, lastIndex) +
            `image: ` +
            dockerTag +
            data.slice(index);
        writeFileSync(path, data, 'utf8');
        console.log('codehash replaced in docker-compose.yaml');
        return true;
    } catch (e) {
        console.log('Error replacing codehash in docker-compose.yaml', e);
        return false;
    }
}

export function dockerImage(dockerTag) {
    // Build the image
    if (!buildImage(dockerTag)) {
        return null;
    }

    // Push the image and get the new codehash
    const newAppCodehash = pushImage(dockerTag);
    if (!newAppCodehash) {
        return null;
    }

    // Replace codehash in .env.development.local
    if (!replaceInEnvFile(newAppCodehash)) {
        return null;
    }

    // Replace codehash in docker-compose.yaml
    if (!replaceInYaml(dockerTag, newAppCodehash)) {
        return null;
    }

    return newAppCodehash;
}

export function runApiLocally(apiCodehash) {
    stopContainer();

    let childProcess;
    try {
        let command, args;
        
        if (process.platform === 'darwin') {
            command = 'docker';
            args = [
                'run',
                '-p', '0.0.0.0:3140:3140',
                '--platform=linux/amd64',
                '--env-file', '.env.development.local',
                '--rm',
                '-e', 'PORT=3140',
                `mattdlockyer/shade-agent-api@sha256:${apiCodehash}`
            ];
        } else {
            command = 'sudo';
            args = [
                'docker',
                'run',
                '-p', '0.0.0.0:3140:3140',
                '--platform=linux/amd64',
                '--env-file', '.env.development.local',
                '--rm',
                '-e', 'PORT=3140',
                `mattdlockyer/shade-agent-api@sha256:${apiCodehash}`
            ];
        }
        
        childProcess = spawn(command, args, {
            cwd: process.cwd(),
            stdio: 'inherit',
        });
        
        // Handle shutdown signals to stop the container
        const cleanup = () => {
            console.log('\nStopping container...');
            if (childProcess) {
                childProcess.kill('SIGTERM');
            }
            stopContainer();
            process.exit(0);
        };
        
        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
        
        return true;
    } catch (e) {
        console.log('Error running API locally', e);
        return false;
    }
}