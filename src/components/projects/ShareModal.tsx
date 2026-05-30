import { useState } from 'react'
import { X, Copy, Check, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { db } from '@/lib/supabase'
import { generateShareToken, sha256 } from '@/lib/utils'
import { auditLogger } from '@/lib/auditLogger'
import { useAuthStore } from '@/store/authStore'
import type { Project } from '@/types'

interface Props {
  project: Project
  onClose: () => void
}

export default function ShareModal({ project, onClose }: Props) {
  const { user } = useAuthStore()
  const [token] = useState(() => generateShareToken())
  const [copied, setCopied] = useState(false)
  const [password, setPassword] = useState('')
  const [expiry, setExpiry] = useState('7d')
  const [savedUrl, setSavedUrl] = useState('')
  const [saving, setSaving] = useState(false)

  const shareUrl = `${window.location.origin}/share/${token}`

  const getExpiryDate = () => {
    if (!expiry) return null
    const expiresAt = new Date()
    const days = expiry === '1d' ? 1 : expiry === '30d' ? 30 : 7
    expiresAt.setDate(expiresAt.getDate() + days)
    return expiresAt.toISOString()
  }

  const saveLink = async () => {
    if (savedUrl) return savedUrl

    setSaving(true)
    const passwordHash = password ? await sha256(password) : null
    const { error } = await db.from('shared_projects').insert({
      project_id: project.id,
      share_token: token,
      password_hash: passwordHash,
      expires_at: getExpiryDate(),
    })

    setSaving(false)

    if (error) {
      toast.error(`Failed to save share link: ${error.message}`)
      return ''
    }

    if (user) auditLogger.logShareLinkGenerated(user.id, project.id)
    setSavedUrl(shareUrl)
    toast.success('Share link saved!')
    return shareUrl
  }

  const copyLink = async () => {
    const url = await saveLink()
    if (!url) return

    navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success('Link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-md max-h-[calc(100vh-2rem)] overflow-hidden shadow-2xl animate-in">
        <div className="flex items-center justify-between p-5 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <Link2 size={18} className="text-accent" />
            <h2 className="font-semibold text-white">Share Project</h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-1.5"><X size={16} /></button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 max-h-[calc(100vh-10rem)] overflow-y-auto">
          <p className="text-sm text-surface-muted">Share <strong className="text-white">{project.name}</strong> with others using a secure link.</p>

          {/* Generated link */}
          <div>
            <label className="label">Share Link</label>
            <div className="flex gap-2 min-w-0">
              <input
                readOnly
                value={savedUrl || shareUrl}
                className="input text-xs flex-1"
              />
              <button onClick={copyLink} disabled={saving} className="btn-primary btn-sm px-3">
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="label">Password Protection (optional)</label>
            <input
              type="password"
              className="input"
              placeholder="Leave empty for public access"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={!!savedUrl}
            />
          </div>

          {/* Expiry */}
          <div>
            <label className="label">Link Expires In</label>
            <select className="input" value={expiry} onChange={e => setExpiry(e.target.value)} disabled={!!savedUrl}>
              <option value="1d">1 Day</option>
              <option value="7d">7 Days</option>
              <option value="30d">30 Days</option>
              <option value="">Never expires</option>
            </select>
          </div>

          <button className="btn-primary w-full" onClick={saveLink} disabled={saving || !!savedUrl}>
            {saving ? 'Saving...' : savedUrl ? 'Link Saved' : 'Generate & Save Link'}
          </button>

        </div>

        <div className="flex justify-end p-4 sm:p-5 border-t border-surface-border">
          <button onClick={onClose} className="btn-outline">Close</button>
        </div>
      </div>
    </div>
  )
}
