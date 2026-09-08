import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from 'discord.js';
import { infoEmbed, errorEmbed } from '../../utils/embedBuilder';
import { safeFieldValue, codeBlock } from '../../utils/fileAttachment';

export const subcommandName = 'encode';
export const decodeSubcommandName = 'decode';

export function buildEncodeSubcommand(sub: SlashCommandSubcommandBuilder): SlashCommandSubcommandBuilder {
    return sub
        .setName(subcommandName)
        .setDescription('Encode plain text to Base64.')
        .addStringOption((opt) => opt.setName('text').setDescription('Text to encode').setRequired(true));
}

export function buildDecodeSubcommand(sub: SlashCommandSubcommandBuilder): SlashCommandSubcommandBuilder {
    return sub
        .setName(decodeSubcommandName)
        .setDescription('Decode Base64 to plain text.')
        .addStringOption((opt) => opt.setName('encoded').setDescription('Base64 string to decode').setRequired(true));
}

export async function executeEncode(interaction: ChatInputCommandInteraction): Promise<void> {
    const text = interaction.options.getString('text', true);
    const encoded = Buffer.from(text, 'utf-8').toString('base64');
    
    const rawCodeBlock = codeBlock(encoded);
    const { attachment } = safeFieldValue(rawCodeBlock, 'encoded.b64.txt');

    await interaction.reply({
        embeds: [
            infoEmbed({
                title: '🔤 Base64 Encoded',
                description: 'Tap the code block below to copy on mobile.',
            }),
        ]
    });

    if (attachment) {
        await interaction.followUp({ files: [attachment] });
    } else {
        await interaction.followUp({ content: rawCodeBlock });
    }
}

export async function executeDecode(interaction: ChatInputCommandInteraction): Promise<void> {
    const encoded = interaction.options.getString('encoded', true);
    try {
        const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
        const rawCodeBlock = codeBlock(decoded);
        const { attachment } = safeFieldValue(rawCodeBlock, 'decoded.txt');

        await interaction.reply({
            embeds: [
                infoEmbed({
                    title: '🔓 Base64 Decoded',
                    description: 'Tap the code block below to copy on mobile.',
                }),
            ]
        });

        if (attachment) {
            await interaction.followUp({ files: [attachment] });
        } else {
            await interaction.followUp({ content: rawCodeBlock });
        }
    } catch {
        await interaction.reply({
            embeds: [errorEmbed({ title: '❌ Decoding Failed', description: 'The provided string is not valid Base64.' })],
            flags: 64,
        });
    }
}
