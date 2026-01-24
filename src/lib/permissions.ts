import { UserRole } from '../types'

/**
 * Permission utility functions for role-based access control
 */

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  member: 'Member'
}

export const ROLE_BADGES: Record<UserRole, { color: string; bgColor: string }> = {
  admin: { color: '#dc2626', bgColor: '#fee2e2' }, // Red
  manager: { color: '#2563eb', bgColor: '#dbeafe' }, // Blue
  member: { color: '#16a34a', bgColor: '#dcfce7' } // Green
}

/**
 * Check if a user role can view the dashboard
 */
export const canViewDashboard = (role: UserRole): boolean => {
  return role === 'admin' || role === 'manager'
}

/**
 * Check if a user role can view summary/reports
 */
export const canViewReports = (role: UserRole): boolean => {
  return role === 'admin' || role === 'manager'
}

/**
 * Check if a user role can edit projects (not including creating)
 */
export const canEditProjects = (role: UserRole): boolean => {
  return role === 'admin'
}

/**
 * Check if a user role can create projects
 */
export const canCreateProjects = (role: UserRole): boolean => {
  return true // All users can create projects
}

/**
 * Check if a user role can view other users' time entries
 */
export const canViewOthersTimeEntries = (role: UserRole): boolean => {
  return role === 'admin' || role === 'manager'
}

/**
 * Check if a user role can manage users
 */
export const canManageUsers = (role: UserRole): boolean => {
  return role === 'admin'
}

/**
 * Get allowed routes for a user role
 */
export const getAllowedRoutes = (role: UserRole): string[] => {
  switch (role) {
    case 'admin':
      return ['/', '/time-tracking', '/timetable', '/google-calendar-sync', '/tasks', '/funnel', '/contacts', '/crm-reports', '/projects', '/clients', '/workload', '/reports', '/summary', '/settings', '/admin']
    case 'manager':
      return ['/', '/time-tracking', '/timetable', '/google-calendar-sync', '/tasks', '/funnel', '/contacts', '/crm-reports', '/projects', '/clients', '/workload', '/reports', '/summary']
    case 'member':
      return ['/time-tracking', '/timetable', '/google-calendar-sync', '/tasks', '/funnel', '/contacts', '/crm-reports', '/projects', '/clients']
    default:
      return ['/time-tracking']
  }
}

/**
 * Check if a route is allowed for a user role
 */
export const isRouteAllowed = (route: string, role: UserRole): boolean => {
  const allowedRoutes = getAllowedRoutes(role)
  
  // Check exact match
  if (allowedRoutes.includes(route)) {
    return true
  }
  
  // Check if route starts with any allowed route (for nested routes)
  return allowedRoutes.some(allowedRoute => {
    if (allowedRoute === '/') return route === '/'
    return route.startsWith(allowedRoute)
  })
}

/**
 * Format user name with role tag for display
 */
export const formatUserNameWithRole = (
  name: string,
  role: UserRole,
  isCurrentUser: boolean = false
): string => {
  const roleLabel = ROLE_LABELS[role]
  if (isCurrentUser) {
    return `${name} (${roleLabel})`
  }
  return name
}

