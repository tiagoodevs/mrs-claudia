import { REST, Routes, ActivityType } from 'discord.js';
import { BotClient } from '../client';
import { getDatabase } from '../database/index';

export async function handleReady(client: BotClient): Promise<void> {
    if (!client.user) return;

    console.log(`[ready] Logged in as ${client.user.tag} (${client.user.id})`);

    await registerCommands(client);

    const db = getDatabase();
    const statusRow = db
        .prepare("SELECT config_value FROM system_config WHERE config_key = 'bot_status_text'")
        .get() as { config_value: string } | undefined;

    client.user.setActivity(statusRow?.config_value ?? 'Watching APIs', { type: ActivityType.Watching });
}

async function registerCommands(client: BotClient): Promise<void> {
    const token = process.env.DISCORD_TOKEN;
    const clientId = process.env.DISCORD_CLIENT_ID;
    const devGuildId = process.env.DEV_GUILD_ID;

    if (!token || !clientId) {
        console.warn('[ready] DISCORD_TOKEN or DISCORD_CLIENT_ID missing — skipping command registration.');
        return;
    }

    const rest = new REST({ version: '10' }).setToken(token);
    const body = client.commands.map((cmd) => cmd.data.toJSON());

    try {
        if (devGuildId) {
            await rest.put(Routes.applicationGuildCommands(clientId, devGuildId), { body });
            console.log(`[ready] Registered ${body.length} commands to dev guild ${devGuildId}.`);
        } else {
            await rest.put(Routes.applicationCommands(clientId), { body });
            console.log(`[ready] Registered ${body.length} commands globally.`);
        }
    } catch (err) {
        console.error('[ready] Failed to register slash commands:', err);
    }
}
