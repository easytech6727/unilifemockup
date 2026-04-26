import { getCurrentUser } from '@/lib/auth.server'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import TripPlannerClient from '@/components/trip-planner/TripPlannerClient'
import Link from 'next/link'
import { MapPin } from 'lucide-react'

export default async function EditTripPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  const { id } = await params
  const tripId = parseInt(id, 10)

  const content = (
    <div className="space-y-8">
      <div className="page-hero flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-emerald-500/30">
            <MapPin size={24} strokeWidth={2.25} />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Edit trip</h1>
            <p className="text-gray-600 mt-1 text-sm leading-relaxed max-w-lg">
              Update route, attractions, budget, or regenerate your AI plan — then save.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link href={`/trip-planner/${id}`} className="btn-secondary !py-2.5 font-bold">
            View trip
          </Link>
          {user && (
            <Link
              href={user.role === 'student' ? '/student/dashboard' : '/dashboard'}
              className="btn-dashboard !py-2.5"
            >
              Dashboard
            </Link>
          )}
        </div>
      </div>
      {!Number.isFinite(tripId) ? (
        <p className="text-red-600 text-sm">Invalid trip.</p>
      ) : (
        <TripPlannerClient editTripId={tripId} />
      )}
    </div>
  )

  if (user) {
    return <DashboardLayout user={user}>{content}</DashboardLayout>
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-gray-200 py-4 px-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-sm font-semibold text-slate-900">Edit trip</p>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-8 px-6">{content}</main>
    </div>
  )
}
