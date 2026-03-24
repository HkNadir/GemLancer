/**
 * GemLancer — Full TypeScript type system
 * Auto-generated from database schema. Includes Row, Insert, and Update variants.
 * Generated: manually crafted to match /supabase/migrations exactly.
 */

// ── Enums ────────────────────────────────────────────────────

export type SubscriptionPlan = 'starter' | 'pro' | 'agency'

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'

export type UserRole = 'owner' | 'admin' | 'member' | 'client'

export type ClientTag = 'vip' | 'active' | 'new' | 'prospect' | 'inactive'

export type ProjectStatus = 'draft' | 'active' | 'on_hold' | 'completed' | 'cancelled'

export type MilestoneStatus = 'pending' | 'submitted' | 'approved' | 'rejected'

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done'

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled'

export type RecurringInterval = 'none' | 'weekly' | 'monthly' | 'quarterly' | 'annually'

export type SenderType = 'freelancer' | 'client'

export type TaskActivityAction =
  | 'created'
  | 'status_changed'
  | 'priority_changed'
  | 'assigned'
  | 'unassigned'
  | 'due_date_changed'
  | 'title_changed'
  | 'description_changed'
  | 'subtask_added'
  | 'subtask_completed'
  | 'comment_added'
  | 'time_logged'
  | 'milestone_changed'

// ── Table Row Types ──────────────────────────────────────────

