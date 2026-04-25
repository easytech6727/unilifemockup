'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, MapPin, Star, ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import TripPlanDisplay from './TripPlanDisplay'
import { buildFallbackTripPlan, normalizeTripPlan } from './types'

type TripPlace = {
  id?: number
  place_name: string
  rating?: number | null
  image_url?: string | null
}

type TripApi = {
  id: number
  start_location: string
  destination: string
  days: number
  travelers: number
  hotel_budget_per_night?: number
  food_budget_per_day?: number
  transport_cost_per_km?: number
  total_budget?: number
  budget?: number
  distance_km?: number | null
  plan_json?: unknown
  trip_places?: TripPlace[]
}

export default function SavedTripDetailClient({ tripId }: { tripId: number }) {
  const router = useRouter()
  const [trip, setTrip] = useState<TripApi | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setOrigin(typeof window !== 'undefined' ? window.location.origin : '')
  }, [])

  useEffect(() => {
    if (!Number.isFinite(tripId)) {
      setError('Invalid trip')
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/trip/${tripId}`, { credentials: 'include' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          if (!cancelled) setError(data.message || 'Could not load trip')
          return
        }
        if (!cancelled) setTrip(data as TripApi)
      } catch {
        if (!cancelled) setError('Could not load trip')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [tripId])

  async function handleDelete() {
    setDeleteError(null)
    setDeleting(true)
    try {
      const res = await fetch(`/api/trip/${tripId}`, { method: 'DELETE', credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setDeleteError(data.message || 'Could not delete trip')
        return
      }
      setDeleteOpen(false)
      router.push('/trip-planner')
      router.refresh()
    } catch {
      setDeleteError('Could not delete trip')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="surface-card flex flex-col items-center justify-center gap-4 py-16 text-gray-600">
        <Loader2 className="animate-spin text-primary" size={28} />
        <p className="text-sm font-medium">Loading your trip…</p>
      </div>
    )
  }

  if (error || !trip) {
    return (
      <div className="surface-card-sm border-red-100 bg-red-50/80">
        <p className="text-sm font-medium text-red-900">{error || 'Trip not found'}</p>
        <Link href="/trip-planner" className="btn-ghost mt-4 inline-flex items-center gap-2 !px-0 font-semibold">
          <ArrowLeft size={22} strokeWidth={2.25} />
          Back to Trip Planner
        </Link>
      </div>
    )
  }

  const places = Array.isArray(trip.trip_places) ? trip.trip_places : []
  const displayPlan = normalizeTripPlan(trip.plan_json) ?? buildFallbackTripPlan(trip, places)

  return (
    <div className="space-y-8">
      <div className="page-hero space-y-5">
        <Link
          href="/trip-planner"
          className="btn-ghost -ml-1 !px-2 !py-2.5 text-gray-800 hover:text-primary w-fit inline-flex items-center gap-2 font-semibold"
        >
          <ArrowLeft size={22} strokeWidth={2.25} className="shrink-0" />
          All trips
        </Link>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-emerald-500/30">
              <MapPin size={28} strokeWidth={2.25} />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 break-words">
                {trip.destination}
              </h1>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                <span className="text-gray-500">From</span> {trip.start_location}
                <span className="mx-2 text-gray-300">·</span>
                {trip.days} day{trip.days !== 1 ? 's' : ''}
                <span className="mx-2 text-gray-300">·</span>
                {trip.travelers} traveler{trip.travelers !== 1 ? 's' : ''}
                {trip.distance_km != null && Number(trip.distance_km) > 0 && (
                  <>
                    <span className="mx-2 text-gray-300">·</span>
                    {trip.distance_km} km
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 lg:shrink-0 lg:pt-1">
            <Link
              href={`/trip-planner/${trip.id}/edit`}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-primary/20 transition hover:bg-indigo-600 hover:shadow-md"
            >
              <Pencil size={15} />
              Edit trip
            </Link>
            <button
              type="button"
              onClick={() => {
                setDeleteOpen(true)
                setDeleteError(null)
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-100 hover:border-red-300"
            >
              <Trash2 size={15} />
              Delete
            </button>
          </div>
        </div>
      </div>

      <section aria-labelledby="trip-plan-heading">
        <div className="flex items-center gap-2 mb-4">
          <h2 id="trip-plan-heading" className="text-lg font-bold text-gray-900 tracking-tight">
            Trip plan
          </h2>
          <span className="h-px flex-1 bg-gradient-to-r from-gray-200 to-transparent max-w-xs" aria-hidden />
        </div>
        <TripPlanDisplay
          tripPlan={displayPlan}
          shareUrl={origin ? `${origin}/trip-planner/${trip.id}` : null}
        />
      </section>

      {places.length > 0 && (
        <div className="surface-card-sm">
          <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Star className="text-amber-500" size={18} />
            Saved places
          </h2>
          <ul className="space-y-2">
            {places.map((p) => (
              <li
                key={p.id ?? p.place_name}
                className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-800"
              >
                <Star size={14} className="text-amber-500 shrink-0" />
                <span className="font-medium">{p.place_name}</span>
                {p.rating != null && <span className="text-xs text-gray-500 ml-auto">★ {p.rating}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {deleteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-trip-title"
        >
          <div className="surface-card max-w-md w-full p-0 overflow-hidden shadow-2xl shadow-gray-900/10 animate-scaleIn">
            <div className="border-b border-gray-100 bg-gradient-to-r from-red-50 to-white px-6 py-4">
              <h2 id="delete-trip-title" className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-600">
                  <Trash2 size={18} />
                </span>
                Delete this trip?
              </h2>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-gray-600 leading-relaxed">
                This will remove <span className="font-semibold text-gray-900">{trip.destination}</span> and all saved
                places. This cannot be undone.
              </p>
              {deleteError && (
                <p className="text-sm text-red-600 mt-3 font-medium bg-red-50 rounded-lg px-3 py-2">{deleteError}</p>
              )}
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setDeleteOpen(false)}
                  disabled={deleting}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="btn-danger-solid flex-1"
                >
                  {deleting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
