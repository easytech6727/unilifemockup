import { NextRequest, NextResponse } from 'next/server'
import { verifyRole } from '@/lib/auth.server'
import { createClient } from '@/lib/supabase/server'

/** GET /api/vendor/food-orders — food orders for vendor's stalls (optionally filtered by stall) */
export async function GET(request: NextRequest) {
  try {
    const user =
      (await verifyRole('vendor-food')) ||
      (await verifyRole('vendor'))
    if (!user) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    const email = user.email?.toLowerCase()
    if (!email) return NextResponse.json({ orders: [] })

    const client = await createClient()
    const { data: stalls } = await client.from('food_stalls').select('id').eq('owner_email', email)
    const stallIds = (stalls ?? []).map((s) => s.id)
    if (stallIds.length === 0) return NextResponse.json({ orders: [] })

    const requestedStallId = Number(request.nextUrl.searchParams.get('food_stall_id') || '')
    const hasRequestedStall = Number.isFinite(requestedStallId) && requestedStallId > 0
    const scopedStallIds = hasRequestedStall
      ? stallIds.filter((id) => id === requestedStallId)
      : stallIds
    if (scopedStallIds.length === 0) return NextResponse.json({ orders: [] })

    const { data } = await client
      .from('food_orders')
      .select('*')
      .in('food_stall_id', scopedStallIds)
      .order('created_at', { ascending: false })

    return NextResponse.json({ orders: data ?? [] })
  } catch (e) {
    console.error('Vendor food-orders GET error:', e)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

/** POST /api/vendor/food-orders — create order */
export async function POST(request: NextRequest) {
  try {
    const user = await verifyRole('vendor-food')
    if (!user) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    const email = user.email?.toLowerCase()
    if (!email) return NextResponse.json({ message: 'No email' }, { status: 400 })

    const body = await request.json()
    const { food_stall_id, customer_name, customer_phone, items, total, delivery_type, delivery_address, map_link, notes } = body

    const client = await createClient()
    const { data: stall } = await client.from('food_stalls').select('id').eq('id', food_stall_id).eq('owner_email', email).single()
    if (!stall) return NextResponse.json({ message: 'Stall not found or not yours' }, { status: 400 })

    const cleanedCustomer = String(customer_name || '').trim()
    const cleanedPhone = String(customer_phone || '').trim()
    const cleanedAddress = String(delivery_address || '').trim()
    const cleanedMapLink = String(map_link || '').trim()
    const deliveryType = delivery_type === 'pickup' ? 'pickup' : 'delivery'
    const parsedItems = Array.isArray(items) ? items : []
    const parsedTotal = total != null ? parseFloat(String(total)) : NaN

    if (cleanedCustomer.length < 2) {
      return NextResponse.json({ message: 'Customer name must be at least 2 characters.' }, { status: 400 })
    }
    if (!/^[+0-9][0-9\s-]{6,19}$/.test(cleanedPhone)) {
      return NextResponse.json({ message: 'Enter a valid customer phone number.' }, { status: 400 })
    }
    if (deliveryType === 'delivery' && cleanedAddress.length < 4) {
      return NextResponse.json({ message: 'Delivery location must be at least 4 characters.' }, { status: 400 })
    }
    if (cleanedMapLink && !/^https?:\/\/\S+$/i.test(cleanedMapLink)) {
      return NextResponse.json({ message: 'Map link must be a valid URL.' }, { status: 400 })
    }
    if (parsedItems.length === 0) {
      return NextResponse.json({ message: 'Add at least one item to create an order.' }, { status: 400 })
    }
    const hasInvalidItem = parsedItems.some((it) => {
      if (!it || typeof it !== 'object') return true
      const o = it as Record<string, unknown>
      return (
        typeof o.name !== 'string' ||
        !o.name.trim() ||
        typeof o.quantity !== 'number' ||
        o.quantity <= 0 ||
        typeof o.price !== 'number' ||
        o.price < 0
      )
    })
    if (hasInvalidItem) {
      return NextResponse.json({ message: 'Order items are invalid.' }, { status: 400 })
    }
    if (!Number.isFinite(parsedTotal) || parsedTotal <= 0) {
      return NextResponse.json({ message: 'Order total must be greater than 0.' }, { status: 400 })
    }

    const typeNote = `Type: ${deliveryType}${cleanedMapLink ? ` | Map: ${cleanedMapLink}` : ''}`
    const { data, error } = await client
      .from('food_orders')
      .insert({
        food_stall_id,
        customer_name: cleanedCustomer,
        customer_phone: cleanedPhone,
        items: parsedItems,
        total: parsedTotal,
        status: 'new',
        delivery_address: cleanedAddress || null,
        notes: [notes ? String(notes).trim() : '', typeNote].filter(Boolean).join('\n'),
      })
      .select()
      .single()

    if (error) return NextResponse.json({ message: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (e) {
    console.error('Vendor food-orders POST error:', e)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
