-- ============================================================================
-- V001 ROLLBACK: Remove initial schema
-- WARNING: This will DELETE ALL DATA
-- ============================================================================

-- Drop tables in reverse dependency order
DROP TABLE consent_records CASCADE CONSTRAINTS;
DROP TABLE export_requests CASCADE CONSTRAINTS;
DROP TABLE audit_log CASCADE CONSTRAINTS;
DROP TABLE sessions CASCADE CONSTRAINTS;
DROP TABLE webhook_tokens CASCADE CONSTRAINTS;
DROP TABLE goals CASCADE CONSTRAINTS;
DROP TABLE daily_stats CASCADE CONSTRAINTS;
DROP TABLE workouts CASCADE CONSTRAINTS;
DROP TABLE users CASCADE CONSTRAINTS;

-- Remove migration record
DELETE FROM schema_migrations WHERE version = 'V001';
DROP TABLE schema_migrations;

COMMIT;
