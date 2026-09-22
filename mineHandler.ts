import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    EmbedBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
    StringSelectMenuOptionBuilder,
    type Message,
} from 'discord.js';
import fs from 'fs';
import { client, sleep } from './index.ts';

const Mine_GlobalSettings = {
    lists: {
        material: [
            ['pebble', 0.5],
            ['stone', 1],
            ['quartz', 1.5],
        ],
        quality: [
            ['cracked', 0.5],
            ['raw', 1],
            ['polished', 1.5],
        ],
    },

    base_mine_stats: {
        max_inv_slots: 3,
    },
};

// ! Handler

export default function (msg: Message<true>, args: string[]) {
    const who = msg.author.id;
    const mine = getMine(who, msg.author.username);

    msg.channel.send({
        content: `<@${who}>`,
        embeds: [getEmbed('show', 'Your mine:', mine)],
        components: [getRow('home')],
    });
}

// ! Features

function mineDig(): MineLoot {
    const material = randArrItm(Mine_GlobalSettings.lists.material);
    const quality = randArrItm(Mine_GlobalSettings.lists.quality);

    return {
        material: material[0],
        quality: quality[0],
        worth: { base: material[1], mult: quality[1] },
    };
}

// ! Utilities
function getMine(author: string, author_username: string): MineData {
    // make sure storage & mine exist
    if (!fs.existsSync(`./storage`)) fs.mkdirSync('./storage');
    if (!fs.existsSync(`./storage/mine`)) fs.mkdirSync('./storage/mine');

    if (!fs.existsSync(`./storage/mine/${author}.json`)) {
        // template
        return {
            name: 'New Mine',
            owner: author_username,
            inventory: [],
            currency: 0,

            stats: {
                max_inv_slots:
                    Mine_GlobalSettings.base_mine_stats.max_inv_slots,
            },
        };
    } else {
        return JSON.parse(
            fs.readFileSync(`./storage/mine/${author}.json`).toString()
        );
    }
}

function getEmbed(type: MineEmbedType, text: string, mine: MineData) {
    const embed = new EmbedBuilder();
    embed.setFooter({ text: `Mine Game | ${mine.owner} | ${mine.name}` });
    embed.setTitle(text);

    if (type == 'dig') {
        embed.setColor('#572323');
    } else if (type == 'error') {
        embed.setColor('#a81e1e');
    } else if (type == 'show') {
        embed.setColor('#383641');

        embed.addFields(
            { value: `Currency: ${mine.currency}`, name: '' },
            {
                value: `Inventory: ${mine.inventory.length} Items.`,
                name: '',
            }
        );
    } else if (type == 'sellconfirm') {
        embed.setColor('#f3e308');
    } else if (type == 'sold') {
        embed.setColor('#87cb19');
    }

    return embed;
}

function getRow(type: MineRowType = 'home') {
    const row = new ActionRowBuilder<
        ButtonBuilder | StringSelectMenuBuilder
    >();

    // const favoriteStarterSelect = new StringSelectMenuBuilder()
    //     .setCustomId('starter')
    //     .setPlaceholder('Make a selection!')
    //     .addOptions(
    //         // String select menu options
    //         new StringSelectMenuOptionBuilder()
    //             // Label displayed to user
    //             .setLabel('Bulbasaur')
    //             // Description of option
    //             .setDescription('The dual-type Grass/Poison Seed Pokémon.')
    //             // Value returned in select menu interaction
    //             .setValue('bulbasaur'),
    //         new StringSelectMenuOptionBuilder()
    //             .setLabel('Charmander')
    //             .setDescription('The Fire-type Lizard Pokémon.')
    //             .setValue('charmander'),
    //         new StringSelectMenuOptionBuilder()
    //             .setLabel('Squirtle')
    //             .setDescription('The Water-type Tiny Turtle Pokémon.')
    //             .setValue('squirtle')
    //     );

    const btnHome = new ButtonBuilder()
        .setCustomId('mine.home')
        .setLabel('Home')
        .setStyle(ButtonStyle.Secondary);

    row.addComponents(btnHome);

    if (type == 'home') {
        const btnDig = new ButtonBuilder()
            .setCustomId('mine.dig')
            .setLabel('Dig')
            .setStyle(ButtonStyle.Primary);
        const btnSell = new ButtonBuilder()
            .setCustomId('mine.sell')
            .setLabel('Sell')
            .setStyle(ButtonStyle.Secondary);
        const btnClose = new ButtonBuilder()
            .setCustomId('mine.close')
            .setLabel('Close')
            .setStyle(ButtonStyle.Danger);
        const btnInventory = new ButtonBuilder()
            .setCustomId('mine.inventory')
            .setLabel('Inventory')
            .setStyle(ButtonStyle.Secondary);

        row.addComponents(btnInventory);
        row.addComponents(btnDig);
        row.addComponents(btnSell);
        row.addComponents(btnClose);
    } else if (type == 'sellconfirm') {
        const btnSellConfirm = new ButtonBuilder()
            .setCustomId('mine.sell.yes')
            .setLabel('Yes')
            .setStyle(ButtonStyle.Success);

        const btnSellCancel = new ButtonBuilder()
            .setCustomId('mine.sell.no')
            .setLabel('No')
            .setStyle(ButtonStyle.Danger);

        row.addComponents(btnSellConfirm);
        row.addComponents(btnSellCancel);
    }

    return row;
}

