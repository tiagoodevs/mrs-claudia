import { Database } from 'bun:sqlite';
import fs from 'node:fs';
import path from 'node:path';

let dbInstance: Database | null = null;

export function getDatabase(): Database {
    if (dbInstance) return dbInstance;

    const dbPath = process.env.DATABASE_PATH || './database.sqlite';
    const resolvedPath = path.resolve(process.cwd(), dbPath);

    dbInstance = new Database(resolvedPath);
    
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    dbInstance.exec('PRAGMA foreign_keys = ON;');

    const tableCheck = dbInstance
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='system_config'")
        .get();

    if (!tableCheck) {
        const schemaPath = path.resolve(process.cwd(), 'schema.sql');
        if (fs.existsSync(schemaPath)) {
            const schema = fs.readFileSync(schemaPath, 'utf8');
            dbInstance.exec(schema);
            console.log('[database] schema.sql applied — tables created.');
        } else {
            throw new Error(`[database] schema.sql not found at ${schemaPath}`);
        }
    }

    seedBootstrapOwners(dbInstance);

    return dbInstance;
}

function seedBootstrapOwners(db: Database): void {
    const raw = process.env.BOOTSTRAP_OWNER_IDS;
    if (!raw) return;

    const ids = raw.split(',').map((id) => id.trim()).filter(Boolean);
    const upsert = db.prepare(`
        INSERT INTO users (user_id, access_level)
        VALUES (?, 'owner')
        ON CONFLICT(user_id) DO UPDATE SET access_level = 'owner', updated_at = datetime('now')
    `);

    const transaction = db.transaction((ownerIds: string[]) => {
        for (const id of ownerIds) upsert.run(id);
    });

    transaction(ids);
}

export function closeDatabase(): void {
    if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
    }
}
