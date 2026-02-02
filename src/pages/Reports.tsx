import React, { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, startOfToday, endOfToday, eachDayOfInterval, parseISO } from 'date-fns'
import { CalendarIcon, ChevronDown, Download, FileText, FileSpreadsheet, Users, FolderOpen, User } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover'
import { Calendar } from '../components/ui/calendar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu'
import { Pie, PieChart, Cell, Tooltip, Bar, BarChart, XAxis, YAxis, CartesianGrid } from 'recharts'
import { useSupabaseAppState } from '../hooks/useSupabaseAppState'
import { PDFExportService } from '../services/pdfExportService'
import { CSVExportService } from '../services/csvExportService'
import { cn } from '../lib/utils'
import { Page } from '../components/Page'
import { useAuth } from '../hooks/useAuth'
import { usePermissions } from '../hooks/usePermissions'

interface DateRange {
  from: Date
  to: Date
}

interface DatePreset {
  label: string
  range: DateRange
}

const getDatePresets = (): DatePreset[] => {
  const today = new Date()
  const lastWeekStart = startOfWeek(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000))
  const lastWeekEnd = endOfWeek(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000))
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  
  return [
    {
      label: 'Today',
      range: {
        from: startOfToday(),
        to: endOfToday()
      }
    },
    {
      label: 'This Week',
      range: {
        from: startOfWeek(today),
        to: endOfWeek(today)
      }
    },
    {
      label: 'Last Week',
      range: {
        from: lastWeekStart,
        to: lastWeekEnd
      }
    },
    {
      label: 'This Month',
      range: {
        from: startOfMonth(today),
        to: endOfMonth(today)
      }
    },
    {
      label: 'Last Month',
      range: {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth)
      }
    },
    {
      label: 'This Year',
      range: {
        from: startOfYear(today),
        to: endOfYear(today)
      }
    }
  ]
}

