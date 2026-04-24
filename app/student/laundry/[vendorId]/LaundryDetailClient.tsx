'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import {
    ArrowLeft,
    Phone,
    MapPin,
    Calendar,
    Weight,
    CheckCircle2,
    Info,
    Plus,
    Minus,
    Loader2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { UserProfile } from '@/lib/auth'

interface LaundryDetailClientProps {
    user: UserProfile
    vendorId: string
}

export default function LaundryDetailClient({ user, vendorId }: LaundryDetailClientProps) {
    const router = useRouter()
    const [vendor, setVendor] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [weight, setWeight] = useState(1)
    const [submitting, setSubmitting] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)
    const [deliveryAvailable, setDeliveryAvailable] = useState(true)
    const [paymentMethod, setPaymentMethod] = useState<'cod' | 'card' | 'wallet'>('cod')
    const [cardNumber, setCardNumber] = useState('')
    const [cardName, setCardName] = useState('')
    const [cardExpiry, setCardExpiry] = useState('')
    const [cardCvv, setCardCvv] = useState('')

    const [formData, setFormData] = useState({
        customerName: user.name,
        contact: '',
        pickupAddress: '',
        pickupDate: '',
        serviceType: 'wash_fold'
    })

    const selectedService = (vendor?.services ?? []).find((s: any) => String(s.id) === String(formData.serviceType))
    const selectedUnit = String(selectedService?.unit || 'kg').toLowerCase() === 'item' ? 'item' : 'kg'
    const quantityLabel = selectedUnit === 'item' ? 'Qty' : 'Est. Weight'
    const unitPrice = Number(selectedService?.price ?? vendor?.pricePerKg ?? 250)
    const computedTotal = (Number.isFinite(unitPrice) ? unitPrice : 0) * weight

    useEffect(() => {
        const fetchVendor = async () => {
            try {
                const isDbVendor = vendorId?.startsWith?.('db-')
                const stallId = isDbVendor ? vendorId.replace('db-', '') : null

                if (isDbVendor && stallId) {
                    const res = await fetch(`/api/student/laundry/${stallId}`)
                    if (!res.ok) throw new Error('Not found')
                    const found = await res.json()
                    setVendor({
                        ...found,
                        services: found.services ?? [
                            { id: 'wash_fold', type: 'Wash & Fold', price: found.pricePerKg || 250, unit: 'kg' },
                            { id: 'wash_iron', type: 'Wash & Iron', price: (found.pricePerKg || 250) + 50, unit: 'kg' }
                        ]
                    })
                } else {
                    const res = await fetch(`/api/laundry?id=${vendorId}`)
                    const data = await res.json()
                    const found = data.result
                    if (found) {
                        setVendor({
                            ...found,
                            services: found.services ?? [
                                { id: 'wash_fold', type: 'Wash & Fold', price: found.pricePerKg || 250, unit: 'kg' },
                                { id: 'wash_iron', type: 'Wash & Iron', price: (found.pricePerKg || 250) + 50, unit: 'kg' }
                            ]
                        })
                    }
                }
            } catch (err) {
                console.error('Failed to fetch vendor details:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchVendor()
    }, [vendorId])

    useEffect(() => {
        fetch('/api/delivery/availability', { cache: 'no-store' })
            .then(async (r) => ({ ok: r.ok, data: await r.json().catch(() => ({})) }))
            .then((res) => setDeliveryAvailable(Boolean(res.ok && res.data?.available)))
            .catch(() => setDeliveryAvailable(false))
    }, [])

    const todayLocalDateStr = (() => {
        const d = new Date()
        const yyyy = d.getFullYear()
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        return `${yyyy}-${mm}-${dd}`
    })()

    function validateSriLankaPhone(raw: string): boolean {
        // Only digits are allowed for phone number.
        const s = String(raw ?? '').trim().replace(/[^\d]/g, '')
        if (!s) return false

        // Accept:
        // - 0 + (mobile 7XXXXXXXX / landline 1XXXXXXXX / 2XXXXXXXX) => 10 digits total
        const mobileOrLandlineWithZero = /^0(7\d{8}|1\d{8}|2\d{8})$/
        return mobileOrLandlineWithZero.test(s)
    }

    function isValidCardNumber(v: string): boolean {
        const digits = v.replace(/\D/g, '')
        const visa = /^4\d{12}(\d{3}){0,2}$/
        const mastercard = /^(5[1-5]\d{14}|2(2[2-9]\d{12}|[3-6]\d{13}|7[01]\d{12}|720\d{12}))$/
        if (!(visa.test(digits) || mastercard.test(digits))) return false
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

    const handleOrder = async (e: React.FormEvent) => {
        e.preventDefault()
        setFormError(null)

        if (!deliveryAvailable) {
            setFormError('Delivery not available')
            return
        }

        if (!validateSriLankaPhone(formData.contact)) {
            setFormError('Enter a valid Sri Lanka phone number (digits only, e.g. 0712345678).')
            return
        }

        if (!formData.pickupAddress?.trim()) {
            setFormError('Pickup address is required.')
            return
        }

        if (!formData.pickupDate) {
            setFormError('Pickup date is required.')
            return
        }

        // block past dates (YYYY-MM-DD compares lexicographically)
        if (formData.pickupDate < todayLocalDateStr) {
            setFormError('Pickup date cannot be in the past.')
            return
        }

        if (!Number.isFinite(weight) || weight < 0) {
            setFormError('Weight cannot be below 0 kg.')
            return
        }

        if (weight === 0) {
            setFormError('Weight must be at least 1 kg.')
            return
        }

        if (!formData.serviceType) {
            setFormError('Please select a service type.')
            return
        }

        if (paymentMethod === 'card') {
            if (!isValidCardNumber(cardNumber)) {
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

        const serviceName = selectedService?.type || 'Laundry Service'
        const total = unitPrice * weight

        setSubmitting(true)
        try {
            const rawShopId = String(vendor?.id ?? '').replace(/^db-/, '')
            const shopId: string | number = /^\d+$/.test(rawShopId) ? parseInt(rawShopId, 10) : rawShopId

            const res = await fetch('/api/student/laundry-orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    laundry_shop_id: shopId,
                    customer_name: formData.customerName,
                    customer_phone: formData.contact,
                    items_description: `${serviceName} (${weight} ${selectedUnit})`,
                    total,
                    pickup_address: formData.pickupAddress,
                    delivery_address: formData.pickupAddress,
                    notes: [
                        `Preferred pickup date: ${formData.pickupDate}`,
                        `Payment: ${paymentMethod === 'cod' ? 'Cash on Delivery' : paymentMethod === 'card' ? 'Visa/Mastercard' : 'Online Wallet'}`
                    ].join(' | '),
                }),
            })

            const data = await res.json().catch(() => null)
            if (!res.ok) {
                setFormError(data?.message || `Failed to place order (HTTP ${res.status})`)
                return
            }

            setShowSuccess(true)
            setTimeout(() => {
                setShowSuccess(false)
                router.push('/student/laundry')
            }, 3000)
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) return (
        <DashboardLayout user={user}>
            <div className="flex flex-col items-center justify-center py-40 gap-4 text-gray-400">
                <Loader2 className="animate-spin" size={40} />
                <p>Loading vendor details...</p>
            </div>
        </DashboardLayout>
    )

    if (!vendor) return (
        <DashboardLayout user={user}>
            <div className="text-center py-40">
                <h2 className="text-xl font-bold">Vendor not found</h2>
                <button onClick={() => router.back()} className="text-blue-600 mt-4">Go back</button>
            </div>
        </DashboardLayout>
    )

    return (
        <DashboardLayout user={user}>
            <div className="max-w-4xl mx-auto pb-20">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors mb-6 group"
                >
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="font-medium">Back to Vendors</span>
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* Left Column: Vendor Info & Prices */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm relative">
                            <div className="h-48 w-full relative group">
                                <img
                                    src={vendor.image}
                                    alt={vendor.name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = 'https://images.unsplash.com/photo-1545173168-9f1947eeba01?w=800&q=80';
                                    }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                            </div>
                            <div className="p-8 relative z-10">
                                <h1 className="text-2xl font-black text-gray-900 mb-4">{vendor.name}</h1>

                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 flex-shrink-0">
                                            <Phone size={16} />
                                        </div>
                                        <div className="text-sm">
                                            <p className="text-gray-400 font-medium uppercase tracking-wider text-[10px]">Contact</p>
                                            <p className="text-gray-700 font-semibold">{vendor.contact}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 flex-shrink-0">
                                            <MapPin size={16} />
                                        </div>
                                        <div className="text-sm">
                                            <p className="text-gray-400 font-medium uppercase tracking-wider text-[10px]">Address</p>
                                            <p className="text-gray-700 font-semibold">{vendor.address}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16"></div>
                        </div>

                        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Price Table</h2>
                            <div className="space-y-3">
                                {vendor.services.map((s: any) => (
                                    <div key={s.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-blue-200 transition-all group">
                                        <span className="font-bold text-gray-700 group-hover:text-blue-600 transition-colors">{s.type}</span>
                                        <span className="font-black text-gray-900">
                                            Rs. {Number(s.price || 0).toLocaleString()}
                                            <span className="text-xs text-gray-400 font-normal"> / {String(s.unit || 'kg')}</span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Order Form */}
                    <div className="lg:col-span-3">
                        <form onSubmit={handleOrder} className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl space-y-6">
                            <h2 className="text-xl font-bold text-gray-900">Request Pickup</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Customer Name</label>
                                    <input
                                        type="text"
                                        value={formData.customerName}
                                        disabled
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-gray-500 cursor-not-allowed"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contact Number</label>
                                    <input
                                        type="tel"
                                        required
                                        placeholder="+94 7X XXX XXXX"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={formData.contact}
                                        onChange={(e) => {
                                            const next = e.target.value.replace(/[^\d]/g, '')
                                            setFormData({ ...formData, contact: next })
                                        }}
                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pickup Address</label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-3.5 text-gray-400" size={18} />
                                    <textarea
                                        required
                                        rows={2}
                                        placeholder="Specific room/hall or apartment details..."
                                        value={formData.pickupAddress}
                                        onChange={e => setFormData({ ...formData, pickupAddress: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pickup Date</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-3.5 text-gray-400" size={18} />
                                        <input
                                            type="date"
                                            required
                                            value={formData.pickupDate}
                                            onChange={e => setFormData({ ...formData, pickupDate: e.target.value })}
                                            min={todayLocalDateStr}
                                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{quantityLabel} ({selectedUnit})</label>
                                    <div className="flex items-center gap-2 p-1 bg-gray-50 rounded-xl border border-gray-100">
                                        <button
                                            type="button"
                                            onClick={() => setWeight(Math.max(0, weight - 1))}
                                            className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-gray-500 hover:text-blue-600 shadow-sm border border-gray-100 transition-all active:scale-95"
                                        >
                                            <Minus size={16} />
                                        </button>
                                        <div className="flex-1 text-center font-black text-gray-700">
                                            {weight} {selectedUnit}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setWeight(weight + 1)}
                                            className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-gray-500 hover:text-blue-600 shadow-sm border border-gray-100 transition-all active:scale-95"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Service Type</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {vendor.services.map((s: any) => (
                                        <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, serviceType: s.id })}
                                            className={`px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all ${formData.serviceType === s.id
                                                ? 'bg-blue-50 border-blue-500 text-blue-700'
                                                : 'bg-white border-gray-100 text-gray-400 hover:border-blue-200'
                                                }`}
                                        >
                                            {s.type} - Rs. {Number(s.price || 0).toLocaleString()}/{String(s.unit || 'kg')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Payment Method</label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('cod')}
                                        className={`px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all ${paymentMethod === 'cod' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-100 text-gray-500 hover:border-blue-200'}`}
                                    >
                                        Cash on Delivery
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('card')}
                                        className={`px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all ${paymentMethod === 'card' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-100 text-gray-500 hover:border-blue-200'}`}
                                    >
                                        Visa / Mastercard
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('wallet')}
                                        className={`px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all ${paymentMethod === 'wallet' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-100 text-gray-500 hover:border-blue-200'}`}
                                    >
                                        Online Wallet
                                    </button>
                                </div>
                            </div>

                            {paymentMethod === 'card' && (
                                <div className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Card Number</label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={cardNumber}
                                            onChange={(e) => setCardNumber(e.target.value.replace(/[^\d]/g, '').slice(0, 19))}
                                            placeholder="4111 1111 1111 1111"
                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cardholder Name</label>
                                        <input
                                            type="text"
                                            value={cardName}
                                            onChange={(e) => setCardName(e.target.value)}
                                            placeholder="Name on card"
                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Expiry</label>
                                            <input
                                                type="text"
                                                value={cardExpiry}
                                                onChange={(e) => setCardExpiry(formatExpiryInput(e.target.value))}
                                                placeholder="MM/YY"
                                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">CVV</label>
                                            <input
                                                type="password"
                                                inputMode="numeric"
                                                value={cardCvv}
                                                onChange={(e) => setCardCvv(e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
                                                placeholder="123"
                                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 flex items-center justify-between">
                                <span className="text-sm font-semibold text-blue-700">Estimated Total</span>
                                <span className="text-lg font-black text-blue-800">Rs. {computedTotal.toLocaleString()}</span>
                            </div>

                            {!deliveryAvailable && (
                                <p className="text-sm text-red-700 font-semibold bg-red-50 border border-red-200 rounded-xl p-3">
                                    Delivery not available
                                </p>
                            )}

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                disabled={submitting || !deliveryAvailable}
                                className={`w-full py-4 rounded-2xl font-black text-white shadow-lg transition-all flex items-center justify-center gap-2 ${submitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                                    }`}
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        Processing...
                                    </>
                                ) : (
                                    <>Order Now</>
                                )}
                            </motion.button>

                            {formError ? (
                                <p className="text-sm text-red-600 font-semibold bg-red-50 border border-red-200 rounded-xl p-3">
                                    {formError}
                                </p>
                            ) : null}

                            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <Info size={16} className="text-blue-500 flex-shrink-0" />
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight leading-relaxed">
                                    Payment will be collected by the vendor upon pickup or delivery. Please ensure clothes are separated if needed.
                                </p>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Success Popup */}
            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white rounded-[40px] p-10 max-w-sm w-full text-center shadow-2xl"
                        >
                            <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 size={48} />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-2">Success!</h3>
                            <p className="text-gray-500 font-medium leading-relaxed">
                                Your laundry order has been sent successfully to <span className="text-blue-600 font-bold">{vendor.name}</span>.
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </DashboardLayout>
    )
}
