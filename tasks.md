# GemLancer v1.0 — Master Task List

> Last updated: 2026-03-23
> Legend: ✅ Done | 🔄 In Progress | ⬜ Pending

---

## TASK 01 — Project Scaffolding & Database Foundation ✅

- [x] `package.json` — all dependencies (Next.js 14, Supabase, Stripe, Resend, Zustand, Recharts, shadcn, etc.)
- [x] `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `.eslintrc.json`, `.prettierrc`, `.gitignore`
- [x] `app/globals.css` — CSS variables, dark mode
- [x] `app/layout.tsx` — ThemeProvider + QueryProvider + Toaster
- [x] `app/page.tsx` — root redirect
- [x] `components/app/theme-provider.tsx`, `query-provider.tsx`
- [x] `components/ui/button.tsx`, `toast.tsx`, `toaster.tsx`
- [x] `hooks/use-toast.ts`, `lib/utils.ts`, `lib/config.ts`
- [x] `lib/supabase/client.ts`, `server.ts`, `middleware.ts`
- [x] `middleware.ts` — auth route protection
- [x] `types/database.ts` — all 14 core tables + extended types
- [x] `components.json`, `.env.local.example`
- [x] `supabase/migrations/001` — tenants + subscriptions
- [x] `supabase/migrations/002` — users + invites
- [x] `supabase/migrations/003` — clients
- [x] `supabase/migrations/004` — projects + milestones
- [x] `supabase/migrations/005` — tasks + time_logs
- [x] `supabase/migrations/006` — invoices + invoice_items
- [x] `supabase/migrations/007` — files + messages
- [x] `supabase/migrations/008` — RLS policies
- [x] `supabase/migrations/009` — functions (inject_tenant_claims, check_plan_limit, etc.)

---

## TASK 02 — Authentication System ✅

### Part 1 ✅
- [x] `supabase/migrations/010` — login_attempts table (rate limiting)
- [x] `lib/auth/rate-limit.ts` — DB-backed, 5 failures / 15 min
- [x] `lib/auth/audit.ts` — writeAuditLog, isNewDevice
- [x] `lib/auth/actions.ts` — 7 server actions (signIn, signUp, signOut, forgotPassword, resetPassword, googleSignIn, resendVerification)
- [x] `app/(auth)/login/page.tsx` — rate-limit countdown, Google OAuth
- [x] `app/(auth)/signup/page.tsx` — password strength meter
- [x] `app/(auth)/forgot-password/page.tsx`
- [x] `app/(auth)/verify/page.tsx` — 60s resend cooldown
- [x] `app/(auth)/reset-password/page.tsx`
- [x] `app/api/auth/callback/route.ts` — PKCE + Google OAuth first-login
- [x] `hooks/use-inactivity-logout.ts`

### Part 2 ✅ — TOTP 2FA
- [x] `lib/auth/totp.ts` — generateTOTPSecret, verifyTOTPCode, generateQRCodeDataUrl
- [x] `app/(auth)/2fa/page.tsx` — OTP digit inputs, auto-advance, auto-submit, paste support
- [x] `app/(dashboard)/settings/security/page.tsx` — QR code enroll dialog, disable dialog, password change
- [x] `app/api/auth/totp/generate/route.ts` — creates secret, stores in httpOnly cookie 30min TTL
- [x] `app/api/auth/totp/enable/route.ts` — verifies code, saves to DB, refreshes JWT
- [x] `app/api/auth/totp/verify/route.ts` — verifies code, sets gl_2fa_verified cookie
- [x] `app/api/auth/totp/disable/route.ts` — requires valid code, clears secret
- [x] `middleware.ts` (root) — CREATED (was missing!), 2FA gate + onboarding gate
- [x] `supabase/migrations/013` — adds onboarding_completed to tenants, updates inject_tenant_claims (totp_enabled + onboarding_completed in JWT)
- [x] `components/ui/dialog.tsx` — Radix Dialog primitive

### Part 3 ✅ — Onboarding Wizard
- [x] `app/(dashboard)/onboarding/page.tsx` — 4-step wizard with progress bar
  - [x] Step 1: Workspace name + slug (with auto-slugify)
  - [x] Step 2: Brand color picker (12 presets)
  - [x] Step 3: Invite team member (optional, skippable)
  - [x] Step 4: Get started checklist
- [x] `lib/auth/onboarding-actions.ts` — saveWorkspaceStep, saveBrandingStep, inviteTeamMember, completeOnboarding

---

## TASK 03 — Dashboard Shell & Navigation ✅

- [x] `supabase/migrations/011` — notifications table (Realtime enabled)
- [x] `hooks/use-sidebar.ts` — localStorage collapse state
- [x] `hooks/use-notifications.ts` — initial fetch + Realtime INSERT subscription
- [x] `components/app/inactivity-provider.tsx`
- [x] `components/app/notifications-bell.tsx`
- [x] `components/app/sidebar.tsx` — 240px ↔ 60px collapsible
- [x] `components/app/header.tsx` — breadcrumbs, search placeholder, user menu
- [x] `components/app/mobile-nav.tsx`
- [x] `components/app/dashboard-shell.tsx`
- [x] `app/(dashboard)/layout.tsx` — parallel server fetches, tenant guard
- [x] `lib/dashboard/queries.ts` — 6 query functions
- [x] `app/(dashboard)/dashboard/page.tsx`
- [x] `components/app/dashboard/revenue-chart.tsx`
- [x] `components/app/dashboard/active-projects-widget.tsx`
- [x] `components/app/dashboard/tasks-preview.tsx`
- [x] `components/app/dashboard/hours-widget.tsx`
- [x] `components/app/dashboard/cash-flow-widget.tsx`
- [x] `components/app/dashboard/smart-alerts-widget.tsx`
- [x] `components/app/dashboard/quick-actions.tsx`

---

## TASK 04 — Route Stubs (404 Fix) ✅

- [x] `app/(dashboard)/clients/page.tsx`
- [x] `app/(dashboard)/clients/new/page.tsx`
- [x] `app/(dashboard)/projects/page.tsx`
- [x] `app/(dashboard)/tasks/page.tsx`
- [x] `app/(dashboard)/time/page.tsx`
- [x] `app/(dashboard)/invoices/page.tsx`
- [x] `app/(dashboard)/invoices/new/page.tsx`
- [x] `app/(dashboard)/files/page.tsx`
- [x] `app/(dashboard)/messages/page.tsx`
- [x] `app/(dashboard)/reports/page.tsx`
- [x] `app/(dashboard)/settings/page.tsx`
- [x] `app/(dashboard)/settings/profile/page.tsx`
- [x] `app/(dashboard)/settings/notifications/page.tsx`
- [x] `app/(dashboard)/settings/security/page.tsx`
- [x] `app/(dashboard)/settings/billing/page.tsx`
- [x] `app/(dashboard)/settings/workspace/page.tsx`
- [x] `app/(dashboard)/settings/team/page.tsx`

---

## TASK 05 — Projects & Task Management ✅

### Part 1 ✅ — Foundation
- [x] `supabase/migrations/012` — task_subtasks, task_comments, task_activity, project_templates, create_project_from_template()
- [x] `types/database.ts` — updated with all new types
- [x] `lib/projects/queries.ts` — getProjects, getProjectById, getKanbanBoard, getTaskById, getMilestones, getTimeLogs, getTemplates
- [x] `lib/projects/actions.ts` — full CRUD: projects, milestones (approve/reject), tasks (move/reorder), subtasks, comments, time logs, templates
- [x] `stores/timer-store.ts` — Zustand + localStorage persist, 2h auto-pause
- [x] `supabase/functions/flag-overdue-tasks/index.ts` — daily cron Edge Function

### Part 2 ✅ — Project List + New Project + Detail Shell
- [x] `app/(dashboard)/projects/page.tsx` — grid/list toggle, filter tabs, health badges
- [x] `app/(dashboard)/projects/new/page.tsx` — multi-step create form
- [x] `app/(dashboard)/projects/[id]/page.tsx` — detail page with tabs
- [x] `app/(dashboard)/projects/[id]/layout.tsx`
- [x] `components/app/projects/project-card.tsx` — SVG progress ring, health dot
- [x] `components/app/projects/project-form.tsx` — create/edit form
- [x] `components/app/projects/overview-tab.tsx` — stats, progress, team list

### Part 3 ✅ — Milestones + Kanban Board + Task Slide-over
- [x] `components/app/projects/milestones-tab.tsx` — collapsible milestones, approve/reject
- [x] `components/app/projects/milestone-form.tsx` — create milestone dialog
- [x] `components/app/projects/kanban-board.tsx` — @dnd-kit drag-and-drop
- [x] `components/app/projects/kanban-column.tsx`
- [x] `components/app/projects/task-card.tsx` — priority badge, assignee avatar, due date
- [x] `components/app/projects/task-slide-over.tsx` — full detail panel
- [x] `components/app/projects/subtask-list.tsx` — checklist with completion
- [x] `components/app/projects/comment-thread.tsx` — comments with edit/delete
- [x] `components/app/projects/activity-feed.tsx` — history timeline

### Part 4 ✅ — Timer + Gantt
- [x] `components/app/floating-timer.tsx` — fixed bottom-right, persists across nav, 2h warning
- [x] `app/(dashboard)/projects/[id]/timeline/page.tsx` — Gantt view
- [x] `components/app/projects/gantt-chart.tsx` — SVG horizontal timeline
- [x] FloatingTimer added to `app/(dashboard)/layout.tsx`

---

## TASK 06 — Clients Module ✅

- [x] `lib/clients/queries.ts`
- [x] `lib/clients/actions.ts`
- [x] `app/(dashboard)/clients/page.tsx` — table, tag filters, search, invoiced total
- [x] `app/(dashboard)/clients/new/page.tsx` — full create form with validation
- [x] `app/(dashboard)/clients/[id]/page.tsx` — detail with Overview / Projects / Invoices tabs
- [x] `app/(dashboard)/clients/[id]/edit/page.tsx`
- [x] `components/app/clients/client-form.tsx` — react-hook-form + zod, Select/Textarea
- [x] `components/app/clients/tag-badge.tsx`
- [x] `components/ui/select.tsx` — Radix UI Select primitive
- [x] `components/ui/textarea.tsx` — shadcn Textarea

---

## TASK 07 — Time Tracking Page ✅

- [x] `app/(dashboard)/time/page.tsx` — real implementation (weekly chart, filters, log list)
- [x] `lib/time/actions.ts` — createManualLog, updateTimeLog, deleteTimeLog (30-day immutability guard)
- [x] `components/app/time/time-log-table.tsx` — grouped by day, inline edit/delete, dropdown actions
- [x] `components/app/time/manual-log-form.tsx` — dialog: project→task cascade, datetime, billable
- [x] `components/app/time/weekly-summary.tsx` — Recharts bar chart, billable vs non-billable
- [x] `components/app/time/billable-toggle.tsx` — optimistic inline toggle
- [x] `app/api/time/export/route.ts` — CSV export with filters (date, project, billable)

---

## TASK 08 — Invoices Module ✅

- [x] `lib/invoices/queries.ts` — getInvoices, getInvoiceById, getClientsForInvoice, getNextInvoiceNumber, getInvoiceStats
- [x] `lib/invoices/actions.ts` — createInvoice, updateInvoice, sendInvoice (+ Stripe payment link), markInvoicePaid, cancelInvoice, duplicateInvoice
- [x] `app/(dashboard)/invoices/page.tsx` — stats row, status filter tabs, InvoiceTable
- [x] `app/(dashboard)/invoices/new/page.tsx` — InvoiceBuilder (create mode)
- [x] `app/(dashboard)/invoices/[id]/page.tsx` — InvoicePreview + SendDialog + PDF download
- [x] `app/(dashboard)/invoices/[id]/edit/page.tsx` — InvoiceBuilder (edit mode, draft only)
- [x] `components/app/invoices/invoice-builder.tsx` — line items CRUD, tax %, discount, currency, recurring
- [x] `components/app/invoices/invoice-preview.tsx` — print-ready, tenant-branded with accent color
- [x] `components/app/invoices/invoice-table.tsx` — sortable table, row actions (mark paid, duplicate, cancel)
- [x] `components/app/invoices/status-badge.tsx` — draft/sent/paid/overdue/cancelled
- [x] `components/app/invoices/send-dialog.tsx` — confirm send + optional Stripe payment link + copy link
- [x] `app/api/invoices/[id]/pdf/route.ts` — print-optimised HTML (auto-triggers window.print)
- [x] Stripe Payment Link creation on send (dynamic import, non-fatal if not configured)

---

## TASK 09 — File Management ⬜

- [ ] `lib/files/queries.ts`
- [ ] `lib/files/actions.ts`
- [ ] `app/(dashboard)/files/page.tsx` — real implementation
- [ ] `components/app/files/file-grid.tsx`
- [ ] `components/app/files/file-uploader.tsx` — drag-and-drop, quota check
- [ ] `components/app/files/file-preview.tsx` — images, PDFs
- [ ] `components/app/files/signed-url-link.tsx` — 1-hour expiry
- [ ] Storage quota indicator
- [ ] Client visibility toggle (is_client_visible)

---

## TASK 10 — Messages / Realtime Chat ⬜

- [ ] `lib/messages/queries.ts`
- [ ] `lib/messages/actions.ts`
- [ ] `app/(dashboard)/messages/page.tsx` — real implementation
- [ ] `components/app/messages/conversation-list.tsx`
- [ ] `components/app/messages/message-thread.tsx` — Realtime WebSocket
- [ ] `components/app/messages/message-composer.tsx` — file attachments
- [ ] `components/app/messages/message-bubble.tsx`
- [ ] Unread badge on sidebar
- [ ] `app/api/webhooks/message/route.ts` — webhook on message.received

---

## TASK 11 — Client Portal ⬜

- [ ] `app/portal/[token]/page.tsx` — real implementation
- [ ] `app/portal/[token]/layout.tsx` — portal shell (no sidebar)
- [ ] `app/portal/[token]/projects/page.tsx`
- [ ] `app/portal/[token]/projects/[id]/page.tsx`
- [ ] `app/portal/[token]/invoices/page.tsx`
- [ ] `app/portal/[token]/invoices/[id]/page.tsx`
- [ ] `app/portal/[token]/files/page.tsx`
- [ ] `app/portal/[token]/messages/page.tsx`
- [ ] `app/api/portal/auth/route.ts` — magic link verify
- [ ] `lib/portal/queries.ts` — client-scoped reads only
- [ ] Portal branding (tenant primary_color + logo)
- [ ] White-label domain support

---

## TASK 12 — Stripe Billing & Webhooks ⬜

- [ ] `lib/stripe/client.ts`
- [ ] `lib/stripe/webhooks.ts`
- [ ] `app/api/webhooks/stripe/route.ts` — invoice.paid, subscription events
- [ ] `app/api/billing/checkout/route.ts` — create Stripe Checkout session
- [ ] `app/api/billing/portal/route.ts` — Stripe Customer Portal redirect
- [ ] `app/(dashboard)/settings/billing/page.tsx` — real implementation
- [ ] Trial expiry banner
- [ ] Plan upgrade/downgrade flow
- [ ] Webhook: auto-update subscription status in DB

---

## TASK 13 — Email Templates ⬜

- [ ] `lib/email/client.ts` — Resend wrapper
- [ ] `lib/email/templates/invoice-sent.tsx` — React Email
- [ ] `lib/email/templates/invoice-paid.tsx`
- [ ] `lib/email/templates/invoice-overdue.tsx`
- [ ] `lib/email/templates/milestone-approved.tsx`
- [ ] `lib/email/templates/project-completed.tsx`
- [ ] `lib/email/templates/client-portal-invite.tsx` — magic link
- [ ] `lib/email/templates/team-invite.tsx`
- [ ] `lib/email/templates/password-reset.tsx`
- [ ] `app/api/email/send/route.ts`

---

## TASK 14 — Settings & RBAC ⬜

- [ ] `app/(dashboard)/settings/profile/page.tsx` — real implementation
- [ ] `app/(dashboard)/settings/security/page.tsx` — real implementation (password + 2FA)
- [ ] `app/(dashboard)/settings/notifications/page.tsx` — real implementation
- [ ] `app/(dashboard)/settings/team/page.tsx` — real implementation
- [ ] `lib/settings/actions.ts` — update profile, change password, notification prefs
- [ ] `components/app/settings/avatar-upload.tsx`
- [ ] `components/app/settings/team-table.tsx` — roles, invite, remove
- [ ] `components/app/settings/invite-dialog.tsx`
- [ ] `app/api/invites/[token]/route.ts` — accept invite
- [ ] RBAC guards: owner-only billing, admin+ for project delete

---

## TASK 15 — White Label (Agency Plan) ⬜

- [ ] `app/(dashboard)/settings/workspace/page.tsx` — real implementation
- [ ] `lib/settings/white-label-actions.ts`
- [ ] Custom domain routing in `middleware.ts`
- [ ] `components/app/settings/brand-color-picker.tsx`
- [ ] `components/app/settings/logo-upload.tsx`
- [ ] Portal branding applied from tenant.primary_color + tenant.logo_url
- [ ] Agency plan gate (only available on agency plan)
- [ ] Custom email from-address via Resend domain verification

---

## Summary

| Status | Count |
|--------|-------|
| ✅ Done | Tasks 01, 02, 03, 04, 05, 06, 07, 08 |
| ⬜ Pending | Tasks 09–15 |

**Total files planned:** ~180
**Total files built:** ~65
