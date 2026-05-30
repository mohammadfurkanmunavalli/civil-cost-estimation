import { useState, useEffect } from 'react'
import { Home } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const [stats, setStats] = useState({ projects: '...', users: '...', languages: '2' })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data, error } = await supabase.rpc('get_platform_stats')
        const rpcData = data as { projects: number; users: number; languages: number } | null
        
        if (!error && rpcData) {
          setStats({
            projects: `${rpcData.projects}+`,
            users: rpcData.users > 1000 ? `${(rpcData.users / 1000).toFixed(1)}K` : rpcData.users.toString(),
            languages: rpcData.languages.toString()
          })
        }
      } catch (err) {
        // Fail silently and keep placeholders if RPC misses
      }
    }
    fetchStats()
  }, [])
  return (
    <div className="min-h-screen bg-surface flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-2/5 bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900 p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-blue-400/5 rounded-full blur-3xl" />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
            <Home size={20} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-lg leading-tight">Cost Estimator</p>
            <p className="text-blue-200 text-xs">Construction Management</p>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Estimate Smarter,<br />Build Better.
          </h1>
          <p className="text-blue-200 text-base leading-relaxed">
            Professional construction cost estimation with materials, labor, equipment breakdown, 
            financial summaries, and multilingual support.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4">
            {[
              { label: 'Projects', value: stats.projects },
              { label: 'Users', value: stats.users },
              { label: 'Languages', value: stats.languages },
            ].map(stat => (
              <div key={stat.label} className="bg-white/10 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-white transition-opacity duration-300">
                  {stat.value}
                </p>
                <p className="text-blue-200 text-xs mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-blue-300 text-xs">
          © 2026 Construction Cost Estimator. All rights reserved.
        </p>
      </div>

      {/* Right auth panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center">
              <Home size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg text-white">Cost Estimator</span>
          </div>

          {children}
        </div>
      </div>
    </div>
  )
}
