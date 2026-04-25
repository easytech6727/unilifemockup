import { getCurrentUser } from '@/lib/auth.server'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import TripPlannerClient from '@/components/trip-planner/TripPlannerClient'
import { ArrowLeft, MapPin, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default async function TripPlannerPage() {
  const user = await getCurrentUser()

  const content = (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/50 to-blue-50 shadow-sm">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[140%] rounded-full bg-blue-100/50 blur-3xl -z-10" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-100/40 blur-3xl -z-10" />
        
        <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-5 px-6 py-6 sm:px-8 lg:px-10 lg:py-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/60 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-indigo-700 shadow-sm backdrop-blur-md">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                  <MapPin size={12} />
                </span>
                Trip Planner
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Build a polished trip, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600">faster.</span>
              </h1>
              <p className="max-w-xl text-sm font-medium leading-relaxed text-slate-600">
                Discover destinations, arrange attractions, and generate wise budget guidance in one modern planning flow.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">AI itinerary</span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">Budget planning</span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">Save & revisit</span>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-white/80 bg-white/60 p-4 shadow-lg shadow-indigo-100/50 backdrop-blur-xl sm:w-[22rem] shrink-0">
              <div className="flex items-center gap-3 text-xs text-slate-700">
                <div className="rounded-lg bg-indigo-100 p-2 text-indigo-600 shadow-inner">
                  <Sparkles size={16} />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">Smart itinerary</p>
                  <p className="text-xs text-slate-500">Day-by-day agenda for your trip</p>
                </div>
              </div>
              <div className="grid gap-2 rounded-xl bg-slate-50/80 p-3 text-xs border border-slate-100">
                <div className="flex items-center justify-between gap-2 text-slate-600">
                  <span className="font-medium">Trip duration</span>
                  <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded text-xs">Flexible</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-slate-600">
                  <span className="font-medium">Budget breakdown</span>
                  <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded text-xs">Instant</span>
                </div>
              </div>
            </div>
          </div>
          {user && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-indigo-100/50">
              <Link
                href={user.role === 'student' ? '/student/dashboard' : '/dashboard'}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-indigo-600"
              >
                <ArrowLeft size={14} />
                Back
              </Link>
            </div>
          )}
        </div>
      </section>
      <TripPlannerClient />
    </div>
  )

  if (user) {
    return <DashboardLayout user={user}>{content}</DashboardLayout>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-6 py-5">
          <Link href="/" className="flex items-center gap-3 min-w-0">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-200">
              <MapPin size={18} className="text-white" />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="font-display text-[15px] font-bold tracking-[-0.02em] text-slate-900 truncate">UniLife</p>
              <p className="text-xs text-slate-500 truncate">Trip Planner</p>
            </div>
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Sign in to save
          </Link>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-8 px-6">{content}</main>
    </div>
  )
}