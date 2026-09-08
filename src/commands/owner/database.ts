import { ChatInputCommandInteraction, SlashCommandSubcommandGroupBuilder, AttachmentBuilder } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { getDatabase } from '../../database/index';
import { ownerEmbed, errorEmbed } from '../../utils/embedBuilder';
import { safeFieldValue, codeBlock } from '../../utils/fileAttachment';
import { clearAllLogs, clearLogsOlderThan } from '../../database/queries/logQueries';

export const groupName = 'database';

// Only non-destructive statement types are permitted through sql-query for safety.
const READ_ONLY_PATTERN = /^\s*(SELECT|PRAGMA|EXPLAIN)\b/i;
const WRITE_PATTERN = /^\s*(INSERT|UPDATE|DELETE|REPLACE)\b/i;

export function buildGroup(group: SlashCommandSubcommandGroupBuilder): SlashCommandSubcommandGroupBuilder {
    return group
        .setName(groupName)
        .setDescription('Database administration tools.')
        .addSubcommand((sub) =>
            sub
                .setName('sql-query')
                .setDescription('Run a SQL query against database.sqlite (owner only).')
                .addStringOption((opt) => opt.setName('query').setDescription('SQL statement to execute').setRequired(true))
                .addBooleanOption((opt) => opt.setName('allow_write').setDescription('Explicitly allow INSERT/UPDATE/DELETE (default: false)').setRequired(false)),
        )
        .addSubcommand((sub) => sub.setName('db-backup').setDescription('Generate and attach a backup of database.sqlite.'))
        .addSubcommand((sub) =>
            sub
                .setName('wipe-logs')
                .setDescription('Clear api_logs entries.')
                .addIntegerOption((opt) => opt.setName('older_than_days').setDescription('Only delete logs older than N days (omit to wipe all)').setRequired(false)),
        );
}

async function handleSqlQuery(interaction: ChatInputCommandInteraction): Promise<void> {
    const query = interaction.options.getString('query', true);
    const allowWrite = interaction.options.getBoolean('allow_write') ?? false;

    if (WRITE_PATTERN.test(query) && !allowWrite) {
        await interaction.reply({
            embeds: [errorEmbed({ title: '⛔ Write Operation Blocked', description: 'This looks like a write statement. Re-run with `allow_write: true` to confirm you intend to modify data.' })],
            flags: 64,
        });
        return;
    }

    if (!READ_ONLY_PATTERN.test(query) && !WRITE_PATTERN.test(query)) {
        await interaction.reply({
            embeds: [errorEmbed({ title: '⛔ Statement Not Permitted', description: 'Only SELECT, PRAGMA, EXPLAIN, INSERT, UPDATE, DELETE, and REPLACE statements are allowed.' })],
            flags: 64,
        });
        return;
    }

    await interaction.deferReply();

    try {
        const db = getDatabase();
        const isRead = READ_ONLY_PATTERN.test(query);

        let output: string;
        if (isRead) {
            const rows = db.prepare(query).all();
            output = JSON.stringify(rows, null, 2);
        } else {
            const result = db.prepare(query).run();
            output = JSON.stringify({ changes: result.changes, lastInsertRowid: Number(result.lastInsertRowid) }, null, 2);
        }

        const { preview, attachment } = safeFieldValue(codeBlock(output, 'json'), 'query-result.json');

        await interaction.editReply({
            embeds: [ownerEmbed({ title: '🗄️ SQL Query Result', description: codeBlock(query, 'sql'), fields: [{ name: 'Result', value: preview }] })],
            files: attachment ? [attachment] : undefined,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown SQL error';
        await interaction.editReply({
            embeds: [errorEmbed({ title: '❌ Query Error', description: codeBlock(query, 'sql'), fields: [{ name: 'Error', value: message }] })],
        });
    }
}

async function handleDbBackup(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const dbPath = path.resolve(process.cwd(), process.env.DATABASE_PATH || './database.sqlite');

    if (!fs.existsSync(dbPath)) {
        await interaction.editReply({ embeds: [errorEmbed({ title: '❌ Backup Failed', description: 'Database file not found on disk.' })] });
        return;
    }

    // Ensure a checkpoint so the backup file reflects the latest WAL data.
    getDatabase().pragma('wal_checkpoint(FULL)');

    const buffer = fs.readFileSync(dbPath);
    const filename = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`;
    const attachment = new AttachmentBuilder(buffer, { name: filename });

    await interaction.editReply({
        embeds: [ownerEmbed({ title: '💾 Database Backup Ready', description: `Snapshot generated (${(buffer.length / 1024).toFixed(1)} KB).` })],
        files: [attachment],
    });
}

async function handleWipeLogs(interaction: ChatInputCommandInteraction): Promise<void> {
    const olderThanDays = interaction.options.getInteger('older_than_days');

    const deleted = olderThanDays ? clearLogsOlderThan(olderThanDays) : clearAllLogs();

    await interaction.reply({
        embeds: [
            ownerEmbed({
                title: '🧹 Logs Cleared',
                description: olderThanDays
                    ? `Removed **${deleted}** log entries older than **${olderThanDays}** days.`
                    : `Removed **${deleted}** total log entries.`,
            }),
        ],
    });
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
        case 'sql-query':
            return handleSqlQuery(interaction);
        case 'db-backup':
            return handleDbBackup(interaction);
        case 'wipe-logs':
            return handleWipeLogs(interaction);
        default:
            await interaction.reply({ embeds: [errorEmbed({ title: '❌ Unknown Subcommand', description: subcommand })], flags: 64 });
    }
}
