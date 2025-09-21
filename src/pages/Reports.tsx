import React, { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, startOfToday, endOfToday, eachDayOfInterval, parseISO } from 'date-fns'
import { CalendarIcon, ChevronDown, Download, FileText, FileSpreadsheet, Users, FolderOpen, User } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover'
import { Calendar } from '../components/ui/calendar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '../components/ui/chart'
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import { useSupabaseAppState } from '../hooks/useSupabaseAppState'
import { PDFExportService } from '../services/pdfExportService'
import { CSVExportService } from '../services/csvExportService'
import { cn } from '../lib/utils'
import { Page } from '../components/Page'

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
      label: 'This Month',
      range: {
        from: startOfMonth(today),
        to: endOfMonth(today)
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
  const { projects, timeEntries, clients, users, loading, error } = useSupabaseAppState()
  
  console.log('📊 Reports page data:', { 
    projects: projects.length, 
    timeEntries: timeEntries.length,
    clients: clients.length,
    users: users.length,
    loading,
    error 
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
    const entryDate = new Date(entry.date || entry.start_time || entry.startTime!)
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

  // Prepare chart data - Interactive Bar Chart style
  const chartData = useMemo(() => {
    const dateInterval = eachDayOfInterval({ start: dateRange.from, end: dateRange.to })
    
    return dateInterval.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd')
      const dayEntries = filteredEntries.filter(entry => entry.date === dateStr)
      
      // Group by project for the interactive chart
      const projectHours: { [key: string]: number } = {}
      dayEntries.forEach(entry => {
        const project = projects.find(p => p.id === entry.projectId)
        const projectName = project?.name || 'Unknown'
        projectHours[projectName] = (projectHours[projectName] || 0) + (entry.duration / 60)
      })
      
      return {
        date: format(date, 'yyyy-MM-dd'),
        ...projectHours
      }
    })
  }, [filteredEntries, dateRange, projects])

  // Create chart config based on available projects
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {}
    
    projects.forEach((project, index) => {
      config[project.name] = {
        label: project.name,
        color: `hsl(var(--chart-${(index % 5) + 1}))`,
      }
    })
    
    return config
  }, [projects]) satisfies ChartConfig

  // Calculate totals for the summary
  const totalDesktop = useMemo(() => {
    return chartData.reduce((acc, curr) => {
      return acc + Object.entries(curr)
        .filter(([key]) => key !== 'date')
        .reduce((sum, [, value]) => sum + (value as number), 0)
    }, 0)
  }, [chartData])

  return (
    <Page>
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

              {/* Colleague Dropdown */}
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
                  <div className="flex">
                    <div className="flex flex-col p-3 border-r">
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

      {/* Time Chart - Interactive Bar Chart */}
      <Card>
        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
          <div className="grid flex-1 gap-1 text-center sm:text-left">
            <CardTitle>Time Tracking Overview - Interactive</CardTitle>
            <CardDescription>
              Showing total hours logged for the selected period
            </CardDescription>
          </div>
          <div className="flex">
            {Object.entries(chartConfig).map(([key, config]) => (
              <div key={key} className="flex items-center gap-2 px-3">
                <div
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: config.color }}
                />
                <span className="text-xs text-muted-foreground">{config.label}</span>
                <span className="text-xs font-medium">
                  {chartData.reduce((acc, curr) => acc + ((curr[key] as number) || 0), 0).toFixed(1)}h
                </span>
              </div>
            ))}
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <BarChart
              accessibilityLayer
              data={chartData}
              margin={{
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    className="w-[150px]"
                    nameKey="hours"
                    labelFormatter={(value) => {
                      return new Date(value).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    }}
                  />
                }
              />
              {Object.keys(chartConfig).map((key) => (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId="a"
                  fill={`var(--color-${key})`}
                  radius={[0, 0, 4, 4]}
                />
              ))}
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              {formatDateRange(dateRange)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Entries</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEntries}</div>
            <p className="text-xs text-muted-foreground">
              Total logged entries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueProjects}</div>
            <p className="text-xs text-muted-foreground">
              Active projects
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Reports Content */}
      <Card>
        <CardHeader>
          <CardTitle>Time Entries Report</CardTitle>
          <CardDescription>
            Detailed breakdown of time entries for the selected period
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
            <div className="space-y-4">
              {filteredEntries.map((entry) => {
                const project = projects.find(p => p.id === entry.projectId)
                return (
                  <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: project?.color || '#gray' }}
                      />
                      <div>
                        <div className="font-medium">{project?.name || 'Unknown Project'}</div>
                        <div className="text-sm text-muted-foreground">
                          {entry.task || 'No task description'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(entry.date), 'MMM d, yyyy')} • 
                          {format(entry.startTime, 'HH:mm')} - {format(entry.endTime, 'HH:mm')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{(entry.duration / 60).toFixed(1)}h</div>
                      <div className="text-sm text-muted-foreground">{entry.duration}m</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </Page>
  )
}
