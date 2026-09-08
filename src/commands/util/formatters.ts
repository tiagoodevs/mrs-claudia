import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from 'discord.js';
import { infoEmbed, errorEmbed } from '../../utils/embedBuilder';
import { safeFieldValue, codeBlock } from '../../utils/fileAttachment';

export const subcommandName = 'json-format';

export function buildSubcommand(sub: SlashCommandSubcommandBuilder): SlashCommandSubcommandBuilder {
    return sub
        .setName(subcommandName)
        .setDescription('Pretty-print or minify a raw JSON string.')
        .addStringOption((opt) => opt.setName('json').setDescription('Raw JSON string').setRequired(true))
        .addStringOption((opt) =>
            opt
                .setName('mode')
                .setDescription('Format mode')
                .setRequired(true)
                .addChoices({ name: 'Pretty-print', value: 'pretty' }, { name: 'Minify', value: 'minify' }),
        );
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const raw = interaction.options.getString('json', true);
    const mode = interaction.options.getString('mode', true);

    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Invalid JSON';
        await interaction.reply({
            embeds: [errorEmbed({ title: '❌ Invalid JSON', description: message })],
            flags: 64,
        });
        return;
    }

    const output = mode === 'pretty' ? JSON.stringify(parsed, null, 2) : JSON.stringify(parsed);
    const { preview, attachment } = safeFieldValue(codeBlock(output, 'json'), `formatted.json`);

    await interaction.reply({
        embeds: [
            infoEmbed({
                title: mode === 'pretty' ? '🧾 JSON Pretty-Printed' : '📦 JSON Minified',
                fields: [{ name: 'Output', value: preview }],
            }),
        ],
        files: attachment ? [attachment] : undefined,
    });
}
