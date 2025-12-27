/**
 * Test Setup Utilities
 *
 * Provides helpers for creating test app instances and managing test state
 */

import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import * as argon2 from 'argon2';
import type { Config } from '../src/config.js';
import { sql } from 'drizzle-orm';

// Test configuration matching the actual Config interface
const TEST_CONFIG: Partial<Config> = {
  databasePath: ':memory:',
  jwtSecret: 'test-jwt-secret-at-least-32-characters-long!!',
  accessTokenExpiry: '15m',
  refreshTokenExpiryDays: 7,
  isDev: true,
  rateLimitMax: 1000,
  rateLimitWindow: '1 minute',
  cookieSecure: false
};

// SQL statements to create the database schema for testing
const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    is_active INTEGER NOT NULL DEFAULT 1,
    last_login_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS users_email_idx ON users(email)`,
  `CREATE TABLE IF NOT EXISTS refresh_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    is_revoked INTEGER NOT NULL DEFAULT 0,
    user_agent TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS refresh_tokens_user_id_idx ON refresh_tokens(user_id)`,
  `CREATE INDEX IF NOT EXISTS refresh_tokens_expires_at_idx ON refresh_tokens(expires_at)`,
  `CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL UNIQUE,
    target_days INTEGER NOT NULL DEFAULT 300,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS workouts (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL,
    distance_meters REAL NOT NULL,
    energy_burned_kcal REAL,
    avg_heart_rate INTEGER,
    max_heart_rate INTEGER,
    avg_pace_seconds_per_km REAL,
    elevation_gain_meters REAL,
    weather_temp REAL,
    weather_condition TEXT,
    source TEXT DEFAULT 'health_auto_export',
    raw_payload TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS workouts_date_idx ON workouts(date)`,
  `CREATE TABLE IF NOT EXISTS daily_stats (
    date TEXT PRIMARY KEY,
    year INTEGER NOT NULL,
    run_count INTEGER NOT NULL DEFAULT 1,
    total_distance_meters REAL NOT NULL,
    total_duration_seconds INTEGER NOT NULL,
    avg_pace_seconds_per_km REAL,
    longest_run_meters REAL,
    fastest_pace_seconds_per_km REAL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS daily_stats_year_idx ON daily_stats(year)`,
  `CREATE TABLE IF NOT EXISTS webhook_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    last_used_at TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL,
    milestone INTEGER NOT NULL,
    unlocked_at TEXT NOT NULL,
    notified_at TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS achievements_year_idx ON achievements(year)`,
  `CREATE TABLE IF NOT EXISTS outbound_webhooks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    secret TEXT NOT NULL,
    events TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    max_retries INTEGER NOT NULL DEFAULT 5,
    timeout_ms INTEGER NOT NULL DEFAULT 30000,
    last_success_at TEXT,
    last_failure_at TEXT,
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    user_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS outbound_webhooks_user_idx ON outbound_webhooks(user_id)`,
  `CREATE INDEX IF NOT EXISTS outbound_webhooks_active_idx ON outbound_webhooks(is_active)`,
  `CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    webhook_id INTEGER NOT NULL REFERENCES outbound_webhooks(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_id TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    next_retry_at TEXT,
    last_response_status INTEGER,
    last_response_body TEXT,
    last_attempt_at TEXT,
    created_at TEXT NOT NULL,
    completed_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS webhook_deliveries_webhook_idx ON webhook_deliveries(webhook_id)`,
  `CREATE INDEX IF NOT EXISTS webhook_deliveries_status_idx ON webhook_deliveries(status)`,
  `CREATE INDEX IF NOT EXISTS webhook_deliveries_next_retry_idx ON webhook_deliveries(next_retry_at)`,
  `CREATE INDEX IF NOT EXISTS webhook_deliveries_event_id_idx ON webhook_deliveries(event_id)`
];

export async function createTestApp(): Promise<FastifyInstance> {
  const app = await buildApp({
    config: TEST_CONFIG,
    logger: false
  });

  // Create schema in the in-memory database using drizzle's run method
  for (const statement of SCHEMA_STATEMENTS) {
    app.db.run(sql.raw(statement));
  }

  return app;
}

export async function createTestUser(
  app: FastifyInstance,
  email = 'test@example.com',
  password = 'password123'
): Promise<{ id: string; email: string }> {
  const passwordHash = await argon2.hash(password);
  const id = crypto.randomUUID();

  const { users } = await import('@running-days/database');

  app.db.insert(users).values({
    id,
    email,
    passwordHash,
    role: 'user',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }).run();

  return { id, email };
}

export async function loginTestUser(
  app: FastifyInstance,
  email = 'test@example.com',
  password = 'password123'
): Promise<{ accessToken: string; refreshToken: string; cookies: string }> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email, password }
  });

  const cookies = response.cookies;
  const accessToken = cookies.find(c => c.name === 'access_token')?.value ?? '';
  const refreshToken = cookies.find(c => c.name === 'refresh_token')?.value ?? '';

  return {
    accessToken,
    refreshToken,
    cookies: `access_token=${accessToken}; refresh_token=${refreshToken}`
  };
}

export async function createTestGoal(
  app: FastifyInstance,
  year = new Date().getFullYear(),
  targetDays = 300
): Promise<{ id: number; year: number; targetDays: number }> {
  const { goals } = await import('@running-days/database');

  const result = app.db.insert(goals).values({
    year,
    targetDays,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }).returning().get();

  return { id: result.id, year: result.year, targetDays: result.targetDays };
}
