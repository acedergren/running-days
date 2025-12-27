/**
 * Oracle ADB Database Connection
 *
 * Uses oracledb with wallet authentication for secure connections.
 * All queries MUST include user_id for row-level isolation.
 */

import oracledb from 'oracledb';
import { env } from '$env/dynamic/private';
import { logger } from '../logger.js';

// Connection pool configuration
let pool: oracledb.Pool | null = null;

/**
 * Initialize the Oracle connection pool
 * Call this once at application startup
 */
export async function initDatabase(): Promise<void> {
	if (pool) return;

	// Configure Oracle client
	oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
	oracledb.autoCommit = false; // Explicit commits required - safer for transactions
	oracledb.fetchAsString = [oracledb.CLOB];

	pool = await oracledb.createPool({
		user: env.ORACLE_USER,
		password: env.ORACLE_PASSWORD,
		connectString: env.ORACLE_CONNECTION_STRING,
		walletLocation: env.ORACLE_WALLET_PATH,
		walletPassword: env.ORACLE_WALLET_PASSWORD,
		poolMin: 2,
		poolMax: 10,
		poolIncrement: 1,
		poolTimeout: 300, // 5 minutes - prevents connection thrashing
		queueTimeout: 30000,
		stmtCacheSize: 40, // Cache prepared statements for performance
		enableStatistics: true
	});

	logger.info('Oracle connection pool initialized');
}

/**
 * Get a connection from the pool
 */
export async function getConnection(): Promise<oracledb.Connection> {
	if (!pool) {
		await initDatabase();
	}
	return pool!.getConnection();
}

/**
 * Execute a read query with automatic connection management
 * IMPORTANT: Always include user_id in WHERE clause for user data
 */
export async function query<T>(
	sql: string,
	binds: oracledb.BindParameters = {},
	options: oracledb.ExecuteOptions = {}
): Promise<T[]> {
	const connection = await getConnection();
	try {
		const result = await connection.execute<T>(sql, binds, {
			outFormat: oracledb.OUT_FORMAT_OBJECT,
			...options
		});
		// Read queries don't need commit, but we do it for consistency
		await connection.commit();
		return (result.rows ?? []) as T[];
	} finally {
		await connection.close();
	}
}

/**
 * Execute a query that returns a single row
 */
export async function queryOne<T>(
	sql: string,
	binds: oracledb.BindParameters = {}
): Promise<T | null> {
	const rows = await query<T>(sql, binds);
	return rows[0] || null;
}

/**
 * Execute an INSERT/UPDATE/DELETE and return rows affected
 * Automatically commits on success
 */
export async function execute(
	sql: string,
	binds: oracledb.BindParameters = {}
): Promise<number> {
	const connection = await getConnection();
	try {
		const result = await connection.execute(sql, binds);
		await connection.commit();
		return result.rowsAffected ?? 0;
	} catch (error) {
		await connection.rollback().catch(() => {}); // Ignore rollback errors
		throw error;
	} finally {
		await connection.close();
	}
}

/**
 * Execute multiple statements in a transaction
 * Automatically rolls back on error
 */
export async function transaction<T>(
	callback: (conn: oracledb.Connection) => Promise<T>
): Promise<T> {
	const connection = await getConnection();
	try {
		const result = await callback(connection);
		await connection.commit();
		return result;
	} catch (error) {
		// Wrap rollback in try-catch to prevent masking original error
		try {
			await connection.rollback();
		} catch (rollbackError) {
			logger.error({ err: rollbackError }, 'Rollback failed');
		}
		throw error;
	} finally {
		await connection.close();
	}
}

/**
 * Close the connection pool (call on app shutdown)
 */
export async function closeDatabase(): Promise<void> {
	if (pool) {
		await pool.close(10); // 10 second drain time
		pool = null;
		logger.info('Oracle connection pool closed');
	}
}

/**
 * Health check for the database connection
 */
export async function healthCheck(): Promise<{ ok: boolean; latencyMs: number }> {
	const start = Date.now();
	try {
		await query('SELECT 1 FROM DUAL');
		return { ok: true, latencyMs: Date.now() - start };
	} catch {
		return { ok: false, latencyMs: Date.now() - start };
	}
}

// Re-export types
export type { Connection } from 'oracledb';
