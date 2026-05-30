import { useState, useEffect, useMemo } from 'react'
import { X, Search, Lock, Image as ImageIcon } from 'lucide-react'
import { db } from '@/lib/supabase'
import { useProjectStore } from '@/store/projectStore'
import { useAuthStore } from '@/store/authStore'
import { cn, DEFAULT_CURRENCY, formatCurrency, getCurrencyRate } from '@/lib/utils'
import { toast } from 'sonner'
import type { CostItem, CostCategory, Resource } from '@/types'

type LibraryResource = Pick<Resource, 'id' | 'name' | 'description' | 'unit' | 'unit_price' | 'currency' | 'image_url'> & {
  profiles?: {
    role?: 'admin' | 'user'
  } | null
  maintenance_rate?: number | null
  fuel_rate?: number | null
}

interface Props {
  projectId: string
  category: CostCategory
  item?: CostItem | null
  onClose: () => void
}

export default function CostItemFormModal({ projectId, category, item, onClose }: Props) {
  const { createCostItem, updateCostItem, financialSettings } = useProjectStore()
  const { profile } = useAuthStore()
  const isAdmin = profile?.role === 'admin'
  const requiresLibrarySelection = category !== 'additional'
  const [loading, setLoading] = useState(false)
  const [libraryItems, setLibraryItems] = useState<LibraryResource[]>([])
  const [searchLibrary, setSearchLibrary] = useState('')
  const [showLibrary, setShowLibrary] = useState(false)
  const [selectedLibraryItemId, setSelectedLibraryItemId] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: item?.name || '',
    quantity: item?.quantity?.toString() || '',
    unit: item?.unit || '',
    unit_price: item?.unit_price?.toString() || '',
    workers: item?.workers?.toString() || '',
    daily_rate: item?.daily_rate?.toString() || '',
    days: item?.days?.toString() || '',
    rental_cost: item?.rental_cost?.toString() || '',
    maintenance: item?.maintenance?.toString() || '',
    fuel: item?.fuel?.toString() || '',
    notes: item?.notes || '',
  })
  const projectCurrency = financialSettings?.currency || DEFAULT_CURRENCY

  // Live cost previews
  const materialTotal = useMemo(() => {
    const q = Number(form.quantity) || 0
    const p = Number(form.unit_price) || 0
    return q * p
  }, [form.quantity, form.unit_price])

  const laborTotal = useMemo(() => {
    const w = Number(form.workers) || 0
    const r = Number(form.daily_rate) || 0
    const d = Number(form.days) || 0
    return w * r * d
  }, [form.workers, form.daily_rate, form.days])

  const equipmentTotal = useMemo(() => {
    const rental = Number(form.rental_cost) || 0
    const maint = Number(form.maintenance) || 0
    const fuel = Number(form.fuel) || 0
    const d = Number(form.days) || 0
    return (rental + maint + fuel) * d
  }, [form.rental_cost, form.maintenance, form.fuel, form.days])

  const additionalTotal = useMemo(() => {
    return Number(form.unit_price) || 0
  }, [form.unit_price])

  useEffect(() => {
    const fetchLibrary = async () => {
      if (!requiresLibrarySelection) {
        setLibraryItems([])
        setShowLibrary(false)
        return
      }

      const { data, error } = await db.from('resources')
        .select('*')
        .eq('category', category)

      if (error) {
        console.error('Library fetch error:', error)
        setLibraryItems([])
      } else {
        const resourceRows = (data || []) as LibraryResource[]
        const ownerIds = [...new Set(resourceRows.map((resource) => (resource as any).user_id).filter(Boolean))]
        const { data: ownerProfiles } = ownerIds.length > 0
          ? await db.from('profiles').select('id, role').in('id', ownerIds)
          : { data: [] }
        const ownerRoleById = new Map((ownerProfiles || []).map((owner: { id: string; role: string | null }) => [owner.id, owner.role]))
        const filtered = resourceRows.filter((resource) => isAdmin || ownerRoleById.get((resource as any).user_id) === 'admin')
        setLibraryItems(filtered)
      }

      if (!isAdmin && !item) {
        setShowLibrary(true)
      }
    }

    fetchLibrary()
  }, [category, isAdmin, item, requiresLibrarySelection])

  const filteredLibrary = useMemo(() => {
    return libraryItems.filter((libraryItem) =>
      libraryItem.name.toLowerCase().includes(searchLibrary.toLowerCase())
    )
  }, [libraryItems, searchLibrary])

  const hasValidLibrarySelection = useMemo(() => {
    if (!requiresLibrarySelection) return true
    if (isAdmin) return true
    if (selectedLibraryItemId) return true
    if (!item) return false

    return libraryItems.some((libraryItem) =>
      libraryItem.name === form.name &&
      (libraryItem.unit || '') === form.unit &&
      String(libraryItem.unit_price ?? 0) === String(form.unit_price || '0')
    )
  }, [form.name, form.unit, form.unit_price, isAdmin, item, libraryItems, requiresLibrarySelection, selectedLibraryItemId])

  const handleSelectLibraryItem = async (selectedItem: LibraryResource) => {
    setSelectedLibraryItemId(selectedItem.id)
    const resourceCurrency = selectedItem.currency || DEFAULT_CURRENCY
    const { rate } = await getCurrencyRate(resourceCurrency, projectCurrency)
    const convertedUnitPrice = (selectedItem.unit_price || 0) * rate
    const convertedMaintenanceRate = (selectedItem.maintenance_rate || 0) * rate
    const convertedFuelRate = (selectedItem.fuel_rate || 0) * rate

    setForm((currentForm) => ({
      ...currentForm,
      name: selectedItem.name,
      unit: selectedItem.unit || '',
      unit_price: convertedUnitPrice.toFixed(2),
      notes: selectedItem.description || '',
      // For labor: unit_price from library = daily rate per worker
      daily_rate: category === 'labor' ? convertedUnitPrice.toFixed(2) : currentForm.daily_rate,
      // For equipment: populate rental, maintenance, and fuel from stored admin rates
      rental_cost: category === 'equipment' ? convertedUnitPrice.toFixed(2) : currentForm.rental_cost,
      maintenance: category === 'equipment' ? convertedMaintenanceRate.toFixed(2) : currentForm.maintenance,
      fuel: category === 'equipment' ? convertedFuelRate.toFixed(2) : currentForm.fuel,
    }))
    setShowLibrary(false)
    toast.success(`${selectedItem.name} selected from library`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }
    if (!isAdmin && requiresLibrarySelection && !hasValidLibrarySelection) {
      toast.error('Users must pick an item from the admin library.')
      setShowLibrary(true)
      return
    }

    setLoading(true)

    const data: Partial<CostItem> = {
      project_id: projectId,
      category,
      name: form.name,
      notes: form.notes || null,
      quantity: form.quantity ? Number(form.quantity) : null,
      unit: form.unit || null,
      unit_price: form.unit_price ? Number(form.unit_price) : null,
      workers: form.workers ? Number(form.workers) : null,
      daily_rate: form.daily_rate ? Number(form.daily_rate) : null,
      days: form.days ? Number(form.days) : null,
      rental_cost: form.rental_cost ? Number(form.rental_cost) : null,
      maintenance: form.maintenance ? Number(form.maintenance) : null,
      fuel: form.fuel ? Number(form.fuel) : null,
    }

    if (item) {
      await updateCostItem(item.id, data)
      toast.success('Item updated')
    } else {
      await createCostItem(data)
      toast.success('Item added')
    }

    setLoading(false)
    onClose()
  }

  const categoryLabel: Record<CostCategory, string> = {
    materials: 'Material',
    labor: 'Labor',
    equipment: 'Equipment',
    additional: 'Additional Cost'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-lg max-h-[calc(100vh-2rem)] overflow-hidden shadow-2xl animate-in">
        <div className="flex items-center justify-between p-5 border-b border-surface-border">
          <h2 className="font-semibold text-white">{item ? 'Edit' : 'Add'} {categoryLabel[category]}</h2>
          <button onClick={onClose} className="btn btn-ghost p-1.5"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 max-h-[calc(100vh-10rem)] overflow-y-auto">
          <div className="relative">
            <div className="flex items-center justify-between mb-1.5">
              <label className="label mb-0">Name *</label>
              {requiresLibrarySelection && (
                <button
                  type="button"
                  onClick={() => setShowLibrary(!showLibrary)}
                  className="text-xs text-accent flex items-center gap-1 hover:underline"
                >
                  <Search size={10} /> {isAdmin ? 'Search from Library' : 'Pick from Admin Library'}
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                className={cn('input', !isAdmin && requiresLibrarySelection && 'bg-surface/50 cursor-not-allowed')}
                value={form.name}
                onChange={(e) => {
                  if (!isAdmin && requiresLibrarySelection) return
                  setSelectedLibraryItemId(null)
                  setForm((currentForm) => ({ ...currentForm, name: e.target.value }))
                }}
                required
                placeholder={requiresLibrarySelection && !isAdmin ? 'Please pick from library' : 'Cost name'}
                readOnly={!isAdmin && requiresLibrarySelection}
              />
              {!isAdmin && requiresLibrarySelection && <Lock size={12} className="absolute end-3 top-1/2 -translate-y-1/2 text-surface-muted opacity-50" />}
            </div>

            {requiresLibrarySelection && showLibrary && (
              <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-surface-card border border-surface-border rounded-xl shadow-2xl overflow-hidden animate-in">
                <div className="p-2 border-b border-surface-border">
                  <div className="relative">
                    <Search size={12} className="absolute start-3 top-1/2 -translate-y-1/2 text-surface-muted" />
                    <input
                      type="text"
                      autoFocus
                      className="input input-sm ps-8 h-8 rounded-lg"
                      placeholder="Search library..."
                      value={searchLibrary}
                      onChange={(e) => setSearchLibrary(e.target.value)}
                    />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredLibrary.length === 0 ? (
                    <div className="p-4 text-center text-xs text-surface-muted">No matching items in library.</div>
                  ) : filteredLibrary.map((lib) => (
                    <button
                      key={lib.id}
                      type="button"
                      onClick={() => handleSelectLibraryItem(lib)}
                      className="w-full text-start p-3 hover:bg-white/5 border-b border-surface-border last:border-0 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-surface-border bg-surface flex items-center justify-center">
                          {lib.image_url ? (
                            <img src={lib.image_url} alt={lib.name} className="h-full w-full object-cover" />
                          ) : (
                            <ImageIcon size={16} className="text-surface-muted" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-white text-sm truncate">{lib.name}</div>
                          {lib.description && (
                            <div className="text-[10px] text-surface-muted truncate">{lib.description}</div>
                          )}
                          <div className="text-[10px] text-surface-muted flex gap-2">
                            {lib.unit && <span>Unit: {lib.unit}</span>}
                            {lib.unit_price > 0 && <span>Price: {formatCurrency(lib.unit_price, lib.currency || DEFAULT_CURRENCY)}</span>}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {category === 'materials' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="label">Quantity</label>
                  <input type="number" className="input" value={form.quantity} onChange={(e) => setForm((currentForm) => ({ ...currentForm, quantity: e.target.value }))} placeholder="0" min="0" />
                </div>
                <div>
                  <label className="label">Unit</label>
                  <div className="relative">
                    <input
                      type="text"
                      className={cn('input', !isAdmin && 'bg-surface/50 cursor-not-allowed')}
                      value={form.unit}
                      onChange={(e) => {
                        if (!isAdmin) return
                        setSelectedLibraryItemId(null)
                        setForm((currentForm) => ({ ...currentForm, unit: e.target.value }))
                      }}
                      placeholder="m3, kg, bag"
                      readOnly={!isAdmin}
                    />
                    {!isAdmin && <Lock size={12} className="absolute end-3 top-1/2 -translate-y-1/2 text-surface-muted opacity-50" />}
                  </div>
                </div>
                <div>
                  <label className="label">Unit Price</label>
                  <div className="relative">
                    <input
                      type="number"
                      className={cn('input', !isAdmin && 'bg-surface/50 cursor-not-allowed')}
                      value={form.unit_price}
                      onChange={(e) => {
                        if (!isAdmin) return
                        setSelectedLibraryItemId(null)
                        setForm((currentForm) => ({ ...currentForm, unit_price: e.target.value }))
                      }}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      readOnly={!isAdmin}
                    />
                    {!isAdmin && <Lock size={12} className="absolute end-3 top-1/2 -translate-y-1/2 text-surface-muted opacity-50" />}
                  </div>
                </div>
              </div>

              {materialTotal > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20">
                  <span className="text-xs text-surface-muted">
                    {form.quantity || 0} {form.unit || 'units'} x {formatCurrency(Number(form.unit_price) || 0, projectCurrency)}/unit
                  </span>
                  <span className="text-sm font-semibold text-accent">
                    = {formatCurrency(materialTotal, projectCurrency)}
                  </span>
                </div>
              )}
            </div>
          )}

          {category === 'labor' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Workers — always editable by user */}
                <div>
                  <label className="label">Workers</label>
                  <input
                    type="number"
                    className="input"
                    value={form.workers}
                    onChange={(e) => setForm((f) => ({ ...f, workers: e.target.value }))}
                    placeholder="0"
                    min="0"
                  />
                </div>

                {/* Daily Rate — admin sets it, user sees locked value from library */}
                <div>
                  <label className="label flex items-center gap-1">
                    Daily Rate
                    {!isAdmin && <Lock size={10} className="text-surface-muted opacity-60" />}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      className={cn('input', !isAdmin && 'bg-surface/50 cursor-not-allowed')}
                      value={form.daily_rate}
                      onChange={(e) => {
                        if (!isAdmin) return
                        setForm((f) => ({ ...f, daily_rate: e.target.value }))
                      }}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      readOnly={!isAdmin}
                    />
                    {!isAdmin && <Lock size={12} className="absolute end-3 top-1/2 -translate-y-1/2 text-surface-muted opacity-50" />}
                  </div>
                </div>

                {/* Days — always editable by user */}
                <div>
                  <label className="label">Days</label>
                  <input
                    type="number"
                    className="input"
                    value={form.days}
                    onChange={(e) => setForm((f) => ({ ...f, days: e.target.value }))
                    }
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>

              {/* Live cost preview */}
              {laborTotal > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20">
                  <span className="text-xs text-surface-muted">
                    {form.workers || 0} workers × {formatCurrency(Number(form.daily_rate) || 0, financialSettings?.currency || DEFAULT_CURRENCY)}/day × {form.days || 0} days
                  </span>
                  <span className="text-sm font-semibold text-accent">
                    = {formatCurrency(laborTotal, financialSettings?.currency || DEFAULT_CURRENCY)}
                  </span>
                </div>
              )}
            </div>
          )}

          {category === 'equipment' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Rental Cost/day — locked for users */}
                <div>
                  <label className="label flex items-center gap-1">
                    Rental Cost / day
                    {!isAdmin && <Lock size={10} className="text-surface-muted opacity-60" />}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      className={cn('input', !isAdmin && 'bg-surface/50 cursor-not-allowed')}
                      value={form.rental_cost}
                      onChange={(e) => { if (!isAdmin) return; setForm((f) => ({ ...f, rental_cost: e.target.value })) }}
                      placeholder="0.00" min="0" step="0.01" readOnly={!isAdmin}
                    />
                    {!isAdmin && <Lock size={12} className="absolute end-3 top-1/2 -translate-y-1/2 text-surface-muted opacity-50" />}
                  </div>
                </div>

                {/* Days — editable by user */}
                <div>
                  <label className="label">Days Used</label>
                  <input
                    type="number"
                    className="input"
                    value={form.days}
                    onChange={(e) => setForm((f) => ({ ...f, days: e.target.value }))}
                    placeholder="0" min="0"
                  />
                </div>

                {/* Maintenance/day — locked for users */}
                <div>
                  <label className="label flex items-center gap-1">
                    Maintenance / day
                    {!isAdmin && <Lock size={10} className="text-surface-muted opacity-60" />}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      className={cn('input', !isAdmin && 'bg-surface/50 cursor-not-allowed')}
                      value={form.maintenance}
                      onChange={(e) => { if (!isAdmin) return; setForm((f) => ({ ...f, maintenance: e.target.value })) }}
                      placeholder="0.00" min="0" step="0.01" readOnly={!isAdmin}
                    />
                    {!isAdmin && <Lock size={12} className="absolute end-3 top-1/2 -translate-y-1/2 text-surface-muted opacity-50" />}
                  </div>
                </div>

                {/* Fuel/day — locked for users */}
                <div>
                  <label className="label flex items-center gap-1">
                    Fuel / day
                    {!isAdmin && <Lock size={10} className="text-surface-muted opacity-60" />}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      className={cn('input', !isAdmin && 'bg-surface/50 cursor-not-allowed')}
                      value={form.fuel}
                      onChange={(e) => { if (!isAdmin) return; setForm((f) => ({ ...f, fuel: e.target.value })) }}
                      placeholder="0.00" min="0" step="0.01" readOnly={!isAdmin}
                    />
                    {!isAdmin && <Lock size={12} className="absolute end-3 top-1/2 -translate-y-1/2 text-surface-muted opacity-50" />}
                  </div>
                </div>
              </div>

              {/* Live cost preview */}
              {equipmentTotal > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20">
                  <span className="text-xs text-surface-muted">
                    ({formatCurrency(Number(form.rental_cost)||0, financialSettings?.currency||DEFAULT_CURRENCY)} + {formatCurrency(Number(form.maintenance)||0, financialSettings?.currency||DEFAULT_CURRENCY)} + {formatCurrency(Number(form.fuel)||0, financialSettings?.currency||DEFAULT_CURRENCY)}) × {form.days||0} days
                  </span>
                  <span className="text-sm font-semibold text-accent">
                    = {formatCurrency(equipmentTotal, financialSettings?.currency || DEFAULT_CURRENCY)}
                  </span>
                </div>
              )}
            </div>
          )}

          {category === 'additional' && (
            <div className="space-y-3">
              <div>
                <label className="label">Amount</label>
                <input type="number" className="input" value={form.unit_price} onChange={(e) => setForm((currentForm) => ({ ...currentForm, unit_price: e.target.value }))} placeholder="0.00" min="0" step="0.01" />
              </div>

              {additionalTotal > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20">
                  <span className="text-xs text-surface-muted">
                    Additional cost amount
                  </span>
                  <span className="text-sm font-semibold text-accent">
                    = {formatCurrency(additionalTotal, projectCurrency)}
                  </span>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={2} value={form.notes} onChange={(e) => setForm((currentForm) => ({ ...currentForm, notes: e.target.value }))} placeholder="Optional notes..." />
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 p-4 sm:p-5 border-t border-surface-border">
          <button onClick={onClose} className="btn-outline btn-sm">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary btn-sm">
            {loading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
            {item ? 'Update' : 'Add Item'}
          </button>
        </div>
      </div>
    </div>
  )
}
