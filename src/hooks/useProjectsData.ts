import { useState, useEffect, useCallback } from 'react'
import { Project, ProjectColor, Client } from '../types'
import { supabase } from '../lib/supabase'

// Custom hook specifically for Projects page data management
export const useProjectsData = () => {
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load initial data
  useEffect(() => {
    console.log('🚀 useProjectsData hook initialized')
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    
    console.log('🔄 Loading projects data...')
    
    try {
      // Test basic Supabase connection first
      console.log('🔗 Testing Supabase connection...')
      console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
      console.log('Supabase client:', supabase)
      
      // Test if we can access the projects table at all
      console.log('🧪 Testing projects table access...')
      try {
        const { count, error: countError } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
        
        if (countError) {
          console.error('❌ Projects table count error:', countError)
        } else {
          console.log('✅ Projects table accessible, count:', count)
        }
      } catch (testErr) {
        console.error('💥 Projects table test failed:', testErr)
      }
      
      // Load clients - Load ALL clients (active and inactive) to see duplicates
      console.log('📋 Loading clients...')
      const clientsQuery = supabase
        .from('clients')
        .select('id, name, is_active, created_at, updated_at, client_code')
        // Remove is_active filter to see ALL clients including duplicates
        .order('name', { ascending: true })
        .order('created_at', { ascending: true })
      
      console.log('📋 Clients query object:', clientsQuery)
      const { data: clientsData, error: clientsError } = await clientsQuery
      
      console.log('📋 Raw clients response:', { 
        data: clientsData, 
        error: clientsError,
        count: clientsData?.length || 0,
        duplicateNames: clientsData ? [...new Set(clientsData.map(c => c.name))].length !== clientsData.length : false
      })
      
      if (clientsError) {
        console.error('❌ Error loading clients:', clientsError)
        console.error('❌ Error details:', {
          message: clientsError.message,
          details: clientsError.details,
          hint: clientsError.hint,
          code: clientsError.code
        })
        setError(`Failed to load clients: ${clientsError.message}`)
      } else {
        console.log('✅ Clients loaded successfully:', clientsData?.length || 0, 'records')
        console.log('✅ Clients data:', clientsData)
        setClients(clientsData || [])
      }

      // Load projects
      console.log('📁 Loading projects...')
      console.log('📁 Attempting projects query...')
      
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, client_id, color, status, is_archived, description, created_by, created_at, updated_at, project_code')
        .order('created_at', { ascending: false })
      
      console.log('📁 Raw projects response:', { data: projectsData, error: projectsError })
      
      if (projectsError) {
        console.error('❌ Error loading projects:', projectsError)
        console.error('❌ Projects error details:', {
          message: projectsError.message,
          details: projectsError.details,
          hint: projectsError.hint,
          code: projectsError.code
        })
        
        setError(`Failed to load projects: ${projectsError.message}`)
        setProjects([]) // Set empty array on error
      } else {
        console.log('✅ Projects loaded successfully:', projectsData?.length || 0, 'records')
        console.log('✅ Projects data:', projectsData)
        
        // Transform the data and match with clients
        const transformedProjects = (projectsData || []).map((project: any) => {
          // Find the client for this project
          const client = clientsData?.find(c => c.id === project.client_id)
          const clientName = client?.name || 'No Client'
          const clientCode = (client as any)?.client_code
          
          return {
            id: project.id,
            name: project.name,
            description: project.description,
            color: project.color || '#3b82f6',
            client_id: project.client_id,
            client_name: clientName,
            client_code: clientCode,
            project_code: project.project_code, // From migration 023
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
      
      console.log('🎉 Projects data loading completed')
    } catch (err) {
      console.error('💥 Error loading projects data:', err)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(`Failed to load data: ${errorMessage}`)
    } finally {
      setLoading(false)
      console.log('🏁 Projects loading state cleared')
    }
  }

  // Client management
  const createClient = useCallback(async (name: string): Promise<Client | null> => {
    try {
      console.log('➕ Creating client:', name)
      const { data, error } = await supabase
        .from('clients')
        .insert([{
          name: name.trim(),
          is_active: true
        }])
        .select()
        .single()

      if (error) {
        console.error('❌ Error creating client:', error)
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        
        // Check if it's a permission error
        if (error.message?.includes('permission') || error.code === '42501') {
          setError('Permission denied: You need manager or admin role to create clients')
        } else {
          setError(`Failed to create client: ${error.message}`)
        }
        return null
      }

      if (data) {
        console.log('✅ Client created:', data.name)
        console.log('🔄 Adding client to state:', data)
        setClients(prev => {
          const updated = [...prev, data]
          console.log('📋 Updated clients list:', updated.map(c => ({ id: c.id, name: c.name })))
          return updated
        })
        return data
      }

      return null
    } catch (err) {
      console.error('💥 Error creating client:', err)
      setError('Failed to create client')
      return null
    }
  }, [])

  const updateClient = useCallback(async (id: string, updates: Partial<Client>) => {
    try {
      console.log('✏️ Updating client:', id)
      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('❌ Error updating client:', error)
        setError('Failed to update client')
        return
      }

      if (data) {
        console.log('✅ Client updated:', data.name)
        setClients(prev => prev.map(c => c.id === id ? data : c))
      }
    } catch (err) {
      console.error('💥 Error updating client:', err)
      setError('Failed to update client')
    }
  }, [])

  // Project management
  const createProject = useCallback(async (
    name: string, 
    color: ProjectColor, 
    clientId: string
  ): Promise<Project | null> => {
    try {
      if (!clientId) {
        setError('Client is required to create a project')
        return null
      }

      console.log('➕ Creating project:', name, 'for client:', clientId)
      
      // Get the current authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        console.error('❌ User not authenticated:', authError)
        setError('User not authenticated')
        return null
      }

      const { data, error } = await supabase
        .from('projects')
        .insert([{
          name: name.trim(),
          color,
          client_id: clientId,
          status: 'active',
          is_archived: false,
          created_by: user.id // Set the creator
        }])
        .select('*')
        .single()

      if (error) {
        console.error('❌ Error creating project:', error)
        setError('Failed to create project')
        return null
      }

      if (data) {
        console.log('✅ Project created:', data.name)
        
        // Add creator as project member with owner role so they can see and manage the project
        const { error: memberError } = await supabase
          .from('project_members')
          .insert([{
            project_id: data.id,
            user_id: user.id,
            role: 'owner',
            can_edit_project: true,
            can_view_reports: true,
            added_by: user.id,
          }])

        if (memberError) {
          console.error('⚠️ Warning: Could not add creator as project member:', memberError)
          // Don't fail the project creation if member addition fails
        } else {
          console.log('✅ Creator added as project member')
        }
        
        // Find the client for this project
        const client = clients.find(c => c.id === data.client_id)
        const clientName = client?.name || 'No Client'
        
        // Transform the data to match our Project interface
        const transformedProject: Project = {
          id: data.id,
          name: data.name,
          description: data.description,
          color: data.color,
          client_id: data.client_id,
          client_name: clientName,
          status: data.status,
          is_archived: data.is_archived,
          created_by: data.created_by,
          created_at: data.created_at,
          updated_at: data.updated_at,
          // Legacy compatibility
          clientId: data.client_id,
          clientName: clientName,
          archived: data.is_archived,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        }
        
        // Reload all projects to ensure we have the latest data from database
        // This ensures RLS policies are respected and all relationships are loaded
        await loadData()
        
        return transformedProject
      }

      return null
    } catch (err) {
      console.error('💥 Error creating project:', err)
      setError('Failed to create project')
      return null
    }
  }, [clients, loadData])

  const updateProject = useCallback(async (id: string, updates: Partial<Project>) => {
    try {
      console.log('✏️ Updating project:', id)
      
      // Clean the updates object to only include database fields
      const dbUpdates: any = {}
      if (updates.name !== undefined) dbUpdates.name = updates.name
      if (updates.description !== undefined) dbUpdates.description = updates.description
      if (updates.color !== undefined) dbUpdates.color = updates.color
      if (updates.client_id !== undefined) dbUpdates.client_id = updates.client_id
      if (updates.status !== undefined) dbUpdates.status = updates.status
      if (updates.is_archived !== undefined) dbUpdates.is_archived = updates.is_archived
      if (updates.project_code !== undefined) dbUpdates.project_code = updates.project_code
      
      const { data, error } = await supabase
        .from('projects')
        .update(dbUpdates)
        .eq('id', id)
        .select('*')
        .single()

      if (error) {
        console.error('❌ Error updating project:', error)
        setError('Failed to update project')
        return
      }

      if (data) {
        console.log('✅ Project updated:', data.name)
        
        // Find the client for this project
        const client = clients.find(c => c.id === data.client_id)
        const clientName = client?.name || 'Unknown Client'
        
        // Transform the data to match our Project interface
        const transformedProject: Project = {
          id: data.id,
          name: data.name,
          description: data.description,
          color: data.color,
          client_id: data.client_id,
          client_name: clientName,
          status: data.status,
          is_archived: data.is_archived,
          created_by: data.created_by,
          created_at: data.created_at,
          updated_at: data.updated_at,
          // Legacy compatibility
          clientId: data.client_id,
          clientName: clientName,
          archived: data.is_archived,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        }
        
        setProjects(prev => prev.map(p => p.id === id ? transformedProject : p))
      }
    } catch (err) {
      console.error('💥 Error updating project:', err)
      setError('Failed to update project')
    }
  }, [])

  const archiveProject = useCallback(async (id: string) => {
    try {
      console.log('📦 Archiving project:', id)
      const { error } = await supabase
        .from('projects')
        .update({ is_archived: true, status: 'completed' })
        .eq('id', id)

      if (error) {
        console.error('❌ Error archiving project:', error)
        setError('Failed to archive project')
        return
      }

      console.log('✅ Project archived:', id)
      setProjects(prev => prev.map(p =>
        p.id === id ? { ...p, is_archived: true, archived: true, status: 'completed' } : p
      ))
    } catch (err) {
      console.error('💥 Error archiving project:', err)
      setError('Failed to archive project')
    }
  }, [])

  const unarchiveProject = useCallback(async (id: string) => {
    try {
      console.log('📤 Unarchiving project:', id)
      const { error } = await supabase
        .from('projects')
        .update({ is_archived: false, status: 'active' })
        .eq('id', id)

      if (error) {
        console.error('❌ Error unarchiving project:', error)
        setError('Failed to unarchive project')
        return
      }

      console.log('✅ Project unarchived:', id)
      setProjects(prev => prev.map(p =>
        p.id === id ? { ...p, is_archived: false, archived: false, status: 'active' } : p
      ))
    } catch (err) {
      console.error('💥 Error unarchiving project:', err)
      setError('Failed to unarchive project')
    }
  }, [])

  const deleteProject = useCallback(async (id: string) => {
    try {
      console.log('🗑️ Deleting project:', id)
      
      // First check if the project exists
      const { data: existingProject, error: checkError } = await supabase
        .from('projects')
        .select('id, name, created_by')
        .eq('id', id)
        .single()

      if (checkError || !existingProject) {
        console.error('❌ Project not found:', checkError)
        throw new Error('Project not found')
      }

      console.log('📋 Project to delete:', existingProject)

      // Attempt to delete
      const { error, count } = await supabase
        .from('projects')
        .delete({ count: 'exact' })
        .eq('id', id)

      if (error) {
        console.error('❌ Error deleting project:', error)
        setError('Failed to delete project')
        throw new Error(error.message || 'Failed to delete project')
      }

      // Check if anything was actually deleted
      console.log('📊 Delete count:', count)
      if (count === 0) {
        console.error('❌ Delete blocked - no rows deleted (likely RLS policy)')
        setError('Permission denied: You can only delete projects you created')
        throw new Error('Permission denied: You can only delete projects you created')
      }

      console.log('✅ Project deleted from database')
      setProjects(prev => {
        const filtered = prev.filter(p => p.id !== id)
        console.log('📊 Projects count after delete:', prev.length, '->', filtered.length)
        return filtered
      })
    } catch (err) {
      console.error('💥 Error deleting project:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete project'
      setError(errorMessage)
      throw err
    }
  }, [])

  // Utility functions
  const getActiveProjects = useCallback(() => {
    return projects.filter(p => !p.is_archived && !p.archived)
  }, [projects])

  const deleteClient = useCallback(async (id: string, deleteOption: 'move_to_unassigned' | 'delete_projects' = 'move_to_unassigned') => {
    try {
      console.log('🗑️ Deleting client:', id, 'with option:', deleteOption)
      
      const clientProjects = projects.filter(p => p.client_id === id || p.clientId === id)
      console.log('📁 Found projects for client:', clientProjects.length)

      if (deleteOption === 'delete_projects' && clientProjects.length > 0) {
        // Delete all projects associated with this client
        console.log('🗑️ Deleting associated projects...')
        for (const project of clientProjects) {
          const { error: projectError } = await supabase
            .from('projects')
            .delete()
            .eq('id', project.id)
          
          if (projectError) {
            console.error('❌ Error deleting project:', project.id, projectError)
            setError(`Failed to delete project: ${project.name}`)
            return
          }
        }
        
        // Update local state to remove deleted projects
        setProjects(prev => prev.filter(p => !(p.client_id === id || p.clientId === id)))
        
      } else if (deleteOption === 'move_to_unassigned' && clientProjects.length > 0) {
        // Create an "Unassigned" client if it doesn't exist
        console.log('📦 Moving projects to Unassigned client...')
        
        let unassignedClient = clients.find(c => c.name === 'Unassigned')
        if (!unassignedClient) {
          console.log('➕ Creating Unassigned client...')
          const { data: newUnassignedClient, error: createError } = await supabase
            .from('clients')
            .insert([{
              name: 'Unassigned',
              is_active: true
            }])
            .select()
            .single()
          
          if (createError) {
            console.error('❌ Error creating Unassigned client:', createError)
            setError('Failed to create Unassigned client')
            return
          }
          
          unassignedClient = newUnassignedClient
          setClients(prev => [...prev, newUnassignedClient])
        }
        
        // Move projects to Unassigned client
        for (const project of clientProjects) {
          const { error: updateError } = await supabase
            .from('projects')
            .update({ client_id: unassignedClient.id })
            .eq('id', project.id)
          
          if (updateError) {
            console.error('❌ Error moving project:', project.id, updateError)
            setError(`Failed to move project: ${project.name}`)
            return
          }
        }
        
        // Update local state
        setProjects(prev => prev.map(p => 
          (p.client_id === id || p.clientId === id) 
            ? { ...p, client_id: unassignedClient!.id, clientId: unassignedClient!.id, client_name: 'Unassigned', clientName: 'Unassigned' }
            : p
        ))
      }

      // Delete the client
      console.log('🗑️ Attempting to delete client from database:', id)
      const { error, data } = await supabase
        .from('clients')
        .delete()
        .eq('id', id)
        .select()

      console.log('🗑️ Delete response:', { error, data })

      if (error) {
        console.error('❌ Error deleting client:', error)
        console.error('❌ Delete error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        
        // Check if it's a permission error
        if (error.message?.includes('permission') || error.code === '42501') {
          setError('Permission denied: You need admin role to delete clients')
        } else if (error.code === '23503') {
          setError('Cannot delete client: It has associated projects or data')
        } else {
          setError(`Failed to delete client: ${error.message}`)
        }
        return
      }

      console.log('✅ Client deleted from database:', id)
      console.log('🔄 Updating local state...')
      setClients(prev => {
        const updated = prev.filter(c => c.id !== id)
        console.log('📋 Clients after deletion:', updated.map(c => ({ id: c.id, name: c.name })))
        return updated
      })
      
    } catch (err) {
      console.error('💥 Error deleting client:', err)
      setError('Failed to delete client')
    }
  }, [projects, clients])

  const getClientById = useCallback((id: string) => {
    return clients.find(c => c.id === id)
  }, [clients])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    // Data
    clients,
    projects,
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
    unarchiveProject,
    deleteProject,
    getActiveProjects,
    
    // Utility methods
    clearError,
    refresh: loadData,
  }
}
