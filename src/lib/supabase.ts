// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Please update your .env file.')
}

export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)

// Untyped version for operations that hit TypeScript 'never' inference issues
// until `supabase gen types typescript` can be run against the real project
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = supabase as any
