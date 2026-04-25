'use client'

import { useEffect, useState } from 'react'
import {
  Package,
  DollarSign,
  Clock,
  TrendingUp,
  ArrowRight,
  Plus,
  CheckCircle,
  XCircle,
  Truck,
  Utensils,
  Store,
} from 'lucide-react'
import Link from 'next/link'

type FoodStall = { id: number; shop_name: string; owner_email: string }
type LaundryShop = { id: number; shop_name: string; owner_email: string }
type FoodOrder = { id: number; customer_name: string; items: string; total_amount: number; status: string; created_at: string }
type LaundryOrder = {
  id: number
  customer_name: string
  items_description?: string | null
  service?: string | null
  items_count?: number | null
  total?: number | null
  total_amount?: number | null
  status: string
  created_at: string
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr).getTime()
  const diff = Math.floor((Date.now() - d) / 60000)
  if (diff < 1) return 'Just now'
  if (diff < 60) return `${diff} mins ago`
  if (diff < 1440) return `${Math.floor(diff / 60)} hrs ago`
  return `${Math.floor(diff / 1440)} days ago`
}

function normalizeLaundryStatus(raw: string): 'new' | 'preparing' | 'ready' | 'completed' | 'cancelled' {
  const s = String(raw || '').toLowerCase()
  if (s === 'completed' || s === 'delivered') return 'completed'
  if (s === 'cancelled' || s === 'canceled' || s === 'rejected') return 'cancelled'
  if (s === 'ready' || s === 'ready_for_delivery' || s === 'out_for_delivery') return 'ready'
  if (s === 'washing' || s === 'ironing' || s === 'in_progress' || s === 'processing') return 'preparing'
  return 'new'
}

