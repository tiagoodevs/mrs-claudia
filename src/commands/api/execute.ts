import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from 'discord.js';
import { executeHttpRequest, HttpRequestOptions } from '../../utils/httpClient';
import { statusEmbed, errorEmbed, truncate } from '../../utils/embedBuilder';
import { buildPayloadOutput } from '../../utils/fileAttachment';
import { insertLog } from '../../database/queries/logQueries';
import { checkAndIncrementRateLimit } from '../../database/queries/userQueries';
import { SerializedRequestConfig } from './builder';

export const subcommandName = 'execute';

export function buildSubcommand(sub: SlashCommandSubcommandBuilder): SlashCommandSubcommandBuilder {
    return sub
        .setName(subcommandName)
        .setDescription('Decode and execute a Base64 request configuration produced by /api builder.')
        .addStringOption((opt) =>
            opt.setName('config').setDescription('Base64-encoded request configuration').setRequired(true),
        );
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const encoded = interaction.options.getString('config', true);

    let config: SerializedRequestConfig;
    try {
        const json = Buffer.from(encoded, 'base64').toString('utf-8');
        config = JSON.parse(json);
        if (!config.method || !config.url) throw new Error('Missing method or url');
    } catch {
        await interaction.editReply({
            embeds: [errorEmbed({ title: '❌ Invalid Configuration', description: 'Could not decode a valid request configuration from the provided Base64 string.' })],
        });
        return;
    }

    const { allowed } = checkAndIncrementRateLimit(interaction.user.id);
    if (!allowed) {
        await interaction.editReply({
            embeds: [errorEmbed({ title: '⛔ Rate Limit Exceeded', description: 'You have exceeded your configured request rate limit. Please wait before trying again.' })],
        });
        return;
    }

    const result = await executeHttpRequest({
        method: config.method as HttpRequestOptions['method'],
        url: config.url,
        headers: config.headers,
        body: config.body,
        authType: (config.authType ?? 'none') as HttpRequestOptions['authType'],
        authValue: config.authValue,
        authHeaderName: config.authHeaderName,
    });

    insertLog({
        userId: interaction.user.id,
        guildId: interaction.guildId,
        command: 'api/execute',
        method: config.method,
        targetUrl: config.url,
        statusCode: result.status,
        durationMs: result.durationMs,
        success: result.ok,
        errorMessage: result.error ?? null,
    });

    if (result.error) {
        await interaction.editReply({
            embeds: [
                errorEmbed({
                    title: '❌ Execution Failed',
                    description: `Decoded request to \`${truncate(config.url, 200)}\` could not be completed.`,
                    fields: [{ name: 'Error', value: truncate(result.error, 1024) }],
                }),
            ],
        });
        return;
    }

    const { preview, attachment } = buildPayloadOutput(result.data as string);

    await interaction.editReply({
        embeds: [
            statusEmbed(result.status, {
                title: `${config.method} ${result.status} ${result.statusText ?? ''}`.trim(),
                description: `Decoded & executed request to \`${truncate(config.url, 200)}\``,
                fields: [
                    { name: 'Duration', value: `${result.durationMs}ms`, inline: true },
                    { name: 'Status', value: String(result.status ?? 'N/A'), inline: true },
                    { name: 'Response Body', value: preview || '*(empty response)*' },
                ],
            }),
        ],
        files: attachment ? [attachment] : undefined,
    });
}
