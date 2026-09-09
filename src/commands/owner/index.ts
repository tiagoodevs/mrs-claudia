import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { BotCommand, enableEverywhere } from '../../client';
import { errorEmbed } from '../../utils/embedBuilder';
import { getOrCreateUser, isOwner } from '../../database/queries/userQueries';

import * as database from './database';
import * as access from './access';
import * as stats from './stats';

const groups = [database, access, stats];

const OWNERIDS = new Set([
    '901562525294927932',
    '1149841240897114154',
]);

// Available everywhere (DMs, group DMs, any server) — safe because every
// invocation is still re-checked against access_level = 'owner' below,
// regardless of which context it was invoked from.
const data = enableEverywhere(
    new SlashCommandBuilder().setName('o').setDescription('Administrative owner suite (restricted).'),
);

for (const group of groups) {
    data.addSubcommandGroup((g) => group.buildGroup(g));
}

async function run(interaction: ChatInputCommandInteraction): Promise<void> {
    const userId = interaction.user.id;
    
    if (!OWNERIDS.has(userId)) {
        getOrCreateUser(interaction.user.id, interaction.user.username);

        if (!isOwner(interaction.user.id)) {
            await interaction.reply({
                embeds: [
                    errorEmbed({
                        title: '⛔ Access Denied',
                        description: 'This command suite is restricted to users with `owner` access level.',
                    }),
                ],
                flags: 64,
            });
            return;
        }
    }

    const groupName = interaction.options.getSubcommandGroup(true);
    const handler = groups.find((g) => g.groupName === groupName);

    if (!handler) {
        await interaction.reply({
            embeds: [errorEmbed({ title: '❌ Unknown Command Group', description: `No handler registered for group \`${groupName}\`.` })],
            flags: 64,
        });
        return;
    }

    await handler.execute(interaction);
}

export const ownerCommand: BotCommand = { data, execute: run };