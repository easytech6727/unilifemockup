'use client'

import { useState, useEffect } from 'react'
import { Cloud, Sun, CloudRain, CloudSnow, Droplets, Thermometer, Calendar, Loader2, AlertCircle, Wind } from 'lucide-react'

interface DayWeather {
  day: string
  date: string
  condition: string
  tempHigh: number
  tempLow: number
  humidity: number
  windSpeed: number
  icon: string
}

interface WeatherForecastProps {
  destination: string
  startDate?: Date
  days: number
}

const getWeatherIcon = (condition: string) => {
  const c = condition.toLowerCase()
  if (c.includes('clear') || c.includes('sunny') || c === 'clear') return <Sun size={18} className="text-amber-500" />
  if (c.includes('rain') || c.includes('drizzle') || c.includes('shower')) return <CloudRain size={18} className="text-blue-500" />
  if (c.includes('snow')) return <CloudSnow size={18} className="text-cyan-400" />
  if (c.includes('cloud') || c.includes('overcast') || c.includes('fog') || c.includes('partly')) return <Cloud size={18} className="text-gray-400" />
  if (c.includes('thunder') || c.includes('storm')) return <Cloud size={18} className="text-purple-500" />
  return <Sun size={18} className="text-amber-400" />
}

export default function WeatherForecast({ destination, startDate, days }: WeatherForecastProps) {
  const [weather, setWeather] = useState<DayWeather[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<string>('loading')

  // Determine if the first weather day is actually today
  const todayStr = new Date().toISOString().slice(0, 10)
  const startDateStr = startDate ? startDate.toISOString().slice(0, 10) : todayStr
  const isStartingToday = startDateStr === todayStr

  useEffect(() => {
    const fetchWeather = async () => {
      if (!destination || days <= 0) {
        setError('Invalid destination or days')
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          destination: destination.trim(),
          days: String(days),
        })
        if (startDate) {
          params.set('startDate', startDate.toISOString().slice(0, 10))
        }

        const response = await fetch(`/api/weather?${params.toString()}`)

        if (!response.ok) {
          throw new Error('Failed to fetch weather')
        }

        const data = await response.json()
        
        if (data.forecast && Array.isArray(data.forecast)) {
          setWeather(data.forecast)
          setSource(data.source || 'api')
        } else {
          throw new Error('Invalid weather data')
        }
      } catch (err) {
        console.error('Weather fetch error:', err)
        setError('Unable to load weather forecast')
      } finally {
        setLoading(false)
      }
    }

    const timer = setTimeout(() => {
      fetchWeather()
    }, 100)

    return () => clearTimeout(timer)
  }, [destination, days, startDate])

  const getBaseTemperature = (dest: string): number => {
    // Estimate base temperature based on common Sri Lankan destinations
    const destLower = dest.toLowerCase()
    if (destLower.includes('kandy') || destLower.includes('nuwara') || destLower.includes('hill')) return 18
    if (destLower.includes('colombo') || destLower.includes('negombo')) return 30
    if (destLower.includes('jaffna')) return 32
    if (destLower.includes('anuradhapura') || destLower.includes('polonnaruwa')) return 33
    if (destLower.includes('trinco') || destLower.includes('trincomalee')) return 31
    if (destLower.includes('unawatuna') || destLower.includes('galle')) return 29
    return 30 // Default
  }

  if (loading) {
    return (
      <div className="surface-card-sm !p-5">
        <div className="flex items-center gap-2 mb-4">
          <Cloud size={18} className="text-primary" />
          <h3 className="font-semibold text-gray-900">Weather Forecast</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-primary" />
          <span className="ml-2 text-sm text-gray-500">Loading forecast...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="surface-card-sm !p-5">
        <div className="flex items-center gap-2 mb-4">
          <Cloud size={18} className="text-primary" />
          <h3 className="font-semibold text-gray-900">Weather Forecast</h3>
        </div>
        <div className="flex items-center gap-2 text-amber-600 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="surface-card-sm !p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Cloud size={18} className="text-primary" />
          <h3 className="font-semibold text-gray-900">Weather Forecast</h3>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
          <Calendar size={12} />
          <span>{days} day{days > 1 ? 's' : ''} outlook</span>
          {startDate && (
            <span className="text-gray-400">from {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          )}
          {source === 'open-meteo' && (
            <span className="ml-1 text-green-600">✓ Live</span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto -mx-1 px-1">
        <div className="flex gap-2 min-w-max pt-3 pb-1">
        {weather.map((day, idx) => (
          <div 
            key={idx} 
            className={`relative rounded-xl px-2.5 py-2.5 text-center transition-all hover:scale-105 hover:shadow-md w-[80px] shrink-0 ${
              idx === 0 ? 'bg-primary/10 border-2 border-primary/30' : 'bg-gray-50 border border-gray-100'
            }`}
          >
            {idx === 0 && (
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-white text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                {isStartingToday ? 'TODAY' : 'DAY 1'}
              </div>
            )}
            <p className="text-[11px] font-bold text-gray-600 mt-1">{day.day}</p>
            <p className="text-[10px] text-gray-400 mb-1">{day.date}</p>
            <div className="flex justify-center my-1.5">{getWeatherIcon(day.condition)}</div>
            <p className="text-[10px] font-medium text-gray-600 mb-1 leading-tight">{day.condition}</p>
            <div className="flex items-center justify-center gap-0.5 text-[10px]">
              <Thermometer size={10} className="text-red-500" />
              <span className="font-bold text-gray-900">{day.tempHigh}°</span>
              <span className="text-gray-400">/</span>
              <span className="text-gray-500">{day.tempLow}°</span>
            </div>
            <div className="flex items-center justify-center gap-0.5 mt-1 text-[10px] text-gray-500">
              <Droplets size={9} className="text-blue-400" />
              <span>{day.humidity}%</span>
            </div>
            <div className="flex items-center justify-center gap-0.5 mt-0.5 text-[10px] text-gray-400">
              <Wind size={9} />
              <span>{day.windSpeed}</span>
            </div>
          </div>
        ))}
        </div>
      </div>

      {/* Packing suggestions based on weather */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-500 mb-2">💡 Packing suggestions</p>
        <div className="flex flex-wrap gap-2">
          {weather.some(w => w.condition.toLowerCase().includes('rain') || w.condition.toLowerCase().includes('drizzle')) && (
            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full border border-blue-100">
              🌂 Umbrella
            </span>
          )}
          {weather.some(w => w.tempLow < 20) && (
            <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full border border-purple-100">
              🧥 Light jacket
            </span>
          )}
          {weather.every(w => w.condition.toLowerCase().includes('clear') || w.condition.toLowerCase().includes('sunny')) && (
            <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full border border-amber-100">
              🧴 Sunscreen
            </span>
          )}
          {weather.some(w => w.humidity > 70) && (
            <span className="text-xs bg-cyan-50 text-cyan-700 px-2 py-1 rounded-full border border-cyan-100">
              💨 Anti-humidity
            </span>
          )}
          <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full border border-green-100">
            💧 Water bottle
          </span>
          <span className="text-xs bg-gray-50 text-gray-700 px-2 py-1 rounded-full border border-gray-200">
            👟 Comfortable shoes
          </span>
        </div>
      </div>
    </div>
  )
}