import Link from 'next/link'

/** Same hero treatment as admin dashboard for consistent admin UX. */
export function AdminPageHero({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="bg-card rounded-card border border-gray-200 p-6 shadow-card">
      <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{title}</h1>
      <p className="mt-2 text-sm text-gray-600 max-w-2xl leading-relaxed">{subtitle}</p>
    </div>
  )
}

export function AdminBackToDashboard() {
  return (
    <div className="flex justify-start pt-1">
      <Link
        href="/admin/dashboard"
        className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
      >
        Back to dashboard
      </Link>
    </div>
  )
}

export function AdminPageStack({ children }: { children: React.ReactNode }) {
  return <div className="space-y-6 max-w-6xl mx-auto w-full min-w-0">{children}</div>
}
