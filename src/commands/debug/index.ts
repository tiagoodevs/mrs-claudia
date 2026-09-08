import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { BotCommand, enableEverywhere } from '../../client';
import { errorEmbed } from '../../utils/embedBuilder';

import * as dnsCmd from './dns';
import * as headers from './headers';
import * as ssl from './ssl';
import * as ping from './ping';

const subcommands = [dnsCmd, headers, ssl, ping];

const data = enableEverywhere(
    new SlashCommandBuilder().setName('debug').setDescription('Network & domain diagnostic toolkit.'),
);

for (const sub of subcommands) {
    data.addSubcommand((s) => sub.buildSubcommand(s));
}

async function run(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommandName = interaction.options.getSubcommand();
    const handler = subcommands.find((s) => s.subcommandName === subcommandName);

    if (!handler) {
        await interaction.reply({
            embeds: [errorEmbed({ title: '❌ Unknown Subcommand', description: `No handler registered for \`/debug ${subcommandName}\`.` })],
            flags: 64,
        });
        return;
    }

    await handler.execute(interaction);
}

export const debugCommand: BotCommand = { data, execute: run };
