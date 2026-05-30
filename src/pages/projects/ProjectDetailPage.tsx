import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Pencil, Share2, Trash2 } from 'lucide-react'
import { useProjectStore } from '@/store/projectStore'
import { useAuthStore } from '@/store/authStore'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Project tabs
import OverviewTab from './tabs/OverviewTab'
import CostsTab from './tabs/CostsTab'
import ScenarioTab from './tabs/ScenarioTab'
import PricingTab from './tabs/PricingTab'
import AnalyticsProjectTab from './tabs/AnalyticsProjectTab'
import ReportsTab from './tabs/ReportsTab'
import VersionsTab from './tabs/VersionsTab'
import ProjectFormModal from '@/components/projects/ProjectFormModal'
import ShareModal from '@/components/projects/ShareModal'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'
import type { TabId } from '@/types'

export default function ProjectDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const {
    currentProject, loading,
    fetchProject, fetchCostItems, fetchFinancialSettings,
    deleteProject
  } = useProjectStore()

  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [showEdit, setShowEdit] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  useEffect(() => {
    if (id) {
      fetchProject(id)
      fetchCostItems(id)
      fetchFinancialSettings(id)
    }
  }, [id, fetchProject, fetchCostItems, fetchFinancialSettings])

  const handleDelete = async () => {
    if (!id) return
    await deleteProject(id)
    toast.success('Project deleted')
    navigate('/projects')
  }

  if (loading && !currentProject) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!currentProject) {
    return (
      <div className="text-center py-20 text-surface-muted">
        <p>Project not found.</p>
        <Link to="/projects" className="text-accent text-sm hover:underline mt-2 inline-block">
          ← Back to Projects
        </Link>
      </div>
    )
  }

  const tabLabels: Record<TabId, string> = {
    overview: t('projects.tabs.overview'),
    costs: t('projects.tabs.costs'),
    scenario: t('projects.tabs.scenario'),
    pricing: t('projects.tabs.pricing'),
    analytics: t('projects.tabs.analytics'),
    reports: t('projects.tabs.reports'),
    versions: t('projects.tabs.versions'),
  }

  return (
    <div className="animate-in space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-surface-muted">
        <Link to="/projects" className="hover:text-white transition-colors flex items-center gap-1">
          <ArrowLeft size={14} />
          {t('projects.title')}
        </Link>
        <span>›</span>
        <span className="text-white font-medium truncate max-w-xs">{currentProject.name}</span>
      </div>

      {/* Project header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">{currentProject.name}</h1>
          {currentProject.type && (
            <span className="badge badge-blue mt-2">{currentProject.type}</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button id="project-edit-btn" onClick={() => setShowEdit(true)} className="btn-outline btn-sm gap-1.5">
            <Pencil size={14} /> {t('projects.edit')}
          </button>
          <button id="project-share-btn" onClick={() => setShowShare(true)} className="btn-outline btn-sm gap-1.5">
            <Share2 size={14} /> {t('projects.share')}
          </button>
          <button id="project-delete-btn" onClick={() => setShowDelete(true)} className="btn-danger btn-sm gap-1.5">
            <Trash2 size={14} /> {t('projects.delete')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-list">
        {(Object.keys(tabLabels) as TabId[]).map(tab => (
          <button
            key={tab}
            id={`tab-${tab}`}
            onClick={() => setActiveTab(tab)}
            className={cn('tab-item', activeTab === tab && 'active')}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="animate-in">
        {activeTab === 'overview' && <OverviewTab project={currentProject} />}
        {activeTab === 'costs' && <CostsTab projectId={currentProject.id} />}
        {activeTab === 'scenario' && <ScenarioTab projectId={currentProject.id} />}
        {activeTab === 'pricing' && <PricingTab projectId={currentProject.id} />}
        {activeTab === 'analytics' && <AnalyticsProjectTab projectId={currentProject.id} />}
        {activeTab === 'reports' && <ReportsTab project={currentProject} />}
        {activeTab === 'versions' && <VersionsTab projectId={currentProject.id} />}
      </div>

      {/* Modals */}
      {showEdit && <ProjectFormModal project={currentProject} onClose={() => setShowEdit(false)} />}
      {showShare && <ShareModal project={currentProject} onClose={() => setShowShare(false)} />}
      {showDelete && (
        <DeleteConfirmModal
          title="Delete Project"
          message={`Delete "${currentProject.name}"? This will permanently remove all cost items and project data.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </div>
  )
}
