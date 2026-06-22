import { EmbedBuilder } from 'discord.js';
import type { HandlerFn } from './index.ts';
import { tts } from './tts.ts';
import { writeFileSync } from 'fs';
import { getVoiceConnection } from '@discordjs/voice';
import {
    readChannelStorage,
    writeChannelStorage,
} from './utils/storage.ts';

const { TOKEN, TIBO_ID, EVIL_BOT } = process.env;

export const allCommands = new Map<string[], HandlerFn>();
function addCommand(triggers: string | string[], handler: HandlerFn) {
    allCommands.set(
        Array.isArray(triggers) ? triggers : [triggers],
        handler
    );
}

addCommand(['online'], (msg) => {
    msg.reply({
        content: 'yeah?',
        allowedMentions: { repliedUser: false },
    });
});

addCommand('fox', (msg) => {
    const embed = new EmbedBuilder()
        .setTitle('Fox')
        .setDescription(
            `A Fox has been requested by ${
                msg.member?.nickname ?? msg.author.displayName
            } (aka ${msg?.author.username})`
        )
        .setColor('Orange')
        .setImage(
            `https://randomfox.ca/images/${
                Math.floor(Math.random() * 123) + 1
            }.jpg`
        );

    msg.channel.send({ embeds: [embed] });
});

addCommand('say', (msg, message) => {
    const sayThis = message.replace(/.*adam.*say(\s)?/gi, '');
    tts(sayThis, msg);
});

addCommand('die', async (msg) => {
    if (msg.author.id != TIBO_ID) {
        await msg.reply({
            content: 'Nuh huh.',
            allowedMentions: { repliedUser: false },
        });
    }

    const update_msg = await msg.reply({
        content: 'Okay.',
        allowedMentions: { repliedUser: false },
    });
    var channel_id = update_msg.channelId;
    var msg_id = update_msg.id;

    writeFileSync(
        './restart_info.json',
        JSON.stringify({ channel_id, msg_id })
    );

    process.exit(0);
});

addCommand(['leave', 'vc'], (msg) => {
    getVoiceConnection(msg.guildId)?.disconnect();
});

addCommand(['reset', 'count'], async (msg) => {
    await msg.reply({
        content: 'okay okay fine...',
        allowedMentions: { repliedUser: false },
    });
    const channelInfo = await readChannelStorage(msg.channelId);
    channelInfo.TiboMessages = 0;
    await writeChannelStorage(msg.channelId, channelInfo);
});
addCommand(['show', 'timestamp'], async (msg) => {
    const channelInfo = await readChannelStorage(msg.channelId);
    const lastTimestamp = channelInfo.lastAdamGifTimestamp;
    const now = Date.now();
    const diff = now - lastTimestamp;
    msg.reply(`last:${lastTimestamp};\nnow:${now};\ndiff:${diff};`);
});
addCommand(['dont', 'allow', 'spam'], async (msg) => {
    msg.channel.send('ok');
    const channelInfo = await readChannelStorage(msg.channelId);
    channelInfo.WarnTiboAboutFlooding = true;
    await writeChannelStorage(msg.channelId, channelInfo);
});
addCommand(['allow', 'spam'], async (msg) => {
    msg.channel.send('ok');
    const channelInfo = await readChannelStorage(msg.channelId);
    channelInfo.WarnTiboAboutFlooding = false;
    await writeChannelStorage(msg.channelId, channelInfo);
});

addCommand('?', async (msg) => {
    const adamemoji = msg.client.emojis.cache.get('1170472107742875688');
    msg.reply({
        content: `${adamemoji}`,
        allowedMentions: { repliedUser: false },
    });
});

addCommand(['reset', 'channels'], (msg) => {
    if (msg.author.id == TIBO_ID) {
        writeFileSync('./channels.json', '{}');
        msg.reply('ok');
    } else {
        msg.reply('Sorry, only Tibo can do that.');
    }
});
