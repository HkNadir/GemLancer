-- ============================================================
-- Migration 012: Project Extensions
-- Adds: task_subtasks, task_comments, task_activity,
--       project_templates, project_template_milestones,
--       project_template_tasks
-- All tables follow tenant_id RLS pattern.
-- ============================================================

-- ── task_subtasks ────────────────────────────────────────────
-- Checklist items nested inside a task.
CREATE TABLE task_subtasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  task_id       UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title         TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 500),
  is_completed  BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at  TIMESTAMPTZ,
  completed_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_task_subtasks_task_id ON task_subtasks(task_id);
CREATE INDEX idx_task_subtasks_tenant_id ON task_subtasks(tenant_id);

-- ── task_comments ────────────────────────────────────────────
-- Discussion thread on a task (supports soft delete).
CREATE TABLE task_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 10000),
  edited_at   TIMESTAMPTZ,
  is_deleted  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX idx_task_comments_tenant_id ON task_comments(tenant_id);

CREATE TRIGGER update_task_comments_updated_at
  BEFORE UPDATE ON task_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── task_activity ─────────────────────────────────────────────
-- Immutable audit trail of task changes (never updated/deleted).
CREATE TABLE task_activity (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  -- action examples: created | status_changed | priority_changed |
  --   assigned | unassigned | due_date_changed | title_changed |
  --   subtask_added | subtask_completed | comment_added | time_logged
  action      TEXT NOT NULL,
  from_value  TEXT,
  to_value    TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_task_activity_task_id ON task_activity(task_id);
CREATE INDEX idx_task_activity_tenant_id ON task_activity(tenant_id);

-- Prevent any update or delete on activity rows
CREATE OR REPLACE FUNCTION prevent_activity_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'task_activity rows are immutable';
END;
$$;

CREATE TRIGGER lock_task_activity
  BEFORE UPDATE OR DELETE ON task_activity
  FOR EACH ROW EXECUTE FUNCTION prevent_activity_mutation();

-- ── project_templates ─────────────────────────────────────────
-- Saved project blueprints. A template has milestones + tasks
-- that are copied when a new project is created from it.
CREATE TABLE project_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  description TEXT,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_project_templates_tenant_id ON project_templates(tenant_id);

CREATE TRIGGER update_project_templates_updated_at
  BEFORE UPDATE ON project_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── project_template_milestones ───────────────────────────────
CREATE TABLE project_template_milestones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id     UUID NOT NULL REFERENCES project_templates(id) ON DELETE CASCADE,
  name            TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  description     TEXT,
  payment_percent NUMERIC(5,2) CHECK (payment_percent IS NULL OR (payment_percent >= 0 AND payment_percent <= 100)),
  -- offset_days: how many days after project start_date this milestone is due
  offset_days     INT,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tmpl_milestones_template_id ON project_template_milestones(template_id);

-- ── project_template_tasks ────────────────────────────────────
CREATE TABLE project_template_tasks (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id          UUID NOT NULL REFERENCES project_templates(id) ON DELETE CASCADE,
  template_milestone_id UUID REFERENCES project_template_milestones(id) ON DELETE SET NULL,
  title                TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  description          TEXT,
  priority             task_priority NOT NULL DEFAULT 'medium',
  estimated_hours      NUMERIC(8,2),
  sort_order           INT NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tmpl_tasks_template_id ON project_template_tasks(template_id);

-- ── RLS policies ─────────────────────────────────────────────

ALTER TABLE task_subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_template_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_template_tasks ENABLE ROW LEVEL SECURITY;

-- Helper: internal users only (owner | admin | member)
-- auth.is_internal() is defined in migration 008

CREATE POLICY task_subtasks_tenant_isolation ON task_subtasks
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY task_comments_tenant_isolation ON task_comments
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Activity is readable by all tenant members, never writable via RLS
-- (writes happen via service role in server actions only)
CREATE POLICY task_activity_read_only ON task_activity
  FOR SELECT
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY project_templates_tenant_isolation ON project_templates
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY tmpl_milestones_tenant_isolation ON project_template_milestones
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY tmpl_tasks_tenant_isolation ON project_template_tasks
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- ── Helper function: create project from template ─────────────
-- Copies all template milestones + tasks into a real project.
-- Milestone due dates = project start_date + milestone.offset_days.
CREATE OR REPLACE FUNCTION create_project_from_template(
  p_template_id  UUID,
  p_project_id   UUID,
  p_tenant_id    UUID,
  p_start_date   DATE DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tmpl_milestone  project_template_milestones%ROWTYPE;
  v_new_milestone_id UUID;
  v_due_date         DATE;
BEGIN
  -- Verify template belongs to tenant
  IF NOT EXISTS (
    SELECT 1 FROM project_templates
    WHERE id = p_template_id AND tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'Template not found or access denied';
  END IF;

  -- Copy milestones
  FOR v_tmpl_milestone IN
    SELECT * FROM project_template_milestones
    WHERE template_id = p_template_id
    ORDER BY sort_order
  LOOP
    v_due_date := CASE
      WHEN p_start_date IS NOT NULL AND v_tmpl_milestone.offset_days IS NOT NULL
        THEN p_start_date + v_tmpl_milestone.offset_days
      ELSE NULL
    END;

    INSERT INTO milestones (tenant_id, project_id, name, description, payment_percent, due_date, sort_order)
    VALUES (
      p_tenant_id,
      p_project_id,
      v_tmpl_milestone.name,
      v_tmpl_milestone.description,
      v_tmpl_milestone.payment_percent,
      v_due_date,
      v_tmpl_milestone.sort_order
    )
    RETURNING id INTO v_new_milestone_id;

    -- Copy tasks for this milestone
    INSERT INTO tasks (tenant_id, project_id, milestone_id, title, description, priority, estimated_hours, sort_order)
    SELECT
      p_tenant_id,
      p_project_id,
      v_new_milestone_id,
      title,
      description,
      priority,
      estimated_hours,
      sort_order
    FROM project_template_tasks
    WHERE template_id = p_template_id
      AND template_milestone_id = v_tmpl_milestone.id
    ORDER BY sort_order;
  END LOOP;

  -- Copy unassigned tasks (no milestone)
  INSERT INTO tasks (tenant_id, project_id, milestone_id, title, description, priority, estimated_hours, sort_order)
  SELECT
    p_tenant_id,
    p_project_id,
    NULL,
    title,
    description,
    priority,
    estimated_hours,
    sort_order
  FROM project_template_tasks
  WHERE template_id = p_template_id
    AND template_milestone_id IS NULL
  ORDER BY sort_order;
END;
$$;
