-- ============================================================
-- Migration 013: Update JWT claims + Onboarding flag
-- 1. Adds onboarding_completed to tenants table
-- 2. Updates inject_tenant_claims hook to expose
--    totp_enabled + onboarding_completed in app_metadata
--    (allows middleware to gate routes without a DB query)
-- ============================================================

-- ── 1. Add onboarding_completed to tenants ────────────────────
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;

-- Existing tenants (created before this migration) are considered
-- already onboarded — don't force them through the wizard.
UPDATE tenants SET onboarding_completed = TRUE WHERE created_at < NOW();

-- ── 2. Replace inject_tenant_claims JWT hook ──────────────────
-- This function is called by Supabase Auth on every token issue/refresh.
-- It enriches app_metadata with tenant-scoped claims that middleware
-- and server-side code can read without an extra DB round-trip.
CREATE OR REPLACE FUNCTION inject_tenant_claims(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id         UUID;
  v_tenant_id       UUID;
  v_totp_enabled    BOOLEAN;
  v_onboarding_done BOOLEAN;
  v_role            TEXT;
BEGIN
  -- Extract user_id from the hook event payload
  v_user_id := (event ->> 'user_id')::UUID;

  -- Look up the user's tenant context
  SELECT
    u.tenant_id,
    u.totp_enabled,
    u.role,
    t.onboarding_completed
  INTO
    v_tenant_id,
    v_totp_enabled,
    v_role,
    v_onboarding_done
  FROM users u
  JOIN tenants t ON t.id = u.tenant_id
  WHERE u.id = v_user_id;

  -- If no user row found yet (e.g. first OAuth login), return event unchanged
  IF v_tenant_id IS NULL THEN
    RETURN event;
  END IF;

  -- Inject claims into app_metadata
  RETURN jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          event,
          '{claims,app_metadata,tenant_id}',
          to_jsonb(v_tenant_id::TEXT)
        ),
        '{claims,app_metadata,totp_enabled}',
        to_jsonb(COALESCE(v_totp_enabled, FALSE))
      ),
      '{claims,app_metadata,onboarding_completed}',
      to_jsonb(COALESCE(v_onboarding_done, FALSE))
    ),
    '{claims,app_metadata,role}',
    to_jsonb(COALESCE(v_role, 'member'))
  );
END;
$$;
