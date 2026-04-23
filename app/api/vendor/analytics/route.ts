import { NextResponse } from 'next/server'
import { verifyRole } from '@/lib/auth.server'
import { createClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase/admin'

/** GET /api/vendor/analytics — real sales stats for vendor (food or laundry) */
export async function GET() {
  try {
    const user = await verifyRole('vendor')
    if (!user) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const email = user.email?.toLowerCase()
    if (!email) return NextResponse.json({ stats: [], chartData: [], topProducts: [], statusDistribution: [] })

    let client: Awaited<ReturnType<typeof createClient>>
    try {
      // Prefer admin client to avoid RLS-related read failures in analytics.
      client = getAdminClient() as unknown as Awaited<ReturnType<typeof createClient>>
    } catch {
      client = await createClient()
    }
    const today = new Date().toISOString().slice(0, 10)

    let stallIds: Array<number | string> = []
    let shopIds: Array<number | string> = []
    let shouldUseFood = false
    let shouldUseLaundry = false

    if (user.role === 'vendor-food') {
      const { data: foodStalls, error: foodStallsError } = await client
        .from('food_stalls')
        .select('id')
        .ilike('owner_email', email)

      if (foodStallsError) {
        return NextResponse.json({ stats: [], chartData: [], topProducts: [], statusDistribution: [], message: foodStallsError.message })
      }

      stallIds = (foodStalls ?? []).map((s) => s.id)
      shouldUseFood = true
    } else if (user.role === 'vendor-laundry') {
      const { data: laundryShops, error: laundryShopsError } = await client
        .from('laundry_shops')
        .select('id')
        .ilike('owner_email', email)

      if (laundryShopsError) {
        return NextResponse.json({ stats: [], chartData: [], topProducts: [], statusDistribution: [], message: laundryShopsError.message })
      }

      shopIds = (laundryShops ?? []).map((s) => s.id)
      shouldUseLaundry = true
    } else {
      // Generic vendor fallback: attempt both lookups, prefer food when both exist.
      const { data: foodStalls, error: foodStallsError } = await client
        .from('food_stalls')
        .select('id')
        .ilike('owner_email', email)

      const { data: laundryShops, error: laundryShopsError } = await client
        .from('laundry_shops')
        .select('id')
        .ilike('owner_email', email)

      if (foodStallsError && laundryShopsError) {
        return NextResponse.json({
          stats: [],
          chartData: [],
          topProducts: [],
          statusDistribution: [],
          message: foodStallsError.message || laundryShopsError.message,
        })
      }

      stallIds = (foodStalls ?? []).map((s) => s.id)
      shopIds = (laundryShops ?? []).map((s) => s.id)

      shouldUseFood = stallIds.length > 0
      shouldUseLaundry = !shouldUseFood && shopIds.length > 0
    }

    if (shouldUseFood) {
      if (stallIds.length === 0) {
        return NextResponse.json({
          stats: [],
          chartData: [],
          topProducts: [],
          statusDistribution: [],
          shopType: 'food',
        })
      }

      const { data: allOrders, error: orderError } = await client
        .from('food_orders')
        .select('*')
        .in('food_stall_id', stallIds)

      if (orderError) {
        return NextResponse.json({ stats: [], chartData: [], topProducts: [], statusDistribution: [], shopType: 'food', message: orderError.message })
      }

      const orders = allOrders ?? []
      const getFoodAmount = (o: { total?: number | null; total_amount?: number | null }) => Number(o.total ?? o.total_amount ?? 0) || 0
      const todayOrders = orders.filter((o) => String(o.created_at).slice(0, 10) === today)
      const todayRevenue = todayOrders.reduce((s, o) => s + getFoodAmount(o), 0)
      const avgOrderValue = orders.length > 0 ? orders.reduce((s, o) => s + getFoodAmount(o), 0) / orders.length : 0

      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - 7)
      const weekOrders = orders.filter((o) => new Date(o.created_at) >= weekStart)
      const weekRevenue = weekOrders.reduce((s, o) => s + getFoodAmount(o), 0)

      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const chartData: { day: string; revenue: number; orders: number }[] = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dayStr = d.toISOString().slice(0, 10)
        const dayOrders = orders.filter((o) => String(o.created_at).slice(0, 10) === dayStr)
        chartData.push({
          day: dayNames[d.getDay()],
          revenue: dayOrders.reduce((s, o) => s + getFoodAmount(o), 0),
          orders: dayOrders.length,
        })
      }

      const statusCounts: Record<string, number> = {}
      orders.forEach((o) => {
        const st = o.status || 'new'
        statusCounts[st] = (statusCounts[st] ?? 0) + 1
      })
      const total = orders.length
      const statusDistribution = Object.entries(statusCounts).map(([label, count]) => ({
        label,
        count,
        pct: total ? Math.round((count / total) * 100) : 0,
      }))

      const productSales: Record<string, { sales: number; revenue: number }> = {}
      orders.forEach((o) => {
        let items: { name?: string; price?: number; quantity?: number }[] = []
        try {
          items = o.items ? (typeof o.items === 'string' ? JSON.parse(o.items) : o.items) : []
        } catch {
          //
        }
        if (!Array.isArray(items)) items = []
        items.forEach((it) => {
          const n = it.name || 'Unknown'
          const qty = it.quantity ?? 1
          const price = Number(it.price) ?? 0
          if (!productSales[n]) productSales[n] = { sales: 0, revenue: 0 }
          productSales[n].sales += qty
          productSales[n].revenue += price * qty
        })
      })
      const topProducts = Object.entries(productSales)
        .map(([name, d]) => ({ name, sales: d.sales, revenue: d.revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)

      return NextResponse.json({
        stats: [
          { label: "Today's Revenue", value: `RS ${todayRevenue.toLocaleString()}`, change: '', color: 'text-green-600', bg: 'bg-green-100', icon: 'DollarSign' },
          { label: "Today's Orders", value: String(todayOrders.length), change: '', color: 'text-blue-600', bg: 'bg-blue-100', icon: 'Package' },
          { label: 'Avg Order Value', value: `RS ${avgOrderValue.toFixed(0)}`, change: '', color: 'text-purple-600', bg: 'bg-purple-100', icon: 'TrendingUp' },
          { label: 'Weekly Revenue', value: `RS ${weekRevenue.toLocaleString()}`, change: '', color: 'text-amber-600', bg: 'bg-amber-100', icon: 'Users' },
        ],
        chartData,
        topProducts,
        statusDistribution,
        shopType: 'food',
      })
    }

    if (shouldUseLaundry) {
      if (shopIds.length === 0) {
        return NextResponse.json({
          stats: [],
          chartData: [],
          topProducts: [],
          statusDistribution: [],
          shopType: 'laundry',
        })
      }

      const { data: allOrders, error: orderError } = await client
        .from('laundry_orders')
        .select('*')
        .in('laundry_shop_id', shopIds)

      if (orderError) {
        return NextResponse.json({ stats: [], chartData: [], topProducts: [], statusDistribution: [], shopType: 'laundry', message: orderError.message })
      }

      const orders = allOrders ?? []
      const getAmount = (o: { total?: number | null; total_amount?: number | null }) => Number(o.total ?? o.total_amount ?? 0) || 0
      const todayOrders = orders.filter((o) => String(o.created_at).slice(0, 10) === today)
      const todayRevenue = todayOrders.reduce((s, o) => s + getAmount(o), 0)
      const avgOrderValue = orders.length > 0 ? orders.reduce((s, o) => s + getAmount(o), 0) / orders.length : 0

      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - 7)
      const weekOrders = orders.filter((o) => new Date(o.created_at) >= weekStart)
      const weekRevenue = weekOrders.reduce((s, o) => s + getAmount(o), 0)

      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const chartData: { day: string; revenue: number; orders: number }[] = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dayStr = d.toISOString().slice(0, 10)
        const dayOrders = orders.filter((o) => String(o.created_at).slice(0, 10) === dayStr)
        chartData.push({
          day: dayNames[d.getDay()],
          revenue: dayOrders.reduce((s, o) => s + getAmount(o), 0),
          orders: dayOrders.length,
        })
      }

      const statusCounts: Record<string, number> = {}
      orders.forEach((o) => {
        const st = o.status || 'new'
        statusCounts[st] = (statusCounts[st] ?? 0) + 1
      })
      const total = orders.length
      const statusDistribution = Object.entries(statusCounts).map(([label, count]) => ({
        label,
        count,
        pct: total ? Math.round((count / total) * 100) : 0,
      }))

      const serviceSales: Record<string, { sales: number; revenue: number }> = {}
      orders.forEach((o) => {
        const svc = (o.items_description && String(o.items_description).trim()) || (o.service && String(o.service).trim()) || 'Laundry'
        const amt = getAmount(o)
        if (!serviceSales[svc]) serviceSales[svc] = { sales: 0, revenue: 0 }
        serviceSales[svc].sales += 1
        serviceSales[svc].revenue += amt
      })
      const topProducts = Object.entries(serviceSales)
        .map(([name, d]) => ({ name, sales: d.sales, revenue: d.revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)

      return NextResponse.json({
        stats: [
          { label: "Today's Revenue", value: `RS ${todayRevenue.toLocaleString()}`, change: '', color: 'text-green-600', bg: 'bg-green-100', icon: 'DollarSign' },
          { label: "Today's Orders", value: String(todayOrders.length), change: '', color: 'text-blue-600', bg: 'bg-blue-100', icon: 'Package' },
          { label: 'Avg Order Value', value: `RS ${avgOrderValue.toFixed(0)}`, change: '', color: 'text-purple-600', bg: 'bg-purple-100', icon: 'TrendingUp' },
          { label: 'Weekly Revenue', value: `RS ${weekRevenue.toLocaleString()}`, change: '', color: 'text-amber-600', bg: 'bg-amber-100', icon: 'Users' },
        ],
        chartData,
        topProducts,
        statusDistribution,
        shopType: 'laundry',
      })
    }

    return NextResponse.json({ stats: [], chartData: [], topProducts: [], statusDistribution: [] })
  } catch (e) {
    console.error('Vendor analytics GET error:', e)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
