'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  Calendar,
  Users,
  ShoppingBag,
  Utensils,
  Car,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Package,
  Briefcase,
  Store,
  Truck,
  Shield,
  BarChart3,
  UserCog,
  LayoutList,
  MapPin,
  User,
  UserPlus,
  CircleDollarSign,
  LucideIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { UserRole } from '@/lib/auth'

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
}

interface DashboardLayoutProps {
  children: React.ReactNode
  user: {
    id: number
    auth_id: string
    name: string
    email: string
    role: UserRole
    avatar_url?: string
  }
}

type VendorOrderAlert = {
  id: string
  type: 'food' | 'laundry'
  customer: string
  summary: string
  createdAt: string
  href: string
}

// Navigation items for each role
const roleNavItems: Record<UserRole, NavItem[]> = {
  student: [
    { label: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
    { label: 'Profile', href: '/student/profile', icon: User },
    { label: 'Timetable', href: '/student/timetable', icon: Calendar },
    { label: 'Food Order', href: '/student/food-order', icon: Utensils },
    { label: 'Add to Cart', href: '/student/food-order/cart', icon: ShoppingBag },
    { label: 'Laundry', href: '/student/laundry', icon: Truck },
    { label: 'Trip Planner', href: '/student/trips', icon: MapPin },
  ],
  lecturer: [
    { label: 'Dashboard', href: '/lecturer/dashboard', icon: LayoutDashboard },
    { label: 'My Courses', href: '/lecturer/courses', icon: BookOpen },
    { label: 'Schedule', href: '/lecturer/schedule', icon: Calendar },
    { label: 'Students', href: '/lecturer/students', icon: Users },
    { label: 'Assignments', href: '/lecturer/assignments', icon: Briefcase },
  ],
  admin: [
    { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Users', href: '/admin/users', icon: Users },
    { label: 'Timetable', href: '/admin/timetable', icon: Calendar },
    { label: 'Reports', href: '/admin/reports', icon: BarChart3 },
    { label: 'Announcements', href: '/admin/announcements', icon: Bell },
    { label: 'Laundry Shops', href: '/admin/laundry/add', icon: Truck },
    { label: 'Food Stalls', href: '/admin/food-stalls/add', icon: Utensils },
    { label: 'Trip Locations', href: '/admin/trips/add', icon: MapPin },
    { label: 'Add User', href: '/admin/users/new', icon: UserPlus },
  ],
  vendor: [
    { label: 'Dashboard', href: '/vendor/dashboard', icon: LayoutDashboard },
    { label: 'Orders', href: '/vendor/orders', icon: Package },
    { label: 'Laundry Orders', href: '/vendor/laundry/orders', icon: Truck },
    { label: 'Fulfillment', href: '/vendor/fulfillment', icon: Truck },
    { label: 'Products', href: '/vendor/products', icon: Utensils },
    { label: 'My Store', href: '/vendor/my-store', icon: Store },
    { label: 'Sales & Analysis', href: '/vendor/sales-analytics', icon: BarChart3 },
  ],
  'vendor-food': [
    { label: 'Dashboard', href: '/vendor/dashboard', icon: LayoutDashboard },
    { label: 'Orders', href: '/vendor/orders', icon: Package },
    { label: 'Products', href: '/vendor/products', icon: Utensils },
    { label: 'My Store', href: '/vendor/my-store', icon: Store },
    { label: 'Sales & Analysis', href: '/vendor/sales-analytics', icon: BarChart3 },
  ],
  'vendor-laundry': [
    { label: 'Dashboard', href: '/vendor/dashboard', icon: LayoutDashboard },
    { label: 'Laundry Orders', href: '/vendor/laundry/orders', icon: Truck },
    { label: 'Fulfillment', href: '/vendor/fulfillment', icon: Truck },
    { label: 'Pricing', href: '/vendor/products', icon: CircleDollarSign },
    { label: 'My Store', href: '/vendor/my-store', icon: Store },
    { label: 'Sales & Analysis', href: '/vendor/sales-analytics', icon: BarChart3 },
  ],
  delivery: [
    { label: 'Dashboard', href: '/delivery/dashboard', icon: LayoutDashboard },
    { label: 'Manage Orders', href: '/delivery/orders', icon: Package },
    { label: 'Riders', href: '/delivery/riders', icon: Users },
    { label: 'Laundry Jobs', href: '/delivery/laundry', icon: Truck },
    { label: 'Earnings', href: '/delivery/earnings', icon: BarChart3 },
  ],
  super_admin: [
    { label: 'Dashboard', href: '/super-admin/dashboard', icon: LayoutDashboard },
    { label: 'All Users', href: '/super-admin/users', icon: UserCog },
    { label: 'Roles & Permissions', href: '/super-admin/roles', icon: Shield },
    { label: 'System Analytics', href: '/super-admin/analytics', icon: BarChart3 },
    { label: 'Settings', href: '/super-admin/settings', icon: Settings },
    { label: 'Page Management', href: '/super-admin/pages', icon: LayoutList },
    // Admin pages (super_admin can access all admin features)
    { label: 'Admin Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Admin Users', href: '/admin/users', icon: Users },
    { label: 'Admin Timetable', href: '/admin/timetable', icon: Calendar },
    { label: 'Admin Reports', href: '/admin/reports', icon: BarChart3 },
    { label: 'Admin Announcements', href: '/admin/announcements', icon: Bell },
    { label: 'Laundry Shops', href: '/admin/laundry/add', icon: Truck },
    { label: 'Food Stalls', href: '/admin/food-stalls/add', icon: Utensils },
    { label: 'Trip Locations', href: '/admin/trips/add', icon: MapPin },
  ]
}

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  BookOpen,
  Calendar,
  Users,
  ShoppingBag,
  Utensils,
  Car,
  Bell,
  Settings,
  Package,
  Briefcase,
  Store,
  Truck,
  Shield,
  BarChart3,
  UserCog,
  LayoutList,
  MapPin,
  UserPlus,
  CircleDollarSign,
}

// Role display names and colors
const roleConfig: Record<UserRole, { label: string; color: string }> = {
  student: { label: 'Student', color: 'bg-blue-100 text-blue-800' },
  lecturer: { label: 'Lecturer', color: 'bg-purple-100 text-purple-800' },
  admin: { label: 'Admin', color: 'bg-blue-100 text-blue-800' },
  vendor: { label: 'Vendor', color: 'bg-green-100 text-green-800' },
  'vendor-food': { label: 'Food Vendor', color: 'bg-green-100 text-green-800' },
  'vendor-laundry': { label: 'Laundry Vendor', color: 'bg-teal-100 text-teal-800' },
  delivery: { label: 'Delivery', color: 'bg-amber-50 text-amber-700 border border-amber-200' },
  super_admin: { label: 'Super Admin', color: 'bg-red-100 text-red-800' },
}

/** Role segment used in URLs (vendor-food/vendor-laundry -> vendor) */
function rolePathSegment(role: UserRole): string {
  if (role === 'super_admin') return 'super-admin'
  if (role === 'vendor-food' || role === 'vendor-laundry') return 'vendor'
  return role.replace('_', '-')
}

export default function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [vendorAlerts, setVendorAlerts] = useState<VendorOrderAlert[]>([])
  const [unreadAlerts, setUnreadAlerts] = useState(0)

  const [supabase, setSupabase] = useState<any | null>(null)
  const [apiNavItems, setApiNavItems] = useState<NavItem[] | null>(null)
  const pathSegment = rolePathSegment(user.role)
  const prevAlertIdsRef = useRef<string[]>([])

  useEffect(() => {
    setSupabase(createClient())
  }, [])

  // Clear navigation state when route changes
  useEffect(() => {
    setIsNavigating(false)
    setNavigatingTo(null)
  }, [pathname])

  // Handle navigation with loading state
  const handleNavigation = (href: string) => {
    if (href !== pathname) {
      setIsNavigating(true)
      setNavigatingTo(href)
    }
    setIsSidebarOpen(false)
  }

  const fallbackNav = roleNavItems[user.role] ?? roleNavItems['vendor-food'] ?? []
  const navItems: NavItem[] = apiNavItems != null ? apiNavItems : fallbackNav
  const roleInfo = roleConfig[user.role] ?? roleConfig['vendor-food']
  const isDeliveryUI = user.role === 'delivery'
  const isVendorRole = user.role === 'vendor' || user.role === 'vendor-food' || user.role === 'vendor-laundry'
  const activeNavLabel = navItems.find((item) => item.href === pathname)?.label

  const handleLogout = async () => {
    setIsLoggingOut(true)
    const client = supabase ?? createClient()
    await client.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatAlertTime = (iso: string) => {
    const ts = new Date(iso).getTime()
    if (!Number.isFinite(ts)) return 'just now'
    const mins = Math.max(0, Math.floor((Date.now() - ts) / 60000))
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  useEffect(() => {
    if (!isVendorRole) return

    let mounted = true

    const loadVendorAlerts = async () => {
      const tasks: Array<Promise<{ ok: boolean; orders: any[] }>> = []

      if (user.role === 'vendor' || user.role === 'vendor-food') {
        tasks.push(
          fetch('/api/vendor/food-orders', { cache: 'no-store' })
            .then(async (res) => ({ ok: res.ok, orders: (await res.json().catch(() => ({}))).orders ?? [] }))
            .catch(() => ({ ok: false, orders: [] }))
        )
      }

      if (user.role === 'vendor' || user.role === 'vendor-laundry') {
        tasks.push(
          fetch('/api/vendor/laundry-orders', { cache: 'no-store' })
            .then(async (res) => ({ ok: res.ok, orders: (await res.json().catch(() => ({}))).orders ?? [] }))
            .catch(() => ({ ok: false, orders: [] }))
        )
      }

      const results = await Promise.all(tasks)
      if (!mounted) return

      const alerts: VendorOrderAlert[] = []

      for (const r of results) {
        for (const o of r.orders ?? []) {
          const status = String(o?.status ?? '').toLowerCase()
          const isFoodOrder = Object.prototype.hasOwnProperty.call(o, 'food_stall_id')
          const isLaundryOrder = Object.prototype.hasOwnProperty.call(o, 'laundry_shop_id')

          if (isFoodOrder && status !== 'new') continue
          if (isLaundryOrder && status !== 'new') continue

          const type: 'food' | 'laundry' = isLaundryOrder ? 'laundry' : 'food'
          const orderId = Number(o?.id)
          if (!Number.isFinite(orderId) || orderId < 1) continue

          alerts.push({
            id: `${type}-${orderId}`,
            type,
            customer: String(o?.customer_name ?? 'Customer'),
            summary: type === 'food'
              ? `New food order #ORD-${orderId}`
              : `New laundry order ${String(o?.order_ref || `#LND-${orderId}`)}`,
            createdAt: String(o?.created_at ?? new Date().toISOString()),
            href: type === 'food' ? '/vendor/orders' : '/vendor/laundry/orders',
          })
        }
      }

      alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      const next = alerts.slice(0, 20)
      const nextIds = next.map((a) => a.id)

      if (prevAlertIdsRef.current.length > 0) {
        const oldSet = new Set(prevAlertIdsRef.current)
        const newlyArrived = nextIds.filter((id) => !oldSet.has(id)).length
        if (newlyArrived > 0) {
          setUnreadAlerts((v) => v + newlyArrived)
        }
      }

      prevAlertIdsRef.current = nextIds
      setVendorAlerts(next)
    }

    void loadVendorAlerts()
    const t = setInterval(() => {
      void loadVendorAlerts()
    }, 10000)

    return () => {
      mounted = false
      clearInterval(t)
    }
  }, [isVendorRole, user.role])

  return (
    <div className="min-h-screen bg-white">
      {/* Top navigation progress bar */}
      <AnimatePresence>
        {isNavigating && (
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 0.7 }}
            exit={{ scaleX: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={`fixed top-0 left-0 right-0 h-1 z-[100] origin-left ${isDeliveryUI ? 'bg-[#5f6db8]' : 'bg-primary'}`}
          />
        )}
      </AnimatePresence>
      
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/35 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64 border-r
          ${isDeliveryUI ? 'bg-gradient-to-b from-blue-50 to-blue-50/80 border-blue-200/40' : 'bg-gradient-to-b from-blue-50 to-blue-50/80 border-blue-200/40'}
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-5 border-b border-blue-200/40">
            <Link href={`/${pathSegment}/dashboard`} className="flex items-center gap-3 hover:opacity-80 transition">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-200">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold font-display tracking-[-0.018em] text-blue-900">UniLife</span>
            </Link>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-5 pt-4">
            <ul className="space-y-1.5">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <li key={`${item.href}:${item.label}`}>
                    <Link
                      href={item.href}
                      onClick={() => handleNavigation(item.href)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border-l-4 transition-all duration-200 ${
                        isActive
                          ? 'border-blue-500 bg-white text-blue-700 font-semibold shadow-sm shadow-blue-100'
                          : 'border-transparent text-gray-600 hover:bg-white/60 hover:text-gray-700'
                      } ${
                        isNavigating && navigatingTo === item.href ? 'opacity-60 cursor-wait' : ''
                      }`}
                    >
                      <item.icon size={20} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* User profile section */}
          <div className="p-5 border-t border-blue-200/40">
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors hover:bg-white/60"
              >
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center ring-2 bg-white ring-blue-200 shadow-sm">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-semibold">
                      {getInitials(user.name)}
                    </span>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${roleInfo.color}`}>
                    {roleInfo.label}
                  </span>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-gray-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`}
                />
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
                  >
                    <Link
                      href={`/${pathSegment}/settings`}
                      className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 transition-colors"
                    >
                      <Settings size={18} />
                      <span className="text-sm">Settings</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={18} />
                      <span className="text-sm">{isLoggingOut ? 'Logging out...' : 'Log out'}</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top header */}
        <header className="sticky top-0 z-30 border-b border-blue-100 bg-white/90 backdrop-blur-md shadow-sm">
          <div className="mx-auto flex max-w-[110rem] items-center justify-between gap-4 px-4 py-4 lg:px-6">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                aria-label="Open navigation"
              >
                <Menu size={20} />
              </button>

              <Link href={`/${pathSegment}/dashboard`} className="hidden sm:flex items-center gap-2.5 min-w-0">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-200">
                  <GraduationCap className="h-5 w-5 text-white" />
                </span>
                <div className="min-w-0 leading-tight">
                  <p className="font-display text-[15px] font-bold tracking-[-0.02em] text-slate-900 truncate">UniLife</p>
                  <p className="text-xs text-slate-500 truncate">{activeNavLabel ?? 'Dashboard'}</p>
                </div>
              </Link>

              <div className="sm:hidden min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{activeNavLabel ?? 'Dashboard'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => {
                    setIsNotificationOpen((v) => !v)
                    if (!isNotificationOpen) setUnreadAlerts(0)
                  }}
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                  aria-label="Notifications"
                >
                  <Bell size={20} className="text-slate-600" />
                  {isVendorRole && vendorAlerts.length > 0 ? (
                    <span className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full bg-red-500 px-1 text-[11px] leading-5 text-white font-semibold text-center">
                      {unreadAlerts > 0 ? Math.min(unreadAlerts, 99) : vendorAlerts.length}
                    </span>
                  ) : null}
                </button>

                <AnimatePresence>
                  {isNotificationOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
                    >
                      <div className="px-4 py-3 border-b border-slate-100">
                        <p className="text-sm font-semibold text-slate-900">New Orders</p>
                        <p className="text-xs text-slate-500">Live updates every 10 seconds</p>
                      </div>

                      <div className="max-h-80 overflow-y-auto">
                        {isVendorRole && vendorAlerts.length > 0 ? (
                          vendorAlerts.map((alert) => (
                            <Link
                              key={alert.id}
                              href={alert.href}
                              onClick={() => setIsNotificationOpen(false)}
                              className="block px-4 py-3 border-b border-slate-100 hover:bg-slate-50"
                            >
                              <p className="text-sm font-medium text-slate-900">{alert.summary}</p>
                              <p className="text-xs text-slate-500">{alert.customer}</p>
                              <p className="text-[11px] text-slate-400 mt-1">{formatAlertTime(alert.createdAt)}</p>
                            </Link>
                          ))
                        ) : (
                          <div className="px-4 py-6 text-sm text-slate-500">No new orders right now.</div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Mobile profile */}
              <div className="lg:hidden">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-slate-200 shadow-sm overflow-hidden">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-semibold text-primary">
                      {getInitials(user.name)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className={`relative ${isDeliveryUI ? 'p-5 lg:p-6' : 'p-4 lg:p-6'}`}>
          {/* Navigation loading overlay */}
          <AnimatePresence>
            {isNavigating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`absolute inset-0 z-20 flex items-center justify-center backdrop-blur-sm ${isDeliveryUI ? 'bg-stone-50/80' : 'bg-white/80'}`}
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className={`w-16 h-16 rounded-full border-4 animate-spin ${isDeliveryUI ? 'border-[#d6dcf9] border-t-[#5f6db8]' : 'border-primary/20 border-t-primary'}`} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <GraduationCap size={24} className="text-primary" />
                    </div>
                  </div>
                  <p className="text-gray-500 font-medium text-sm animate-pulse">Loading...</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
