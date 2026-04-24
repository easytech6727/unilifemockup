'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Bell, X, Clock, CheckCircle2 } from 'lucide-react'

export interface ReminderItem {
  id: string
  title: string
  time: string
  location?: string
  triggerAt: Date
  entryId: number
}

interface ToastMessage {
  id: string
  title: string
  time: string
  location?: string
  dismissedAt?: number
}

interface TimetableReminderToastProps {
  reminders: ReminderItem[]
  testMode?: boolean // 1-minute test mode
  onReminderTriggered?: (reminder: ReminderItem) => void
  onReminderDismissed?: (reminderId: string) => void
}

export default function TimetableReminderToast({
  reminders,
  testMode = false,
  onReminderTriggered,
  onReminderDismissed,
}: TimetableReminderToastProps) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const timerRefs = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const triggeredIds = useRef<Set<string>>(new Set())

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    onReminderDismissed?.(id)
  }, [onReminderDismissed])

  // Schedule reminders
  useEffect(() => {
    const now = new Date()

    reminders.forEach(reminder => {
      // Skip if already triggered
      if (triggeredIds.current.has(reminder.id)) return

      // Clear existing timer if any
      const existingTimer = timerRefs.current.get(reminder.id)
      if (existingTimer) {
        clearTimeout(existingTimer)
        timerRefs.current.delete(reminder.id)
      }

      let triggerTime: Date
      if (testMode) {
        // Test mode: trigger after 1 minute from now
        triggerTime = new Date(now.getTime() + 60 * 1000)
      } else {
        triggerTime = reminder.triggerAt
      }

      const delay = triggerTime.getTime() - now.getTime()

      if (delay <= 0) {
        // Already past trigger time, show immediately if within last 5 mins
        if (delay > -5 * 60 * 1000) {
          triggeredIds.current.add(reminder.id)
          setToasts(prev => [
            ...prev.filter(t => t.id !== reminder.id),
            { id: reminder.id, title: reminder.title, time: reminder.time, location: reminder.location }
          ])
          onReminderTriggered?.(reminder)
        }
        return
      }

      // Schedule future reminder
      const timer = setTimeout(() => {
        triggeredIds.current.add(reminder.id)
        setToasts(prev => [
          ...prev.filter(t => t.id !== reminder.id),
          { id: reminder.id, title: reminder.title, time: reminder.time, location: reminder.location }
        ])
        onReminderTriggered?.(reminder)
        timerRefs.current.delete(reminder.id)
      }, delay)

      timerRefs.current.set(reminder.id, timer)
    })

    // Cleanup removed reminders
    return () => {
      timerRefs.current.forEach((timer, id) => {
        if (!reminders.find(r => r.id === id)) {
          clearTimeout(timer)
          timerRefs.current.delete(id)
        }
      })
    }
  }, [reminders, testMode, onReminderTriggered])

  // Auto-dismiss toasts after 30 seconds
  useEffect(() => {
    toasts.forEach(toast => {
      if (toast.dismissedAt) return
      const timer = setTimeout(() => dismissToast(toast.id), 30000)
      return () => clearTimeout(timer)
    })
  }, [toasts, dismissToast])

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      timerRefs.current.forEach(timer => clearTimeout(timer))
      timerRefs.current.clear()
    }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 animate-in slide-in-from-right-5 fade-in duration-300"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200/50">
              <Bell size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-gray-900 text-sm leading-tight">
                  Reminder
                </p>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  className="shrink-0 p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Dismiss"
                >
                  <X size={16} />
                </button>
              </div>
              <p className="text-gray-800 font-semibold mt-1 text-base leading-snug">
                {toast.title}
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {toast.time}
                </span>
                {toast.location && (
                  <span className="truncate">📍 {toast.location}</span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 font-semibold text-sm hover:bg-emerald-100 transition-colors"
          >
            <CheckCircle2 size={16} />
            Got it
          </button>
        </div>
      ))}
    </div>
  )
}

// Helper to clear specific reminder timer from outside
export function clearReminderTimer(id: string, timerRefs: Map<string, NodeJS.Timeout>) {
  const timer = timerRefs.get(id)
  if (timer) {
    clearTimeout(timer)
    timerRefs.delete(id)
  }
}
