// TypeScript interfaces for the entire application

export interface Profile {
  id: string
  full_name: string | null
  role: 'admin' | 'user'
  avatar_url: string | null
  email: string | null
  created_at: string
}

export interface Project {
  id: string
  user_id: string
  name: string
  type: string | null
  size: number | null
  size_unit: string | null
  location: string | null
  duration: number | null
  duration_unit: string | null
  client_requirements: string | null
  description: string | null
  status: 'draft' | 'active' | 'completed' | 'archived'
  created_at: string
  updated_at: string
}

export interface CostItem {
  id: string
  project_id: string
  category: 'materials' | 'labor' | 'equipment' | 'additional'
  name: string
  quantity: number | null
  unit: string | null
  unit_price: number | null
  workers: number | null
  daily_rate: number | null
  days: number | null
  rental_cost: number | null
  maintenance: number | null
  fuel: number | null
  notes: string | null
  created_at: string
}

export interface Risk {
  id: string
  project_id: string
  name: string
  description: string | null
  probability: number // 0-100 percentage
  impact: number // monetary value
  mitigation: string | null
  created_at: string
}

export interface FinancialSettings {
  id: string
  project_id: string
  overhead_pct: number
  contingency_pct: number
  markup_pct: number
  tax_pct: number
  currency: string
}

export interface ProjectVersion {
  id: string
  project_id: string
  version_number: number
  snapshot_data: Record<string, unknown>
  created_at: string
}

export interface SharedProject {
  id: string
  project_id: string
  share_token: string
  password_hash: string | null
  expires_at: string | null
  access_count: number
  created_at: string
}

export interface ProjectCollaborator {
  id: string
  project_id: string
  user_id: string
  permission: 'view' | 'edit'
  invited_by: string
  created_at: string
  profile?: Profile
}

export interface Resource {
  id: string
  user_id: string
  category: 'materials' | 'labor' | 'equipment'
  name: string
  description: string | null
  unit: string | null
  unit_price: number
  currency: string
  image_url: string | null
  created_at: string
}

export interface CostDatabase {
  id: string
  user_id: string
  name: string
  description: string | null
  currency: string
  is_public: boolean
  created_at: string
}

export interface AuditLog {
  id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  profile?: Profile
}

export interface AppSetting {
  id: string
  key: string
  value: string
  updated_at: string
}

export interface DropdownOption {
  id: string
  category: string
  label: string
  value: string
  created_at: string
}

// Form types
export type ProjectFormData = Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'>
export type CostItemFormData = Omit<CostItem, 'id' | 'created_at'>
export type RiskFormData = Omit<Risk, 'id' | 'created_at'>
export type ResourceFormData = Omit<Resource, 'id' | 'user_id' | 'created_at'>

// UI types
export type TabId = 'overview' | 'costs' | 'scenario' | 'pricing' | 'analytics' | 'reports' | 'versions'
export type CostCategory = 'materials' | 'labor' | 'equipment' | 'additional'
