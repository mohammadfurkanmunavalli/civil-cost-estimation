import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '@/store/projectStore'
import { DEFAULT_CURRENCY, formatCurrency } from '@/lib/utils'
import { Plus, Trash2, Pencil, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import type { Risk } from '@/types'
import RiskFormModal from '@/components/projects/RiskFormModal'

interface Props { projectId: string }

export default function RisksTab({ projectId }: Props) {
  const { t } = useTranslation()
  const { risks, financialSettings, deleteRisk } = useProjectStore()
  const [showForm, setShowForm] = useState(false)
  const [editRisk, setEditRisk] = useState<Risk | null>(null)

  const currency = financialSettings?.currency || DEFAULT_CURRENCY
  const totalContingency = risks.reduce((acc, r) => acc + r.impact * (r.probability / 100), 0)

  const handleDelete = async (id: string) => {
    await deleteRisk(id)
    toast.success('Risk removed')
  }

  const getRiskLevel = (probability: number, impact: number) => {
    const score = (probability / 100) * impact
    if (score > 50000) return { label: 'High', className: 'badge-red' }
    if (score > 10000) return { label: 'Medium', className: 'badge-yellow' }
    return { label: 'Low', className: 'badge-green' }
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className="text-warning" />
          <h2 className="text-lg font-semibold text-white">{t('risks.title')}</h2>
        </div>
        <button
          id="add-risk-btn"
          onClick={() => { setEditRisk(null); setShowForm(true) }}
          className="btn-primary btn-sm"
        >
          <Plus size={14} /> {t('risks.addRisk')}
        </button>
      </div>

      {/* Total contingency card */}
      {risks.length > 0 && (
        <div className="stat-card">
          <p className="stat-label">Total Risk Contingency</p>
          <p className="stat-value text-warning">{formatCurrency(totalContingency, currency)}</p>
          <p className="stat-sub">Expected weighted cost across {risks.length} risks</p>
        </div>
      )}

      {/* Risks table */}
      {risks.length === 0 ? (
        <div className="card text-center py-12 text-surface-muted">
          <AlertTriangle size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t('risks.noRisks')}</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>{t('risks.name')}</th>
                <th>{t('risks.probability')}</th>
                <th>{t('risks.impact')}</th>
                <th>{t('risks.expectedCost')}</th>
                <th>Level</th>
                <th>{t('risks.mitigation')}</th>
                <th>{t('costs.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {risks.map(risk => {
                const level = getRiskLevel(risk.probability, risk.impact)
                const expectedCost = risk.impact * (risk.probability / 100)
                return (
                  <tr key={risk.id}>
                    <td className="font-medium">
                      <div>
                        <p>{risk.name}</p>
                        {risk.description && <p className="text-xs text-surface-muted">{risk.description}</p>}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-surface-border rounded-full overflow-hidden">
                          <div
                            className="h-full bg-warning rounded-full"
                            style={{ width: `${risk.probability}%` }}
                          />
                        </div>
                        <span className="text-xs">{risk.probability}%</span>
                      </div>
                    </td>
                    <td>{formatCurrency(risk.impact, currency)}</td>
                    <td className="text-warning font-medium">{formatCurrency(expectedCost, currency)}</td>
                    <td><span className={`badge ${level.className}`}>{level.label}</span></td>
                    <td className="text-surface-muted text-xs max-w-40 truncate">{risk.mitigation || '—'}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditRisk(risk); setShowForm(true) }} className="btn btn-ghost p-1">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleDelete(risk.id)} className="btn btn-ghost p-1 hover:text-danger">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <RiskFormModal
          projectId={projectId}
          risk={editRisk}
          onClose={() => { setShowForm(false); setEditRisk(null) }}
        />
      )}
    </div>
  )
}
