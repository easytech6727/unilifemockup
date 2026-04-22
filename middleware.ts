import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/** Supabase session refresh / cookie clearing happens on `sessionResponse`; copy onto redirects or those headers are lost. */
function redirectWithSessionCookies(
  sessionResponse: NextResponse,
  url: URL | string
): NextResponse {
  const redirect = NextResponse.redirect(url)
  sessionResponse.cookies.getAll().forEach((c) => {
    redirect.cookies.set(c.name, c.value, {
      domain: c.domain,
      expires: c.expires,
      httpOnly: c.httpOnly,
      maxAge: c.maxAge,
      path: c.path,
      partitioned: c.partitioned,
      priority: c.priority,
      sameSite: c.sameSite,
      secure: c.secure,
    })
  })
  return redirect
}

// Routes that don't require authentication
const publicRoutes = ['/login', '/signup', '/forgot-password', '/auth/callback', '/auth/reset-password', '/trip-planner']

// Role-based route prefixes (no generic vendor - only vendor-food, vendor-laundry)
const roleRoutes: Record<string, string[]> = {
  student: ['/student'],
  lecturer: ['/lecturer'],
  admin: ['/admin'],
  'vendor-food': ['/vendor'],
  'vendor-laundry': ['/vendor'],
  delivery: ['/delivery'],
  super_admin: ['/super-admin', '/admin', '/vendor', '/delivery', '/student', '/lecturer'],
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  const hasAuthCookies = request.cookies
    .getAll()
    .some(({ name }) => name.startsWith('sb-') && name.includes('auth-token'))

  // Public pages without Supabase session cookies do not need auth refresh.
  if (isPublicRoute && !hasAuthCookies) {
    return NextResponse.next({ request })
  }

  const { supabaseResponse, user, supabase } = await updateSession(request)

  // Allow public routes
  if (isPublicRoute) {
    if (user && (pathname === '/login' || pathname === '/signup')) {
      const role = (user.user_metadata?.role as string) || ''
      if (role) {
        const rolePrefix = normalizeRolePrefix(role)
        return redirectWithSessionCookies(
          supabaseResponse,
          new URL(`/${rolePrefix}/dashboard`, request.url)
        )
      }
    }
    return supabaseResponse
  }

  // If no user and trying to access protected route, redirect to login
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return redirectWithSessionCookies(supabaseResponse, loginUrl)
  }

  let userRole: string = (user.user_metadata?.role as string) || ''

  // Fetch role from DB when Supabase is available
  if (supabase) {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('auth_id', user.id)
      .single()
    if (userData?.role && !userError) userRole = userData.role as string
  }

  if (!userRole) {
    return redirectWithSessionCookies(
      supabaseResponse,
      new URL('/login?error=profile_not_found', request.url)
    )
  }

  const allowedPrefixes = roleRoutes[userRole] || []
  let hasAccess = allowedPrefixes.some(prefix => pathname.startsWith(prefix))

  // vendor-food: cannot access laundry pages
  if (userRole === 'vendor-food' && pathname.startsWith('/vendor/laundry')) {
    hasAccess = false
  }
  // vendor-laundry: cannot access food orders page
  if (userRole === 'vendor-laundry' && pathname === '/vendor/orders') {
    hasAccess = false
  }

  if (!hasAccess) {
    const rolePrefix = normalizeRolePrefix(userRole)
    return redirectWithSessionCookies(
      supabaseResponse,
      new URL(`/${rolePrefix}/dashboard`, request.url)
    )
  }

  if (pathname === '/') {
    const rolePrefix = normalizeRolePrefix(userRole)
    return redirectWithSessionCookies(
      supabaseResponse,
      new URL(`/${rolePrefix}/dashboard`, request.url)
    )
  }

  return supabaseResponse
}

function normalizeRolePrefix(role: string): string {
  if (role === 'super_admin') return 'super-admin'
  if (role === 'vendor-food' || role === 'vendor-laundry') return 'vendor'
  return role
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (they handle their own auth)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
