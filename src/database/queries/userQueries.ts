import { getDatabase } from '../index';

export type AccessLevel = 'user' | 'trusted' | 'owner';

export interface UserRecord {
    user_id: string;
    username: string | null;
    access_level: AccessLevel;
    is_blacklisted: 0 | 1;
    rate_limit_max: number;
    rate_limit_window_seconds: number;
    request_count: number;
    last_request_at: string | null;
    created_at: string;
    updated_at: string;
}

/** Fetches a user row, creating a default 'user' row if one does not yet exist. */
export function getOrCreateUser(userId: string, username?: string): UserRecord {
    const db = getDatabase();

    const existing = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId) as
        | UserRecord
        | undefined;

    if (existing) {
        if (username && username !== existing.username) {
            db.prepare('UPDATE users SET username = ?, updated_at = datetime(\'now\') WHERE user_id = ?').run(
                username,
                userId,
            );
            existing.username = username;
        }
        return existing;
    }

    db.prepare('INSERT INTO users (user_id, username) VALUES (?, ?)').run(userId, username ?? null);
    return db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId) as UserRecord;
}

export function getUserById(userId: string): UserRecord | undefined {
    const db = getDatabase();
    return db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId) as UserRecord | undefined;
}

export function setAccessLevel(userId: string, level: AccessLevel): void {
    const db = getDatabase();
    getOrCreateUser(userId);
    db.prepare(
        "UPDATE users SET access_level = ?, updated_at = datetime('now') WHERE user_id = ?",
    ).run(level, userId);
}

export function setBlacklisted(userId: string, blacklisted: boolean): void {
    const db = getDatabase();
    getOrCreateUser(userId);
    db.prepare(
        "UPDATE users SET is_blacklisted = ?, updated_at = datetime('now') WHERE user_id = ?",
    ).run(blacklisted ? 1 : 0, userId);
}

export function setRateLimit(userId: string, max: number, windowSeconds: number): void {
    const db = getDatabase();
    getOrCreateUser(userId);
    db.prepare(
        "UPDATE users SET rate_limit_max = ?, rate_limit_window_seconds = ?, updated_at = datetime('now') WHERE user_id = ?",
    ).run(max, windowSeconds, userId);
}

export function isOwner(userId: string): boolean {
    const user = getUserById(userId);
    return user?.access_level === 'owner';
}

export function isBlacklisted(userId: string): boolean {
    const user = getUserById(userId);
    return user?.is_blacklisted === 1;
}

/**
 * Applies a simple fixed-window rate limit check. Increments the counter and
 * returns whether the request is allowed under the user's configured limits.
 */
export function checkAndIncrementRateLimit(userId: string): { allowed: boolean; remaining: number } {
    const db = getDatabase();
    const user = getOrCreateUser(userId);

    const now = Date.now();
    const windowMs = user.rate_limit_window_seconds * 1000;
    const lastRequestMs = user.last_request_at ? new Date(user.last_request_at + 'Z').getTime() : 0;

    let requestCount = user.request_count;

    if (!lastRequestMs || now - lastRequestMs > windowMs) {
        requestCount = 0;
    }

    const allowed = requestCount < user.rate_limit_max;

    db.prepare(
        "UPDATE users SET request_count = ?, last_request_at = datetime('now'), updated_at = datetime('now') WHERE user_id = ?",
    ).run(allowed ? requestCount + 1 : requestCount, userId);

    return { allowed, remaining: Math.max(0, user.rate_limit_max - requestCount - (allowed ? 1 : 0)) };
}

export function listBlacklistedUsers(): UserRecord[] {
    const db = getDatabase();
    return db.prepare('SELECT * FROM users WHERE is_blacklisted = 1').all() as UserRecord[];
}
