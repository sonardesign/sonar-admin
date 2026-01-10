// Database-aligned interfaces
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: 'admin' | 'manager' | 'member';
  timezone: string;
  date_format: string;
  time_format: '12h' | '24h';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  name: string;
  client_code?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  contact_person?: string;
  notes?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  client_id: string;
  name: string;
  project_code?: string;
  description?: string;
  color: string;
  hourly_rate?: number;
  budget?: number;
  deadline?: string;
  status: 'active' | 'passive' | 'on_hold' | 'completed' | 'cancelled';
  is_archived: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Computed fields (from joins)
  client_name?: string;
  clientId?: string; // Legacy compatibility
  clientName?: string; // Legacy compatibility
  archived?: boolean; // Legacy compatibility
  createdAt?: Date; // Legacy compatibility
  updatedAt?: Date; // Legacy compatibility
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: 'owner' | 'manager' | 'member' | 'viewer';
  hourly_rate?: number;
  can_edit_project: boolean;
  can_view_reports: boolean;
  added_by?: string;
  added_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  estimated_hours?: number;
  status: 'todo' | 'in_progress' | 'review' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
  due_date?: string;
  completed_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'blocked' | 'done';

export interface TimeEntry {
  id: string;
  user_id: string;
  project_id: string;
  task_id?: string;
  task_number?: string;
  description?: string;
  notes?: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  is_billable: boolean;
  hourly_rate?: number;
  tags?: string[];
  entry_type?: 'planned' | 'reported';
  task_status?: TaskStatus;
  created_at: string;
  updated_at: string;
  // Legacy compatibility
  projectId?: string;
  startTime?: Date;
  endTime?: Date;
  duration?: number; // in minutes
  date?: string; // YYYY-MM-DD format
}

export interface Invoice {
  id: string;
  client_id: string;
  invoice_number: string;
  title: string;
  description?: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issue_date: string;
  due_date?: string;
  paid_date?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  time_entry_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface Report {
  id: string;
  name: string;
  description?: string;
  type: 'time_summary' | 'project_summary' | 'client_summary' | 'detailed' | 'invoice_summary';
  filters?: Record<string, any>;
  schedule?: 'none' | 'daily' | 'weekly' | 'monthly';
  recipients?: string[];
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TimeSlot {
  id: string;
  date: string;
  startTime: string; // HH:MM format
  endTime: string;
  projectId?: string;
  selected: boolean;
}

export interface ProjectManagerPermission {
  id: string;
  manager_id: string;
  project_id: string;
  can_view_time_entries: boolean;
  can_edit_time_entries: boolean;
  can_view_reports: boolean;
  can_edit_project: boolean;
  granted_by?: string;
  granted_at: string;
}

export type UserRole = 'admin' | 'manager' | 'member';

export type ProjectColor = 
  | '#ef4444' // red
  | '#f97316' // orange
  | '#eab308' // yellow
  | '#22c55e' // green
  | '#3b82f6' // blue
  | '#8b5cf6' // violet
  | '#ec4899' // pink
  | '#6b7280'; // gray
