import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { Layout } from './components/Layout'
import { AuthPage } from './components/auth/AuthPage'
import { Dashboard } from './pages/Dashboard'
import { TimeTracking } from './pages/TimeTracking'
import { Calendar } from './pages/Calendar'
import { Projects } from './pages/Projects'
import { Reports } from './pages/Reports'
import { Loader2 } from 'lucide-react'

function App() {
  const { user, loading } = useAuth()

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

  // Show auth page if user is not logged in
  if (!user) {
    return <AuthPage />
  }

  // Show main app if user is logged in
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

export default App