export default function VendorDashboardClient({ userName, userRole }: { userName: string; userRole?: string }) {
  const [foodStalls, setFoodStalls] = useState<FoodStall[]>([])
  const [laundryShops, setLaundryShops] = useState<LaundryShop[]>([])
  const [foodOrders, setFoodOrders] = useState<FoodOrder[]>([])
  const [laundryOrders, setLaundryOrders] = useState<LaundryOrder[]>([])
  const [menuItems, setMenuItems] = useState<{ name: string; price: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/vendor/shops').then((r) => (r.ok ? r.json() : { food_stalls: [], laundry_shops: [] })),
      userRole === 'vendor-food' ? fetch('/api/vendor/food-orders').then((r) => (r.ok ? r.json() : { orders: [] })) : Promise.resolve({ orders: [] }),
      userRole === 'vendor-food' ? fetch('/api/vendor/menu-items').then((r) => (r.ok ? r.json() : { items: [] })) : Promise.resolve({ items: [] }),
      userRole === 'vendor-laundry' ? fetch('/api/vendor/laundry-orders').then((r) => (r.ok ? r.json() : { orders: [] })) : Promise.resolve({ orders: [] }),
    ]).then(([shopRes, foodOrdRes, menuRes, laundryOrdRes]) => {
      const shops = shopRes as { food_stalls: FoodStall[]; laundry_shops: LaundryShop[] }
      setFoodStalls(shops.food_stalls ?? [])
      setLaundryShops(shops.laundry_shops ?? [])
      setFoodOrders((foodOrdRes as { orders: FoodOrder[] }).orders ?? [])
      setMenuItems(((menuRes as { items: { name: string; price: number }[] }).items ?? []).map((m) => ({ name: m.name, price: m.price })))
      setLaundryOrders((laundryOrdRes as { orders: LaundryOrder[] }).orders ?? [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [userRole])

  const handleLaundryStatusUpdate = async (id: number, nextStatus: 'washing' | 'cancelled') => {
    const res = await fetch(`/api/vendor/laundry-orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    })
    if (!res.ok) return
    const data = await res.json().catch(() => null)
    const appliedStatus = String(data?.status || nextStatus)
    setLaundryOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: appliedStatus } : o)))
  }

  const hasFood = foodStalls.length > 0
  const hasLaundry = laundryShops.length > 0
  const hasShops = hasFood || hasLaundry

  const today = new Date().toISOString().slice(0, 10)
  const foodToday = foodOrders.filter((o) => o.created_at?.slice(0, 10) === today)
  const laundryToday = laundryOrders.filter((o) => o.created_at?.slice(0, 10) === today)
  const todayOrderCount = foodToday.length + laundryToday.length
  const pendingCount =
    foodOrders.filter((o) => !['completed', 'cancelled'].includes(o.status)).length +
    laundryOrders.filter((o) => {
      const normalized = normalizeLaundryStatus(o.status)
      return normalized !== 'completed' && normalized !== 'cancelled'
    }).length
  const todayRevenue =
    foodToday.reduce((s, o) => s + (Number(o.total_amount) || 0), 0) +
    laundryToday.reduce((s, o) => s + (Number(o.total ?? o.total_amount ?? 0) || 0), 0)
  const weekRevenue = foodOrders
    .filter((o) => {
      const d = new Date(o.created_at).getTime()
      return d > Date.now() - 7 * 24 * 60 * 60 * 1000
    })
    .reduce((s, o) => s + (Number(o.total_amount) || 0), 0)
    + laundryOrders
      .filter((o) => {
        const d = new Date(o.created_at).getTime()
        return d > Date.now() - 7 * 24 * 60 * 60 * 1000
      })
      .reduce((s, o) => s + (Number(o.total ?? o.total_amount ?? 0) || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!hasShops) {
    return (
      <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
        <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No Shops Registered</h2>
        <p className="text-gray-500 max-w-md mx-auto">
          Your account ({userName}) has no food stalls or laundry shops linked. Contact your campus admin to register your business using your login email.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Package} label="Today's Orders" value={String(todayOrderCount)} color="bg-blue-500" />
        <StatCard icon={Clock} label="Pending" value={String(pendingCount)} color="bg-yellow-500" />
        <StatCard icon={DollarSign} label="Today's Revenue" value={`RS ${todayRevenue.toLocaleString()}`} color="bg-green-500" />
        <StatCard icon={TrendingUp} label="This Week" value={`RS ${weekRevenue.toLocaleString()}`} color="bg-emerald-500" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {hasFood && (
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Utensils size={20} className="text-amber-500" /> Food Stall – Active Orders
              </h2>
              <Link href="/vendor/orders" className="text-sm text-primary hover:text-primary/80 flex items-center gap-1">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              Your shops: {foodStalls.map((s) => s.shop_name).join(', ')}
            </p>
            <div className="space-y-3">
              {foodOrders.slice(0, 5).filter((o) => !['completed', 'cancelled'].includes(o.status)).map((o) => {
                let itemsStr = '—'
                try {
                  const arr = o.items ? JSON.parse(o.items) : []
                  itemsStr = Array.isArray(arr) ? arr.map((i: { name: string; quantity?: number }) => `${i.name}${(i.quantity ?? 1) > 1 ? ` x${i.quantity ?? 1}` : ''}`).join(', ') : '—'
                } catch { /* ignore */ }
                return (
                  <OrderCard key={o.id} id={`#ORD-${o.id}`} items={itemsStr} customer={o.customer_name} time={timeAgo(o.created_at)} status={o.status as 'new' | 'preparing' | 'ready'} />
                )
              })}
              {foodOrders.filter((o) => !['completed', 'cancelled'].includes(o.status)).length === 0 && (
                <p className="text-sm text-gray-500 py-4">No active orders</p>
              )}
            </div>
          </div>
        )}

        {hasLaundry && !hasFood && (
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Truck size={20} className="text-blue-500" /> Laundry Shop – Active Orders
              </h2>
              <Link href="/vendor/laundry/orders" className="text-sm text-primary hover:text-primary/80 flex items-center gap-1">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              Your shops: {laundryShops.map((s) => s.shop_name).join(', ')}
            </p>
            <div className="space-y-3">
              {laundryOrders.slice(0, 5).filter((o) => {
                const normalized = normalizeLaundryStatus(o.status)
                return normalized !== 'completed' && normalized !== 'cancelled'
              }).map((o) => (
                <OrderCard
                  key={o.id}
                  id={`#LND-${o.id}`}
                  items={o.items_description || `${o.service || 'Laundry'} (${o.items_count ?? 1} items)`}
                  customer={o.customer_name}
                  time={timeAgo(o.created_at)}
                  status={(normalizeLaundryStatus(o.status) === 'ready' ? 'ready' : normalizeLaundryStatus(o.status) === 'preparing' ? 'preparing' : 'new') as 'new' | 'preparing' | 'ready'}
                  onAccept={normalizeLaundryStatus(o.status) === 'new' ? () => handleLaundryStatusUpdate(o.id, 'washing') : undefined}
                  onReject={normalizeLaundryStatus(o.status) === 'new' ? () => handleLaundryStatusUpdate(o.id, 'cancelled') : undefined}
                />
              ))}
              {laundryOrders.filter((o) => {
                const normalized = normalizeLaundryStatus(o.status)
                return normalized !== 'completed' && normalized !== 'cancelled'
              }).length === 0 && (
                <p className="text-sm text-gray-500 py-4">No active orders</p>
              )}
            </div>
          </div>
        )}

        {hasFood && hasLaundry && (
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Businesses</h2>
            <div className="space-y-3">
              {foodStalls.map((s) => (
                <Link key={s.id} href="/vendor/orders" className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                  <Utensils size={20} className="text-amber-600" />
                  <span className="font-medium text-gray-900">{s.shop_name}</span>
                  <ArrowRight size={16} className="text-gray-400 ml-auto" />
                </Link>
              ))}
              {laundryShops.map((s) => (
                <Link key={s.id} href="/vendor/laundry/orders" className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
                  <Truck size={20} className="text-blue-600" />
                  <span className="font-medium text-gray-900">{s.shop_name}</span>
                  <ArrowRight size={16} className="text-gray-400 ml-auto" />
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              {hasFood && <ActionButton href="/vendor/orders" label="Food Orders" icon={Package} />}
              {hasLaundry && <ActionButton href="/vendor/laundry/orders" label="Laundry Orders" icon={Truck} />}
              {hasFood && <ActionButton href="/vendor/products" label="Manage Menu" icon={Plus} />}
              <ActionButton href="/vendor/my-store" label="Store Settings" icon={Store} />
              <ActionButton href="/vendor/sales-analytics" label="View Analytics" icon={TrendingUp} />
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Store Status</h2>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-green-700">Store is Open</span>
              </div>
              <button type="button" className="text-xs text-green-700 hover:underline">Change</button>
            </div>
          </div>
        </div>
      </div>

      {hasFood && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Popular Items Today</h2>
            <Link href="/vendor/products" className="text-sm text-primary hover:text-primary/80 flex items-center gap-1">
              Manage menu <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {menuItems.slice(0, 4).map((m) => (
              <PopularItem key={m.name} name={m.name} orders={0} price={`RS ${Number(m.price).toLocaleString()}`} />
            ))}
            {menuItems.length === 0 && (
              <p className="col-span-2 text-sm text-gray-500 py-4">Add menu items in Products to see them here.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center mb-3`}>
        <Icon size={20} className="text-white" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  )
}

function OrderCard({
  id,
  items,
  customer,
  time,
  status,
  onAccept,
  onReject,
}: {
  id: string
  items: string
  customer: string
  time: string
  status: 'new' | 'preparing' | 'ready'
  onAccept?: () => void
  onReject?: () => void
}) {
  const config = {
    new: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'New' },
    preparing: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Preparing' },
    ready: { bg: 'bg-green-100', text: 'text-green-700', label: 'Ready' },
  }[status]
  return (
    <div className="p-4 rounded-xl border border-gray-200">
      <div className="flex justify-between mb-2">
        <span className="font-semibold text-gray-900">{id}</span>
        <span className={`text-xs px-2 py-1 rounded-full ${config.bg} ${config.text}`}>{config.label}</span>
      </div>
      <p className="text-sm text-gray-600 mb-2">{items}</p>
      <div className="flex justify-between text-sm text-gray-500">
        <span>{customer}</span>
        <span>{time}</span>
      </div>
      {status === 'new' && (
        <div className="flex gap-2 mt-3">
          <button type="button" onClick={onAccept} className="flex-1 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 flex items-center justify-center gap-1">
            <CheckCircle size={14} /> Accept
          </button>
          <button type="button" onClick={onReject} className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg">
            <XCircle size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

function ActionButton({ href, label, icon: Icon }: { href: string; label: string; icon: any }) {
  return (
    <Link href={href} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
      <Icon size={18} className="text-gray-600" />
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </Link>
  )
}

function PopularItem({ name, orders, price }: { name: string; orders: number; price: string }) {
  return (
    <div className="p-4 rounded-xl bg-gray-50 text-center">
      <p className="font-medium text-gray-900">{name}</p>
      <p className="text-sm text-gray-500 mt-1">{orders} orders</p>
      <p className="text-sm font-semibold text-green-600 mt-1">{price}</p>
    </div>
  )
}
