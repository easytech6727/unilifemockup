'use client'

import { motion } from 'framer-motion'
import { GraduationCap, BookOpen, Users, UtensilsCrossed, CarFront } from 'lucide-react'

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

/**
 * Shared layout wrapper for all authentication pages
 * Provides consistent branding, animations, and responsive design
 */
export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen flex w-full">
      {/* Dynamic Animated Background */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-slate-50">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-400/30 blur-[120px] mix-blend-multiply animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/20 blur-[120px] mix-blend-multiply animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-purple-400/20 blur-[120px] mix-blend-multiply flex animate-pulse" style={{ animationDelay: '4s' }} />
      </div>

      <div className="relative z-10 w-full flex flex-col lg:flex-row max-w-[1400px] mx-auto p-4 sm:p-8 lg:p-12 gap-8 lg:gap-16">
        
        {/* Left Side - Hero Branding */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="flex-1 flex flex-col justify-center lg:py-12"
        >
          <div className="flex items-center gap-4 mb-8 sm:mb-12">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <span className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-indigo-800 tracking-tight">
              UniLife
            </span>
          </div>
          
          <div className="space-y-6 max-w-xl">
            <h1 className="text-5xl sm:text-6xl font-extrabold text-slate-900 leading-[1.1] tracking-tight">
              Your Campus, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                Simplified.
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 leading-relaxed font-medium">
              The premium all-in-one platform designed exclusively for modern university life. Seamlessly manage courses, connect with peers, and navigate campus services.
            </p>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 pt-8">
              {[
                { label: 'Course Management', icon: <BookOpen size={22} className="text-blue-600" />, color: 'bg-blue-100/80 shadow-blue-200/50' },
                { label: 'Campus Dining', icon: <UtensilsCrossed size={22} className="text-blue-600" />, color: 'bg-blue-100/80 shadow-blue-200/50' },
                { label: 'Study Groups', icon: <Users size={22} className="text-emerald-600" />, color: 'bg-emerald-100/80 shadow-emerald-200/50' },
                { label: 'Campus Transit', icon: <CarFront size={22} className="text-purple-600" />, color: 'bg-purple-100/80 shadow-purple-200/50' },
              ].map((feature, i) => (
                <motion.div
                  key={feature.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.1, duration: 0.5 }}
                  className="flex items-center gap-4 group"
                >
                  <div className={`w-12 h-12 flex items-center justify-center rounded-xl ${feature.color} group-hover:scale-110 transition-transform duration-300 shadow-md border border-white/60 backdrop-blur-sm`}>
                    {feature.icon}
                  </div>
                  <span className="text-sm font-bold text-slate-700">{feature.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
        
        {/* Right Side - Auth Form Card */}
        <div className="flex-1 w-full max-w-md lg:max-w-lg mx-auto flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, type: "spring" }}
            className="w-full bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-8 sm:p-10 shadow-2xl shadow-indigo-100/50 border border-white"
          >
            <div className="text-center mb-10">
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">{title}</h2>
              {subtitle && (
                <p className="mt-3 text-sm font-semibold text-slate-500 uppercase tracking-wider">{subtitle}</p>
              )}
            </div>
            
            {children}
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-8 text-center text-sm font-medium text-slate-500"
          >
            © {new Date().getFullYear()} UniLife Platform. All rights reserved.
          </motion.div>
        </div>
      </div>
    </div>
  )
}
