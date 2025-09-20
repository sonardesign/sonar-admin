// import React from 'react' // Not needed with new JSX transform
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { TimeTracking } from './pages/TimeTracking'
import { Calendar } from './pages/Calendar'
import { Projects } from './pages/Projects'
import { Reports } from './pages/Reports'

function App() {
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
