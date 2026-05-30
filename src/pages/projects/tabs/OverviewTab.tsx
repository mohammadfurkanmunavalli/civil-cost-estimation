import { useTranslation } from 'react-i18next'
import type { Project } from '@/types'

interface Props { project: Project }

export default function OverviewTab({ project }: Props) {
  const { t } = useTranslation()

  const fields = [
    { label: t('projects.overview.projectType'), value: project.type },
    { label: t('projects.overview.projectSize'), value: project.size ? `${project.size} ${project.size_unit || ''}` : null },
    { label: t('projects.overview.location'), value: project.location },
    { label: t('projects.overview.duration'), value: project.duration ? `${project.duration} ${project.duration_unit || ''}` : null },
  ]

  return (
    <div className="card space-y-6">
      <h2 className="text-lg font-semibold text-white">Project Overview</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {fields.map(({ label, value }) => (
          <div key={label}>
            <p className="text-xs font-semibold text-surface-muted uppercase tracking-wider mb-1">{label}</p>
            <p className="text-white text-sm">{value || <span className="text-surface-muted italic">Not specified</span>}</p>
          </div>
        ))}
      </div>

      {project.client_requirements && (
        <div>
          <p className="text-xs font-semibold text-surface-muted uppercase tracking-wider mb-2">{t('projects.overview.clientRequirements')}</p>
          <p className="text-white/80 text-sm leading-relaxed">{project.client_requirements}</p>
        </div>
      )}

      {project.description && (
        <div>
          <p className="text-xs font-semibold text-surface-muted uppercase tracking-wider mb-2">{t('projects.overview.description')}</p>
          <p className="text-white/80 text-sm leading-relaxed">{project.description}</p>
        </div>
      )}
    </div>
  )
}
