import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Password reset successfully. Please sign in with your new password.')
      await supabase.auth.signOut()
      navigate('/login', { replace: true })
    }

    setLoading(false)
  }

  return (
    <div className="animate-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Reset Password</h1>
        <p className="text-surface-muted mt-2 text-sm">Enter a new password for your account.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">New Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              className="input pe-10"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
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
          <label className="label">Confirm Password</label>
          <input
            type={showPassword ? 'text' : 'password'}
            className="input"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <><LockKeyhole size={16} /> Reset Password</>
          )}
        </button>
      </form>

      <p className="text-center text-sm text-surface-muted mt-6">
        <Link to="/login" className="text-accent hover:underline font-medium">
          Back to login
        </Link>
      </p>
    </div>
  )
}
