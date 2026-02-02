import { useMemo, useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { useSupabaseAppState } from './useSupabaseAppState'
import { supabase } from '../lib/supabase'
import { UserRole } from '../types'

interface UsePermissionsReturn {
  userRole: UserRole
  isAdmin: boolean
  isManager: boolean
  isMember: boolean
  
  // Feature-level permissions
  canViewDashboard: boolean
  canViewSummary: boolean
  canViewReports: boolean
  canViewAllUsers: boolean
  canCreateProjects: boolean
  canEditProjects: boolean
  canOpenProjectDetails: boolean
  canManageUsers: boolean
  canViewOthersTimeEntries: boolean
  canEditOthersTimeEntries: boolean
  
  // Navigation permissions
  allowedRoutes: string[]
}

export const usePermissions = (): UsePermissionsReturn => {
  const { user } = useAuth()
  const { users } = useSupabaseAppState()
  const [directRole, setDirectRole] = useState<UserRole | null>(null)

  // Fallback: fetch current user's profile directly if not found in users list
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user?.id) return
      
      // Check if user is already in the users list
      const existingUser = users.find(u => u.id === user.id)
      if (existingUser?.role) {
        setDirectRole(null) // Use the role from users list
        return
      }
      
      // Fetch directly from supabase as fallback
      try {
        console.log('🔄 Fetching user role directly...')
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        
        if (!error && data?.role) {
          console.log('✅ Direct role fetch:', data.role)
          setDirectRole(data.role as UserRole)
        } else {
          console.error('❌ Failed to fetch user role:', error)
        }
      } catch (err) {
        console.error('💥 Error fetching user role:', err)
      }
    }
    
    fetchUserRole()
  }, [user?.id, users])

  const userProfile = useMemo(() => {
    return users.find(u => u.id === user?.id)
  }, [users, user?.id])

  // Use direct role as fallback if profile not found in users list
  const userRole: UserRole = userProfile?.role || directRole || 'member'

  const isAdmin = userRole === 'admin'
  const isManager = userRole === 'manager'
  const isMember = userRole === 'member'

  // Feature-level permissions
  const permissions = useMemo(() => {
    switch (userRole) {
      case 'admin':
        return {
          canViewDashboard: true,
          canViewSummary: true,
          canViewReports: true,
          canViewAllUsers: true,
          canCreateProjects: true,
          canEditProjects: true,
          canOpenProjectDetails: true,
          canManageUsers: true,
          canViewOthersTimeEntries: true,
          canEditOthersTimeEntries: true,
          allowedRoutes: [
            '/',
            '/dashboard',
            '/timetable',
            '/projects',
            '/workload',
            '/reports',
            '/summary',
            '/settings'
          ]
        }
      
      case 'manager':
        return {
          canViewDashboard: true,
          canViewSummary: true,
          canViewReports: true,
          canViewAllUsers: false, // Only users in their projects
          canCreateProjects: true,
          canEditProjects: false, // Only with specific permissions
          canOpenProjectDetails: true,
          canManageUsers: false,
          canViewOthersTimeEntries: true, // Only for assigned projects
          canEditOthersTimeEntries: false, // Only with specific permissions
          allowedRoutes: [
            '/',
            '/dashboard',
            '/timetable',
            '/projects',
            '/workload',
            '/reports',
            '/summary'
          ]
        }
      
      case 'member':
      default:
        return {
          canViewDashboard: false,
          canViewSummary: false,
          canViewReports: false,
          canViewAllUsers: false,
          canCreateProjects: true, // Members CAN create projects
          canEditProjects: false, // But cannot edit them
          canOpenProjectDetails: false, // Cannot open project details
          canManageUsers: false,
          canViewOthersTimeEntries: false,
          canEditOthersTimeEntries: false,
          allowedRoutes: [
            '/',
            '/timetable',
            '/projects', // Can view list and create, but not open details
            '/reports' // Can view their own reports only
          ]
        }
    }
  }, [userRole])

  return {
    userRole,
    isAdmin,
    isManager,
    isMember,
    ...permissions
  }
}

