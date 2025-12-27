import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

/**
 * Running workouts imported from Apple Health
 */
export const workouts = sqliteTable('workouts', {
  id: text('id').primaryKey(), // UUID from Health Auto Export
  date: text('date').notNull(), // ISO date string YYYY-MM-DD
  startTime: text('start_time').notNull(), // ISO datetime
  endTime: text('end_time').notNull(), // ISO datetime
  durationSeconds: integer('duration_seconds').notNull(),
  distanceMeters: real('distance_meters').notNull(),
  energyBurnedKcal: real('energy_burned_kcal'),
  avgHeartRate: integer('avg_heart_rate'),
  maxHeartRate: integer('max_heart_rate'),
  avgPaceSecondsPerKm: real('avg_pace_seconds_per_km'),
  elevationGainMeters: real('elevation_gain_meters'),
  weatherTemp: real('weather_temp'),
  weatherCondition: text('weather_condition'),
  source: text('source').default('health_auto_export'),
  rawPayload: text('raw_payload'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString())
}, (table) => [
  index('workouts_date_idx').on(table.date)
]);

/**
 * Yearly goals configuration
 */
export const goals = sqliteTable('goals', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  year: integer('year').notNull().unique(),
  targetDays: integer('target_days').notNull().default(300),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString())
});

/**
 * Daily aggregates for quick lookups
 * One row per day that has at least one run
 */
export const dailyStats = sqliteTable('daily_stats', {
  date: text('date').primaryKey(), // YYYY-MM-DD
  year: integer('year').notNull(),
  runCount: integer('run_count').notNull().default(1),
  totalDistanceMeters: real('total_distance_meters').notNull(),
  totalDurationSeconds: integer('total_duration_seconds').notNull(),
  avgPaceSecondsPerKm: real('avg_pace_seconds_per_km'),
  longestRunMeters: real('longest_run_meters'),
  fastestPaceSecondsPerKm: real('fastest_pace_seconds_per_km'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString())
}, (table) => [
  index('daily_stats_year_idx').on(table.year)
]);

/**
 * Webhook configuration and auth tokens (inbound webhooks)
 */
export const webhookTokens = sqliteTable('webhook_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  token: text('token').notNull().unique(),
  name: text('name').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  lastUsedAt: text('last_used_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString())
});

/**
 * User accounts for authentication
 */
export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['user', 'admin'] }).notNull().default('user'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  lastLoginAt: text('last_login_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString())
}, (table) => [
  index('users_email_idx').on(table.email)
]);

/**
 * Refresh tokens for session management
 * Stored in DB for revocation capability
 */
export const refreshTokens = sqliteTable('refresh_tokens', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  isRevoked: integer('is_revoked', { mode: 'boolean' }).notNull().default(false),
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString())
}, (table) => [
  index('refresh_tokens_user_id_idx').on(table.userId),
  index('refresh_tokens_expires_at_idx').on(table.expiresAt)
]);

/**
 * Achievements for tracking milestones
 */
export const achievements = sqliteTable('achievements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  year: integer('year').notNull(),
  milestone: integer('milestone').notNull(), // 50, 100, 150, 200, 250, 300
  unlockedAt: text('unlocked_at').notNull(),
  notifiedAt: text('notified_at'), // When webhook was sent
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString())
}, (table) => [
  index('achievements_year_idx').on(table.year)
]);

/**
 * Outbound webhook configuration
 */
export const outboundWebhooks = sqliteTable('outbound_webhooks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  url: text('url').notNull(),
  secret: text('secret').notNull(),
  events: text('events').notNull(), // JSON array of event types
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  maxRetries: integer('max_retries').notNull().default(5),
  timeoutMs: integer('timeout_ms').notNull().default(30000),
  lastSuccessAt: text('last_success_at'),
  lastFailureAt: text('last_failure_at'),
  consecutiveFailures: integer('consecutive_failures').notNull().default(0),
  userId: text('user_id'), // For future multi-user support
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString())
}, (table) => [
  index('outbound_webhooks_user_idx').on(table.userId),
  index('outbound_webhooks_active_idx').on(table.isActive)
]);

/**
 * Webhook delivery tracking and retry queue
 */
export const webhookDeliveries = sqliteTable('webhook_deliveries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  webhookId: integer('webhook_id').notNull().references(() => outboundWebhooks.id, { onDelete: 'cascade' }),
  eventType: text('event_type').notNull(),
  eventId: text('event_id').notNull(),
  payload: text('payload').notNull(), // JSON
  status: text('status').notNull().default('pending'), // pending, success, failed, exhausted
  attempts: integer('attempts').notNull().default(0),
  nextRetryAt: text('next_retry_at'),
  lastResponseStatus: integer('last_response_status'),
  lastResponseBody: text('last_response_body'),
  lastAttemptAt: text('last_attempt_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  completedAt: text('completed_at')
}, (table) => [
  index('webhook_deliveries_webhook_idx').on(table.webhookId),
  index('webhook_deliveries_status_idx').on(table.status),
  index('webhook_deliveries_next_retry_idx').on(table.nextRetryAt),
  index('webhook_deliveries_event_id_idx').on(table.eventId)
]);

// Type exports - these match the @running-days/types package
export type Workout = typeof workouts.$inferSelect;
export type NewWorkout = typeof workouts.$inferInsert;
export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
export type DailyStat = typeof dailyStats.$inferSelect;
export type NewDailyStat = typeof dailyStats.$inferInsert;
export type WebhookToken = typeof webhookTokens.$inferSelect;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
export type OutboundWebhook = typeof outboundWebhooks.$inferSelect;
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
