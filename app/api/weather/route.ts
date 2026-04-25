import { NextResponse } from 'next/server'

// Sri Lankan cities coordinates mapping
const cityCoordinates: Record<string, { lat: number; lng: number }> = {
  colombo: { lat: 6.9271, lng: 79.8612 },
  kandy: { lat: 7.2906, lng: 80.6337 },
  nuwara: { lat: 6.9497, lng: 80.7891 },
  'nuwara eliya': { lat: 6.9497, lng: 80.7891 },
  galle: { lat: 6.0535, lng: 80.2210 },
  unawatuna: { lat: 6.0104, lng: 80.2535 },
  negombo: { lat: 7.2128, lng: 79.8388 },
  anuradhapura: { lat: 8.3114, lng: 80.4030 },
  polonnaruwa: { lat: 7.9403, lng: 81.0188 },
  trinco: { lat: 8.5874, lng: 81.2352 },
  trincomalee: { lat: 8.5874, lng: 81.2352 },
  jaffna: { lat: 9.6615, lng: 80.0255 },
  dambulla: { lat: 7.8868, lng: 80.6518 },
  sigiriya: { lat: 7.9573, lng: 80.7600 },
  bentota: { lat: 6.4200, lng: 80.0900 },
  mirissa: { lat: 5.9550, lng: 80.7900 },
  ella: { lat: 6.8661, lng: 81.0466 },
  haputale: { lat: 6.7684, lng: 80.9500 },
  badulla: { lat: 7.0000, lng: 81.0000 },
  matale: { lat: 7.4700, lng: 80.6200 },
  kurunegala: { lat: 7.4743, lng: 80.3620 },
}

// Get coordinates for a destination
function getCoordinates(destination: string): { lat: number; lng: number } | null {
  const dest = destination.toLowerCase().trim()
  
  // Check exact match first
  if (cityCoordinates[dest]) {
    return cityCoordinates[dest]
  }
  
  // Check partial match
  for (const [city, coords] of Object.entries(cityCoordinates)) {
    if (dest.includes(city) || city.includes(dest)) {
      return coords
    }
  }
  
  return null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const destination = searchParams.get('destination')
  const days = Math.max(1, Math.min(parseInt(searchParams.get('days') || '7', 10), 16))
  const requestedDate = searchParams.get('startDate')

  if (!destination) {
    return NextResponse.json(
      { error: 'Destination is required' },
      { status: 400 }
    )
  }

  const today = new Date()
  const todayIso = today.toISOString().slice(0, 10)
  const startDate = requestedDate && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(requestedDate)
    ? requestedDate
    : todayIso

  const coords = getCoordinates(destination)
  
  if (!coords) {
    // Return fallback data for unknown destinations
    return NextResponse.json({
      destination,
      forecast: generateFallbackWeather(destination, days, startDate),
      source: 'fallback'
    })
  }

  try {
    // Fetch weather from Open-Meteo API (free, no API key needed)
    const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode,windspeed_10m_max&timezone=Asia/Colombo&start_date=${startDate}&forecast_days=${days}`
    
    const response = await fetch(forecastUrl, {
      next: { revalidate: 3600 } // Cache for 1 hour
    })

    if (!response.ok) {
      throw new Error('Weather API request failed')
    }

    const data = await response.json()

    // Transform API response to our format
    const forecast = data.daily.time.map((date: string, i: number) => {
      const weatherCode = data.daily.weathercode[i]
      const condition = getWeatherCondition(weatherCode)
      
      return {
        day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        condition,
        tempHigh: Math.round(data.daily.temperature_2m_max[i]),
        tempLow: Math.round(data.daily.temperature_2m_min[i]),
        humidity: Math.round(data.daily.precipitation_probability_max[i] || 0),
        windSpeed: Math.round(data.daily.windspeed_10m_max?.[i] ?? 0),
        icon: getWeatherIcon(weatherCode)
      }
    })

    return NextResponse.json({
      destination,
      coords,
      forecast,
      source: 'open-meteo'
    })

  } catch (error) {
    console.error('Weather API error:', error)
    return NextResponse.json({
      destination,
      forecast: generateFallbackWeather(destination, days, startDate),
      source: 'fallback'
    })
  }
}

// Map Open-Meteo weather codes to conditions
function getWeatherCondition(code: number): string {
  const weatherCodes: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with hail',
    99: 'Thunderstorm with heavy hail',
  }

  if (code <= 3) return 'Clear'
  if (code <= 48) return 'Cloudy'
  if (code <= 55) return 'Drizzle'
  if (code <= 65) return 'Rain'
  if (code <= 75) return 'Snow'
  if (code <= 82) return 'Rain showers'
  if (code >= 95) return 'Thunderstorm'
  
  return 'Clear'
}

function getWeatherIcon(code: number): string {
  if (code <= 3) return 'sunny'
  if (code <= 48) return 'cloudy'
  if (code <= 55) return 'drizzle'
  if (code <= 65) return 'rain'
  if (code <= 75) return 'snow'
  if (code <= 82) return 'rain'
  if (code >= 95) return 'storm'
  return 'sunny'
}

// Generate fallback data for when API fails
function generateFallbackWeather(destination: string, days: number, startDateStr?: string) {
  const baseTemp = getBaseTemperature(destination)
  const conditions = ['Clear', 'Partly cloudy', 'Clear', 'Cloudy', 'Clear']
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  
  // Use provided startDate or default to today
  let startDate = new Date()
  if (startDateStr && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(startDateStr)) {
    startDate = new Date(startDateStr)
  }
  
  return Array.from({ length: Math.min(days, 7) }, (_, i) => {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    const condition = conditions[i % conditions.length]
    
    return {
      day: dayNames[date.getDay()],
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      condition,
      tempHigh: Math.round(baseTemp + (Math.random() * 4 - 2)),
      tempLow: Math.round(baseTemp - 8 + (Math.random() * 4 - 2)),
      humidity: Math.floor(Math.random() * 30) + 50,
      windSpeed: Math.floor(Math.random() * 15) + 5,
      icon: condition.toLowerCase().includes('clear') ? 'sunny' : 'cloudy'
    }
  })
}

function getBaseTemperature(dest: string): number {
  const d = dest.toLowerCase()
  if (d.includes('kandy') || d.includes('nuwara') || d.includes('hill') || d.includes('ella') || d.includes('haputale')) return 18
  if (d.includes('colombo') || d.includes('negombo')) return 30
  if (d.includes('jaffna')) return 32
  if (d.includes('anuradhapura') || d.includes('polonnaruwa')) return 33
  if (d.includes('trinco')) return 31
  if (d.includes('unawatuna') || d.includes('galle') || d.includes('mirissa') || d.includes('bentota')) return 29
  return 30
}