/**
 * Outbound webhook event types
 */

export type WebhookEventType =
  | 'goal.created'
  | 'goal.updated'
  | 'goal.deleted'
  | 'goal.achieved'
  | 'milestone.reached'
  | 'streak.broken'
  | 'webhook.test';

export interface WebhookPayload<T = unknown> {
  id: string; // Unique event ID (UUID)
  type: WebhookEventType;
  timestamp: string; // ISO 8601
  version: '1.0';
  data: T;
}

export interface GoalEventData {
  goal: {
    id: number;
    year: number;
    targetDays: number;
    createdAt: string;
    updatedAt: string;
  };
  progress?: {
    daysCompleted: number;
    percentComplete: number;
    daysRemaining: number;
  };
}

export interface MilestoneEventData {
  milestone: {
    type: 'days_reached';
    value: number; // 50, 100, 150, 200, 250, 300
    year: number;
  };
  goal: {
    id: number;
    year: number;
    targetDays: number;
  };
  progress: {
    daysCompleted: number;
    percentComplete: number;
  };
}

export interface StreakEventData {
  streak: {
    previousLength: number;
    endedAt: string;
    lastRunDate: string;
  };
  year: number;
}

export interface TestPingData {
  webhook: {
    id: number;
    name: string;
  };
  message: string;
}

export interface OutboundWebhook {
  id: number;
  name: string;
  url: string;
  secret: string;
  events: WebhookEventType[];
  isActive: boolean;
  maxRetries: number;
  timeoutMs: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  consecutiveFailures: number;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDelivery {
  id: number;
  webhookId: number;
  eventType: WebhookEventType;
  eventId: string;
  payload: string; // JSON
  status: 'pending' | 'success' | 'failed' | 'exhausted';
  attempts: number;
  nextRetryAt: string | null;
  lastResponseStatus: number | null;
  lastResponseBody: string | null;
  lastAttemptAt: string | null;
  createdAt: string;
  completedAt: string | null;
}
