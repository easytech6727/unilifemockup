'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { ArrowLeft, Star, MapPin, Clock, ShoppingCart, Plus, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { UserProfile } from '@/lib/auth'

import { getMenuForShop, MenuCategory, MenuItem } from '@/lib/food-utils'

const PRICE_MAP: Record<number, string> = { 0: 'Free', 1: 'Rs', 2: 'Rs', 3: 'Rs', 4: 'Rs' }
const CATEGORY_EMOJI: Record<string, string> = {
    mains: '🍛',
    main: '🍛',
    'fast food': '🍔',
    fast_food: '🍔',
    drinks: '🥤',
    drink: '🥤',
    snacks: '🥐',
    sides: '🍟',
    desserts: '🍨',
    restaurant: '🍜',
    canteen: '🍛',
    default: '🍽️',
}

function formatTime(v: string | null): string {
    if (!v) return '—'
    const s = String(v)
    const match = s.match(/(\d{1,2}):(\d{2})/)
    return match ? `${match[1]}:${match[2]} AM` : s
}

type MenuItemWithStock = MenuItem & { available?: boolean }

function mapDbMenuToCategories(menuItems: { id: number; name: string; price: number | string; food_category?: string | null; is_available?: boolean }[]): MenuCategory[] {
    const byCat: Record<string, MenuItemWithStock[]> = {}
    for (const m of menuItems) {
        const cat = m.food_category?.trim() || 'items'
        if (!byCat[cat]) byCat[cat] = []
        const emojiKey = cat.toLowerCase().trim().replace(/\s+/g, ' ')
        const emojiKeyNormalized = emojiKey.replace(/\s+/g, '_')
        const emoji = CATEGORY_EMOJI[emojiKey] || CATEGORY_EMOJI[emojiKeyNormalized] || CATEGORY_EMOJI[cat.toLowerCase()] || CATEGORY_EMOJI.default
        byCat[cat].push({
            id: String(m.id),
            name: m.name,
            description: m.food_category || '',
            price: Number(m.price) || 0,
            emoji,
            available: m.is_available !== false,
        })
    }
    return Object.entries(byCat).map(([id, items]) => ({
        id,
        label: id.charAt(0).toUpperCase() + id.slice(1),
        emoji: CATEGORY_EMOJI[id.toLowerCase()] || CATEGORY_EMOJI[id.toLowerCase().replace(/\s+/g, '_')] || CATEGORY_EMOJI.default,
        items,
    }))
}

function MenuItemCard({ item, onAdd }: { item: MenuItemWithStock; onAdd: (i: MenuItemWithStock) => void }) {
    const available = item.available !== false
    return (
        <div className="flex items-center gap-4 py-4 border-b border-gray-50 last:border-0">
            <div className="w-14 h-14 rounded-xl bg-emerald-50 flex items-center justify-center text-2xl flex-shrink-0">
                {item.emoji}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900 text-sm">{item.name}</h4>
                    {item.popular && (
                        <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-medium">
                            Popular
                        </span>
                    )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.description}</p>
                <p className="text-sm font-bold text-gray-900 mt-1">Rs {item.price.toFixed(2)}</p>
                <p className={`text-xs mt-1 font-semibold ${available ? 'text-indigo-600' : 'text-red-500'}`}>
                    {available ? 'Available' : 'This item is not available'}
                </p>
            </div>
            <button
                onClick={() => onAdd(item)}
                disabled={!available}
                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors shadow-sm ${available ? 'bg-indigo-500 hover:bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            >
                <Plus size={18} />
            </button>
        </div>
    )
}

type StoredCartItem = { id: string; name: string; price: number; emoji: string; qty: number }

function getCartKey(userId: number, shopId: string) {
    return `unilife_food_cart:${userId}:${shopId}`
}

function readCart(userId: number, shopId: string): StoredCartItem[] {
    try {
        const raw = localStorage.getItem(getCartKey(userId, shopId))
        if (!raw) return []
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) return []
        return parsed
            .map((i: any) => ({
                id: String(i?.id ?? ''),
                name: String(i?.name ?? ''),
                price: Number(i?.price ?? 0),
                emoji: String(i?.emoji ?? '🍽️'),
                qty: Math.max(1, Number(i?.qty ?? 1)),
            }))
            .filter((i) => i.id && i.name)
    } catch {
        return []
    }
}

function writeCart(userId: number, shopId: string, cart: StoredCartItem[]) {
    try {
        localStorage.setItem(getCartKey(userId, shopId), JSON.stringify(cart))
    } catch {
        // ignore
    }
}

