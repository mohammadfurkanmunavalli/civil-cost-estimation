import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Plus, Search, FolderOpen, MoreHorizontal, Pencil, Trash2, Share2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useProjectStore } from '@/store/projectStore'
import { formatDate } from '@/lib/utils'
import type { Project } from '@/types'
import ProjectFormModal from '@/components/projects/ProjectFormModal'
import ShareModal from '@/components/projects/ShareModal'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

export default function ProjectsPage() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const { projects, loading, fetchProjects, deleteProject } = useProjectStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Project | null>(null)
  const [shareTarget, setShareTarget] = useState<Project | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)

  useEffect(() => {
    if (user) fetchProjects(user.id)
  }, [user, fetchProjects])

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async () => {
    if (!deleteTarget) return
    await deleteProject(deleteTarget.id)
    toast.success('Project deleted')
    setDeleteTarget(null)
  }

  return (
    <div className="animate-in space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-white">{t('projects.title')}</h1>
        <button id="create-project-btn" onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={16} />
          {t('projects.createNew')}
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-surface-muted" />
        <input
          id="project-search"
          type="text"
          className="input ps-9"
          placeholder={t('projects.search')}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="max-w-4xl">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-white font-semibold">
              <FolderOpen size={18} className="text-accent" />
              {t('projects.myProjects')}
            </div>
            <span className="badge badge-blue">{filtered.length} {t('common.projects', { defaultValue: 'projects' })}</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-surface-muted">
              <FolderOpen size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">{search ? 'No projects match your search' : t('projects.noProjects')}</p>
              {!search && (
                <button onClick={() => setShowForm(true)} className="btn-outline btn-sm mt-3">
                  Create your first project
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onEdit={() => setEditTarget(project)}
                  onShare={() => setShareTarget(project)}
                  onDelete={() => setDeleteTarget(project)}
                  onClick={() => navigate(`/projects/${project.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showForm && <ProjectFormModal onClose={() => setShowForm(false)} />}
      {editTarget && <ProjectFormModal project={editTarget} onClose={() => setEditTarget(null)} />}
      {shareTarget && <ShareModal project={shareTarget} onClose={() => setShareTarget(null)} />}
      {deleteTarget && (
        <DeleteConfirmModal
          title="Delete Project"
          message={`Are you sure you want to delete "${deleteTarget.name}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

function ProjectCard({ project, onEdit, onShare, onDelete, onClick }: {
  project: Project
  onEdit: () => void
  onShare: () => void
  onDelete: () => void
  onClick: () => void
}) {
  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg border border-surface-border hover:border-accent/30 hover:bg-white/5 transition-all duration-200 cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{project.name}</p>
        <p className="text-xs text-surface-muted mt-0.5">{formatDate(project.created_at)}</p>
      </div>
      <div className="flex items-center gap-2 ms-3">
        {project.type && <span className="badge badge-blue hidden sm:inline-flex">{project.type}</span>}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              onClick={e => e.stopPropagation()}
              className="btn btn-ghost p-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal size={15} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="bg-surface-card border border-surface-border rounded-xl shadow-xl p-1 z-50 min-w-36 animate-in"
              sideOffset={4}
              align="end"
              onClick={e => e.stopPropagation()}
            >
              <DropdownMenu.Item
                className="flex items-center gap-2 px-3 py-2 text-sm text-surface-muted hover:text-white hover:bg-white/5 rounded-lg cursor-pointer outline-none transition-colors"
                onSelect={onEdit}
              >
                <Pencil size={13} /> Edit
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className="flex items-center gap-2 px-3 py-2 text-sm text-surface-muted hover:text-white hover:bg-white/5 rounded-lg cursor-pointer outline-none transition-colors"
                onSelect={onShare}
              >
                <Share2 size={13} /> Share
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 border-t border-surface-border" />
              <DropdownMenu.Item
                className="flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger/10 rounded-lg cursor-pointer outline-none transition-colors"
                onSelect={onDelete}
              >
                <Trash2 size={13} /> Delete
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </div>
  )
}
