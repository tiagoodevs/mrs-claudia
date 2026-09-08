-- =========================================================
-- Discord API Toolkit Bot - SQLite Schema
-- =========================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- -----------------------------------------------------------
-- users: per-Discord-user account, access control, rate limits
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    user_id         TEXT PRIMARY KEY,           -- Discord snowflake
    username        TEXT,
    access_level    TEXT NOT NULL DEFAULT 'user' -- 'user' | 'trusted' | 'owner'
                        CHECK (access_level IN ('user', 'trusted', 'owner')),
    is_blacklisted  INTEGER NOT NULL DEFAULT 0,  -- 0 = false, 1 = true
    rate_limit_max  INTEGER NOT NULL DEFAULT 10, -- max requests per window
    rate_limit_window_seconds INTEGER NOT NULL DEFAULT 60,
    request_count   INTEGER NOT NULL DEFAULT 0,
    last_request_at TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- -----------------------------------------------------------
-- guilds: per-Discord-server settings and blacklist status
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS guilds (
    guild_id        TEXT PRIMARY KEY,
    guild_name      TEXT,
    is_whitelisted  INTEGER NOT NULL DEFAULT 1,
    is_blacklisted  INTEGER NOT NULL DEFAULT 0,
    joined_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- -----------------------------------------------------------
-- api_logs: history of every executed API/debug request
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_logs (
    log_id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         TEXT NOT NULL,
    guild_id        TEXT,
    command         TEXT NOT NULL,              -- e.g. 'api/request', 'debug/dns'
    method          TEXT,                       -- GET, POST, etc. (nullable for non-HTTP commands)
    target_url      TEXT,
    status_code     INTEGER,
    duration_ms     INTEGER,
    success         INTEGER NOT NULL DEFAULT 0,
    error_message   TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_api_logs_user_id ON api_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at);

-- -----------------------------------------------------------
-- system_config: single-row key/value style global configuration
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_config (
    config_key      TEXT PRIMARY KEY,
    config_value    TEXT,
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO system_config (config_key, config_value) VALUES ('bot_status_text', 'Watching APIs');
INSERT OR IGNORE INTO system_config (config_key, config_value) VALUES ('global_rate_limit_enabled', '1');
