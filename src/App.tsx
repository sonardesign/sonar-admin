import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthPage } from './components/auth/AuthPage'
import { SidebarProvider, SidebarInset } from './components/ui/sidebar'
import { AppSidebar } from './components/app-sidebar'
import { Dashboard } from './pages/Dashboard'
import { TimeTracking } from './pages/TimeTracking'
import { Timetable } from './pages/Timetable'
import { Projects } from './pages/Projects'
import { ProjectDetails } from './pages/ProjectDetails'
import { Reports } from './pages/Reports'
import { Summary } from './pages/Summary'
import { MonthlyDetail } from './pages/MonthlyDetail'
import { Settings } from './pages/Settings'
import { ForecastPlanning } from './pages/WorkloadPlanning'
import { Tasks } from './pages/Tasks'
import { TaskDetail } from './pages/TaskDetail'
import { Funnel } from './pages/Funnel'
import { LeadDetails } from './pages/LeadDetails'
import { Contacts } from './pages/Contacts'
import { CRMReports } from './pages/CRMReports'
import { Loader2 } from 'lucide-react'
import { Toaster } from 'sonner'
import './styles/globals.css'

function App() {
  const { user, loading, initialized } = useAuth()

  // Show loading spinner while initializing authentication
  if (!initialized || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">
            {!initialized ? 'Initializing authentication...' : 'Loading...'}
          </p>
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
      <SidebarProvider defaultOpen={true}>
        <div className="flex h-screen w-full overflow-hidden">
          <AppSidebar />
          <SidebarInset className="flex-1 overflow-hidden">
            <div className="h-full overflow-auto">
              <Layout>
                <Routes>
                <Route path="/" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/time-tracking" element={
                  <ProtectedRoute>
                    <TimeTracking />
                  </ProtectedRoute>
                } />
                <Route path="/timetable" element={
                  <ProtectedRoute>
                    <Timetable />
                  </ProtectedRoute>
                } />
                <Route path="/projects" element={
                  <ProtectedRoute>
                    <Projects />
                  </ProtectedRoute>
                } />
                <Route path="/projects/:projectName" element={
                  <ProtectedRoute>
                    <ProjectDetails />
                  </ProtectedRoute>
                } />
                <Route path="/reports" element={
                  <ProtectedRoute>
                    <Reports />
                  </ProtectedRoute>
                } />
                <Route path="/summary" element={
                  <ProtectedRoute>
                    <Summary />
                  </ProtectedRoute>
                } />
                <Route path="/summary/:monthKey" element={
                  <ProtectedRoute>
                    <MonthlyDetail />
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } />
                <Route path="/workload" element={
                  <ProtectedRoute>
                    <ForecastPlanning />
                  </ProtectedRoute>
                } />
                <Route path="/tasks" element={
                  <ProtectedRoute>
                    <Tasks />
                  </ProtectedRoute>
                } />
                <Route path="/tasks/:taskNumber/:taskSlug" element={
                  <ProtectedRoute>
                    <TaskDetail />
                  </ProtectedRoute>
                } />
                <Route path="/funnel" element={
                  <ProtectedRoute>
                    <Funnel />
                  </ProtectedRoute>
                } />
                <Route path="/funnel/:leadId" element={
                  <ProtectedRoute>
                    <LeadDetails />
                  </ProtectedRoute>
                } />
                <Route path="/contacts" element={
                  <ProtectedRoute>
                    <Contacts />
                  </ProtectedRoute>
                } />
                <Route path="/crm-reports" element={
                  <ProtectedRoute>
                    <CRMReports />
                  </ProtectedRoute>
                } />
                </Routes>
              </Layout>
            </div>
          </SidebarInset>
        </div>
        <Toaster 
        position="bottom-right" 
        theme="system"
        richColors
        toastOptions={{
          classNames: {
            toast: 'bg-card border-border text-foreground',
            title: 'text-foreground',
            description: 'text-muted-foreground',
            actionButton: 'bg-primary text-primary-foreground',
            cancelButton: 'bg-muted text-muted-foreground',
            closeButton: 'bg-card border-border text-foreground hover:bg-muted',
          },
        }}
        />
      </SidebarProvider>
    </Router>
  )
}

export default App
