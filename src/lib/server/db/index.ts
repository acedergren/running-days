import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
import { dev } from '$app/environment';

const DB_PATH = dev ? 'data/running-days.db' : '/data/running-days.db';

// Ensure data directory exists
import { mkdirSync } from 'fs';
import { dirname } from 'path';

try {
	mkdirSync(dirname(DB_PATH), { recursive: true });
} catch (err: unknown) {
	// Only ignore "already exists" errors, rethrow permission errors etc.
	if ((err as NodeJS.ErrnoException).code !== 'EEXIST') {
		throw err;
	}
}

const sqlite = new Database(DB_PATH);

// Enable WAL mode for better concurrency
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });

export * from './schema.js';
