/**
 * HIPAA-compliant audit logger
 *
 * Logs all access to Protected Health Information (PHI) with:
 * - User identity
 * - Timestamp
 * - Action performed
 * - Resource accessed
 * - IP address
 * - Outcome (success/denied/error)
 */

import { logger } from './logger';
import { recordPhiAccess } from './metrics';

export interface AuditEvent {
	// Who
	user_id: string | null;
	ip_address: string;
	user_agent: string;

	// What
	action: AuditAction;
	resource: string;
	resource_type: ResourceType;

	// When - automatically added
	// timestamp: string;

	// Outcome
	outcome: 'success' | 'denied' | 'error';
	error_message?: string;

	// PHI indicator
	phi_accessed: boolean;

	// Additional context
	metadata?: Record<string, unknown>;
}

export type AuditAction =
	| 'VIEW_WORKOUT'
	| 'VIEW_STATS'
	| 'VIEW_INSIGHTS'
	| 'CREATE_WORKOUT'
	| 'UPDATE_WORKOUT'
	| 'DELETE_WORKOUT'
	| 'EXPORT_DATA'
	| 'LOGIN'
	| 'LOGOUT'
	| 'AUTH_FAILED'
	| 'API_ACCESS'
	| 'WEBHOOK_RECEIVED'
	| 'CONFIG_CHANGE'
	| 'ADMIN_ACTION';

export type ResourceType =
	| 'workout'
	| 'daily_stats'
	| 'goal'
	| 'insights'
	| 'user'
	| 'api_endpoint'
	| 'config';

// Create audit-specific child logger
const auditLog = logger.child({ audit: true, hipaa: true });

/**
 * Log a HIPAA audit event
 *
 * All PHI access MUST be logged through this function
 */
export function logAuditEvent(event: AuditEvent): void {
	const auditRecord = {
		timestamp: new Date().toISOString(),
		...event,
		// Ensure sensitive data isn't leaked
		user_agent: event.user_agent?.substring(0, 200) // Truncate long user agents
	};

	// Log based on outcome
	if (event.outcome === 'error') {
		auditLog.error(auditRecord, `AUDIT: ${event.action} - ${event.outcome}`);
	} else if (event.outcome === 'denied') {
		auditLog.warn(auditRecord, `AUDIT: ${event.action} - ${event.outcome}`);
	} else {
		auditLog.info(auditRecord, `AUDIT: ${event.action} - ${event.outcome}`);
	}

	// Record metric for monitoring
	if (event.phi_accessed) {
		recordPhiAccess(event.action, event.outcome);
	}
}

/**
 * Helper to create audit event from SvelteKit request
 */
export function createAuditEventFromRequest(
	request: Request,
	action: AuditAction,
	resourceType: ResourceType,
	resource: string,
	outcome: 'success' | 'denied' | 'error',
	userId: string | null = null,
	phiAccessed = false,
	metadata?: Record<string, unknown>
): AuditEvent {
	return {
		user_id: userId,
		ip_address: request.headers.get('cf-connecting-ip')
			|| request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
			|| 'unknown',
		user_agent: request.headers.get('user-agent') || 'unknown',
		action,
		resource,
		resource_type: resourceType,
		outcome,
		phi_accessed: phiAccessed,
		metadata
	};
}

/**
 * Log PHI view event (workout data is considered PHI)
 */
export function logPhiView(
	request: Request,
	userId: string | null,
	resource: string,
	resourceType: ResourceType
): void {
	logAuditEvent(
		createAuditEventFromRequest(
			request,
			'VIEW_WORKOUT',
			resourceType,
			resource,
			'success',
			userId,
			true
		)
	);
}

/**
 * Log authentication event
 */
export function logAuthEvent(
	request: Request,
	userId: string | null,
	success: boolean,
	errorMessage?: string
): void {
	logAuditEvent({
		user_id: userId,
		ip_address: request.headers.get('cf-connecting-ip')
			|| request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
			|| 'unknown',
		user_agent: request.headers.get('user-agent') || 'unknown',
		action: success ? 'LOGIN' : 'AUTH_FAILED',
		resource: '/auth',
		resource_type: 'user',
		outcome: success ? 'success' : 'denied',
		error_message: errorMessage,
		phi_accessed: false
	});
}

/**
 * Log API access event
 */
export function logApiAccess(
	request: Request,
	userId: string | null,
	endpoint: string,
	outcome: 'success' | 'denied' | 'error',
	phiAccessed = false
): void {
	logAuditEvent(
		createAuditEventFromRequest(
			request,
			'API_ACCESS',
			'api_endpoint',
			endpoint,
			outcome,
			userId,
			phiAccessed
		)
	);
}

/**
 * Log data export event (important for HIPAA)
 */
export function logDataExport(
	request: Request,
	userId: string,
	exportType: string,
	recordCount: number
): void {
	logAuditEvent({
		user_id: userId,
		ip_address: request.headers.get('cf-connecting-ip')
			|| request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
			|| 'unknown',
		user_agent: request.headers.get('user-agent') || 'unknown',
		action: 'EXPORT_DATA',
		resource: `/export/${exportType}`,
		resource_type: 'workout',
		outcome: 'success',
		phi_accessed: true,
		metadata: { export_type: exportType, record_count: recordCount }
	});
}

export default {
	logAuditEvent,
	logPhiView,
	logAuthEvent,
	logApiAccess,
	logDataExport,
	createAuditEventFromRequest
};
