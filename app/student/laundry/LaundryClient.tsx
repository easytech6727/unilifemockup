'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import {
    Search,
    MapPin,
    Star,
    Phone,
    ChevronRight,
    SearchX,
    Loader2,
    Wifi
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { UserProfile } from '@/lib/auth'

interface LaundryVendor {
    id: string
    name: string
    image: string
    pricePerKg: number
    contact: string
    address: string
    rating: number
}

export default function LaundryClient({ user }: { user: UserProfile }) {
    const router = useRouter()
    const [vendors, setVendors] = useState<LaundryVendor[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)

    const fetchVendors = useCallback(async (lat?: number, lng?: number) => {
        setLoading(true)
        try {
            // DB-backed list of laundry shops
            let url = '/api/student/laundry'
            if (lat != null && lng != null) url += `?lat=${lat}&lng=${lng}`
            const res = await fetch(url)
            const data = await res.json()
            setVendors(data.results || [])
        } catch (err) {
            console.error('Failed to fetch laundry vendors:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    const hasFetched = useRef(false)

    useEffect(() => {
        if (hasFetched.current) return
        hasFetched.current = true

        if (typeof navigator !== 'undefined' && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords
                    setCoords({ lat: latitude, lng: longitude })
                    fetchVendors(latitude, longitude)
                },
                () => {
                    fetchVendors()
                }
            )
        } else {
            fetchVendors()
        }
    }, [fetchVendors])

    const filteredVendors = vendors.filter(v =>
        v.name.toLowerCase().includes(search.toLowerCase()) ||
        v.address.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6 pb-10">
                {/* Header Section */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">🧺</div>
                            <h1 className="text-3xl font-bold">Laundry Services</h1>
                        </div>
                        <p className="text-blue-100 max-w-md">
                            Fresh clothes, zero effort. Showing the best laundry vendors near your campus.
                        </p>
                        <div className="mt-4 flex items-center gap-2 text-xs bg-white/10 px-3 py-1.5 rounded-full w-fit">
                            <Wifi size={12} className="text-blue-300" />
                            <span>{coords ? 'Live results near you' : 'Showing results near Jaffna'}</span>
                        </div>
                    </div>
                    {/* Decorative element */}
                    <div className="absolute top-[-20px] right-[-20px] w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                </div>

                {/* Search Bar */}
                <div className="relative group max-w-2xl">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Search by shop name or location..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-700"
                    />
                </div>

                {/* Vendor Grid */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-400">
                        <Loader2 className="animate-spin" size={40} />
                        <p className="font-medium">Searching for vendors...</p>
                    </div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        {filteredVendors.length > 0 ? (
                            <motion.div
                                layout
                                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                            >
                                {filteredVendors.map((vendor) => (
                                    <motion.div
                                        key={vendor.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all group flex flex-col h-full"
                                    >
                                        <div className="h-48 overflow-hidden relative">
                                            <img
                                                src={vendor.image}
                                                alt={vendor.name}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    target.src = 'https://images.unsplash.com/photo-1545173168-9f1947eeba01?w=800&q=80';
                                                }}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            <div className="absolute bottom-4 left-4 right-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                                                <p className="text-white text-xs flex items-center gap-1">
                                                    <MapPin size={12} /> {vendor.address}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="p-6 flex flex-col flex-1">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold text-gray-900 text-lg group-hover:text-blue-600 transition-colors line-clamp-1">
                                                    {vendor.name}
                                                </h3>
                                                <div className="flex items-center gap-1 text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap">
                                                    <Star size={12} className="fill-amber-500" />
                                                    {vendor.rating.toFixed(1)}
                                                </div>
                                            </div>

                                            <p className="text-sm text-gray-500 flex items-center gap-2 mb-4">
                                                <Phone size={14} className="text-gray-400" /> {vendor.contact}
                                            </p>

                                            <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Starts at</span>
                                                    <span className="text-xl font-black text-blue-600">Rs. {vendor.pricePerKg}<span className="text-xs text-gray-400 font-normal"> / kg</span></span>
                                                </div>
                                                <button
                                                    onClick={() => router.push(`/student/laundry/${vendor.id}`)}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-2xl transition-all shadow-md active:scale-95 group/btn"
                                                >
                                                    <ChevronRight className="group-hover/btn:translate-x-0.5 transition-transform" />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col items-center justify-center py-20 text-gray-400"
                            >
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                    <SearchX size={40} />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-600">No vendors found</h3>
                                <p className="text-sm">Try searching for something else</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </div>
        </DashboardLayout>
    )
}
