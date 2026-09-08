import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { BotCommand, enableEverywhere } from '../../client';
import { errorEmbed } from '../../utils/embedBuilder';

import * as request from './request';
import * as builder from './builder';
import * as execute from './execute';
import * as batch from './batch';
import * as webhook from './webhook';

const subcommands = [request, builder, execute, batch, webhook];

const data = enableEverywhere(
    new SlashCommandBuilder().setName('api').setDescription('REST API testing client suite.'),
);

for (const sub of subcommands) {
    data.addSubcommand((s) => sub.buildSubcommand(s));
}

async function run(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommandName = interaction.options.getSubcommand();
    const handler = subcommands.find((s) => s.subcommandName === subcommandName);

    if (!handler) {
        await interaction.reply({
            embeds: [errorEmbed({ title: '❌ Unknown Subcommand', description: `No handler registered for \`/api ${subcommandName}\`.` })],
            flags: 64,
        });
        return;
    }

    await handler.execute(interaction);
}

export const apiCommand: BotCommand = { data, execute: run };
