import { create } from 'zustand'
import { db } from '@/lib/supabase'
import i18next from 'i18next'

interface AppSettingRow {
  key: string
  value: string | null
}

interface SystemState {
  projectTypes: string[]
  sizeUnits: string[]
  durationUnits: string[]
  costCategories: string[]
  currencies: string[]
  globalCurrency: string
  globalLanguage: string
  loading: boolean
  
  fetchDictionaries: () => Promise<void>
  updateDictionary: (key: string, values: string[]) => Promise<void>
  updateGlobalSettings: (key: 'default_currency' | 'default_language', value: string) => Promise<void>
}

const DEFAULT_DEFS = {
  projectTypes: ['Residential', 'Commercial', 'Industrial', 'Infrastructure', 'Renovation', 'Landscaping', 'Institutional', 'Mixed-Use'],
  sizeUnits: ['Square Meters', 'Square Feet', 'Hectares', 'Acres'],
  durationUnits: ['Days', 'Weeks', 'Months', 'Years'],
  costCategories: ['materials', 'labor', 'equipment', 'additional'],
  currencies: ['INR', 'USD', 'EUR', 'GBP', 'SAR', 'AED', 'EGP', 'YER', 'KWD', 'QAR'],
  globalCurrency: localStorage.getItem('global_currency') || 'INR',
  globalLanguage: localStorage.getItem('global_language') || 'en'
}

export const useSystemStore = create<SystemState>((set) => ({
  ...DEFAULT_DEFS,
  loading: true,

  fetchDictionaries: async () => {
    try {
      // Fetch all app_settings in one query (dicts + global scalar settings)
      const { data, error } = await db.from('app_settings').select('key, value')
      if (error) throw error
      
      const loaded: Partial<SystemState> = {}
      data?.forEach((row: AppSettingRow) => {
        if (row.key === 'default_currency') loaded.globalCurrency = row.value || 'INR'
        if (row.key === 'default_language') {
          loaded.globalLanguage = row.value || 'en'
          localStorage.setItem('global_language', row.value || 'en')
          i18next.changeLanguage(row.value || 'en')
        }
        if (row.key === 'default_currency' && row.value) {
          localStorage.setItem('global_currency', row.value)
        }
        if (row.key.startsWith('dict_')) {
          try {
            const parsed = JSON.parse(row.value || '[]')
            if (row.key === 'dict_project_types') loaded.projectTypes = parsed
            if (row.key === 'dict_size_units') loaded.sizeUnits = parsed
            if (row.key === 'dict_duration_units') loaded.durationUnits = parsed
            if (row.key === 'dict_cost_categories') loaded.costCategories = parsed
            if (row.key === 'dict_currencies') loaded.currencies = parsed
          } catch {
            console.warn('Failed parsing dictionary array for: ', row.key)
          }
        }
      })
      
      set({ ...loaded, loading: false })
    } catch(err) {
      console.error('Failed fetching dicts, falling back to defaults.', err)
      set({ loading: false })
    }
  },

  updateDictionary: async (key: string, values: string[]) => {
    const rawKey = `dict_${key.replace(/([A-Z])/g, "_$1").toLowerCase()}`
    
    // Optimistic frontend commit
    set({ [key]: values } as any)

    // Upsert backend permanently
    await db.from('app_settings').upsert({
      key: rawKey,
      value: JSON.stringify(values)
    }, { onConflict: 'key' })
  },

  updateGlobalSettings: async (key: 'default_currency' | 'default_language', value: string) => {
    const stateKey = key === 'default_currency' ? 'globalCurrency' : 'globalLanguage'
    // Persist to localStorage so it survives page reloads
    const localKey = key === 'default_currency' ? 'global_currency' : 'global_language'
    localStorage.setItem(localKey, value)
    set({ [stateKey]: value })

    if (key === 'default_language') {
      await i18next.changeLanguage(value)
    }

    await db.from('app_settings').upsert({
      key,
      value
    }, { onConflict: 'key' })
  }
}))
