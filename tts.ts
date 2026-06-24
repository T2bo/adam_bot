import {
    joinVoiceChannel,
    entersState,
    VoiceConnectionStatus,
    AudioResource,
    createAudioResource,
    createAudioPlayer,
    AudioPlayerStatus,
} from '@discordjs/voice';
import type { Message } from 'discord.js';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { sleep } from './index.ts';

import googleTTS from 'google-tts-api';

type Token =
    | { type: 'tts'; text: string; accent: string; slow: boolean }
    | { type: 'audio'; path: string };

const TOKEN_REGEX =
    /"(?<quote>.*?)"|\|\|(?<beep>.*?)\|\||\b(?<huh>huh)\b|\b(?<hellothere>hello there)\b|\b(?<ping>ping)\b|\b(?<bruh>bruh)\b|\b(?<mcdonalds>mcdonalds\.mp3)\b|\b(?<beninging>beninging)\b|\b(?<rain>im gonna need to hear some rain for a while)\b/gi;

function parseMessage(message: string, userAccent: string): Token[] {
    const tokens: Token[] = [];
    let lastIndex = 0;
    let match;

    while ((match = TOKEN_REGEX.exec(message)) !== null) {
        if (match.index > lastIndex) {
            tokens.push({
                type: 'tts',
                text: message.slice(lastIndex, match.index),
                accent: userAccent,
                slow: false,
            });
        }

        if (match.groups?.quote) {
            tokens.push({
                type: 'tts',
                text: match.groups.quote,
                accent: 'en',
                slow: false,
            });
        } else if (match.groups?.beep) {
            tokens.push({
                type: 'audio',
                path: './storage/sounds/beep.mp3',
            });
        } else if (match.groups?.huh) {
            tokens.push({
                type: 'audio',
                path: './storage/sounds/huh.mp3',
            });
        } else if (match.groups?.hellothere) {
            tokens.push({
                type: 'audio',
                path: './storage/sounds/hello-there.mp3',
            });
        } else if (match.groups?.bruh) {
            tokens.push({
                type: 'audio',
                path: './storage/sounds/bruh.mp3',
            });
        } else if (match.groups?.ping) {
            tokens.push({
                type: 'audio',
                path: './storage/sounds/discord-notification.mp3',
            });
        } else if (match.groups?.mcdonalds) {
            tokens.push({
                type: 'audio',
                path: './storage/sounds/mcdonalds-beeping-sound.mp3',
            });
        } else if (match.groups?.beninging) {
            tokens.push({
                type: 'audio',
                path: './storage/sounds/in the beningin.wav',
            });
        } else if (match.groups?.rain) {
            tokens.push({
                type: 'audio',
                path: './storage/sounds/dragon-studio-relaxing-rain-444802.mp3',
            });
        }

        lastIndex = TOKEN_REGEX.lastIndex;
    }

    if (lastIndex < message.length) {
        tokens.push({
            type: 'tts',
            text: message.slice(lastIndex),
            accent: userAccent,
            slow: false,
        });
    }

    return tokens;
}

export async function tts(message: string, msg: Message<true>) {
    if (!msg.member?.voice.channelId) return;
    // let da bird do that filter
    await sleep(0.1);

    // if message was deleted in that time, nono do this!
    if ((await msg.fetch()) == undefined) return;

    if (!existsSync(`./storage/per_user_config/`)) {
        mkdirSync(`./storage/per_user_config/`, { recursive: true });
    }

    if (!existsSync(`./storage/per_user_config/${msg.member.id}.json`)) {
        writeFileSync(
            `./storage/per_user_config/${msg.member.id}.json`,
            JSON.stringify({ accent: 'en' })
        );
    }

    var accent = JSON.parse(
        readFileSync(
            `./storage/per_user_config/${msg.member.id}.json`,
            'utf-8'
        )
    ).accent;

    const tokens = parseMessage(message, accent);
    const urls: {
        shortText: string;
        url: string;
    }[] = [];

    tokens.forEach((token) => {
        if (token.type == 'tts') {
            urls.push(
                ...googleTTS.getAllAudioUrls(token.text, {
                    lang: token.accent,
                    slow: token.slow,
                })
            );
        } else {
            urls.push({
                shortText: 'idk why i added this',
                url: token.path,
            });
        }
    });

    // create connection
    const connection = joinVoiceChannel({
        channelId: msg.member.voice.channelId,
        guildId: msg.guildId,
        adapterCreator: msg.guild.voiceAdapterCreator,
    });

    try {
        await entersState(connection, VoiceConnectionStatus.Ready, 1000);
    } catch (error) {
        return msg.reply('Took to long to enter VC');
    }

    var resources: AudioResource<null>[] = [];

    for (var t_url of urls) {
        resources.push(
            createAudioResource(t_url.url, { inlineVolume: true })
        );
    }

    var player = createAudioPlayer();

    player.on('error', (err) => {
        msg.channel.send(`Something went wrong!\n||${err.message}||`);
    });

    connection.subscribe(player);

    for (const resource of resources) {
        try {
            player.play(resource);
            await entersState(player, AudioPlayerStatus.Idle, 100_000);
        } catch (error) {
            return msg.reply('Took to long to play the audio');
        }
    }
}
