import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ethrtamtoioydchylepo.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0aHJ0YW10b2lveWRjaHlsZXBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODcxMjUsImV4cCI6MjA3Mzk2MzEyNX0.SgLY6S5eGOgqZU9QXu55Fzsla-EHTDV0VWcv4dKYKdA'

// Debug environment variables
console.log('🔧 Supabase config debug:')
console.log('Environment VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('Environment VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Not set')
console.log('Final supabaseUrl:', supabaseUrl)
console.log('Final supabaseAnonKey:', supabaseAnonKey ? 'Set' : 'Not set')

// Validate configuration
if (!supabaseUrl || supabaseUrl === 'your_supabase_project_url_here') {
  console.error('❌ VITE_SUPABASE_URL is not set or invalid')
}
if (!supabaseAnonKey || supabaseAnonKey === 'your_supabase_anon_key_here') {
  console.error('❌ VITE_SUPABASE_ANON_KEY is not set or invalid')
}

// Create Supabase client with simple in-memory session storage
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false, // In-memory only
    detectSessionInUrl: true,
  }
})

// Database types (these will be generated from your Supabase schema)
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          avatar_url?: string
          role: 'admin' | 'manager' | 'user'
          timezone: string
          date_format: string
          time_format: '12h' | '24h'
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          avatar_url?: string
          role?: 'admin' | 'manager' | 'user'
          timezone?: string
          date_format?: string
          time_format?: '12h' | '24h'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          avatar_url?: string
          role?: 'admin' | 'manager' | 'user'
          timezone?: string
          date_format?: string
          time_format?: '12h' | '24h'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          name: string
          email?: string
          phone?: string
          address?: string
          website?: string
          contact_person?: string
          notes?: string
          is_active: boolean
          created_by?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email?: string
          phone?: string
          address?: string
          website?: string
          contact_person?: string
          notes?: string
          is_active?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string
          address?: string
          website?: string
          contact_person?: string
          notes?: string
          is_active?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          client_id: string
          name: string
          description?: string
          color: string
          hourly_rate?: number
          budget?: number
          deadline?: string
          status: 'active' | 'on_hold' | 'completed' | 'cancelled'
          is_archived: boolean
          created_by?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          name: string
          description?: string
          color?: string
          hourly_rate?: number
          budget?: number
          deadline?: string
          status?: 'active' | 'on_hold' | 'completed' | 'cancelled'
          is_archived?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          name?: string
          description?: string
          color?: string
          hourly_rate?: number
          budget?: number
          deadline?: string
          status?: 'active' | 'on_hold' | 'completed' | 'cancelled'
          is_archived?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      project_members: {
        Row: {
          id: string
          project_id: string
          user_id: string
          role: 'owner' | 'manager' | 'member' | 'viewer'
          hourly_rate?: number
          can_edit_project: boolean
          can_view_reports: boolean
          added_by?: string
          added_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          role?: 'owner' | 'manager' | 'member' | 'viewer'
          hourly_rate?: number
          can_edit_project?: boolean
          can_view_reports?: boolean
          added_by?: string
          added_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          role?: 'owner' | 'manager' | 'member' | 'viewer'
          hourly_rate?: number
          can_edit_project?: boolean
          can_view_reports?: boolean
          added_by?: string
          added_at?: string
        }
      }
      time_entries: {
        Row: {
          id: string
          user_id: string
          project_id: string
          task_id?: string
          description?: string
          start_time: string
          end_time?: string
          duration_minutes?: number
          is_billable: boolean
          hourly_rate?: number
          tags?: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_id: string
          task_id?: string
          description?: string
          start_time: string
          end_time?: string
          duration_minutes?: number
          is_billable?: boolean
          hourly_rate?: number
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string
          task_id?: string
          description?: string
          start_time?: string
          end_time?: string
          duration_minutes?: number
          is_billable?: boolean
          hourly_rate?: number
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      time_entries_detailed: {
        Row: {
          id: string
          user_id: string
          user_name: string
          project_id: string
          project_name: string
          project_color: string
          task_id?: string
          task_name?: string
          description?: string
          start_time: string
          end_time?: string
          duration_minutes?: number
          is_billable: boolean
          hourly_rate?: number
          tags?: string[]
          client_id: string
          client_name: string
          created_at: string
          updated_at: string
        }
      }
      projects_summary: {
        Row: {
          id: string
          name: string
          description?: string
          color: string
          status: 'active' | 'on_hold' | 'completed' | 'cancelled'
          is_archived: boolean
          client_name: string
          client_id: string
          member_count: number
          task_count: number
          time_entry_count: number
          total_minutes: number
          total_hours: number
          created_at: string
          updated_at: string
        }
      }
      user_time_summary: {
        Row: {
          user_id: string
          full_name: string
          email: string
          active_projects: number
          total_entries: number
          total_minutes: number
          total_hours: number
          billable_minutes: number
          billable_hours: number
        }
      }
    }
    Functions: {
      get_project_stats: {
        Args: { project_uuid: string }
        Returns: any
      }
      get_user_time_summary: {
        Args: { 
          user_uuid: string
          start_date?: string
          end_date?: string 
        }
        Returns: any
      }
      generate_time_report: {
        Args: {
          report_type: string
          start_date: string
          end_date: string
          project_ids?: string[]
          user_ids?: string[]
          client_ids?: string[]
        }
        Returns: any
      }
      get_dashboard_stats: {
        Args: { user_uuid: string }
        Returns: any
      }
    }
  }
}
