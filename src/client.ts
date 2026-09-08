import {
    ApplicationIntegrationType,
    ChatInputCommandInteraction,
    Client,
    Collection,
    GatewayIntentBits,
    InteractionContextType,
    SlashCommandBuilder,
    SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';

export interface BotCommand {
    data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export interface BotClient extends Client {
    commands: Collection<string, BotCommand>;
}

/**
 * Applies the standard install/context configuration so a top-level command
 * works everywhere: installed on servers AND installed to a user's own
 * account (making it usable in DMs, group DMs, and any server — even ones
 * the bot itself hasn't been invited to).
 */
export function enableEverywhere<T extends SlashCommandBuilder>(builder: T): T {
    builder
        .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
        .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel);

    return builder;
}

export function createClient(): BotClient {
    const client = new Client({
        intents: [GatewayIntentBits.Guilds],
    }) as BotClient;

    client.commands = new Collection<string, BotCommand>();

    return client;
}
