import { NextResponse } from 'next/server'
import { verifyRole } from '@/lib/auth.server'
import { createClient } from '@/lib/supabase/server'

/** GET /api/vendor/analytics — real sales stats for vendor (food or laundry) */
export async function GET() {
  try {
    const user = await verifyRole('vendor')
    console.log('📊 Analytics request - User:', user?.email, 'Role:', user?.role)
    
    if (!user) {
      console.error('❌ User verification failed')
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const email = user.email?.toLowerCase()
    if (!email) {
      console.warn('⚠️ No email found')
      return NextResponse.json({ stats: [], chartData: [], topProducts: [], statusDistribution: [] })
    }

    const client = await createClient()
    const today = new Date().toISOString().slice(0, 10)
    console.log('📅 Today:', today)

    if (user.role === 'vendor-food') {
      console.log('🍕 Food vendor detected, searching for stalls with email:', email)
      // Use case-insensitive matching
      const { data: stalls, error: stallError } = await client
        .from('food_stalls')
        .select('id')
        .ilike('owner_email', email)  // Changed to ilike for case-insensitive matching
      console.log('📍 Found stalls:', stalls?.length, 'Error:', stallError)
      
      const stallIds = (stalls ?? []).map((s) => s.id)
      if (stallIds.length === 0) {
        console.warn('⚠️ No food stalls found for vendor')
        return NextResponse.json({
          stats: [],
          chartData: [],
          topProducts: [],
          statusDistribution: [],
        })
      }

      const { data: allOrders, error: orderError } = await client
        .from('food_orders')
        .select('id, total, status, created_at, items')
        .in('food_stall_id', stallIds)

      console.log('🛒 Found orders:', allOrders?.length, 'Error:', orderError)

      const orders = allOrders ?? []
      const todayOrders = orders.filter((o) => String(o.created_at).slice(0, 10) === today)
      const todayRevenue = todayOrders.reduce((s, o) => s + (Number(o.total) || 0), 0)
      const avgOrderValue = orders.length > 0 ? orders.reduce((s, o) => s + (Number(o.total) || 0), 0) / orders.length : 0

      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - 7)
      const weekOrders = orders.filter((o) => new Date(o.created_at) >= weekStart)
      const weekRevenue = weekOrders.reduce((s, o) => s + (Number(o.total) || 0), 0)

      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const chartData: { day: string; revenue: number; orders: number }[] = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dayStr = d.toISOString().slice(0, 10)
        const dayOrders = orders.filter((o) => String(o.created_at).slice(0, 10) === dayStr)
        chartData.push({
          day: dayNames[d.getDay()],
          revenue: dayOrders.reduce((s, o) => s + (Number(o.total) || 0), 0),
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

      const response = {
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
      }
      console.log('✅ Returning food vendor response:', response)
      return NextResponse.json(response)
    }

    if (user.role === 'vendor-laundry') {
      console.log('🧺 Laundry vendor detected, searching for shops with email:', email)
      // Use case-insensitive matching
      const { data: shops, error: shopError } = await client
        .from('laundry_shops')
        .select('id')
        .ilike('owner_email', email)  // Changed to ilike for case-insensitive matching
      console.log('📍 Found laundry shops:', shops?.length, 'Error:', shopError)
      
      const shopIds = (shops ?? []).map((s) => s.id)
      if (shopIds.length === 0) {
        console.warn('⚠️ No laundry shops found for vendor')
        return NextResponse.json({
          stats: [],
          chartData: [],
          topProducts: [],
          statusDistribution: [],
        })
      }

      const { data: allOrders, error: orderError } = await client
        .from('laundry_orders')
        .select('id, total, status, created_at, service, items_description')
        .in('laundry_shop_id', shopIds)

      console.log('🛒 Found laundry orders:', allOrders?.length, 'Error:', orderError)

      const orders = allOrders ?? []
      const getAmount = (o: { total?: number | null }) => Number(o.total ?? 0) || 0
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

      const response = {
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
      }
      console.log('✅ Returning laundry vendor response:', response)
      return NextResponse.json(response)
    }

    console.warn('❌ Invalid vendor role:', user.role)
    return NextResponse.json({ stats: [], chartData: [], topProducts: [], statusDistribution: [] })
  } catch (e) {
    console.error('❌ Vendor analytics GET error:', e)
    return NextResponse.json({ message: 'Internal server error', error: String(e) }, { status: 500 })
  }
}
