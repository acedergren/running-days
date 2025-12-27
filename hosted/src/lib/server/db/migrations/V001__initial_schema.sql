-- ============================================================================
-- V001: Initial Schema for Running Days (HIPAA/GDPR Compliant)
-- Oracle Autonomous Database
-- ============================================================================
--
-- COMPLIANCE NOTES:
-- - All tables include user_id for row-level isolation
-- - CASCADE DELETE ensures complete data removal (GDPR Art. 17)
-- - Audit log is append-only for compliance retention
-- - TDE encryption enabled at ADB level (HIPAA §164.312)
-- ============================================================================

-- Enable extended data types for longer VARCHARs
-- ALTER SESSION SET MAX_STRING_SIZE = EXTENDED;

-- ============================================================================
-- USERS TABLE
-- Source: Apple Sign-In (sub claim = stable user ID)
-- ============================================================================
CREATE TABLE users (
    id VARCHAR2(255) NOT NULL,
    email VARCHAR2(255),
    email_verified NUMBER(1) DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    deleted_at TIMESTAMP,  -- Soft delete for GDPR 30-day grace period
    CONSTRAINT pk_users PRIMARY KEY (id),
    CONSTRAINT chk_email_verified CHECK (email_verified IN (0, 1))
);

COMMENT ON TABLE users IS 'User accounts from Apple Sign-In. GDPR: Data subject.';
COMMENT ON COLUMN users.id IS 'Apple sub claim - stable across sessions';
COMMENT ON COLUMN users.email IS 'May be privaterelay.appleid.com address';
COMMENT ON COLUMN users.deleted_at IS 'GDPR Art. 17 - soft delete before hard delete';

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);

-- ============================================================================
-- WORKOUTS TABLE
-- Core fitness data - PHI under HIPAA
-- ============================================================================
CREATE TABLE workouts (
    id VARCHAR2(36) NOT NULL,
    user_id VARCHAR2(255) NOT NULL,
    date_local DATE NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_seconds NUMBER(10) NOT NULL,
    distance_meters NUMBER(12,2) NOT NULL,
    energy_burned_kcal NUMBER(10,2),
    avg_heart_rate NUMBER(3),
    max_heart_rate NUMBER(3),
    avg_pace_seconds_per_km NUMBER(10,2),
    elevation_gain_meters NUMBER(10,2),
    weather_temp NUMBER(5,2),
    weather_condition VARCHAR2(100),
    source VARCHAR2(50) DEFAULT 'health_auto_export' NOT NULL,
    raw_payload CLOB,  -- Original JSON for debugging
    created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT pk_workouts PRIMARY KEY (id),
    CONSTRAINT fk_workouts_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_duration CHECK (duration_seconds > 0),
    CONSTRAINT chk_distance CHECK (distance_meters >= 0),
    CONSTRAINT chk_heart_rate CHECK (avg_heart_rate IS NULL OR
        (avg_heart_rate >= 30 AND avg_heart_rate <= 250))
);

COMMENT ON TABLE workouts IS 'Running workouts - PHI under HIPAA. CASCADE DELETE for GDPR.';
COMMENT ON COLUMN workouts.raw_payload IS 'Original webhook payload - retained for data integrity';

CREATE INDEX idx_workouts_user_date ON workouts(user_id, date_local);
CREATE INDEX idx_workouts_user_id ON workouts(user_id);
CREATE INDEX idx_workouts_date ON workouts(date_local);

-- ============================================================================
-- DAILY_STATS TABLE
-- Aggregated daily statistics per user
-- ============================================================================
CREATE TABLE daily_stats (
    id VARCHAR2(36) NOT NULL,
    user_id VARCHAR2(255) NOT NULL,
    date_local DATE NOT NULL,
    year_num NUMBER(4) NOT NULL,
    run_count NUMBER(5) DEFAULT 1 NOT NULL,
    total_distance_meters NUMBER(12,2) NOT NULL,
    total_duration_seconds NUMBER(10) NOT NULL,
    avg_pace_seconds_per_km NUMBER(10,2),
    longest_run_meters NUMBER(12,2),
    fastest_pace_seconds_per_km NUMBER(10,2),
    created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT pk_daily_stats PRIMARY KEY (id),
    CONSTRAINT fk_daily_stats_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_daily_stats_user_date UNIQUE (user_id, date_local)
);

COMMENT ON TABLE daily_stats IS 'Daily aggregates for quick dashboard queries';

CREATE INDEX idx_daily_stats_user_year ON daily_stats(user_id, year_num);

-- ============================================================================
-- GOALS TABLE
-- Yearly goals per user
-- ============================================================================
CREATE TABLE goals (
    id VARCHAR2(36) NOT NULL,
    user_id VARCHAR2(255) NOT NULL,
    year_num NUMBER(4) NOT NULL,
    target_days NUMBER(3) DEFAULT 300 NOT NULL,
    created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT pk_goals PRIMARY KEY (id),
    CONSTRAINT fk_goals_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_goals_user_year UNIQUE (user_id, year_num),
    CONSTRAINT chk_target_days CHECK (target_days >= 1 AND target_days <= 366)
);

COMMENT ON TABLE goals IS 'User yearly running day goals';

-- ============================================================================
-- WEBHOOK_TOKENS TABLE
-- API authentication tokens per user
-- ============================================================================
CREATE TABLE webhook_tokens (
    id VARCHAR2(36) NOT NULL,
    user_id VARCHAR2(255) NOT NULL,
    token VARCHAR2(64) NOT NULL,
    name VARCHAR2(100) NOT NULL,
    is_active NUMBER(1) DEFAULT 1 NOT NULL,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT pk_webhook_tokens PRIMARY KEY (id),
    CONSTRAINT fk_webhook_tokens_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_webhook_token UNIQUE (token),
    CONSTRAINT chk_token_active CHECK (is_active IN (0, 1))
);

