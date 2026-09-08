import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from 'discord.js';
import { executeHttpRequest } from '../../utils/httpClient';
import { successEmbed, errorEmbed, truncate } from '../../utils/embedBuilder';
import { insertLog } from '../../database/queries/logQueries';
import { checkAndIncrementRateLimit } from '../../database/queries/userQueries';

export const subcommandName = 'webhook';

export function buildSubcommand(sub: SlashCommandSubcommandBuilder): SlashCommandSubcommandBuilder {
    return sub
        .setName(subcommandName)
        .setDescription('Trigger a JSON payload to a webhook URL (Discord, Slack, or generic).')
        .addStringOption((opt) => opt.setName('url').setDescription('Webhook URL').setRequired(true))
        .addStringOption((opt) =>
            opt.setName('payload').setDescription('Raw JSON payload to send').setRequired(true),
        );
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const url = interaction.options.getString('url', true);
    const payloadRaw = interaction.options.getString('payload', true);

    const { allowed } = checkAndIncrementRateLimit(interaction.user.id);
    if (!allowed) {
        await interaction.editReply({
            embeds: [errorEmbed({ title: '⛔ Rate Limit Exceeded', description: 'You have exceeded your configured request rate limit. Please wait before trying again.' })],
        });
        return;
    }

    let payload: unknown;
    try {
        payload = JSON.parse(payloadRaw);
    } catch {
        await interaction.editReply({
            embeds: [errorEmbed({ title: '❌ Invalid Payload JSON', description: 'The `payload` option must be valid JSON.' })],
        });
        return;
    }

    const result = await executeHttpRequest({ method: 'POST', url, body: payload });

    insertLog({
        userId: interaction.user.id,
        guildId: interaction.guildId,
        command: 'api/webhook',
        method: 'POST',
        targetUrl: url,
        statusCode: result.status,
        durationMs: result.durationMs,
        success: result.ok,
        errorMessage: result.error ?? null,
    });

    if (result.error || !result.ok) {
        await interaction.editReply({
            embeds: [
                errorEmbed({
                    title: '❌ Webhook Delivery Failed',
                    description: `Could not deliver payload to \`${truncate(url, 200)}\`.`,
                    fields: [
                        { name: 'Status', value: String(result.status ?? 'N/A'), inline: true },
                        { name: 'Error', value: truncate(result.error ?? 'Non-success status code returned.', 1024) },
                    ],
                }),
            ],
        });
        return;
    }

    await interaction.editReply({
        embeds: [
            successEmbed({
                title: '✅ Webhook Delivered',
                description: `Payload successfully delivered to \`${truncate(url, 200)}\`.`,
                fields: [
                    { name: 'Status', value: String(result.status), inline: true },
                    { name: 'Duration', value: `${result.durationMs}ms`, inline: true },
                ],
            }),
        ],
    });
}
