import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { db, supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Image as ImageIcon, Plus, Search, Pencil, Copy, Trash2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import type { Resource } from '@/types'
import { DEFAULT_CURRENCY, formatCurrency, cn } from '@/lib/utils'

type ResourceCategory = 'materials' | 'labor' | 'equipment'
const TABS: { id: ResourceCategory; labelKey: string }[] = [
  { id: 'materials', labelKey: 'resources.materials' },
  { id: 'labor', labelKey: 'resources.labor' },
  { id: 'equipment', labelKey: 'resources.equipment' },
]

const RESOURCE_IMAGE_BUCKETS: Record<ResourceCategory, string> = {
  materials: 'material-images',
  labor: 'labor-images',
  equipment: 'equipment-images',
}

const CATEGORY_FORM_COPY: Record<ResourceCategory, {
  imageLabel: string
  nameLabel: string
  namePlaceholder: string
  descriptionPlaceholder: string
  unitLabel: string
  unitPlaceholder: string
  priceLabel: string
}> = {
  materials: {
    imageLabel: 'Material Image',
    nameLabel: 'Material Name *',
    namePlaceholder: 'e.g. OPC 53 Grade Cement',
    descriptionPlaceholder: 'e.g. 50 kg bag, branded cement for RCC and masonry work',
    unitLabel: 'Purchase Unit',
    unitPlaceholder: 'bag, kg, ton, m3',
    priceLabel: 'Unit Price',
  },
  labor: {
    imageLabel: 'Labor Image',
    nameLabel: 'Labor Role *',
    namePlaceholder: 'e.g. Skilled Mason',
    descriptionPlaceholder: 'e.g. Mason for brickwork, plastering, and general civil finishing',
    unitLabel: 'Rate Unit',
    unitPlaceholder: 'day, hour, shift, sq ft',
    priceLabel: 'Labor Rate',
  },
  equipment: {
    imageLabel: 'Equipment Image',
    nameLabel: 'Equipment Name *',
    namePlaceholder: 'e.g. Concrete Mixer 10/7 CFT',
    descriptionPlaceholder: 'e.g. Site mixer rental including basic operator support',
    unitLabel: 'Rental Unit',
    unitPlaceholder: 'day, hour, week, month',
    priceLabel: 'Rental Rate',
  },
}

export default function ResourcesPage() {
  const { t } = useTranslation()
  const { user, profile } = useAuthStore()
  const isAdmin = profile?.role === 'admin'
  const [activeTab, setActiveTab] = useState<ResourceCategory>('materials')
  const [resources, setResources] = useState<Resource[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Resource | null>(null)
  const [form, setForm] = useState({ name: '', description: '', unit: '', unit_price: '', maintenance_rate: '', fuel_rate: '', image_url: '' })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const formCopy = CATEGORY_FORM_COPY[activeTab]

  const fetchResources = async () => {
    if (!user) return
    setLoading(true)

    const { data, error } = await db
      .from('resources')
      .select('*')
      .eq('category', activeTab)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Fetch error:', error)
      setResources([])
    } else {
      const resourceRows = (data || []) as Resource[]
      const ownerIds = [...new Set(resourceRows.map((resource) => resource.user_id).filter(Boolean))]
      const { data: ownerProfiles } = ownerIds.length > 0
        ? await db.from('profiles').select('id, role').in('id', ownerIds)
        : { data: [] }
      const ownerRoleById = new Map((ownerProfiles || []).map((owner: { id: string; role: string | null }) => [owner.id, owner.role]))

      const filtered = resourceRows.filter((resource) =>
        isAdmin || resource.user_id === user.id || ownerRoleById.get(resource.user_id) === 'admin'
      )
      setResources(filtered)
    }

    setLoading(false)
  }

  useEffect(() => { fetchResources() }, [activeTab, isAdmin, user])

  const filtered = resources.filter((resource) => resource.name.toLowerCase().includes(search.toLowerCase()))

  const resetForm = () => {
    setShowForm(false)
    setEditItem(null)
    setForm({ name: '', description: '', unit: '', unit_price: '', maintenance_rate: '', fuel_rate: '', image_url: '' })
    setImageFile(null)
  }

  const handleImageChange = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file.')
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error('Image size must be under 3 MB.')
      return
    }
    setImageFile(file)
    setForm((currentForm) => ({ ...currentForm, image_url: URL.createObjectURL(file) }))
  }

  const uploadResourceImage = async () => {
    if (!imageFile || !user) return form.image_url || null

    const extension = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg'
    const safeName = imageFile.name.replace(/[^a-z0-9.-]/gi, '-').toLowerCase()
    const path = `${user.id}/${Date.now()}-${safeName}.${extension}`.replace(/(\.[a-z0-9]+)\.\1$/, '$1')
    const bucket = RESOURCE_IMAGE_BUCKETS[activeTab]
    const { error } = await supabase.storage.from(bucket).upload(path, imageFile, {
      cacheControl: '3600',
      upsert: false,
    })

    if (error) throw error

    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }

  const handleSave = async () => {
    if (!isAdmin) {
      toast.error('Only admins can add or edit library resources.')
      return
    }
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }

    setSaving(true)
    let imageUrl = form.image_url || null
    try {
      imageUrl = await uploadResourceImage()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown upload error'
      toast.error('Image upload failed: ' + message)
      setSaving(false)
      return
    }

    const payload = {
      user_id: user!.id,
      category: activeTab,
      name: form.name,
      description: form.description || null,
      unit: form.unit || null,
      unit_price: Number(form.unit_price) || 0,
      currency: DEFAULT_CURRENCY,
      image_url: imageUrl,
      maintenance_rate: activeTab === 'equipment' ? (Number(form.maintenance_rate) || 0) : null,
      fuel_rate: activeTab === 'equipment' ? (Number(form.fuel_rate) || 0) : null,
    }

    if (editItem) {
      const { error } = await db.from('resources').update(payload).eq('id', editItem.id)
      if (error) {
        toast.error('Update failed: ' + error.message)
      } else {
        toast.success('Resource updated')
        resetForm()
        fetchResources()
      }
    } else {
      const { error } = await db.from('resources').insert([payload])
      if (error) {
        toast.error('Save failed: ' + error.message)
      } else {
        toast.success('Resource added')
        resetForm()
        fetchResources()
      }
    }

    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!isAdmin) {
      toast.error('Only admins can delete library resources.')
      return
    }
    const { error } = await db.from('resources').delete().eq('id', id)
    if (error) {
      toast.error('Failed to delete resource: ' + error.message)
      console.error('Delete resource error:', error)
    } else {
      toast.success('Resource deleted successfully')
      fetchResources()
    }
  }

  const handleEdit = (resource: Resource) => {
    if (!isAdmin) {
      toast.error('Only admins can edit library resources.')
      return
    }
    setEditItem(resource)
    setForm({
      name: resource.name,
      description: resource.description || '',
      unit: resource.unit || '',
      unit_price: resource.unit_price.toString(),
      maintenance_rate: (resource as any).maintenance_rate?.toString() || '',
      fuel_rate: (resource as any).fuel_rate?.toString() || '',
      image_url: resource.image_url || ''
    })
    setImageFile(null)
    setShowForm(true)
  }

  const imagePreview = form.image_url

  return (
    <div className="animate-in space-y-6">
      <div className="text-sm text-surface-muted">
        {t('common.home')} {'>'} <span className="text-white font-medium">{t('resources.title')}</span>
      </div>

      <h1 className="text-2xl font-bold text-white">{t('resources.title')}</h1>

      <div className="tab-list">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSearch('') }}
            className={cn('tab-item', activeTab === tab.id && 'active')}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-semibold text-white">{t(TABS.find((tab) => tab.id === activeTab)?.labelKey || 'resources.materials')}</h2>
        {isAdmin && (
          <button
            onClick={() => { setEditItem(null); setForm({ name: '', description: '', unit: '', unit_price: '', maintenance_rate: '', fuel_rate: '', image_url: '' }); setImageFile(null); setShowForm(true) }}
            className="btn-primary btn-sm"
          >
            <Plus size={14} /> {t('resources.add')}
          </button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-surface-muted" />
        <input type="text" className="input ps-9" placeholder={t('resources.search')} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <p className="text-sm text-surface-muted">{t('resources.itemCount', { count: filtered.length })}</p>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />)}
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th className="w-24">{t('resources.image')}</th>
                <th>{t('resources.name')}</th>
                <th>{t('resources.description')}</th>
                <th>{t('resources.unit')}</th>
                <th>{formCopy.priceLabel}</th>
                {activeTab === 'equipment' && <th>Maint./day</th>}
                {activeTab === 'equipment' && <th>Fuel/day</th>}
                {isAdmin && <th>{t('resources.actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={isAdmin ? (activeTab === 'equipment' ? 8 : 6) : (activeTab === 'equipment' ? 7 : 5)} className="text-center py-8 text-surface-muted">{t('resources.noItems')}</td></tr>
              ) : filtered.map((resource) => (
                <tr key={resource.id}>
                  <td>
                    <div className="h-14 w-20 overflow-hidden rounded-lg border border-surface-border bg-surface flex items-center justify-center">
                      {resource.image_url ? (
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ url: resource.image_url!, title: resource.name })}
                          className="h-full w-full focus:outline-none focus:ring-2 focus:ring-accent"
                          title="View image"
                        >
                          <img src={resource.image_url} alt={resource.name} className="h-full w-full object-cover" />
                        </button>
                      ) : (
                        <ImageIcon size={18} className="text-surface-muted" />
                      )}
                    </div>
                  </td>
                  <td className="font-medium">{resource.name}</td>
                  <td className="text-surface-muted text-sm">{resource.description || <span className="italic opacity-50">No description</span>}</td>
                  <td>{resource.unit || '-'}</td>
                  <td>{formatCurrency(resource.unit_price, resource.currency || DEFAULT_CURRENCY)}</td>
                  {activeTab === 'equipment' && <td className="text-surface-muted">{(resource as any).maintenance_rate > 0 ? formatCurrency((resource as any).maintenance_rate, resource.currency || DEFAULT_CURRENCY) : '-'}</td>}
                  {activeTab === 'equipment' && <td className="text-surface-muted">{(resource as any).fuel_rate > 0 ? formatCurrency((resource as any).fuel_rate, resource.currency || DEFAULT_CURRENCY) : '-'}</td>}
                  {isAdmin && (
                    <td>
                        <div className="flex items-center gap-1">
                          <button onClick={() => toast.info('Duplicated!')} className="btn btn-ghost p-1" title="Duplicate"><Copy size={13} /></button>
                          <button onClick={() => handleEdit(resource)} className="btn btn-ghost p-1" title="Edit"><Pencil size={13} /></button>
                          <button onClick={() => handleDelete(resource.id)} className="btn btn-ghost p-1 hover:text-danger" title="Delete"><Trash2 size={13} /></button>
                        </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-2xl max-h-[calc(100vh-2rem)] overflow-hidden shadow-2xl animate-in">
            <div className="flex items-center justify-between p-5 border-b border-surface-border">
              <h2 className="font-semibold text-white">{editItem ? 'Edit' : 'Add'} Resource</h2>
              <button onClick={resetForm} className="btn btn-ghost p-1.5"><X size={16} /></button>
            </div>
            <div className="p-4 sm:p-5 grid gap-5 md:grid-cols-[180px_1fr] max-h-[calc(100vh-10rem)] overflow-y-auto">
              <div className="space-y-3">
                <label className="label">{formCopy.imageLabel}</label>
                <button
                  type="button"
                  onClick={() => imagePreview && setPreviewImage({ url: imagePreview, title: form.name || formCopy.namePlaceholder })}
                  className="h-36 w-full overflow-hidden rounded-xl border border-surface-border bg-surface flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-accent"
                  disabled={!imagePreview}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Resource preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="text-center text-surface-muted">
                      <ImageIcon size={28} className="mx-auto mb-2" />
                      <span className="text-xs">No image</span>
                    </div>
                  )}
                </button>
                <label className="btn-outline w-full text-sm py-2 cursor-pointer justify-center">
                  <Upload size={14} /> Upload Image
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageChange(e.target.files?.[0])} />
                </label>
                {imagePreview && (
                  <button
                    type="button"
                    className="btn btn-ghost w-full text-xs py-1.5 hover:text-danger"
                    onClick={() => { setImageFile(null); setForm((currentForm) => ({ ...currentForm, image_url: '' })) }}
                  >
                    Remove image
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="label">{formCopy.nameLabel}</label>
                  <input type="text" className="input" value={form.name} onChange={(e) => setForm((currentForm) => ({ ...currentForm, name: e.target.value }))} placeholder={formCopy.namePlaceholder} />
                </div>
                <div>
                  <label className="label">Description</label>
                  <input type="text" className="input" value={form.description} onChange={(e) => setForm((currentForm) => ({ ...currentForm, description: e.target.value }))} placeholder={formCopy.descriptionPlaceholder} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">{formCopy.unitLabel}</label>
                    <input type="text" className="input" placeholder={formCopy.unitPlaceholder} value={form.unit} onChange={(e) => setForm((currentForm) => ({ ...currentForm, unit: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">{formCopy.priceLabel} ({DEFAULT_CURRENCY})</label>
                    <input type="number" className="input" min="0" step="0.01" value={form.unit_price} onChange={(e) => setForm((currentForm) => ({ ...currentForm, unit_price: e.target.value }))} />
                  </div>
                </div>

                {/* Extra rate fields for equipment only */}
                {activeTab === 'equipment' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="label">Maintenance Rate / day ({DEFAULT_CURRENCY})</label>
                      <input
                        type="number"
                        className="input"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={form.maintenance_rate}
                        onChange={(e) => setForm((f) => ({ ...f, maintenance_rate: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="label">Fuel Rate / day ({DEFAULT_CURRENCY})</label>
                      <input
                        type="number"
                        className="input"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={form.fuel_rate}
                        onChange={(e) => setForm((f) => ({ ...f, fuel_rate: e.target.value }))}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 p-4 sm:p-5 border-t border-surface-border">
              <button onClick={() => setShowForm(false)} className="btn-outline flex-1">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving...' : (editItem ? 'Update' : 'Add Resource')}
              </button>
            </div>
          </div>
        </div>
      )}

      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" onClick={() => setPreviewImage(null)}>
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-surface-border bg-surface-card shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-surface-border p-4">
              <h2 className="font-semibold text-white">{previewImage.title}</h2>
              <button onClick={() => setPreviewImage(null)} className="btn btn-ghost p-1.5"><X size={18} /></button>
            </div>
            <div className="bg-black">
              <img src={previewImage.url} alt={previewImage.title} className="max-h-[75vh] w-full object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
