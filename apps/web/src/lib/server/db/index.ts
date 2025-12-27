import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
import { dev, building } from '$app/environment';

// Re-export schema
export * from './schema.js';

// Lazy database initialization to support static prerendering
let _db: BetterSQLite3Database<typeof schema> | null = null;

function getDb(): BetterSQLite3Database<typeof schema> {
	if (building) {
		throw new Error('Database not available during static prerendering');
	}

	if (!_db) {
		// Dynamic imports to avoid loading native modules during prerender
		const Database = require('better-sqlite3');
		const { mkdirSync } = require('fs');
		const { dirname } = require('path');

		const DB_PATH = dev ? 'data/running-days.db' : '/data/running-days.db';

		// Ensure data directory exists
		try {
			mkdirSync(dirname(DB_PATH), { recursive: true });
		} catch (err: unknown) {
			if ((err as NodeJS.ErrnoException).code !== 'EEXIST') {
				throw err;
			}
		}

		const sqlite = new Database(DB_PATH);
		sqlite.pragma('journal_mode = WAL');

		_db = drizzle(sqlite, { schema });
	}

	return _db;
}

// Export a proxy that lazily initializes the database
export const db = new Proxy({} as BetterSQLite3Database<typeof schema>, {
	get(_target, prop) {
		return getDb()[prop as keyof BetterSQLite3Database<typeof schema>];
	}
});
