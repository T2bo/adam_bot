import { readFile, writeFile } from 'fs/promises';

export async function readWholeChannelStorage(): Promise<any> {
    const data = await readFile('channels.json', 'utf-8');
    try {
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading channels.json', error);
        return {};
    }
}
export async function readChannelStorage(channelId: string) {
    const storage = await readWholeChannelStorage();
    return storage[channelId] || {};
}

export async function writeChannelStorage(channelId: string, data: any) {
    const storage = await readWholeChannelStorage();
    storage[channelId] = data;
    await writeFile(
        'channels.json',
        JSON.stringify(storage, undefined, 4)
    ); // add spaces for the funny
}
