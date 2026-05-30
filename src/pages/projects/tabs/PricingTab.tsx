import { useState, useEffect } from 'react'
import { useProjectStore } from '@/store/projectStore'
import { calculateCostSummary } from '@/lib/calculations'
import { DEFAULT_CURRENCY, formatCurrency, getCurrencyRate } from '@/lib/utils'
import { useSystemStore } from '@/store/systemStore'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'

interface Props { projectId: string }

export default function PricingTab({ projectId }: Props) {
  const { user, profile } = useAuthStore()
  const { currentProject, costItems, risks, financialSettings, updateFinancialSettings } = useProjectStore()
  const { currencies, globalCurrency } = useSystemStore()
  
  const [settings, setSettings] = useState(financialSettings || {
    id: '', project_id: projectId,
    overhead_pct: 10, contingency_pct: 5, markup_pct: 15, tax_pct: 5, currency: globalCurrency
  })
  const [saving, setSaving] = useState(false)
  const [previewRate, setPreviewRate] = useState(1)
  const [rateMeta, setRateMeta] = useState('')

  useEffect(() => {
    const syncCurrency = async () => {
      const sourceCurrency = financialSettings?.currency || globalCurrency || DEFAULT_CURRENCY
      const nextSettings = {
        id: financialSettings?.id || '',
        project_id: financialSettings?.project_id || projectId,
        overhead_pct: financialSettings?.overhead_pct ?? 10,
        contingency_pct: financialSettings?.contingency_pct ?? 5,
        markup_pct: financialSettings?.markup_pct ?? 15,
        tax_pct: financialSettings?.tax_pct ?? 5,
        currency: globalCurrency || sourceCurrency,
      }

      setSettings(nextSettings)

      if (sourceCurrency === nextSettings.currency) {
        setPreviewRate(1)
        setRateMeta('')
        return
      }

      const { rate, date, source } = await getCurrencyRate(sourceCurrency, nextSettings.currency)
      setPreviewRate(rate)
      setRateMeta(`Preview uses ${source} ${sourceCurrency} to ${nextSettings.currency} rate dated ${date}.`)
    }

    syncCurrency()
  }, [financialSettings, globalCurrency, projectId])

  const canEdit = profile?.role === 'admin' || currentProject?.user_id === user?.id
  const sourceCurrency = financialSettings?.currency || globalCurrency || DEFAULT_CURRENCY
  const previewCostItems = sourceCurrency === settings.currency
    ? costItems
    : costItems.map((item) => ({
        ...item,
        unit_price: item.unit_price == null ? null : item.unit_price * previewRate,
        daily_rate: item.daily_rate == null ? null : item.daily_rate * previewRate,
        rental_cost: item.rental_cost == null ? null : item.rental_cost * previewRate,
        maintenance: item.maintenance == null ? null : item.maintenance * previewRate,
        fuel: item.fuel == null ? null : item.fuel * previewRate,
      }))
  const previewRisks = sourceCurrency === settings.currency
    ? risks
    : risks.map((risk) => ({ ...risk, impact: (risk.impact || 0) * previewRate }))
  const summary = calculateCostSummary(previewCostItems, settings, previewRisks)

  const handleCurrencyChange = async (currency: string) => {
    setSettings({ ...settings, currency })
    if (currency === sourceCurrency) {
      setPreviewRate(1)
      setRateMeta('')
      return
    }

    const { rate, date, source } = await getCurrencyRate(sourceCurrency, currency)
    setPreviewRate(rate)
    setRateMeta(`Preview uses ${source} ${sourceCurrency} to ${currency} rate dated ${date}.`)
  }

  const handleSave = async () => {
    setSaving(true)
    await updateFinancialSettings(projectId, settings)
    toast.success(rateMeta ? `Pricing settings saved. ${rateMeta}` : 'Pricing settings saved')
    setSaving(false)
  }

  const sliders = [
    { label: 'Overhead (%)', key: 'overhead_pct', color: 'text-yellow-400' },
    { label: 'Contingency (%)', key: 'contingency_pct', color: 'text-orange-400' },
    { label: 'Markup (%)', key: 'markup_pct', color: 'text-blue-400' },
    { label: 'Tax (%)', key: 'tax_pct', color: 'text-purple-400' },
  ] as const

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card space-y-5">
        <h2 className="text-lg font-semibold text-white">Profit & Pricing Settings</h2>

        <div>
          <label className="label">Currency</label>
          <select
            value={settings.currency}
            onChange={e => handleCurrencyChange(e.target.value)}
            className="input"
            disabled={!canEdit}
          >
            {currencies.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {rateMeta && <p className="text-xs text-surface-muted mt-2">{rateMeta}</p>}
        </div>

        {sliders.map(({ label, key, color }) => {
           const value = settings[key as keyof typeof settings] as number
           const onChange = (v: number) => setSettings({ ...settings, [key]: v })

           return (
          <div key={key}>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">{label}</label>
              <span className={`text-sm font-bold ${color}`}>{value}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="0.5"
              value={value}
              onChange={e => onChange(Number(e.target.value))}
              className="w-full accent-accent"
              disabled={!canEdit}
            />
            <input
              type="number"
              min="0"
              max="50"
              value={value}
              onChange={e => onChange(Number(e.target.value))}
              className="input mt-2 w-28"
              disabled={!canEdit}
            />
          </div>
        )})}

        {canEdit && (
          <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        )}
      </div>

      {/* Financial summary */}
      <div className="card space-y-3">
        <h2 className="text-lg font-semibold text-white">Financial Summary</h2>
        {[
          { label: 'Direct Costs', value: summary.directCost, note: 'Materials + Labor + Equipment + Additional', color: 'text-white' },
          { label: 'Overhead', value: summary.overhead, note: `${settings.overhead_pct}% of direct costs`, color: 'text-yellow-400' },
          { label: 'Contingency', value: summary.contingency, note: `${settings.contingency_pct}% + risk contingency`, color: 'text-orange-400' },
          { label: 'Subtotal', value: summary.subtotal, note: '', color: 'text-white font-bold' },
          { label: 'Profit / Markup', value: summary.markup, note: `${settings.markup_pct}% markup`, color: 'text-blue-400' },
          { label: 'Subtotal Before Tax', value: summary.subtotalBeforeTax, note: '', color: 'text-white font-bold' },
          { label: 'Tax', value: summary.tax, note: `${settings.tax_pct}% tax`, color: 'text-purple-400' },
        ].map(({ label, value, note, color }, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 bg-surface border border-surface-border rounded-lg">
            <div>
              <p className={`font-medium ${color}`}>{label}</p>
              {note && <p className="text-xs text-surface-muted">{note}</p>}
            </div>
            <p className="font-mono">{formatCurrency(value, settings.currency)}</p>
          </div>
        ))}
        
        <div className="mt-4 p-4 bg-accent/10 border border-accent/20 rounded-xl">
          <div className="flex items-center justify-between mb-1">
            <span className="text-accent font-semibold uppercase tracking-wider text-sm">Selling Price</span>
            <span className="text-2xl font-bold font-mono text-white">{formatCurrency(summary.totalPrice, settings.currency)}</span>
          </div>
          <p className="text-xs text-surface-muted">Final quoted price including all provisions</p>
        </div>
      </div>
    </div>
  )
}
