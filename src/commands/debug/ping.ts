import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from 'discord.js';
import dns from 'node:dns/promises';
import net from 'node:net';
import tls from 'node:tls';
import { URL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { infoEmbed, errorEmbed, truncate } from '../../utils/embedBuilder';
import { insertLog } from '../../database/queries/logQueries';

export const subcommandName = 'ping';

export function buildSubcommand(sub: SlashCommandSubcommandBuilder): SlashCommandSubcommandBuilder {
    return sub
        .setName(subcommandName)
        .setDescription('Benchmark DNS, TCP, and TLS handshake latency to a URL.')
        .addStringOption((opt) => opt.setName('url').setDescription('Target URL (https:// preferred)').setRequired(true));
}

interface PingBreakdown {
    dnsMs: number;
    tcpMs: number;
    tlsMs: number | null;
    totalMs: number;
    resolvedIp: string;
}

function measureTcpAndTls(host: string, port: number, useTls: boolean): Promise<{ tcpMs: number; tlsMs: number | null }> {
    return new Promise((resolve, reject) => {
        const tcpStart = performance.now();

        const socket = net.connect({ host, port, timeout: 8000 }, () => {
            const tcpMs = Math.round(performance.now() - tcpStart);

            if (!useTls) {
                socket.end();
                resolve({ tcpMs, tlsMs: null });
                return;
            }

            const tlsStart = performance.now();
            const tlsSocket = tls.connect({ socket, servername: host, rejectUnauthorized: false }, () => {
                const tlsMs = Math.round(performance.now() - tlsStart);
                tlsSocket.end();
                resolve({ tcpMs, tlsMs });
            });

            tlsSocket.on('error', (err) => reject(err));
        });

        socket.on('timeout', () => {
            socket.destroy();
            reject(new Error('TCP connection timed out.'));
        });

        socket.on('error', (err) => reject(err));
    });
}

async function benchmark(targetUrl: string): Promise<PingBreakdown> {
    const parsed = new URL(targetUrl);
    const host = parsed.hostname;
    const useTls = parsed.protocol === 'https:';
    const port = parsed.port ? Number(parsed.port) : useTls ? 443 : 80;

    const totalStart = performance.now();

    const dnsStart = performance.now();
    const addresses = await dns.resolve4(host).catch(() => dns.resolve6(host));
    const dnsMs = Math.round(performance.now() - dnsStart);
    const resolvedIp = addresses[0] ?? 'unknown';

    const { tcpMs, tlsMs } = await measureTcpAndTls(host, port, useTls);

    const totalMs = Math.round(performance.now() - totalStart);

    return { dnsMs, tcpMs, tlsMs, totalMs, resolvedIp };
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const targetUrl = interaction.options.getString('url', true);

    let normalizedUrl = targetUrl;
    if (!/^https?:\/\//i.test(normalizedUrl)) normalizedUrl = `https://${normalizedUrl}`;

    try {
        const result = await benchmark(normalizedUrl);

        insertLog({
            userId: interaction.user.id,
            guildId: interaction.guildId,
            command: 'debug/ping',
            targetUrl: normalizedUrl,
            durationMs: result.totalMs,
            success: true,
        });

        await interaction.editReply({
            embeds: [
                infoEmbed({
                    title: `📡 Latency Benchmark — ${new URL(normalizedUrl).hostname}`,
                    fields: [
                        { name: 'Resolved IP', value: result.resolvedIp, inline: true },
                        { name: 'DNS Lookup', value: `${result.dnsMs}ms`, inline: true },
                        { name: 'TCP Handshake', value: `${result.tcpMs}ms`, inline: true },
                        { name: 'TLS Handshake', value: result.tlsMs !== null ? `${result.tlsMs}ms` : 'N/A (plain HTTP)', inline: true },
                        { name: 'Total RTT', value: `${result.totalMs}ms`, inline: true },
                    ],
                }),
            ],
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown network error';

        insertLog({
            userId: interaction.user.id,
            guildId: interaction.guildId,
            command: 'debug/ping',
            targetUrl: normalizedUrl,
            success: false,
            errorMessage: message,
        });

        await interaction.editReply({
            embeds: [errorEmbed({ title: '❌ Benchmark Failed', description: `Could not benchmark \`${truncate(normalizedUrl, 200)}\`.`, fields: [{ name: 'Error', value: truncate(message, 1024) }] })],
        });
    }
}
