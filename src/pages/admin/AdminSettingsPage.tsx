import { useEffect, useState } from 'react'
import { Settings } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { db } from '@/lib/supabase'
import { useSystemStore } from '@/store/systemStore'
import i18n from '@/i18n/config'

export default function AdminSettingsPage() {
  const { t } = useTranslation()
  const { globalCurrency, globalLanguage, updateGlobalSettings } = useSystemStore()
  const [defaultCurrency, setDefaultCurrency] = useState(globalCurrency)
  const [defaultLanguage, setDefaultLanguage] = useState(globalLanguage)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await db.from('app_settings').select('key, value')
      if (data) {
        data.forEach((setting: any) => {
          if (setting.key === 'default_currency') setDefaultCurrency(setting.value || globalCurrency)
          if (setting.key === 'default_language') setDefaultLanguage(setting.value || globalLanguage)
        })
      }
      setLoading(false)
    }
    fetchSettings()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    const settingsToUpdate = [
      { key: 'default_currency', value: defaultCurrency },
      { key: 'default_language', value: defaultLanguage }
    ]

    const { error } = await db.from('app_settings').upsert(settingsToUpdate, { onConflict: 'key' })
    if (error) {
      toast.error(t('admin.settingsFailed'))
      console.error(error)
    } else {
      await updateGlobalSettings('default_currency', defaultCurrency)
      await updateGlobalSettings('default_language', defaultLanguage)
      i18n.changeLanguage(defaultLanguage)
      toast.success(t('admin.settingsSaved'))
    }
    setSaving(false)
  }

  if (loading) return <div className="p-8 text-center text-surface-muted animate-pulse">{t('admin.loadingConfig')}</div>

  return (
    <div className="animate-in space-y-6">
      <div className="flex items-center gap-2 border-b border-surface-border pb-4">
        <Settings size={28} className="text-accent" />
        <h1 className="text-2xl font-bold text-white">{t('admin.appSettingsTitle')}</h1>
      </div>

      <div className="card space-y-5 max-w-2xl">
        <h2 className="font-semibold text-white mb-2">{t('admin.globalConfig')}</h2>

        <div className="space-y-4">
          <div>
            <label className="label">{t('admin.globalCurrency')}</label>
            <select
              className="input w-full"
              value={defaultCurrency}
              onChange={(e) => setDefaultCurrency(e.target.value)}
            >
              <option value="USD">USD ($) - US Dollar</option>
              <option value="INR">INR (₹) - Indian Rupee</option>
              <option value="EUR">EUR (€) - Euro</option>
              <option value="GBP">GBP (£) - British Pound</option>
              <option value="SAR">SAR - Saudi Riyal</option>
              <option value="AED">AED - UAE Dirham</option>
            </select>
          </div>

          <div>
            <label className="label">{t('admin.globalLanguage')}</label>
            <select
              className="input w-full"
              value={defaultLanguage}
              onChange={(e) => setDefaultLanguage(e.target.value)}
            >
              <option value="en">English</option>
              <option value="hi">Hindi (हिन्दी)</option>
            </select>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary mt-6 !w-auto"
          >
            {saving ? t('admin.savingConfig') : t('admin.saveSettings')}
          </button>
        </div>
      </div>
    </div>
  )
}
