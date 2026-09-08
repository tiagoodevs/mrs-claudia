import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from 'discord.js';
import dns from 'node:dns/promises';
import { infoEmbed, errorEmbed } from '../../utils/embedBuilder';
import { insertLog } from '../../database/queries/logQueries';

export const subcommandName = 'dns';

const RECORD_TYPES = ['A', 'AAAA', 'MX', 'TXT', 'CNAME', 'NS', 'SOA'] as const;
type RecordType = (typeof RECORD_TYPES)[number];

export function buildSubcommand(sub: SlashCommandSubcommandBuilder): SlashCommandSubcommandBuilder {
    return sub
        .setName(subcommandName)
        .setDescription('Query DNS records for a domain.')
        .addStringOption((opt) => opt.setName('domain').setDescription('Domain name to query').setRequired(true))
        .addStringOption((opt) =>
            opt
                .setName('type')
                .setDescription('Record type (default: ALL)')
                .setRequired(false)
                .addChoices(...RECORD_TYPES.map((t) => ({ name: t, value: t })), { name: 'ALL', value: 'ALL' }),
        );
}

async function resolveRecord(domain: string, type: RecordType): Promise<string> {
    try {
        switch (type) {
            case 'A':
                return (await dns.resolve4(domain)).join('\n') || '*(none)*';
            case 'AAAA':
                return (await dns.resolve6(domain)).join('\n') || '*(none)*';
            case 'MX':
                return (
                    (await dns.resolveMx(domain))
                        .sort((a, b) => a.priority - b.priority)
                        .map((r) => `${r.priority} ${r.exchange}`)
                        .join('\n') || '*(none)*'
                );
            case 'TXT':
                return (await dns.resolveTxt(domain)).map((r) => r.join('')).join('\n') || '*(none)*';
            case 'CNAME':
                return (await dns.resolveCname(domain)).join('\n') || '*(none)*';
            case 'NS':
                return (await dns.resolveNs(domain)).join('\n') || '*(none)*';
            case 'SOA': {
                const soa = await dns.resolveSoa(domain);
                return `nsname: ${soa.nsname}\nhostmaster: ${soa.hostmaster}\nserial: ${soa.serial}\nrefresh: ${soa.refresh}\nretry: ${soa.retry}\nexpire: ${soa.expire}\nminttl: ${soa.minttl}`;
            }
            default:
                return '*(unsupported)*';
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Lookup failed';
        return `*(error: ${message})*`;
    }
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const domain = interaction.options.getString('domain', true).replace(/^https?:\/\//, '').split('/')[0];
    const typeOpt = (interaction.options.getString('type') ?? 'ALL') as RecordType | 'ALL';

    const typesToQuery: RecordType[] = typeOpt === 'ALL' ? [...RECORD_TYPES] : [typeOpt];

    const results = await Promise.all(
        typesToQuery.map(async (type) => ({ type, value: await resolveRecord(domain, type) })),
    );

    const success = results.some((r) => !r.value.startsWith('*(error') && r.value !== '*(none)*');

    insertLog({
        userId: interaction.user.id,
        guildId: interaction.guildId,
        command: 'debug/dns',
        targetUrl: domain,
        success,
    });

    if (!success) {
        await interaction.editReply({
            embeds: [errorEmbed({ title: `❌ DNS Lookup Failed`, description: `No records could be resolved for \`${domain}\`.` })],
        });
        return;
    }

    await interaction.editReply({
        embeds: [
            infoEmbed({
                title: `🌐 DNS Records — ${domain}`,
                fields: results.map((r) => ({ name: r.type, value: r.value, inline: false })),
            }),
        ],
    });
}
