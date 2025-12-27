/**
 * Outbound Webhook Management Routes
 *
 * CRUD for webhook configurations and delivery monitoring
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { eq, desc, and } from 'drizzle-orm';
import * as crypto from 'node:crypto';
import { outboundWebhooks, webhookDeliveries } from '@running-days/database';
import type { WebhookEventType } from '@running-days/types';
import { sendTestPing, processRetryQueue } from '../services/webhook-sender.js';

// Valid event types
const VALID_EVENTS: WebhookEventType[] = [
  'goal.created',
  'goal.updated',
  'goal.deleted',
  'goal.achieved',
  'milestone.reached',
  'streak.broken',
  'webhook.test'
];

// Validation schemas
const createWebhookSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  events: z.array(z.enum([
    'goal.created',
    'goal.updated',
    'goal.deleted',
    'goal.achieved',
    'milestone.reached',
    'streak.broken',
    'webhook.test'
  ])).min(1),
  maxRetries: z.number().int().min(1).max(10).optional().default(5),
  timeoutMs: z.number().int().min(1000).max(60000).optional().default(30000)
});

const updateWebhookSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().optional(),
  events: z.array(z.enum([
    'goal.created',
    'goal.updated',
    'goal.deleted',
    'goal.achieved',
    'milestone.reached',
    'streak.broken',
    'webhook.test'
  ])).min(1).optional(),
  isActive: z.boolean().optional(),
  maxRetries: z.number().int().min(1).max(10).optional(),
  timeoutMs: z.number().int().min(1000).max(60000).optional()
});

/**
 * Generate a secure random secret
 */
function generateSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

