// Supabase database types - using generic typing to avoid 'never' issues
// until proper types are generated with: supabase gen types typescript --local
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          role: string
          avatar_url: string | null
          email: string | null
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          role?: string
          avatar_url?: string | null
          email?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          role?: string
          avatar_url?: string | null
          email?: string | null
          created_at?: string
        }
      }
      projects: {
        Row: {
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
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type?: string | null
          size?: number | null
          size_unit?: string | null
          location?: string | null
          duration?: number | null
          duration_unit?: string | null
          client_requirements?: string | null
          description?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: string | null
          size?: number | null
          size_unit?: string | null
          location?: string | null
          duration?: number | null
          duration_unit?: string | null
          client_requirements?: string | null
          description?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      cost_items: {
        Row: {
          id: string
          project_id: string
          category: string
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
        Insert: {
          id?: string
          project_id: string
          category: string
          name: string
          quantity?: number | null
          unit?: string | null
          unit_price?: number | null
          workers?: number | null
          daily_rate?: number | null
          days?: number | null
          rental_cost?: number | null
          maintenance?: number | null
          fuel?: number | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          category?: string
          name?: string
          quantity?: number | null
          unit?: string | null
          unit_price?: number | null
          workers?: number | null
          daily_rate?: number | null
          days?: number | null
          rental_cost?: number | null
          maintenance?: number | null
          fuel?: number | null
          notes?: string | null
          created_at?: string
        }
      }
      risks: {
        Row: {
          id: string
          project_id: string
          name: string
          description: string | null
          probability: number
          impact: number
          mitigation: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          description?: string | null
          probability?: number
          impact?: number
          mitigation?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          description?: string | null
          probability?: number
          impact?: number
          mitigation?: string | null
          created_at?: string
        }
      }
      financial_settings: {
        Row: {
          id: string
          project_id: string
          overhead_pct: number
          contingency_pct: number
          markup_pct: number
          tax_pct: number
          currency: string
        }
        Insert: {
          id?: string
          project_id: string
          overhead_pct?: number
          contingency_pct?: number
          markup_pct?: number
          tax_pct?: number
          currency?: string
        }
        Update: {
          id?: string
          project_id?: string
          overhead_pct?: number
          contingency_pct?: number
          markup_pct?: number
          tax_pct?: number
          currency?: string
        }
      }
      resources: {
        Row: {
          id: string
          user_id: string
          category: string
          name: string
          description: string | null
          unit: string | null
          unit_price: number
          currency: string
          image_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category: string
          name: string
          description?: string | null
          unit?: string | null
          unit_price?: number
          currency?: string
          image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category?: string
          name?: string
          description?: string | null
          unit?: string | null
          unit_price?: number
          currency?: string
          image_url?: string | null
          created_at?: string
        }
      }
      cost_databases: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          currency: string
          is_public: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          currency?: string
          is_public?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          currency?: string
          is_public?: boolean
          created_at?: string
        }
      }
      project_versions: {
        Row: {
          id: string
          project_id: string
          version_number: number
          snapshot_data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          version_number: number
          snapshot_data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          version_number?: number
          snapshot_data?: Json | null
          created_at?: string
        }
      }
      shared_projects: {
        Row: {
          id: string
          project_id: string
          share_token: string
          password_hash: string | null
          expires_at: string | null
          access_count: number
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          share_token: string
          password_hash?: string | null
          expires_at?: string | null
          access_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          share_token?: string
          password_hash?: string | null
          expires_at?: string | null
          access_count?: number
          created_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          entity_type: string | null
          entity_id: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          entity_type?: string | null
          entity_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          entity_type?: string | null
          entity_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
      }
      app_settings: {
        Row: {
          id: string
          key: string
          value: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: string | null
          updated_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