export interface Tenant {
  id: string
  name: string
  slug: string
  plan: SubscriptionPlan
  logo_url: string | null
  primary_color: string
  custom_domain: string | null
  stripe_customer_id: string | null
  max_clients: number
  max_projects: number
  max_users: number
  storage_limit_gb: number
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: string
  tenant_id: string
  stripe_sub_id: string | null
  stripe_price_id: string | null
  plan: SubscriptionPlan
  status: SubscriptionStatus
  trial_end: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  canceled_at: string | null
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  tenant_id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url: string | null
  totp_enabled: boolean
  totp_secret: string | null
  portal_token: string | null
  portal_token_expires_at: string | null
  last_login_at: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Invite {
  id: string
  tenant_id: string
  email: string
  role: UserRole
  token: string
  invited_by: string | null
  accepted_at: string | null
  expires_at: string
  created_at: string
}

export interface Client {
  id: string
  tenant_id: string
  user_id: string | null
  name: string
  email: string
  company: string | null
  phone: string | null
  address: string | null
  city: string | null
  country: string
  currency: string
  tag: ClientTag
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  tenant_id: string
  client_id: string
  name: string
  description: string | null
  status: ProjectStatus
  budget: number | null
  currency: string
  start_date: string | null
  end_date: string | null
  progress: number
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface Milestone {
  id: string
  tenant_id: string
  project_id: string
  name: string
  description: string | null
  due_date: string | null
  payment_percent: number | null
  status: MilestoneStatus
  approved_at: string | null
  approved_by: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  tenant_id: string
  project_id: string
  milestone_id: string | null
  assignee_id: string | null
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  estimated_hours: number | null
  sort_order: number
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface TaskSubtask {
  id: string
  tenant_id: string
  task_id: string
  title: string
  is_completed: boolean
  completed_at: string | null
  completed_by: string | null
  sort_order: number
  created_at: string
}

export interface TaskComment {
  id: string
  tenant_id: string
  task_id: string
  user_id: string
  content: string
  edited_at: string | null
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface TaskActivity {
  id: string
  tenant_id: string
  task_id: string
  user_id: string | null
  action: TaskActivityAction
  from_value: string | null
  to_value: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface TimeLog {
  id: string
  tenant_id: string
  task_id: string
  user_id: string
  started_at: string
  ended_at: string
  duration_minutes: number // GENERATED ALWAYS
  description: string | null
  billable: boolean
  is_locked: boolean
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: string
  tenant_id: string
  client_id: string
  project_id: string | null
  milestone_id: string | null
  number: string
  status: InvoiceStatus
  currency: string
  subtotal: number
  tax_rate: number
  tax_amount: number   // GENERATED ALWAYS
  discount_amount: number
  total: number        // GENERATED ALWAYS
  issue_date: string
  due_date: string
  paid_at: string | null
  sent_at: string | null
  viewed_at: string | null
  stripe_payment_intent_id: string | null
  stripe_payment_link: string | null
  recurring_interval: RecurringInterval
  recurring_next_date: string | null
  recurring_parent_id: string | null
  notes: string | null
  internal_notes: string | null
  cancelled_at: string | null
  cancelled_reason: string | null
  created_at: string
  updated_at: string
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  tenant_id: string
  description: string
  quantity: number
  unit_price: number
  amount: number // GENERATED ALWAYS
  sort_order: number
  created_at: string
}

export interface File {
  id: string
  tenant_id: string
  project_id: string | null
  uploader_id: string
  name: string
  bucket_path: string
  size_bytes: number
  mime_type: string
  is_client_visible: boolean
  deleted_at: string | null
  deleted_by: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  tenant_id: string
  project_id: string
  sender_id: string
  sender_type: SenderType
  content: string
  file_ids: string[]
  read_at: string | null
  edited_at: string | null
  is_deleted: boolean
  created_at: string
}

export interface ProjectTemplate {
  id: string
  tenant_id: string
  name: string
  description: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ProjectTemplateMilestone {
  id: string
  tenant_id: string
  template_id: string
  name: string
  description: string | null
  payment_percent: number | null
  offset_days: number | null
  sort_order: number
  created_at: string
}

export interface ProjectTemplateTask {
  id: string
  tenant_id: string
  template_id: string
  template_milestone_id: string | null
  title: string
  description: string | null
  priority: TaskPriority
  estimated_hours: number | null
  sort_order: number
  created_at: string
}

export type NotificationType =
  | 'invoice_paid'
  | 'task_overdue'
  | 'message_received'
  | 'milestone_approved'
  | 'project_completed'
  | 'team_invite'
  | 'subscription_renewing'

export interface Notification {
  id: string
  tenant_id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  action_url: string | null
  read_at: string | null
  created_at: string
  updated_at: string
}

export type NotificationInsert = Pick<
  Notification,
  'tenant_id' | 'user_id' | 'type' | 'title'
> &
  Partial<Pick<Notification, 'body' | 'action_url'>>

export interface AuditLog {
  id: string
  tenant_id: string
  user_id: string | null
  action: string
  resource: string
  resource_id: string | null
  metadata: Record<string, unknown>
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

// ── Insert Types (omit generated/defaulted fields) ──────────

export type TenantInsert = Pick<Tenant, 'name' | 'slug'> &
  Partial<Pick<Tenant, 'plan' | 'logo_url' | 'primary_color' | 'custom_domain' | 'stripe_customer_id'>>

export type UserInsert = Pick<User, 'id' | 'tenant_id' | 'email' | 'full_name'> &
  Partial<Pick<User, 'role' | 'avatar_url' | 'totp_enabled'>>

export type ClientInsert = Pick<Client, 'tenant_id' | 'name' | 'email'> &
  Partial<Pick<Client, 'user_id' | 'company' | 'phone' | 'address' | 'city' | 'country' | 'currency' | 'tag' | 'notes'>>

export type ProjectInsert = Pick<Project, 'tenant_id' | 'client_id' | 'name'> &
  Partial<Pick<Project, 'description' | 'status' | 'budget' | 'currency' | 'start_date' | 'end_date' | 'progress'>>

export type MilestoneInsert = Pick<Milestone, 'tenant_id' | 'project_id' | 'name'> &
  Partial<Pick<Milestone, 'description' | 'due_date' | 'payment_percent' | 'sort_order'>>

export type TaskInsert = Pick<Task, 'tenant_id' | 'project_id' | 'title'> &
  Partial<Pick<Task, 'milestone_id' | 'assignee_id' | 'description' | 'status' | 'priority' | 'due_date' | 'estimated_hours' | 'sort_order'>>

export type TaskSubtaskInsert = Pick<TaskSubtask, 'tenant_id' | 'task_id' | 'title'> &
  Partial<Pick<TaskSubtask, 'sort_order'>>

export type TaskCommentInsert = Pick<TaskComment, 'tenant_id' | 'task_id' | 'user_id' | 'content'>

export type TimeLogInsert = Pick<TimeLog, 'tenant_id' | 'task_id' | 'user_id' | 'started_at' | 'ended_at'> &
  Partial<Pick<TimeLog, 'description' | 'billable'>>

export type InvoiceInsert = Pick<Invoice, 'tenant_id' | 'client_id' | 'number' | 'due_date'> &
  Partial<Pick<Invoice, 'project_id' | 'milestone_id' | 'status' | 'currency' | 'tax_rate' | 'discount_amount' | 'issue_date' | 'recurring_interval' | 'notes' | 'internal_notes'>>

export type InvoiceItemInsert = Pick<InvoiceItem, 'invoice_id' | 'tenant_id' | 'description' | 'quantity' | 'unit_price'> &
  Partial<Pick<InvoiceItem, 'sort_order'>>

export type FileInsert = Pick<File, 'tenant_id' | 'uploader_id' | 'name' | 'bucket_path' | 'size_bytes' | 'mime_type'> &
  Partial<Pick<File, 'project_id' | 'is_client_visible'>>

export type MessageInsert = Pick<Message, 'tenant_id' | 'project_id' | 'sender_id' | 'sender_type' | 'content'> &
  Partial<Pick<Message, 'file_ids'>>

export type ProjectTemplateInsert = Pick<ProjectTemplate, 'tenant_id' | 'name'> &
  Partial<Pick<ProjectTemplate, 'description' | 'created_by'>>

export type ProjectTemplateMilestoneInsert = Pick<ProjectTemplateMilestone, 'tenant_id' | 'template_id' | 'name'> &
  Partial<Pick<ProjectTemplateMilestone, 'description' | 'payment_percent' | 'offset_days' | 'sort_order'>>

export type ProjectTemplateTaskInsert = Pick<ProjectTemplateTask, 'tenant_id' | 'template_id' | 'title'> &
  Partial<Pick<ProjectTemplateTask, 'template_milestone_id' | 'description' | 'priority' | 'estimated_hours' | 'sort_order'>>

// ── Update Types (all fields optional except id) ─────────────

export type TenantUpdate = Partial<Pick<Tenant, 'name' | 'slug' | 'plan' | 'logo_url' | 'primary_color' | 'custom_domain' | 'stripe_customer_id'>>

export type UserUpdate = Partial<Pick<User, 'full_name' | 'avatar_url' | 'role' | 'totp_enabled' | 'last_login_at' | 'is_active'>>

export type ClientUpdate = Partial<Pick<Client, 'name' | 'email' | 'company' | 'phone' | 'address' | 'city' | 'country' | 'currency' | 'tag' | 'notes' | 'is_active' | 'user_id'>>

export type ProjectUpdate = Partial<Pick<Project, 'name' | 'description' | 'status' | 'budget' | 'currency' | 'start_date' | 'end_date' | 'progress' | 'is_archived'>>

export type MilestoneUpdate = Partial<Pick<Milestone, 'name' | 'description' | 'due_date' | 'payment_percent' | 'status' | 'approved_at' | 'approved_by' | 'sort_order'>>

export type TaskUpdate = Partial<Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'due_date' | 'estimated_hours' | 'sort_order' | 'completed_at' | 'assignee_id' | 'milestone_id'>>

export type TaskSubtaskUpdate = Partial<Pick<TaskSubtask, 'title' | 'is_completed' | 'completed_at' | 'completed_by' | 'sort_order'>>

export type TaskCommentUpdate = Partial<Pick<TaskComment, 'content' | 'edited_at' | 'is_deleted'>>

export type TimeLogUpdate = Partial<Pick<TimeLog, 'description' | 'billable' | 'started_at' | 'ended_at'>>

export type InvoiceUpdate = Partial<Pick<Invoice, 'status' | 'currency' | 'tax_rate' | 'discount_amount' | 'due_date' | 'paid_at' | 'sent_at' | 'viewed_at' | 'stripe_payment_intent_id' | 'stripe_payment_link' | 'recurring_interval' | 'recurring_next_date' | 'notes' | 'internal_notes' | 'cancelled_at' | 'cancelled_reason'>>

export type InvoiceItemUpdate = Partial<Pick<InvoiceItem, 'description' | 'quantity' | 'unit_price' | 'sort_order'>>

export type FileUpdate = Partial<Pick<File, 'name' | 'is_client_visible' | 'deleted_at' | 'deleted_by'>>

export type MessageUpdate = Partial<Pick<Message, 'content' | 'read_at' | 'edited_at' | 'is_deleted'>>

export type ProjectTemplateUpdate = Partial<Pick<ProjectTemplate, 'name' | 'description'>>

// ── Supabase Database type (for typed client) ─────────────────

export type Database = {
  public: {
    Tables: {
      tenants:                      { Row: Tenant; Insert: TenantInsert; Update: TenantUpdate }
      subscriptions:                { Row: Subscription; Insert: Partial<Subscription>; Update: Partial<Subscription> }
      users:                        { Row: User; Insert: UserInsert; Update: UserUpdate }
      invites:                      { Row: Invite; Insert: Partial<Invite>; Update: Partial<Invite> }
      clients:                      { Row: Client; Insert: ClientInsert; Update: ClientUpdate }
      projects:                     { Row: Project; Insert: ProjectInsert; Update: ProjectUpdate }
      milestones:                   { Row: Milestone; Insert: MilestoneInsert; Update: MilestoneUpdate }
      tasks:                        { Row: Task; Insert: TaskInsert; Update: TaskUpdate }
      task_subtasks:                { Row: TaskSubtask; Insert: TaskSubtaskInsert; Update: TaskSubtaskUpdate }
      task_comments:                { Row: TaskComment; Insert: TaskCommentInsert; Update: TaskCommentUpdate }
      task_activity:                { Row: TaskActivity; Insert: never; Update: never }
      time_logs:                    { Row: TimeLog; Insert: TimeLogInsert; Update: TimeLogUpdate }
      invoices:                     { Row: Invoice; Insert: InvoiceInsert; Update: InvoiceUpdate }
      invoice_items:                { Row: InvoiceItem; Insert: InvoiceItemInsert; Update: InvoiceItemUpdate }
      files:                        { Row: File; Insert: FileInsert; Update: FileUpdate }
      messages:                     { Row: Message; Insert: MessageInsert; Update: MessageUpdate }
      audit_logs:                   { Row: AuditLog; Insert: Partial<AuditLog>; Update: never }
      notifications:                { Row: Notification; Insert: NotificationInsert; Update: Partial<Notification> }
      project_templates:            { Row: ProjectTemplate; Insert: ProjectTemplateInsert; Update: ProjectTemplateUpdate }
      project_template_milestones:  { Row: ProjectTemplateMilestone; Insert: ProjectTemplateMilestoneInsert; Update: never }
      project_template_tasks:       { Row: ProjectTemplateTask; Insert: ProjectTemplateTaskInsert; Update: never }
    }
    Functions: {
      create_tenant_with_owner: {
        Args: {
          p_tenant_name: string
          p_tenant_slug: string
          p_user_id: string
          p_user_email: string
          p_user_name: string
        }
        Returns: { tenant_id: string; user_id: string; success: boolean }
      }
      check_plan_limit: {
        Args: { p_tenant_id: string; p_resource: 'clients' | 'projects' | 'users' | 'storage_gb' }
        Returns: boolean
      }
      get_project_summary: {
        Args: { p_tenant_id: string }
        Returns: {
          total_projects: number
          active_projects: number
          completed_projects: number
          total_budget: number
          overdue_tasks: number
        }[]
      }
      get_revenue_summary: {
        Args: { p_tenant_id: string; p_from_date?: string; p_to_date?: string }
        Returns: {
          total_invoiced: number
          total_paid: number
          total_overdue: number
          total_draft: number
          invoice_count: number
        }[]
      }
      generate_invoice_number: {
        Args: { p_tenant_id: string }
        Returns: string
      }
      create_project_from_template: {
        Args: {
          p_template_id: string
          p_project_id: string
          p_tenant_id: string
          p_start_date?: string
        }
        Returns: void
      }
    }
    Enums: {
      subscription_plan: SubscriptionPlan
      subscription_status: SubscriptionStatus
      user_role: UserRole
      client_tag: ClientTag
      project_status: ProjectStatus
      milestone_status: MilestoneStatus
      task_status: TaskStatus
      task_priority: TaskPriority
      invoice_status: InvoiceStatus
      recurring_interval: RecurringInterval
      sender_type: SenderType
    }
  }
}

// ── Joined / Enriched types (common query shapes) ─────────────

export interface ProjectWithClient extends Project {
  client: Pick<Client, 'id' | 'name' | 'email' | 'company'>
}

/** Shape returned by getProjects() list query */
export interface ProjectListItem extends Project {
  client: Pick<Client, 'id' | 'name' | 'company'>
  stats: {
    total_tasks: number
    completed_tasks: number
    total_milestones: number
    approved_milestones: number
    total_logged_minutes: number
  }
  is_overdue: boolean
  health: 'on_track' | 'at_risk' | 'overdue'
}

/** Full project detail with nested data */
export interface ProjectDetail extends Project {
  client: Pick<Client, 'id' | 'name' | 'email' | 'company' | 'currency'>
  milestones: MilestoneWithTasks[]
  team_members: Pick<User, 'id' | 'full_name' | 'avatar_url' | 'role'>[]
}

export interface MilestoneWithTasks extends Milestone {
  tasks: TaskWithAssignee[]
}

export interface TaskWithAssignee extends Task {
  assignee: Pick<User, 'id' | 'full_name' | 'avatar_url'> | null
  subtask_count: number
  completed_subtask_count: number
}

export interface TaskDetail extends Task {
  assignee: Pick<User, 'id' | 'full_name' | 'avatar_url'> | null
  milestone: Pick<Milestone, 'id' | 'name'> | null
  subtasks: TaskSubtask[]
  comments: TaskCommentWithUser[]
  activity: TaskActivityWithUser[]
  time_logs: TimeLogWithUser[]
}

export interface TaskCommentWithUser extends TaskComment {
  user: Pick<User, 'id' | 'full_name' | 'avatar_url'>
}

export interface TaskActivityWithUser extends TaskActivity {
  user: Pick<User, 'id' | 'full_name' | 'avatar_url'> | null
}

export interface TimeLogWithUser extends TimeLog {
  user: Pick<User, 'id' | 'full_name' | 'avatar_url'>
}

export interface ProjectTemplateWithDetails extends ProjectTemplate {
  milestones: (ProjectTemplateMilestone & {
    tasks: ProjectTemplateTask[]
  })[]
  task_count: number
}

export interface KanbanBoard {
  backlog: TaskWithAssignee[]
  todo: TaskWithAssignee[]
  in_progress: TaskWithAssignee[]
  in_review: TaskWithAssignee[]
  done: TaskWithAssignee[]
}

export interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[]
  client: Pick<Client, 'id' | 'name' | 'email' | 'company'>
}

export interface MessageWithSender extends Message {
  sender: Pick<User, 'id' | 'full_name' | 'avatar_url' | 'role'>
}

// ── Utility types ─────────────────────────────────────────────

/** Extract the Row type for a given table */
export type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

/** Extract the Insert type for a given table */
export type TableInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

/** Extract the Update type for a given table */
export type TableUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
