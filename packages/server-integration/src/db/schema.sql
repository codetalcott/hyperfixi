-- LokaScript API Database Schema
-- PostgreSQL 14+
--
-- This schema supports the LokaScript compilation service with:
-- - API key authentication with tiered access (free/pro/team)
-- - Usage tracking and monthly aggregates for billing
-- - Rate limiting event logging
-- - Stripe webhook idempotency

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Migrations Tracking Table (run first)
-- ============================================
CREATE TABLE IF NOT EXISTS migrations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Users Table (must exist before api_keys)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  stripe_customer_id VARCHAR(255) UNIQUE,
  name VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_stripe_customer_id_idx ON users(stripe_customer_id);

-- ============================================
-- API Keys Table
-- ============================================
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key_hash VARCHAR(64) NOT NULL UNIQUE,
  key_prefix VARCHAR(12) NOT NULL,  -- for display: "hfx_abc1..."
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(255),
  tier VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'team')),
  monthly_limit INT NOT NULL DEFAULT 1000,
  current_usage INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,

  -- Indexes
  CONSTRAINT api_keys_key_hash_idx UNIQUE (key_hash)
);

CREATE INDEX api_keys_user_id_idx ON api_keys(user_id);
CREATE INDEX api_keys_stripe_customer_id_idx ON api_keys(stripe_customer_id);
CREATE INDEX api_keys_tier_idx ON api_keys(tier);

-- Usage logs (detailed per-request tracking)
CREATE TABLE usage_logs (
  id BIGSERIAL PRIMARY KEY,
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint VARCHAR(50) NOT NULL,
  method VARCHAR(10) NOT NULL,
  script_count INT NOT NULL DEFAULT 0,
  response_time_ms INT NOT NULL,
  error_count INT NOT NULL DEFAULT 0,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partition by month for efficient querying and cleanup
-- Note: Implement partitioning after initial deployment if needed

CREATE INDEX usage_logs_api_key_id_idx ON usage_logs(api_key_id);
CREATE INDEX usage_logs_created_at_idx ON usage_logs(created_at);
CREATE INDEX usage_logs_endpoint_idx ON usage_logs(endpoint);

-- Monthly aggregates (for dashboard and billing reconciliation)
CREATE TABLE usage_monthly (
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  total_compiles INT NOT NULL DEFAULT 0,
  total_scripts INT NOT NULL DEFAULT 0,
  total_errors INT NOT NULL DEFAULT 0,
  avg_response_ms INT,
  p99_response_ms INT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (api_key_id, month)
);

CREATE INDEX usage_monthly_month_idx ON usage_monthly(month);

-- Rate limit tracking (for persistent rate limiting across restarts)
CREATE TABLE rate_limit_events (
  id BIGSERIAL PRIMARY KEY,
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  tier VARCHAR(20) NOT NULL,
  request_count INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX rate_limit_events_api_key_id_idx ON rate_limit_events(api_key_id);
CREATE INDEX rate_limit_events_created_at_idx ON rate_limit_events(created_at);

-- ============================================
-- Stripe Webhook Events (for idempotency)
-- ============================================
CREATE TABLE stripe_events (
  id VARCHAR(255) PRIMARY KEY,  -- Stripe event ID
  type VARCHAR(100) NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB
);

CREATE INDEX stripe_events_type_idx ON stripe_events(type);
CREATE INDEX stripe_events_processed_at_idx ON stripe_events(processed_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for usage_monthly table
CREATE TRIGGER update_usage_monthly_updated_at
  BEFORE UPDATE ON usage_monthly
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Helper function to reset monthly usage counters
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
BEGIN
  UPDATE api_keys SET current_usage = 0;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Views
-- ============================================

-- View for API key summary with usage
CREATE OR REPLACE VIEW api_key_summary AS
SELECT
  ak.id,
  ak.key_prefix,
  ak.user_id,
  ak.tier,
  ak.monthly_limit,
  ak.current_usage,
  ak.created_at,
  ak.last_used_at,
  COALESCE(um.total_compiles, 0) as month_compiles,
  COALESCE(um.total_scripts, 0) as month_scripts,
  COALESCE(um.avg_response_ms, 0) as avg_response_ms
FROM api_keys ak
LEFT JOIN usage_monthly um ON ak.id = um.api_key_id
  AND um.month = DATE_TRUNC('month', CURRENT_DATE)::DATE
WHERE ak.deleted_at IS NULL;

-- ============================================
-- Record this migration
-- ============================================
INSERT INTO migrations (name) VALUES ('001_initial_schema')
ON CONFLICT (name) DO NOTHING;
