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
	source: text('source').default('health_auto_export'), // Data source identifier
	rawPayload: text('raw_payload'), // Store original JSON for debugging
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
 * Webhook configuration and auth tokens
 */
export const webhookTokens = sqliteTable('webhook_tokens', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	token: text('token').notNull().unique(),
	name: text('name').notNull(),
	isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
	lastUsedAt: text('last_used_at'),
	createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString())
});

// Type exports
export type Workout = typeof workouts.$inferSelect;
export type NewWorkout = typeof workouts.$inferInsert;
export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
export type DailyStat = typeof dailyStats.$inferSelect;
export type WebhookToken = typeof webhookTokens.$inferSelect;
