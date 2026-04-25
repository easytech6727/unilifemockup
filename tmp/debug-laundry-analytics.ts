import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const envPath = path.join(process.cwd(), '.env')
const envContent = fs.readFileSync(envPath, 'utf-8')
const envVars: Record<string, string> = {}
envContent.split('\n').forEach((line) => {
  const [key, value] = line.split('=')
  if (key && value) envVars[key.trim()] = value.trim()
})

const url = envVars['NEXT_PUBLIC_SUPABASE_URL']
const serviceKey = envVars['SUPABASE_SERVICE_ROLE_KEY']
const anonKey = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY']
const client = createClient(url!, serviceKey || anonKey!)

async function main() {
  console.log('=== Laundry Analytics Debug ===')

  const { data: laundryUsers, error: userErr } = await client
    .from('users')
    .select('id, name, email, role')
    .eq('role', 'vendor-laundry')

  if (userErr) {
    console.error('Users query error:', userErr)
    return
  }

  console.log('Laundry users:', laundryUsers)

  const { data: shops, error: shopErr } = await client
    .from('laundry_shops')
    .select('id, shop_name, owner_email')

  if (shopErr) {
    console.error('Laundry shops query error:', shopErr)
    return
  }

  console.log('Laundry shops:', shops)

  for (const u of laundryUsers || []) {
    const email = String(u.email || '').trim().toLowerCase()
    const owned = (shops || []).filter((s) => String(s.owner_email || '').trim().toLowerCase() === email)

    console.log(`\nUser ${u.name} <${u.email}> owns ${owned.length} laundry shop(s)`)
    if (owned.length === 0) {
      console.log('  -> No matching shop owner_email; analytics will be empty')
      continue
    }

    const shopIds = owned.map((s) => s.id)
    const { data: orders, error: ordErr } = await client
      .from('laundry_orders')
      .select('*')
      .in('laundry_shop_id', shopIds)

    if (ordErr) {
      console.error('Orders query error:', ordErr)
      continue
    }

    const count = (orders || []).length
    const revenue = (orders || []).reduce((sum, o) => sum + (Number((o as any).total ?? (o as any).total_amount ?? 0) || 0), 0)
    console.log(`  -> Orders: ${count}, Revenue: RS ${revenue}`)
    if (count > 0) {
      console.log('  -> Sample order:', orders![0])
    }
  }
}

main().catch((e) => console.error(e))