export const outboundWebhookRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/v1/webhooks
   * List all webhook configurations
   */
  fastify.get('/', {
    preHandler: [fastify.authenticate]
  }, async () => {
    const webhooks = await fastify.db.query.outboundWebhooks.findMany({
      orderBy: (webhooks, { desc }) => [desc(webhooks.createdAt)]
    });

    return {
      webhooks: webhooks.map(w => ({
        id: w.id,
        name: w.name,
        url: w.url,
        events: JSON.parse(w.events),
        isActive: w.isActive,
        maxRetries: w.maxRetries,
        timeoutMs: w.timeoutMs,
        lastSuccessAt: w.lastSuccessAt,
        lastFailureAt: w.lastFailureAt,
        consecutiveFailures: w.consecutiveFailures,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt
        // Note: secret is not returned in list
      })),
      count: webhooks.length
    };
  });

  /**
   * POST /api/v1/webhooks
   * Create a new webhook configuration
   */
  fastify.post('/', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const parseResult = createWebhookSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.badRequest(parseResult.error.message);
    }

    const { name, url, events, maxRetries, timeoutMs } = parseResult.data;
    const secret = generateSecret();

    const [webhook] = await fastify.db
      .insert(outboundWebhooks)
      .values({
        name,
        url,
        secret,
        events: JSON.stringify(events),
        maxRetries,
        timeoutMs,
        userId: request.user!.id
      })
      .returning();

    // Log audit event
    fastify.auditLogger.logAuditEvent({
      user_id: request.user!.id,
      ip_address: request.ip,
      user_agent: request.headers['user-agent'] || 'unknown',
      action: 'WEBHOOK_CREATED',
      resource: `/webhooks/${webhook.id}`,
      resource_type: 'outbound_webhook',
      outcome: 'success',
      phi_accessed: false,
      metadata: { name, url, events }
    });

    return reply.code(201).send({
      webhook: {
        id: webhook.id,
        name: webhook.name,
        url: webhook.url,
        secret: webhook.secret, // Only returned on create
        events: JSON.parse(webhook.events),
        isActive: webhook.isActive,
        maxRetries: webhook.maxRetries,
        timeoutMs: webhook.timeoutMs,
        createdAt: webhook.createdAt
      },
      message: 'Webhook created. Save the secret - it will not be shown again.'
    });
  });

  /**
   * GET /api/v1/webhooks/:id
   * Get webhook details
   */
  fastify.get<{ Params: { id: string } }>('/:id', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) {
      return reply.badRequest('Invalid webhook ID');
    }

    const webhook = await fastify.db.query.outboundWebhooks.findFirst({
      where: eq(outboundWebhooks.id, id)
    });

    if (!webhook) {
      return reply.notFound('Webhook not found');
    }

    // Get recent deliveries
    const recentDeliveries = await fastify.db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.webhookId, id))
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(20);

    return {
      webhook: {
        id: webhook.id,
        name: webhook.name,
        url: webhook.url,
        events: JSON.parse(webhook.events),
        isActive: webhook.isActive,
        maxRetries: webhook.maxRetries,
        timeoutMs: webhook.timeoutMs,
        lastSuccessAt: webhook.lastSuccessAt,
        lastFailureAt: webhook.lastFailureAt,
        consecutiveFailures: webhook.consecutiveFailures,
        createdAt: webhook.createdAt,
        updatedAt: webhook.updatedAt
      },
      recentDeliveries: recentDeliveries.map(d => ({
        id: d.id,
        eventType: d.eventType,
        eventId: d.eventId,
        status: d.status,
        attempts: d.attempts,
        lastResponseStatus: d.lastResponseStatus,
        lastAttemptAt: d.lastAttemptAt,
        createdAt: d.createdAt,
        completedAt: d.completedAt
      }))
    };
  });

  /**
   * PUT /api/v1/webhooks/:id
   * Update webhook configuration
   */
  fastify.put<{ Params: { id: string } }>('/:id', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) {
      return reply.badRequest('Invalid webhook ID');
    }

    const parseResult = updateWebhookSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.badRequest(parseResult.error.message);
    }

    const existing = await fastify.db.query.outboundWebhooks.findFirst({
      where: eq(outboundWebhooks.id, id)
    });

    if (!existing) {
      return reply.notFound('Webhook not found');
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString()
    };

    if (parseResult.data.name !== undefined) updates.name = parseResult.data.name;
    if (parseResult.data.url !== undefined) updates.url = parseResult.data.url;
    if (parseResult.data.events !== undefined) updates.events = JSON.stringify(parseResult.data.events);
    if (parseResult.data.isActive !== undefined) updates.isActive = parseResult.data.isActive;
    if (parseResult.data.maxRetries !== undefined) updates.maxRetries = parseResult.data.maxRetries;
    if (parseResult.data.timeoutMs !== undefined) updates.timeoutMs = parseResult.data.timeoutMs;

    await fastify.db
      .update(outboundWebhooks)
      .set(updates)
      .where(eq(outboundWebhooks.id, id));

    const updated = await fastify.db.query.outboundWebhooks.findFirst({
      where: eq(outboundWebhooks.id, id)
    });

    // Log audit event
    fastify.auditLogger.logAuditEvent({
      user_id: request.user!.id,
      ip_address: request.ip,
      user_agent: request.headers['user-agent'] || 'unknown',
      action: 'WEBHOOK_UPDATED',
      resource: `/webhooks/${id}`,
      resource_type: 'outbound_webhook',
      outcome: 'success',
      phi_accessed: false,
      metadata: { updates: parseResult.data }
    });

    return {
      webhook: {
        id: updated!.id,
        name: updated!.name,
        url: updated!.url,
        events: JSON.parse(updated!.events),
        isActive: updated!.isActive,
        maxRetries: updated!.maxRetries,
        timeoutMs: updated!.timeoutMs,
        lastSuccessAt: updated!.lastSuccessAt,
        lastFailureAt: updated!.lastFailureAt,
        consecutiveFailures: updated!.consecutiveFailures,
        createdAt: updated!.createdAt,
        updatedAt: updated!.updatedAt
      }
    };
  });

  /**
   * DELETE /api/v1/webhooks/:id
   * Delete a webhook configuration
   */
  fastify.delete<{ Params: { id: string } }>('/:id', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) {
      return reply.badRequest('Invalid webhook ID');
    }

    const existing = await fastify.db.query.outboundWebhooks.findFirst({
      where: eq(outboundWebhooks.id, id)
    });

    if (!existing) {
      return reply.notFound('Webhook not found');
    }

    // Delete cascade will handle webhookDeliveries
    await fastify.db.delete(outboundWebhooks).where(eq(outboundWebhooks.id, id));

    // Log audit event
    fastify.auditLogger.logAuditEvent({
      user_id: request.user!.id,
      ip_address: request.ip,
      user_agent: request.headers['user-agent'] || 'unknown',
      action: 'WEBHOOK_DELETED',
      resource: `/webhooks/${id}`,
      resource_type: 'outbound_webhook',
      outcome: 'success',
      phi_accessed: false,
      metadata: { name: existing.name, url: existing.url }
    });

    return { success: true, message: 'Webhook deleted' };
  });

  /**
   * POST /api/v1/webhooks/:id/rotate-secret
   * Generate a new secret for a webhook
   */
  fastify.post<{ Params: { id: string } }>('/:id/rotate-secret', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) {
      return reply.badRequest('Invalid webhook ID');
    }

    const existing = await fastify.db.query.outboundWebhooks.findFirst({
      where: eq(outboundWebhooks.id, id)
    });

    if (!existing) {
      return reply.notFound('Webhook not found');
    }

    const newSecret = generateSecret();

    await fastify.db
      .update(outboundWebhooks)
      .set({
        secret: newSecret,
        updatedAt: new Date().toISOString()
      })
      .where(eq(outboundWebhooks.id, id));

    // Log audit event
    fastify.auditLogger.logAuditEvent({
      user_id: request.user!.id,
      ip_address: request.ip,
      user_agent: request.headers['user-agent'] || 'unknown',
      action: 'WEBHOOK_SECRET_ROTATED',
      resource: `/webhooks/${id}`,
      resource_type: 'outbound_webhook',
      outcome: 'success',
      phi_accessed: false
    });

    return {
      secret: newSecret,
      message: 'Secret rotated. Save the new secret - it will not be shown again.'
    };
  });

  /**
   * POST /api/v1/webhooks/:id/test
   * Send a test ping to the webhook
   */
  fastify.post<{ Params: { id: string } }>('/:id/test', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) {
      return reply.badRequest('Invalid webhook ID');
    }

    const result = await sendTestPing(
      fastify.db,
      id,
      (level, msg, obj) => fastify.log[level as 'info' | 'warn' | 'error'](obj, msg)
    );

    if (!result.success) {
      return reply.code(502).send({
        success: false,
        message: result.message,
        responseStatus: result.responseStatus
      });
    }

    return result;
  });

  /**
   * GET /api/v1/webhooks/:id/deliveries
   * List delivery attempts for a webhook
   */
  fastify.get<{
    Params: { id: string };
    Querystring: { status?: string; limit?: string; offset?: string }
  }>('/:id/deliveries', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) {
      return reply.badRequest('Invalid webhook ID');
    }

    const limit = Math.min(parseInt(request.query.limit || '50', 10), 100);
    const offset = parseInt(request.query.offset || '0', 10);
    const statusFilter = request.query.status;

    const webhook = await fastify.db.query.outboundWebhooks.findFirst({
      where: eq(outboundWebhooks.id, id)
    });

    if (!webhook) {
      return reply.notFound('Webhook not found');
    }

    let query = fastify.db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.webhookId, id));

    if (statusFilter && ['pending', 'success', 'failed', 'exhausted'].includes(statusFilter)) {
      query = fastify.db
        .select()
        .from(webhookDeliveries)
        .where(and(
          eq(webhookDeliveries.webhookId, id),
          eq(webhookDeliveries.status, statusFilter as 'pending' | 'success' | 'failed' | 'exhausted')
        ));
    }

    const deliveries = await query
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      deliveries: deliveries.map(d => ({
        id: d.id,
        eventType: d.eventType,
        eventId: d.eventId,
        status: d.status,
        attempts: d.attempts,
        nextRetryAt: d.nextRetryAt,
        lastResponseStatus: d.lastResponseStatus,
        lastAttemptAt: d.lastAttemptAt,
        createdAt: d.createdAt,
        completedAt: d.completedAt
      })),
      count: deliveries.length,
      limit,
      offset
    };
  });

  /**
   * GET /api/v1/webhooks/events
   * List available event types
   */
  fastify.get('/events', {
    preHandler: [fastify.authenticate]
  }, async () => {
    return {
      events: VALID_EVENTS.map(event => ({
        type: event,
        description: getEventDescription(event)
      }))
    };
  });
};

function getEventDescription(event: WebhookEventType): string {
  const descriptions: Record<WebhookEventType, string> = {
    'goal.created': 'Fired when a new yearly goal is created',
    'goal.updated': 'Fired when goal target days are updated',
    'goal.deleted': 'Fired when a goal is deleted',
    'goal.achieved': 'Fired when the goal target is reached',
    'milestone.reached': 'Fired when a milestone (50, 100, 150, 200, 250, 300 days) is reached',
    'streak.broken': 'Fired when a running streak is broken',
    'webhook.test': 'Test ping to verify webhook configuration'
  };
  return descriptions[event];
}
