import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '@/store/projectStore'
import { calculateCostSummary, calculateItemCost } from '@/lib/calculations'
import { DEFAULT_CURRENCY, formatCurrency } from '@/lib/utils'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { CostItem, CostCategory } from '@/types'
import CostItemFormModal from '@/components/projects/CostItemFormModal'

interface Props { projectId: string }

const COST_TABS: { id: CostCategory | 'summary'; label: string }[] = [
  { id: 'materials', label: 'Materials' },
  { id: 'labor', label: 'Labor' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'additional', label: 'Additional' },
  { id: 'summary', label: 'Summary' },
]

export default function CostsTab({ projectId }: Props) {
  const { t } = useTranslation()
  const { costItems, risks, financialSettings, deleteCostItem } = useProjectStore()
  const [activeCategory, setActiveCategory] = useState<CostCategory | 'summary'>('materials')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<CostItem | null>(null)

  const summary = calculateCostSummary(
    costItems,
    financialSettings || { id: '', project_id: projectId, overhead_pct: 10, contingency_pct: 5, markup_pct: 15, tax_pct: 5, currency: DEFAULT_CURRENCY },
    risks
  )

  const currency = financialSettings?.currency || DEFAULT_CURRENCY
  const filteredItems = costItems.filter(i => i.category === activeCategory)

  const handleDelete = async (id: string) => {
    await deleteCostItem(id)
    toast.success('Item deleted')
  }

  const renderCategoryTable = () => {
    if (filteredItems.length === 0) return (
      <div className="text-center py-12 text-surface-muted">
        <p className="text-sm">{t('costs.noItems')}</p>
      </div>
    )

    return (
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>{t('costs.name')}</th>
              {activeCategory === 'materials' && <><th>{t('costs.quantity')}</th><th>{t('costs.unit')}</th><th>{t('costs.unitPrice')}</th></>}
              {activeCategory === 'labor' && <><th>{t('costs.workers')}</th><th>{t('costs.dailyRate')}</th><th>{t('costs.days')}</th></>}
              {activeCategory === 'equipment' && <><th>{t('costs.rentalCost')}</th><th>{t('costs.maintenance')}</th><th>{t('costs.fuel')}</th></>}
              {activeCategory === 'additional' && <th>{t('costs.unitPrice')}</th>}
              <th className="text-end">{t('costs.totalCost')}</th>
              <th>{t('costs.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => (
              <tr key={item.id}>
                <td className="font-medium">{item.name}</td>
                {activeCategory === 'materials' && (
                  <><td>{item.quantity}</td><td>{item.unit}</td><td>{formatCurrency(item.unit_price || 0, currency)}</td></>
                )}
                {activeCategory === 'labor' && (
                  <><td>{item.workers}</td><td>{formatCurrency(item.daily_rate || 0, currency)}</td><td>{item.days}</td></>
                )}
                {activeCategory === 'equipment' && (
                  <><td>{formatCurrency(item.rental_cost || 0, currency)}</td><td>{formatCurrency(item.maintenance || 0, currency)}</td><td>{formatCurrency(item.fuel || 0, currency)}</td></>
                )}
                {activeCategory === 'additional' && (
                  <td>{formatCurrency(item.unit_price || 0, currency)}</td>
                )}
                <td className="text-end font-semibold text-accent">
                  {formatCurrency(calculateItemCost(item), currency)}
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditItem(item); setShowForm(true) }} className="btn btn-ghost p-1">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="btn btn-ghost p-1 hover:text-danger">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const renderSummary = () => (
    <div className="space-y-4">
      {/* Category breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Materials', value: summary.materialsCost },
          { label: 'Labor', value: summary.laborCost },
          { label: 'Equipment', value: summary.equipmentCost },
          { label: 'Additional', value: summary.additionalCost },
        ].map(({ label, value }) => (
          <div key={label} className="stat-card">
            <p className="stat-label">{label}</p>
            <p className="stat-value text-lg">{formatCurrency(value, currency)}</p>
          </div>
        ))}
      </div>

      {/* Financial breakdown */}
      <div className="card">
        <table className="table">
          <tbody>
            {[
              { label: t('costs.directCost'), value: summary.directCost, className: '' },
              { label: t('costs.overhead'), value: summary.overhead, className: 'text-yellow-300' },
              { label: t('costs.contingency'), value: summary.contingency, className: 'text-orange-300' },
              { label: t('costs.subtotal'), value: summary.subtotal, className: 'font-bold border-t border-surface-border' },
              { label: t('costs.markup'), value: summary.markup, className: 'text-blue-300' },
              { label: t('costs.tax'), value: summary.tax, className: 'text-purple-300' },
            ].map(({ label, value, className }) => (
              <tr key={label}>
                <td className={cn('text-surface-muted', className)}>{label}</td>
                <td className={cn('text-end', className)}>{formatCurrency(value, currency)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-accent/50">
              <td className="font-bold text-white text-base pt-3">{t('costs.grandTotal')}</td>
              <td className="text-end font-bold text-accent text-xl pt-3">{formatCurrency(summary.grandTotal, currency)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Category tabs + add button */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="tab-list">
          {COST_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id as CostCategory | 'summary')}
              className={cn('tab-item', activeCategory === tab.id && 'active')}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {activeCategory !== 'summary' && (
          <button
            id="add-cost-item-btn"
            onClick={() => { setEditItem(null); setShowForm(true) }}
            className="btn-primary btn-sm"
          >
            <Plus size={14} /> {t('costs.addItem')}
          </button>
        )}
      </div>

      {activeCategory === 'summary' ? renderSummary() : renderCategoryTable()}

      {showForm && (
        <CostItemFormModal
          projectId={projectId}
          category={activeCategory as CostCategory}
          item={editItem}
          onClose={() => { setShowForm(false); setEditItem(null) }}
        />
      )}
    </div>
  )
}
