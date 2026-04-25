'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'

interface MapPoint {
  lat: number
  lng: number
  title: string
}

interface TripMapProps {
  points: MapPoint[]
  destination: string
}

export default function TripMap({ points, destination }: TripMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return

    let mounted = true

    const initMap = async () => {
      try {
        setLoading(true)
        setError(null)

        // Ensure Leaflet is loaded
        let L = (window as any).L
        if (!L) {
          // Load CSS
          const link = document.createElement('link')
          link.rel = 'stylesheet'
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
          document.head.appendChild(link)

          // Load JS
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script')
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
            script.async = true
            script.onload = () => {
              L = (window as any).L
              if (L) resolve()
              else reject(new Error('Leaflet loaded but not available'))
            }
            script.onerror = () => reject(new Error('Failed to load Leaflet library'))
            document.head.appendChild(script)
          })
        }

        if (!mounted || !mapRef.current || !L) {
          console.warn('Map not mounted or Leaflet not available')
          if (mounted) setError('Map initialization failed')
          return
        }

        // Destroy previous map instance
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.remove()
          } catch (e) {
            console.warn('Error removing previous map:', e)
          }
          mapInstanceRef.current = null
        }

        // Wait for DOM to be ready
        await new Promise(r => setTimeout(r, 50))

        if (!mounted || !mapRef.current) return

        // Create new map
        const mapContainer = mapRef.current
        mapContainer.innerHTML = '' // Clear any previous content

        const map = L.map(mapContainer, {
          preferCanvas: true,
          attributionControl: true
        })
        
        if (!map) {
          throw new Error('Failed to create map instance')
        }

        mapInstanceRef.current = map

        // Set initial view
        map.setView([20, 0], 2)

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
          crossOrigin: true,
        }).addTo(map)

        // Process points
        const validPoints = points.filter(
          p => typeof p.lat === 'number' && 
               typeof p.lng === 'number' && 
               isFinite(p.lat) && 
               isFinite(p.lng)
        )

        if (validPoints.length > 0) {
          const coords: [number, number][] = validPoints.map(p => [p.lat, p.lng])

          // Add markers
          validPoints.forEach((p, i) => {
            const marker = L.marker([p.lat, p.lng])
            marker.addTo(map)
            marker.bindPopup(`<div class="text-xs font-medium"><b>${i + 1}. ${p.title}</b></div>`)
          })

          // Add polyline connecting points
          if (coords.length > 1) {
            L.polyline(coords, {
              color: '#6366f1',
              weight: 3,
              opacity: 0.8,
              dashArray: '8, 5',
              lineJoin: 'round',
              lineCap: 'round',
            }).addTo(map)
          }

          // Fit to bounds
          const bounds = L.latLngBounds(coords)
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
        } else {
          console.log('No valid points to display on map')
        }

        setLoading(false)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        console.error('Map init error:', msg, err)
        if (mounted) {
          setError(msg)
          setLoading(false)
        }
      }
    }

    // Add a small delay to ensure parent container is rendered
    const timer = setTimeout(() => {
      if (mapRef.current) {
        initMap()
      }
    }, 100)

    return () => {
      mounted = false
      clearTimeout(timer)
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove()
        } catch (e) {
          console.warn('Cleanup error:', e)
        }
        mapInstanceRef.current = null
      }
    }
  }, [points])

  return (
    <div className="w-full h-full relative">
      <div
        ref={mapRef}
        className="w-full h-full z-0 bg-gray-100"
        style={{ minHeight: '300px' }}
      />
      
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50/50 z-10">
          <div className="text-xs text-gray-500">Loading map...</div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50/90 z-10 p-4">
          <div className="flex items-center gap-2 text-red-700 text-xs text-center">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}
    </div>
  )
}
