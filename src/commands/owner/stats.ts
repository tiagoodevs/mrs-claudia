import { ActivityType, ChatInputCommandInteraction, SlashCommandSubcommandGroupBuilder } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ownerEmbed, errorEmbed } from '../../utils/embedBuilder';
import { getLogCount } from '../../database/queries/logQueries';
import { getDatabase } from '../../database/index';
import { BotClient } from '../../client';

export const groupName = 'stats';

function formatUptime(seconds: number): string {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
}

function formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex++;
    }
    return `${value.toFixed(2)} ${units[unitIndex]}`;
}

export function buildGroup(group: SlashCommandSubcommandGroupBuilder): SlashCommandSubcommandGroupBuilder {
    return group
        .setName(groupName)
        .setDescription('Process stats and presence management.')
        .addSubcommand((sub) => sub.setName('stats').setDescription('Display process memory, uptime, CPU load, and DB file size.'))
        .addSubcommand((sub) =>
            sub
                .setName('status')
                .setDescription('Update the bot rich presence.')
                .addStringOption((opt) => opt.setName('text').setDescription('Presence text').setRequired(true))
                .addStringOption((opt) =>
                    opt
                        .setName('type')
                        .setDescription('Activity type')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Playing', value: 'Playing' },
                            { name: 'Watching', value: 'Watching' },
                            { name: 'Listening', value: 'Listening' },
                            { name: 'Competing', value: 'Competing' },
                        ),
                ),
        );
}

async function handleStats(interaction: ChatInputCommandInteraction): Promise<void> {
    const memory = process.memoryUsage();
    const uptimeSeconds = process.uptime();
    const loadAvg = os.loadavg();

    const dbPath = path.resolve(process.cwd(), process.env.DATABASE_PATH || './database.sqlite');
    const dbSize = fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0;

    const client = interaction.client as BotClient;

    await interaction.reply({
        embeds: [
            ownerEmbed({
                title: '📊 Process Statistics',
                fields: [
                    { name: 'Uptime', value: formatUptime(uptimeSeconds), inline: true },
                    { name: 'Heap Used', value: formatBytes(memory.heapUsed), inline: true },
                    { name: 'RSS', value: formatBytes(memory.rss), inline: true },
                    { name: 'Load Avg (1m/5m/15m)', value: loadAvg.map((n) => n.toFixed(2)).join(' / '), inline: true },
                    { name: 'Database Size', value: formatBytes(dbSize), inline: true },
                    { name: 'Total API Logs', value: String(getLogCount()), inline: true },
                    { name: 'Guilds Connected', value: String(client.guilds.cache.size), inline: true },
                    { name: 'Node.js Version', value: process.version, inline: true },
                    { name: 'Platform', value: `${os.platform()} (${os.arch()})`, inline: true },
                ],
            }),
        ],
    });
}

async function handleStatus(interaction: ChatInputCommandInteraction): Promise<void> {
    const text = interaction.options.getString('text', true);
    const typeStr = interaction.options.getString('type') ?? 'Watching';

    const typeMap: Record<string, ActivityType> = {
        Playing: ActivityType.Playing,
        Watching: ActivityType.Watching,
        Listening: ActivityType.Listening,
        Competing: ActivityType.Competing,
    };

    const client = interaction.client as BotClient;
    client.user?.setActivity(text, { type: typeMap[typeStr] ?? ActivityType.Watching });

    const db = getDatabase();
    db.prepare(
        "INSERT INTO system_config (config_key, config_value, updated_at) VALUES ('bot_status_text', ?, datetime('now')) ON CONFLICT(config_key) DO UPDATE SET config_value = excluded.config_value, updated_at = datetime('now')",
    ).run(text);

    await interaction.reply({
        embeds: [ownerEmbed({ title: '🎮 Presence Updated', description: `Now showing **${typeStr} ${text}**.` })],
    });
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
        case 'stats':
            return handleStats(interaction);
        case 'status':
            return handleStatus(interaction);
        default:
            await interaction.reply({ embeds: [errorEmbed({ title: '❌ Unknown Subcommand', description: subcommand })], flags: 64 });
    }
}
