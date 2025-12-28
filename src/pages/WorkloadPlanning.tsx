import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { Page } from '../components/Page'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { Input } from '../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { FolderKanban, Users, ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronRightIcon, Plus, Edit2, Trash2 } from 'lucide-react'
import { usePermissions } from '../hooks/usePermissions'
import { useSupabaseAppState } from '../hooks/useSupabaseAppState'
import { supabase } from '../lib/supabase'
import { projectMembersService } from '../services/supabaseService'
import { cn } from '../lib/utils'
import { toast } from 'sonner'
import { TimeEntryBar } from '../components/TimeEntryBar'
import { useForecastDragAndDrop } from '../hooks/useForecastDragAndDrop'

interface PlannedEntry {
  id: string
  user_id: string
  project_id: string
  start_time: string
  end_time: string
  duration_minutes: number
  description?: string
}

export const ForecastPlanning: React.FC = () => {
  const { isAdmin, isManager } = usePermissions()
  const { projects, users, clients, createTimeEntry, updateTimeEntry, deleteTimeEntry } = useSupabaseAppState()
  
  // View state
  const [view, setView] = useState<'projects' | 'members'>('projects')
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set())
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set())
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  })

  // Planned entries state
  const [plannedEntries, setPlannedEntries] = useState<PlannedEntry[]>([])
  const [loadingEntries, setLoadingEntries] = useState(false)

  // Project members state
  const [projectMembers, setProjectMembers] = useState<Record<string, any[]>>({})

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<PlannedEntry | null>(null)
  const [modalData, setModalData] = useState<{
    projectId: string
    userId: string
    startDate: string
    endDate: string
    hours: string
    durationDays: number
    durationHours: number
  } | null>(null)

  // Loading state
  const [isCreating, setIsCreating] = useState(false)
  const [creationProgress, setCreationProgress] = useState(0)

  // Generate weeks (3 weeks view starting from current day)
  const weeks = useMemo(() => {
    const result = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]
    
    for (let weekOffset = 0; weekOffset < 3; weekOffset++) {
      const weekStart = new Date(currentWeekStart)
      weekStart.setDate(currentWeekStart.getDate() + weekOffset * 7)
      
      const days = []
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const date = new Date(weekStart)
        date.setDate(weekStart.getDate() + dayOffset)
        const dateStr = date.toISOString().split('T')[0]
        
        days.push({
          date: dateStr,
          dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
          dayNumber: date.getDate(),
          isWeekend: date.getDay() === 0 || date.getDay() === 6,
          isToday: dateStr === todayStr
        })
      }
      result.push(days)
    }
    return result
  }, [currentWeekStart])

  const allDays = weeks.flat()

  // Get active projects only
  const activeProjects = useMemo(() => 
    projects.filter(p => !p.is_archived && !p.archived),
    [projects]
  )

  // Group projects by client
  const projectsByClient = useMemo(() => {
    const grouped: Record<string, typeof activeProjects> = {}
    
    activeProjects.forEach(project => {
      const clientId = project.client_id || 'no-client'
      if (!grouped[clientId]) {
        grouped[clientId] = []
      }
      grouped[clientId].push(project)
    })
    
    return grouped
  }, [activeProjects])

  // Get active clients that have projects
  const activeClients = useMemo(() => {
    const clientIds = Object.keys(projectsByClient)
    return clients
      .filter(c => clientIds.includes(c.id) && c.is_active)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [clients, projectsByClient])

  // Load project members for all active projects
  useEffect(() => {
    loadProjectMembers()
  }, [activeProjects])

  const loadProjectMembers = async () => {
    try {
      const membersMap: Record<string, any[]> = {}
      
      for (const project of activeProjects) {
        const { data, error } = await projectMembersService.getProjectMembers(project.id)
        if (!error && data) {
          membersMap[project.id] = data.map(pm => ({
            id: pm.profiles.id,
            full_name: pm.profiles.full_name,
            email: pm.profiles.email,
            role: pm.role
          }))
        }
      }
      
      setProjectMembers(membersMap)
    } catch (error) {
      console.error('Error loading project members:', error)
    }
  }

  // Load planned entries for the visible date range
  useEffect(() => {
    loadPlannedEntries()
  }, [currentWeekStart])

  const loadPlannedEntries = async () => {
    setLoadingEntries(true)
    try {
      const startDate = new Date(currentWeekStart)
      const endDate = new Date(currentWeekStart)
      endDate.setDate(endDate.getDate() + 21) // 3 weeks

      console.log('Loading planned entries for date range:', {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      })

      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('entry_type', 'planned')
        .gte('start_time', startDate.toISOString())
        .lt('start_time', endDate.toISOString())
        .order('start_time', { ascending: true })

      if (error) {
        console.error('Error loading planned entries:', error)
      } else {
        console.log('Loaded planned entries:', data?.length, 'entries')
        console.log('Entries:', data)
        setPlannedEntries(data || [])
      }
    } catch (error) {
      console.error('Error loading planned entries:', error)
    } finally {
      setLoadingEntries(false)
    }
  }

  // Initialize drag and drop hook
  const {
    dragState,
    dragOccurred,
    handleMouseDown,
    handleMouseEnter,
    getDragPreview
  } = useForecastDragAndDrop({
    allDays,
    onCreateEntry: (data) => {
      setModalData({
        projectId: data.projectId,
        userId: data.userId,
        startDate: data.startDate,
        endDate: data.endDate,
        hours: String(data.durationHours || 8),
        durationDays: data.durationDays,
        durationHours: data.durationHours
      })
      setIsCreateModalOpen(true)
    },
    onUpdateEntry: async (entryId, data) => {
      try {
        await updateTimeEntry(entryId, data)
        toast.success('Entry updated')
        await loadPlannedEntries()
      } catch (error) {
        toast.error('Failed to update entry')
      }
    }
  })

  // Helper to get entries for a specific row (project/user combo)
  const getEntriesForRow = useCallback((projectId?: string, userId?: string): PlannedEntry[] => {
    return plannedEntries.filter(entry => {
      if (projectId && entry.project_id !== projectId) return false
      if (userId && entry.user_id !== userId) return false
      return true
    })
  }, [plannedEntries])

  // Helper to get project members
  const getProjectMembers = useCallback((projectId: string) => {
    // Return members from project_members table
    return projectMembers[projectId] || []
  }, [projectMembers])

  // Helper to get projects for a member
  const getMemberProjects = useCallback((memberId: string) => {
    // Find all projects where this member is assigned
    const memberProjectIds = Object.entries(projectMembers)
      .filter(([_, members]) => members.some(m => m.id === memberId))
      .map(([projectId]) => projectId)
    
    return activeProjects.filter(p => memberProjectIds.includes(p.id))
  }, [projectMembers, activeProjects])

  // Navigation
  const goToPreviousWeek = () => {
    const newStart = new Date(currentWeekStart)
    newStart.setDate(newStart.getDate() - 7)
    setCurrentWeekStart(newStart)
  }

  const goToNextWeek = () => {
    const newStart = new Date(currentWeekStart)
    newStart.setDate(newStart.getDate() + 7)
    setCurrentWeekStart(newStart)
  }

  const goToToday = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    setCurrentWeekStart(today)
  }

  // Client accordion toggle
  const toggleClient = (clientId: string) => {
    setExpandedClients(prev => {
      const next = new Set(prev)
      if (next.has(clientId)) {
        next.delete(clientId)
      } else {
        next.add(clientId)
      }
      return next
    })
  }

  // Project accordion toggle
  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return next
    })
  }

  // Member accordion toggle
  const toggleMember = (memberId: string) => {
    setExpandedMembers(prev => {
      const next = new Set(prev)
      if (next.has(memberId)) {
        next.delete(memberId)
      } else {
        next.add(memberId)
      }
      return next
    })
  }

  // Expand all clients, projects, and members by default on load
  useEffect(() => {
    const allClientIds = activeClients.map(c => c.id)
    setExpandedClients(new Set(allClientIds))
    const allProjectIds = activeProjects.map(p => p.id)
    setExpandedProjects(new Set(allProjectIds))
    const allMemberIds = users.map(u => u.id)
    setExpandedMembers(new Set(allMemberIds))
  }, [activeClients, activeProjects, users])

  // Calculate total scheduled hours
  const getTotalScheduledHours = (projectId?: string, userId?: string): number => {
    const filtered = plannedEntries.filter(entry => {
      if (projectId && entry.project_id !== projectId) return false
      if (userId && entry.user_id !== userId) return false
      return true
    })
    
    const totalMinutes = filtered.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0)
    return Math.round(totalMinutes / 60 * 10) / 10 // Round to 1 decimal
  }

  // Handle entry click for editing
  const handleEntryClick = (entry: PlannedEntry) => {
    if (dragOccurred.current) {
      dragOccurred.current = false
      return
    }
    
    setEditingEntry(entry)
    setModalData({
      projectId: entry.project_id,
      userId: entry.user_id,
      startDate: entry.start_time,
      endDate: entry.end_time,
      hours: String(Math.round(entry.duration_minutes / 60 * 10) / 10),
      durationDays: 0,
      durationHours: 0
    })
    setIsEditModalOpen(true)
  }

  // Handle create entry
  const handleCreateEntry = async () => {
    if (!modalData) {
      console.error('No modalData')
      return
    }
    
    try {
      const hours = parseFloat(modalData.hours)
      if (isNaN(hours) || hours <= 0) {
        toast.error('Please enter valid hours')
        return
      }
      
      // Close the input modal and show loading modal
      setIsCreateModalOpen(false)
      setIsCreating(true)
      setCreationProgress(0)
      
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setCreationProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 100)
      
      const durationMinutes = hours * 60
      
      console.log('Creating time entry with:', {
        user_id: modalData.userId,
        project_id: modalData.projectId,
        start_time: modalData.startDate,
        end_time: modalData.endDate,
        duration_minutes: durationMinutes,
        entry_type: 'planned'
      })
      
      setCreationProgress(50)
      
      const result = await createTimeEntry({
        user_id: modalData.userId,
        project_id: modalData.projectId,
        start_time: modalData.startDate,
        end_time: modalData.endDate,
        duration_minutes: durationMinutes,
        description: 'Planned work',
        is_billable: true,
        entry_type: 'planned'
      })
      
      clearInterval(progressInterval)
      setCreationProgress(70)
      
      console.log('Create result:', result)
      
      if (!result) {
        console.error('CreateTimeEntry returned null')
        setIsCreating(false)
        setCreationProgress(0)
        toast.error('Failed to create entry - check console for details')
        return
      }
      
      setCreationProgress(85)
      
      // Reload entries
      await loadPlannedEntries()
      
      setCreationProgress(100)
      
      // Show completion briefly before hiding
      setTimeout(() => {
        setIsCreating(false)
        setCreationProgress(0)
        setModalData(null)
        toast.success('Planned entry created')
      }, 300)
      
    } catch (error) {
      console.error('Error creating entry (catch block):', error)
      setIsCreating(false)
      setCreationProgress(0)
      if (error instanceof Error) {
        toast.error(`Failed to create entry: ${error.message}`)
      } else {
        toast.error('Failed to create entry - unknown error')
      }
    }
  }

  // Handle update entry
  const handleUpdateEntry = async () => {
    if (!editingEntry || !modalData) return
    
    try {
      const hours = parseFloat(modalData.hours)
      if (isNaN(hours) || hours <= 0) {
        toast.error('Please enter valid hours')
        return
      }
      
      const durationMinutes = hours * 60
      
      // Calculate new end time based on start time and new duration
      const startTime = new Date(modalData.startDate)
      const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000)
      
      await updateTimeEntry(editingEntry.id, {
        project_id: modalData.projectId,
        user_id: modalData.userId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_minutes: durationMinutes
      })
      
      toast.success('Entry updated')
      setIsEditModalOpen(false)
      setEditingEntry(null)
      setModalData(null)
      await loadPlannedEntries()
    } catch (error) {
      console.error('Error updating entry:', error)
      toast.error('Failed to update entry')
    }
  }

  // Handle delete entry
  const handleDeleteEntry = async () => {
    if (!editingEntry) return
    
    try {
      await deleteTimeEntry(editingEntry.id)
      toast.success('Entry deleted')
      setIsEditModalOpen(false)
      setEditingEntry(null)
      setModalData(null)
      await loadPlannedEntries()
    } catch (error) {
      toast.error('Failed to delete entry')
    }
  }

  // Render entry bars for a row
  const renderEntryBars = (projectId?: string, userId?: string, rowKey?: string) => {
    const entries = getEntriesForRow(projectId, userId)
    const project = projectId ? projects.find(p => p.id === projectId) : null
    
    return entries.map(entry => {
      const startDate = entry.start_time.split('T')[0]
      const endDate = entry.end_time.split('T')[0]
      
      const startIdx = allDays.findIndex(d => d.date === startDate)
      const endIdx = allDays.findIndex(d => d.date === endDate)
      
      if (startIdx === -1 || endIdx === -1) return null
      
      const projectColor = project?.color || projects.find(p => p.id === entry.project_id)?.color || '#3f69dc'
      const projectName = project?.name || projects.find(p => p.id === entry.project_id)?.name || 'Unknown'
      
      return (
        <TimeEntryBar
          key={entry.id}
          entry={entry}
          projectColor={projectColor}
          projectName={projectName}
          mode="forecast"
          style={{
            left: `${startIdx * 80}px`,
            width: `${(endIdx - startIdx + 1) * 80}px`
          }}
          onMouseDown={(e) => handleMouseDown(e, startDate, projectId, userId, entry)}
          onClick={() => handleEntryClick(entry)}
        />
      )
    })
  }

  // Render drag preview
  const renderDragPreview = (rowKey: string) => {
    const preview = getDragPreview()
    if (!preview || preview.rowKey !== rowKey) return null
    
    return (
      <div
        className="absolute inset-y-1 bg-primary/30 border-2 border-primary rounded pointer-events-none"
        style={{
          left: `${preview.startIdx * 80}px`,
          width: `${(preview.endIdx - preview.startIdx + 1) * 80}px`,
          zIndex: 10
        }}
      />
    )
  }

  // Redirect non-managers/non-admins
  if (!isAdmin && !isManager) {
    return (
      <Page title="Forecast" subtitle="Access Denied">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">You don't have permission to access this page.</p>
          </CardContent>
        </Card>
      </Page>
    )
  }

  return (
    <Page 
      title="Forecast" 
      subtitle="Plan and allocate team resources across projects"
    >
      <div className="space-y-6">
        {/* View Tabs and Navigation Controls */}
        <div className="flex items-center justify-between">
          <Tabs value={view} onValueChange={(v) => setView(v as 'projects' | 'members')}>
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="projects" className="flex items-center gap-2">
                <FolderKanban className="h-4 w-4" />
                By Project
              </TabsTrigger>
              <TabsTrigger value="members" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                By Team Member
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={goToNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium ml-2">
              {currentWeekStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Tabs Content */}
        <Tabs value={view} onValueChange={(v) => setView(v as 'projects' | 'members')}>
          <div className="hidden">
            <TabsList>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
            </TabsList>
          </div>

          {/* Projects View */}
          <TabsContent value="projects" className="mt-0">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-auto h-[calc(100vh-120px)]">
                  <table className="w-full border-collapse">
                    <thead className="sticky top-0 z-20">
                      <tr className="border-b bg-muted/50">
                        <th className="sticky left-0 z-30 bg-muted/50 px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">
                          Project
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-semibold border-r-2 border-border bg-muted/50 w-20">
                          <div className="leading-tight">
                            Total<br/>Scheduled
                          </div>
                        </th>
                        {weeks.map((week, weekIdx) => (
                          <React.Fragment key={weekIdx}>
                            {week.map((day, dayIdx) => (
                              <th
                                key={day.date}
                                className={cn(
                                  "px-2 py-3 text-center text-xs font-medium relative bg-muted/50",
                                  "w-[80px] min-w-[80px] max-w-[80px]",
                                  day.isWeekend && "bg-muted/70",
                                  day.isToday && "bg-primary/20",
                                  dayIdx === 0 && weekIdx > 0 && "border-l-2 border-border"
                                )}
                              >
                                <div className={cn(day.isToday && "text-primary font-semibold")}>{day.dayName}</div>
                                <div className={cn("text-muted-foreground", day.isToday && "text-primary font-semibold")}>{day.dayNumber}</div>
                                {day.isToday && (
                                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                                )}
                              </th>
                            ))}
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activeClients.map((client) => {
                        const isClientExpanded = expandedClients.has(client.id)
                        const clientProjects = projectsByClient[client.id] || []
                        
                        // Calculate total scheduled hours for all projects under this client
                        const clientTotalScheduled = clientProjects.reduce((sum, project) => {
                          return sum + getTotalScheduledHours(project.id, undefined)
                        }, 0)
                        
                        return (
                          <React.Fragment key={client.id}>
                            {/* Client Row */}
                            <tr className="border-b bg-muted/30 hover:bg-muted/40">
                              <td 
                                className="sticky left-0 z-10 bg-muted/30 px-4 py-3 text-sm font-semibold border-r cursor-pointer whitespace-nowrap"
                                onClick={() => toggleClient(client.id)}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-foreground">{client.name}</span>
                                    <span className="text-xs text-muted-foreground">({clientProjects.length} projects)</span>
                                  </div>
                                  {isClientExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  ) : (
                                    <ChevronRightIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-3 text-center text-sm font-semibold border-r-2 border-border bg-muted/30">
                                {clientTotalScheduled > 0 ? `${clientTotalScheduled}h` : '-'}
                              </td>
                              {/* Empty day cells for client row */}
                              <td colSpan={21} className="p-0 bg-muted/30" style={{ height: '48px' }}>
                                <div className="flex h-full">
                                  {weeks.map((week, weekIdx) => (
                                    <React.Fragment key={weekIdx}>
                                      {week.map((day, dayIdx) => (
                                        <div
                                          key={day.date}
                                          className={cn(
                                            "flex-shrink-0 border-r",
                                            "w-[80px] min-w-[80px] max-w-[80px]",
                                            day.isWeekend && "bg-muted/40",
                                            dayIdx === 0 && weekIdx > 0 && "border-l-2 border-border"
                                          )}
                                        />
                                      ))}
                                    </React.Fragment>
                                  ))}
                                </div>
                              </td>
                            </tr>

                            {/* Expanded Projects under Client */}
                            {isClientExpanded && clientProjects.map((project) => {
                              const totalScheduled = getTotalScheduledHours(project.id, undefined)
                              const isProjectExpanded = expandedProjects.has(project.id)
                              const members = getProjectMembers(project.id)
                              
                              return (
                                <React.Fragment key={project.id}>
                                  {/* Project Row */}
                                  <tr className="border-b hover:bg-muted/20">
                                    <td 
                                      className="sticky left-0 z-10 bg-background px-4 py-3 text-sm font-medium border-r cursor-pointer whitespace-nowrap"
                                      onClick={() => toggleProject(project.id)}
                                    >
                                      <div className="flex items-center justify-between gap-2 pl-4">
                                        <div className="flex items-center gap-2">
                                          <div
                                            className="h-3 w-3 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: project.color }}
                                          />
                                          <span>{project.name}</span>
                                        </div>
                                        {isProjectExpanded ? (
                                          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        ) : (
                                          <ChevronRightIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-3 py-3 text-center text-sm font-semibold border-r-2 border-border bg-muted/20">
                                      {totalScheduled > 0 ? `${totalScheduled}h` : '-'}
                                    </td>
                                    {/* Day cells with drag-and-drop */}
                                    <td colSpan={21} className="p-0 relative" style={{ height: '48px' }}>
                                      <div className="absolute inset-0 flex">
                                        {weeks.map((week, weekIdx) => (
                                          <React.Fragment key={weekIdx}>
                                            {week.map((day, dayIdx) => (
                                              <div
                                                key={day.date}
                                                className={cn(
                                                  "flex-shrink-0 border-r cursor-pointer hover:bg-muted/30",
                                                  "w-[80px] min-w-[80px] max-w-[80px]",
                                                  day.isWeekend && "bg-muted/20",
                                                  dayIdx === 0 && weekIdx > 0 && "border-l-2 border-border"
                                                )}
                                                onMouseDown={(e) => handleMouseDown(e, day.date, project.id, undefined)}
                                                onMouseEnter={() => handleMouseEnter(day.date, project.id, undefined)}
                                              />
                                            ))}
                                          </React.Fragment>
                                        ))}
                                        {/* Render entry bars */}
                                        {renderEntryBars(project.id, undefined, `${project.id}___none`)}
                                        {/* Render drag preview */}
                                        {renderDragPreview(`${project.id}___none`)}
                                      </div>
                                    </td>
                                  </tr>

                                  {/* Expanded member rows */}
                                  {isProjectExpanded && members.map((member) => {
                                    const memberTotalScheduled = getTotalScheduledHours(project.id, member.id)
                                    
                                    return (
                                      <tr key={`${project.id}-${member.id}`} className="border-b hover:bg-muted/20 bg-muted/5">
                                        <td className="sticky left-0 z-10 bg-muted/5 px-4 py-2 text-sm border-r whitespace-nowrap">
                                          <div className="flex items-center gap-2 pl-10">
                                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                                              {member.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
                                            </div>
                                            <span className="text-muted-foreground">{member.full_name}</span>
                                          </div>
                                        </td>
                                        <td className="px-3 py-2 text-center text-sm font-medium border-r-2 border-border bg-muted/10">
                                          {memberTotalScheduled > 0 ? `${memberTotalScheduled}h` : '-'}
                                        </td>
                                        {/* Day cells with drag-and-drop */}
                                        <td colSpan={21} className="p-0 relative" style={{ height: '40px' }}>
                                          <div className="absolute inset-0 flex">
                                            {weeks.map((week, weekIdx) => (
                                              <React.Fragment key={weekIdx}>
                                                {week.map((day, dayIdx) => (
                                                  <div
                                                    key={day.date}
                                                    className={cn(
                                                      "flex-shrink-0 border-r cursor-pointer hover:bg-muted/30",
                                                      "w-[80px] min-w-[80px] max-w-[80px]",
                                                      day.isWeekend && "bg-muted/20",
                                                      dayIdx === 0 && weekIdx > 0 && "border-l-2 border-border"
                                                    )}
                                                    onMouseDown={(e) => handleMouseDown(e, day.date, project.id, member.id)}
                                                    onMouseEnter={() => handleMouseEnter(day.date, project.id, member.id)}
                                                  />
                                                ))}
                                              </React.Fragment>
                                            ))}
                                            {/* Render entry bars */}
                                            {renderEntryBars(project.id, member.id, `${project.id}___${member.id}`)}
                                            {/* Render drag preview */}
                                            {renderDragPreview(`${project.id}___${member.id}`)}
                                          </div>
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </React.Fragment>
                              )
                            })}
                          </React.Fragment>
                        )
                      })}
                      {activeClients.length === 0 && (
                        <tr>
                          <td colSpan={23} className="py-8 text-center text-muted-foreground">
                            No active clients with projects found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Members View */}
          <TabsContent value="members" className="mt-0">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-auto h-[calc(100vh-120px)]">
                  <table className="w-full border-collapse">
                    <thead className="sticky top-0 z-20">
                      <tr className="border-b bg-muted/50">
                        <th className="sticky left-0 z-30 bg-muted/50 px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">
                          Team Member
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-semibold border-r-2 border-border bg-muted/50 w-20">
                          <div className="leading-tight">
                            Total<br/>Scheduled
                          </div>
                        </th>
                        {weeks.map((week, weekIdx) => (
                          <React.Fragment key={weekIdx}>
                            {week.map((day, dayIdx) => (
                              <th
                                key={day.date}
                                className={cn(
                                  "px-2 py-3 text-center text-xs font-medium relative bg-muted/50",
                                  "w-[80px] min-w-[80px] max-w-[80px]",
                                  day.isWeekend && "bg-muted/70",
                                  day.isToday && "bg-primary/20",
                                  dayIdx === 0 && weekIdx > 0 && "border-l-2 border-border"
                                )}
                              >
                                <div className={cn(day.isToday && "text-primary font-semibold")}>{day.dayName}</div>
                                <div className={cn("text-muted-foreground", day.isToday && "text-primary font-semibold")}>{day.dayNumber}</div>
                                {day.isToday && (
                                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                                )}
                              </th>
                            ))}
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((member) => {
                        const totalScheduled = getTotalScheduledHours(undefined, member.id)
                        const isMemberExpanded = expandedMembers.has(member.id)
                        const memberProjects = getMemberProjects(member.id)
                        
                        return (
                          <React.Fragment key={member.id}>
                            {/* Member Row */}
                            <tr className="border-b bg-muted/30 hover:bg-muted/40">
                              <td 
                                className="sticky left-0 z-10 bg-muted/30 px-4 py-3 text-sm font-semibold border-r cursor-pointer whitespace-nowrap"
                                onClick={() => toggleMember(member.id)}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                                      {member.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
                                    </div>
                                    <span>{member.full_name}</span>
                                    <span className="text-xs text-muted-foreground">({memberProjects.length} projects)</span>
                                  </div>
                                  {isMemberExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  ) : (
                                    <ChevronRightIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-3 text-center text-sm font-semibold border-r-2 border-border bg-muted/30">
                                {totalScheduled > 0 ? `${totalScheduled}h` : '-'}
                              </td>
                              {/* Empty day cells for member row */}
                              <td colSpan={21} className="p-0 bg-muted/30" style={{ height: '48px' }}>
                                <div className="flex h-full">
                                  {weeks.map((week, weekIdx) => (
                                    <React.Fragment key={weekIdx}>
                                      {week.map((day, dayIdx) => (
                                        <div
                                          key={day.date}
                                          className={cn(
                                            "flex-shrink-0 border-r",
                                            "w-[80px] min-w-[80px] max-w-[80px]",
                                            day.isWeekend && "bg-muted/40",
                                            dayIdx === 0 && weekIdx > 0 && "border-l-2 border-border"
                                          )}
                                        />
                                      ))}
                                    </React.Fragment>
                                  ))}
                                </div>
                              </td>
                            </tr>

                            {/* Expanded Project rows under Member */}
                            {isMemberExpanded && memberProjects.map((project) => {
                              const projectTotalScheduled = getTotalScheduledHours(project.id, member.id)
                              
                              return (
                                <tr key={`${member.id}-${project.id}`} className="border-b hover:bg-muted/20 bg-muted/5">
                                  <td className="sticky left-0 z-10 bg-muted/5 px-4 py-2 text-sm border-r whitespace-nowrap">
                                    <div className="flex items-center gap-2 pl-6">
                                      <div
                                        className="h-3 w-3 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: project.color }}
                                      />
                                      <span className="text-muted-foreground">{project.name}</span>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 text-center text-sm font-medium border-r-2 border-border bg-muted/10">
                                    {projectTotalScheduled > 0 ? `${projectTotalScheduled}h` : '-'}
                                  </td>
                                  {/* Day cells with drag-and-drop */}
                                  <td colSpan={21} className="p-0 relative" style={{ height: '40px' }}>
                                    <div className="absolute inset-0 flex">
                                      {weeks.map((week, weekIdx) => (
                                        <React.Fragment key={weekIdx}>
                                          {week.map((day, dayIdx) => (
                                            <div
                                              key={day.date}
                                              className={cn(
                                                "flex-shrink-0 border-r cursor-pointer hover:bg-muted/30",
                                                "w-[80px] min-w-[80px] max-w-[80px]",
                                                day.isWeekend && "bg-muted/20",
                                                dayIdx === 0 && weekIdx > 0 && "border-l-2 border-border"
                                              )}
                                              onMouseDown={(e) => handleMouseDown(e, day.date, project.id, member.id)}
                                              onMouseEnter={() => handleMouseEnter(day.date, project.id, member.id)}
                                            />
                                          ))}
                                        </React.Fragment>
                                      ))}
                                      {/* Render entry bars */}
                                      {renderEntryBars(project.id, member.id, `${project.id}___${member.id}`)}
                                      {/* Render drag preview */}
                                      {renderDragPreview(`${project.id}___${member.id}`)}
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </React.Fragment>
                        )
                      })}
                      {users.length === 0 && (
                        <tr>
                          <td colSpan={23} className="py-8 text-center text-muted-foreground">
                            No team members found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Entry Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Planned Entry</DialogTitle>
            <DialogDescription>
              Add a new planned work allocation
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Time Window */}
            <div className="space-y-2">
              <Label>Selected Time Window</Label>
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm">
                  <span className="font-medium">From:</span>{' '}
                  {modalData?.startDate ? new Date(modalData.startDate).toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  }) : '-'}
                </p>
                <p className="text-sm mt-1">
                  <span className="font-medium">To:</span>{' '}
                  {modalData?.endDate ? new Date(modalData.endDate).toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  }) : '-'}
                </p>
              </div>
            </div>

            {/* Hours Input */}
            <div className="space-y-2">
              <Label htmlFor="hours">Total Hours *</Label>
              <Input
                id="hours"
                type="number"
                min="0.5"
                max="1000"
                step="0.5"
                value={modalData?.hours || ''}
                onChange={(e) => setModalData(prev => prev ? { ...prev, hours: e.target.value } : null)}
              />
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateEntry}
              disabled={!modalData?.projectId || !modalData?.userId}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Entry Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Work Allocation</DialogTitle>
            <DialogDescription>
              Update or delete this planned entry
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Project */}
            <div className="space-y-2">
              <Label htmlFor="edit-project">Project *</Label>
              <Select 
                value={modalData?.projectId || ''} 
                onValueChange={(value) => setModalData(prev => prev ? { ...prev, projectId: value } : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project..." />
                </SelectTrigger>
                <SelectContent>
                  {activeProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: project.color }}
                        />
                        {project.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* User */}
            <div className="space-y-2">
              <Label htmlFor="edit-user">Team Member *</Label>
              <Select 
                value={modalData?.userId || ''} 
                onValueChange={(value) => setModalData(prev => prev ? { ...prev, userId: value } : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team member..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Hours */}
            <div className="space-y-2">
              <Label htmlFor="edit-hours">Hours *</Label>
              <Input
                id="edit-hours"
                type="number"
                min="0.5"
                max="1000"
                step="0.5"
                value={modalData?.hours || ''}
                onChange={(e) => setModalData(prev => prev ? { ...prev, hours: e.target.value } : null)}
              />
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <Button 
              variant="destructive" 
              onClick={handleDeleteEntry}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateEntry}
                disabled={!modalData?.projectId || !modalData?.userId}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Update
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Loading Modal */}
      <Dialog open={isCreating} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              Creating entry...
            </DialogTitle>
            <DialogDescription>
              Please wait while we create your planned time entry
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold text-primary">{Math.round(creationProgress)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${creationProgress}%` }}
                />
              </div>
            </div>

            {/* Status messages */}
            <div className="mt-4 text-sm text-muted-foreground">
              {creationProgress < 50 && "Preparing entry..."}
              {creationProgress >= 50 && creationProgress < 70 && "Saving to database..."}
              {creationProgress >= 70 && creationProgress < 85 && "Updating forecast..."}
              {creationProgress >= 85 && creationProgress < 100 && "Almost done..."}
              {creationProgress === 100 && "✓ Complete!"}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  )
}


