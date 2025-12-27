/**
 * Database Migration Script
 * Runs all pending migrations against Oracle ADB
 *
 * Usage: npm run db:migrate
 */

import oracledb from 'oracledb';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '../src/lib/server/db/migrations');

async function main() {
	console.log('🔄 Starting database migration...\n');

	// Load environment
	const {
		ORACLE_USER,
		ORACLE_PASSWORD,
		ORACLE_CONNECTION_STRING,
		ORACLE_WALLET_PATH,
		ORACLE_WALLET_PASSWORD
	} = process.env;

	if (!ORACLE_USER || !ORACLE_PASSWORD || !ORACLE_CONNECTION_STRING) {
		console.error('❌ Missing required environment variables');
		console.error('   Required: ORACLE_USER, ORACLE_PASSWORD, ORACLE_CONNECTION_STRING');
		process.exit(1);
	}

	// Connect to database
	let connection: oracledb.Connection;
	try {
		connection = await oracledb.getConnection({
			user: ORACLE_USER,
			password: ORACLE_PASSWORD,
			connectString: ORACLE_CONNECTION_STRING,
			walletLocation: ORACLE_WALLET_PATH,
			walletPassword: ORACLE_WALLET_PASSWORD
		});
		console.log('✅ Connected to Oracle ADB\n');
	} catch (err) {
		console.error('❌ Failed to connect to database:', err);
		process.exit(1);
	}

	try {
		// Check if schema_migrations table exists
		const tableCheck = await connection.execute<{ CNT: number }>(
			`SELECT COUNT(*) as CNT FROM user_tables WHERE table_name = 'SCHEMA_MIGRATIONS'`
		);

		const tableExists = (tableCheck.rows?.[0] as any)?.CNT > 0;

		// Get applied migrations
		let appliedMigrations: Set<string> = new Set();
		if (tableExists) {
			try {
				const result = await connection.execute<{ VERSION: string }>(
					`SELECT version FROM schema_migrations ORDER BY version`
				);
				appliedMigrations = new Set((result.rows || []).map((r: any) => r.VERSION));
				console.log(`📋 Applied migrations: ${appliedMigrations.size}`);
			} catch {
				console.log(`📋 No migrations applied yet`);
			}
		} else {
			console.log(`📋 First run - no migrations table yet`);
		}

		// Get all migration files
		const migrationFiles = readdirSync(MIGRATIONS_DIR)
			.filter(f => f.endsWith('.sql') && !f.includes('.rollback.'))
			.sort();

		console.log(`📁 Found ${migrationFiles.length} migration file(s)\n`);

		// Run pending migrations
		let applied = 0;
		for (const file of migrationFiles) {
			const version = file.split('__')[0]; // e.g., "V001"

			if (appliedMigrations.has(version)) {
				console.log(`⏭️  Skipping ${file} (already applied)`);
				continue;
			}

			console.log(`🚀 Applying ${file}...`);
			const startTime = Date.now();

			const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');

			// Split by semicolons and execute each statement
			const statements = sql
				.split(/;\s*\n/)
				.map(s => s.trim())
				.filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

			for (let i = 0; i < statements.length; i++) {
				const statement = statements[i];
				try {
					await connection.execute(statement);
				} catch (err: any) {
					// Ignore "table already exists" errors for idempotency
					if (err.errorNum !== 955) {
						console.error(`   ❌ Failed at statement ${i + 1}:`);
						console.error(`   ${statement.substring(0, 100)}...`);
						throw err;
					}
				}
			}

			await connection.commit();

			const duration = Date.now() - startTime;
			console.log(`   ✅ Applied in ${duration}ms\n`);
			applied++;
		}

		if (applied === 0) {
			console.log('\n✨ Database is up to date!');
		} else {
			console.log(`\n✅ Applied ${applied} migration(s) successfully!`);
		}

	} catch (err) {
		console.error('\n❌ Migration failed:', err);
		// Wrap rollback in try-catch to prevent masking original error
		try {
			await connection.rollback();
		} catch (rollbackErr) {
			console.error('Rollback also failed:', rollbackErr);
		}
		await connection.close();
		process.exit(1);
	} finally {
		await connection.close().catch(() => {}); // Ignore if already closed
	}
}

main().catch(console.error);
