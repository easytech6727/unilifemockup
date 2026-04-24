'use client'

import { Wallet, Hotel, Car, Utensils, ShieldCheck, Star, CheckCircle2, AlertTriangle, MapPin, Navigation } from 'lucide-react'
import type { TripPlan } from './types'
import TripPlanExportBar from './TripPlanExportBar'
import dynamic from 'next/dynamic'

const TripMap = dynamic(() => import('./TripMap'), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-100 animate-pulse flex items-center justify-center text-gray-400 text-xs">Loading Live Map...</div>
})

const formatLKR = (n: number) => `Rs ${Math.round(n).toLocaleString('en-LK')}`

export default function TripPlanDisplay({
  tripPlan,
  actions,
  shareUrl,
}: {
  tripPlan: TripPlan
  actions?: React.ReactNode
  /** Absolute URL to this trip (e.g. after save); enables copy link and richer sharing. */
  shareUrl?: string | null
}) {
  return (
    <div className="space-y-5">
      <div className="surface-card-sm !p-5 sm:!p-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
            Your trip to {tripPlan.destination}
          </h2>
          <p className="text-gray-600 text-sm mt-1.5">
            {tripPlan.days} days · {tripPlan.travelers} traveler{tripPlan.travelers > 1 ? 's' : ''} ·{' '}
            {tripPlan.tier} zone · {formatLKR(tripPlan.perPersonBudget)}/person
          </p>
        </div>
        {actions}
      </div>

      <div className="surface-card-sm !p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-indigo-100/80 bg-gradient-to-r from-indigo-50/50 to-white">
        <p className="text-sm text-gray-700 font-medium">Download a PDF or share your plan.</p>
        <TripPlanExportBar tripPlan={tripPlan} shareUrl={shareUrl} />
      </div>

      {tripPlan.warning && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-amber-200/80 bg-amber-50/90 text-sm text-amber-950">
          <AlertTriangle size={18} className="shrink-0 text-amber-600 mt-0.5" /> {tripPlan.warning}
        </div>
      )}

      <div className="surface-card-sm !p-5 sm:!p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Wallet size={18} className="text-primary" /> Budget Breakdown — Total:{' '}
          {formatLKR(tripPlan.totalBudget)}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(
            [
              { label: 'Stay', icon: Hotel, amount: tripPlan.breakdown.stay, box: 'bg-blue-50', ic: 'text-blue-500', amt: 'text-blue-700' },
              { label: 'Travel', icon: Car, amount: tripPlan.breakdown.travel, box: 'bg-purple-50', ic: 'text-purple-500', amt: 'text-purple-700' },
              { label: 'Food', icon: Utensils, amount: tripPlan.breakdown.food, box: 'bg-blue-50', ic: 'text-blue-500', amt: 'text-blue-700' },
              { label: 'Activities', icon: Star, amount: tripPlan.breakdown.activities, box: 'bg-green-50', ic: 'text-green-500', amt: 'text-green-700' },
              { label: 'Emergency', icon: ShieldCheck, amount: tripPlan.breakdown.emergency, box: 'bg-red-50', ic: 'text-red-500', amt: 'text-red-700' },
            ] as const
          ).map(({ label, icon: Icon, amount, box, ic, amt }) => (
            <div key={label} className={`${box} rounded-xl p-3 text-center`}>
              <Icon size={20} className={`mx-auto ${ic} mb-1`} />
              <p className="text-xs text-gray-500">{label}</p>
              <p className={`font-bold text-sm ${amt}`}>{formatLKR(amount)}</p>
              <p className="text-xs text-gray-400">
                {tripPlan.totalBudget > 0 ? Math.round((amount / tripPlan.totalBudget) * 100) : 0}%
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {[
          { icon: Hotel, title: 'Stay', desc: tripPlan.hotelReco, amount: tripPlan.breakdown.stay, days: tripPlan.days },
          { icon: Car, title: 'Travel', desc: tripPlan.travelReco, amount: tripPlan.breakdown.travel, days: null as number | null },
          { icon: Utensils, title: 'Food', desc: tripPlan.foodReco, amount: tripPlan.breakdown.food, days: tripPlan.days },
        ].map(({ icon: Icon, title, desc, amount, days: dayCount }) => (
          <div key={title} className="surface-card-sm !p-4 border-gray-100">
            <h4 className="font-semibold text-gray-900 flex items-center gap-1.5 mb-2">
              <Icon size={16} className="text-primary" /> {title}
            </h4>
            <p className="text-sm text-gray-600 mb-2">{desc}</p>
            <p className="text-xs text-primary font-medium">
              {formatLKR(amount)} total{' '}
              {dayCount ? `(${formatLKR(Math.round(amount / dayCount))}/day)` : ''}
            </p>
          </div>
        ))}
      </div>

      <div className="surface-card-sm !p-0 overflow-hidden border-gray-100">
        <div className="p-5 border-b border-gray-100 bg-gray-50/30 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Navigation size={18} className="text-secondary" /> Route Map
          </h3>
          <p className="text-[11px] text-gray-500 font-medium bg-white px-2 py-0.5 rounded-full border border-gray-100">Live Preview</p>
        </div>
        <div className="aspect-[16/7] w-full bg-gray-50 relative group">
           {/* Interactive Leaflet Map */}
           <TripMap 
              points={tripPlan.dailyPlan.flatMap(d => d.timeline || []).map(t => ({ 
                lat: t.lat || 0, 
                lng: t.lng || 0, 
                title: t.title 
              })).filter(p => p.lat !== 0)} 
              destination={tripPlan.destination} 
           />
           
           <div className="absolute bottom-4 right-4 z-[400]">
              <a
                href={(() => {
                  const timeline = tripPlan.dailyPlan.flatMap(d => d.timeline || [])
                  
                  // Keep if has coordinates, OR if it's a fallback title that isn't totally generic
                  const validPoints = timeline.filter((t: any) => {
                    if (t.lat && t.lng) return true
                    if (!t.title) return false
                    const low = t.title.toLowerCase()
                    return !low.includes('prepare') && !low.includes('departure') && !low.includes('check') && !low.includes('lunch') && !low.includes('dinner') && !low.includes('breakfast')
                  })

                  if (validPoints.length === 0) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tripPlan.destination)}`
                  
                  const getPos = (item: any) => {
                    if (item.lat && item.lng) return `${item.lat},${item.lng}`
                    return encodeURIComponent(item.title.replace(/^Visit\s+/i, '')).replace(/%20/g, '+')
                  }
                  
                  const origin = getPos(validPoints[0])
                  const dest = getPos(validPoints[validPoints.length - 1])
                  const waypoints = validPoints.slice(1, -1).map(getPos).join('|')
                  
                  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}${waypoints ? `&waypoints=${waypoints}` : ''}&travelmode=driving`
                })()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm text-secondary rounded-lg font-bold text-[11px] shadow-lg border border-indigo-100 hover:bg-white transition-all hover:scale-105 active:scale-95"
              >
                <Navigation size={12} strokeWidth={3} /> Open Google Maps
              </a>
           </div>
        </div>
        <div className="p-3 bg-white flex flex-wrap gap-2 justify-center">
             {tripPlan.dailyPlan.flatMap(d => d.timeline || []).filter(t => t.lat && t.lng).slice(0, 6).map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-semibold border border-indigo-100/50">
                  <MapPin size={10} /> {item.title}
                </div>
             ))}
        </div>
      </div>

      <div className="surface-card-sm !p-0 sm:!p-0 border-transparent sm:border-transparent bg-transparent shadow-none">
        <h3 className="font-bold text-gray-900 mb-4 px-1 tracking-tight text-lg">Day-by-day itinerary</h3>
        <div className="space-y-6">
          {tripPlan.dailyPlan.map((d) => (
            <div key={d.day} className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100 flex flex-col gap-5">
              <h4 className="font-bold text-primary text-base">Day {d.day}</h4>
              
              {d.timeline && d.timeline.length > 0 ? (
                <div className="relative">
                  {d.timeline.map((item, idx) => {
                    let Icon = Star
                    let colorCode = 'bg-blue-500'
                    let bgCode = 'bg-blue-100'

                    switch (item.type) {
                      case 'flight':
                        Icon = require('lucide-react').Plane
                        colorCode = 'bg-emerald-500'
                        bgCode = 'bg-emerald-100'
                        break
                      case 'transport':
                        Icon = Car
                        colorCode = 'bg-teal-500'
                        bgCode = 'bg-teal-100'
                        break
                      case 'hotel':
                        Icon = Hotel
                        colorCode = 'bg-cyan-500'
                        bgCode = 'bg-cyan-100'
                        break
                      case 'food':
                        Icon = Utensils
                        colorCode = 'bg-sky-500'
                        bgCode = 'bg-sky-100'
                        break
                      case 'coffee':
                        Icon = require('lucide-react').Coffee
                        colorCode = 'bg-amber-500'
                        bgCode = 'bg-amber-100'
                        break
                      case 'activity':
                      default:
                        Icon = Star
                        colorCode = 'bg-primary'
                        bgCode = 'bg-indigo-100'
                        break
                    }

                    return (
                      <div key={idx} className="flex gap-4 sm:gap-6 relative group">
                        {/* Vertical line connecting nodes */}
                        {idx !== d.timeline!.length - 1 && (
                          <div className={`absolute left-[5.25rem] sm:left[5.25rem] top-8 bottom-[-1rem] w-0.5 ${colorCode} opacity-60 z-0`} style={{ left: '5.25rem' }} />
                        )}
                        
                        {/* Time block */}
                        <div className="w-16 shrink-0 text-right pt-2 select-none">
                          <p className="font-bold text-gray-900 text-[13px] leading-tight flex flex-col">
                            {item.time.split(' ')[0]}
                            <span className="text-[10px] text-gray-500 font-semibold uppercase">{item.time.split(' ')[1] || 'AM'}</span>
                          </p>
                        </div>

                        {/* Icon Node */}
                        <div className="relative flex flex-col items-center pt-1 z-10 shrink-0">
                          <div className={`h-8 w-8 rounded-full ${colorCode} text-white flex items-center justify-center shadow-sm ring-4 ring-white`}>
                            <Icon size={14} strokeWidth={2.5} />
                          </div>
                        </div>

                        {/* Content */}
                        <div className="pb-6 flex-1 min-w-0 pt-1.5">
                          <h5 className="font-bold text-gray-900 text-[15px] tracking-tight">{item.title}</h5>
                          <p className="text-gray-500 mt-1 leading-relaxed text-[13px] sm:text-sm">{item.description}</p>
                        </div>
                      </div>
                    )
                  })}
                  
                  {/* Subtle meals footer if timeline exists */}
                  <div className="mt-2 ml-[7.5rem] p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-start gap-2.5">
                     <Utensils size={14} className="text-gray-400 shrink-0 mt-0.5" />
                     <p className="text-xs text-gray-600 leading-relaxed font-medium">{d.meals}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm text-gray-700">
                  <p>
                    <span className="font-semibold text-gray-900 w-20 inline-block">Morning:</span> {d.morning}
                  </p>
                  <p>
                    <span className="font-semibold text-gray-900 w-20 inline-block">Afternoon:</span> {d.afternoon}
                  </p>
                  <p>
                    <span className="font-semibold text-gray-900 w-20 inline-block">Evening:</span> {d.evening}
                  </p>
                  <div className="pt-2 mt-2 border-t border-gray-100">
                    <span className="font-semibold text-gray-900 w-20 inline-block">Meals:</span> {d.meals}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/50 p-5 sm:p-6 shadow-sm ring-1 ring-indigo-100/40">
        <h3 className="font-semibold text-gray-900 mb-3">Smart travel tips</h3>
        <ul className="space-y-2">
          {tripPlan.tips.map((tip, i) => (
            <li key={i} className="flex gap-2 text-sm text-gray-700">
              <CheckCircle2 size={16} className="text-primary shrink-0 mt-0.5" /> {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
