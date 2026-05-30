import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Eye, EyeOff, UserPlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { db } from '@/lib/supabase'

export default function SignupPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    })

    if (error) {
      toast.error(error.message)
    } else if (data.user) {
      // Profile is auto-created via trigger; update full_name
      await db.from('profiles').update({ full_name: fullName }).eq('id', data.user.id)
      toast.success('Account created! Welcome aboard.')
      navigate('/projects')
    }
    setLoading(false)
  }

  return (
    <div className="animate-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">{t('auth.signupTitle')}</h1>
        <p className="text-surface-muted mt-2 text-sm">{t('auth.signupSubtitle')}</p>
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label className="label">{t('auth.fullName')}</label>
          <input
            id="signup-name"
            type="text"
            className="input"
            placeholder="John Smith"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="label">{t('auth.email')}</label>
          <input
            id="signup-email"
            type="email"
            className="input"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="label">{t('auth.password')}</label>
          <div className="relative">
            <input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              className="input pe-10"
              placeholder="Min. 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
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

        <div>
          <label className="label">{t('auth.confirmPassword')}</label>
          <input
            id="signup-confirm-password"
            type="password"
            className="input"
            placeholder="Repeat password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <button id="signup-submit" type="submit" disabled={loading} className="btn-primary w-full py-2.5 mt-2">
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <><UserPlus size={16} />{t('auth.signup')}</>
          )}
        </button>
      </form>

      <p className="text-center text-sm text-surface-muted mt-6">
        {t('auth.hasAccount')}{' '}
        <Link to="/login" className="text-accent hover:underline font-medium">
          {t('auth.login')}
        </Link>
      </p>
    </div>
  )
}
