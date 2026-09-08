import { getDatabase } from '../index';

export interface GuildRecord {
    guild_id: string;
    guild_name: string | null;
    is_whitelisted: 0 | 1;
    is_blacklisted: 0 | 1;
    joined_at: string;
    updated_at: string;
}

export function getOrCreateGuild(guildId: string, guildName?: string): GuildRecord {
    const db = getDatabase();

    const existing = db.prepare('SELECT * FROM guilds WHERE guild_id = ?').get(guildId) as
        | GuildRecord
        | undefined;

    if (existing) {
        if (guildName && guildName !== existing.guild_name) {
            db.prepare(
                "UPDATE guilds SET guild_name = ?, updated_at = datetime('now') WHERE guild_id = ?",
            ).run(guildName, guildId);
            existing.guild_name = guildName;
        }
        return existing;
    }

    db.prepare('INSERT INTO guilds (guild_id, guild_name) VALUES (?, ?)').run(guildId, guildName ?? null);
    return db.prepare('SELECT * FROM guilds WHERE guild_id = ?').get(guildId) as GuildRecord;
}

export function getGuildById(guildId: string): GuildRecord | undefined {
    const db = getDatabase();
    return db.prepare('SELECT * FROM guilds WHERE guild_id = ?').get(guildId) as GuildRecord | undefined;
}

export function setGuildBlacklisted(guildId: string, blacklisted: boolean): void {
    const db = getDatabase();
    getOrCreateGuild(guildId);
    db.prepare(
        "UPDATE guilds SET is_blacklisted = ?, updated_at = datetime('now') WHERE guild_id = ?",
    ).run(blacklisted ? 1 : 0, guildId);
}

export function setGuildWhitelisted(guildId: string, whitelisted: boolean): void {
    const db = getDatabase();
    getOrCreateGuild(guildId);
    db.prepare(
        "UPDATE guilds SET is_whitelisted = ?, updated_at = datetime('now') WHERE guild_id = ?",
    ).run(whitelisted ? 1 : 0, guildId);
}

export function isGuildBlacklisted(guildId: string): boolean {
    const guild = getGuildById(guildId);
    return guild?.is_blacklisted === 1;
}

export function listGuilds(): GuildRecord[] {
    const db = getDatabase();
    return db.prepare('SELECT * FROM guilds ORDER BY joined_at DESC').all() as GuildRecord[];
}

export function deleteGuild(guildId: string): void {
    const db = getDatabase();
    db.prepare('DELETE FROM guilds WHERE guild_id = ?').run(guildId);
}
