import { useState, useEffect, useCallback } from 'react'
import { Project, TimeEntry, ProjectColor, Client } from '../types'
import { clientService, projectService, timeEntryService } from '../services/supabaseService'
import { useAuth } from '../contexts/AuthContext'

// This hook provides the same interface as useAppState but uses Supabase
export const useSupabaseAppState = () => {
  const { user } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load initial data
  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Load clients
      const { data: clientsData, error: clientsError } = await clientService.getAll()
      if (clientsError) {
        console.error('Error loading clients:', clientsError)
        setError('Failed to load clients')
      } else {
        setClients(clientsData || [])
      }

      // Load projects
      const { data: projectsData, error: projectsError } = await projectService.getAll()
      if (projectsError) {
        console.error('Error loading projects:', projectsError)
        setError('Failed to load projects')
      } else {
        setProjects(projectsData || [])
      }

      // Load time entries
      const { data: timeEntriesData, error: timeEntriesError } = await timeEntryService.getAll()
      if (timeEntriesError) {
        console.error('Error loading time entries:', timeEntriesError)
        setError('Failed to load time entries')
      } else {
        setTimeEntries(timeEntriesData || [])
      }
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Failed to load application data')
    } finally {
      setLoading(false)
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
    }
  }, [])

  const getActiveProjects = useCallback(() => {
    return projects.filter(p => !p.is_archived && !p.archived)
  }, [projects])

  const getProjectById = useCallback((id: string) => {
    return projects.find(p => p.id === id)
  }, [projects])

  // Time entry management
  const createTimeEntry = useCallback(async (entry: Omit<TimeEntry, 'id' | 'created_at' | 'updated_at'>): Promise<TimeEntry | null> => {
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
