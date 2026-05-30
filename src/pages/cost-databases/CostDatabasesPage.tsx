import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { db } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Plus, Search, Pencil, Trash2, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { useSystemStore } from '@/store/systemStore'

interface CostDatabaseItem {
  id: string
  user_id: string
  name: string
  description: string | null
  currency: string
  is_public: boolean
  created_at: string
}

export default function CostDatabasesPage() {
  const { t } = useTranslation()
  const { user, profile } = useAuthStore()
  const isAdmin = profile?.role === 'admin'
  const { currencies } = useSystemStore()
  const [databases, setDatabases] = useState<CostDatabaseItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', currency: 'USD', is_public: false })
  const [saving, setSaving] = useState(false)

  const fetchDatabases = async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await db
      .from('cost_databases')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Cost databases fetch error:', error)
      setDatabases([])
      setLoading(false)
      return
    }

    const databaseRows = (data || []) as CostDatabaseItem[]
    const ownerIds = [...new Set(databaseRows.map((database) => database.user_id).filter(Boolean))]
    const { data: ownerProfiles } = ownerIds.length > 0
      ? await db.from('profiles').select('id, role').in('id', ownerIds)
      : { data: [] }
    const ownerRoleById = new Map((ownerProfiles || []).map((owner: { id: string; role: string | null }) => [owner.id, owner.role]))

    // If admin: see all. If user: see own + admins.
    const filtered = databaseRows.filter((database) =>
      isAdmin || database.user_id === user.id || ownerRoleById.get(database.user_id) === 'admin'
    )

    setDatabases(filtered)
    setLoading(false)
  }

  useEffect(() => { fetchDatabases() }, [user, isAdmin])

  const filtered = databases.filter(d => d.name.toLowerCase().includes(search.toLowerCase()))

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    await db.from('cost_databases').insert([{ ...form, user_id: user!.id }])
    toast.success('Cost database created')
    setSaving(false)
    setShowForm(false)
    setForm({ name: '', description: '', currency: 'USD', is_public: false })
    fetchDatabases()
  }

  const handleDelete = async (id: string) => {
    await db.from('cost_databases').delete().eq('id', id)
    toast.success('Database deleted')
    fetchDatabases()
  }

  return (
    <div className="animate-in space-y-6">
      <div className="text-sm text-surface-muted">
        {t('common.home')} › <span className="text-white font-medium">{t('costDatabases.title')}</span>
      </div>

      <h1 className="text-2xl font-bold text-white">{t('costDatabases.title')}</h1>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-surface-muted" />
          <input type="text" className="input ps-9" placeholder="Search databases..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(true)} className="btn-primary btn-sm">
            <Plus size={14} /> {t('costDatabases.add')}
          </button>
        )}
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th><input type="checkbox" className="accent-accent" /></th>
              <th>{t('costDatabases.name')}</th>
              <th>{t('costDatabases.description')}</th>
              <th>{t('costDatabases.currency')}</th>
              <th>{t('costDatabases.public')}</th>
              <th>{t('costDatabases.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8">
                <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-surface-muted">
                No cost databases found. Create your first one.
              </td></tr>
            ) : filtered.map(db_item => (
              <tr key={db_item.id}>
                <td><input type="checkbox" className="accent-accent" /></td>
                <td className="font-medium">{db_item.name}</td>
                <td className="text-surface-muted text-xs max-w-60 truncate">{db_item.description || '—'}</td>
                <td>{db_item.currency}</td>
                <td>
                  <input type="checkbox" checked={db_item.is_public} readOnly className="accent-accent" />
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <button className="btn btn-ghost p-1 gap-1 text-xs">
                      <Eye size={12} /> {t('costDatabases.view')}
                    </button>
                    {isAdmin && (
                      <>
                        <button className="btn btn-ghost p-1"><Pencil size={12} /></button>
                        <button onClick={() => handleDelete(db_item.id)} className="btn btn-ghost p-1 hover:text-danger">
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-md shadow-2xl animate-in">
            <div className="flex items-center justify-between p-5 border-b border-surface-border">
              <h2 className="font-semibold text-white">Create Cost Database</h2>
              <button onClick={() => setShowForm(false)} className="btn btn-ghost p-1.5">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Name *</label>
                <input type="text" className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Default Cost Database" />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input resize-none" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="label">Currency</label>
                <select className="input" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                  {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.is_public} onChange={e => setForm(f => ({ ...f, is_public: e.target.checked }))} className="accent-accent w-4 h-4" />
                <span className="text-sm text-white">Make Public</span>
              </label>
            </div>
            <div className="flex gap-3 p-5 border-t border-surface-border">
              <button onClick={() => setShowForm(false)} className="btn-outline flex-1">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
