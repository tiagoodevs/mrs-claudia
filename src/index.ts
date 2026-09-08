import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');
import 'dotenv/config';
import { Events } from 'discord.js';
import { createClient } from './client';
import { getDatabase, closeDatabase } from './database/index';
import { handleReady } from './events/ready';
import { handleInteractionCreate } from './events/interactionCreate';

import { apiCommand } from './commands/api/index';
import { debugCommand } from './commands/debug/index';
import { ownerCommand } from './commands/owner/index';
import { utilCommand } from './commands/util/index';

function assertEnv(): void {
    if (!process.env.DISCORD_TOKEN) {
        throw new Error('DISCORD_TOKEN is not set. Copy .env.example to .env and fill in your bot credentials.');
    }
    if (!process.env.DISCORD_CLIENT_ID) {
        throw new Error('DISCORD_CLIENT_ID is not set. Copy .env.example to .env and fill in your bot credentials.');
    }
}

async function bootstrap(): Promise<void> {
    assertEnv();

    // Initialize the SQLite database (applies schema.sql on first boot).
    getDatabase();

    const client = createClient();

    for (const command of [apiCommand, debugCommand, ownerCommand, utilCommand]) {
        client.commands.set(command.data.name, command);
    }

    client.once(Events.ClientReady, () => handleReady(client));
    client.on(Events.InteractionCreate, handleInteractionCreate);

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    async function shutdown(): Promise<void> {
        console.log('[index] Shutting down...');
        closeDatabase();
        client.destroy();
        process.exit(0);
    }

    await client.login(process.env.DISCORD_TOKEN);
}

bootstrap().catch((err) => {
    console.error('[index] Fatal startup error:', err);
    process.exit(1);
});
