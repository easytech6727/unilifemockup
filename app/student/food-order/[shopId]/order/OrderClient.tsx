'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { ArrowLeft, Plus, Minus, ShoppingBag, Bike, Store, Trash2, CheckCircle, Bell } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { UserProfile } from '@/lib/auth'

interface CartItem { id: string; dbId?: string; name: string; price: number; emoji: string; qty: number }

const DEFAULT_CART: CartItem[] = []
const DELIVERY_FEE = 150.0 // Rs

const DELIVERY_OPTIONS = [
    { id: 'delivery', label: 'Delivery', icon: Bike, eta: '15–25 min' },
    { id: 'pickup', label: 'Pick Up', icon: Store, eta: '10 min' },
]

const PAYMENT_OPTIONS = [
    { id: 'cod', label: 'Cash on Delivery' },
    { id: 'card', label: 'Visa / Mastercard' },
    { id: 'wallet', label: 'Online Wallet' },
]

function isLuhnValid(digits: string): boolean {
    let sum = 0
    let shouldDouble = false
    for (let i = digits.length - 1; i >= 0; i--) {
        let d = Number(digits[i])
        if (shouldDouble) {
            d *= 2
            if (d > 9) d -= 9
        }
        sum += d
        shouldDouble = !shouldDouble
    }
    return sum % 10 === 0
}

function isVisaOrMastercard(digits: string): boolean {
    const visa = /^4\d{12}(\d{3}){0,2}$/
    const mastercard = /^(5[1-5]\d{14}|2(2[2-9]\d{12}|[3-6]\d{13}|7[01]\d{12}|720\d{12}))$/
    return visa.test(digits) || mastercard.test(digits)
}

function isValidCardholderName(name: string): boolean {
    const clean = name.trim().replace(/\s+/g, ' ')
    if (clean.length < 3 || clean.length > 60) return false
    return /^[A-Za-z][A-Za-z\s.'-]*$/.test(clean)
}

function isValidExpiry(expiry: string): boolean {
    const raw = String(expiry || '').trim()
    const withSlash = raw.includes('/') ? raw : raw.replace(/\D/g, '').replace(/^(\d{2})(\d{0,2}).*$/, '$1/$2')
    const m = withSlash.match(/^(\d{2})\/(\d{2})$/)
    if (!m) return false
    const month = Number(m[1])
    const year = 2000 + Number(m[2])
    if (month < 1 || month > 12) return false
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()
    if (year < currentYear) return false
    if (year === currentYear && month < currentMonth) return false
    if (year > currentYear + 15) return false
    return true
}

function formatExpiryInput(raw: string): string {
    const digits = String(raw || '').replace(/\D/g, '').slice(0, 4)
    const mm = digits.slice(0, 2)
    const yy = digits.slice(2, 4)
    if (digits.length <= 2) return mm
    return `${mm}/${yy}`
}

function CartItemRow({ item, onInc, onDec, onRemove }: { item: CartItem; onInc: () => void; onDec: () => void; onRemove: () => void }) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10, height: 0 }}
            className="flex items-center gap-3 py-4 border-b border-gray-50 last:border-0"
        >
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">{item.emoji}</div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.name}</p>
                <p className="text-sm font-bold text-indigo-500 mt-0.5">Rs {(item.price * item.qty).toFixed(2)}</p>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={onDec} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors">
                    <Minus size={14} />
                </button>
                <span className="w-6 text-center text-sm font-bold">{item.qty}</span>
                <button onClick={onInc} className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center hover:bg-indigo-600 transition-colors">
                    <Plus size={14} />
                </button>
                <button onClick={onRemove} className="w-8 h-8 ml-1 rounded-full text-red-400 hover:bg-red-50 flex items-center justify-center transition-colors">
                    <Trash2 size={14} />
                </button>
            </div>
        </motion.div>
    )
}

