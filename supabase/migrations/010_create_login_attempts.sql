-- ============================================================
-- Migration 010: Login attempts table for auth rate limiting
--
-- Intentionally has NO tenant_id — these are pre-authentication
-- events where we don't yet know the tenant. Only accessed via
-- the service role key (admin client), never via RLS.
-- ============================================================

CREATE TABLE IF NOT EXISTS login_attempts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier   TEXT        NOT NULL,  -- email address being attempted
  ip_address   INET,                  -- client IP (nullable for non-IP-based checks)
  user_agent   TEXT,
  success      BOOLEAN     NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Composite index for the rate-limit query pattern:
-- WHERE identifier = $1 AND success = false AND created_at > $2
CREATE INDEX idx_login_attempts_identifier_created
  ON login_attempts (identifier, success, created_at DESC);

-- Secondary index for IP-based lookups
CREATE INDEX idx_login_attempts_ip_created
  ON login_attempts (ip_address, success, created_at DESC);

-- Disable RLS — this table is only writable via service role
ALTER TABLE login_attempts DISABLE ROW LEVEL SECURITY;

-- Auto-cleanup function: removes attempts older than 24 hours
-- Schedule this via pg_cron or Supabase Edge Function cron.
CREATE OR REPLACE FUNCTION cleanup_old_login_attempts()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM login_attempts
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$;

COMMENT ON TABLE login_attempts IS
  'Rate limiting store for failed authentication attempts. No PII beyond email hash recommended for production.';

COMMENT ON COLUMN login_attempts.identifier IS
  'The email address (or hashed email) being rate-limited.';