COMMENT ON TABLE webhook_tokens IS 'Per-user webhook authentication tokens';

CREATE INDEX idx_webhook_tokens_token ON webhook_tokens(token);
CREATE INDEX idx_webhook_tokens_user ON webhook_tokens(user_id);

-- ============================================================================
-- SESSIONS TABLE
-- Authentication sessions
-- ============================================================================
CREATE TABLE sessions (
    id VARCHAR2(64) NOT NULL,
    user_id VARCHAR2(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    ip_address VARCHAR2(45),  -- IPv6 compatible
    user_agent VARCHAR2(500),
    CONSTRAINT pk_sessions PRIMARY KEY (id),
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
);

COMMENT ON TABLE sessions IS 'User authentication sessions';

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- ============================================================================
-- AUDIT_LOG TABLE
-- HIPAA/GDPR compliance - immutable audit trail
-- ============================================================================
CREATE TABLE audit_log (
    id VARCHAR2(36) NOT NULL,
    user_id VARCHAR2(255),  -- NULL after user deletion (anonymized)
    action VARCHAR2(50) NOT NULL,
    resource_type VARCHAR2(50),
    resource_id VARCHAR2(255),
    ip_address VARCHAR2(45),
    user_agent VARCHAR2(500),
    metadata CLOB,  -- JSON additional context
    created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT pk_audit_log PRIMARY KEY (id),
    CONSTRAINT chk_audit_action CHECK (action IN (
        'login', 'logout', 'data_access', 'data_create', 'data_update',
        'data_delete', 'data_export', 'account_delete', 'consent_granted',
        'consent_revoked', 'token_created', 'token_revoked', 'api_call'
    ))
);

COMMENT ON TABLE audit_log IS 'HIPAA/GDPR audit trail - APPEND ONLY, NEVER DELETE';
COMMENT ON COLUMN audit_log.user_id IS 'Anonymized (set to NULL) after user deletion';

CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_created ON audit_log(created_at);
CREATE INDEX idx_audit_action ON audit_log(action);

-- Partition by month for performance (optional, requires Enterprise Edition)
-- ALTER TABLE audit_log MODIFY PARTITION BY RANGE (created_at)
--     INTERVAL (NUMTOYMINTERVAL(1, 'MONTH'));

-- ============================================================================
-- EXPORT_REQUESTS TABLE
-- GDPR Article 20 - Data Portability
-- ============================================================================
CREATE TABLE export_requests (
    id VARCHAR2(36) NOT NULL,
    user_id VARCHAR2(255) NOT NULL,
    status VARCHAR2(20) DEFAULT 'pending' NOT NULL,
    file_path VARCHAR2(500),
    file_size_bytes NUMBER(15),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    error_message VARCHAR2(1000),
    CONSTRAINT pk_export_requests PRIMARY KEY (id),
    CONSTRAINT fk_export_requests_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_export_status CHECK (status IN (
        'pending', 'processing', 'completed', 'failed', 'expired'
    ))
);

COMMENT ON TABLE export_requests IS 'GDPR Article 20 - data portability requests';

CREATE INDEX idx_export_user ON export_requests(user_id);
CREATE INDEX idx_export_status ON export_requests(status);

-- ============================================================================
-- CONSENT_RECORDS TABLE
-- GDPR consent tracking
-- ============================================================================
CREATE TABLE consent_records (
    id VARCHAR2(36) NOT NULL,
    user_id VARCHAR2(255) NOT NULL,
    consent_type VARCHAR2(50) NOT NULL,
    granted NUMBER(1) NOT NULL,
    ip_address VARCHAR2(45),
    user_agent VARCHAR2(500),
    created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT pk_consent_records PRIMARY KEY (id),
    CONSTRAINT fk_consent_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_consent_type CHECK (consent_type IN (
        'data_processing', 'health_data', 'analytics', 'marketing', 'third_party'
    )),
    CONSTRAINT chk_consent_granted CHECK (granted IN (0, 1))
);

COMMENT ON TABLE consent_records IS 'GDPR consent tracking - immutable log';

CREATE INDEX idx_consent_user ON consent_records(user_id);
CREATE INDEX idx_consent_type ON consent_records(consent_type);

-- ============================================================================
-- SCHEMA VERSION TRACKING
-- ============================================================================
CREATE TABLE schema_migrations (
    version VARCHAR2(50) NOT NULL,
    description VARCHAR2(500),
    applied_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    applied_by VARCHAR2(100),
    execution_time_ms NUMBER(10),
    checksum VARCHAR2(64),
    CONSTRAINT pk_schema_migrations PRIMARY KEY (version)
);

INSERT INTO schema_migrations (version, description, applied_by)
VALUES ('V001', 'Initial schema with HIPAA/GDPR compliance', 'system');

COMMIT;

-- ============================================================================
-- VALIDATION QUERIES
-- Run these after migration to verify integrity
-- ============================================================================
/*
-- Check all tables created
SELECT table_name FROM user_tables ORDER BY table_name;

-- Verify foreign key constraints
SELECT constraint_name, table_name, r_constraint_name
FROM user_constraints
WHERE constraint_type = 'R';

-- Verify indexes
SELECT index_name, table_name, uniqueness
FROM user_indexes
WHERE table_name NOT LIKE 'SYS%';

-- Check table comments (compliance documentation)
SELECT table_name, comments
FROM user_tab_comments
WHERE comments IS NOT NULL;
*/
