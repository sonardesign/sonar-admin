// import React from 'react' // Not needed with new JSX transform
import { useState } from 'react'
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
import { Loader2, Play } from 'lucide-react'
import { Button } from './components/ui/button'

// Demo mode component for development
const DemoModeButton = ({ onEnterDemo }: { onEnterDemo: () => void }) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Play className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Sonar Admin</h1>
          </div>
          <p className="text-muted-foreground mb-6">
            Time Tracking Application
          </p>
        </div>
        
        <Button onClick={onEnterDemo} className="w-full mb-4">
          <Play className="h-4 w-4 mr-2" />
          Enter Demo Mode
        </Button>
        
        <p className="text-xs text-muted-foreground">
          Demo mode lets you explore the app without authentication
        </p>
      </div>
    </div>
  )
}

// Main app component that handles authentication state
const AppContent = () => {
  const { user, loading } = useAuth()
  const [demoMode, setDemoMode] = useState(false)

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Show demo mode button if no user and not in demo mode
  if (!user && !demoMode) {
    return <DemoModeButton onEnterDemo={() => setDemoMode(true)} />
  }

  // Show auth page if user wants to login (can add this later)
  // if (!user && !demoMode) {
  //   return <AuthPage />
  // }

  // Show main app if user is logged in OR in demo mode
  return (
    <Router>
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
