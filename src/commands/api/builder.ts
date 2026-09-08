import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from 'discord.js';
import { infoEmbed, errorEmbed } from '../../utils/embedBuilder';
import { safeFieldValue, codeBlock } from '../../utils/fileAttachment';

export const subcommandName = 'builder';

export interface SerializedRequestConfig {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
    authType?: string;
    authValue?: string;
    authHeaderName?: string;
}

export function buildSubcommand(sub: SlashCommandSubcommandBuilder): SlashCommandSubcommandBuilder {
    return sub
        .setName(subcommandName)
        .setDescription('Build a portable Base64-encoded API request configuration.')
        .addStringOption((opt) =>
            opt
                .setName('method')
                .setDescription('HTTP method')
                .setRequired(true)
                .addChoices(
                    { name: 'GET', value: 'GET' },
                    { name: 'POST', value: 'POST' },
                    { name: 'PUT', value: 'PUT' },
                    { name: 'DELETE', value: 'DELETE' },
                    { name: 'PATCH', value: 'PATCH' },
                    { name: 'HEAD', value: 'HEAD' },
                ),
        )
        .addStringOption((opt) => opt.setName('url').setDescription('Target URL').setRequired(true))
        .addStringOption((opt) => opt.setName('headers').setDescription('JSON object of headers').setRequired(false))
        .addStringOption((opt) => opt.setName('body').setDescription('Raw JSON request body').setRequired(false))
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
        .addStringOption((opt) => opt.setName('auth_value').setDescription('Token / user:pass / API key value').setRequired(false));
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const method = interaction.options.getString('method', true);
    const url = interaction.options.getString('url', true);
    const headersRaw = interaction.options.getString('headers');
    const bodyRaw = interaction.options.getString('body'); 
    const authType = interaction.options.getString('auth_type') ?? 'none';
    const authValue = interaction.options.getString('auth_value') ?? undefined;

    let headers: Record<string, string> | undefined;
    let body: unknown;

    try {
        if (headersRaw) headers = JSON.parse(headersRaw);
        if (bodyRaw) body = JSON.parse(bodyRaw);
    } catch {
        await interaction.reply({
            embeds: [errorEmbed({ title: '❌ Invalid JSON', description: 'Both `headers` and `body` must be valid JSON if provided.' })],
            flags: 64,
        });
        return;
    }

    const config: SerializedRequestConfig = { method, url, headers, body, authType, authValue };
    const encoded = Buffer.from(JSON.stringify(config), 'utf-8').toString('base64');

    const rawCodeBlock = codeBlock(encoded);
    const { attachment } = safeFieldValue(rawCodeBlock, 'request-config.b64.txt');

    await interaction.reply({
        embeds: [
            infoEmbed({
                title: '🧱 Request Configuration Built',
                description: `Encoded **${method}** request to \`${url}\`.\n\nTap the code block below to copy it, or use \`/api execute\` with the string to run it later.`,
            }),
        ]
    });

    if (attachment) {
        await interaction.followUp({ files: [attachment] });
    } else {
        await interaction.followUp({ content: rawCodeBlock });
    }
}