export async function handleMineButtonInteraction(
    interaction: ButtonInteraction
) {
    const who = interaction.user.id;
    const mine = getMine(who, interaction.user.username);

    await interaction.deferUpdate();
    if (interaction.message.content != `<@${who}>`) {
        if (interaction.channel?.isSendable()) {
            interaction.channel.send({
                content: `<@${who}>`,
                embeds: [getEmbed('show', 'Your mine:', mine)],
                components: [getRow('home')],
            });
        }
        return;
    }

    if (interaction.customId === 'mine.dig') {
        if (mine.inventory.length == mine.stats.max_inv_slots) {
            interaction.editReply({
                content: `<@${who}>`,
                embeds: [getEmbed('error', 'Inventory full', mine)],
                components: [getRow()],
            });
        } else {
            const loot = mineDig();
            mine.inventory.push(loot);
            interaction.editReply({
                content: `<@${who}>`,
                embeds: [
                    getEmbed(
                        'dig',
                        `You got ${loot.quality} ${loot.material}!`,
                        mine
                    ),
                ],
                components: [getRow()],
            });

            saveMine(who, mine);
        }
    } else if (
        interaction.customId === 'mine.home' ||
        interaction.customId === 'mine.sell.no'
    ) {
        interaction.editReply({
            content: `<@${who}>`,
            embeds: [getEmbed('show', 'Your mine:', mine)],
            components: [getRow('home')],
        });
    } else if (interaction.customId === 'mine.sell') {
        interaction.editReply({
            content: `<@${who}>`,
            embeds: [getEmbed('sellconfirm', 'Sell all?', mine)],
            components: [getRow('sellconfirm')],
        });
    } else if (interaction.customId === 'mine.sell.yes') {
        // sell all

        let items = mine.inventory.length;
        let total = 0;
        for (let item of mine.inventory) {
            total += item.worth.base * item.worth.mult;
        }
        mine.inventory = [];
        mine.currency += total;

        interaction.editReply({
            content: `<@${who}>`,
            embeds: [
                getEmbed(
                    'sold',
                    `Sold ${items} items for $${total}`,
                    mine
                ),
            ],
            components: [getRow('default')],
        });

        saveMine(who, mine);
    } else if (interaction.customId === 'mine.close') {
        await interaction.editReply({
            embeds: [],
            components: [],
            content: `# > This message will get deleted in 5 seconds \n Use a.mine to start again.`,
        });
        await sleep(5);
        if (interaction.message.deletable)
            await interaction.message.delete();
    } else if (interaction.customId === 'mine.inventory') {
        const invRow = new ActionRowBuilder<
            ButtonBuilder | StringSelectMenuBuilder
        >();

        const selector = new StringSelectMenuBuilder()
            .setCustomId('mine.invselect')
            .setPlaceholder('Check your items here.');

        let items = mine.inventory.length;
        if (items == 0) {
            selector.addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('Nothing here yet...')
                    .setDescription('$0')
                    .setValue('mine.inv_empty')
            );
        } else {
            let i = 0;
            for (let item of mine.inventory) {
                selector.addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(`${item.quality} ${item.material}`)
                        .setDescription(
                            `$${item.worth.base * item.worth.mult}`
                        )
                        .setValue(`mine.inv_${i}`)
                );
                i++;
            }
        }
        invRow.addComponents(selector);

        interaction.editReply({
            content: `<@${who}>`,
            embeds: [getEmbed('show', 'Your items:', mine)],
            components: [getRow('default'), invRow],
        });
    } else {
        interaction.editReply({
            content: `<@${who}>`,
            embeds: [
                getEmbed('error', 'This doesnt exist yet, my bad', mine),
            ],
            components: [getRow('default')],
        });
    }
}
export async function handleMineSelectInteraction(
    interaction: StringSelectMenuInteraction
) {
    await interaction.deferUpdate();
    console.log(interaction.values);
}

function saveMine(author: string, mine: MineData) {
    fs.writeFileSync(
        `./storage/mine/${author}.json`,
        JSON.stringify(mine)
    );
}

function randArrItm(arr: any[]) {
    return arr[Math.floor(Math.random() * arr.length)];
}

//types
type MineEmbedType = 'error' | 'dig' | 'show' | 'sellconfirm' | 'sold';
type MineRowType = 'home' | 'default' | 'sellconfirm' | 'inventory';

type MineData = {
    name: string;
    owner: string;

    inventory: MineLoot[];
    currency: number;
    stats: {
        max_inv_slots: number;
    };
};

type MineLoot = {
    material: string;
    quality: string;
    worth: { base: number; mult: number };
};
