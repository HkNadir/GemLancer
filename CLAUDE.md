# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server on localhost:3000
npm run build        # Production build
npm run lint         # ESLint
npm run type-check   # tsc --noEmit (no emit, just type errors)
```

> **Note:** The Bash tool does not produce visible output in this environment. All file creation must use the Write/Edit tools directly. Run `npm install` manually in a terminal after adding dependencies to `package.json`.

## Architecture

### Multi-Tenancy Model
Shared database with Row Level Security. Every table has a `tenant_id UUID NOT NULL` column. **Never query any table without a `tenant_id` filter** — RLS enforces this at the DB layer, but application code must also be explicit.

The tenant's UUID is injected into the Supabase JWT via a PostgreSQL hook (`inject_tenant_claims` in `supabase/migrations/009_create_functions.sql`). Read it from the JWT via `auth.tenant_id()` in SQL or from `session.user.app_metadata.tenant_id` in TypeScript.

### Supabase Client Selection
Three clients exist — use the right one for the context:

| File | Use when |
|---|---|
| `lib/supabase/client.ts` | Client Components (browser, `'use client'`) |
| `lib/supabase/server.ts` → `createClient()` | Server Components, Server Actions, Route Handlers |
| `lib/supabase/server.ts` → `createAdminClient()` | Privileged ops only: Stripe webhooks, migrations. Never in user-facing code. |

### Auth & Route Protection
`middleware.ts` handles all auth gating. It calls `lib/supabase/middleware.ts → updateSession()` on every request to refresh cookies, then:
- Redirects unauthenticated users hitting `/dashboard`, `/clients`, `/projects`, `/invoices`, `/time`, `/files`, `/settings` → `/login?redirectTo=<path>`
- Redirects authenticated users away from `/login` and `/signup` → `/dashboard`
- `/api/webhooks/*` and `/portal/*` are always public

### RBAC
Four roles defined in `types/database.ts`: `owner > admin > member > client`. The `client` role is for external portal users only — they access a magic-link-based portal at `/portal/[token]`, not the main app. Use `auth.is_internal()`, `auth.is_owner_or_admin()` SQL helpers (defined in migration 008) to gate operations.

### Type System
`types/database.ts` is the single source of truth for all TypeScript types. It exports:
- `Database` — the typed Supabase client generic
- `TableRow<T>`, `TableInsert<T>`, `TableUpdate<T>` — utility generics for any table
- Individual interfaces: `Tenant`, `User`, `Client`, `Project`, `Milestone`, `Task`, `TimeLog`, `Invoice`, `InvoiceItem`, `File`, `Message`

When the DB schema changes, update `types/database.ts` **and** the corresponding SQL migration together.

### Environment Variables
Access env vars **only** through `lib/config.ts` — never `process.env` directly in components. Server-only keys (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, etc.) throw if accessed in a browser context. `NEXT_PUBLIC_*` vars are safe for both.

### Key Business Rules Enforced in DB
- **Invoices cannot be deleted** — trigger `prevent_invoice_delete` raises an exception on `DELETE`. Cancel via `status = 'cancelled'` instead.
- **Time logs immutable after 30 days** — trigger `enforce_time_log_immutability` blocks updates. `lock_old_time_logs()` function should run nightly.
- **Files use signed URLs only** — never expose `bucket_path` directly; generate a 1-hour signed URL via Supabase Storage.
- **Client portal login = magic link** — `client`-role users have no password; use `portal_token` on the `users` table.

### Plan Limits
Enforced via `check_plan_limit(tenant_id, resource)` PostgreSQL function. Limits are also mirrored in `lib/config.ts → planLimits` for client-side display. Always check server-side before creating clients/projects/users.

### Adding New shadcn Components
The project uses `components.json` configured for `@/components/ui`. Add components via:
```bash
npx shadcn-ui@latest add <component-name>
```
Or write them manually to `components/ui/` following the existing `button.tsx` / `toast.tsx` pattern.

### SQL Migrations
Files live in `supabase/migrations/` numbered `001`–`009`. When writing new migrations:
- Always add `tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE`
- Add the `update_updated_at()` trigger if the table is mutable
- Add an RLS policy in the same migration or extend `008_create_rls_policies.sql`
- Never use raw string interpolation in SQL — always parameterized queries
