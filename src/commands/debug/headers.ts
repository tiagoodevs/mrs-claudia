import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from 'discord.js';
import { fetchHeadersOnly } from '../../utils/httpClient';
import { statusEmbed, errorEmbed, truncate } from '../../utils/embedBuilder';
import { safeFieldValue, codeBlock } from '../../utils/fileAttachment';
import { insertLog } from '../../database/queries/logQueries';

export const subcommandName = 'headers';

export function buildSubcommand(sub: SlashCommandSubcommandBuilder): SlashCommandSubcommandBuilder {
    return sub
        .setName(subcommandName)
        .setDescription('Fetch and display raw HTTP response headers for a URL.')
        .addStringOption((opt) => opt.setName('url').setDescription('Target URL').setRequired(true))
        .addStringOption((opt) =>
            opt
                .setName('method')
                .setDescription('HTTP method (default GET)')
                .setRequired(false)
                .addChoices({ name: 'GET', value: 'GET' }, { name: 'HEAD', value: 'HEAD' }, { name: 'POST', value: 'POST' }),
        );
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const url = interaction.options.getString('url', true);
    const method = (interaction.options.getString('method') ?? 'GET') as 'GET' | 'HEAD' | 'POST';

    const result = await fetchHeadersOnly(url, method);

    insertLog({
        userId: interaction.user.id,
        guildId: interaction.guildId,
        command: 'debug/headers',
        method,
        targetUrl: url,
        statusCode: result.status,
        durationMs: result.durationMs,
        success: !result.error,
        errorMessage: result.error ?? null,
    });

    if (result.error) {
        await interaction.editReply({
            embeds: [errorEmbed({ title: '❌ Header Fetch Failed', description: `Could not fetch headers for \`${truncate(url, 200)}\`.`, fields: [{ name: 'Error', value: truncate(result.error, 1024) }] })],
        });
        return;
    }

    const headerText = Object.entries(result.headers)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');

    const { preview, attachment } = safeFieldValue(codeBlock(headerText || '(no headers returned)'), 'headers.txt');

    await interaction.editReply({
        embeds: [
            statusEmbed(result.status, {
                title: `📋 HTTP Headers — ${result.status ?? 'N/A'}`,
                description: `\`${method}\` \`${truncate(url, 200)}\` — ${result.durationMs}ms`,
                fields: [{ name: 'Response Headers', value: preview }],
            }),
        ],
        files: attachment ? [attachment] : undefined,
    });
}
