import { getDatabase } from '../index';

export interface ApiLogRecord {
    log_id: number;
    user_id: string;
    guild_id: string | null;
    command: string;
    method: string | null;
    target_url: string | null;
    status_code: number | null;
    duration_ms: number | null;
    success: 0 | 1;
    error_message: string | null;
    created_at: string;
}

export interface LogInsertParams {
    userId: string;
    guildId?: string | null;
    command: string;
    method?: string | null;
    targetUrl?: string | null;
    statusCode?: number | null;
    durationMs?: number | null;
    success: boolean;
    errorMessage?: string | null;
}

export function insertLog(params: LogInsertParams): number {
    const db = getDatabase();
    const result = db
        .prepare(
            `INSERT INTO api_logs
                (user_id, guild_id, command, method, target_url, status_code, duration_ms, success, error_message)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
            params.userId,
            params.guildId ?? null,
            params.command,
            params.method ?? null,
            params.targetUrl ?? null,
            params.statusCode ?? null,
            params.durationMs ?? null,
            params.success ? 1 : 0,
            params.errorMessage ?? null,
        );

    return Number(result.lastInsertRowid);
}

export function getRecentLogs(limit = 20): ApiLogRecord[] {
    const db = getDatabase();
    return db
        .prepare('SELECT * FROM api_logs ORDER BY created_at DESC LIMIT ?')
        .all(limit) as ApiLogRecord[];
}

export function getLogsByUser(userId: string, limit = 20): ApiLogRecord[] {
    const db = getDatabase();
    return db
        .prepare('SELECT * FROM api_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?')
        .all(userId, limit) as ApiLogRecord[];
}

export function clearAllLogs(): number {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM api_logs').run();
    return result.changes;
}

export function clearLogsOlderThan(days: number): number {
    const db = getDatabase();
    const result = db
        .prepare(`DELETE FROM api_logs WHERE created_at < datetime('now', ?)`)
        .run(`-${days} days`);
    return result.changes;
}

export function getLogCount(): number {
    const db = getDatabase();
    const row = db.prepare('SELECT COUNT(*) as count FROM api_logs').get() as { count: number };
    return row.count;
}
