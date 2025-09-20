// import React from 'react' // Not needed with new JSX transform
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './contexts/AuthContext'
import { Layout } from './components/Layout'
import { AuthPage } from './components/auth/AuthPage'
import { Dashboard } from './pages/Dashboard'
import { TimeTracking } from './pages/TimeTracking'
import { Calendar } from './pages/Calendar'
import { Projects } from './pages/Projects'
import { Reports } from './pages/Reports'
import { Loader2 } from 'lucide-react'

// Main app component that handles authentication state
const AppContent = () => {
  // TEMPORARY: Force demo mode to bypass all auth issues
  console.log('🎭 Forcing demo mode - bypassing all auth')
  return (
    <Router key="demo-app">
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/time-tracking" element={<TimeTracking />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </Layout>
    </Router>
  )
}

// Root app component with providers
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
