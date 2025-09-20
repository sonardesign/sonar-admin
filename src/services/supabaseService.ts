import { supabase } from '../lib/supabase'
import { Client, Project, TimeEntry, ProjectMember, Task, Invoice, Report } from '../types'

// =====================================================
// CLIENT SERVICES
// =====================================================

export const clientService = {
  // Get all clients
  async getAll(): Promise<{ data: Client[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('is_active', true)
        .order('name')

      return { data: data as Client[], error: error ? new Error(error.message) : null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  // Get client by ID
  async getById(id: string): Promise<{ data: Client | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single()

      return { data: data as Client, error: error ? new Error(error.message) : null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  // Create client
  async create(client: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<{ data: Client | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([client])
        .select()
        .single()

      return { data: data as Client, error: error ? new Error(error.message) : null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  // Update client
  async update(id: string, updates: Partial<Client>): Promise<{ data: Client | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      return { data: data as Client, error: error ? new Error(error.message) : null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  // Delete client (soft delete)
  async delete(id: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ is_active: false })
        .eq('id', id)

      return { error: error ? new Error(error.message) : null }
    } catch (error) {
      return { error: error as Error }
    }
  },
}

// =====================================================
// PROJECT SERVICES
// =====================================================

export const projectService = {
  // Get all projects with client info
  async getAll(): Promise<{ data: Project[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          clients!projects_client_id_fkey (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false })

      if (error) return { data: null, error: new Error(error.message) }

      // Transform data to match legacy interface
      const transformedData = data?.map((project: any) => ({
        ...project,
        client_name: project.clients?.name,
        clientId: project.client_id,
        clientName: project.clients?.name,
        archived: project.is_archived,
        createdAt: new Date(project.created_at),
        updatedAt: new Date(project.updated_at),
      })) as Project[]

      return { data: transformedData, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  // Get projects by client ID
  async getByClientId(clientId: string): Promise<{ data: Project[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          clients!projects_client_id_fkey (
            id,
            name
          )
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (error) return { data: null, error: new Error(error.message) }

      const transformedData = data?.map((project: any) => ({
        ...project,
        client_name: project.clients?.name,
        clientId: project.client_id,
        clientName: project.clients?.name,
        archived: project.is_archived,
        createdAt: new Date(project.created_at),
        updatedAt: new Date(project.updated_at),
      })) as Project[]

      return { data: transformedData, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  // Create project
  async create(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<{ data: Project | null; error: Error | null }> {
    try {
      const projectData = {
        client_id: project.client_id || project.clientId!,
        name: project.name,
        description: project.description,
        color: project.color,
        hourly_rate: project.hourly_rate,
        budget: project.budget,
        deadline: project.deadline,
        status: project.status || 'active',
        is_archived: project.is_archived || project.archived || false,
      }

      const { data, error } = await supabase
        .from('projects')
        .insert([projectData])
        .select(`
          *,
          clients!projects_client_id_fkey (
            id,
            name
          )
        `)
        .single()

      if (error) return { data: null, error: new Error(error.message) }

      const transformedData = {
        ...data,
        client_name: data.clients?.name,
        clientId: data.client_id,
        clientName: data.clients?.name,
        archived: data.is_archived,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      } as Project

      return { data: transformedData, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  // Update project
  async update(id: string, updates: Partial<Project>): Promise<{ data: Project | null; error: Error | null }> {
    try {
      const updateData: any = { ...updates }
      
      // Handle legacy field mappings
      if (updates.clientId) updateData.client_id = updates.clientId
      if (updates.archived !== undefined) updateData.is_archived = updates.archived

      const { data, error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          clients!projects_client_id_fkey (
            id,
            name
          )
        `)
        .single()

      if (error) return { data: null, error: new Error(error.message) }

      const transformedData = {
        ...data,
        client_name: data.clients?.name,
        clientId: data.client_id,
        clientName: data.clients?.name,
        archived: data.is_archived,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      } as Project

      return { data: transformedData, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  // Archive project
  async archive(id: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ is_archived: true })
        .eq('id', id)

      return { error: error ? new Error(error.message) : null }
    } catch (error) {
      return { error: error as Error }
    }
  },

  // Delete project
  async delete(id: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)

      return { error: error ? new Error(error.message) : null }
    } catch (error) {
      return { error: error as Error }
    }
  },
}

// =====================================================
// TIME ENTRY SERVICES
// =====================================================

export const timeEntryService = {
  // Get all time entries for current user
  async getAll(): Promise<{ data: TimeEntry[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('time_entries_detailed')
        .select('*')
        .order('start_time', { ascending: false })

      if (error) return { data: null, error: new Error(error.message) }

      // Transform data to match legacy interface
      const transformedData = data?.map((entry: any) => ({
        ...entry,
        projectId: entry.project_id,
        startTime: new Date(entry.start_time),
        endTime: entry.end_time ? new Date(entry.end_time) : undefined,
        duration: entry.duration_minutes,
        date: entry.start_time.split('T')[0],
        task: entry.description,
      })) as TimeEntry[]

      return { data: transformedData, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  // Get time entries by date range
  async getByDateRange(startDate: string, endDate: string): Promise<{ data: TimeEntry[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('time_entries_detailed')
        .select('*')
        .gte('start_time', startDate)
        .lte('start_time', endDate + 'T23:59:59')
        .order('start_time', { ascending: false })

      if (error) return { data: null, error: new Error(error.message) }

      const transformedData = data?.map((entry: any) => ({
        ...entry,
        projectId: entry.project_id,
        startTime: new Date(entry.start_time),
        endTime: entry.end_time ? new Date(entry.end_time) : undefined,
        duration: entry.duration_minutes,
        date: entry.start_time.split('T')[0],
        task: entry.description,
      })) as TimeEntry[]

      return { data: transformedData, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  // Create time entry
  async create(entry: Omit<TimeEntry, 'id' | 'created_at' | 'updated_at'>): Promise<{ data: TimeEntry | null; error: Error | null }> {
    try {
      const entryData = {
        project_id: entry.project_id || entry.projectId!,
        description: entry.description || entry.task,
        start_time: entry.start_time || entry.startTime!.toISOString(),
        end_time: entry.end_time || (entry.endTime ? entry.endTime.toISOString() : undefined),
        duration_minutes: entry.duration_minutes || entry.duration,
        is_billable: entry.is_billable ?? true,
        hourly_rate: entry.hourly_rate,
        tags: entry.tags,
      }

      const { data, error } = await supabase
        .from('time_entries')
        .insert([entryData])
        .select()
        .single()

      if (error) return { data: null, error: new Error(error.message) }

      const transformedData = {
        ...data,
        projectId: data.project_id,
        startTime: new Date(data.start_time),
        endTime: data.end_time ? new Date(data.end_time) : undefined,
        duration: data.duration_minutes,
        date: data.start_time.split('T')[0],
        task: data.description,
      } as TimeEntry

      return { data: transformedData, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  // Update time entry
  async update(id: string, updates: Partial<TimeEntry>): Promise<{ data: TimeEntry | null; error: Error | null }> {
    try {
      const updateData: any = { ...updates }
      
      // Handle legacy field mappings
      if (updates.projectId) updateData.project_id = updates.projectId
      if (updates.startTime) updateData.start_time = updates.startTime.toISOString()
      if (updates.endTime) updateData.end_time = updates.endTime.toISOString()
      if (updates.duration) updateData.duration_minutes = updates.duration
      if (updates.task) updateData.description = updates.task

      const { data, error } = await supabase
        .from('time_entries')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) return { data: null, error: new Error(error.message) }

      const transformedData = {
        ...data,
        projectId: data.project_id,
        startTime: new Date(data.start_time),
        endTime: data.end_time ? new Date(data.end_time) : undefined,
        duration: data.duration_minutes,
        date: data.start_time.split('T')[0],
        task: data.description,
      } as TimeEntry

      return { data: transformedData, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  // Delete time entry
  async delete(id: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', id)

      return { error: error ? new Error(error.message) : null }
    } catch (error) {
      return { error: error as Error }
    }
  },
}

// =====================================================
// DASHBOARD SERVICES
// =====================================================

export const dashboardService = {
  // Get dashboard statistics
  async getStats(): Promise<{ data: any | null; error: Error | null }> {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        return { data: null, error: new Error('User not authenticated') }
      }

      const { data, error } = await supabase
        .rpc('get_dashboard_stats', { user_uuid: user.user.id })

      return { data, error: error ? new Error(error.message) : null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },
}

// =====================================================
// REPORT SERVICES
// =====================================================

export const reportService = {
  // Generate time report
  async generateTimeReport(
    reportType: string,
    startDate: string,
    endDate: string,
    filters: {
      projectIds?: string[]
      userIds?: string[]
      clientIds?: string[]
    } = {}
  ): Promise<{ data: any | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .rpc('generate_time_report', {
          report_type: reportType,
          start_date: startDate,
          end_date: endDate,
          project_ids: filters.projectIds,
          user_ids: filters.userIds,
          client_ids: filters.clientIds,
        })

      return { data, error: error ? new Error(error.message) : null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },
}
