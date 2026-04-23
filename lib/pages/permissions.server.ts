/**
 * Server-only: read and update page permissions from DB.
 * Fallback to registry when DB has no rows.
 */

import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/auth'
import {
  PAGE_REGISTRY,
  getDefaultNavItemsForRole,
  getAllPagesForRole,
  type PageRecord,
} from './registry'

const REMOVED_STUDENT_PATHS = new Set([
  '/student/courses',
  '/student/study-groups',
  '/student/marketplace',
])

// Shared vendor pages that both vendor-food and vendor-laundry should be able to see.
const SHARED_VENDOR_PATHS = new Set([
  '/vendor/dashboard',
  '/vendor/products',
  '/vendor/my-store',
  '/vendor/sales-analytics',
])

function isVisiblePagePath(path: unknown): boolean {
  const p = String(path || '')
  return !REMOVED_STUDENT_PATHS.has(p)
}

export interface NavItemPayload {
  label: string
  href: string
  icon: string
}

/** Returns nav items allowed for this role (and user, if provided). All roles, including super_admin, use DB permissions. */
export async function getAllowedNavItemsForRole(role: UserRole, userId?: number): Promise<NavItemPayload[]> {
  const supabase = await createClient()

  const { data: allPagesData } = await supabase.from('app_pages').select('id, path, label, icon, sort_order, role').order('role').order('sort_order')

  const { data: rolePerms } = await supabase
    .from('role_page_permissions')
    .select('page_id, enabled')
    .eq('role', role)

  let userPerms: { page_id: number; enabled: boolean }[] = []
  if (userId) {
    const { data: up } = await supabase
      .from('user_page_permissions')
      .select('page_id, enabled')
      .eq('user_id', userId)
    userPerms = (up || []) as { page_id: number; enabled: boolean }[]
  }

  const rolePermMap = new Map((rolePerms || []).map((r: any) => [r.page_id, r.enabled]))
  const userPermMap = new Map(userPerms.map((r) => [r.page_id, r.enabled]))

  // Super_admin sees their own pages plus all admin pages.
  // vendor-laundry also sees shared vendor pages that may be stored under vendor-food in app_pages.
  const rolePages = (allPagesData || [])
    .filter((p: any) => {
      if (role === 'super_admin') return p.role === role || p.role === 'admin'
      if (role === 'vendor-laundry') return p.role === role || SHARED_VENDOR_PATHS.has(String(p.path || ''))
      return p.role === role
    })
    .filter((p: any) => isVisiblePagePath(p.path))
  const allowedRolePages = rolePages.filter((p: any) => {
    const userOverride = userPermMap.get(p.id)
    if (userOverride !== undefined) return userOverride
    const rolePerm = rolePermMap.get(p.id)
    if (rolePerm !== undefined) return rolePerm
    return true
  })

  const crossRoleGranted = (allPagesData || []).filter((p: any) => {
    if (p.role === role) return false
    if (!isVisiblePagePath(p.path)) return false
    const rp = rolePermMap.get(p.id)
    return rp === true
  })

  const userGranted = userId
    ? (allPagesData || []).filter((p: any) =>
      isVisiblePagePath(p.path) &&
      userPermMap.get(p.id) === true &&
      !allowedRolePages.some((r: any) => r.id === p.id) &&
      !crossRoleGranted.some((r: any) => r.id === p.id))
    : []

  const combined = [...allowedRolePages, ...crossRoleGranted, ...userGranted]
  const seen = new Set<number>()
  const deduped = combined.filter((p: any) => {
    if (seen.has(p.id)) return false
    seen.add(p.id)
    return true
  })
  // Super_admin: show super_admin pages first (Dashboard on top), then admin pages. Others: sort by role then sort_order.
  deduped.sort((a: any, b: any) => {
    if (role === 'super_admin') {
      const aFirst = a.role === 'super_admin' ? 0 : 1
      const bFirst = b.role === 'super_admin' ? 0 : 1
      if (aFirst !== bFirst) return aFirst - bFirst
      return (a.sort_order || 0) - (b.sort_order || 0)
    }
    return (a.role || '').localeCompare(b.role || '') || (a.sort_order || 0) - (b.sort_order || 0)
  })

  if (deduped.length === 0) return getDefaultNavItemsForRole(role).filter((p) => isVisiblePagePath(p.href))
  return deduped.map((p: any) => ({ label: p.label, href: p.path, icon: p.icon }))
}

/** List all pages with effective permission for a user (for super-admin "By User" tab). */
export async function getPagesWithPermissionsForUser(userId: number): Promise<
  { page_id: number; path: string; label: string; role: string; icon: string; sort_order: number; enabled: boolean }[]
