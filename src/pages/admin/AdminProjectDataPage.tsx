import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SlidersHorizontal, Database, BadgeDollarSign, Ruler, Plus, X } from 'lucide-react'
import { useSystemStore } from '@/store/systemStore'
import { toast } from 'sonner'

export default function AdminProjectDataPage() {
  const { t } = useTranslation()
  const store = useSystemStore()

  const [inputs, setInputs] = useState<Record<string, string>>({
    projectTypes: '', sizeUnits: '', durationUnits: '', currencies: ''
  })

  const handleAdd = (key: keyof typeof inputs, storeKey: keyof typeof store) => {
    const val = inputs[key].trim()
    if (!val) return

    const currentArray = store[storeKey] as string[]
    if (currentArray.includes(val)) {
      toast.warning('This item already exists in the dictionary.')
      return
    }

    const newArray = [...currentArray, val]
    store.updateDictionary(storeKey, newArray).then(() => {
      toast.success('Taxonomy added successfully!')
      setInputs(prev => ({ ...prev, [key]: '' }))
    }).catch(() => toast.error('Failed communicating with backend.'))
  }

  const handleDelete = (item: string, storeKey: keyof typeof store) => {
    const currentArray = store[storeKey] as string[]
    const newArray = currentArray.filter(v => v !== item)
    store.updateDictionary(storeKey, newArray).then(() => {
      toast.success('Removed successfully.')
    })
  }

  const renderDictionaryCard = (
    title: string,
    icon: React.ReactNode,
    storeKey: 'projectTypes' | 'sizeUnits' | 'durationUnits' | 'currencies',
    inputKey: string
  ) => {
    const items = store[storeKey] as string[]

    return (
      <div className="card space-y-4">
        <div className="flex items-center gap-2 text-white font-semibold mb-2">
          {icon}
          <h3>{title}</h3>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {items.map(item => (
            <span key={item} className="badge bg-surface border border-surface-border text-surface-muted flex items-center gap-1 group">
              {item}
              <button onClick={() => handleDelete(item, storeKey)} className="text-surface-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-surface-border/50">
          <input
            type="text"
            className="input py-1.5 text-sm flex-1"
            placeholder={t('admin.addNewItem')}
            value={inputs[inputKey]}
            onChange={e => setInputs(prev => ({ ...prev, [inputKey]: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && handleAdd(inputKey, storeKey)}
          />
          <button onClick={() => handleAdd(inputKey, storeKey)} className="btn-primary py-1.5 px-3 text-sm flex items-center gap-1 shadow-none">
            <Plus size={14} /> {t('admin.add')}
          </button>
        </div>
      </div>
    )
  }

  if (store.loading) {
    return <div className="text-center py-20"><div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" /></div>
  }

  return (
    <div className="animate-in space-y-6">
      <div className="flex items-center gap-2 border-b border-surface-border pb-4">
        <SlidersHorizontal size={26} className="text-accent" />
        <h1 className="text-2xl font-bold text-white">{t('admin.projectDataTitle')}</h1>
      </div>

      <p className="text-surface-muted text-sm max-w-3xl">
        {t('admin.projectDataDesc')}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderDictionaryCard(t('admin.projectTaxonomy'), <Database size={18} className="text-accent" />, 'projectTypes', 'projectTypes')}
        {renderDictionaryCard(t('admin.sizeBoundaries'), <Ruler size={18} className="text-orange-400" />, 'sizeUnits', 'sizeUnits')}
        {renderDictionaryCard(t('admin.durationTimelines'), <Ruler size={18} className="text-blue-400" />, 'durationUnits', 'durationUnits')}
        {renderDictionaryCard(t('admin.globalCurrencies'), <BadgeDollarSign size={18} className="text-green-400" />, 'currencies', 'currencies')}
      </div>
    </div>
  )
}
