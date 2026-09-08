import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from 'discord.js';
import crypto from 'node:crypto';
import { infoEmbed, errorEmbed } from '../../utils/embedBuilder';
import { codeBlock } from '../../utils/fileAttachment';

export const hashSubcommandName = 'hash';
export const jwtSubcommandName = 'jwt-decode';

const ALGORITHMS = ['md5', 'sha256', 'sha512'] as const;

export function buildHashSubcommand(sub: SlashCommandSubcommandBuilder): SlashCommandSubcommandBuilder {
    return sub
        .setName(hashSubcommandName)
        .setDescription('Calculate a cryptographic hash of a string.')
        .addStringOption((opt) => opt.setName('text').setDescription('Text to hash').setRequired(true))
        .addStringOption((opt) =>
            opt
                .setName('algorithm')
                .setDescription('Hash algorithm')
                .setRequired(true)
                .addChoices(...ALGORITHMS.map((a) => ({ name: a.toUpperCase(), value: a }))),
        );
}

export function buildJwtSubcommand(sub: SlashCommandSubcommandBuilder): SlashCommandSubcommandBuilder {
    return sub
        .setName(jwtSubcommandName)
        .setDescription('Decode a JWT without verifying its signature.')
        .addStringOption((opt) => opt.setName('token').setDescription('JWT to decode').setRequired(true));
}

export async function executeHash(interaction: ChatInputCommandInteraction): Promise<void> {
    const text = interaction.options.getString('text', true);
    const algorithm = interaction.options.getString('algorithm', true) as (typeof ALGORITHMS)[number];

    const hash = crypto.createHash(algorithm).update(text, 'utf-8').digest('hex');

    await interaction.reply({
        embeds: [
            infoEmbed({
                title: `🔐 ${algorithm.toUpperCase()} Hash`,
                fields: [{ name: 'Digest', value: codeBlock(hash) }],
            }),
        ],
    });
}

export async function executeJwtDecode(interaction: ChatInputCommandInteraction): Promise<void> {
    const token = interaction.options.getString('token', true);
    const parts = token.split('.');

    if (parts.length < 2) {
        await interaction.reply({
            embeds: [errorEmbed({ title: '❌ Invalid JWT', description: 'A JWT must contain at least a header and payload segment separated by `.`.' })],
            flags: 64,
        });
        return;
    }

    try {
        const decodeSegment = (segment: string) =>
            JSON.stringify(JSON.parse(Buffer.from(segment, 'base64url').toString('utf-8')), null, 2);

        const header = decodeSegment(parts[0]);
        const payload = decodeSegment(parts[1]);

        await interaction.reply({
            embeds: [
                infoEmbed({
                    title: '🪪 JWT Decoded (unverified)',
                    description: '⚠️ Signature was **not** verified. Do not trust this data for authorization decisions.',
                    fields: [
                        { name: 'Header', value: codeBlock(header, 'json') },
                        { name: 'Payload', value: codeBlock(payload, 'json') },
                    ],
                }),
            ],
        });
    } catch {
        await interaction.reply({
            embeds: [errorEmbed({ title: '❌ Decode Failed', description: 'Could not parse the header or payload segments as JSON.' })],
            flags: 64,
        });
    }
}
