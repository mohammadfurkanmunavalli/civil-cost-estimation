import { useEffect, useState } from 'react'
import { Clock, Save, RotateCcw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { db } from '@/lib/supabase'
import { useProjectStore } from '@/store/projectStore'
import type { ProjectVersion } from '@/types'

interface Props { projectId: string }

export default function VersionsTab({ projectId }: Props) {
  const [versions, setVersions] = useState<ProjectVersion[]>([])
  const [loading, setLoading] = useState(true)
  const { costItems, risks, financialSettings, fetchCostItems, fetchRisks, fetchFinancialSettings } = useProjectStore()

  const fetchVersions = async () => {
    setLoading(true)
    const { data } = await db
      .from('project_versions')
      .select('*')
      .eq('project_id', projectId)
      .order('version_number', { ascending: false })
    
    if (data) setVersions(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchVersions()
  }, [projectId])

  const handleSaveVersion = async () => {
    try {
      const nextVersion = versions.length > 0 ? versions[0].version_number + 1 : 1
      
      const snapshot = {
        costItems,
        risks,
        financialSettings
      }

      const { error } = await db.from('project_versions').insert([{
        project_id: projectId,
        version_number: nextVersion,
        snapshot_data: snapshot
      }])

      if (error) throw error
      
      toast.success(`Version ${nextVersion} saved successfully!`)
      fetchVersions()
    } catch (error) {
      toast.error('Failed to save version')
      console.error(error)
    }
  }

  const handleRestore = async (version: ProjectVersion) => {
    if (!window.confirm(`Are you absolutely sure you want to restore Version ${version.version_number}? This will permanently overwrite your current active costs and risks.`)) return

    try {
      toast.loading('Restoring baseline...', { id: 'restore' })
      
      const snap = version.snapshot_data as any

      // 1. Delete all current items
      await Promise.all([
        db.from('cost_items').delete().eq('project_id', projectId),
        db.from('risks').delete().eq('project_id', projectId)
      ])

      // 2. Insert snapshot items (stripping old IDs so postgres mints new ones to avoid conflicts)
      const cleanCostItems = (snap.costItems || []).map((i: any) => {
        const { id, created_at, ...rest } = i
        return { ...rest, project_id: projectId } // ensure bound to correct project
      })
      
      const cleanRisks = (snap.risks || []).map((i: any) => {
        const { id, created_at, ...rest } = i
        return { ...rest, project_id: projectId }
      })

      if (cleanCostItems.length > 0) await db.from('cost_items').insert(cleanCostItems)
      if (cleanRisks.length > 0) await db.from('risks').insert(cleanRisks)

      // 3. Upsert financial settings. Need to be careful here: delete id
      if (snap.financialSettings) {
        const { id, ...rest } = snap.financialSettings
        await db.from('financial_settings').upsert({ ...rest, project_id: projectId }, { onConflict: 'project_id' })
      }

      // 4. Refetch UI buffers globally
      await Promise.all([
        fetchCostItems(projectId),
        fetchRisks(projectId),
        fetchFinancialSettings(projectId)
      ])

      toast.success(`Successfully restored Version ${version.version_number}!`, { id: 'restore' })
    } catch (error) {
      toast.error('Failed to restore version', { id: 'restore' })
      console.error(error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this version permanentely?')) return
    await db.from('project_versions').delete().eq('id', id)
    fetchVersions()
    toast.success('Version deleted')
  }

  return (
    <div className="card space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border-b border-surface-border pb-4">
        <div className="flex items-center gap-2">
          <Clock size={20} className="text-accent" />
          <h2 className="text-lg font-semibold text-white">Version History</h2>
        </div>
        <button onClick={handleSaveVersion} className="btn-primary btn-sm gap-2">
          <Save size={14} /> Save Current Version
        </button>
      </div>
      
      {loading ? (
        <div className="text-center py-6 text-surface-muted animate-pulse">Loading versions...</div>
      ) : versions.length === 0 ? (
        <div className="text-center py-12 text-surface-muted border-2 border-dashed border-surface-border rounded-xl">
          <Clock size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No versions saved yet.</p>
          <p className="text-xs mt-1">Version snapshots will appear here when saved.</p>
        </div>
      ) : (
        <div className="space-y-3 mt-4">
          {versions.map((ver) => (
            <div key={ver.id} className="p-4 bg-surface rounded-lg border border-surface-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-accent/40 transition-colors">
              <div>
                <h3 className="font-semibold text-white">Version {ver.version_number}</h3>
                <p className="text-xs text-surface-muted mt-1">{new Date(ver.created_at).toLocaleString()}</p>
                <div className="text-xs text-surface-muted mt-2 flex gap-3 font-mono">
                   <span className="bg-white/5 px-2 py-1 rounded">{((ver.snapshot_data as any)?.costItems?.length) || 0} Cost Items</span>
                   <span className="bg-white/5 px-2 py-1 rounded">{((ver.snapshot_data as any)?.risks?.length) || 0} Risks</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button 
                  onClick={() => handleRestore(ver)}
                  className="flex-1 sm:flex-none btn-outline btn-sm gap-1.5 text-orange-400 border-orange-500/30 hover:bg-orange-500/10"
                >
                  <RotateCcw size={14} /> Restore
                </button>
                <button 
                  onClick={() => handleDelete(ver.id)}
                  className="btn-outline btn-sm px-3 text-danger hover:bg-danger/10 border-danger/20"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
