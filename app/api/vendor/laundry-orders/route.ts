import { NextRequest, NextResponse } from 'next/server'
import { verifyRole } from '@/lib/auth.server'
import { createClient } from '@/lib/supabase/server'

function isValidSriLankaPhone(value: unknown): boolean {
  const digits = String(value ?? '').replace(/[^\d]/g, '')
  return /^0(7\d{8}|1\d{8}|2\d{8})$/.test(digits) || /^94(7\d{8}|1\d{8}|2\d{8})$/.test(digits)
}

function buildOrderRef() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const t = String(now.getTime()).slice(-6)
  return `LND-${y}${m}${d}-${t}`
}

/** GET /api/vendor/laundry-orders — laundry orders for vendor's shops (vendor-laundry only) */
export async function GET() {
  try {
    const user =
      (await verifyRole('vendor-laundry')) ||
      (await verifyRole('vendor'))
    if (!user) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    const email = user.email?.toLowerCase()
    if (!email) return NextResponse.json({ orders: [] })

    const client = await createClient()
    const { data: shops } = await client.from('laundry_shops').select('id').eq('owner_email', email)
    const shopIds = (shops ?? []).map((s) => s.id)
    if (shopIds.length === 0) return NextResponse.json({ orders: [] })

    const { data } = await client
      .from('laundry_orders')
      .select('*')
      .in('laundry_shop_id', shopIds)
      .order('created_at', { ascending: false })

    return NextResponse.json({ orders: data ?? [] })
  } catch (e) {
    console.error('Vendor laundry-orders GET error:', e)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

/** POST /api/vendor/laundry-orders — create order (vendor creates on behalf of customer) */
export async function POST(request: NextRequest) {
  try {
    const user = await verifyRole('vendor-laundry')
    if (!user) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    const email = user.email?.toLowerCase()
    if (!email) return NextResponse.json({ message: 'No email' }, { status: 400 })

    const body = await request.json()
    const {
      laundry_shop_id,
      customer_name,
      customer_phone,
      items_description,
      total,
      pickup_address,
      delivery_address,
      notes,
      // Backward-compatible input aliases from older UI:
      service,
      items_count,
      total_amount,
      address,
    } = body

    if (!customer_name || !String(customer_name).trim()) {
      return NextResponse.json({ message: 'Customer name is required' }, { status: 400 })
    }
    if (!isValidSriLankaPhone(customer_phone)) {
      return NextResponse.json({ message: 'Invalid Sri Lankan phone number' }, { status: 400 })
    }
    const resolvedItemsDescription =
      String(items_description ?? '').trim() ||
      `${String(service ?? 'Laundry').trim()} (${parseInt(String(items_count ?? 1), 10) || 1} kg)`
    if (!resolvedItemsDescription) {
      return NextResponse.json({ message: 'Items description is required' }, { status: 400 })
    }

    const resolvedDeliveryAddress = String(delivery_address ?? address ?? '').trim()
    const resolvedPickupAddress = String(pickup_address ?? address ?? '').trim()
    if (!resolvedDeliveryAddress) return NextResponse.json({ message: 'Delivery address is required' }, { status: 400 })
    if (!resolvedPickupAddress) return NextResponse.json({ message: 'Pickup address is required' }, { status: 400 })

    const resolvedTotal = total != null ? parseFloat(String(total)) : (total_amount != null ? parseFloat(String(total_amount)) : 0)
    if (!Number.isFinite(resolvedTotal) || resolvedTotal < 0) {
      return NextResponse.json({ message: 'Invalid total amount' }, { status: 400 })
    }

    const client = await createClient()
    const { data: shop } = await client.from('laundry_shops').select('id').eq('id', laundry_shop_id).eq('owner_email', email).single()
    if (!shop) return NextResponse.json({ message: 'Shop not found or not yours' }, { status: 400 })

    const { data, error } = await client
      .from('laundry_orders')
      .insert({
        laundry_shop_id,
        order_ref: buildOrderRef(),
        customer_name: String(customer_name || '').trim() || 'Customer',
        customer_phone: customer_phone ? String(customer_phone).trim() : null,
        items_description: resolvedItemsDescription,
        total: resolvedTotal,
        status: 'pending',
        pickup_address: resolvedPickupAddress,
        delivery_address: resolvedDeliveryAddress,
        notes: notes ? String(notes).trim() : null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ message: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (e) {
    console.error('Vendor laundry-orders POST error:', e)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
