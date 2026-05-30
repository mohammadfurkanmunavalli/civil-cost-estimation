import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ReactECharts from 'echarts-for-react'
import { useAuthStore } from '@/store/authStore'
import { useProjectStore } from '@/store/projectStore'
import { useSystemStore } from '@/store/systemStore'
import { db } from '@/lib/supabase'
import { convertCurrency, formatCurrency } from '@/lib/utils'
import { calculateCostSummary } from '@/lib/calculations'
import type { CostItem, FinancialSettings, Risk } from '@/types'
import { TrendingUp } from 'lucide-react'

export default function AnalyticsPage() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const { projects, fetchProjects } = useProjectStore()
  const { currencies, globalCurrency } = useSystemStore()
  const [selectedProject, setSelectedProject] = useState('all')
  const [selectedCurrency, setSelectedCurrency] = useState(globalCurrency)
  const [projectData, setProjectData] = useState<Record<string, { items: CostItem[], risks: Risk[], settings: FinancialSettings | null }>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) fetchProjects(user.id)
  }, [user, fetchProjects])

  // Sync selectedCurrency if globalCurrency changes (e.g. admin updates it)
  useEffect(() => {
    setSelectedCurrency(prev => {
      // Only override if the user hasn't manually picked something from the dropdown
      // We track this by checking if prev was the old globalCurrency
      return globalCurrency
    })
  }, [globalCurrency])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const data: typeof projectData = {}

      for (const proj of projects) {
        const [itemsRes, risksRes, settingsRes] = await Promise.all([
          db.from('cost_items').select('*').eq('project_id', proj.id),
          db.from('risks').select('*').eq('project_id', proj.id),
          db.from('financial_settings').select('*').eq('project_id', proj.id).maybeSingle(),
        ])
        data[proj.id] = {
          items: (itemsRes.data || []) as CostItem[],
          risks: (risksRes.data || []) as Risk[],
          settings: settingsRes.data ? (settingsRes.data as unknown as FinancialSettings) : null,
        }
      }
      setProjectData(data)

      // Use per-project currency if found, otherwise use globalCurrency from admin settings
      const foundCurrency = Object.values(data).find(d => d.settings?.currency)?.settings?.currency
      if (foundCurrency) setSelectedCurrency(foundCurrency)
      else setSelectedCurrency(globalCurrency)

      setLoading(false)
    }

    if (projects.length > 0) fetchData()
    else setLoading(false)
  }, [projects])

  const defaultSettings: FinancialSettings = {
    id: '', project_id: '', overhead_pct: 10, contingency_pct: 5, markup_pct: 15, tax_pct: 5, currency: globalCurrency
  }

  const getSummary = (projectId: string) => {
    const d = projectData[projectId]
    if (!d) return null
    return calculateCostSummary(d.items, d.settings || defaultSettings, d.risks)
  }

  const getProjectCurrency = (projectId: string) => projectData[projectId]?.settings?.currency || globalCurrency
  const convertProjectAmount = (projectId: string, amount: number) =>
    convertCurrency(amount, getProjectCurrency(projectId), selectedCurrency)

  const relevantProjects = selectedProject === 'all' ? projects : projects.filter(p => p.id === selectedProject)

  const totalCost = relevantProjects.reduce((acc, p) => {
    const s = getSummary(p.id)
    return acc + (s ? convertProjectAmount(p.id, s.grandTotal) : 0)
  }, 0)

  const aggregatePie = relevantProjects.reduce(
    (acc, p) => {
      const s = getSummary(p.id)
      if (s) {
        acc.materials += convertProjectAmount(p.id, s.materialsCost)
        acc.labor += convertProjectAmount(p.id, s.laborCost)
        acc.equipment += convertProjectAmount(p.id, s.equipmentCost)
        acc.additional += convertProjectAmount(p.id, s.additionalCost)
      }
      return acc
    },
    { materials: 0, labor: 0, equipment: 0, additional: 0 }
  )

  let currencySymbol = '$'
  try {
    currencySymbol = new Intl.NumberFormat('en-US', { style: 'currency', currency: selectedCurrency }).formatToParts(0).find(p => p.type === 'currency')?.value || '$'
  } catch {
    currencySymbol = selectedCurrency
  }

  const pieOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', formatter: (p: { name: string; value: number; percent: number }) => `${p.name}: ${formatCurrency(p.value, selectedCurrency)} (${p.percent}%)` },
    legend: { bottom: 0, textStyle: { color: '#94a3b8' } },
    series: [{
      name: 'Cost Distribution',
      type: 'pie',
      radius: ['40%', '65%'],
      center: ['50%', '45%'],
      data: [
        { value: aggregatePie.materials, name: 'Materials' },
        { value: aggregatePie.labor, name: 'Labor' },
        { value: aggregatePie.equipment, name: 'Equipment' },
        { value: aggregatePie.additional, name: 'Additional Costs' },
      ].filter(d => d.value > 0),
      label: { show: true, color: '#94a3b8', fontSize: 11 },
    }],
    color: ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6'],
  }

  const barOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '20%', containLabel: true },
    xAxis: {
      type: 'category',
      data: relevantProjects.map(p => p.name.length > 15 ? p.name.slice(0, 15) + '...' : p.name),
      axisLabel: { color: '#94a3b8', rotate: 30, fontSize: 10 }
    },
    yAxis: { type: 'value', axisLabel: { color: '#94a3b8', formatter: (v: number) => `${currencySymbol}${(v/1000).toFixed(0)}K` } },
    series: [{
      type: 'bar',
      data: relevantProjects.map(p => {
        const summary = getSummary(p.id)
        return summary ? convertProjectAmount(p.id, summary.grandTotal) : 0
      }),
      itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] },
    }],
  }

  return (
    <div className="animate-in space-y-6">
      <div className="text-sm text-surface-muted">
        {t('common.home')} <span className="mx-1">›</span>
        <span className="text-white font-medium">{t('analytics.title')}</span>
      </div>

      <h1 className="text-2xl font-bold text-white">{t('analytics.title')}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
        <div>
          <label className="label">{t('analytics.selectProject')}</label>
          <select className="input" value={selectedProject} onChange={e => setSelectedProject(e.target.value)}>
            <option value="all">{t('analytics.allProjects')}</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">{t('analytics.selectCurrency')}</label>
            <select className="input py-1 text-sm bg-surface border-surface-border text-white rounded" value={selectedCurrency} onChange={e => setSelectedCurrency(e.target.value)}>
              {currencies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="stat-label">{t('analytics.totalCost')}</p>
          <p className="text-3xl font-bold text-white">{formatCurrency(totalCost, selectedCurrency)}</p>
          <p className="stat-sub">{t('analytics.acrossProjects', { count: relevantProjects.length })}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Projects</p>
          <p className="text-3xl font-bold text-white">{relevantProjects.length}</p>
          <p className="stat-sub">Total projects analyzed</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Avg. Project Cost</p>
          <p className="text-3xl font-bold text-white">
            {formatCurrency(relevantProjects.length > 0 ? totalCost / relevantProjects.length : 0, selectedCurrency)}
          </p>
          <p className="stat-sub">Per project average</p>
        </div>
      </div>

      {/* Charts */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : totalCost === 0 ? (
        <div className="card text-center py-16 text-surface-muted">
          <TrendingUp size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No cost data available. Add cost items to your projects.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold text-white mb-4">{t('analytics.costDistribution')}</h3>
            <ReactECharts option={pieOption} style={{ height: 320 }} theme="dark" />
          </div>
          {relevantProjects.length > 1 && (
            <div className="card">
              <h3 className="font-semibold text-white mb-4">{t('analytics.costByProject')}</h3>
              <ReactECharts option={barOption} style={{ height: 320 }} theme="dark" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
