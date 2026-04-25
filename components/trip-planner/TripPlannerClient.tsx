'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { MapPin, Search, Loader2, Wallet, ChevronRight, Sparkles, CheckCircle2, AlertTriangle, XCircle, Info, TrendingUp, Calendar, Users, Clock } from 'lucide-react'
import AttractionList, { type Place } from './AttractionList'
import ItineraryList, { type ItineraryPlace } from './ItineraryList'
import LocationAutocompleteInput from './LocationAutocompleteInput'
import TripPlanDisplay from './TripPlanDisplay'
import SavedTripsSection from './SavedTripsSection'
import WeatherForecast from './WeatherForecast'
import { isTripPlan, type TripPlan } from './types'

type Step = 'search' | 'attractions' | 'budget' | 'plan'

export default function TripPlannerClient({ editTripId }: { editTripId?: number } = {}) {
  const [step, setStep] = useState<Step>('search')
  const [startLocation, setStartLocation] = useState('')
  const [destination, setDestination] = useState('')
  const [days, setDays] = useState(1)
  const [daysInput, setDaysInput] = useState('1')
  const [travelers, setTravelers] = useState(1)
  const [travelersInput, setTravelersInput] = useState('1')
  const [tripDate, setTripDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [distanceKm, setDistanceKm] = useState<number | null>(null)
  const [distanceLoading, setDistanceLoading] = useState(false)
  const [places, setPlaces] = useState<Place[]>([])
  const [placesLoading, setPlacesLoading] = useState(false)
  const [itinerary, setItinerary] = useState<ItineraryPlace[]>([])
  const [totalBudget, setTotalBudget] = useState('')
  const [planLoading, setPlanLoading] = useState(false)
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hydrating, setHydrating] = useState(!!editTripId)
  const [resolvedTripId, setResolvedTripId] = useState<number | null>(() =>
    editTripId != null ? editTripId : null
  )
  const [origin, setOrigin] = useState('')

  // Budget validation state
  const [budgetValidation, setBudgetValidation] = useState<{
    valid: boolean
    severity: 'success' | 'warning' | 'error'
    message: string
    suggestedMinBudget: number | null
    recommendedBudget: number | null
    breakdown: { accommodation: number; food: number; transport: number; activities: number; flights?: number } | null
    tips: string[]
    canProceed: boolean
    isInternational?: boolean
  } | null>(null)
  const [validating, setValidating] = useState(false)

  const addedIds = new Set<string | null>(itinerary.map(p => p.id ?? p._key ?? null))

  useEffect(() => {
    setOrigin(typeof window !== 'undefined' ? window.location.origin : '')
  }, [])

  useEffect(() => {
    if (editTripId != null) setResolvedTripId(editTripId)
  }, [editTripId])

  useEffect(() => {
    if (!editTripId) return
    let cancelled = false
    ;(async () => {
      setHydrating(true)
      setError(null)
      try {
        const res = await fetch(`/api/trip/${editTripId}`, { credentials: 'include' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.message || 'Could not load trip')
        if (cancelled) return
        setStartLocation(String(data.start_location ?? ''))
        setDestination(String(data.destination ?? ''))
        const d = Math.max(1, Number(data.days) || 1)
        setDays(d)
        setDaysInput(String(d))
        const tr = Math.max(1, Number(data.travelers) || 1)
        setTravelers(tr)
        setTravelersInput(String(tr))
        setDistanceKm(data.distance_km != null ? Number(data.distance_km) : null)
        const rawPlaces = Array.isArray(data.trip_places) ? data.trip_places : []
        setItinerary(
          rawPlaces.map(
            (p: {
              id?: number
              place_name?: string
              rating?: number | null
              latitude?: number | null
              longitude?: number | null
              place_id?: string | null
              image_url?: string | null
              description?: string | null
            }) => ({
              id: p.place_id != null ? String(p.place_id) : null,
              name: String(p.place_name ?? ''),
              rating: p.rating != null ? Number(p.rating) : null,
              latitude: p.latitude != null ? Number(p.latitude) : null,
              longitude: p.longitude != null ? Number(p.longitude) : null,
              address: null,
              imageUrl: p.image_url != null ? String(p.image_url) : null,
              description: p.description != null ? String(p.description) : null,
              _key: `db-${p.id ?? p.place_name}`,
            })
          )
        )
        const tot = Number(data.total_budget ?? data.budget ?? 0)
        setTotalBudget(tot > 0 ? String(Math.round(tot)) : '')
        setSaved(false)
        if (isTripPlan(data.plan_json)) {
          setTripPlan(data.plan_json)
          setStep('plan')
        } else {
          setTripPlan(null)
          setStep(tot > 0 ? 'budget' : 'search')
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load trip')
      } finally {
        if (!cancelled) setHydrating(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [editTripId])

  const fetchDistanceAndPlaces = useCallback(async () => {
    if (!destination.trim()) { setError('Enter a destination'); return }
    setError(null)
    setPlacesLoading(true)
    setDistanceLoading(true)
    try {
      const [geoRes, distRes] = await Promise.all([
        fetch(`/api/trip/geocode?address=${encodeURIComponent(destination.trim())}`),
        startLocation.trim()
          ? fetch(`/api/trip/distance?origins=${encodeURIComponent(startLocation.trim())}&destinations=${encodeURIComponent(destination.trim())}`)
          : Promise.resolve(null),
      ])
      if (!geoRes.ok) throw new Error('Could not find destination')
      const { lat, lng } = await geoRes.json()
      const placesRes = await fetch(`/api/trip/places?location=${lat},${lng}`)
      const data = await placesRes.json()
      setPlaces(Array.isArray(data) ? data : [])
      if (distRes && distRes.ok) {
        const d = await distRes.json()
        setDistanceKm(d.distanceKm ?? null)
      }
      setStep('attractions')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to search')
    } finally {
      setPlacesLoading(false)
      setDistanceLoading(false)
    }
  }, [destination, startLocation])

  const addToItinerary = useCallback((place: Place) => {
    setItinerary(prev => [...prev, { ...place, _key: place.id || `${place.name}-${Date.now()}` }])
  }, [])
  const removeFromItinerary = useCallback((place: ItineraryPlace) => {
    setItinerary(prev => prev.filter(p => (p._key ?? p.id) !== (place._key ?? place.id)))
  }, [])

  // Client-side validation
  const isPastDate = (dateStr: string) => {
    const selected = new Date(`${dateStr}T00:00:00`)
    selected.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return selected < today
  }

  const validateInputs = useCallback((): string | null => {
    const destTrimmed = destination.trim()
    if (!destTrimmed) return 'Please enter a destination'
    if (!/^[a-zA-Z\s,.-]+$/.test(destTrimmed) || destTrimmed.length < 2) {
      return 'Destination must contain only letters (no numbers or symbols)'
    }
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(tripDate)) return 'Please select a valid trip date'
    if (isPastDate(tripDate)) return 'Trip date cannot be in the past'
    if (days < 1 || days > 30) return 'Trip duration must be between 1 and 30 days'
    if (travelers < 1 || travelers > 20) return 'Number of travelers must be between 1 and 20'
    
    const budget = Number(totalBudget)
    if (!totalBudget || !Number.isFinite(budget)) return 'Please enter a valid budget amount'
    if (budget < 500) return 'Minimum budget is LKR 500'
    if (budget > 1000000) return 'Maximum budget is LKR 1,000,000'
    
    return null
  }, [destination, days, travelers, totalBudget, tripDate])

  // Budget validation with AI
  const validateBudget = useCallback(async () => {
    const inputError = validateInputs()
    if (inputError) {
      setError(inputError)
      return false
    }

    setError(null)
    setValidating(true)
    setBudgetValidation(null)

    try {
      const res = await fetch('/api/trip/ai-budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'validate',
          destination: destination.trim(),
          travelers,
          totalBudget: Number(totalBudget),
          days,
          places: itinerary.map(p => p.name),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Validation failed')
        return false
      }

      setBudgetValidation(data)
      return data.valid || data.canProceed
    } catch (e) {
      setError('Something went wrong. Please try again.')
      return false
    } finally {
      setValidating(false)
    }
  }, [destination, travelers, totalBudget, days, itinerary, validateInputs])

  // Clear validation when inputs change
  useEffect(() => {
    setBudgetValidation(null)
  }, [totalBudget, days, travelers, destination])

  const generatePlan = useCallback(async () => {
    // First validate inputs
    const inputError = validateInputs()
    if (inputError) {
      setError(inputError)
      return
    }

    // If not validated yet, validate first
    if (!budgetValidation) {
      const canProceed = await validateBudget()
      if (!canProceed) return
    } else if (!budgetValidation.valid && !budgetValidation.canProceed) {
      setError('Please adjust your budget before generating a plan')
      return
    }

    const budget = Number(totalBudget)
    setError(null)
    setPlanLoading(true)
    try {
      const res = await fetch('/api/trip/ai-budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'plan',
          startLocation: startLocation.trim(),
          destination: destination.trim(),
          travelers,
          totalBudget: budget,
          days,
          distanceKm: distanceKm ?? 0,
          places: itinerary.map(p => p.name),
          startDate: tripDate,
        }),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || 'Plan generation failed') }
      const plan = await res.json()
      setTripPlan(plan)
      setStep('plan')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate plan')
    } finally {
      setPlanLoading(false)
    }
  }, [totalBudget, destination, travelers, days, distanceKm, itinerary, startLocation, validateInputs, validateBudget, budgetValidation])

  const saveTrip = useCallback(async () => {
    if (!tripPlan) return
    setSaveLoading(true)
    setError(null)
    try {
      const payload = {
        start_location: startLocation.trim() || 'Not specified',
        destination: destination.trim(),
        days,
        travelers,
        hotel_budget_per_night: Math.round(tripPlan.breakdown.stay / days),
        food_budget_per_day: Math.round(tripPlan.breakdown.food / days),
        transport_cost_per_km: distanceKm ? Math.round(tripPlan.breakdown.travel / distanceKm) : 0,
        total_budget: tripPlan.totalBudget,
        distance_km: distanceKm,
        plan_json: tripPlan,
        places: itinerary.map((p) => ({
          place_name: p.name,
          rating: p.rating,
          latitude: p.latitude,
          longitude: p.longitude,
          place_id: p.id,
          image_url: p.imageUrl,
        })),
      }
      const url = editTripId ? `/api/trip/${editTripId}` : '/api/trip'
      const method = editTripId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.status === 401) {
        setError('Sign in to save your trip')
        return
      }
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.message || 'Failed to save')
      }
      const data = (await res.json().catch(() => ({}))) as { id?: unknown }
      const newId = Number(data.id)
      if (Number.isFinite(newId)) setResolvedTripId(newId)
      setSaved(true)
      
      // Send SMS notification for saved trip
      try {
        await fetch('/api/trip/notify-sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tripId: newId || editTripId,
            destination: destination.trim(),
            days,
            travelers,
            totalBudget: tripPlan.totalBudget,
            isEdit: !!editTripId,
          }),
        })
      } catch {
        // SMS notification is non-critical, don't fail the save
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save trip')
    } finally {
      setSaveLoading(false)
    }
  }, [tripPlan, startLocation, destination, days, travelers, distanceKm, itinerary, editTripId])

  if (editTripId && hydrating) {
    return (
      <div className="surface-card flex flex-col items-center justify-center gap-4 py-16 text-gray-600">
        <Loader2 className="animate-spin text-primary" size={28} />
        <p className="text-sm font-medium">Loading your trip…</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {editTripId && (
        <div className="rounded-[26px] border border-indigo-100 bg-gradient-to-r from-indigo-50/80 to-violet-50/60 p-4 sm:p-5 shadow-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.28em] text-indigo-600 font-semibold mb-1">Editing mode</p>
              <p className="text-sm font-semibold text-slate-900">
                Trip <span className="tabular-nums">#{editTripId}</span> is loaded. Save to update this itinerary.
              </p>
            </div>
            <Link
              href="/trip-planner"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              New trip instead
            </Link>
          </div>
        </div>
      )}

      {/* Step indicator */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-card overflow-x-auto">
        <div className="flex items-center md:justify-center gap-2 min-w-max w-full">
          {(['search', 'attractions', 'budget', 'plan'] as Step[]).map((s, i) => {
            const labels = ['Search', 'Attractions', 'Budget', 'Trip plan']
            const active = s === step
            const done =
              ['search', 'attractions', 'budget', 'plan'].indexOf(s) <
              ['search', 'attractions', 'budget', 'plan'].indexOf(step)
            
            // Allow navigation to this step if it's done or if it's the current step
            const canNavigate = done || active || 
              (s === 'attractions' && step === 'search' && destination.trim()) ||
              (s === 'budget' && (step === 'attractions' || step === 'budget') && itinerary.length > 0) ||
              (s === 'plan' && step === 'budget' && totalBudget && tripPlan)
            
            return (
              <div key={s} className="flex items-center gap-2 shrink-0">
                {i > 0 && <ChevronRight size={16} className="text-slate-300" />}
                <button
                  type="button"
                  onClick={() => {
                    if (canNavigate) setStep(s)
                  }}
                  disabled={!canNavigate}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap border transition cursor-pointer ${
                    active
                      ? 'bg-primary text-white border-primary shadow-sm shadow-primary/20'
                      : done
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100 cursor-pointer'
                        : canNavigate
                          ? 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 cursor-pointer'
                          : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                  }`}>
                  {done && <CheckCircle2 size={16} className={active ? 'text-white' : 'text-emerald-600'} />}
                  {labels[i]}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-red-200/80 bg-red-50 text-sm text-red-800">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {/* ── STEP 1: SEARCH ── */}
      {step === 'search' && (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
            {/* Header */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 border border-indigo-100 mb-3">
                <MapPin size={14} /> Plan your journey
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Where are you headed?</h2>
              <p className="mt-1.5 text-sm text-slate-500">
                Enter your route, set your dates and travelers — we'll handle the rest.
              </p>
            </div>

            {/* Location Inputs */}
            <div className="grid gap-4 lg:grid-cols-2 mb-5">
              <LocationAutocompleteInput label="Start location" value={startLocation} onChange={setStartLocation} placeholder="e.g. Colombo" />
              <LocationAutocompleteInput label="Destination" value={destination} onChange={setDestination} placeholder="e.g. Kandy" />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                { label: 'Days', value: days, input: daysInput, setInput: setDaysInput, onChange: (v: number) => { setDays(v); setDaysInput(String(v)) } },
                { label: 'Travelers', value: travelers, input: travelersInput, setInput: setTravelersInput, onChange: (v: number) => { setTravelers(v); setTravelersInput(String(v)) } },
              ].map(({ label, value, input, setInput, onChange }) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wide">{label}</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onChange(Math.max(1, value - 1))}
                      className="flex-shrink-0 inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-lg font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                      −
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onBlur={() => { const v = Math.max(1, parseInt(input) || 1); onChange(v) }}
                      className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-base font-semibold text-slate-900 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={() => onChange(value + 1)}
                      className="flex-shrink-0 inline-flex h-11 w-11 items-center justify-center rounded-lg border border-primary/20 bg-primary text-white shadow-sm transition hover:bg-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wide">Trip date</p>
                <input
                  type="date"
                  value={tripDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={e => setTripDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-sm font-semibold text-slate-900 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                {isPastDate(tripDate) && (
                  <p className="mt-2 text-xs text-red-600">Trip date cannot be in the past.</p>
                )}
              </div>
            </div>

            {destination && (
              <div className="mt-5 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                <p className="text-sm text-emerald-800">
                  <span className="font-semibold">{destination}</span> selected — click <span className="font-semibold">Search Attractions</span> in the sidebar to continue.
                </p>
              </div>
            )}
          </div>

          <aside className="space-y-4">
            {/* Trip summary card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 mb-4">Trip overview</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 border border-indigo-100">
                    <Calendar size={14} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Duration</p>
                    <p className="text-sm font-semibold text-slate-900">{days} day{days > 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-violet-50 p-2 text-violet-600 border border-violet-100">
                    <Users size={14} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Travelers</p>
                    <p className="text-sm font-semibold text-slate-900">{travelers} person{travelers > 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 border border-emerald-100">
                    <Clock size={14} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Start date</p>
                    <p className="text-sm font-semibold text-slate-900">{new Date(tripDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                </div>
                {destination && startLocation && (
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-amber-50 p-2 text-amber-600 border border-amber-100">
                      <MapPin size={14} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">{startLocation} → {destination}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Weather preview */}
            {destination && (
              <WeatherForecast
                destination={destination}
                startDate={tripDate ? new Date(tripDate + 'T00:00:00') : undefined}
                days={Math.min(days, 7)}
              />
            )}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-slate-500">Trip summary</p>
                  <p className="text-lg font-semibold text-slate-900">Details</p>
                </div>
              </div>
              <div className="space-y-3 text-sm text-slate-700">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <span className="text-slate-500">From</span>
                  <span className="font-medium text-slate-900">{startLocation || 'Not set'}</span>
                </div>
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <span className="text-slate-500">To</span>
                  <span className="font-medium text-slate-900">{destination}</span>
                </div>
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <span className="text-slate-500">Days</span>
                  <span className="font-medium text-slate-900">{days}</span>
                </div>
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <span className="text-slate-500">Travelers</span>
                  <span className="font-medium text-slate-900">{travelers}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Start date</span>
                  <span className="font-medium text-slate-900">{new Date(tripDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>
            </div>

            {!startLocation || !destination ? (
              <div className="space-y-3">
                <button
                  type="button"
                  disabled
                  className="btn-primary-lg w-full sm:w-auto opacity-50 cursor-not-allowed"
                >
                  <Search size={18} /> Search Attractions
                </button>
                <p className="text-sm text-amber-600 font-medium">
                  ⚠️ Please select both start location and destination to continue
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={fetchDistanceAndPlaces}
                disabled={placesLoading}
                className="btn-primary-lg w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {placesLoading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                {placesLoading ? 'Searching...' : 'Search Attractions'}
              </button>
            )}
          </aside>
        </div>
      )}

      {/* ── STEP 2: ATTRACTIONS ── */}
      {step === 'attractions' && (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600 border border-indigo-100">
                <MapPin size={20} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Pick your attractions</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Add places you want to visit in <span className="font-semibold">{destination}</span> to your itinerary.
                </p>
              </div>
            </div>

            <AttractionList places={places} loading={placesLoading} onAdd={addToItinerary} addedIds={addedIds} />

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStep('search')}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setStep('budget')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-600"
              >
                <Wallet size={16} /> Set budget
              </button>
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-card">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-sm text-slate-500">Your itinerary</p>
                  <p className="text-2xl font-semibold text-slate-900">{itinerary.length} stop{itinerary.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="rounded-2xl bg-white p-3 text-primary shadow-sm border border-slate-200">
                  <Wallet size={22} />
                </div>
              </div>
              <ItineraryList places={itinerary} onRemove={removeFromItinerary} />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <p className="text-sm font-semibold uppercase tracking-[0.26em] text-slate-500 mb-3">Trip details</p>
              <div className="space-y-3 text-sm text-slate-700">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <span className="text-slate-500">Destination</span>
                  <span className="font-medium text-slate-900">{destination}</span>
                </div>
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <span className="text-slate-500">Days</span>
                  <span className="font-medium text-slate-900">{days}</span>
                </div>
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <span className="text-slate-500">Travelers</span>
                  <span className="font-medium text-slate-900">{travelers}</span>
                </div>
                {distanceKm != null && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">Distance</span>
                    <span className="font-medium text-slate-900">{distanceKm.toLocaleString()} km</span>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ── STEP 3: BUDGET INPUT ── */}
      {step === 'budget' && (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary border border-indigo-100">
                <Sparkles size={20} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Set your budget</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Enter the total amount you want to spend for {destination}. The AI will split it into stay, travel, food, and activities.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-3">Total budget</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">Rs</span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={totalBudget}
                  onChange={e => setTotalBudget(e.target.value)}
                  placeholder="e.g. 50000"
                  className="w-full rounded-xl border border-slate-200 bg-white py-4 pl-14 pr-4 text-lg font-semibold text-slate-900 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 mb-6">
              {[20000, 50000, 100000, 200000].map(amt => (
                <button
                  key={amt}
                  onClick={() => setTotalBudget(String(amt))}
                  className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                    totalBudget === String(amt)
                      ? 'border-primary bg-primary text-white shadow-sm shadow-primary/20 hover:bg-indigo-600'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Rs {amt.toLocaleString()}
                </button>
              ))}
            </div>

            {/* Budget Validation Results */}
            {budgetValidation && (
              <div className={`rounded-2xl border p-5 mb-6 ${
                budgetValidation.severity === 'error'
                  ? 'border-red-200 bg-red-50'
                  : budgetValidation.severity === 'warning'
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-emerald-200 bg-emerald-50'
              }`}>
                <div className="flex items-start gap-3">
                  {budgetValidation.severity === 'error' && <XCircle className="shrink-0 mt-0.5 text-red-600" size={20} />}
                  {budgetValidation.severity === 'warning' && <AlertTriangle className="shrink-0 mt-0.5 text-amber-600" size={20} />}
                  {budgetValidation.severity === 'success' && <CheckCircle2 className="shrink-0 mt-0.5 text-emerald-600" size={20} />}
                  <div className="flex-1">
                    <p className={`font-semibold ${
                      budgetValidation.severity === 'error' ? 'text-red-900' : 
                      budgetValidation.severity === 'warning' ? 'text-amber-900' : 'text-emerald-900'
                    }`}>
                      {budgetValidation.severity === 'error' ? 'Budget Too Low' : 
                       budgetValidation.severity === 'warning' ? 'Budget Warning' : 'Budget Approved'}
                    </p>
                    <p className={`mt-1 text-sm ${
                      budgetValidation.severity === 'error' ? 'text-red-700' : 
                      budgetValidation.severity === 'warning' ? 'text-amber-700' : 'text-emerald-700'
                    }`}>
                      {budgetValidation.message}
                    </p>

                    {budgetValidation.suggestedMinBudget && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setTotalBudget(String(budgetValidation.suggestedMinBudget))}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                        >
                          <TrendingUp size={14} />
                          Use minimum: Rs {budgetValidation.suggestedMinBudget.toLocaleString()}
                        </button>
                        {budgetValidation.recommendedBudget && (
                          <button
                            type="button"
                            onClick={() => setTotalBudget(String(budgetValidation.recommendedBudget))}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary border border-primary px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-600"
                          >
                            Use recommended: Rs {budgetValidation.recommendedBudget.toLocaleString()}
                          </button>
                        )}
                      </div>
                    )}

                    {budgetValidation.breakdown && (
                      <div className={`mt-4 grid gap-2 text-xs ${budgetValidation.breakdown.flights ? 'grid-cols-3' : 'grid-cols-2'}`}>
                        {budgetValidation.breakdown.flights && (
                          <div className="rounded-lg bg-white/60 p-2 border border-slate-200/50 col-span-full sm:col-span-1">
                            <p className="text-slate-500">✈️ Flights</p>
                            <p className="font-semibold text-slate-900">Rs {budgetValidation.breakdown.flights.toLocaleString()}</p>
                          </div>
                        )}
                        <div className="rounded-lg bg-white/60 p-2 border border-slate-200/50">
                          <p className="text-slate-500">Accommodation</p>
                          <p className="font-semibold text-slate-900">Rs {budgetValidation.breakdown.accommodation.toLocaleString()}</p>
                        </div>
                        <div className="rounded-lg bg-white/60 p-2 border border-slate-200/50">
                          <p className="text-slate-500">Food</p>
                          <p className="font-semibold text-slate-900">Rs {budgetValidation.breakdown.food.toLocaleString()}</p>
                        </div>
                        <div className="rounded-lg bg-white/60 p-2 border border-slate-200/50">
                          <p className="text-slate-500">Transport</p>
                          <p className="font-semibold text-slate-900">Rs {budgetValidation.breakdown.transport.toLocaleString()}</p>
                        </div>
                        <div className="rounded-lg bg-white/60 p-2 border border-slate-200/50">
                          <p className="text-slate-500">Activities</p>
                          <p className="font-semibold text-slate-900">Rs {budgetValidation.breakdown.activities.toLocaleString()}</p>
                        </div>
                      </div>
                    )}

                    {budgetValidation.tips && budgetValidation.tips.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                          <Info size={12} /> Tips
                        </p>
                        <ul className="space-y-1">
                          {budgetValidation.tips.map((tip, i) => (
                            <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                              <span className="text-slate-400">•</span> {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => setStep('attractions')} className="btn-secondary w-full rounded-2xl px-5 py-3 text-sm">
                ← Back
              </button>
              <button
                type="button"
                onClick={validateBudget}
                disabled={validating || !totalBudget}
                className="btn-secondary w-full rounded-2xl px-5 py-3 text-sm border-primary/30 text-primary hover:bg-primary/5 disabled:cursor-not-allowed"
              >
                {validating ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {validating ? 'Checking...' : 'Check Budget'}
              </button>
              <button
                type="button"
                onClick={generatePlan}
                disabled={planLoading || !totalBudget || !!(budgetValidation && !budgetValidation.valid && !budgetValidation.canProceed)}
                className="btn-primary-lg w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-50"
              >
                {planLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                Generate plan
              </button>
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-card">
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-slate-500 mb-4">Ready to plan</p>
            <div className="space-y-4 text-sm text-slate-700">
              <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
                <p className="text-slate-500">Destination</p>
                <p className="mt-1 font-semibold text-slate-900">{destination || 'Not selected'}</p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
                <p className="text-slate-500">Trip length</p>
                <p className="mt-1 font-semibold text-slate-900">{days} day{days > 1 ? 's' : ''}</p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
                <p className="text-slate-500">Travelers</p>
                <p className="mt-1 font-semibold text-slate-900">{travelers}</p>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ── STEP 4: FULL TRIP PLAN ── */}
      {step === 'plan' && tripPlan && (
        <div className="space-y-5">
          <TripPlanDisplay
            tripPlan={tripPlan}
            startDate={tripDate}
            shareUrl={
              origin && resolvedTripId != null ? `${origin}/trip-planner/${resolvedTripId}` : null
            }
            actions={
              <button type="button" onClick={() => setStep('budget')} className="btn-secondary !py-2 shrink-0 text-xs sm:text-sm">
                ← Edit budget
              </button>
            }
          />

          <button
            type="button"
            onClick={saveTrip}
            disabled={saveLoading || saved}
            className={`btn-primary-lg ${saved ? '!bg-emerald-600 hover:!bg-emerald-600 shadow-emerald-500/25' : ''} mx-auto`}
          >
            {saveLoading && <Loader2 size={20} className="animate-spin" />}
            {saveLoading
              ? 'Saving...'
              : saved
                ? editTripId
                  ? '✓ Trip updated!'
                  : '✓ Trip Saved!'
                : editTripId
                  ? 'Save changes'
                  : 'Save This Trip Plan'}
          </button>
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
        </div>
      )}

      {!editTripId && <SavedTripsSection />}
    </div>
  )
}