function SuccessModal({ shopName, onClose }: { shopName: string; onClose: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        >
            <motion.div
                initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
            >
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-10 h-10 text-emerald-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Order Placed! 🎉</h2>
                <p className="text-gray-500 text-sm mt-2">
                    Your order from <span className="font-semibold text-gray-700">{shopName}</span> has been received. You'll get a confirmation shortly.
                </p>
                <div className="mt-4 bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
                    📍 Estimated arrival: <strong>15–20 min</strong>
                </div>
                <button onClick={onClose} className="mt-6 w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 rounded-xl transition-colors">
                    Done
                </button>
            </motion.div>
        </motion.div>
    )
}

function sanitizeCart(parsed: any[]): CartItem[] {
    return parsed
        .map((i: any) => ({
            id: (() => {
                const raw = String(i?.id ?? '')
                return raw.startsWith('dbm-') ? raw.replace('dbm-', '') : raw
            })(),
            name: String(i?.name ?? ''),
            price: Number(i?.price ?? 0),
            emoji: String(i?.emoji ?? '🍽️'),
            qty: Math.max(1, Number(i?.qty ?? 1)),
        }))
        .filter((i) => i.id && i.name && Number.isFinite(i.price) && i.price >= 0)
}

export default function OrderClient({ user, shopId }: { user: UserProfile; shopId: string }) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const shopName = searchParams.get('name') ?? 'Food Shop'
    const shopPhoto = searchParams.get('photo') ?? ''
    const queryStallId = searchParams.get('stallId')

    // Normalize shop id so the cart key matches the value used on the shop page.
    // - `db-8` stays `db-8`
    // - `8` becomes `db-8`
    // - if `stallId` query param exists, prefer `db-${stallId}`
    const cartShopId =
        shopId?.startsWith?.('db-') ? shopId : (/^\d+$/.test(shopId) ? `db-${shopId}` : null) ??
            (queryStallId && /^\d+$/.test(queryStallId) ? `db-${queryStallId}` : shopId)

    const [cart, setCart] = useState<CartItem[]>(DEFAULT_CART)
    const [deliveryMode, setDeliveryMode] = useState<'delivery' | 'pickup'>('delivery')
    const [notes, setNotes] = useState('')
    const [placing, setPlacing] = useState(false)
    const [success, setSuccess] = useState(false)
    const [paymentMethod, setPaymentMethod] = useState<'cod' | 'card' | 'wallet'>('cod')
    const [cardNumber, setCardNumber] = useState('')
    const [cardName, setCardName] = useState('')
    const [cardExpiry, setCardExpiry] = useState('')
    const [cardCvv, setCardCvv] = useState('')
    const [contactNumber, setContactNumber] = useState('')
    const [deliveryAddress, setDeliveryAddress] = useState('')
    const [mapLink, setMapLink] = useState('')
    const [formError, setFormError] = useState<string | null>(null)
    const [deliveryAvailable, setDeliveryAvailable] = useState(true)
    const [prevCartLength, setPrevCartLength] = useState(0)
    const [showNotification, setShowNotification] = useState(false)

    const subtotal = cart.reduce((acc, i) => acc + i.price * i.qty, 0)
    const fee = deliveryMode === 'delivery' ? DELIVERY_FEE : 0
    const total = subtotal + fee

    const cartKey = useMemo(() => `unilife_food_cart:${user.id}:${cartShopId}`, [user.id, cartShopId])

    const loadCartFromDb = async () => {
        const res = await fetch(`/api/student/cart-items?cart_type=food&shop_ref=${encodeURIComponent(cartShopId)}`)
        const data = await res.json().catch(() => null)
        if (!res.ok || !Array.isArray(data?.items)) {
            setCart([])
            return
        }
        const mapped: CartItem[] = data.items.map((row: any) => ({
            id: String(row.item_ref ?? ''),
            dbId: String(row.id ?? ''),
            name: String(row.item_name ?? 'Item'),
            price: Number(row.unit_price ?? 0),
            emoji: String(row.item_emoji ?? '🍽️'),
            qty: Math.max(1, Number(row.qty ?? 1)),
        })).filter((i: CartItem) => i.id)
        setCart(mapped)
    }

    const inc = async (dbId: string, qty: number) => {
        await fetch('/api/student/cart-items', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: dbId, qty: qty + 1 }),
        })
        await loadCartFromDb()
    }

    const dec = async (dbId: string, qty: number) => {
        await fetch('/api/student/cart-items', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: dbId, qty: Math.max(0, qty - 1) }),
        })
        await loadCartFromDb()
    }

    const remove = async (dbId: string) => {
        await fetch(`/api/student/cart-items?id=${encodeURIComponent(dbId)}`, { method: 'DELETE' })
        await loadCartFromDb()
    }

    useEffect(() => {
        loadCartFromDb().catch(() => setCart([]))
    }, [cartKey])

    useEffect(() => {
        if (cart.length > prevCartLength) {
            setShowNotification(true)
            const timer = setTimeout(() => setShowNotification(false), 3000)
            return () => clearTimeout(timer)
        }
        setPrevCartLength(cart.length)
    }, [cart.length, prevCartLength])

    useEffect(() => {
        if (deliveryMode !== 'delivery') {
            setDeliveryAvailable(true)
            return
        }
        fetch('/api/delivery/availability', { cache: 'no-store' })
            .then(async (r) => ({ ok: r.ok, data: await r.json().catch(() => ({})) }))
            .then((res) => setDeliveryAvailable(Boolean(res.ok && res.data?.available)))
            .catch(() => setDeliveryAvailable(false))
    }, [deliveryMode])

    const placeOrder = async () => {
        setFormError(null)
        if (cart.length === 0) return
        const slNumber = contactNumber.replace(/\s/g, '')
        if (!/^07[124567890]\d{7}$/.test(slNumber)) {
            setFormError('Enter a valid Sri Lankan mobile number (e.g. 0712345678). Must start with 071, 072, 074, 075, 076, 077, or 078.')
            return
        }
        if (deliveryMode === 'delivery' && !deliveryAvailable) {
            setFormError('Delivery not available')
            return
        }
        if (deliveryMode === 'delivery' && deliveryAddress.trim().length < 4) {
            setFormError('Enter a valid delivery address.')
            return
        }
        if (paymentMethod === 'card') {
            const cardDigits = cardNumber.replace(/\D/g, '')
            if (!isVisaOrMastercard(cardDigits) || !isLuhnValid(cardDigits)) {
                setFormError('Enter a valid Visa/Mastercard card number.')
                return
            }
            if (!isValidCardholderName(cardName)) {
                setFormError('Enter a valid cardholder name.')
                return
            }
            if (!isValidExpiry(cardExpiry)) {
                setFormError('Enter a valid expiry date (MM/YY).')
                return
            }
            if (!/^\d{3}$/.test(cardCvv.trim())) {
                setFormError('Enter a valid CVV (3 digits).')
                return
            }
        }

        const stallRaw = queryStallId || shopId.replace(/^db-/, '')
        const foodStallId = /^\d+$/.test(stallRaw) ? parseInt(stallRaw, 10) : stallRaw
        if (!foodStallId) {
            setFormError('Could not resolve stall ID for this order.')
            return
        }

        setPlacing(true)
        try {
            const res = await fetch('/api/student/food-orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    food_stall_id: foodStallId,
                    customer_name: user.name,
                    customer_phone: contactNumber.trim(),
                    items: cart.map((i) => ({ name: i.name, quantity: i.qty, price: i.price })),
                    total,
                    delivery_type: deliveryMode,
                    delivery_address: deliveryMode === 'delivery' ? deliveryAddress.trim() : '',
                    map_link: mapLink.trim(),
                    payment_method: paymentMethod,
                    notes: [
                        notes.trim(),
                        paymentMethod === 'card' ? `Card: **** **** **** ${cardNumber.replace(/\D/g, '').slice(-4)}` : '',
                    ].filter(Boolean).join(' | '),
                }),
            })
            const data = await res.json().catch(() => null)
            if (!res.ok) {
                setFormError(data?.message || `Failed to place order (HTTP ${res.status})`)
                return
            }
            await fetch(`/api/student/cart-items?cart_type=food&shop_ref=${encodeURIComponent(cartShopId)}`, { method: 'DELETE' })
            setSuccess(true)
        } finally {
            setPlacing(false)
        }
    }

    const finish = () => {
        router.push('/student/food-order/cart')
    }

    return (
        <DashboardLayout user={user}>
            <div className="max-w-lg mx-auto pb-10 relative">
                {/* Notification Bell */}
                <AnimatePresence>
                    {showNotification && (
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                            className="fixed top-4 right-4 z-50"
                        >
                            <div className="flex items-center gap-2 bg-indigo-500 text-white px-4 py-3 rounded-full shadow-lg animate-pulse">
                                <motion.div
                                    animate={{ rotate: [0, -15, 15, -15, 0] }}
                                    transition={{ duration: 0.5, repeat: 2 }}
                                >
                                    <Bell size={20} className="fill-white" />
                                </motion.div>
                                <span className="font-semibold text-sm">New item added to cart!</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors">
                    <ArrowLeft size={16} /> Back to Shop
                </button>

                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    {shopPhoto && (
                        <img src={shopPhoto} alt={shopName} className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                            onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
                    )}
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Your Order</h1>
                        <p className="text-sm text-gray-500">{shopName}</p>
                    </div>
                </div>

                {/* Delivery toggle */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
                    <p className="text-sm font-semibold text-gray-700 mb-3">How do you want it?</p>
                    <div className="grid grid-cols-2 gap-3">
                        {DELIVERY_OPTIONS.map((opt) => (
                            <button
                                key={opt.id}
                                onClick={() => setDeliveryMode(opt.id as 'delivery' | 'pickup')}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${deliveryMode === opt.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white hover:border-indigo-300'
                                    }`}
                            >
                                <opt.icon size={24} className={deliveryMode === opt.id ? 'text-indigo-500' : 'text-gray-400'} />
                                <div className="text-center">
                                    <p className={`text-sm font-semibold ${deliveryMode === opt.id ? 'text-indigo-600' : 'text-gray-700'}`}>{opt.label}</p>
                                    <p className="text-xs text-gray-400">{opt.eta}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Cart */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-4 overflow-hidden">
                    <div className="flex items-center justify-between px-4 pt-4 pb-2">
                        <h2 className="font-semibold text-gray-900">Cart</h2>
                        <span className="text-xs text-gray-400">{cart.length} item(s)</span>
                    </div>
                    <div className="px-4">
                        {cart.length === 0 ? (
                            <div className="py-12 text-center">
                                <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                                <p className="text-gray-400 text-sm">Your cart is empty</p>
                                <button onClick={() => router.back()} className="mt-3 text-sm text-indigo-500 hover:underline">
                                    Add items from shop
                                </button>
                            </div>
                        ) : (
                            <AnimatePresence initial={false}>
                                {cart.map((item) => (
                                    <CartItemRow
                                        key={`${item.dbId || item.id}`}
                                        item={item}
                                        onInc={() => item.dbId ? inc(item.dbId, item.qty) : Promise.resolve()}
                                        onDec={() => item.dbId ? dec(item.dbId, item.qty) : Promise.resolve()}
                                        onRemove={() => item.dbId ? remove(item.dbId) : Promise.resolve()}
                                    />
                                ))}
                            </AnimatePresence>
                        )}
                    </div>
                </div>

                {/* Notes */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">Special Instructions (optional)</label>
                    <textarea
                        value={notes} onChange={(e) => setNotes(e.target.value)}
                        placeholder="e.g. Less spicy, no onions…" rows={3}
                        className="w-full text-sm text-gray-700 border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                    />
                </div>

                {/* Payment */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
                    <label className="text-sm font-semibold text-gray-700 mb-3 block">Payment Method</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {PAYMENT_OPTIONS.map((p) => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => setPaymentMethod(p.id as 'cod' | 'card' | 'wallet')}
                                className={`px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${paymentMethod === p.id ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-indigo-300'}`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>
                {paymentMethod === 'card' && (
                    <div className="bg-[#f2f7ff] rounded-2xl shadow-sm border border-[#d7e6ff] p-4 mb-4 space-y-4">
                        <div>
                            <label className="text-sm font-bold text-gray-600 mb-2 block uppercase tracking-wide">Card Number</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={cardNumber}
                                onChange={(e) => setCardNumber(e.target.value.replace(/[^\d ]/g, '').slice(0, 23))}
                                placeholder="4111 1111 1111 1111"
                                className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-3sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-gray-600 mb-2 block uppercase tracking-wide">Cardholder Name</label>
                            <input
                                type="text"
                                value={cardName}
                                onChange={(e) => setCardName(e.target.value)}
                                placeholder="Name on card"
                                className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-3sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-sm font-bold text-gray-600 mb-2 block uppercase tracking-wide">Expiry</label>
                                <input
                                    type="text"
                                    value={cardExpiry}
                                    onChange={(e) => setCardExpiry(formatExpiryInput(e.target.value))}
                                    placeholder="MM/YY"
                                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-3sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-gray-600 mb-2 block uppercase tracking-wide">CVV</label>
                                <input
                                    type="password"
                                    inputMode="numeric"
                                    value={cardCvv}
                                    onChange={(e) => setCardCvv(e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
                                    placeholder="123"
                                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-3sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Checkout contact/details */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4 space-y-3">
                    <div>
                        <label className="text-sm font-semibold text-gray-700 mb-1 block">Contact Number</label>
                        <input
                            value={contactNumber}
                            onChange={(e) => setContactNumber(e.target.value.replace(/[^\d]/g, '').slice(0, 10))}
                            placeholder="0712345678"
                            inputMode="numeric"
                            maxLength={10}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                        <p className="text-xs text-gray-400 mt-1">Sri Lankan mobile</p>
                    </div>
                    {deliveryMode === 'delivery' && (
                        <>
                            <p className={`text-xs rounded-lg px-3 py-2 border ${deliveryAvailable ? 'text-gray-500 bg-blue-50 border-blue-100' : 'text-red-700 bg-red-50 border-red-200'}`}>
                                {deliveryAvailable ? 'Delivery is available.' : 'Delivery not available'}
                            </p>
                            <div>
                                <label className="text-sm font-semibold text-gray-700 mb-1 block">Delivery Address</label>
                                <textarea
                                    value={deliveryAddress}
                                    onChange={(e) => setDeliveryAddress(e.target.value)}
                                    rows={2}
                                    placeholder="Hostel / Room / Street..."
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-gray-700 mb-1 block">Map Link (optional)</label>
                                <input
                                    value={mapLink}
                                    onChange={(e) => setMapLink(e.target.value)}
                                    placeholder="https://maps.google.com/..."
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Summary */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
                    <h2 className="font-semibold text-gray-900 mb-3">Order Summary</h2>
                    <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex justify-between"><span>Subtotal</span><span>Rs {subtotal.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>Delivery fee</span><span>{fee === 0 ? 'Free' : `Rs ${fee.toFixed(2)}`}</span></div>
                        <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-100 pt-2 mt-2">
                            <span>Total</span>
                            <span className="text-indigo-500">Rs {total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Place Order */}
                <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={placeOrder}
                    disabled={placing || cart.length === 0 || (deliveryMode === 'delivery' && !deliveryAvailable)}
                    className={`w-full py-4 rounded-2xl font-bold text-white text-base shadow-md transition-all ${cart.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700'
                        }`}
                >
                    {placing ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            Placing Order…
                        </span>
                    ) : (
                        `Place Order · Rs ${total.toFixed(2)}`
                    )}
                </motion.button>
                {formError ? (
                    <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{formError}</p>
                ) : null}
            </div>

            <AnimatePresence>
                {success && <SuccessModal shopName={shopName} onClose={finish} />}
            </AnimatePresence>
        </DashboardLayout>
    )
}
