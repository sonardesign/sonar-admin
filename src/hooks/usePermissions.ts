import { useMemo } from 'react'
import { useAuth } from './useAuth'
import { useSupabaseAppState } from './useSupabaseAppState'
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

  const userProfile = useMemo(() => {
    return users.find(u => u.id === user?.id)
  }, [users, user?.id])

  const userRole: UserRole = userProfile?.role || 'member'

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
            '/time-tracking',
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
            '/time-tracking',
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
            '/time-tracking',
            '/timetable',
            '/projects' // Can view list and create, but not open details
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

