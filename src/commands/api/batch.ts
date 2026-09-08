import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from 'discord.js';
import { executeHttpRequest } from '../../utils/httpClient';
import { infoEmbed, errorEmbed, colorForStatus } from '../../utils/embedBuilder';
import { insertLog } from '../../database/queries/logQueries';
import { checkAndIncrementRateLimit } from '../../database/queries/userQueries';

export const subcommandName = 'batch';

export function buildSubcommand(sub: SlashCommandSubcommandBuilder): SlashCommandSubcommandBuilder {
    return sub
        .setName(subcommandName)
        .setDescription('Sequentially execute multiple GET endpoints and aggregate results.')
        .addStringOption((opt) =>
            opt
                .setName('urls')
                .setDescription('Newline or comma-separated list of URLs (max 10)')
                .setRequired(true),
        );
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const raw = interaction.options.getString('urls', true);
    const urls = raw
        .split(/[\n,]+/)
        .map((u) => u.trim())
        .filter(Boolean)
        .slice(0, 10);

    if (urls.length === 0) {
        await interaction.editReply({
            embeds: [errorEmbed({ title: '❌ No Valid URLs', description: 'Provide at least one URL, separated by commas or newlines.' })],
        });
        return;
    }

    const { allowed } = checkAndIncrementRateLimit(interaction.user.id);
    if (!allowed) {
        await interaction.editReply({
            embeds: [errorEmbed({ title: '⛔ Rate Limit Exceeded', description: 'You have exceeded your configured request rate limit. Please wait before trying again.' })],
        });
        return;
    }

    const results: { url: string; status: number | null; durationMs: number; ok: boolean; error?: string }[] = [];

    for (const url of urls) {
        const result = await executeHttpRequest({ method: 'GET', url });
        results.push({ url, status: result.status, durationMs: result.durationMs, ok: result.ok, error: result.error });

        insertLog({
            userId: interaction.user.id,
            guildId: interaction.guildId,
            command: 'api/batch',
            method: 'GET',
            targetUrl: url,
            statusCode: result.status,
            durationMs: result.durationMs,
            success: result.ok,
            errorMessage: result.error ?? null,
        });
    }

    const successCount = results.filter((r) => r.ok).length;
    const totalTime = results.reduce((sum, r) => sum + r.durationMs, 0);
    const overallColor = successCount === results.length ? colorForStatus(200) : colorForStatus(500);

    const fields = results.map((r, i) => ({
        name: `${i + 1}. ${r.ok ? '✅' : '❌'} ${r.url.length > 80 ? r.url.slice(0, 77) + '...' : r.url}`,
        value: r.error ? `Error: ${r.error}` : `Status: \`${r.status}\` — ${r.durationMs}ms`,
    }));

    const embed = infoEmbed({
        title: '📦 Batch Request Results',
        description: `Executed **${results.length}** requests — **${successCount}/${results.length}** succeeded — total time **${totalTime}ms**.`,
        fields,
    }).setColor(overallColor);

    await interaction.editReply({ embeds: [embed] });
}
