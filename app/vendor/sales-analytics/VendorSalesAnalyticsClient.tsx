'use client'

import { useState, useEffect, useCallback } from 'react'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { TrendingUp, DollarSign, Package, Users, RefreshCw, Clock } from 'lucide-react'
import { UserRole } from '@/lib/auth'

interface VendorSalesAnalyticsClientProps {
  user: { id: number; auth_id: string; name: string; email: string; role: UserRole; avatar_url?: string }
}

const iconMap = { DollarSign, Package, TrendingUp, Users }

const statusColors: Record<string, string> = {
  completed: 'bg-green-500',
  delivered: 'bg-green-500',
  done: 'bg-green-500',
  preparing: 'bg-amber-500',
  washing: 'bg-amber-500',
  ironing: 'bg-amber-500',
  in_progress: 'bg-amber-500',
  processing: 'bg-amber-500',
  ready: 'bg-blue-500',
  ready_for_delivery: 'bg-blue-500',
  out_for_delivery: 'bg-blue-500',
  pending: 'bg-blue-500',
  new: 'bg-blue-500',
  confirmed: 'bg-blue-500',
  accepted: 'bg-blue-500',
  cancelled: 'bg-red-500',
  canceled: 'bg-red-500',
  rejected: 'bg-red-500',
}

export default function VendorSalesAnalyticsClient({ user }: VendorSalesAnalyticsClientProps) {
  const [stats, setStats] = useState<{ label: string; value: string; change: string; color: string; bg: string; icon: string }[]>([])
  const [chartData, setChartData] = useState<{ day: string; revenue: number; orders: number }[]>([])
  const [topProducts, setTopProducts] = useState<{ name: string; sales: number; revenue: number }[]>([])
  const [statusDistribution, setStatusDistribution] = useState<{ label: string; count: number; pct: number }[]>([])
  const [shopType, setShopType] = useState<'food' | 'laundry' | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(5000) // 5 seconds default

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    try {
      setRefreshing(true)
      console.log('🔄 Fetching analytics...')
      const res = await fetch('/api/vendor/analytics', { cache: 'no-store' })
      
      if (!res.ok) {
        console.error('❌ API Error:', res.status, res.statusText)
        const errorData = await res.json()
        console.error('Error details:', errorData)
        setRefreshing(false)
        setLoading(false)
        return
      }
      
      const data = await res.json()
      console.log('✅ Analytics data received:', data)
      
      if (data.stats) {
        console.log('Stats:', data.stats)
        setStats(data.stats)
      } else {
        console.warn('⚠️ No stats in response')
      }
      
      if (data.chartData) {
        console.log('Chart data:', data.chartData)
        setChartData(data.chartData)
      }
      if (data.topProducts) {
        console.log('Top products:', data.topProducts)
        setTopProducts(data.topProducts)
      }
      if (data.statusDistribution) {
        console.log('Status distribution:', data.statusDistribution)
        setStatusDistribution(data.statusDistribution)
      }
      if (data.shopType === 'food' || data.shopType === 'laundry') setShopType(data.shopType)
      
      setLastUpdated(new Date())
    } catch (e) {
      console.error('❌ Analytics fetch error:', e)
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchAnalytics()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchAnalytics])

  // Format last updated time
  const getTimeAgo = () => {
    if (!lastUpdated) return 'Never'
    const now = new Date()
    const diff = Math.floor((now.getTime() - lastUpdated.getTime()) / 1000)
    
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    return `${Math.floor(diff / 3600)}h ago`
  }

  const maxRevenue = chartData.length ? Math.max(...chartData.map((d) => d.revenue), 1) : 1

  if (loading) {
    return (
      <DashboardLayout user={user}>
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-gray-500">Loading analytics...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header with refresh controls */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sales & Analysis</h1>
            <p className="text-gray-500 mt-1">
              {shopType === 'laundry'
                ? 'Track laundry revenue, order flow, and top services from your shop'
                : 'Track revenue, orders, and performance from your store'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Auto-refresh toggle */}
            <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-2">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-3 py-1.5 rounded font-medium text-sm transition ${
                  autoRefresh
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {autoRefresh ? '🔴 Live' : '⊘ Off'}
              </button>
              
              {/* Refresh interval selector */}
              {autoRefresh && (
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="px-2 py-1.5 text-sm border border-gray-200 rounded bg-white"
                >
                  <option value={3000}>3s</option>
                  <option value={5000}>5s</option>
                  <option value={10000}>10s</option>
                  <option value={30000}>30s</option>
                  <option value={60000}>1m</option>
                </select>
              )}
            </div>
            
            {/* Manual refresh button */}
            <button
              onClick={() => fetchAnalytics()}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition font-medium"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Last updated indicator */}
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 rounded-lg p-3">
          <Clock className="w-4 h-4" />
          <span>
            Last updated: <span className="font-medium">{getTimeAgo()}</span>
            {autoRefresh && <span className="ml-2 text-green-600">• Auto-refreshing every {refreshInterval / 1000}s</span>}
          </span>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => {
            const Icon = iconMap[s.icon as keyof typeof iconMap] ?? DollarSign
            return (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition">
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  {s.change && <span className={`text-sm font-medium ${s.color}`}>{s.change}</span>}
                </div>
                <p className="mt-3 text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-sm text-gray-500">{s.label}</p>
              </div>
            )
          })}
        </div>

        {/* Weekly Revenue Chart */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-6">Weekly Revenue</h3>
          <div className="flex items-end gap-2 h-48">
            {chartData.length ? (
              chartData.map((d) => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full bg-primary/80 rounded-t-lg transition-all hover:bg-primary min-h-[4px]"
                    style={{ height: `${(d.revenue / maxRevenue) * 100}%` }}
                    title={`${d.day}: RS ${d.revenue.toLocaleString()} (${d.orders} orders)`}
                  />
                  <span className="text-xs text-gray-500">{d.day}</span>
                  <span className="text-xs font-medium text-gray-700">
                    {d.revenue >= 1000 ? `RS ${(d.revenue / 1000).toFixed(1)}k` : `RS ${d.revenue}`}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 col-span-full">No revenue data for this week</p>
            )}
          </div>
        </div>

        {/* Top Products & Status Distribution */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">{shopType === 'laundry' ? 'Top Laundry Services This Week' : 'Top Products This Week'}</h3>
            <div className="space-y-3">
              {topProducts.length ? (
                topProducts.map((p, i) => (
                  <div
                    key={p.name}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 px-2 rounded transition"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-gray-400 font-mono w-6 text-center">{i + 1}</span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.sales} sale{p.sales !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <span className="text-primary font-semibold">RS {p.revenue.toLocaleString()}</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">{shopType === 'laundry' ? 'No laundry orders yet' : 'No product sales yet'}</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Order Status Distribution</h3>
            <div className="space-y-4">
              {statusDistribution.length ? (
                statusDistribution.map((s) => (
                  <div key={s.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize font-medium text-gray-900">{s.label}</span>
                      <span className="text-gray-600">
                        {s.count} <span className="text-gray-400">({s.pct}%)</span>
                      </span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${statusColors[s.label.toLowerCase()] ?? 'bg-gray-400'} rounded-full transition-all`}
                        style={{ width: `${s.pct}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No orders yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
