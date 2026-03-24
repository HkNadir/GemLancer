import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'
import { supabaseConfig } from '@/lib/config'

/**
 * Server-side Supabase client.
 * Use in: Server Components, Server Actions, Route Handlers.
 * Creates a new instance per request (cookies are request-scoped).
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    supabaseConfig.url,
    supabaseConfig.anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // setAll called from a Server Component — cookies are read-only.
            // The middleware will handle session refresh.
          }
        },
      },
    }
  )
}

/**
 * Admin Supabase client using service role key.
 * ONLY use server-side for privileged operations (webhooks, migrations).
 * NEVER expose this client or its key to the browser.
 */
export async function createAdminClient() {
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')

  return createSupabaseClient<Database>(
    supabaseConfig.url,
    supabaseConfig.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
