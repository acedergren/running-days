/**
 * @running-days/database
 *
 * Database schema and connection factory for Running Days.
 * Supports SQLite (development) and PostgreSQL (production).
 */

import { createRequire } from 'module';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';

// Create require function for ESM compatibility with better-sqlite3
const require = createRequire(import.meta.url);

export * from './schema.js';

export type DatabaseSchema = typeof schema;
export type Database = BetterSQLite3Database<DatabaseSchema>;

export interface DatabaseConfig {
  type: 'sqlite';
  path: string;
}

/**
 * Create a database connection
 * Currently supports SQLite only, PostgreSQL support coming soon
 */
export function createDatabase(config: DatabaseConfig): Database {
  if (config.type === 'sqlite') {
    const Database = require('better-sqlite3');
    const sqlite = new Database(config.path);
    sqlite.pragma('journal_mode = WAL');
    return drizzle(sqlite, { schema });
  }

  throw new Error(`Unsupported database type: ${config.type}`);
}