function countCart(cart: StoredCartItem[]) {
    return cart.reduce((acc, i) => acc + (i.qty || 0), 0)
}

export default function ShopDetailClient({ user, shopId }: { user: UserProfile; shopId: string }) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const isDbStall = shopId?.startsWith?.('db-') ?? false
    const stallId = isDbStall ? shopId?.replace?.('db-', '') ?? null : null
    const queryStallId = searchParams.get('stallId')

    // Normalize shop id so the cart key matches across pages.
    // Examples:
    // - `db-8` stays `db-8`
    // - `8` becomes `db-8`
    // - if a `stallId` query param exists, prefer `db-${stallId}`
    const cartShopId =
        shopId?.startsWith?.('db-') ? shopId
            : (/^\d+$/.test(shopId) ? `db-${shopId}` : null) ??
                (queryStallId && /^\d+$/.test(queryStallId) ? `db-${queryStallId}` : shopId)

    const [stallData, setStallData] = useState<{
        shop_name: string
        address?: string | null
        banner?: string | null
        logo?: string | null
        is_open?: boolean
        opening_time?: string | null
        closing_time?: string | null
        menu_items: { id: number; name: string; price: number | string; food_category?: string | null; is_available?: boolean }[]
    } | null>(null)
    const [loading, setLoading] = useState(isDbStall)
    const [error, setError] = useState<string | null>(null)

    const name = stallData?.shop_name ?? searchParams.get('name') ?? 'Food Shop'
    const photo = (stallData?.banner || stallData?.logo) ?? searchParams.get('photo') ?? 'https://images.unsplash.com/photo-1567521464027-f127ff144326?w=800&q=80'
    const rating = 4.5
    const price: number = parseInt(searchParams.get('price') ?? '1', 10)
    const address = stallData?.address ?? searchParams.get('address') ?? 'Campus Area'
    const isOpen = stallData?.is_open ?? searchParams.get('open') !== 'false'
    const hoursText = stallData?.opening_time && stallData?.closing_time
        ? `${formatTime(stallData.opening_time)} – ${formatTime(stallData.closing_time)}`
        : '7:00 AM – 9:00 PM'

    const [activeCategory, setActiveCategory] = useState('mains')
    const [cartCount, setCartCount] = useState(0)

    const refreshCartCount = async () => {
        try {
            const res = await fetch(`/api/student/cart-items?cart_type=food&shop_ref=${encodeURIComponent(cartShopId)}`)
            const data = await res.json().catch(() => null)
            if (!res.ok || !Array.isArray(data?.items)) {
                setCartCount(0)
                return
            }
            const total = data.items.reduce((acc: number, i: any) => acc + Math.max(0, Number(i?.qty ?? 0)), 0)
            setCartCount(total)
        } catch {
            setCartCount(0)
        }
    }

    // Menu: from DB if available, else mock
    const tags = searchParams.get('tags')?.split(',') ?? []
    const dbMenu = stallData?.menu_items?.length ? mapDbMenuToCategories(stallData.menu_items) : null
    const mockMenu = getMenuForShop(name, tags)
    const menu = (dbMenu && dbMenu.length > 0) ? dbMenu : mockMenu
    const activeMenu = menu.find((c) => c.id === activeCategory) ?? menu[0]

    useEffect(() => {
        if (menu.length > 0 && !menu.some((c) => c.id === activeCategory)) {
            setActiveCategory(menu[0].id)
        }
    }, [menu, activeCategory])

    useEffect(() => {
        if (isDbStall && stallId) {
            setLoading(true)
            fetch(`/api/student/food-stalls/${stallId}`)
                .then(async (r) => {
                    if (!r.ok) {
                        const text = await r.text().catch(() => '')
                        throw new Error(`HTTP ${r.status}${text ? `: ${text.slice(0, 200)}` : ''}`)
                    }
                    return r.json()
                })
                .then(setStallData)
                .catch((e) => setError(e?.message ?? 'Failed to load'))
                .finally(() => setLoading(false))
        }
    }, [isDbStall, stallId])

    useEffect(() => {
        refreshCartCount()
    }, [user.id, cartShopId])

    const addToCart = async (item: MenuItemWithStock) => {
        if (item.available === false) return
        await fetch('/api/student/cart-items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cart_type: 'food',
                shop_ref: cartShopId,
                item_ref: item.id,
                item_name: item.name,
                item_description: item.description || '',
                item_emoji: item.emoji || '🍽️',
                unit_price: Number(item.price) || 0,
                qty_delta: 1,
            }),
        })
        await refreshCartCount()
    }

    const orderParams = new URLSearchParams({ name, photo })
    if (isDbStall && stallId) orderParams.set('stallId', stallId)
    if (tags.length) orderParams.set('tags', tags.join(','))
    const orderUrl = `/student/food-order/${encodeURIComponent(shopId)}/order?${orderParams}`

    if (loading && isDbStall) {
        return (
            <DashboardLayout user={user}>
                <div className="max-w-3xl mx-auto py-20 flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                    <p className="text-gray-500">Loading stall details…</p>
                </div>
            </DashboardLayout>
        )
    }

    if (error && isDbStall) {
        return (
            <DashboardLayout user={user}>
                <div className="max-w-3xl mx-auto py-20 text-center">
                    <p className="text-red-500 font-medium">{error}</p>
                    <button onClick={() => router.back()} className="mt-4 text-sm text-indigo-500 hover:underline">
                        Back to Food
                    </button>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout user={user}>
            <div className="max-w-3xl mx-auto pb-32">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
                >
                    <ArrowLeft size={16} /> Back to Food
                </button>

                {/* Hero */}
                <div className="relative rounded-2xl overflow-hidden h-56 bg-gray-100 mb-6">
                    <img
                        src={photo} alt={name} className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1567521464027-f127ff144326?w=800&q=80' }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                        <h1 className="text-2xl font-bold text-white">{name}</h1>
                        <p className="text-sm text-white/80 mt-0.5 flex items-center gap-1">
                            <MapPin size={12} /> {address}
                        </p>
                    </div>
                    <span className={`absolute top-4 right-4 text-xs font-semibold px-3 py-1 rounded-full ${isOpen ? 'bg-indigo-500 text-white' : 'bg-gray-800 text-gray-200'}`}>
                        {isOpen ? '● Open' : '● Closed'}
                    </span>
                </div>

                {/* Info row */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-6">
                    <div className="flex items-center gap-2">
                        <Star size={18} className="text-amber-400 fill-amber-400" />
                        <div>
                            <p className="text-sm font-bold text-gray-900">{rating.toFixed(1)} / 5.0</p>
                            <p className="text-xs text-gray-400">Rating</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-lg">{PRICE_MAP[price] ?? '$'}</span>
                        <div>
                            <p className="text-sm font-bold text-gray-900">
                                {price <= 1 ? 'Budget-friendly' : price === 2 ? 'Moderate' : 'Premium'}
                            </p>
                            <p className="text-xs text-gray-400">Price range</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock size={18} className="text-gray-400" />
                        <div>
                            <p className="text-sm font-bold text-gray-900">{hoursText}</p>
                            <p className="text-xs text-gray-400">Hours</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <MapPin size={18} className="text-gray-400" />
                        <div>
                            <p className="text-sm font-bold text-gray-900 max-w-[180px] line-clamp-1">{address}</p>
                            <p className="text-xs text-gray-400">Location</p>
                        </div>
                    </div>
                </div>

                {/* Menu */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                        <h2 className="text-lg font-bold text-gray-900">Menu</h2>
                    </div>
                    <div className="flex gap-2 px-4 py-3 overflow-x-auto border-b border-gray-100" style={{ scrollbarWidth: 'none' }}>
                        {menu.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${activeCategory === cat.id ? 'bg-indigo-500 text-white' : 'text-gray-500 hover:bg-gray-100'
                                    }`}
                            >
                                {cat.emoji} {cat.label}
                            </button>
                        ))}
                    </div>
                    <motion.div
                        key={activeCategory}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2 }}
                        className="px-4"
                    >
                        {activeMenu?.items.map((item) => (
                            <MenuItemCard key={item.id} item={item} onAdd={addToCart} />
                        ))}
                    </motion.div>
                </div>
            </div>

            {/* Sticky Order bar */}
            <div className="fixed bottom-0 left-0 right-0 lg:left-64 p-4 bg-white border-t border-gray-100 shadow-lg z-20">
                <Link
                    href={orderUrl}
                    className="flex items-center justify-between w-full max-w-3xl mx-auto bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-6 py-3.5 rounded-xl transition-colors shadow-md"
                >
                    <span className="flex items-center gap-2">
                        <ShoppingCart size={20} /> Order Now
                    </span>
                    {cartCount > 0 && (
                        <span className="bg-white text-indigo-500 text-sm font-bold px-2.5 py-0.5 rounded-full">
                            {cartCount} added
                        </span>
                    )}
                    <span className="text-indigo-100 text-sm">View full cart →</span>
                </Link>
            </div>
        </DashboardLayout>
    )
}
