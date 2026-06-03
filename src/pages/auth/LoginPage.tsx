import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Welcome back!')
      navigate('/projects')
    }
    setLoading(false)
  }

  const handleDemoLogin = async () => {
    setEmail('demo@example.com')
    setPassword('demo1234')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: 'demo@example.com',
      password: 'demo1234',
    })
    if (error) {
      toast.error('Demo login failed. Please sign up first.')
    } else {
      navigate('/projects')
    }
    setLoading(false)
  }

  const handleResetPassword = async () => {
    if (!email) {
      toast.error('Please enter your email address first to reset your password.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Password reset link sent! Please check your email inbox.')
    }
    setLoading(false)
  }

  return (
    <div className="animate-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">{t('auth.loginTitle')}</h1>
        <p className="text-surface-muted mt-2 text-sm">{t('auth.loginSubtitle')}</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="label">{t('auth.email')}</label>
          <input
            id="login-email"
            type="email"
            className="input"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="label mb-0">{t('auth.password')}</label>
            <button type="button" onClick={handleResetPassword} className="text-xs text-accent hover:underline">
              {t('auth.forgotPassword')}
            </button>
          </div>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              className="input pe-10"
              placeholder="*******"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-surface-muted hover:text-white"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          id="login-submit"
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-2.5"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <><LogIn size={16} />{t('auth.login')}</>
          )}
        </button>
      </form>

      <p className="text-center text-sm text-surface-muted mt-6">
        {t('auth.noAccount')}{' '}
        <Link to="/signup" className="text-accent hover:underline font-medium">
          {t('auth.signup')}
        </Link>
      </p>
    </div>
  )
}
