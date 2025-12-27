/**
 * POST /api/v1/workouts/sync
 * Main sync endpoint for HealthKit workout synchronization
 *
 * Features:
 * - Bearer token authentication
 * - Zod schema validation
 * - Duplicate detection (60-second tolerance)
 * - Idempotency support for retry safety
 * - Conflict resolution with version tracking
 */

import { json, error } from '@sveltejs/kit';
import { validateWebhookToken } from '$lib/server/data-access.js';
import { processSync, type AuditContext } from '$lib/server/sync/index.js';
import { SyncRequestSchema } from '$lib/server/sync/schemas.js';
import { logger } from '$lib/server/logger.js';
import type { RequestHandler } from './$types';

// Maximum payload size: 1MB
const MAX_PAYLOAD_SIZE = 1024 * 1024;

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	// Check payload size before parsing
	const contentLength = request.headers.get('content-length');
	if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_SIZE) {
		throw error(413, {
			message: 'Payload too large',
			// @ts-expect-error - Adding custom error code
			code: 'PAYLOAD_TOO_LARGE'
		});
	}

	// Extract token from Authorization header
	const authHeader = request.headers.get('Authorization');
	if (!authHeader?.startsWith('Bearer ')) {
		throw error(401, {
			message: 'Missing or invalid Authorization header',
			// @ts-expect-error - Adding custom error code
			code: 'UNAUTHORIZED'
		});
	}

	const token = authHeader.slice(7);
	const userId = await validateWebhookToken(token);

	if (!userId) {
		throw error(401, {
			message: 'Invalid or expired token',
			// @ts-expect-error - Adding custom error code
			code: 'TOKEN_INVALID'
		});
	}

	const auditContext: AuditContext = {
		ipAddress: getClientAddress(),
		userAgent: request.headers.get('user-agent') || undefined
	};

	// Parse and validate payload
	let rawPayload: unknown;
	try {
		rawPayload = await request.json();
	} catch {
		throw error(400, {
			message: 'Invalid JSON payload',
			// @ts-expect-error - Adding custom error code
			code: 'VALIDATION_ERROR'
		});
	}

	const parseResult = SyncRequestSchema.safeParse(rawPayload);
	if (!parseResult.success) {
		const firstError = parseResult.error.issues[0];
		throw error(400, {
			message: `Validation error: ${firstError?.path.join('.')} - ${firstError?.message}`,
			// @ts-expect-error - Adding custom error fields
			code: 'VALIDATION_ERROR',
			errors: parseResult.error.issues.map((issue) => ({
				field: issue.path.join('.'),
				message: issue.message
			}))
		});
	}

	const syncRequest = parseResult.data;

	try {
		const response = await processSync(userId, syncRequest, auditContext);

		return json(response, {
			headers: {
				'X-Sync-Id': response.syncId
			}
		});
	} catch (err) {
		// Handle idempotency conflict specifically
		if (err instanceof Error && err.message === 'Idempotency conflict') {
			throw error(409, {
				message: 'Request with this idempotency key was already processed with different data',
				// @ts-expect-error - Adding custom error code
				code: 'IDEMPOTENCY_CONFLICT'
			});
		}

		logger.error({ err }, 'Sync processing error');
		throw error(500, {
			message: 'Failed to process sync request',
			// @ts-expect-error - Adding custom error code
			code: 'SERVER_ERROR'
		});
	}
};
