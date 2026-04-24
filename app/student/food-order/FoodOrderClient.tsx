'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import {
    Search,
    MapPin,
    Star,
    Filter,
    ChevronRight,
    Loader2,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { UserProfile } from '@/lib/auth'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Shop {
    place_id: string
    name: string
    vicinity: string
    rating: number
    user_ratings_total: number
    price_level: number
    types: string[]
    opening_hours?: { open_now: boolean }
    photo_url: string
    distance: string | null
    tags: string[]
    menu_items?: { id: number; name: string; price: number | string; food_category?: string | null }[]
}

const CATEGORIES = [
    { id: 'all', label: 'All', emoji: '🍽️' },
    { id: 'canteen', label: 'Canteen', emoji: '🏫' },
    { id: 'cafe', label: 'Cafe', emoji: '☕' },
    { id: 'fast_food', label: 'Fast Food', emoji: '🍔' },
    { id: 'restaurant', label: 'Restaurant', emoji: '🍜' },
    { id: 'dessert', label: 'Desserts', emoji: '🍨' },
]

const PRICE_LABELS: Record<number, string> = { 0: 'Free', 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' }

function PriceIndicator({ level }: { level: number }) {
    return (
        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            {PRICE_LABELS[level] ?? '$'}
        </span>
    )
}

function RatingStars({ rating }: { rating: number }) {
    return (
        <span className="flex items-center gap-1 text-sm font-medium text-amber-500">
            <Star size={14} className="fill-amber-400 stroke-amber-400" />
            {rating?.toFixed(1)}
        </span>
    )
}

function ShopCard({ shop, onClick }: { shop: Shop; onClick: () => void }) {
    const isOpen = shop.opening_hours?.open_now ?? true
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            whileHover={{ y: -3, transition: { duration: 0.15 } }}
            onClick={onClick}
            className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
        >
            <div className="relative h-44 overflow-hidden bg-gray-100">
                <img
                    src={shop.photo_url}
                    alt={shop.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        ; (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1567521464027-f127ff144326?w=600&q=80'
                    }}
                />
                <span
                    className={`absolute top-3 right-3 text-xs font-semibold px-2.5 py-1 rounded-full ${isOpen ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-gray-200'
                        }`}
                >
                    {isOpen ? '● Open' : '● Closed'}
                </span>
                {shop.distance && (
                    <span className="absolute bottom-3 left-3 text-xs font-medium text-white bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-1">
                        <MapPin size={10} /> {shop.distance}
                    </span>
                )}
            </div>
            <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900 text-base leading-snug line-clamp-1">
                        {shop.name}
                    </h3>
                    <ChevronRight size={18} className="text-gray-400 flex-shrink-0 mt-0.5" />
                </div>
                <p className="text-xs text-gray-500 mt-1 line-clamp-1 flex items-center gap-1">
                    <MapPin size={10} className="flex-shrink-0" /> {shop.vicinity}
                </p>
                <div className="flex items-center gap-3 mt-3">
                    <RatingStars rating={shop.rating} />
                    <span className="text-xs text-gray-400">({shop.user_ratings_total})</span>
                    <PriceIndicator level={shop.price_level ?? 1} />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                    {shop.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                            {tag}
                        </span>
                    ))}
                </div>
                {shop.menu_items && shop.menu_items.length > 0 && (
                    <p className="text-xs text-gray-400 mt-2">
                        📋 {shop.menu_items.length} menu item{shop.menu_items.length !== 1 ? 's' : ''}
                    </p>
                )}
            </div>
        </motion.div>
    )
}

