import { Interaction } from 'discord.js';
import { BotClient } from '../client';
import { errorEmbed } from '../utils/embedBuilder';
import { getOrCreateUser, isBlacklisted } from '../database/queries/userQueries';
import { getOrCreateGuild, isGuildBlacklisted } from '../database/queries/guildQueries';

export async function handleInteractionCreate(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) return;

    const client = interaction.client as BotClient;
    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.warn(`[interactionCreate] Unknown command: ${interaction.commandName}`);
        return;
    }

    // Global guard: sync user/guild rows and enforce blacklist status before dispatch.
    getOrCreateUser(interaction.user.id, interaction.user.username);

    if (isBlacklisted(interaction.user.id)) {
        await interaction.reply({
            embeds: [errorEmbed({ title: '⛔ Access Denied', description: 'Your account has been blacklisted from using this bot.' })],
            flags: 64,
        });
        return;
    }

    if (interaction.guildId) {
        getOrCreateGuild(interaction.guildId, interaction.guild?.name);

        if (isGuildBlacklisted(interaction.guildId)) {
            await interaction.reply({
                embeds: [errorEmbed({ title: '⛔ Server Blacklisted', description: 'This server has been blacklisted from using this bot.' })],
                flags: 64,
            });
            return;
        }
    }

    try {
        await command.execute(interaction);
    } catch (err) {
        console.error(`[interactionCreate] Error executing /${interaction.commandName}:`, err);

        const embed = errorEmbed({
            title: '💥 Unexpected Error',
            description: 'Something went wrong while executing this command. The issue has been logged.',
        });

        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ embeds: [embed] }).catch(() => undefined);
        } else {
            await interaction.reply({ embeds: [embed], flags: 64 }).catch(() => undefined);
        }
    }
}
