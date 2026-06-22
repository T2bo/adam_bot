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
import { url } from 'inspector';

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

    var capture_quotes: { quoted: boolean; txt: string }[] = [];

    message.match(/"\b.*?"/gi)?.forEach((part: string) => {
        const split_msg = message.split(part);

        if (split_msg[0])
            capture_quotes.push({ quoted: false, txt: split_msg[0] });
        message = split_msg[1];
        capture_quotes.push({ quoted: true, txt: part });
    });
    capture_quotes.push({ quoted: false, txt: message });
    const urls: {
        shortText: string;
        url: string;
    }[] = [];

    capture_quotes = capture_quotes.filter((x) => x.txt != '');

    capture_quotes.forEach((part) => {
        if (part.quoted) {
            urls.push(
                ...googleTTS.getAllAudioUrls(part.txt, {
                    lang: 'en',
                })
            );
        } else {
            urls.push(
                ...googleTTS.getAllAudioUrls(part.txt, {
                    lang: accent,
                    slow: true,
                })
            );
        }
    });

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

    var recources: AudioResource<null>[] = [];

    for (var t_url of urls) {
        recources.push(createAudioResource(t_url.url));
    }

    var player = createAudioPlayer();

    connection.subscribe(player);

    for (const resource of recources) {
        player.play(resource);
        try {
            await entersState(player, AudioPlayerStatus.Idle, 60_000);
        } catch (error) {
            return msg.reply('Took to long to play the audio');
        }
        await sleep(0.01);
    }

    player.on('error', (err) => {
        msg.channel.send(`Something went wrong!\n||${err.message}||`);
    });
}
