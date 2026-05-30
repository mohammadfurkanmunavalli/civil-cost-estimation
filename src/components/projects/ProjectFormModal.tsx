import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { useProjectStore } from '@/store/projectStore'
import { useAuthStore } from '@/store/authStore'
import { useSystemStore } from '@/store/systemStore'
import { toast } from 'sonner'
import type { Project } from '@/types'

interface Props {
  project?: Project
  onClose: () => void
}

export default function ProjectFormModal({ project, onClose }: Props) {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const { projectTypes, sizeUnits, durationUnits } = useSystemStore()
  const { createProject, updateProject } = useProjectStore()
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    name: project?.name || '',
    type: project?.type || projectTypes[0] || '',
    size: project?.size?.toString() || '',
    size_unit: project?.size_unit || 'Square Meters',
    location: project?.location || '',
    duration: project?.duration?.toString() || '',
    duration_unit: project?.duration_unit || 'Months',
    client_requirements: project?.client_requirements || '',
    description: project?.description || '',
    status: project?.status || 'active',
  })

  useEffect(() => {
    if (!form.type && projectTypes.length > 0) {
      setForm(f => ({ ...f, type: projectTypes[0] }))
    }
  }, [projectTypes, form.type])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Project name is required'); return }
    setLoading(true)

    const data = {
      ...form,
      type: form.type || projectTypes[0] || '',
      size: form.size ? Number(form.size) : null,
      duration: form.duration ? Number(form.duration) : null,
      user_id: user!.id,
      status: form.status as Project['status'],
    }

    if (project) {
      await updateProject(project.id, data)
      toast.success('Project updated!')
    } else {
      const result = await createProject(data)
      if (result) toast.success('Project created!')
    }
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-2xl max-h-[calc(100vh-2rem)] shadow-2xl animate-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-surface-border">
          <h2 className="text-lg font-semibold text-white">
            {project ? t('projects.form.update') : t('projects.form.create')}
          </h2>
          <button onClick={onClose} className="btn btn-ghost p-1.5">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[calc(100vh-11rem)] overflow-y-auto">
          {/* Name */}
          <div className="sm:col-span-2">
            <label className="label">{t('projects.form.name')} <span className="text-danger">*</span></label>
            <input
              id="project-name-input"
              type="text"
              className="input"
              placeholder="e.g. Sana'a Residential Tower"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
            />
          </div>

          {/* Type */}
          <div>
            <label className="label">{t('projects.form.type')}</label>
            <select className="input" value={form.type || projectTypes[0] || ''} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              {projectTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="label">{t('projects.form.location')}</label>
            <input type="text" className="input" placeholder="City, Country" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
          </div>

          {/* Size + unit */}
          <div>
            <label className="label">{t('projects.form.size')}</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input type="number" className="input" placeholder="e.g. 3000" value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))} />
              <select className="input sm:w-40" value={form.size_unit} onChange={e => setForm(f => ({ ...f, size_unit: e.target.value }))}>
                {sizeUnits.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Duration + unit */}
          <div>
            <label className="label">{t('projects.form.duration')}</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input type="number" className="input" placeholder="e.g. 12" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} />
              <select className="input sm:w-36" value={form.duration_unit} onChange={e => setForm(f => ({ ...f, duration_unit: e.target.value }))}>
                {durationUnits.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Client requirements */}
          <div className="sm:col-span-2">
            <label className="label">{t('projects.form.clientRequirements')}</label>
            <textarea className="input min-h-20 resize-y" placeholder="Describe client needs..." value={form.client_requirements} onChange={e => setForm(f => ({ ...f, client_requirements: e.target.value }))} />
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <label className="label">{t('projects.form.description')}</label>
            <textarea className="input min-h-24 resize-y" placeholder="Project description..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
        </form>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 p-4 sm:p-6 border-t border-surface-border">
          <button onClick={onClose} className="btn-outline">{t('projects.form.cancel')}</button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="btn-primary"
            id="project-form-submit"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
            {project ? t('projects.form.update') : t('projects.form.create')}
          </button>
        </div>
      </div>
    </div>
  )
}
