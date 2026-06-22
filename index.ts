import {
    Client,
    IntentsBitField,
    GatewayIntentBits,
    AttachmentBuilder,
    Message,
    EmbedBuilder,
} from 'discord.js';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';

import {
    joinVoiceChannel,
    createAudioResource,
    createAudioPlayer,
    AudioResource,
    AudioPlayerStatus,
    entersState,
    VoiceConnectionStatus,
    VoiceConnection,
} from '@discordjs/voice';
const { TOKEN, TIBO_ID, EVIL_BOT } = process.env;

var TiboMessageCounter: number = 0;

import approvalPrompts from './approvalPrompts.ts';
import replies from './adam_replies.ts';
import evilBotPrompts from './evilBotPrompts.ts';
import { allCommands } from './commands.ts';
import {
    readChannelStorage,
    writeChannelStorage,
} from './utils/storage.ts';
import { tts } from './tts.ts';

const client = new Client({
    intents: new IntentsBitField().add([
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.Guilds,
    ]),
});

client.on('clientReady', async () => {
    console.log(
        `Logged in as: ${client.user?.tag} (id: ${client.user?.id})`
    );

    if (existsSync('./restart_info.json')) {
        var restart_info = JSON.parse(
            readFileSync('./restart_info.json').toString()
        );
        if (
            restart_info.channel_id != undefined &&
            restart_info.msg_id != undefined
        ) {
            var restart_msg_channel = await client.channels.fetch(
                restart_info.channel_id
            );
            if (!restart_msg_channel?.isTextBased()) return;

            var restart_msg = await restart_msg_channel.messages.fetch(
                restart_info.msg_id
            );

            restart_msg?.edit({
                content: 'I AM BACK!! MUAHAHAHAAH... Ahem, hello.',
                allowedMentions: { repliedUser: false },
            });

            writeFileSync('./restart_info.json', '{}');
        }
    }
});

const commandExecutor = compileCommands('adam');

client.on('messageCreate', async (msg) => {
    if (
        msg.author.id == EVIL_BOT &&
        evilBotPrompts.includes(msg.content)
    ) {
        msg.reply('Darling shut. ||\<3||'); // lol hiding the love
    }

    // dont do stuff when the bot sends a message
    if (msg.author.bot) return;

    // just for easy access.
    const message = msg.cleanContent.toLowerCase();

    // required ofcourse
    if (message.includes('🗿')) msg.react('🗿');

    // requested by Joery
    if (message == 'adam?') {
        const adamemoji = client.emojis.cache.get('1170472107742875688');
        msg.reply({
            content: `${adamemoji}`,
            allowedMentions: { repliedUser: false },
        });
        return;
    }

    // // test
    // if (message.match(/.*adam.*test.*/gi) != null) {
    //     msg.reply({
    //         content: 'Okay:',
    //         allowedMentions: { repliedUser: false },
    //     });

    //     const update_this = await msg.channel.send(
    //         '`this message should get updated in 1 second`'
    //     );
    //     await sleep();
    //     update_this.edit('`did it work?`');
    //     return;
    // }

    // flooding warning
    var channelInfo = await readChannelStorage(msg.channelId);

    // if channel count is not null OR the message was sent by tibo

    if (!channelInfo)
        channelInfo = {
            WarnTiboAboutFlooding: true,
            TiboMessages: 0,
            lastAdamGifTimestamp: Date.now(),
        };

    channelInfo.TiboMessages =
        msg.author.id == TIBO_ID ? channelInfo.TiboMessages + 1 : 0;

    if (Date.now() - channelInfo.lastAdamGifTimestamp > 1800000) {
        if (Math.random() > 0.999) {
            msg.channel.send(
                'https://media.discordapp.net/attachments/1002256216224956538/1199445627986247730/ezgif.com-animated-gif-maker.gif'
            );
            channelInfo.lastAdamGifTimestamp = Date.now();
        }
    }
    writeChannelStorage(msg.channelId, channelInfo);

    if (
        channelInfo.TiboMessages == 10 &&
        channelInfo.WarnTiboAboutFlooding
    ) {
        msg.channel.send("Tibo.. you're flooding chat again..");
    }

    if (
        channelInfo.WarnTiboAboutFlooding &&
        channelInfo.TiboMessages > 10 &&
        channelInfo.TiboMessages % 3 == 0
    ) {
        msg.channel.send(
            `Tibo. stop flooding. ||${channelInfo.TiboMessages} messages.||`
        );
    }

    // approval trigger
    if (
        approvalPrompts.filter((x) => message.match(x) != null).length > 0
    ) {
        const replytext =
            replies[Math.floor(Math.random() * replies.length)];

        const adam_msg = await msg.reply({
            content: replytext,
            allowedMentions: { repliedUser: false },
        });
        tts(replytext, adam_msg as Message<true>);
        return;
    }

    if (msg.inGuild()) {
        commandExecutor(msg, message, client);
    }
});

client.on('guildCreate', async (guild) => {
    var user = await client.users.fetch('457897694426300418');
    user.send(`Added to server \`${guild.name}\``);
});

export async function sleep(t = 1) {
    return new Promise<void>((res) => setTimeout(() => res(), t * 1000));
}

console.log('Connecting...');
client.login(TOKEN);

export type HandlerFn = (
    msg: import('discord.js').Message<true>,
    message: string,
    client: import('discord.js').Client
) => void;
function compileCommands(prefix: string): HandlerFn {
    const compiled = new Map<RegExp, HandlerFn>();

    for (const [args, handler] of allCommands) {
        const argsParsed = args.map((v) => RegExp.escape(v));
        const regex = [prefix, ...argsParsed].join('.*\\b.*');
        compiled.set(new RegExp(regex), handler);
    }

    return (msg, message, client) => {
        for (const [regex, handler] of compiled) {
            if (regex.test(message)) {
                handler(msg, message, client);
                break;
            }
        }
        // No command found
    };
}
