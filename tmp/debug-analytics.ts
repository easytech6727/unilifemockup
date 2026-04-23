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

console.log('Supabase URL:', url ? '✅ Found' : '❌ Missing')
console.log('Supabase Key:', key ? '✅ Found' : '❌ Missing')

const client = createClient(url!, key!)

async function debugAnalytics() {
  try {
    console.log('\n=== ⚠️ FIXING EMAIL CASE MISMATCH ===')
    
    // Fix food stalls with case mismatch
    const { data: stalls, error: stallsError } = await client
      .from('food_stalls')
      .select('id, owner_email')
    
    if (stalls) {
      for (const stall of stalls) {
        const corrected = stall.owner_email.toLowerCase()
        if (stall.owner_email !== corrected) {
          console.log(`Fixing: "${stall.owner_email}" → "${corrected}"`)
          const { error } = await client
            .from('food_stalls')
            .update({ owner_email: corrected })
            .eq('id', stall.id)
          if (error) console.error('❌ Error updating:', error)
          else console.log('✅ Fixed!')
        }
      }
    }

    console.log('\n=== NOW CHECKING AGAIN ===')
    console.log('\n=== Searching for Raja Vendor ===')
    const { data: rajaUser } = await client
      .from('users')
      .select('*')
      .ilike('name', '%raja%')
      .or('email.ilike.%raja%')
    console.log('Raja user(s):', rajaUser)

    if (rajaUser && rajaUser.length > 0) {
      const email = rajaUser[0].email?.toLowerCase()
      console.log(`\n=== Orders for ${email} ===`)

      // Check food stalls for this email (now with lowercase)
      const { data: foodStallsForRaja } = await client
        .from('food_stalls')
        .select('*')
        .eq('owner_email', email)
      console.log('Food stalls for Raja:', foodStallsForRaja)

      if (foodStallsForRaja && foodStallsForRaja.length > 0) {
        const stallIds = foodStallsForRaja.map((s) => s.id)
        const { data: foodOrdersForRaja } = await client
          .from('food_orders')
          .select('*')
          .in('food_stall_id', stallIds)
        console.log('Food orders for Raja stalls:', foodOrdersForRaja?.length || 0, 'orders')
        if (foodOrdersForRaja && foodOrdersForRaja.length > 0) {
          console.log('📋 Sample orders:')
          console.log(JSON.stringify(foodOrdersForRaja.slice(0, 2), null, 2))
        } else {
          console.log('⚠️ No orders found yet. Database is empty for this stall.')
        }
      }
    }
  } catch (e) {
    console.error('Error:', e)
  }
}

debugAnalytics()
