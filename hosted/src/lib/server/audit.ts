/**
 * Audit Logging for HIPAA/GDPR Compliance
 *
 * Every data access is logged with:
 * - User ID (who)
 * - Action (what)
 * - Resource (which data)
 * - Context (IP, user agent, timestamp)
 *
 * Audit log is APPEND-ONLY - never deleted, even after user deletion.
 * User ID is anonymized (set to NULL) when user deletes their account.
 */

import { execute } from './db/index.js';
import { randomUUID } from 'crypto';

export type AuditAction =
	| 'login'
	| 'logout'
	| 'data_access'
	| 'data_create'
	| 'data_update'
	| 'data_delete'
	| 'data_export'
	| 'account_delete'
	| 'consent_granted'
	| 'consent_revoked'
	| 'token_created'
	| 'token_revoked'
	| 'api_call';

export interface AuditContext {
	ipAddress?: string;
	userAgent?: string;
	metadata?: Record<string, unknown>;
}

/**
 * Log an audit event - NEVER throws, failures are logged to console
 */
export async function logAudit(
	userId: string | null,
	action: AuditAction,
	resourceType?: string,
	resourceId?: string,
	context: AuditContext = {}
): Promise<void> {
	try {
		await execute(
			`INSERT INTO audit_log (id, user_id, action, resource_type, resource_id, ip_address, user_agent, metadata)
			 VALUES (:id, :userId, :action, :resourceType, :resourceId, :ipAddress, :userAgent, :metadata)`,
			{
				id: randomUUID(),
				userId,
				action,
				resourceType: resourceType || null,
				resourceId: resourceId || null,
				ipAddress: context.ipAddress || null,
				userAgent: context.userAgent?.substring(0, 500) || null,
				metadata: context.metadata ? JSON.stringify(context.metadata) : null
			}
		);
	} catch (error) {
		// Audit logging should NEVER fail silently in production
		// but also should NEVER break the user's action
		console.error('[AUDIT ERROR]', {
			userId,
			action,
			resourceType,
			resourceId,
			error: error instanceof Error ? error.message : 'Unknown error'
		});
	}
}

/**
 * Get audit log entries for a user (for transparency/GDPR)
 */
export async function getUserAuditLog(
	userId: string,
	limit: number = 100
): Promise<AuditLogEntry[]> {
	const { query } = await import('./db/index.js');
	return query<AuditLogEntry>(
		`SELECT id, action, resource_type, resource_id, ip_address, created_at
		 FROM audit_log
		 WHERE user_id = :userId
		 ORDER BY created_at DESC
		 FETCH FIRST :limit ROWS ONLY`,
		{ userId, limit }
	);
}

/**
 * Anonymize audit log entries when user deletes account
 * Sets user_id to NULL but keeps the audit trail for compliance
 */
export async function anonymizeUserAuditLog(userId: string): Promise<number> {
	// First, log the deletion itself
	await logAudit(userId, 'account_delete', 'users', userId, {
		metadata: { anonymized: true, timestamp: new Date().toISOString() }
	});

	// Then anonymize all previous entries
	return execute(
		`UPDATE audit_log SET user_id = NULL WHERE user_id = :userId`,
		{ userId }
	);
}

interface AuditLogEntry {
	id: string;
	action: string;
	resource_type: string | null;
	resource_id: string | null;
	ip_address: string | null;
	created_at: Date;
}
