import { requireRole } from '@/lib/auth.server'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import VendorDashboardClient from './VendorDashboardClient'

export default async function VendorDashboard() {
  const user = await requireRole('vendor')

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-2xl p-6 text-white">
          <h1 className="text-2xl font-bold">Welcome, {user.name.split(' ')[0]}! 🏪</h1>
          <p className="mt-1 text-indigo-100">Manage your store and track orders in real-time.</p>
        </div>
        <VendorDashboardClient userName={user.name} userRole={user.role} />
      </div>
    </DashboardLayout>
  )
}
