import { NextRequest, NextResponse } from 'next/server'
import { verifyRole } from '@/lib/auth.server'
import { createClient } from '@/lib/supabase/server'
import { isDeliveryServiceAvailable } from '@/lib/delivery-availability.server'
import { sendDialogSms } from '@/lib/dialog-sms.server'
import { normalizeSmsPhoneNumber } from '@/lib/student-phone.server'

/** PATCH /api/vendor/food-orders/[id] — update order status */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyRole('vendor-food')
    if (!user) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const numId = parseInt(id, 10)
    if (isNaN(numId)) return NextResponse.json({ message: 'Invalid ID' }, { status: 400 })

    const body = await request.json()
    const { status, delivery_type, delivery_address, map_link } = body
    const valid = ['new', 'preparing', 'ready', 'completed', 'cancelled']
    if (!status || !valid.includes(status)) return NextResponse.json({ message: 'Invalid status' }, { status: 400 })

    const client = await createClient()
    const { data: order } = await client
      .from('food_orders')
      .select('id, food_stall_id, notes, customer_phone, customer_name, order_ref')
      .eq('id', numId)
      .single()
    if (!order) return NextResponse.json({ message: 'Not found' }, { status: 404 })

    const { data: stall } = await client.from('food_stalls').select('id').eq('id', order.food_stall_id).eq('owner_email', user.email?.toLowerCase()).single()
    if (!stall) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    const updates: Record<string, unknown> = { status }

    // On vendor confirm-delivery step, require explicit pickup/delivery choice
    if (status === 'completed') {
      if (delivery_type !== 'pickup' && delivery_type !== 'delivery') {
        return NextResponse.json({ message: 'Choose pickup or delivery.' }, { status: 400 })
      }

      const cleanedAddress = delivery_address ? String(delivery_address).trim() : ''
      const cleanedMapLink = map_link ? String(map_link).trim() : ''
      const noteLines: string[] = []
      noteLines.push(`Type: ${delivery_type}`)
      if (cleanedAddress) noteLines.push(`Location: ${cleanedAddress}`)
      if (cleanedMapLink) noteLines.push(`Map: ${cleanedMapLink}`)
      const baseNotes = order.notes ? String(order.notes).trim() : ''
      updates.notes = [baseNotes, noteLines.join(' | ')].filter(Boolean).join('\n')
      if (cleanedAddress) updates.delivery_address = cleanedAddress

      if (delivery_type === 'delivery') {
        if (!cleanedAddress) {
          return NextResponse.json({ message: 'Delivery location is required.' }, { status: 400 })
        }

        const deliveryAvailable = await isDeliveryServiceAvailable(client)
        if (!deliveryAvailable) {
          return NextResponse.json({ message: 'Delivery not available' }, { status: 409 })
        }

        // Notification entry for delivery audience so delivery admin can assign riders.
        await client.from('announcements').insert({
          title: `New delivery request (${numId})`,
          body: `Order #ORD-${numId} is ready for delivery assignment${cleanedAddress ? `. Drop: ${cleanedAddress}` : ''}${cleanedMapLink ? `. Map: ${cleanedMapLink}` : ''}`,
          target_audience: 'delivery',
          created_by: user.id,
        })
      }
    }

    const { error } = await client.from('food_orders').update(updates).eq('id', numId)
    if (error) return NextResponse.json({ message: error.message }, { status: 400 })

    // Notify customer for key decision states.
    if (status === 'preparing' || status === 'cancelled') {
      const smsPhone = normalizeSmsPhoneNumber(order.customer_phone)
      if (smsPhone) {
        const orderRef = String(order.order_ref || `ORD-${numId}`)
        const smsText = status === 'preparing'
          ? `UniLife: Your food order (${orderRef}) is confirmed and now being prepared.`
          : `UniLife: Your food order (${orderRef}) was cancelled by the stall. Please place a new order if needed.`

        void sendDialogSms({
          number: smsPhone,
          text: smsText,
          clientRef: `RPOSbyUpview_UniLife_food_${numId}_${status}`,
        }).then((result) => {
          if (!result.ok || result.gatewayReportedError) {
            const hint = result.gatewayErrorHint || JSON.stringify(result.body).slice(0, 200)
            console.warn('[Food Order SMS]', hint)
          }
        })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Vendor food-orders PATCH error:', e)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
