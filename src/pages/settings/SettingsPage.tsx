import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/authStore'
import { useSystemStore } from '@/store/systemStore'
import { db, supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { User, Globe, Lock, Database } from 'lucide-react'
import { CURRENCIES, getCurrencyRate } from '@/lib/utils'
import type { CostItem, FinancialSettings, Project, Risk } from '@/types'

export default function SettingsPage() {
  const { t } = useTranslation()
  const { user, profile, setProfile } = useAuthStore()
  const { globalCurrency } = useSystemStore()
  const [activeSection, setActiveSection] = useState('profile')
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [saving, setSaving] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [updatingPassword, setUpdatingPassword] = useState(false)
  // Use localStorage preference first, fall back to admin-set global currency
  const [preferredCurrency, setPreferredCurrency] = useState(localStorage.getItem('preferred_currency') || globalCurrency)
  const [updatingCurrency, setUpdatingCurrency] = useState(false)

  // Data Portability States
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const loadCurrencyPreference = async () => {
      if (!user || localStorage.getItem('preferred_currency')) return

      const { data } = await db
        .from('projects')
        .select('financial_settings(currency)')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

      const projectCurrency = data?.financial_settings?.[0]?.currency
      if (projectCurrency) setPreferredCurrency(projectCurrency)
    }

    loadCurrencyPreference()
  }, [user])

  const handleExportData = async () => {
    setExporting(true)
    toast.info('Structuring export payload... Please wait.')
    
    // Fetch all user projects with deeply nested relationships
    const { data, error } = await db.from('projects')
      .select('*, cost_items(*), risks(*), financial_settings(*), project_versions(*)')
      .eq('user_id', user!.id)

    if (error || !data) {
      toast.error('Failed to extract data: ' + (error?.message || 'Unknown error'))
      setExporting(false)
      return
    }

    // Format structure to JSON and trigger Blob download
    const jsonString = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `cost_estimator_data_export_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast.success('System export completed successfully!')
    setExporting(false)
  }

  const handleDeleteAccount = async () => {
    if (!window.confirm('WARNING: Are you absolutely sure? This will PERMANENTLY delete your account, all your projects, and all associated structural data. This cannot be undone.')) return
    
    setDeleting(true)
    const { error } = await supabase.rpc('delete_user_account')

    if (error) {
      toast.error('Account deletion failed: ' + error.message)
      setDeleting(false)
    } else {
      toast.success('Account successfully purged. Goodbye.')
      await supabase.auth.signOut()
    }
  }

  const handleUpdatePassword = async () => {
    if (!currentPassword) {
      toast.error('Please enter your current password first')
      return
    }
    if (!newPassword || newPassword.length < 6) {
      toast.error('New password must be at least 6 characters')
      return
    }

    setUpdatingPassword(true)
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Password updated successfully!')
      setCurrentPassword('')
      setNewPassword('')
    }
    setUpdatingPassword(false)
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    const { error } = await db.from('profiles').update({ full_name: fullName }).eq('id', user!.id)
    if (!error) {
      // Re-fetch profile to strictly sync local state with our backend changes
      const { data } = await db.from('profiles').select('*').eq('id', user!.id).single()
      if (data) setProfile(data)
      toast.success('Profile updated!')
    } else {
      console.error(error)
      toast.error('Failed to update profile')
    }
    setSaving(false)
  }

  const convertUserProjectCurrency = async (newCurrency: string) => {
    if (!user || newCurrency === preferredCurrency) return

    setUpdatingCurrency(true)
    const { data: projects, error } = await db
      .from('projects')
      .select('*, financial_settings(*)')
      .eq('user_id', user.id)

    if (error) {
      toast.error('Failed to load projects for currency conversion: ' + error.message)
      setUpdatingCurrency(false)
      return
    }

    let conversionMeta = ''
    for (const project of (projects || []) as (Project & { financial_settings?: FinancialSettings[] })[]) {
      const currentSettings = project.financial_settings?.[0]
      const oldCurrency = currentSettings?.currency || preferredCurrency || globalCurrency
      if (oldCurrency === newCurrency) continue

      const { rate, date, source } = await getCurrencyRate(oldCurrency, newCurrency)
      conversionMeta = ` using ${source} rate dated ${date}`
      const convertAmount = (value: number | null | undefined) =>
        value == null ? null : value * rate

      const { data: items } = await db.from('cost_items').select('*').eq('project_id', project.id)
      await Promise.all(((items || []) as CostItem[]).map((item) =>
        db.from('cost_items').update({
          unit_price: convertAmount(item.unit_price),
          daily_rate: convertAmount(item.daily_rate),
          rental_cost: convertAmount(item.rental_cost),
          maintenance: convertAmount(item.maintenance),
          fuel: convertAmount(item.fuel),
        }).eq('id', item.id)
      ))

      const { data: risks } = await db.from('risks').select('*').eq('project_id', project.id)
      await Promise.all(((risks || []) as Risk[]).map((risk) =>
        db.from('risks').update({ impact: (risk.impact || 0) * rate }).eq('id', risk.id)
      ))

      await db.from('financial_settings').upsert({
        ...(currentSettings || {}),
        project_id: project.id,
        currency: newCurrency,
      }, { onConflict: 'project_id' })
    }

    localStorage.setItem('preferred_currency', newCurrency)
    setPreferredCurrency(newCurrency)
    toast.success(`Currency changed to ${newCurrency}. Existing project values were converted${conversionMeta}.`)
    setUpdatingCurrency(false)
  }

  const sections = [
    { id: 'profile', label: t('settings.profile'), icon: <User size={16} /> },
    { id: 'preferences', label: t('settings.preferences'), icon: <Globe size={16} /> },
    { id: 'security', label: t('settings.security'), icon: <Lock size={16} /> },
    { id: 'data', label: t('settings.dataManagement'), icon: <Database size={16} /> },
  ]

  return (
    <div className="animate-in space-y-6">
      <h1 className="text-2xl font-bold text-white">{t('settings.title')}</h1>

      <div className="flex gap-6 flex-wrap md:flex-nowrap">
        {/* Section nav */}
        <div className="w-full md:w-48 flex-shrink-0">
          <nav className="space-y-1">
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`nav-item w-full ${activeSection === s.id ? 'active' : ''}`}
              >
                {s.icon}
                <span>{s.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeSection === 'profile' && (
            <div className="card space-y-5">
              <h2 className="font-semibold text-white">{t('settings.profile')}</h2>
              <div>
                <label className="label">{t('settings.fullName')}</label>
                <input type="text" className="input max-w-sm" value={fullName} onChange={e => setFullName(e.target.value)} />
              </div>
              <div>
                <label className="label">{t('settings.email')}</label>
                <input type="email" className="input max-w-sm" value={user?.email || ''} readOnly disabled />
              </div>
              <button onClick={handleSaveProfile} disabled={saving} className="btn-primary">
                {saving ? t('common.loading') : t('settings.save')}
              </button>
            </div>
          )}

          {activeSection === 'preferences' && (
            <div className="card space-y-5">
              <h2 className="font-semibold text-white">{t('settings.preferences')}</h2>
              <div className="hidden">
                <label className="label">{t('settings.language')}</label>
                <div className="flex gap-3">
                  {[
                    { code: 'en', label: 'English' },
                    { code: 'hi', label: 'हिन्दी' },
                  ].map(l => (
                    <button
                      key={l.code}
                      disabled
                      className="btn-outline btn-sm"
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">{t('settings.currency')}</label>
                <select
                  className="input max-w-sm"
                  value={preferredCurrency}
                  onChange={(e) => convertUserProjectCurrency(e.target.value)}
                  disabled={updatingCurrency}
                >
                  {CURRENCIES.map(currency => (
                    <option key={currency} value={currency}>{currency}</option>
                  ))}
                </select>
                <p className="text-xs text-surface-muted mt-2">
                  {t('settings.currencyNote')}
                </p>
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="card space-y-5">
              <h2 className="font-semibold text-white">{t('settings.security')}</h2>
              <div>
                <label className="label">{t('settings.currentPassword')}</label>
                <input
                  type="password"
                  className="input max-w-sm"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="label">{t('settings.newPassword')}</label>
                <input
                  type="password"
                  className="input max-w-sm"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <button
                onClick={handleUpdatePassword}
                disabled={updatingPassword}
                className="btn-primary"
              >
                {updatingPassword ? t('settings.updatingPassword') : t('settings.updatePassword')}
              </button>
            </div>
          )}

          {activeSection === 'data' && (
            <div className="space-y-6">
              <div className="card space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-semibold text-white">{t('settings.massExport')}</h2>
                    <p className="text-sm text-surface-muted mt-1">{t('settings.massExportDesc')}</p>
                  </div>
                  <Database className="text-accent opacity-50" size={32} />
                </div>
                <button
                  onClick={handleExportData}
                  disabled={exporting}
                  className="btn-outline border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                >
                  {exporting ? t('settings.extractingPayload') : t('settings.downloadBackup')}
                </button>
              </div>

              <div className="card border-red-500/20 bg-red-950/20 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-semibold text-red-500">{t('settings.dangerZone')}</h2>
                    <p className="text-sm text-surface-muted mt-1">{t('settings.dangerZoneDesc')}</p>
                  </div>
                </div>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded font-medium text-sm transition-colors"
                >
                  {deleting ? t('settings.awaitingServer') : t('settings.deleteAccount')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
