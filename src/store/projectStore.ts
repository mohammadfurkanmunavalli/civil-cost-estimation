import { create } from 'zustand'
import { db } from '@/lib/supabase'
import { DEFAULT_CURRENCY, getCurrencyRate } from '@/lib/utils'
import type { Project, CostItem, Risk, FinancialSettings } from '@/types'

interface ProjectState {
  projects: Project[]
  sharedProjects: Project[]
  currentProject: Project | null
  costItems: CostItem[]
  risks: Risk[]
  financialSettings: FinancialSettings | null
  loading: boolean
  error: string | null

  fetchProjects: (userId: string) => Promise<void>
  fetchProject: (id: string) => Promise<void>
  createProject: (data: Partial<Project>) => Promise<Project | null>
  updateProject: (id: string, data: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>

  fetchCostItems: (projectId: string) => Promise<void>
  createCostItem: (data: Partial<CostItem>) => Promise<CostItem | null>
  updateCostItem: (id: string, data: Partial<CostItem>) => Promise<void>
  deleteCostItem: (id: string) => Promise<void>

  fetchRisks: (projectId: string) => Promise<void>
  createRisk: (data: Partial<Risk>) => Promise<Risk | null>
  updateRisk: (id: string, data: Partial<Risk>) => Promise<void>
  deleteRisk: (id: string) => Promise<void>

  fetchFinancialSettings: (projectId: string) => Promise<void>
  updateFinancialSettings: (projectId: string, data: Partial<FinancialSettings>) => Promise<void>

  setCurrentProject: (project: Project | null) => void
  setLoading: (loading: boolean) => void
}

const defaultFinancial: FinancialSettings = {
  id: '',
  project_id: '',
  overhead_pct: 10,
  contingency_pct: 5,
  markup_pct: 15,
  tax_pct: 5,
  currency: DEFAULT_CURRENCY,
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  sharedProjects: [],
  currentProject: null,
  costItems: [],
  risks: [],
  financialSettings: null,
  loading: false,
  error: null,

  setCurrentProject: (project) => set({ currentProject: project }),
  setLoading: (loading) => set({ loading }),

  // ─── Projects ────────────────────────────────────────────────────────────────

  fetchProjects: async (userId: string) => {
    set({ loading: true })
    const { data, error } = await db
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
    if (!error && data) set({ projects: data as Project[] })
    set({ loading: false })
  },

  fetchProject: async (id: string) => {
    set({ loading: true })
    const { data, error } = await db
      .from('projects')
      .select('*')
      .eq('id', id)
      .single()
    if (!error && data) set({ currentProject: data as Project, risks: [] })
    set({ loading: false })
  },

  createProject: async (data: Partial<Project>) => {
    const { data: result, error } = await db
      .from('projects')
      .insert([data])
      .select()
      .single()
    if (!error && result) {
      set(state => ({ projects: [result as Project, ...state.projects] }))
      return result as Project
    }
    return null
  },

  updateProject: async (id: string, data: Partial<Project>) => {
    const { data: result, error } = await db
      .from('projects')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (!error && result) {
      set(state => ({
        projects: state.projects.map(p => p.id === id ? result as Project : p),
        currentProject: state.currentProject?.id === id ? result as Project : state.currentProject,
      }))
    }
  },

  deleteProject: async (id: string) => {
    const { error } = await db.from('projects').delete().eq('id', id)
    if (!error) set(state => ({ projects: state.projects.filter(p => p.id !== id) }))
  },

  // ─── Cost Items ──────────────────────────────────────────────────────────────

  fetchCostItems: async (projectId: string) => {
    const { data, error } = await db
      .from('cost_items')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
    if (!error && data) set({ costItems: data as CostItem[] })
  },

  createCostItem: async (data: Partial<CostItem>) => {
    const { data: result, error } = await db
      .from('cost_items')
      .insert([data])
      .select()
      .single()
    if (!error && result) {
      set(state => ({ costItems: [...state.costItems, result as CostItem] }))
      return result as CostItem
    }
    return null
  },

  updateCostItem: async (id: string, data: Partial<CostItem>) => {
    const { data: result, error } = await db
      .from('cost_items')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (!error && result) {
      set(state => ({
        costItems: state.costItems.map(item => item.id === id ? result as CostItem : item)
      }))
    }
  },

  deleteCostItem: async (id: string) => {
    const { error } = await db.from('cost_items').delete().eq('id', id)
    if (!error) set(state => ({ costItems: state.costItems.filter(item => item.id !== id) }))
  },

  // ─── Risks ───────────────────────────────────────────────────────────────────

  fetchRisks: async (projectId: string) => {
    const { data, error } = await db
      .from('risks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
    if (!error && data) set({ risks: data as Risk[] })
  },

  createRisk: async (data: Partial<Risk>) => {
    const { data: result, error } = await db
      .from('risks')
      .insert([data])
      .select()
      .single()
    if (!error && result) {
      set(state => ({ risks: [...state.risks, result as Risk] }))
      return result as Risk
    }
    return null
  },

  updateRisk: async (id: string, data: Partial<Risk>) => {
    const { data: result, error } = await db
      .from('risks')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (!error && result) {
      set(state => ({ risks: state.risks.map(r => r.id === id ? result as Risk : r) }))
    }
  },

  deleteRisk: async (id: string) => {
    const { error } = await db.from('risks').delete().eq('id', id)
    if (!error) set(state => ({ risks: state.risks.filter(r => r.id !== id) }))
  },

  // ─── Financial Settings ──────────────────────────────────────────────────────

  fetchFinancialSettings: async (projectId: string) => {
    const { data, error } = await db
      .from('financial_settings')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle()
    if (!error && data) {
      set({ financialSettings: data as FinancialSettings })
    } else {
      set({ financialSettings: { ...defaultFinancial, project_id: projectId } })
    }
  },

  updateFinancialSettings: async (projectId: string, data: Partial<FinancialSettings>) => {
    const currentSettings = get().financialSettings
    const previousCurrency = currentSettings?.currency || defaultFinancial.currency
    const nextCurrency = data.currency || previousCurrency
    const shouldConvertValues = previousCurrency !== nextCurrency
    const rate = shouldConvertValues ? (await getCurrencyRate(previousCurrency, nextCurrency)).rate : 1
    const convertAmount = (value: number | null | undefined) =>
      value == null ? null : value * rate

    if (shouldConvertValues) {
      const { data: storedItems } = await db.from('cost_items').select('*').eq('project_id', projectId)
      await Promise.all(((storedItems || []) as CostItem[]).map((item) =>
        db.from('cost_items').update({
          unit_price: convertAmount(item.unit_price),
          daily_rate: convertAmount(item.daily_rate),
          rental_cost: convertAmount(item.rental_cost),
          maintenance: convertAmount(item.maintenance),
          fuel: convertAmount(item.fuel),
        }).eq('id', item.id)
      ))

      const { data: storedRisks } = await db.from('risks').select('*').eq('project_id', projectId)
      await Promise.all(((storedRisks || []) as Risk[]).map((risk) =>
        db.from('risks').update({ impact: (risk.impact || 0) * rate }).eq('id', risk.id)
      ))
    }

    const payload = { ...currentSettings, ...data, project_id: projectId }
    if (!payload.id) delete payload.id // Remove empty id so DB natively handles it
    
    const { data: result, error } = await db
      .from('financial_settings')
      .upsert(payload, { onConflict: 'project_id' })
      .select()
      .single()

    if (error) {
      console.error("Failed to save financial settings:", error)
    } else if (result) {
      set((state) => ({
        financialSettings: result as FinancialSettings,
        costItems: shouldConvertValues
          ? state.costItems.map((item) => ({
              ...item,
              unit_price: convertAmount(item.unit_price),
              daily_rate: convertAmount(item.daily_rate),
              rental_cost: convertAmount(item.rental_cost),
              maintenance: convertAmount(item.maintenance),
              fuel: convertAmount(item.fuel),
            }))
          : state.costItems,
        risks: shouldConvertValues
          ? state.risks.map((risk) => ({ ...risk, impact: (risk.impact || 0) * rate }))
          : state.risks,
      }))
    }
  },
}))
