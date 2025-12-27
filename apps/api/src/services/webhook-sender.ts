/**
 * Outbound Webhook Sender Service
 *
 * Handles sending webhook events to configured endpoints with:
 * - HMAC signature verification
 * - Retry with exponential backoff
 * - Delivery tracking
 */

import * as crypto from 'node:crypto';
import { eq, and, lte, sql } from 'drizzle-orm';
import type { Database } from '@running-days/database';
import { outboundWebhooks, webhookDeliveries } from '@running-days/database';
import type { WebhookEventType, WebhookPayload } from '@running-days/types';

// Retry delays in milliseconds: 1min, 2min, 4min, 8min, 16min
const RETRY_DELAYS = [60_000, 120_000, 240_000, 480_000, 960_000];

interface SendOptions {
  db: Database;
  eventType: WebhookEventType;
  data: unknown;
  log?: (level: string, msg: string, obj?: Record<string, unknown>) => void;
}

/**
 * Generate HMAC-SHA256 signature for webhook payload
 */
export function generateSignature(payload: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  return `sha256=${hmac.digest('hex')}`;
}

/**
 * Create a unique event ID
 */
function generateEventId(): string {
  return crypto.randomUUID();
}

/**
 * Create the webhook payload envelope
 */
function createPayload<T>(type: WebhookEventType, data: T): WebhookPayload<T> {
  return {
    id: generateEventId(),
    type,
    timestamp: new Date().toISOString(),
    version: '1.0',
    data
  };
}

/**
 * Queue a webhook event for delivery to all subscribed endpoints
 */
export async function queueWebhookEvent(options: SendOptions): Promise<string[]> {
  const { db, eventType, data, log } = options;
  const payload = createPayload(eventType, data);
  const payloadJson = JSON.stringify(payload);
  const deliveryIds: string[] = [];

  // Find all active webhooks subscribed to this event
  const webhooks = await db.query.outboundWebhooks.findMany({
    where: eq(outboundWebhooks.isActive, true)
  });

  for (const webhook of webhooks) {
    // Parse events array
    const events: WebhookEventType[] = JSON.parse(webhook.events);

    if (!events.includes(eventType)) {
      continue;
    }

    // Create delivery record
    const [delivery] = await db
      .insert(webhookDeliveries)
      .values({
        webhookId: webhook.id,
        eventType,
        eventId: payload.id,
        payload: payloadJson,
        status: 'pending',
        attempts: 0,
        nextRetryAt: new Date().toISOString()
      })
      .returning();

    deliveryIds.push(delivery.id.toString());
    log?.('info', `Queued webhook delivery ${delivery.id} for ${webhook.name}`);
  }

  return deliveryIds;
}

/**
 * Attempt to deliver a single webhook
 * Returns true if successful, false if failed
 */
async function attemptDelivery(
  db: Database,
  delivery: typeof webhookDeliveries.$inferSelect,
  webhook: typeof outboundWebhooks.$inferSelect,
  log?: (level: string, msg: string, obj?: Record<string, unknown>) => void
): Promise<boolean> {
  const signature = generateSignature(delivery.payload, webhook.secret);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), webhook.timeoutMs);

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': delivery.eventType,
        'X-Webhook-ID': delivery.eventId,
        'User-Agent': 'RunningDays-Webhook/1.0'
      },
      body: delivery.payload,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const responseBody = await response.text().catch(() => '');

    if (response.ok) {
      // Success!
      await db
        .update(webhookDeliveries)
        .set({
          status: 'success',
          lastResponseStatus: response.status,
          lastResponseBody: responseBody.slice(0, 1000),
          lastAttemptAt: new Date().toISOString(),
          completedAt: new Date().toISOString()
        })
        .where(eq(webhookDeliveries.id, delivery.id));

      await db
        .update(outboundWebhooks)
        .set({
          lastSuccessAt: new Date().toISOString(),
          consecutiveFailures: 0,
          updatedAt: new Date().toISOString()
        })
        .where(eq(outboundWebhooks.id, webhook.id));

      log?.('info', `Webhook delivery ${delivery.id} succeeded`, {
        webhookId: webhook.id,
        status: response.status
      });

      return true;
    }

    // Non-2xx response
    await handleFailure(db, delivery, webhook, response.status, responseBody.slice(0, 1000), log);
    return false;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await handleFailure(db, delivery, webhook, null, errorMessage, log);
    return false;
  }
}

/**
 * Handle delivery failure - schedule retry or mark as exhausted
 */
