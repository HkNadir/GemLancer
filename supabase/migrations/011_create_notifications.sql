-- ============================================================
-- Migration 011: Notifications table
--
-- Stores in-app notifications per user. Supabase Realtime is
-- enabled so the frontend can subscribe to INSERT events and
-- update the bell badge without polling.
-- ============================================================

CREATE TYPE notification_type AS ENUM (
  'invoice_paid',
  'task_overdue',
  'message_received',
  'milestone_approved',
  'project_completed',
  'team_invite',
  'subscription_renewing'
);

CREATE TABLE IF NOT EXISTS notifications (
  id           UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID               NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id      UUID               NOT NULL, -- recipient (references auth.users, no FK to avoid cascade issues)
  type         notification_type  NOT NULL,
  title        TEXT               NOT NULL,
  body         TEXT,
  action_url   TEXT,              -- deep-link e.g. /invoices/abc123
  read_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ        NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ        NOT NULL DEFAULT now()
);

-- Index for the primary query: unread notifications per user
CREATE INDEX idx_notifications_user_unread
  ON notifications (user_id, tenant_id, read_at, created_at DESC);

-- updated_at trigger
CREATE TRIGGER notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: users can only see their own notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select ON notifications
  FOR SELECT
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND user_id = auth.uid()
  );

CREATE POLICY notifications_update ON notifications
  FOR UPDATE
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND user_id = auth.uid()
  )
  WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND user_id = auth.uid()
  );

-- Service role can insert notifications for any user
-- (no INSERT policy needed — service role bypasses RLS)

-- Enable Realtime for live badge updates
-- Run in Supabase dashboard: Database → Replication → enable notifications table
-- Or via SQL:
ALTER TABLE notifications REPLICA IDENTITY FULL;

COMMENT ON TABLE notifications IS
  'In-app notifications. Supabase Realtime is enabled for live badge updates.';

COMMENT ON COLUMN notifications.action_url IS
  'Relative URL for the deep link when user clicks the notification.';
