import { useState, useEffect, useCallback } from 'react'
import { Project, TimeEntry, ProjectColor, Client } from '../types'
import { clientService, projectService, timeEntryService } from '../services/supabaseService'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { notifications } from '../lib/notifications'

// This hook provides the same interface as useAppState but uses Supabase
export const useSupabaseAppState = () => {
  const { user } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load initial data
  useEffect(() => {
    if (user) {
      console.log('🔄 useSupabaseAppState: User authenticated, loading data...')
      loadData()
    } else {
      console.log('⚠️ useSupabaseAppState: No user, using empty data')
      setLoading(false)
      setError(null)
      setClients([])
      setProjects([])
      setTimeEntries([])
    }
  }, [user])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    
    console.log('🔄 Starting data load...')
    
    try {
      // Load clients
      console.log('📋 Loading clients...')
      const { data: clientsData, error: clientsError } = await clientService.getAll()
      
      if (clientsError) {
        console.error('❌ Error loading clients:', clientsError)
        setError(`Failed to load clients: ${clientsError.message || clientsError}`)
        // Continue loading other data even if clients fail
      } else {
        console.log('✅ Clients loaded:', clientsData?.length || 0, 'records')
        setClients(clientsData || [])
      }

      // Load projects - FIXED: Using simple query without complex JOIN
      console.log('📁 Loading projects...')
      try {
        // Load clients first
        const { data: clientsForProjects, error: clientsForProjectsError } = await supabase
          .from('clients')
          .select('*')
          .order('name')

        if (clientsForProjectsError) {
          console.error('❌ Error loading clients for projects:', clientsForProjectsError)
        }

        // Load projects without JOIN
        const { data: rawProjectsData, error: rawProjectsError } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false })

        if (rawProjectsError) {
          console.error('❌ Error loading projects:', rawProjectsError)
          setError(`Failed to load projects: ${rawProjectsError.message || rawProjectsError}`)
        } else {
          console.log('✅ Projects loaded:', rawProjectsData?.length || 0, 'records')
          
          // Transform the data and match with clients
          const transformedProjects = (rawProjectsData || []).map((project: any) => {
            // Find the client for this project
            const client = clientsForProjects?.find(c => c.id === project.client_id)
            const clientName = client?.name || 'Unknown Client'

            return {
              id: project.id,
              name: project.name,
              description: project.description,
              color: project.color || '#3b82f6',
              client_id: project.client_id,
              client_name: clientName,
              status: project.status || 'active',
              is_archived: project.is_archived || false,
              created_by: project.created_by,
              created_at: project.created_at,
              updated_at: project.updated_at,
              // Legacy compatibility
              clientId: project.client_id,
              clientName: clientName,
              archived: project.is_archived || false,
              createdAt: project.created_at,
              updatedAt: project.updated_at
            }
          })

          setProjects(transformedProjects)
        }
      } catch (err) {
        console.error('💥 Error loading projects:', err)
        setError('Failed to load projects')
        setProjects([]) // Fallback to empty array
      }

      // Load time entries
      console.log('⏰ Loading time entries...')
      const { data: timeEntriesData, error: timeEntriesError } = await timeEntryService.getAll()
      
      if (timeEntriesError) {
        console.error('❌ Error loading time entries:', timeEntriesError)
        setError(`Failed to load time entries: ${timeEntriesError.message || timeEntriesError}`)
      } else {
        console.log('✅ Time entries loaded:', timeEntriesData?.length || 0, 'records')
        setTimeEntries(timeEntriesData || [])
      }

      // Load users/profiles
      console.log('👥 Loading users...')
      try {
        const { data: usersData, error: usersError } = await supabase
          .from('profiles')
          .select('id, full_name, email, role, is_active')
          .eq('is_active', true)
          .order('full_name')

        if (usersError) {
          console.error('❌ Error loading users:', usersError)
        } else {
          console.log('✅ Users loaded:', usersData?.length || 0, 'records')
          setUsers(usersData || [])
        }
      } catch (err) {
        console.error('💥 Error loading users:', err)
        setUsers([]) // Fallback to empty array
      }
      
      console.log('🎉 Data loading completed')
    } catch (err) {
      console.error('💥 Error loading data:', err)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(`Failed to load application data: ${errorMessage}`)
    } finally {
      setLoading(false)
      console.log('🏁 Loading state cleared')
    }
  }

  // Client management
  const createClient = useCallback(async (name: string): Promise<Client | null> => {
    try {
      const { data, error } = await clientService.create({
        name,
        is_active: true,
      })

      if (error) {
        console.error('Error creating client:', error)
        setError('Failed to create client')
        return null
      }

      if (data) {
        setClients(prev => [...prev, data])
        return data
      }

      return null
    } catch (err) {
      console.error('Error creating client:', err)
      setError('Failed to create client')
      notifications.client.createError(err instanceof Error ? err.message : 'Unknown error')
      return null
    }
  }, [])

  const updateClient = useCallback(async (id: string, updates: Partial<Client>) => {
    try {
      const { data, error } = await clientService.update(id, updates)

      if (error) {
        console.error('Error updating client:', error)
        setError('Failed to update client')
        return
      }

      if (data) {
        setClients(prev => prev.map(c => c.id === id ? data : c))
      }
    } catch (err) {
      console.error('Error updating client:', err)
      setError('Failed to update client')
      notifications.client.updateError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [])

  const deleteClient = useCallback(async (id: string) => {
    try {
      // Check if there are projects associated with this client
      const hasProjects = projects.some(p => p.client_id === id || p.clientId === id)
      if (hasProjects) {
        setError('Cannot delete client with associated projects')
        return
      }

      const { error } = await clientService.delete(id)

      if (error) {
        console.error('Error deleting client:', error)
        setError('Failed to delete client')
        return
      }

      setClients(prev => prev.filter(c => c.id !== id))
    } catch (err) {
      console.error('Error deleting client:', err)
      setError('Failed to delete client')
      notifications.client.deleteError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [projects])

  const getClientById = useCallback((id: string) => {
    return clients.find(c => c.id === id)
  }, [clients])

  // Project management
  const createProject = useCallback(async (
    name: string, 
    color: ProjectColor, 
    clientId: string = ''
  ): Promise<Project | null> => {
    try {
      if (!clientId) {
        setError('Client is required to create a project')
        return null
      }

      const { data, error } = await projectService.create({
        name,
        color,
        client_id: clientId,
        status: 'active',
        is_archived: false,
      })

      if (error) {
        console.error('Error creating project:', error)
        setError('Failed to create project')
        return null
      }

      if (data) {
        setProjects(prev => [...prev, data])
        return data
      }

      return null
    } catch (err) {
      console.error('Error creating project:', err)
      setError('Failed to create project')
      notifications.project.createError(err instanceof Error ? err.message : 'Unknown error')
      return null
    }
  }, [])

  const updateProject = useCallback(async (id: string, updates: Partial<Project>) => {
    try {
      const { data, error } = await projectService.update(id, updates)

      if (error) {
        console.error('Error updating project:', error)
        setError('Failed to update project')
        return
      }

      if (data) {
        setProjects(prev => prev.map(p => p.id === id ? data : p))
      }
    } catch (err) {
      console.error('Error updating project:', err)
      setError('Failed to update project')
      notifications.project.updateError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [])

  const archiveProject = useCallback(async (id: string) => {
    try {
      const { error } = await projectService.archive(id)

      if (error) {
        console.error('Error archiving project:', error)
        setError('Failed to archive project')
        return
      }

      setProjects(prev => prev.map(p => 
        p.id === id ? { ...p, is_archived: true, archived: true } : p
      ))
    } catch (err) {
      console.error('Error archiving project:', err)
      setError('Failed to archive project')
      notifications.project.updateError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [])

  const deleteProject = useCallback(async (id: string) => {
    try {
      const { error } = await projectService.delete(id)

      if (error) {
        console.error('Error deleting project:', error)
        setError('Failed to delete project')
        return
      }

      setProjects(prev => prev.filter(p => p.id !== id))
      setTimeEntries(prev => prev.filter(te => te.project_id !== id && te.projectId !== id))
    } catch (err) {
      console.error('Error deleting project:', err)
      setError('Failed to delete project')
      notifications.project.deleteError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [])

  const getActiveProjects = useCallback(() => {
    return projects.filter(p => !p.is_archived && !p.archived)
  }, [projects])

  const getProjectById = useCallback((id: string) => {
    return projects.find(p => p.id === id)
  }, [projects])

  // Time entry management
  const createTimeEntry = useCallback(async (entry: Omit<TimeEntry, 'id' | 'created_at' | 'updated_at' | 'user_id'> & { user_id?: string }): Promise<TimeEntry | null> => {
    try {
      const { data, error } = await timeEntryService.create(entry)

      if (error) {
        console.error('Error creating time entry:', error)
        setError('Failed to create time entry')
        return null
      }

      if (data) {
        setTimeEntries(prev => [...prev, data])
        return data
      }

      return null
    } catch (err) {
      console.error('Error creating time entry:', err)
      setError('Failed to create time entry')
      notifications.timeEntry.createError(err instanceof Error ? err.message : 'Unknown error')
      return null
    }
  }, [])

  const updateTimeEntry = useCallback(async (id: string, updates: Partial<TimeEntry>) => {
    try {
      const { data, error } = await timeEntryService.update(id, updates)

      if (error) {
        console.error('Error updating time entry:', error)
        setError('Failed to update time entry')
        return
      }

      if (data) {
        setTimeEntries(prev => prev.map(te => te.id === id ? data : te))
      }
    } catch (err) {
      console.error('Error updating time entry:', err)
      setError('Failed to update time entry')
      notifications.timeEntry.updateError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [])

  const deleteTimeEntry = useCallback(async (id: string) => {
    try {
      const { error } = await timeEntryService.delete(id)

      if (error) {
        console.error('Error deleting time entry:', error)
        setError('Failed to delete time entry')
        return
      }

      setTimeEntries(prev => prev.filter(te => te.id !== id))
    } catch (err) {
      console.error('Error deleting time entry:', err)
      setError('Failed to delete time entry')
      notifications.timeEntry.deleteError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    // Data
    clients,
    projects,
    timeEntries,
    users,
    loading,
    error,
    
    // Client methods
    createClient,
    updateClient,
    deleteClient,
    getClientById,
    
    // Project methods
    createProject,
    updateProject,
    archiveProject,
    deleteProject,
    getActiveProjects,
    getProjectById,
    
    // Time entry methods
    createTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    
    // Utility methods
    clearError,
    refresh: loadData,
  }
}