export const Reports: React.FC = () => {
  const { user } = useAuth()
  const { userRole, isMember } = usePermissions()
  const { projects: allProjects, timeEntries: allTimeEntries, clients: allClients, users, loading, error } = useSupabaseAppState()
  
  // Filter data based on member permissions
  const timeEntries = useMemo(() => {
    if (isMember) {
      // Members only see their own time entries
      return allTimeEntries.filter(entry => entry.user_id === user?.id)
    }
    return allTimeEntries
  }, [allTimeEntries, isMember, user?.id])

  const projects = useMemo(() => {
    if (isMember) {
      // Members only see projects they have entries in
      const projectIds = new Set(timeEntries.map(entry => entry.projectId || entry.project_id))
      return allProjects.filter(project => projectIds.has(project.id))
    }
    return allProjects
  }, [allProjects, isMember, timeEntries])

  const clients = useMemo(() => {
    if (isMember) {
      // Members only see clients whose projects they have entries in
      const clientIds = new Set(projects.map(project => project.client_id || project.clientId).filter(Boolean))
      return allClients.filter(client => clientIds.has(client.id))
    }
    return allClients
  }, [allClients, isMember, projects])
  
  console.log('📊 Reports page data:', { 
    projects: projects.length, 
    timeEntries: timeEntries.length,
    clients: clients.length,
    users: users.length,
    loading,
    error,
    userRole,
    isMember
  });
  const [selectedClient, setSelectedClient] = useState<string>('all')
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [selectedColleague, setSelectedColleague] = useState<string>('all')
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const today = new Date()
    return {
      from: startOfMonth(today),
      to: endOfMonth(today)
    }
  })
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  const datePresets = getDatePresets()

  const handleDatePreset = (preset: DatePreset) => {
    setDateRange(preset.range)
    setIsCalendarOpen(false)
  }

  const handleExportPDF = async () => {
    try {
      console.log('🔄 Generating PDF report...')
      
      const pdfService = new PDFExportService()
      
      await pdfService.exportReport({
        filteredEntries,
        projects,
        clients,
        users,
        dateRange,
        selectedClient,
        selectedProject,
        selectedColleague
      })
      
      console.log('✅ PDF report generated successfully')
    } catch (error) {
      console.error('❌ Error generating PDF:', error)
      // You could add a toast notification here
      alert('Error generating PDF report. Please try again.')
    }
  }

  const handleExportCSV = () => {
    try {
      console.log('🔄 Generating CSV export...')
      
      const csvService = new CSVExportService()
      
      csvService.exportToCSV({
        filteredEntries,
        projects,
        clients,
        users,
        dateRange,
        selectedClient,
        selectedProject,
        selectedColleague
      })
      
      console.log('✅ CSV export generated successfully')
    } catch (error) {
      console.error('❌ Error generating CSV:', error)
      alert('Error generating CSV export. Please try again.')
    }
  }

  const formatDateRange = (range: DateRange) => {
    if (range.from && range.to) {
      return `${format(range.from, 'MMM d, yyyy')} - ${format(range.to, 'MMM d, yyyy')}`
    }
    return 'Select date range'
  }

  // Filter time entries based on selected filters
  const filteredEntries = timeEntries.filter(entry => {
    const dateValue = entry.date || entry.start_time || (entry.startTime ? entry.startTime.toISOString() : null)
    if (!dateValue) return false // Skip entries without any date
    
    const entryDate = new Date(dateValue)
    if (isNaN(entryDate.getTime())) return false // Skip invalid dates
    
    const isInDateRange = entryDate >= dateRange.from && entryDate <= dateRange.to
    
    // Filter by project
    const matchesProject = selectedProject === 'all' || !selectedProject || 
      entry.projectId === selectedProject || entry.project_id === selectedProject
    
    // Filter by client (check if project belongs to selected client)
    let matchesClient = selectedClient === 'all' || !selectedClient
    if (!matchesClient) {
      const project = projects.find(p => 
        p.id === (entry.projectId || entry.project_id)
      )
      matchesClient = project && (
        project.client_id === selectedClient || 
        project.clientId === selectedClient
      )
    }
    
    // Filter by colleague/user
    const matchesColleague = selectedColleague === 'all' || !selectedColleague ||
      entry.user_id === selectedColleague
    
    return isInDateRange && matchesProject && matchesClient && matchesColleague
  })

  // Calculate totals
  const totalHours = filteredEntries.reduce((sum, entry) => sum + entry.duration, 0) / 60
  const totalEntries = filteredEntries.length
  const uniqueProjects = new Set(filteredEntries.map(entry => entry.projectId)).size

  // Prepare pie chart data - Group by project
  const pieChartData = useMemo(() => {
    const projectHours: { [key: string]: { hours: number, color: string } } = {}
    
    filteredEntries.forEach(entry => {
      const project = projects.find(p => p.id === entry.projectId)
      const projectName = project?.name || 'Unknown'
      const projectColor = project?.color || '#888888'
      
      if (!projectHours[projectName]) {
        projectHours[projectName] = { hours: 0, color: projectColor }
      }
      projectHours[projectName].hours += (entry.duration / 60)
    })
    
    return Object.entries(projectHours).map(([name, data]) => ({
      name,
      value: parseFloat(data.hours.toFixed(2)),
      color: data.color
    }))
  }, [filteredEntries, projects])


  return (
    <Page loading={loading} loadingText="Loading reports...">
      <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          Generate and export detailed time tracking reports
        </p>
      </div>

      {/* Top Bar with Filters and Actions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Client Dropdown */}
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Client</label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger className="w-[220px]">
                    <Users className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All clients</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Project Dropdown */}
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Project</label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger className="w-[220px]">
                    <FolderOpen className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All projects</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-2" 
                            style={{ backgroundColor: project.color }}
                          />
                          {project.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Colleague Dropdown - Only for admins and managers */}
              {!isMember && (
                <div className="flex flex-col space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Colleague</label>
                  <Select value={selectedColleague} onValueChange={setSelectedColleague}>
                    <SelectTrigger className="w-[180px]">
                      <User className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Select colleague" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All colleagues</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Export Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={handleExportPDF}>
                    <FileText className="h-4 w-4 mr-2" />
                    Export PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportCSV}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Date Range Picker */}
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-[280px] justify-start text-left font-normal',
                      !dateRange && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formatDateRange(dateRange)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <div className="flex flex-col">
                    <div className="flex flex-col p-3 border-b">
                      <div className="text-sm font-medium mb-2">Quick Select</div>
                      <div className="space-y-1">
                        {datePresets.map((preset) => (
                          <Button
                            key={preset.label}
                            variant="ghost"
                            size="sm"
                            className="justify-start"
                            onClick={() => handleDatePreset(preset)}
                          >
                            {preset.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="p-3">
                      <Calendar
                        mode="range"
                        defaultMonth={dateRange.from}
                        selected={{
                          from: dateRange.from,
                          to: dateRange.to
                        }}
                        onSelect={(range) => {
                          if (range?.from && range?.to) {
                            setDateRange({
                              from: range.from,
                              to: range.to
                            })
                          }
                        }}
                        numberOfMonths={2}
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column - Pie Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Time Tracking Overview</CardTitle>
                <CardDescription>
                  Hours logged by project
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{totalHours.toFixed(1)}h</div>
                <p className="text-xs text-muted-foreground">Total Hours</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {pieChartData.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No data available</p>
              </div>
            ) : (
              <div className="w-full">
                <PieChart width={400} height={300}>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => `${value.toFixed(1)}h`}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                      color: 'hsl(var(--foreground))'
                    }}
                    labelStyle={{
                      color: 'hsl(var(--foreground))'
                    }}
                    itemStyle={{
                      color: 'hsl(var(--foreground))'
                    }}
                  />
                </PieChart>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {pieChartData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-sm"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-xs text-muted-foreground">{entry.name}</span>
                      <span className="text-xs font-medium ml-auto">{entry.value.toFixed(1)}h</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column - Horizontal Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Project Hours</CardTitle>
            <CardDescription>
              Hours breakdown by project
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pieChartData.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No data available</p>
              </div>
            ) : (
              <BarChart
                width={500}
                height={300}
                data={pieChartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip 
                  formatter={(value: number) => `${value.toFixed(1)}h`}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                    color: 'hsl(var(--foreground))'
                  }}
                  labelStyle={{
                    color: 'hsl(var(--foreground))'
                  }}
                  itemStyle={{
                    color: 'hsl(var(--foreground))'
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Time Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Time Entries Report</CardTitle>
          <CardDescription>
            Detailed breakdown of all time entries for the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredEntries.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No entries found</h3>
              <p className="text-muted-foreground">
                Try adjusting your filters or date range to see time entries.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-sm">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-sm">Project</th>
                    <th className="text-left py-3 px-4 font-medium text-sm">Task</th>
                    <th className="text-left py-3 px-4 font-medium text-sm">User</th>
                    <th className="text-right py-3 px-4 font-medium text-sm">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => {
                    const project = projects.find(p => p.id === entry.projectId)
                    const user = users.find(u => u.id === entry.user_id)
                    return (
                      <tr key={entry.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 text-sm">
                          {entry.date ? format(new Date(entry.date), 'MMM d, yyyy') : 'No date'}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: project?.color || '#888888' }}
                            />
                            {project?.name || 'Unknown Project'}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {entry.task || 'No task description'}
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {user?.full_name || 'Unknown User'}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-medium">
                          {(entry.duration / 60).toFixed(1)}h
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </Page>
  )
}
