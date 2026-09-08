import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { BotCommand, enableEverywhere } from '../../client';
import { errorEmbed } from '../../utils/embedBuilder';

import * as base64 from './base64';
import * as cryptoUtil from './crypto';
import * as formatters from './formatters';

const data = enableEverywhere(
    new SlashCommandBuilder().setName('util').setDescription('General-purpose utility engine.'),
);

data.addSubcommand((s) => base64.buildEncodeSubcommand(s));
data.addSubcommand((s) => base64.buildDecodeSubcommand(s));
data.addSubcommand((s) => cryptoUtil.buildHashSubcommand(s));
data.addSubcommand((s) => cryptoUtil.buildJwtSubcommand(s));
data.addSubcommand((s) => formatters.buildSubcommand(s));

const dispatch: Record<string, (interaction: ChatInputCommandInteraction) => Promise<void>> = {
    [base64.subcommandName]: base64.executeEncode,
    [base64.decodeSubcommandName]: base64.executeDecode,
    [cryptoUtil.hashSubcommandName]: cryptoUtil.executeHash,
    [cryptoUtil.jwtSubcommandName]: cryptoUtil.executeJwtDecode,
    [formatters.subcommandName]: formatters.execute,
};

async function run(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommandName = interaction.options.getSubcommand();
    const handler = dispatch[subcommandName];

    if (!handler) {
        await interaction.reply({
            embeds: [errorEmbed({ title: '❌ Unknown Subcommand', description: `No handler registered for \`/util ${subcommandName}\`.` })],
            flags: 64,
        });
        return;
    }

    await handler(interaction);
}

export const utilCommand: BotCommand = { data, execute: run };