> {
  const supabase = await createClient()
  const { data: userRow } = await supabase.from('users').select('role').eq('id', userId).single()
  const role = (userRow?.role || 'student') as UserRole

  const { data: allPages } = await supabase.from('app_pages').select('*').order('role').order('sort_order')
  if (!allPages?.length) return []

  const { data: rolePerms } = await supabase
    .from('role_page_permissions')
    .select('page_id, enabled')
    .eq('role', role)
  let userPerms: { page_id: number; enabled: boolean }[] = []
  const { data: userPermData } = await supabase
    .from('user_page_permissions')
    .select('page_id, enabled')
    .eq('user_id', userId)
  if (userPermData) userPerms = userPermData as { page_id: number; enabled: boolean }[]

  const roleMap = new Map((rolePerms || []).map((r: any) => [r.page_id, r.enabled]))
  const userMap = new Map(userPerms.map((r) => [r.page_id, r.enabled]))

  return (allPages as any[]).filter((p) => isVisiblePagePath(p.path)).map((p) => {
    const userOverride = userMap.get(p.id)
    const effective = userOverride !== undefined ? userOverride : (roleMap.get(p.id) ?? (p.role === role))
    return {
      page_id: p.id,
      path: p.path,
      label: p.label,
      role: p.role,
      icon: p.icon,
      sort_order: p.sort_order,
      enabled: !!effective,
    }
  })
}

/** List all pages with permission for a role (for super-admin page management). */
export async function getPagesWithPermissionsForRole(role: UserRole): Promise<
  { page_id: number; path: string; label: string; role: string; icon: string; sort_order: number; enabled: boolean }[]
> {
  const supabase = await createClient()
  const { data: pages } = await supabase.from('app_pages').select('*').eq('role', role).order('sort_order')
  if (!pages?.length) {
    return getAllPagesForRole(role).filter((p) => isVisiblePagePath(p.path)).map((p) => ({
      page_id: p.id,
      path: p.path,
      label: p.label,
      role: p.role,
      icon: p.icon,
      sort_order: p.sort_order,
      enabled: true,
    }))
  }
  const { data: perms } = await supabase
    .from('role_page_permissions')
    .select('page_id, enabled')
    .eq('role', role)
  const permMap = new Map((perms || []).map((r: any) => [r.page_id, r.enabled]))
  return (pages as any[]).filter((p: any) => isVisiblePagePath(p.path)).map((p: any) => ({
    page_id: p.id,
    path: p.path,
    label: p.label,
    role: p.role,
    icon: p.icon,
    sort_order: p.sort_order,
    enabled: permMap.get(p.id) ?? true,
  }))
}

/** All app_pages (for super_admin: all roles). */
export async function getAllAppPages(): Promise<PageRecord[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('app_pages').select('*').order('id')
  if (data?.length) {
    return (data as PageRecord[]).filter((p) => isVisiblePagePath(p.path))
  }
  return PAGE_REGISTRY.filter((p) => isVisiblePagePath(p.path))
}

/** Total number of app pages (from DB or registry). */
export async function getAppPagesCount(): Promise<number> {
  const all = await getAllAppPages()
  return all.length
}

/** Set enabled for one role+page. Caller must ensure user is super_admin. */
export async function setPagePermission(role: UserRole, pageId: number, enabled: boolean): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('role_page_permissions')
    .upsert({ role, page_id: pageId, enabled }, { onConflict: 'role,page_id' })
  return { error: error?.message ?? null }
}

/** Get permissions for one role (all pages for that role with enabled flag). */
export async function getPermissionsByRole(role: UserRole): Promise<{ page_id: number; enabled: boolean }[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('role_page_permissions')
    .select('page_id, enabled')
    .eq('role', role)
  return (data || []) as { page_id: number; enabled: boolean }[]
}

/** Set enabled for one user+page. User-specific override. */
export async function setUserPagePermission(userId: number, pageId: number, enabled: boolean): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('user_page_permissions')
    .upsert({ user_id: userId, page_id: pageId, enabled }, { onConflict: 'user_id,page_id' })
  if (error) return { error: error.message }
  return { error: null }
}

/** Bulk: set permission for multiple roles at once. */
export async function setRolePagePermissionBulk(
  roles: UserRole[],
  pageId: number,
  enabled: boolean
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  for (const role of roles) {
    const { error } = await supabase
      .from('role_page_permissions')
      .upsert({ role, page_id: pageId, enabled }, { onConflict: 'role,page_id' })
    if (error) return { error: error.message }
  }
  return { error: null }
}

/** Resolve user by email. Returns { id, email, name, role } or null. */
export async function getUserByEmail(email: string): Promise<{ id: number; email: string; name: string; role: string } | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('users')
    .select('id, email, name, role')
    .eq('email', email.trim())
    .limit(1)
    .maybeSingle()
  return data as { id: number; email: string; name: string; role: string } | null
}

/** List users by role (for super admin user picker). */
export async function getUsersByRole(role: UserRole, search?: string): Promise<{ id: number; email: string; name: string; role: string }[]> {
  const supabase = await createClient()
  let q = supabase.from('users').select('id, email, name, role').eq('role', role).order('email').limit(100)
  if (search?.trim()) {
    q = q.or(`email.ilike.%${search.trim()}%,name.ilike.%${search.trim()}%`)
  }
  const { data } = await q
  return (data || []) as { id: number; email: string; name: string; role: string }[]
}