export default function FoodOrderClient({ user }: { user: UserProfile }) {
    const router = useRouter()
    // ⬇ start with empty array – no demo data
    const [shops, setShops] = useState<Shop[]>([])
    const [filtered, setFiltered] = useState<Shop[]>([])
    const [loading, setLoading] = useState(false)
    const [search, setSearch] = useState('')
    const [activeCategory, setActiveCategory] = useState('all')
    const [budgetOnly, setBudgetOnly] = useState(false)
    const [dataSource, setDataSource] = useState<'mixed' | 'database' | 'google' | 'empty' | 'error'>('database')
    const [locationGranted, setLocationGranted] = useState<boolean | null>(null)
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
    const [apiError, setApiError] = useState<string | null>(null)
    const fetchShops = useCallback(async (lat?: number, lng?: number) => {
        setApiError(null)
        try {
            // Merge DB stalls + nearby places (Google/OSM/etc)
            let url = '/api/student/food-stalls'
            if (lat != null && lng != null) {
                url += `?lat=${lat}&lng=${lng}`
            }
            const res = await fetch(url)
            if (!res.ok) throw new Error(`API responded with HTTP ${res.status}`)
            const data = await res.json()
            const results = data.results ?? []

            if (data.error) setApiError(data.error)
            else if (data.google_error) setApiError(data.google_error)

            setShops(results)
            setDataSource(data.source ?? 'database')
        } catch (err: any) {
            console.warn('[FoodOrder] fetch failed:', err)
            setApiError(`Fetch error: ${err?.message ?? err}`)
        }
    }, [])

    const hasFetched = useRef(false)

    useEffect(() => {
        if (hasFetched.current) return
        hasFetched.current = true

        // Fetch DB food stores immediately (no location needed)
        fetchShops()

        // Try to add Google Places when location is available
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords
                    setLocationGranted(true)
                    setCoords({ lat: latitude, lng: longitude })
                    fetchShops(latitude, longitude)
                },
                () => setLocationGranted(false),
                { timeout: 10000, maximumAge: 60000 }
            )
        } else {
            setLocationGranted(false)
        }
    }, [fetchShops])

    useEffect(() => {
        let result = [...shops]
        if (search.trim()) {
            const q = search.toLowerCase()
            result = result.filter(
                (s) =>
                    s.name.toLowerCase().includes(q) ||
                    s.tags.some((t) => t.toLowerCase().includes(q)) ||
                    (s.vicinity?.toLowerCase().includes(q) ?? false)
            )
        }
        if (activeCategory !== 'all') {
            result = result.filter(
                (s) =>
                    s.types?.some((t) => t.includes(activeCategory)) ||
                    s.tags?.some((t) => t.toLowerCase().includes(activeCategory.replace('_', ' ')))
            )
        }
        if (budgetOnly) {
            result = result.filter((s) => (s.price_level ?? 1) <= 1)
        }
        setFiltered(result)
    }, [shops, search, activeCategory, budgetOnly])

    const goToShop = (shop: Shop) => {
        const q = new URLSearchParams({
            name: shop.name,
            photo: shop.photo_url,
            rating: String(shop.rating),
            price: String(shop.price_level ?? 1),
            address: shop.vicinity ?? '',
            open: String(shop.opening_hours?.open_now ?? true),
        })
        if (shop.tags?.length) q.set('tags', shop.tags.join(','))
        router.push(`/student/food-order/${encodeURIComponent(shop.place_id)}?${q}`)
    }

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6 pb-10">
                {/* Header gradient */}
                <div className="bg-gradient-to-r from-indigo-600 via-indigo-600 to-indigo-800 rounded-2xl p-6 text-white">
                    <div className="flex items-center gap-3 mb-1">
                        <span className="text-3xl">🍕</span>
                        <h1 className="text-2xl font-bold">Food Near You</h1>
                    </div>
                    <p className="text-indigo-100 text-sm">
                        Affordable eats for uni students · Sorted by price &amp; rating
                    </p>
                </div>

                {/* Debug info bar */}
                <div className="bg-gray-100 rounded-xl px-4 py-2 text-xs text-gray-500 space-y-1">
                    <div className="flex flex-wrap gap-3 items-center">
                        <span>📍 {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : locationGranted === false ? 'Location denied' : 'Waiting for location…'}</span>
                        <span>•</span>
                        <span>Source: <strong className={['mixed', 'database', 'google'].includes(dataSource) ? 'text-emerald-600' : 'text-amber-600'}>{dataSource === 'mixed' ? '🌐 DB + Google' : dataSource === 'database' ? '📦 Database' : dataSource === 'google' ? '🗺️ Google Places' : dataSource}</strong></span>
                        <span>•</span>
                        <span>{shops.length} places</span>
                        {(shops.some((s) => (s as any).source === 'google') || apiError) && (
                            <>
                                <span>•</span>
                                <span className={shops.some((s) => (s as any).source === 'google') ? 'text-emerald-600' : 'text-amber-600'}>
                                    Google: {shops.filter((s) => (s as any).source === 'google').length} restaurants
                                </span>
                            </>
                        )}
                    </div>
                    {apiError && (
                        <div className="text-red-500 font-medium mt-1">⚠️ {apiError.replace('Google', 'API')}</div>
                    )}
                </div>

                {/* Search + Budget filter */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search
                            size={18}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                        />
                        <input
                            type="text"
                            placeholder="Search shops, cuisine, food…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
                        />
                    </div>
                    <button
                        onClick={() => setBudgetOnly((v) => !v)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${budgetOnly
                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400'
                            }`}
                    >
                        <Filter size={16} /> Budget ($)
                    </button>
                </div>

                {/* Category chips */}
                <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeCategory === cat.id
                                ? 'bg-emerald-500 text-white shadow-sm'
                                : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-400'
                                }`}
                        >
                            <span>{cat.emoji}</span> {cat.label}
                        </button>
                    ))}
                </div>

                {/* Results */}
                {loading || (locationGranted === null && shops.length === 0) ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
                        <p className="text-gray-500 text-sm">
                            {locationGranted === null ? 'Getting your location to find nearby shops…' : 'Finding food near you…'}
                        </p>
                        <p className="text-xs text-gray-400">Allow location access for the best results</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20">
                        <span className="text-5xl">🍽️</span>
                        <p className="mt-4 text-gray-500 font-medium">No shops found</p>
                        <p className="text-sm text-gray-400">Try a different search or filter</p>
                    </div>
                ) : (
                    <>
                        <p className="text-sm text-gray-500">
                            {filtered.length} place{filtered.length !== 1 ? 's' : ''} found
                        </p>
                        {!loading && filtered.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center justify-center py-20 text-center"
                            >
                                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                    <MapPin size={32} className="text-gray-400" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">No stalls found nearby</h3>
                                <p className="text-gray-500 max-w-xs mt-2">
                                    We couldn't find any food stalls in your immediate area. Try clearing filters or searching for a different name.
                                </p>
                            </motion.div>
                        )}

                        <AnimatePresence mode="popLayout">
                            <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                {filtered.map((shop) => (
                                    <ShopCard key={shop.place_id} shop={shop} onClick={() => goToShop(shop)} />
                                ))}
                            </motion.div>
                        </AnimatePresence>
                    </>
                )}
            </div>
        </DashboardLayout>
    )
}
