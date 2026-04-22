import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const SUPABASE_NETWORK_FAILURE_COOLDOWN_MS = 15_000
const SUPABASE_FETCH_TIMEOUT_MS = 3_500

let lastSupabaseNetworkFailureAt = 0

/**
 * Updates the Supabase auth session in middleware.
 * On Supabase/env errors returns next() with no user so request continues without breaking.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key || url === 'your_supabase_url') {
    return { supabaseResponse, user: null, supabase: null }
  }

  // Circuit-breaker: avoid hammering Supabase for every request while it's unreachable.
  if (
    lastSupabaseNetworkFailureAt > 0 &&
    Date.now() - lastSupabaseNetworkFailureAt < SUPABASE_NETWORK_FAILURE_COOLDOWN_MS
  ) {
    return { supabaseResponse, user: null, supabase: null }
  }

  const cookieHandlers = {
    getAll() {
      return request.cookies.getAll()
    },
    setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
      cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
      supabaseResponse = NextResponse.next({ request })
      cookiesToSet.forEach(({ name, value, options }) =>
        supabaseResponse.cookies.set(name, value, options ?? {})
      )
    },
  }

  const fetchWithTimeout: typeof fetch = async (input, init = {}) => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), SUPABASE_FETCH_TIMEOUT_MS)
    try {
      return await fetch(input, {
        ...init,
        signal: init.signal ?? controller.signal,
      })
    } finally {
      clearTimeout(timeout)
    }
  }

  try {
    const supabase = createServerClient(url, key, {
      cookies: cookieHandlers,
      global: {
        fetch: fetchWithTimeout,
      },
    })

    const { data: { user } } = await supabase.auth.getUser()
    lastSupabaseNetworkFailureAt = 0
    return { supabaseResponse, user, supabase }
  } catch (e) {
    const errMessage = e instanceof Error ? e.message : ''
    const isNetworkFailure =
      /fetch failed|network|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ECONNRESET|aborted/i.test(errMessage) ||
      (typeof e === 'object' && e !== null && 'status' in e && (e as { status?: number }).status === 0)

    if (isNetworkFailure) {
      lastSupabaseNetworkFailureAt = Date.now()
      return { supabaseResponse, user: null, supabase: null }
    }

    // Stale/invalid refresh token (common after deploy, env change, or token expiry): clear auth cookies
    // so the next request doesn't resend them. Works in Vercel Edge and local.
    const code = e && typeof e === 'object' && 'code' in e ? (e as { code?: string }).code : undefined
    if (code === 'refresh_token_not_found') {
      try {
        const supabase = createServerClient(url, key, {
          cookies: cookieHandlers,
        })
        await supabase.auth.signOut()
      } catch {
        // signOut can fail on Edge (e.g. network); still clear cookies below
      }
      // Manually clear Supabase auth cookies so browser stops sending them (reliable on Vercel Edge)
      const clearOptions = { maxAge: 0, path: '/' }
      request.cookies.getAll().forEach(({ name }) => {
        if (name.startsWith('sb-') && name.includes('auth-token')) {
          supabaseResponse.cookies.set(name, '', clearOptions)
        }
      })
    }
    return { supabaseResponse, user: null, supabase: null }
  }
}
