import { requireRole } from '@/lib/auth.server'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { 
  BookOpen, 
  Users, 
  FileText,
  Award,
  AlertCircle,
  Clock,
  CheckCircle,
  Zap,
  BarChart3,
  MessageSquare,
  MapPin,
  ArrowRight,
  TrendingUp
} from 'lucide-react'
import Link from 'next/link'

interface StatCardProps {
  icon: any
  label: string
  value: string
  color: string
  trend?: number
  subtitle?: string
}

interface ClassItemProps {
  time: string
  course: string
  room: string
  students: number
  status: 'completed' | 'in-progress' | 'upcoming'
  attended?: number
}

interface TaskItemProps {
  title: string
  course: string
  dueIn: string
  urgent?: boolean
}

interface ActionCardProps {
  icon: any
  title: string
  desc: string
  color: string
}

interface MetricBarProps {
  label: string
  value: number
  maxValue?: number
  color?: string
}

interface SubmissionRowProps {
  student: string
  assignment: string
  course: string
  submitted: string
  status: 'pending' | 'graded'
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  color, 
  trend,
  subtitle
}: StatCardProps) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center`}>
          <Icon size={24} className="text-white" />
        </div>
        {trend !== undefined && trend !== 0 && (
          <div className={`flex items-center gap-1 text-xs font-semibold ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp size={14} />
            {trend > 0 ? '+' : ''}{trend}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  )
}

function ClassItem({ 
  time, 
  course, 
  room, 
  students, 
  status, 
  attended 
}: ClassItemProps) {
  const statusConfig = {
    'completed': { 
      bg: 'bg-gradient-to-r from-gray-50 to-gray-100', 
      border: 'border-gray-200', 
      icon: CheckCircle, 
      badge: 'bg-gray-600' 
    },
    'in-progress': { 
      bg: 'bg-gradient-to-r from-green-50 to-emerald-50', 
      border: 'border-green-200', 
      icon: Zap, 
      badge: 'bg-green-600' 
    },
    'upcoming': { 
      bg: 'bg-gradient-to-r from-blue-50 to-cyan-50', 
      border: 'border-blue-200', 
      icon: Clock, 
      badge: 'bg-blue-600' 
    },
  }
  
  const config = statusConfig[status]
  const StatusIcon = config.icon
  const attendeeCount = attended || 0

  return (
    <div className={`p-5 rounded-xl border ${config.bg} ${config.border} hover:shadow-sm transition-all`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <StatusIcon size={18} className={status === 'completed' ? 'text-gray-600' : status === 'in-progress' ? 'text-green-600' : 'text-blue-600'} />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{time}</span>
          </div>
          <h3 className="font-semibold text-gray-900 text-sm">{course}</h3>
        </div>
        <span className={`text-xs text-white px-3 py-1 rounded-full ${config.badge} whitespace-nowrap`}>
          {status === 'in-progress' ? 'Live Now' : status}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs text-gray-600 gap-4 pt-3 border-t border-gray-200/50">
        <span className="flex items-center gap-1.5"><MapPin size={14} /> {room}</span>
        <span className="flex items-center gap-1.5"><Users size={14} /> {attendeeCount} / {students}</span>
      </div>
    </div>
  )
}

function TaskItem({ 
  title, 
  course, 
  dueIn, 
  urgent 
}: TaskItemProps) {
  return (
    <div className="flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${urgent ? 'bg-red-500' : 'bg-blue-400'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
          <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-600">{course}</span>
          <span className={urgent ? 'text-red-600 font-semibold' : ''}>{dueIn}</span>
        </div>
      </div>
    </div>
  )
}

function ActionCard({
  icon: Icon,
  title,
  desc,
  color
}: ActionCardProps) {
  return (
    <button className={`w-full ${color} text-white rounded-xl p-5 text-left hover:shadow-lg hover:scale-105 transition-all`}>
      <Icon size={28} className="mb-3 opacity-90" />
      <h3 className="font-semibold text-sm mb-1">{title}</h3>
      <p className="text-xs opacity-80">{desc}</p>
    </button>
  )
}

function MetricBar({
  label,
  value,
  maxValue,
  color
}: MetricBarProps) {
  const maxVal = maxValue || 100
  const col = color || 'bg-blue-500'
  const percentage = (value / maxVal) * 100
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900">{label}</span>
        <span className="text-sm font-semibold text-gray-600">{value}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className={`${col} h-full rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

function SubmissionRow({ 
  student, 
  assignment, 
  course, 
  submitted, 
  status 
}: SubmissionRowProps) {
  return (
    <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
      <td className="px-6 py-4 font-medium text-gray-900">{student}</td>
      <td className="px-6 py-4 text-gray-700">{assignment}</td>
      <td className="px-6 py-4 text-gray-700 text-sm">{course}</td>
      <td className="px-6 py-4 text-gray-600 text-sm">{submitted}</td>
      <td className="px-6 py-4">
        <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${
          status === 'pending' ? 'bg-yellow-100/80 text-yellow-700' : 'bg-green-100/80 text-green-700'
        }`}>
          {status === 'pending' ? '⏳ Pending' : '✓ Graded'}
        </span>
      </td>
    </tr>
  )
}

