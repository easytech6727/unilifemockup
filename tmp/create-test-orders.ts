import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Load .env file
const envPath = path.join(process.cwd(), '.env')
const envContent = fs.readFileSync(envPath, 'utf-8')
const envVars: Record<string, string> = {}
envContent.split('\n').forEach((line) => {
  const [key, value] = line.split('=')
  if (key && value) {
    envVars[key.trim()] = value.trim()
  }
})

const url = envVars['NEXT_PUBLIC_SUPABASE_URL']
const key = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY']
const serviceKey = envVars['SUPABASE_SERVICE_ROLE_KEY']

console.log('Supabase URL:', url ? '✅ Found' : '❌ Missing')
console.log('Supabase Key:', key ? '✅ Found' : '❌ Missing')
console.log('Service Key:', serviceKey ? '✅ Found (will use for insert)' : '⚠️ Missing')

// Use service key if available for bypass RLS
const client = createClient(url!, serviceKey || key!)

async function createTestOrders() {
  try {
    console.log('\n=== Checking food_orders table structure ===')

    // Get table info
    const { data: tableInfo } = await client
      .from('food_orders')
      .select('*')
      .limit(1)

    console.log('Table structure (from sample row):', tableInfo ? Object.keys(tableInfo[0] || {}) : 'Empty table')

    // Try to get schema info
    const { data: schemaData } = await client
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'food_orders')

    if (schemaData) {
      console.log('\n📋 food_orders columns:')
      schemaData.forEach((col) => {
        console.log(`  - ${col.column_name} (${col.data_type})`)
      })
    }

    console.log('\n=== Creating Test Orders for Raja ===')

    // Get the Raja restaurant stall ID
    const { data: stalls } = await client
      .from('food_stalls')
      .select('id')
      .ilike('owner_email', 'raja@gmail.com')

    if (!stalls || stalls.length === 0) {
      console.error('❌ Raja stall not found')
      return
    }

    const stallId = stalls[0].id
    console.log(`✅ Found Raja stall ID: ${stallId}`)

    // Create sample orders for the last 7 days
    const orders = []
    const today = new Date()

    for (let i = 6; i >= 0; i--) {
      const orderDate = new Date()
      orderDate.setDate(today.getDate() - i)

      // 2-4 orders per day
      const ordersPerDay = Math.floor(Math.random() * 3) + 2

      for (let j = 0; j < ordersPerDay; j++) {
        const hour = Math.floor(Math.random() * 13) + 10 // 10 AM to 11 PM
        const minute = Math.floor(Math.random() * 60)

        const orderTime = new Date(orderDate)
        orderTime.setHours(hour, minute, 0)

        const status = 'new'  // Use simple 'new' status

        const items = [
          { name: 'Chicken Biryani', price: 450, quantity: 1 },
          { name: 'Mutton Curry with Rice', price: 520, quantity: 1 },
          { name: 'Butter Chicken', price: 480, quantity: 1 },
          { name: 'Fish Fry', price: 380, quantity: 1 },
          { name: 'Kottu Roti', price: 350, quantity: 1 },
          { name: 'Naan with Curry', price: 280, quantity: 1 },
        ]

        const itemCount = Math.floor(Math.random() * 3) + 1
        const selectedItems = []
        for (let k = 0; k < itemCount; k++) {
          selectedItems.push(items[Math.floor(Math.random() * items.length)])
        }

        const totalAmount = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

        orders.push({
          food_stall_id: stallId,
          customer_name: ['Uththa', 'Showmika', 'Sajjath', 'Ali', 'Ahmed'][Math.floor(Math.random() * 5)],
          customer_phone: '+94760869468',
          total: totalAmount,
          status,
          items: JSON.stringify(selectedItems),
          created_at: orderTime.toISOString(),
        })
      }
    }

    console.log(`\n📋 Creating ${orders.length} test orders...`)

    const { error } = await client.from('food_orders').insert(orders)

    if (error) {
      console.error('❌ Error inserting orders:', error)
    } else {
      console.log(`✅ Successfully created ${orders.length} test orders!`)

      // Show summary
      const dateGroups: Record<string, number> = {}
      orders.forEach((o) => {
        const date = o.created_at.split('T')[0]
        dateGroups[date] = (dateGroups[date] ?? 0) + 1
      })

      console.log('\n📊 Orders by date:')
      Object.entries(dateGroups)
        .sort()
        .forEach(([date, count]) => {
          console.log(`  ${date}: ${count} orders`)
        })

      console.log('\n💰 Total test revenue:', orders.reduce((sum, o) => sum + o.total, 0), 'RS')
      console.log('\n✨ Analytics page should now show real data!')
    }
  } catch (e) {
    console.error('Error:', e)
  }
}

createTestOrders()
