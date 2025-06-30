import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

export function restartDocker() {
    console.log('docker restarting...');
    if (process.platform === 'darwin') {
        try {
            execSync(`docker restart $(docker ps -q)`);
            console.log('docker restarted');
        } catch (e) {
            console.warn('WARNING: Error restarting docker service');
        }
    } else {
        try {
            execSync(`sudo systemctl restart docker`);
            console.log('docker restarted');
        } catch (e) {
            console.warn('WARNING: Error restarting docker service');
        }
    }
}

export function buildImage(dockerTag) {
    console.log('docker building image...');
    try {
        execSync(
            `sudo docker build --no-cache --platform=linux/amd64 -t ${dockerTag}:latest .`,
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
            `sudo docker push ${dockerTag}`,
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
