import { getCurrentUser } from '@/lib/auth.server'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import SavedTripDetailClient from '@/components/trip-planner/SavedTripDetailClient'
import Link from 'next/link'
import { ArrowLeft, MapPin } from 'lucide-react'

export default async function SavedTripPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  const { id } = await params
  const tripId = parseInt(id, 10)

  const content = (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/trip-planner"
          className="btn-ghost !px-3 text-gray-800 inline-flex items-center gap-2 font-semibold"
        >
          <ArrowLeft size={22} strokeWidth={2.25} className="shrink-0" />
          Trip Planner
        </Link>
        {user && (
          <Link
            href={user.role === 'student' ? '/student/dashboard' : '/dashboard'}
            className="btn-dashboard !py-2 !px-3 text-xs sm:text-sm"
          >
            Dashboard
          </Link>
        )}
      </div>
      {!Number.isFinite(tripId) ? (
        <p className="text-red-600 text-sm font-medium">Invalid trip link.</p>
      ) : (
        <SavedTripDetailClient tripId={tripId} />
      )}
    </div>
  )

  if (user) {
    return <DashboardLayout user={user}>{content}</DashboardLayout>
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-gray-200 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">Trip details</p>
          <Link href="/login" className="text-sm text-gray-600 hover:text-primary">
            Sign in
          </Link>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-8 px-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-6">
          <MapPin className="text-primary" size={24} />
          Trip
        </h1>
        {content}
      </main>
    </div>
  )
}
