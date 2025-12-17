import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { usePermissions } from '../hooks/usePermissions'
import { isRouteAllowed } from '../lib/permissions'

interface ProtectedRouteProps {
  children: React.ReactNode
}

/**
 * ProtectedRoute component
 * Wraps routes that require specific role-based permissions
 * Redirects to appropriate page if user doesn't have access
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const location = useLocation()
  const { userRole } = usePermissions()

  const currentPath = location.pathname

  // Check if the current route is allowed for the user's role
  if (!isRouteAllowed(currentPath, userRole)) {
    // Redirect based on role
    if (userRole === 'member') {
      // Members should go to time tracking
      return <Navigate to="/time-tracking" replace />
    } else if (userRole === 'manager') {
      // Managers should go to dashboard
      return <Navigate to="/" replace />
    }
    // Default redirect to home
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

