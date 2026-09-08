import { ChatInputCommandInteraction, SlashCommandSubcommandGroupBuilder } from 'discord.js';
import { ownerEmbed, errorEmbed } from '../../utils/embedBuilder';
import {
    getOrCreateUser,
    setBlacklisted,
    setRateLimit,
    setAccessLevel,
    getUserById,
} from '../../database/queries/userQueries';
import { setGuildBlacklisted, setGuildWhitelisted, getGuildById } from '../../database/queries/guildQueries';
import { getLogsByUser } from '../../database/queries/logQueries';

export const groupName = 'access';

export function buildGroup(group: SlashCommandSubcommandGroupBuilder): SlashCommandSubcommandGroupBuilder {
    return group
        .setName(groupName)
        .setDescription('Access control and rate limit management.')
        .addSubcommand((sub) =>
            sub
                .setName('blacklist-add')
                .setDescription('Blacklist a user or guild by ID.')
                .addStringOption((opt) => opt.setName('target_id').setDescription('Discord user or guild ID').setRequired(true))
                .addStringOption((opt) =>
                    opt
                        .setName('target_type')
                        .setDescription('Type of target')
                        .setRequired(true)
                        .addChoices({ name: 'User', value: 'user' }, { name: 'Guild', value: 'guild' }),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName('whitelist-add')
                .setDescription('Remove a user/guild from the blacklist or explicitly whitelist a guild.')
                .addStringOption((opt) => opt.setName('target_id').setDescription('Discord user or guild ID').setRequired(true))
                .addStringOption((opt) =>
                    opt
                        .setName('target_type')
                        .setDescription('Type of target')
                        .setRequired(true)
                        .addChoices({ name: 'User', value: 'user' }, { name: 'Guild', value: 'guild' }),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName('user-info')
                .setDescription('Display stored profile info for a user.')
                .addStringOption((opt) => opt.setName('user_id').setDescription('Discord user ID').setRequired(true)),
        )
        .addSubcommand((sub) =>
            sub
                .setName('rate-limit-set')
                .setDescription('Set a custom rate limit for a user.')
                .addStringOption((opt) => opt.setName('user_id').setDescription('Discord user ID').setRequired(true))
                .addIntegerOption((opt) => opt.setName('max_requests').setDescription('Max requests per window').setRequired(true))
                .addIntegerOption((opt) => opt.setName('window_seconds').setDescription('Window length in seconds').setRequired(true)),
        );
}

async function handleBlacklistAdd(interaction: ChatInputCommandInteraction): Promise<void> {
    const targetId = interaction.options.getString('target_id', true);
    const targetType = interaction.options.getString('target_type', true);

    if (targetType === 'user') {
        setBlacklisted(targetId, true);
    } else {
        setGuildBlacklisted(targetId, true);
    }

    await interaction.reply({
        embeds: [ownerEmbed({ title: '⛔ Blacklist Updated', description: `${targetType === 'user' ? 'User' : 'Guild'} \`${targetId}\` has been blacklisted.` })],
    });
}

async function handleWhitelistAdd(interaction: ChatInputCommandInteraction): Promise<void> {
    const targetId = interaction.options.getString('target_id', true);
    const targetType = interaction.options.getString('target_type', true);

    if (targetType === 'user') {
        setBlacklisted(targetId, false);
    } else {
        setGuildBlacklisted(targetId, false);
        setGuildWhitelisted(targetId, true);
    }

    await interaction.reply({
        embeds: [ownerEmbed({ title: '✅ Whitelist Updated', description: `${targetType === 'user' ? 'User' : 'Guild'} \`${targetId}\` has been whitelisted / unblocked.` })],
    });
}

async function handleUserInfo(interaction: ChatInputCommandInteraction): Promise<void> {
    const userId = interaction.options.getString('user_id', true);
    const user = getUserById(userId);

    if (!user) {
        await interaction.reply({
            embeds: [errorEmbed({ title: '❌ User Not Found', description: `No database record exists for \`${userId}\`.` })],
            flags: 64,
        });
        return;
    }

    const recentLogs = getLogsByUser(userId, 5);
    const logSummary = recentLogs.length
        ? recentLogs.map((l) => `\`${l.command}\` — ${l.success ? '✅' : '❌'} — ${l.created_at}`).join('\n')
        : '*(no request history)*';

    await interaction.reply({
        embeds: [
            ownerEmbed({
                title: `👤 User Info — ${user.username ?? user.user_id}`,
                fields: [
                    { name: 'User ID', value: user.user_id, inline: true },
                    { name: 'Access Level', value: user.access_level, inline: true },
                    { name: 'Blacklisted', value: user.is_blacklisted ? 'Yes' : 'No', inline: true },
                    { name: 'Rate Limit', value: `${user.rate_limit_max} / ${user.rate_limit_window_seconds}s`, inline: true },
                    { name: 'Request Count (window)', value: String(user.request_count), inline: true },
                    { name: 'Joined DB', value: user.created_at, inline: true },
                    { name: 'Recent Activity', value: logSummary },
                ],
            }),
        ],
    });
}

async function handleRateLimitSet(interaction: ChatInputCommandInteraction): Promise<void> {
    const userId = interaction.options.getString('user_id', true);
    const max = interaction.options.getInteger('max_requests', true);
    const window = interaction.options.getInteger('window_seconds', true);

    getOrCreateUser(userId);
    setRateLimit(userId, max, window);

    await interaction.reply({
        embeds: [ownerEmbed({ title: '⚙️ Rate Limit Updated', description: `User \`${userId}\` is now limited to **${max}** requests per **${window}** seconds.` })],
    });
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
        case 'blacklist-add':
            return handleBlacklistAdd(interaction);
        case 'whitelist-add':
            return handleWhitelistAdd(interaction);
        case 'user-info':
            return handleUserInfo(interaction);
        case 'rate-limit-set':
            return handleRateLimitSet(interaction);
        default:
            await interaction.reply({ embeds: [errorEmbed({ title: '❌ Unknown Subcommand', description: subcommand })], flags: 64 });
    }
}

// setAccessLevel is exported for potential reuse by other owner tools (e.g. promoting to 'owner').
export { setAccessLevel, getGuildById };
