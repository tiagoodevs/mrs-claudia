import { EmbedBuilder, ColorResolvable } from 'discord.js';

export const EmbedColors = {
    SUCCESS: 0x2ecc71, // 2xx
    REDIRECT: 0xf1c40f, // 3xx
    ERROR: 0xe74c3c, // 4xx / 5xx / failures
    INFO: 0x3498db, // general info
    OWNER: 0x9b59b6, // owner-tool responses
} as const;

export interface StandardEmbedOptions {
    title: string;
    description?: string;
    fields?: { name: string; value: string; inline?: boolean }[];
    footer?: string;
    timestamp?: boolean;
}

/** Resolves the correct standard color for a given HTTP status code. */
export function colorForStatus(status: number | null | undefined): ColorResolvable {
    if (!status) return EmbedColors.ERROR;
    if (status >= 200 && status < 300) return EmbedColors.SUCCESS;
    if (status >= 300 && status < 400) return EmbedColors.REDIRECT;
    if (status >= 400) return EmbedColors.ERROR;
    return EmbedColors.INFO;
}

function base(options: StandardEmbedOptions, color: ColorResolvable): EmbedBuilder {
    const embed = new EmbedBuilder().setTitle(options.title).setColor(color);

    if (options.description) embed.setDescription(truncate(options.description, 4096));
    if (options.fields) {
        embed.addFields(
            options.fields.map((f) => ({
                name: truncate(f.name, 256),
                value: truncate(f.value, 1024),
                inline: f.inline ?? false,
            })),
        );
    }
    if (options.footer) embed.setFooter({ text: truncate(options.footer, 2048) });
    if (options.timestamp !== false) embed.setTimestamp(new Date());

    return embed;
}

export function successEmbed(options: StandardEmbedOptions): EmbedBuilder {
    return base(options, EmbedColors.SUCCESS);
}

export function errorEmbed(options: StandardEmbedOptions): EmbedBuilder {
    return base(options, EmbedColors.ERROR);
}

export function infoEmbed(options: StandardEmbedOptions): EmbedBuilder {
    return base(options, EmbedColors.INFO);
}

export function redirectEmbed(options: StandardEmbedOptions): EmbedBuilder {
    return base(options, EmbedColors.REDIRECT);
}

export function ownerEmbed(options: StandardEmbedOptions): EmbedBuilder {
    return base(options, EmbedColors.OWNER);
}

/** Builds an embed color-coded automatically from an HTTP status code. */
export function statusEmbed(status: number | null | undefined, options: StandardEmbedOptions): EmbedBuilder {
    return base(options, colorForStatus(status));
}

export function truncate(value: string, max: number): string {
    if (value.length <= max) return value;
    return `${value.slice(0, max - 3)}...`;
}