export default async function LecturerDashboard() {
  const user = await requireRole('lecturer')
  const currentHour = new Date().getHours()
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-indigo-800 p-8 text-white">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-40 -mt-40 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-indigo-400/10 rounded-full -ml-30 -mb-30 blur-3xl" />
          
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-bold mb-2">{greeting}, {user.name.split(' ')[0]}! 👋</h1>
                <p className="text-white/90 text-lg">Welcome back to your teaching dashboard</p>
              </div>
              <div className="hidden sm:flex items-center gap-3 bg-white/20 backdrop-blur-md rounded-xl px-4 py-3">
                <Clock size={20} />
                <div>
                  <p className="text-sm font-medium text-white/80">Classes Today</p>
                  <p className="text-2xl font-bold text-white">3</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 text-sm text-white/80">
              <span>📊 128 students enrolled</span>
              <span>•</span>
              <span>✅ 94% attendance rate</span>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            icon={BookOpen} 
            label="Active Courses" 
            value="4" 
            color="from-blue-500 to-blue-600"
            trend={2}
            subtitle="4 courses running"
          />
          <StatCard 
            icon={Users} 
            label="Total Students" 
            value="156" 
            color="from-green-500 to-green-600"
            trend={8}
            subtitle="across all courses"
          />
          <StatCard 
            icon={FileText} 
            label="Pending Grades" 
            value="23" 
            color="from-emerald-500 to-green-600"
            trend={-5}
            subtitle="ready to review"
          />
          <StatCard 
            icon={Award} 
            label="Avg. Grade Rate" 
            value="94%" 
            color="from-emerald-500 to-green-600"
            trend={3}
            subtitle="submission rate"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Today's Classes & Schedule */}
          <div className="lg:col-span-2 space-y-6">
            {/* Today's Classes */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Clock size={20} /> Today's Classes
                    </h2>
                    <p className="text-blue-100 text-sm mt-1">Tuesday, Feb 24, 2026</p>
                  </div>
                  <Link href="/lecturer/schedule" className="text-white hover:text-blue-100 flex items-center gap-1 text-sm font-medium">
                    View schedule <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
              
              <div className="divide-y divide-gray-100">
                <ClassItem
                  time="09:00 - 10:30 AM"
                  course="CS 101 - Intro to Programming"
                  room="Room 101, Block A"
                  students={45}
                  status="completed"
                  attended={43}
                />
                <ClassItem
                  time="11:00 AM - 12:30 PM"
                  course="CS 201 - Data Structures"
                  room="Room 203, Block B"
                  students={38}
                  status="in-progress"
                  attended={37}
                />
                <ClassItem
                  time="02:00 - 03:30 PM"
                  course="CS 301 - Algorithms"
                  room="Lab 3, IT Building"
                  students={32}
                  status="upcoming"
                  attended={0}
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
              <ActionCard 
                icon={MessageSquare}
                title="Post Announcement"
                desc="Create a new class announcement"
                color="bg-gradient-to-br from-cyan-500 to-blue-500"
              />
              <ActionCard 
                icon={FileText}
                title="Grade Assignment"
                desc="Start grading pending submissions"
                color="bg-gradient-to-br from-emerald-600 to-green-700"
              />
            </div>
          </div>

          {/* Pending Tasks Sidebar */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-emerald-600 to-green-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertCircle size={20} /> Pending Tasks
              </h2>
              <p className="text-emerald-100 text-sm mt-1">4 tasks waiting</p>
            </div>
            <div className="divide-y divide-gray-100 flex-1">
              <TaskItem title="Grade Assignment 3" course="CS 101" dueIn="Today" urgent />
              <TaskItem title="Upload lecture notes" course="CS 201" dueIn="Today" urgent />
              <TaskItem title="Review project proposals" course="CS 301" dueIn="2 days" urgent={false} />
              <TaskItem title="Prepare quiz questions" course="CS 101" dueIn="5 days" urgent={false} />
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <Link href="/lecturer/assignments" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                View all tasks <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Submissions & Analytics */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Submissions */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <CheckCircle size={20} /> Recent Submissions
                  </h2>
                  <p className="text-emerald-100 text-sm mt-1">Latest from your students</p>
                </div>
                <Link href="/lecturer/assignments" className="text-white hover:text-emerald-100 flex items-center gap-1 text-sm font-medium">
                  View all <ArrowRight size={14} />
                </Link>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b border-gray-100 bg-gray-50">
                    <th className="px-6 py-3 font-medium">Student</th>
                    <th className="px-6 py-3 font-medium">Assignment</th>
                    <th className="px-6 py-3 font-medium">Course</th>
                    <th className="px-6 py-3 font-medium">Submitted</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  <SubmissionRow
                    student="John Doe"
                    assignment="Programming Assignment 3"
                    course="CS 101"
                    submitted="10 mins ago"
                    status="pending"
                  />
                  <SubmissionRow
                    student="Jane Smith"
                    assignment="Data Structures Lab 2"
                    course="CS 201"
                    submitted="1 hour ago"
                    status="pending"
                  />
                  <SubmissionRow
                    student="Mike Johnson"
                    assignment="Algorithm Analysis"
                    course="CS 301"
                    submitted="3 hours ago"
                    status="graded"
                  />
                </tbody>
              </table>
            </div>
          </div>

          {/* Class Performance */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-green-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <BarChart3 size={20} /> Class Performance
              </h2>
              <p className="text-emerald-100 text-sm mt-1">This week's statistics</p>
            </div>
            <div className="p-6 space-y-4">
              <MetricBar label="CS 101" value={92} maxValue={100} color="bg-blue-500" />
              <MetricBar label="CS 201" value={88} maxValue={100} color="bg-green-500" />
              <MetricBar label="CS 301" value={85} maxValue={100} color="bg-emerald-500" />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
