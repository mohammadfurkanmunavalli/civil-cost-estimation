import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AlertTriangle, Lock, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { db } from '@/lib/supabase'
import { calculateCostSummary, calculateItemCost } from '@/lib/calculations'
import { DEFAULT_CURRENCY, formatCurrency, formatDate, sha256 } from '@/lib/utils'
import type { CostItem, FinancialSettings, Project } from '@/types'

type SharePayload = {
  status: 'ok' | 'not_found' | 'expired' | 'password_required'
  password_required?: boolean
  project?: Project
  cost_items?: CostItem[]
  financial_settings?: FinancialSettings | null
}

const fallbackFinancialSettings: FinancialSettings = {
  id: '',
  project_id: '',
  overhead_pct: 10,
  contingency_pct: 5,
  markup_pct: 15,
  tax_pct: 5,
  currency: DEFAULT_CURRENCY,
}

export default function ShareViewPage() {
  const { token } = useParams<{ token: string }>()
  const [payload, setPayload] = useState<SharePayload | null>(null)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const loadShare = useCallback(async (passwordValue = '') => {
    if (!token) return

    const passwordHash = passwordValue ? await sha256(passwordValue) : null
    const { data, error } = await db.rpc('get_shared_project', {
      input_token: token,
      input_password_hash: passwordHash,
    })

    if (error) {
      toast.error(error.message)
      setPayload({ status: 'not_found' })
    } else {
      setPayload(data as SharePayload)
    }
  }, [token])

  useEffect(() => {
    setLoading(true)
    loadShare().finally(() => setLoading(false))
  }, [loadShare])

  const project = payload?.project
  const costItems = useMemo(() => payload?.cost_items || [], [payload?.cost_items])
  const financialSettings = useMemo(() => (
    payload?.financial_settings || {
      ...fallbackFinancialSettings,
      project_id: project?.id || '',
    }
  ), [payload?.financial_settings, project?.id])

  const summary = useMemo(
    () => calculateCostSummary(costItems, financialSettings),
    [costItems, financialSettings]
  )

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    await loadShare(password)
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (payload?.status === 'password_required') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <form onSubmit={handlePasswordSubmit} className="card max-w-md w-full text-center">
          <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={22} className="text-accent" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Protected Project</h1>
          <p className="text-surface-muted text-sm mb-5">Enter the share password to view this read-only project.</p>
          <input
            type="password"
            className="input"
            placeholder="Share password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button className="btn-primary w-full mt-4" disabled={submitting}>
            {submitting ? 'Checking...' : 'View Project'}
          </button>
        </form>
      </div>
    )
  }

  if (!project || payload?.status === 'not_found' || payload?.status === 'expired') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="card max-w-md w-full text-center">
          <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={22} className="text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Share Link Unavailable</h1>
          <p className="text-surface-muted text-sm">
            {payload?.status === 'expired'
              ? 'This shared project link has expired.'
              : 'This shared project link was not found.'}
          </p>
        </div>
      </div>
    )
  }

  const currency = financialSettings.currency || DEFAULT_CURRENCY
  const categoryTotals = [
    ['Materials', summary.materialsCost],
    ['Labor', summary.laborCost],
    ['Equipment', summary.equipmentCost],
    ['Additional', summary.additionalCost],
  ]

  return (
    <div className="min-h-screen bg-surface text-white">
      <header className="border-b border-surface-border bg-surface-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-accent text-sm mb-2">
              <ShieldCheck size={16} />
              Read-only shared project
            </div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <p className="text-sm text-surface-muted mt-1">
              Updated {formatDate(project.updated_at)}
            </p>
          </div>
          <span className="badge badge-blue capitalize">{project.status}</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card">
            <p className="text-sm text-surface-muted">Total Price</p>
            <p className="text-2xl font-bold mt-2">{formatCurrency(summary.totalPrice, currency)}</p>
          </div>
          <div className="card">
            <p className="text-sm text-surface-muted">Direct Cost</p>
            <p className="text-xl font-semibold mt-2">{formatCurrency(summary.directCost, currency)}</p>
          </div>
          <div className="card">
            <p className="text-sm text-surface-muted">Cost Items</p>
            <p className="text-xl font-semibold mt-2">{costItems.length}</p>
          </div>
        </section>

        <section className="card">
          <h2 className="font-semibold mb-4">Project Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <Info label="Type" value={project.type} />
            <Info label="Location" value={project.location} />
            <Info label="Size" value={project.size ? `${project.size} ${project.size_unit || ''}` : null} />
            <Info label="Duration" value={project.duration ? `${project.duration} ${project.duration_unit || ''}` : null} />
          </div>
          {project.description && <p className="text-sm text-surface-muted mt-5">{project.description}</p>}
          {project.client_requirements && (
            <div className="mt-5 border-t border-surface-border pt-4">
              <p className="text-sm font-medium mb-1">Client Requirements</p>
              <p className="text-sm text-surface-muted whitespace-pre-wrap">{project.client_requirements}</p>
            </div>
          )}
        </section>

        <section className="card">
          <h2 className="font-semibold mb-4">Cost Breakdown</h2>
          <div className="space-y-3">
            {categoryTotals.map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-surface-muted">{label}</span>
                <span>{formatCurrency(value as number, currency)}</span>
              </div>
            ))}
            <div className="border-t border-surface-border pt-3 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-surface-muted">Overhead</span>
                <span>{formatCurrency(summary.overhead, currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-muted">Contingency</span>
                <span>{formatCurrency(summary.contingency, currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-muted">Markup</span>
                <span>{formatCurrency(summary.markup, currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-muted">Tax</span>
                <span>{formatCurrency(summary.tax, currency)}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="card overflow-hidden">
          <h2 className="font-semibold mb-4">Cost Items</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-surface-muted border-b border-surface-border">
                  <th className="py-2 pr-4 font-medium">Item</th>
                  <th className="py-2 pr-4 font-medium">Category</th>
                  <th className="py-2 pr-4 font-medium">Quantity</th>
                  <th className="py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {costItems.length === 0 ? (
                  <tr><td colSpan={4} className="py-6 text-center text-surface-muted">No cost items have been added.</td></tr>
                ) : costItems.map(item => (
                  <tr key={item.id} className="border-b border-surface-border/60 last:border-0">
                    <td className="py-3 pr-4">{item.name}</td>
                    <td className="py-3 pr-4 capitalize text-surface-muted">{item.category}</td>
                    <td className="py-3 pr-4 text-surface-muted">{item.quantity ? `${item.quantity} ${item.unit || ''}` : '-'}</td>
                    <td className="py-3 text-right">{formatCurrency(calculateItemCost(item), currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-surface-muted">{label}</p>
      <p className="text-white mt-1">{value || '-'}</p>
    </div>
  )
}
