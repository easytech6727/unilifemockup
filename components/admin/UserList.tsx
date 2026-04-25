'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, Filter, MoreVertical, X, Edit2, UserCog, Shield, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
const ROLES = ['student', 'admin', 'vendor', 'vendor_food', 'vendor_laundry', 'delivery', 'super_admin']

interface User {
    id: number
    name: string
    email: string
    role: string
    uni_id?: number | null
    created_at: string
    auth_id?: string | null
}

interface UserListProps {
    users: User[]
    title?: string
    showActions?: boolean
    /** When true, Delete action calls API and refreshes (super-admin only). */
    enableDelete?: boolean
}

export default function UserList({ users, title = "User Directory", showActions = false, enableDelete = false }: UserListProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [roleFilter, setRoleFilter] = useState('all')
    const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)

    const router = useRouter()
    const pathname = usePathname()
    const [activeMenu, setActiveMenu] = useState<any | null>(null)

    // Helper to determine the edit base URL (either /admin/users or /super-admin/users)
    const baseEditPath = pathname.includes('/super-admin') ? '/super-admin/users' : '/admin/users'

    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const name = user.name ?? ''
            const email = user.email ?? ''
            const matchesSearch =
                name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                email.toLowerCase().includes(searchTerm.toLowerCase())
            const matchesRole = roleFilter === 'all' || user.role === roleFilter
            return matchesSearch && matchesRole
        })
    }, [users, searchTerm, roleFilter])

    /** Always show every system role so filters work even when a role has zero users. */
    const roleFilterOptions = ROLES

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setActiveMenu(null)
        document.addEventListener('click', handleClickOutside)
        return () => document.removeEventListener('click', handleClickOutside)
    }, [])

    const handleDeleteClick = (u: User) => {
        setActiveMenu(null)
        if (enableDelete) {
            setDeleteError(null)
            setDeleteConfirm(u)
        }
    }

    const handleDeleteConfirm = async () => {
        if (!deleteConfirm || !enableDelete) return
        setDeleteLoading(true)
        setDeleteError(null)
        try {
            const res = await fetch(`/api/super-admin/users/${deleteConfirm.id}`, { method: 'DELETE' })
            const data = await res.json().catch(() => ({}))
            if (res.ok) {
                setDeleteConfirm(null)
                router.refresh()
            } else {
                setDeleteError(data?.message || `Failed to delete (${res.status})`)
            }
        } catch {
            setDeleteError('Network error')
        } finally {
            setDeleteLoading(false)
        }
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            <div className="p-4 border-b border-gray-100 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">{title}</h3>
                    <span className="text-xs text-gray-500 font-medium bg-gray-50 px-2 py-1 rounded-lg">
                        {filteredUsers.length} of {users.length} Users
                    </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search Bar */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            suppressHydrationWarning={true}
                            className="w-full pl-9 pr-9 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Role Filter */}
                    <div className="relative min-w-[150px]">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="w-full appearance-none pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                        >
                            <option value="all">All Roles</option>
                            {roleFilterOptions.map((role) => (
                                <option key={role} value={role}>
                                    {formatRole(role)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="overflow-x-visible overflow-y-visible">
                <table className="w-full text-left min-w-[500px]">
                    <thead className="sticky top-0 z-20 bg-gray-50/90 backdrop-blur-sm">
                        <tr className="text-gray-500 text-xs font-semibold uppercase tracking-wider border-b border-gray-100">
                            <th className="px-5 py-3">User</th>
                            <th className="px-5 py-3">Role</th>
                            <th className="px-5 py-3 hidden sm:table-cell">Joined</th>
                            {showActions && <th className="px-5 py-3 w-10"></th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-sm">
                        {filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan={showActions ? 4 : 3} className="px-5 py-12 text-center text-gray-400 italic text-sm">
                                    {searchTerm || roleFilter !== 'all'
                                        ? 'No users match your current filters.'
                                        : 'No users found in the system.'}
                                </td>
                            </tr>
                        ) : (
                            filteredUsers.map((u) => {
                                const initials = getInitials(u.name)
                                return (
                                    <tr key={u.id} className="hover:bg-gray-50/80 transition-colors group">
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 flex-shrink-0 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                    {initials}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-gray-900 truncate">{u.name || '—'}</p>
                                                    <p className="text-xs text-gray-400 truncate">{u.email || '—'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold border whitespace-nowrap ${getRoleStyles(u.role)}`}>
                                                {formatRole(u.role)}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 hidden sm:table-cell">
                                            <span className="text-xs text-gray-400 whitespace-nowrap">
                                                {u.created_at
                                                    ? new Date(u.created_at).toLocaleDateString('en-GB', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })
                                                    : '—'}
                                            </span>
                                        </td>
                                        {showActions && (
                                            <td className="px-5 py-3.5 text-right relative">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setActiveMenu(activeMenu === u.id ? null : u.id)
                                                    }}
                                                    className={`p-2 rounded-lg transition-all ${activeMenu === u.id
                                                        ? 'bg-primary/10 text-primary'
                                                        : 'hover:bg-gray-100 text-gray-300 group-hover:text-gray-500'
                                                        }`}
                                                >
                                                    <MoreVertical size={18} />
                                                </button>

                                                {/* Action Menu Dropdown */}
                                                {activeMenu === u.id && (
                                                    <div
                                                        className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <div className="py-1.5">
                                                            <button
                                                                onClick={() => {
                                                                    setActiveMenu(null)
                                                                    router.push(`${baseEditPath}/edit/${u.id}`)
                                                                }}
                                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                                                            >
                                                                <Edit2 size={14} className="text-gray-400" />
                                                                <span>Edit Profile</span>
                                                            </button>
                                                            <button
                                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                                                                onClick={() => setActiveMenu(null)}
                                                            >
                                                                <Shield size={14} className="text-gray-400" />
                                                                <span>Permissions</span>
                                                            </button>
                                                            <div className="h-px bg-gray-50 my-1" />
                                                            <button
                                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                                                                onClick={() => handleDeleteClick(u)}
                                                            >
                                                                <Trash2 size={14} className="text-red-400" />
                                                                <span>Delete User</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Delete confirmation modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50" onClick={() => !deleteLoading && setDeleteConfirm(null)}>
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <h3 className="font-semibold text-gray-900">Delete user?</h3>
                        <p className="text-sm text-gray-600">
                            <span className="font-medium">{deleteConfirm.name}</span>
                            {deleteConfirm.email && (
                                <span className="text-gray-500"> ({deleteConfirm.email})</span>
                            )}
                            {' '}will be removed. This cannot be undone.
                        </p>
                        {deleteError && (
                            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{deleteError}</p>
                        )}
                        <div className="flex gap-3 justify-end">
                            <button
                                type="button"
                                onClick={() => !deleteLoading && setDeleteConfirm(null)}
                                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteConfirm}
                                disabled={deleteLoading}
                                className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                {deleteLoading ? 'Deleting…' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function getInitials(name: string | null | undefined): string {
    if (!name) return '?'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0][0].toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatRole(role: string): string {
    return role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function getRoleStyles(role: string): string {
    switch (role?.toLowerCase()) {
        case 'super_admin':
            return 'bg-purple-50 text-purple-700 border-purple-100'
        case 'admin':
            return 'bg-blue-50 text-blue-700 border-blue-100'
        case 'vendor-food':
        case 'vendor_admin':
            return 'bg-emerald-50 text-emerald-700 border-emerald-100'
        case 'vendor-laundry':
            return 'bg-teal-50 text-teal-700 border-teal-100'
        case 'delivery':
        case 'delivery_rider':
            return 'bg-blue-50 text-blue-700 border-blue-100'
        case 'lecturer':
            return 'bg-indigo-50 text-indigo-700 border-indigo-100'
        case 'student':
            return 'bg-sky-50 text-sky-700 border-sky-100'
        default:
            return 'bg-gray-50 text-gray-600 border-gray-200'
    }
}

