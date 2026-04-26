'use client'

import { useRef, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Clock, MapPin, Calendar, Pencil, Trash2, Plus } from 'lucide-react'
import type { TimetableSlot } from '@/components/timetable/types'

interface TimetableViewProps {
  schedules: TimetableSlot[]
  subtitle?: string
  /** Profile default (minutes before) for “Default” in per-slot reminder */
  defaultReminderMinutes?: number
  onEntryReminderChange?: (entryId: number, minutesBefore: number | null) => void
  /** Show edit/delete on each block */
  editable?: boolean
  onEntryEdit?: (slot: TimetableSlot) => void
  onEntryDelete?: (slot: TimetableSlot) => void
  /** Shown in the green header when editable (e.g. open add-slot modal). */
  onAddSlot?: () => void
}

const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)

function getWeekDates(): Date[] {
  const today = new Date()
  const day = today.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function formatTimeDisplay(t: string): string {
  const s = String(t).trim()
  const part = s.includes('T') ? s.split('T')[1] : s
  const segments = (part || s).split(':')
  if (segments.length >= 2) return `${segments[0]}:${segments[1]}`
  return s
}

function getHourFromTime(timeStr: string): number {
  if (timeStr == null || timeStr === '') return 0
  const s = String(timeStr).trim()
  let timePart = s
  if (s.includes('T')) timePart = s.split('T')[1] ?? s
  const match = timePart.match(/^(\d{1,2})/)
  if (match) {
    const hour = parseInt(match[1], 10)
    if (!Number.isNaN(hour) && hour >= 0 && hour <= 23) return hour
  }
  const parts = timePart.split(':')
  const hour = parseInt(parts[0], 10)
  return Number.isNaN(hour) ? 0 : Math.max(0, Math.min(23, hour))
}

function getMinFromTime(timeStr: string): number {
  const s = String(timeStr).trim()
  const timePart = s.includes('T') ? s.split('T')[1] : s
  const parts = (timePart || s).split(':')
  const min = parseInt(parts[1], 10)
  return Number.isNaN(min) ? 0 : min
}

function normalizeDay(day: string): string {
  const d = (day || '').trim().toLowerCase()
  if (!d) return ''
  const map: Record<string, string> = {
    mon: 'Monday',
    monday: 'Monday',
    tue: 'Tuesday',
    tues: 'Tuesday',
    tuesday: 'Tuesday',
    wed: 'Wednesday',
    weds: 'Wednesday',
    wednesday: 'Wednesday',
    thu: 'Thursday',
    thur: 'Thursday',
    thurs: 'Thursday',
    thursday: 'Thursday',
    fri: 'Friday',
    friday: 'Friday',
    sat: 'Saturday',
    saturday: 'Saturday',
    sun: 'Sunday',
    sunday: 'Sunday',
  }
  return map[d] ?? (d.charAt(0).toUpperCase() + d.slice(1))
}

function isoLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const REMINDER_CHOICES = [10, 15, 30, 45, 60, 90, 120] as const

export default function TimetableView({
  schedules,
  subtitle = 'Your weekly schedule',
  defaultReminderMinutes = 15,
  onEntryReminderChange,
  editable = false,
  onEntryEdit,
  onEntryDelete,
  onAddSlot,
}: TimetableViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const weekDates = useMemo(() => getWeekDates(), [])
  const reminderOptions = useMemo(() => {
    const s = new Set<number>(REMINDER_CHOICES)
    for (const x of schedules) {
      if (typeof x.reminder_minutes_before === 'number') s.add(x.reminder_minutes_before)
    }
    return Array.from(s).sort((a, b) => a - b)
  }, [schedules])
  /** Monday = 0 … Sunday = 6 (matches DAYS order) */
  const todayDayIndex = useMemo(() => {
    const today = new Date().getDay()
    return today === 0 ? 6 : today - 1
  }, [])

  const getSchedulesForSlot = (day: string, time: string, dayIdx: number) => {
    return schedules.filter((s) => {
      const startHour = getHourFromTime(s.start_time)
      const dayMatch = normalizeDay(s.day_of_week) === normalizeDay(day)
      if (!dayMatch || startHour !== time.split(':').map(Number)[0]) return false
      if (s.entry_type === 'exam' && s.exam_date) {
        return isoLocalDate(weekDates[dayIdx]) === s.exam_date
      }
      return true
    })
  }

  useEffect(() => {
    if (schedules.length === 0) return
    const firstHour = schedules.reduce((min, s) => {
      const h = getHourFromTime(s.start_time)
      return h < min ? h : min
    }, 24)
    if (firstHour > 23) return
    const slotId = `slot-${String(firstHour).padStart(2, '0')}-00`
    requestAnimationFrame(() => {
      const row = scrollRef.current?.querySelector(`[data-slot="${slotId}"]`)
      if (row) row.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [schedules])

  const getDurationHeight = (startTime: string, endTime: string) => {
    const startTotal = getHourFromTime(startTime) * 60 + getMinFromTime(startTime)
    const endTotal = getHourFromTime(endTime) * 60 + getMinFromTime(endTime)
    const hours = (endTotal - startTotal) / 60
    return Math.max(hours * 52, 40)
  }

  const titleFor = (s: TimetableSlot) => s.courseName || s.subject || 'Class'
  const codeFor = (s: TimetableSlot) => s.courseCode || '—'

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden ring-1 ring-black/5">
      <div className="bg-gradient-to-br from-primary via-indigo-600 to-purple-700 px-6 py-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_40%,rgba(255,255,255,0.06)_100%)]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Calendar size={22} className="text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-white tracking-tight">Weekly Timetable</h2>
              <p className="text-white/90 text-sm mt-0.5">{subtitle}</p>
            </div>
          </div>
          {editable && onAddSlot && (
            <button
              type="button"
              onClick={onAddSlot}
              className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-primary font-bold text-sm shadow-md hover:bg-white/95 active:scale-[0.98] transition-all border border-white/40"
            >
              <Plus size={18} strokeWidth={2.5} />
              Add slot
            </button>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="overflow-x-auto overflow-y-auto max-h-[70vh]">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 shadow-sm">
            <tr className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200">
              <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 w-20 bg-white border-r border-gray-100">
                Time
              </th>
              {DAYS.map((day, dayIdx) => {
                const isToday = dayIdx === todayDayIndex
                const date = weekDates[dayIdx]
                return (
                  <th
                    key={day}
                    className={`px-4 py-3.5 text-left text-sm font-bold min-w-[130px] border-l border-gray-100 ${
                      isToday
                        ? 'bg-primary/5 text-primary border-primary/60'
                        : 'bg-white text-gray-800'
                    }`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className={isToday ? 'text-primary' : ''}>{day}</span>
                      <span className={`text-xs font-normal ${isToday ? 'text-emerald-600' : 'text-gray-500'}`}>
                        {date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((time, idx) => (
              <tr
                key={time}
                data-slot={`slot-${time.replace(':', '-')}`}
                className={`border-b border-gray-100 h-14 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}
              >
                <td
                  className={`px-4 py-3 text-xs font-semibold text-gray-500 w-20 align-top sticky left-0 border-r border-gray-100 z-[1] ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}
                >
                  {time}
                </td>
                {DAYS.map((day, dayIdx) => {
                  const daySchedules = getSchedulesForSlot(day, time, dayIdx)
                  const isToday = dayIdx === todayDayIndex
                  return (
                    <td
                      key={`${day}-${time}`}
                      className={`px-3 py-2 relative min-w-[130px] align-top border-l border-gray-100 ${
                        isToday ? 'bg-primary/5' : ''
                      }`}
                    >
                      {daySchedules.map((schedule) => {
                        const isExam = schedule.entry_type === 'exam'
                        const borderClass = isExam 
                          ? 'border-l-4 border-rose-500 bg-rose-50/20' 
                          : schedule.color
                            ? schedule.color.replace(/^bg-/, 'border-l-4 border-')
                            : 'border-l-4 border-primary bg-primary/5'

                        return (
                          <motion.div
                            key={schedule.id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            whileHover={{ scale: 1.02, boxShadow: '0 8px 25px -5px rgb(0 0 0 / 0.12)' }}
                            className={`${borderClass} text-gray-900 rounded-xl p-3 mb-2 shadow-md hover:shadow-lg transition-all font-semibold ring-1 ring-gray-200/80 backdrop-blur-sm ${
                              editable ? '' : 'cursor-pointer'
                            }`}
                            style={{
                              minHeight: `${getDurationHeight(schedule.start_time, schedule.end_time)}px`,
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                            }}
                            title={`${titleFor(schedule)} · ${schedule.location}`}
                          >
                            <div>
                              <div className="flex items-start justify-between gap-1">
                                <p className="font-bold text-sm line-clamp-2 leading-tight text-gray-900">
                                  {titleFor(schedule)}
                                </p>
                                <div className="flex items-center gap-0.5 shrink-0">
                                  {isExam && (
                                    <span className="bg-rose-100 text-rose-700 text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                                      Exam
                                    </span>
                                  )}
                                  {editable && onEntryEdit && (
                                    <button
                                      type="button"
                                      className="p-1 rounded-md hover:bg-white/80 text-gray-600"
                                      aria-label="Edit slot"
                                      onClick={(ev) => {
                                        ev.stopPropagation()
                                        onEntryEdit(schedule)
                                      }}
                                    >
                                      <Pencil size={14} />
                                    </button>
                                  )}
                                  {editable && onEntryDelete && (
                                    <button
                                      type="button"
                                      className="p-1 rounded-md hover:bg-red-100 text-red-600"
                                      aria-label="Delete slot"
                                      onClick={(ev) => {
                                        ev.stopPropagation()
                                        onEntryDelete(schedule)
                                      }}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                              </div>
                              <p className="text-xs text-gray-600 mt-1 font-medium">{codeFor(schedule)}</p>
                            </div>
                            <div className="mt-2 space-y-0.5">
                              <div className="text-xs text-gray-700 flex items-center gap-1.5">
                                <MapPin size={12} className="text-gray-500 shrink-0" />
                                <span className="truncate">{schedule.location || '—'}</span>
                              </div>
                              <div className="text-xs text-gray-600 flex items-center gap-1.5">
                                <Clock size={12} className="text-gray-500 shrink-0" />
                                {formatTimeDisplay(schedule.start_time)} – {formatTimeDisplay(schedule.end_time)}
                              </div>
                              {isExam && schedule.exam_date && (
                                <div className="text-[11px] text-rose-800 font-semibold">
                                  {new Date(schedule.exam_date + 'T12:00:00').toLocaleDateString(undefined, {
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </div>
                              )}
                              {onEntryReminderChange && (
                                <div
                                  className="pt-1 border-t border-gray-200/80 mt-1.5"
                                  onClick={(ev) => ev.stopPropagation()}
                                  onPointerDown={(ev) => ev.stopPropagation()}
                                >
                                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-0.5">
                                    SMS reminder
                                  </label>
                                  <select
                                    className="w-full text-[11px] rounded-md border border-gray-200 bg-white py-1 px-1.5 text-gray-800"
                                    value={
                                      schedule.reminder_minutes_before != null
                                        ? String(schedule.reminder_minutes_before)
                                        : ''
                                    }
                                    onChange={(e) => {
                                      const v = e.target.value
                                      onEntryReminderChange(
                                        schedule.id,
                                        v === '' ? null : Number(v)
                                      )
                                    }}
                                  >
                                    <option value="">
                                      Default ({defaultReminderMinutes} min)
                                    </option>
                                    {reminderOptions.map((m) => (
                                      <option key={m} value={m}>
                                        {m} min before
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )
                      })}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-gradient-to-r from-gray-50 to-slate-50 px-6 py-4 border-t border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Legend</p>
            <div className="flex flex-wrap gap-4">
              {schedules.map((schedule) => (
                <div key={schedule.id} className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-md ${schedule.color || 'bg-blue-500'} shadow-sm ring-1 ring-black/5`} />
                  <span className="text-sm text-gray-600 font-medium">{codeFor(schedule)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="text-sm text-gray-500 font-medium">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 shadow-sm ring-1 ring-gray-200">
              📚 {schedules.length} slot{schedules.length !== 1 ? 's' : ''} this week
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