async function handleFailure(
  db: Database,
  delivery: typeof webhookDeliveries.$inferSelect,
  webhook: typeof outboundWebhooks.$inferSelect,
  status: number | null,
  errorBody: string,
  log?: (level: string, msg: string, obj?: Record<string, unknown>) => void
): Promise<void> {
  const newAttempts = delivery.attempts + 1;
  const now = new Date().toISOString();

  if (newAttempts >= webhook.maxRetries) {
    // Exhausted retries
    await db
      .update(webhookDeliveries)
      .set({
        status: 'exhausted',
        attempts: newAttempts,
        lastResponseStatus: status,
        lastResponseBody: errorBody,
        lastAttemptAt: now,
        completedAt: now,
        nextRetryAt: null
      })
      .where(eq(webhookDeliveries.id, delivery.id));

    log?.('warn', `Webhook delivery ${delivery.id} exhausted after ${newAttempts} attempts`, {
      webhookId: webhook.id,
      lastStatus: status
    });
  } else {
    // Schedule retry with exponential backoff
    const delayIndex = Math.min(newAttempts - 1, RETRY_DELAYS.length - 1);
    const delay = RETRY_DELAYS[delayIndex];
    const nextRetry = new Date(Date.now() + delay).toISOString();

    await db
      .update(webhookDeliveries)
      .set({
        status: 'pending',
        attempts: newAttempts,
        lastResponseStatus: status,
        lastResponseBody: errorBody,
        lastAttemptAt: now,
        nextRetryAt: nextRetry
      })
      .where(eq(webhookDeliveries.id, delivery.id));

    log?.('info', `Webhook delivery ${delivery.id} failed, retry ${newAttempts}/${webhook.maxRetries} at ${nextRetry}`, {
      webhookId: webhook.id,
      lastStatus: status
    });
  }

  // Update webhook failure stats
  await db
    .update(outboundWebhooks)
    .set({
      lastFailureAt: now,
      consecutiveFailures: sql`${outboundWebhooks.consecutiveFailures} + 1`,
      updatedAt: now
    })
    .where(eq(outboundWebhooks.id, webhook.id));
}

/**
 * Process pending deliveries that are due for retry
 * Call this periodically (e.g., every 30 seconds)
 */
export async function processRetryQueue(
  db: Database,
  log?: (level: string, msg: string, obj?: Record<string, unknown>) => void
): Promise<{ processed: number; succeeded: number; failed: number }> {
  const now = new Date().toISOString();

  // Find pending deliveries that are ready
  const pendingDeliveries = await db
    .select()
    .from(webhookDeliveries)
    .where(
      and(
        eq(webhookDeliveries.status, 'pending'),
        lte(webhookDeliveries.nextRetryAt, now)
      )
    )
    .limit(50); // Process in batches

  let succeeded = 0;
  let failed = 0;

  for (const delivery of pendingDeliveries) {
    const webhook = await db.query.outboundWebhooks.findFirst({
      where: eq(outboundWebhooks.id, delivery.webhookId)
    });

    if (!webhook || !webhook.isActive) {
      // Webhook deleted or deactivated
      await db
        .update(webhookDeliveries)
        .set({ status: 'failed', completedAt: now })
        .where(eq(webhookDeliveries.id, delivery.id));
      failed++;
      continue;
    }

    const success = await attemptDelivery(db, delivery, webhook, log);
    if (success) {
      succeeded++;
    } else {
      failed++;
    }
  }

  return { processed: pendingDeliveries.length, succeeded, failed };
}

/**
 * Send a test ping to verify webhook configuration
 */
export async function sendTestPing(
  db: Database,
  webhookId: number,
  log?: (level: string, msg: string, obj?: Record<string, unknown>) => void
): Promise<{ success: boolean; message: string; responseStatus?: number }> {
  const webhook = await db.query.outboundWebhooks.findFirst({
    where: eq(outboundWebhooks.id, webhookId)
  });

  if (!webhook) {
    return { success: false, message: 'Webhook not found' };
  }

  const payload = createPayload('webhook.test', {
    webhook: { id: webhook.id, name: webhook.name },
    message: 'Test ping from Running Days API'
  });

  const payloadJson = JSON.stringify(payload);
  const signature = generateSignature(payloadJson, webhook.secret);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), webhook.timeoutMs);

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': 'webhook.test',
        'X-Webhook-ID': payload.id,
        'User-Agent': 'RunningDays-Webhook/1.0'
      },
      body: payloadJson,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      await db
        .update(outboundWebhooks)
        .set({
          lastSuccessAt: new Date().toISOString(),
          consecutiveFailures: 0,
          updatedAt: new Date().toISOString()
        })
        .where(eq(outboundWebhooks.id, webhookId));

      log?.('info', `Test ping to webhook ${webhookId} succeeded`);

      return {
        success: true,
        message: 'Test ping delivered successfully',
        responseStatus: response.status
      };
    }

    return {
      success: false,
      message: `Webhook returned status ${response.status}`,
      responseStatus: response.status
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      success: false,
      message: `Failed to deliver: ${errorMessage}`
    };
  }
}
