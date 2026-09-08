import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from 'discord.js';
import { executeHttpRequest, HttpRequestOptions } from '../../utils/httpClient';
import { statusEmbed, errorEmbed, truncate } from '../../utils/embedBuilder';
import { buildPayloadOutput } from '../../utils/fileAttachment';
import { insertLog } from '../../database/queries/logQueries';
import { checkAndIncrementRateLimit } from '../../database/queries/userQueries';

export const subcommandName = 'request';

const METHOD_CHOICES = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'] as const;

export function buildSubcommand(sub: SlashCommandSubcommandBuilder): SlashCommandSubcommandBuilder {
    return sub
        .setName(subcommandName)
        .setDescription('Execute a standard REST API request.')
        .addStringOption((opt) =>
            opt
                .setName('method')
                .setDescription('HTTP method')
                .setRequired(true)
                .addChoices(...METHOD_CHOICES.map((m) => ({ name: m, value: m }))),
        )
        .addStringOption((opt) => opt.setName('url').setDescription('Target URL').setRequired(true))
        .addStringOption((opt) =>
            opt.setName('headers').setDescription('JSON object of extra headers').setRequired(false),
        )
        .addStringOption((opt) =>
            opt.setName('body').setDescription('Raw JSON request body').setRequired(false),
        )
        .addStringOption((opt) =>
            opt
                .setName('auth_type')
                .setDescription('Authentication type')
                .setRequired(false)
                .addChoices(
                    { name: 'None', value: 'none' },
                    { name: 'Bearer Token', value: 'bearer' },
                    { name: 'Basic (user:pass)', value: 'basic' },
                    { name: 'API Key Header', value: 'apikey' },
                ),
        )
        .addStringOption((opt) =>
            opt.setName('auth_value').setDescription('Token / user:pass / API key value').setRequired(false),
        )
        .addStringOption((opt) =>
            opt
                .setName('auth_header_name')
                .setDescription('Header name for API key auth (default: X-API-Key)')
                .setRequired(false),
        );
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const method = interaction.options.getString('method', true) as HttpRequestOptions['method'];
    const url = interaction.options.getString('url', true);
    const headersRaw = interaction.options.getString('headers');
    const bodyRaw = interaction.options.getString('body');
    const authType = (interaction.options.getString('auth_type') ?? 'none') as HttpRequestOptions['authType'];
    const authValue = interaction.options.getString('auth_value') ?? undefined;
    const authHeaderName = interaction.options.getString('auth_header_name') ?? undefined;

    const { allowed } = checkAndIncrementRateLimit(interaction.user.id);
    if (!allowed) {
        await interaction.editReply({
            embeds: [errorEmbed({ title: '⛔ Rate Limit Exceeded', description: 'You have exceeded your configured request rate limit. Please wait before trying again.' })],
        });
        return;
    }

    let parsedHeaders: Record<string, string> | undefined;
    let parsedBody: unknown;

    try {
        if (headersRaw) parsedHeaders = JSON.parse(headersRaw);
    } catch {
        await interaction.editReply({
            embeds: [errorEmbed({ title: '❌ Invalid Headers JSON', description: 'The `headers` option must be valid JSON, e.g. `{"X-Custom": "value"}`.' })],
        });
        return;
    }

    try {
        if (bodyRaw) parsedBody = JSON.parse(bodyRaw);
    } catch {
        await interaction.editReply({
            embeds: [errorEmbed({ title: '❌ Invalid Body JSON', description: 'The `body` option must be valid JSON.' })],
        });
        return;
    }

    const result = await executeHttpRequest({
        method,
        url,
        headers: parsedHeaders,
        body: parsedBody,
        authType,
        authValue,
        authHeaderName,
    });

    insertLog({
        userId: interaction.user.id,
        guildId: interaction.guildId,
        command: 'api/request',
        method,
        targetUrl: url,
        statusCode: result.status,
        durationMs: result.durationMs,
        success: result.ok,
        errorMessage: result.error ?? null,
    });

    if (result.error) {
        await interaction.editReply({
            embeds: [
                errorEmbed({
                    title: '❌ Request Failed',
                    description: `Could not complete request to \`${truncate(url, 200)}\`.`,
                    fields: [{ name: 'Error', value: truncate(result.error, 1024) }],
                }),
            ],
        });
        return;
    }

    // Safely stringify objects/arrays so they don't print [object Object]
    let responseString = '';
    if (result.data !== null && result.data !== undefined) {
        responseString = typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2);
    }

    const { preview, attachment } = buildPayloadOutput(responseString, 'response.json');

    const embed = statusEmbed(result.status, {
        title: `${method} ${result.status} ${result.statusText ?? ''}`.trim(),
        description: `Request to \`${truncate(url, 200)}\``,
        fields: [
            { name: 'Duration', value: `${result.durationMs}ms`, inline: true },
            { name: 'Status', value: String(result.status ?? 'N/A'), inline: true },
            { name: 'Response Body', value: preview || '*(empty response)*' },
        ],
    });

    await interaction.editReply({
        embeds: [embed],
        files: attachment ? [attachment] : undefined,
    });
}
