import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from 'discord.js';
import tls from 'node:tls';
import { infoEmbed, errorEmbed, truncate } from '../../utils/embedBuilder';
import { insertLog } from '../../database/queries/logQueries';

export const subcommandName = 'ssl';

export function buildSubcommand(sub: SlashCommandSubcommandBuilder): SlashCommandSubcommandBuilder {
    return sub
        .setName(subcommandName)
        .setDescription('Inspect the HTTPS/TLS certificate for a domain.')
        .addStringOption((opt) => opt.setName('domain').setDescription('Domain name (host only)').setRequired(true))
        .addIntegerOption((opt) => opt.setName('port').setDescription('Port (default 443)').setRequired(false));
}

interface CertInfo {
    subject: string;
    issuer: string;
    validFrom: string;
    validTo: string;
    subjectAltNames: string;
    protocol: string | null;
}

function inspectCertificate(host: string, port: number, timeoutMs = 8000): Promise<CertInfo> {
    return new Promise((resolve, reject) => {
        const socket = tls.connect({ host, port, servername: host, timeout: timeoutMs, rejectUnauthorized: false }, () => {
            const cert = socket.getPeerCertificate();
            const protocol = socket.getProtocol();

            if (!cert || Object.keys(cert).length === 0) {
                socket.end();
                reject(new Error('No certificate presented by remote host.'));
                return;
            }

            resolve({
                subject: cert.subject?.CN?.toString() ?? 'Unknown',
                issuer: cert.issuer?.CN?.toString() ?? 'Unknown',
                validFrom: cert.valid_from ?? 'Unknown',
                validTo: cert.valid_to ?? 'Unknown',
                subjectAltNames: cert.subjectaltname ?? 'None',
                protocol,
            });

            socket.end();
        });

        socket.on('timeout', () => {
            socket.destroy();
            reject(new Error('Connection timed out.'));
        });

        socket.on('error', (err:any) => reject(err));
    });
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const domain = interaction.options.getString('domain', true).replace(/^https?:\/\//, '').split('/')[0];
    const port = interaction.options.getInteger('port') ?? 443;

    try {
        const cert = await inspectCertificate(domain, port);

        insertLog({
            userId: interaction.user.id,
            guildId: interaction.guildId,
            command: 'debug/ssl',
            targetUrl: `${domain}:${port}`,
            success: true,
        });

        await interaction.editReply({
            embeds: [
                infoEmbed({
                    title: `🔒 TLS Certificate — ${domain}`,
                    fields: [
                        { name: 'Subject (CN)', value: cert.subject, inline: true },
                        { name: 'Issuer', value: cert.issuer, inline: true },
                        { name: 'Protocol', value: cert.protocol ?? 'Unknown', inline: true },
                        { name: 'Valid From', value: cert.validFrom, inline: true },
                        { name: 'Valid To', value: cert.validTo, inline: true },
                        { name: 'Subject Alt. Names', value: truncate(cert.subjectAltNames, 1024) },
                    ],
                }),
            ],
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown TLS error';

        insertLog({
            userId: interaction.user.id,
            guildId: interaction.guildId,
            command: 'debug/ssl',
            targetUrl: `${domain}:${port}`,
            success: false,
            errorMessage: message,
        });

        await interaction.editReply({
            embeds: [errorEmbed({ title: '❌ SSL Inspection Failed', description: `Could not inspect certificate for \`${domain}:${port}\`.`, fields: [{ name: 'Error', value: truncate(message, 1024) }] })],
        });
    }
}
