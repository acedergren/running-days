/**
 * Oracle ADB Schema for Running Days (Multi-Tenant)
 *
 * PRIVACY PRINCIPLES:
 * 1. Every table has user_id - no orphaned data
 * 2. All queries MUST filter by user_id - enforced in data access layer
 * 3. Audit log tracks all data access
 * 4. Cascade deletes ensure complete data removal
 */

// Note: Using raw SQL for Oracle. Drizzle Oracle support is experimental.
// These are the table definitions to be created via migration.

export const SCHEMA_SQL = `
-- Users table (from Apple Sign-In)
CREATE TABLE users (
  id VARCHAR2(255) PRIMARY KEY,           -- Apple's stable user ID (sub claim)
  email VARCHAR2(255),                     -- May be relay address
  email_verified NUMBER(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL               -- Soft delete for GDPR grace period
);

CREATE INDEX idx_users_email ON users(email);

-- Workouts table (core data)
CREATE TABLE workouts (
  id VARCHAR2(36) PRIMARY KEY,
  user_id VARCHAR2(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date_local DATE NOT NULL,               -- Local date YYYY-MM-DD
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  duration_seconds NUMBER NOT NULL,
  distance_meters NUMBER NOT NULL,
  energy_burned_kcal NUMBER,
  avg_heart_rate NUMBER,
  max_heart_rate NUMBER,
  avg_pace_seconds_per_km NUMBER,
  elevation_gain_meters NUMBER,
  weather_temp NUMBER,
  weather_condition VARCHAR2(100),
  source VARCHAR2(50) DEFAULT 'health_auto_export',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workouts_user_date ON workouts(user_id, date_local);
CREATE INDEX idx_workouts_user_id ON workouts(user_id);

-- Daily stats (aggregated per user per day)
CREATE TABLE daily_stats (
  id VARCHAR2(36) PRIMARY KEY,
  user_id VARCHAR2(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date_local DATE NOT NULL,
  year_num NUMBER NOT NULL,
  run_count NUMBER DEFAULT 1,
  total_distance_meters NUMBER NOT NULL,
  total_duration_seconds NUMBER NOT NULL,
  avg_pace_seconds_per_km NUMBER,
  longest_run_meters NUMBER,
  fastest_pace_seconds_per_km NUMBER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_daily_stats_user_date UNIQUE (user_id, date_local)
);

CREATE INDEX idx_daily_stats_user_year ON daily_stats(user_id, year_num);

-- Goals per user per year
CREATE TABLE goals (
  id VARCHAR2(36) PRIMARY KEY,
  user_id VARCHAR2(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year_num NUMBER NOT NULL,
  target_days NUMBER DEFAULT 300,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_goals_user_year UNIQUE (user_id, year_num)
);

-- Webhook tokens (per user)
CREATE TABLE webhook_tokens (
  id VARCHAR2(36) PRIMARY KEY,
  user_id VARCHAR2(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR2(64) NOT NULL UNIQUE,
  name VARCHAR2(100) NOT NULL,
  is_active NUMBER(1) DEFAULT 1,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webhook_tokens_token ON webhook_tokens(token);

-- Sessions for authentication
CREATE TABLE sessions (
  id VARCHAR2(64) PRIMARY KEY,
  user_id VARCHAR2(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR2(45),
  user_agent VARCHAR2(500)
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- Audit log (HIPAA/GDPR compliance)
-- This table is append-only, never deleted
CREATE TABLE audit_log (
  id VARCHAR2(36) PRIMARY KEY,
  user_id VARCHAR2(255),                   -- NULL after user deletion (anonymized)
  action VARCHAR2(50) NOT NULL,            -- e.g., 'data_access', 'data_export', 'data_delete'
  resource_type VARCHAR2(50),              -- e.g., 'workouts', 'goals'
  resource_id VARCHAR2(255),
  ip_address VARCHAR2(45),
  user_agent VARCHAR2(500),
  metadata CLOB,                           -- JSON with additional context
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);
CREATE INDEX idx_audit_log_action ON audit_log(action);

-- Data export requests (for async processing)
CREATE TABLE export_requests (
  id VARCHAR2(36) PRIMARY KEY,
  user_id VARCHAR2(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR2(20) DEFAULT 'pending',   -- pending, processing, completed, failed
  file_path VARCHAR2(500),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Consent records (GDPR)
CREATE TABLE consent_records (
  id VARCHAR2(36) PRIMARY KEY,
  user_id VARCHAR2(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type VARCHAR2(50) NOT NULL,      -- e.g., 'data_processing', 'marketing'
  granted NUMBER(1) NOT NULL,
  ip_address VARCHAR2(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_consent_user ON consent_records(user_id);
`;

// TypeScript types for the schema
export interface User {
  id: string;
  email: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface Workout {
  id: string;
  userId: string;
  dateLocal: string;
  startTime: Date;
  endTime: Date;
  durationSeconds: number;
  distanceMeters: number;
  energyBurnedKcal: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  avgPaceSecondsPerKm: number | null;
  elevationGainMeters: number | null;
  weatherTemp: number | null;
  weatherCondition: string | null;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DailyStat {
  id: string;
  userId: string;
  dateLocal: string;
  yearNum: number;
  runCount: number;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  avgPaceSecondsPerKm: number | null;
  longestRunMeters: number | null;
  fastestPaceSecondsPerKm: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Goal {
  id: string;
  userId: string;
  yearNum: number;
  targetDays: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookToken {
  id: string;
  userId: string;
  token: string;
  name: string;
  isActive: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}
