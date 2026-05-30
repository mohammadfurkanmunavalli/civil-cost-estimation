import { useState } from 'react'
import { X } from 'lucide-react'
import { useProjectStore } from '@/store/projectStore'
import { toast } from 'sonner'
import type { Risk } from '@/types'

interface Props {
  projectId: string
  risk?: Risk | null
  onClose: () => void
}

export default function RiskFormModal({ projectId, risk, onClose }: Props) {
  const { createRisk, updateRisk } = useProjectStore()
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    name: risk?.name || '',
    description: risk?.description || '',
    probability: risk?.probability?.toString() || '25',
    impact: risk?.impact?.toString() || '',
    mitigation: risk?.mitigation || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Risk name is required'); return }
    setLoading(true)

    const data: Partial<Risk> = {
      project_id: projectId,
      name: form.name,
      description: form.description || null,
      probability: Number(form.probability),
      impact: Number(form.impact) || 0,
      mitigation: form.mitigation || null,
    }

    if (risk) {
      await updateRisk(risk.id, data)
      toast.success('Risk updated')
    } else {
      await createRisk(data)
      toast.success('Risk added')
    }
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-md shadow-2xl animate-in">
        <div className="flex items-center justify-between p-5 border-b border-surface-border">
          <h2 className="font-semibold text-white">{risk ? 'Edit Risk' : 'Add Risk'}</h2>
          <button onClick={onClose} className="btn btn-ghost p-1.5"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">Risk Name *</label>
            <input type="text" className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Material price fluctuation" />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the risk..." />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label mb-0">Probability</label>
              <span className="text-sm font-bold text-warning">{form.probability}%</span>
            </div>
            <input type="range" min="0" max="100" value={form.probability} onChange={e => setForm(f => ({ ...f, probability: e.target.value }))} className="w-full accent-warning" />
            <div className="flex justify-between text-xs text-surface-muted mt-1">
              <span>0%</span><span>50%</span><span>100%</span>
            </div>
          </div>

          <div>
            <label className="label">Impact (USD)</label>
            <input type="number" className="input" value={form.impact} onChange={e => setForm(f => ({ ...f, impact: e.target.value }))} placeholder="0.00" min="0" step="100" />
          </div>

          <div>
            <label className="label">Mitigation Strategy</label>
            <textarea className="input resize-none" rows={2} value={form.mitigation} onChange={e => setForm(f => ({ ...f, mitigation: e.target.value }))} placeholder="How will this risk be mitigated?" />
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-surface-border">
          <button onClick={onClose} className="btn-outline btn-sm">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary btn-sm">
            {loading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
            {risk ? 'Update Risk' : 'Add Risk'}
          </button>
        </div>
      </div>
    </div>
  )
}
