/**
 * Validated environment variable access.
 * Throws at startup if required vars are missing — fail fast, fail loud.
 */

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

function optionalEnv(key: string, fallback: string = ''): string {
  return process.env[key] ?? fallback
}

// ── Supabase ─────────────────────────────────────────────────
export const supabaseConfig = {
  url: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  anonKey: requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  // Service role key: server-side only, never expose to client
  get serviceRoleKey() {
    if (typeof window !== 'undefined') {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY must not be accessed on the client')
    }
    return requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  },
} as const

// ── Stripe ────────────────────────────────────────────────────
export const stripeConfig = {
  publishableKey: optionalEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'),
  get secretKey() {
    if (typeof window !== 'undefined') {
      throw new Error('STRIPE_SECRET_KEY must not be accessed on the client')
    }
    return requireEnv('STRIPE_SECRET_KEY')
  },
  get webhookSecret() {
    if (typeof window !== 'undefined') {
      throw new Error('STRIPE_WEBHOOK_SECRET must not be accessed on the client')
    }
    return requireEnv('STRIPE_WEBHOOK_SECRET')
  },
  prices: {
    starterMonthly: optionalEnv('STRIPE_PRICE_STARTER_MONTHLY'),
    proMonthly: optionalEnv('STRIPE_PRICE_PRO_MONTHLY'),
    agencyMonthly: optionalEnv('STRIPE_PRICE_AGENCY_MONTHLY'),
  },
} as const

// ── Email ─────────────────────────────────────────────────────
export const emailConfig = {
  get apiKey() {
    if (typeof window !== 'undefined') {
      throw new Error('RESEND_API_KEY must not be accessed on the client')
    }
    return requireEnv('RESEND_API_KEY')
  },
  fromEmail: optionalEnv('RESEND_FROM_EMAIL', 'noreply@gemlancer.com'),
  fromName: optionalEnv('RESEND_FROM_NAME', 'GemLancer'),
} as const

// ── App ───────────────────────────────────────────────────────
export const appConfig = {
  url: optionalEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
} as const

// ── Plan limits (mirrors database) ───────────────────────────
export const planLimits = {
  starter: { maxClients: 5, maxProjects: 10, maxUsers: 1, storageGb: 5 },
  pro:     { maxClients: Infinity, maxProjects: Infinity, maxUsers: 1, storageGb: 50 },
  agency:  { maxClients: Infinity, maxProjects: Infinity, maxUsers: 20, storageGb: 500 },
} as const

export type PlanTier = keyof typeof planLimits
