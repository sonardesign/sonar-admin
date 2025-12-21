import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { Page } from '../components/Page'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { Input } from '../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { FolderKanban, Users, Plus, ChevronLeft, ChevronRight, Edit2, Trash2, ChevronDown, ChevronRight as ChevronRightIcon } from 'lucide-react'
import { usePermissions } from '../hooks/usePermissions'
import { useSupabaseAppState } from '../hooks/useSupabaseAppState'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { cn } from '../lib/utils'

interface PlannedEntry {
  id: string
  user_id: string
  project_id: string
  start_time: string
  end_time: string
  duration_minutes: number
  description?: string
}

interface DragState {
  isDragging: boolean
  type: 'create' | 'move' | 'resize-left' | 'resize-right' | null
  rowKey: string | null // projectId-userId combination
  startDate: string | null
  endDate: string | null
  entry: PlannedEntry | null
}

export const ForecastPlanning: React.FC = () => {
  const { user } = useAuth()
  const { isAdmin, isManager } = usePermissions()
  const { projects, users, timeEntries, createTimeEntry, updateTimeEntry, deleteTimeEntry } = useSupabaseAppState()
  
  // View state
  const [view, setView] = useState<'projects' | 'members'>('projects')
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1) // Adjust to Monday
    const monday = new Date(today.setDate(diff))
    monday.setHours(0, 0, 0, 0)
    return monday
  })

  // Planned entries state
  const [plannedEntries, setPlannedEntries] = useState<PlannedEntry[]>([])
  const [loadingEntries, setLoadingEntries] = useState(false)

  // Generate weeks (3 weeks view)
  const weeks = useMemo(() => {
    const result = []
    for (let weekOffset = 0; weekOffset < 3; weekOffset++) {
      const weekStart = new Date(currentWeekStart)
      weekStart.setDate(currentWeekStart.getDate() + weekOffset * 7)
      
      const days = []
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const date = new Date(weekStart)
        date.setDate(weekStart.getDate() + dayOffset)
        days.push({
          date: date.toISOString().split('T')[0],
          dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
          dayNumber: date.getDate(),
          isWeekend: date.getDay() === 0 || date.getDay() === 6
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
        setPlannedEntries(data || [])
      }
    } catch (error) {
      console.error('Error loading planned entries:', error)
    } finally {
      setLoadingEntries(false)
    }
  }

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
    return users.filter(user => {
      // Check if user has any entries for this project
      return plannedEntries.some(entry => 
        entry.project_id === projectId && entry.user_id === user.id
      )
    })
  }, [users, plannedEntries])

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
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(today.setDate(diff))
    monday.setHours(0, 0, 0, 0)
    setCurrentWeekStart(monday)
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

  // Expand all clients by default on load
  useEffect(() => {
    const allProjectIds = activeProjects.map(p => p.id)
    setExpandedProjects(new Set(allProjectIds))
  }, [activeProjects])

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

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent, date: string, projectId?: string, userId?: string, entry?: PlannedEntry) => {
    e.preventDefault()
    
    const rowKey = `${projectId || 'none'}-${userId || 'none'}`
    
    if (entry) {
      // Check if clicking near edges for resize
      const target = e.currentTarget as HTMLElement
      const rect = target.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const isLeftEdge = clickX < 8
      const isRightEdge = clickX > rect.width - 8
      
      if (isLeftEdge) {
        setDragState({
          isDragging: true,
          type: 'resize-left',
          rowKey,
          startDate: entry.start_time.split('T')[0],
          endDate: entry.end_time.split('T')[0],
          entry
        })
      } else if (isRightEdge) {
        setDragState({
          isDragging: true,
          type: 'resize-right',
          rowKey,
          startDate: entry.start_time.split('T')[0],
          endDate: entry.end_time.split('T')[0],
          entry
        })
      } else {
        setDragState({
          isDragging: true,
          type: 'move',
          rowKey,
          startDate: date,
          endDate: date,
          entry
        })
      }
    } else {
      // Creating new entry
      setDragState({
        isDragging: true,
        type: 'create',
        rowKey,
        startDate: date,
        endDate: date,
        entry: null
      })
    }
    
    dragOccurred.current = false
  }

  const handleMouseEnter = (date: string, projectId?: string, userId?: string) => {
    if (!dragState.isDragging) return
    
    const rowKey = `${projectId || 'none'}-${userId || 'none'}`
    
    // Only update if we're in the same row
    if (dragState.rowKey === rowKey) {
      dragOccurred.current = true
      
      if (dragState.type === 'create') {
        setDragState(prev => ({ ...prev, endDate: date }))
      } else if (dragState.type === 'move' && dragState.entry) {
        // Calculate offset
        const startIdx = allDays.findIndex(d => d.date === dragState.startDate)
        const currentIdx = allDays.findIndex(d => d.date === date)
        const offset = currentIdx - startIdx
        
        const entryStartIdx = allDays.findIndex(d => d.date === dragState.entry.start_time.split('T')[0])
        const entryEndIdx = allDays.findIndex(d => d.date === dragState.entry.end_time.split('T')[0])
        const duration = entryEndIdx - entryStartIdx
        
        const newStartIdx = entryStartIdx + offset
        const newEndIdx = newStartIdx + duration
        
        if (newStartIdx >= 0 && newEndIdx < allDays.length) {
          setDragState(prev => ({
            ...prev,
            startDate: allDays[newStartIdx].date,
            endDate: allDays[newEndIdx].date
          }))
        }
      } else if (dragState.type === 'resize-left') {
        setDragState(prev => ({ ...prev, startDate: date }))
      } else if (dragState.type === 'resize-right') {
        setDragState(prev => ({ ...prev, endDate: date }))
      }
    }
  }

  const handleMouseUp = async () => {
    if (!dragState.isDragging) return
    
    const { type, startDate, endDate, entry, rowKey } = dragState
    
    if (!startDate || !endDate || !rowKey) {
      setDragState({
        isDragging: false,
        type: null,
        rowKey: null,
        startDate: null,
        endDate: null,
        entry: null
      })
      return
    }
    
    // Parse rowKey
    const [projectId, userId] = rowKey.split('-').map(s => s === 'none' ? undefined : s)
    
    // Ensure dates are in correct order
    const start = new Date(startDate)
    const end = new Date(endDate)
    const orderedStart = start < end ? start : end
    const orderedEnd = start < end ? end : start
    
    // Set times
    orderedStart.setHours(9, 0, 0, 0)
    orderedEnd.setHours(17, 0, 0, 0)
    
    const durationMs = orderedEnd.getTime() - orderedStart.getTime()
    const durationMinutes = Math.round(durationMs / (1000 * 60))
    const durationDays = Math.ceil(durationMinutes / (24 * 60))
    const durationHours = Math.round((durationMinutes % (24 * 60)) / 60)
    
    try {
      if (type === 'create') {
        // Open modal for new entry creation
        if (!projectId || !userId) {
          toast.error('Please select a project and user')
          setDragState({
            isDragging: false,
            type: null,
            rowKey: null,
            startDate: null,
            endDate: null,
            entry: null
          })
          return
        }
        
        // Store the temporary entry data and open modal
        console.log('Opening modal with data:', {
          projectId,
          userId,
          durationDays,
          durationHours,
          durationMinutes
        })
        
        setSelectedCell({
          date: orderedStart.toISOString().split('T')[0],
          projectId,
          userId,
          startDate: orderedStart.toISOString(),
          endDate: orderedEnd.toISOString(),
          durationDays,
          durationHours
        })
        setEntryForm({
          projectId: projectId || '',
          userId: userId || '',
          hours: String(Math.round(durationMinutes / 60))
        })
        
        console.log('Form data set to:', {
          projectId: projectId || '',
          userId: userId || '',
          hours: String(Math.round(durationMinutes / 60))
        })
        
        setIsAddEntryOpen(true)
        console.log('Modal should be open now')
        
      } else if (type === 'move' && entry) {
        // Move existing entry
        await updateTimeEntry(entry.id, {
          start_time: orderedStart.toISOString(),
          end_time: orderedEnd.toISOString(),
          duration_minutes: durationMinutes
        })
        
        toast.success('Entry moved')
        await loadPlannedEntries()
      } else if ((type === 'resize-left' || type === 'resize-right') && entry) {
        // Resize existing entry
        await updateTimeEntry(entry.id, {
          start_time: orderedStart.toISOString(),
          end_time: orderedEnd.toISOString(),
          duration_minutes: durationMinutes
        })
        
        toast.success('Entry resized')
        await loadPlannedEntries()
      }
    } catch (error) {
      console.error('Error updating entry:', error)
      notifications.error('Failed to update entry')
    }
    
    setDragState({
      isDragging: false,
      type: null,
      rowKey: null,
      startDate: null,
      endDate: null,
      entry: null
    })
  }

  useEffect(() => {
    if (dragState.isDragging) {
      document.body.classList.add('is-dragging')
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.body.classList.remove('is-dragging')
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [dragState])

  // Handle entry click (for edit modal) - only if not dragging
  const handleEntryClick = (entry: PlannedEntry) => {
    if (dragOccurred.current) {
      dragOccurred.current = false
      return
    }
    
    setEditingEntry(entry)
    setEntryForm({
      projectId: entry.project_id,
      userId: entry.user_id,
      hours: String(Math.round(entry.duration_minutes / 60 * 10) / 10)
    })
    setIsEditEntryOpen(true)
  }

  const handleUpdateEntry = async () => {
    if (!editingEntry) return
    
    try {
      const hours = parseFloat(entryForm.hours)
      const durationMinutes = hours * 60
      
      await updateTimeEntry(editingEntry.id, {
        project_id: entryForm.projectId,
        user_id: entryForm.userId,
        duration_minutes: durationMinutes
      })
      
      toast.success('Entry updated')
      setIsEditEntryOpen(false)
      await loadPlannedEntries()
    } catch (error) {
      notifications.error('Failed to update entry')
    }
  }

  const handleAddEntry = async () => {
    console.log('handleAddEntry called', { selectedCell, entryForm })
    
    if (!selectedCell) {
      console.error('No selectedCell')
      return
    }
    
    if (!entryForm.projectId || !entryForm.userId) {
      console.error('Missing projectId or userId', entryForm)
      toast.error('Project and user are required')
      return
    }
    
    try {
      const hours = parseFloat(entryForm.hours)
      if (isNaN(hours) || hours <= 0) {
        toast.error('Please enter valid hours')
        return
      }
      
      const durationMinutes = hours * 60
      
      console.log('Creating time entry with:', {
        user_id: entryForm.userId,
        project_id: entryForm.projectId,
        start_time: selectedCell.startDate,
        end_time: selectedCell.endDate,
        duration_minutes: durationMinutes
      })
      
      await createTimeEntry({
        user_id: entryForm.userId,
        project_id: entryForm.projectId,
        start_time: selectedCell.startDate!,
        end_time: selectedCell.endDate!,
        duration_minutes: durationMinutes,
        description: 'Planned work',
        is_billable: true,
        entry_type: 'planned'
      })
      
      toast.success('Planned entry created')
      setIsAddEntryOpen(false)
      setSelectedCell(null)
      await loadPlannedEntries()
    } catch (error) {
      console.error('Error creating entry:', error)
      toast.error('Failed to create entry: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleDeleteEntry = async () => {
    if (!editingEntry) return
    
    try {
      await deleteTimeEntry(editingEntry.id)
      toast.success('Entry deleted')
      setIsEditEntryOpen(false)
      await loadPlannedEntries()
    } catch (error) {
      toast.error('Failed to delete entry')
    }
  }

  // Render entry bar spanning multiple cells
  const renderEntryBar = (entry: PlannedEntry, projectColor: string, rowKey: string) => {
    const startDate = entry.start_time.split('T')[0]
    const endDate = entry.end_time.split('T')[0]
    
    const startIdx = allDays.findIndex(d => d.date === startDate)
    const endIdx = allDays.findIndex(d => d.date === endDate)
    
    if (startIdx === -1 || endIdx === -1) return null
    
    const hours = Math.round(entry.duration_minutes / 60 * 10) / 10
    
    return (
      <div
        key={entry.id}
        className="absolute inset-y-1 forecast-entry cursor-move group"
        style={{
          left: `${startIdx * 80}px`,
          width: `${(endIdx - startIdx + 1) * 80}px`,
          backgroundColor: projectColor,
          zIndex: 5
        }}
        onMouseDown={(e) => handleMouseDown(e, startDate, entry.project_id, entry.user_id, entry)}
        onClick={() => handleEntryClick(entry)}
      >
        <div className="relative h-full rounded px-2 py-1 text-white text-xs font-semibold flex items-center justify-between">
          {/* Resize handle - left */}
          <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20" />
          
          <span>{hours}h</span>
          
          {/* Resize handle - right */}
          <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20" />
        </div>
      </div>
    )
  }

  // Render drag preview
  const renderDragPreview = () => {
    if (!dragState.isDragging || !dragState.startDate || !dragState.endDate) return null
    
    const start = new Date(dragState.startDate)
    const end = new Date(dragState.endDate)
    const orderedStart = start < end ? dragState.startDate : dragState.endDate
    const orderedEnd = start < end ? dragState.endDate : dragState.startDate
    
    const startIdx = allDays.findIndex(d => d.date === orderedStart)
    const endIdx = allDays.findIndex(d => d.date === orderedEnd)
    
    if (startIdx === -1 || endIdx === -1) return null
    
    return (
      <div
        className="absolute inset-y-1 bg-primary/30 border-2 border-primary rounded pointer-events-none"
        style={{
          left: `${startIdx * 80}px`,
          width: `${(endIdx - startIdx + 1) * 80}px`,
          zIndex: 10
        }}
      />
    )
  }

  // Redirect non-managers/non-admins - MUST be after all hooks
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
          <TabsContent value="projects">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="sticky left-0 z-10 bg-muted/50 px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">
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
                                  "px-2 py-3 text-center text-xs font-medium",
                                  "w-[80px] min-w-[80px] max-w-[80px]",
                                  day.isWeekend && "bg-muted/30",
                                  dayIdx === 0 && weekIdx > 0 && "border-l-2 border-border"
                                )}
                              >
                                <div>{day.dayName}</div>
                                <div className="text-muted-foreground">{day.dayNumber}</div>
                              </th>
                            ))}
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activeProjects.map((project) => {
                        const totalScheduled = getTotalScheduledHours(project.id, undefined)
                        const isExpanded = expandedProjects.has(project.id)
                        const projectMembers = getProjectMembers(project.id)
                        const rowKey = `${project.id}-none`
                        const entries = getEntriesForRow(project.id, undefined)
                        
                        return (
                          <React.Fragment key={project.id}>
                            <tr className="border-b hover:bg-muted/30">
                              <td 
                                className="sticky left-0 z-10 bg-background px-4 py-3 text-sm font-medium border-r cursor-pointer whitespace-nowrap"
                                onClick={() => toggleProject(project.id)}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="h-3 w-3 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: project.color }}
                                    />
                                    <span>{project.name}</span>
                                  </div>
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  ) : (
                                    <ChevronRightIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-3 text-center text-sm font-semibold border-r-2 border-border bg-muted/20">
                                {totalScheduled > 0 ? `${totalScheduled}h` : '-'}
                              </td>
                              <td colSpan={21} className="p-0 relative" style={{ height: '48px' }}>
                                <div className="absolute inset-0 flex">
                                  {weeks.map((week, weekIdx) => (
                                    <React.Fragment key={weekIdx}>
                                      {week.map((day, dayIdx) => (
                                        <div
                                              key={day.date}
                                              className={cn(
                                                "flex-shrink-0 border-r forecast-cell",
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
                                  {/* Render entries as bars */}
                                  {entries.map(entry => renderEntryBar(entry, project.color, rowKey))}
                                  {/* Render drag preview */}
                                  {dragState.isDragging && dragState.rowKey === rowKey && renderDragPreview()}
                                </div>
                              </td>
                            </tr>

                            {/* Expanded member rows */}
                            {isExpanded && projectMembers.map((member) => {
                              const memberTotalScheduled = getTotalScheduledHours(project.id, member.id)
                              const memberRowKey = `${project.id}-${member.id}`
                              const memberEntries = getEntriesForRow(project.id, member.id)
                              
                              return (
                                <tr key={`${project.id}-${member.id}`} className="border-b hover:bg-muted/20 bg-muted/5">
                                  <td className="sticky left-0 z-10 bg-muted/5 px-4 py-2 text-sm border-r whitespace-nowrap">
                                    <div className="flex items-center gap-2 pl-6">
                                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                                        {member.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
                                      </div>
                                      <span className="text-muted-foreground">{member.full_name}</span>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 text-center text-sm font-medium border-r-2 border-border bg-muted/10">
                                    {memberTotalScheduled > 0 ? `${memberTotalScheduled}h` : '-'}
                                  </td>
                                  <td colSpan={21} className="p-0 relative" style={{ height: '40px' }}>
                                    <div className="absolute inset-0 flex">
                                      {weeks.map((week, weekIdx) => (
                                        <React.Fragment key={weekIdx}>
                                          {week.map((day, dayIdx) => (
                                            <div
                                              key={day.date}
                                              className={cn(
                                                "flex-shrink-0 border-r forecast-cell",
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
                                      {/* Render entries as bars */}
                                      {memberEntries.map(entry => renderEntryBar(entry, project.color, memberRowKey))}
                                      {/* Render drag preview */}
                                      {dragState.isDragging && dragState.rowKey === memberRowKey && renderDragPreview()}
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </React.Fragment>
                        )
                      })}
                      {activeProjects.length === 0 && (
                        <tr>
                          <td colSpan={23} className="py-8 text-center text-muted-foreground">
                            No active projects found
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
          <TabsContent value="members">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="sticky left-0 z-10 bg-muted/50 px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">
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
                                  "px-2 py-3 text-center text-xs font-medium",
                                  "w-[80px] min-w-[80px] max-w-[80px]",
                                  day.isWeekend && "bg-muted/30",
                                  dayIdx === 0 && weekIdx > 0 && "border-l-2 border-border"
                                )}
                              >
                                <div>{day.dayName}</div>
                                <div className="text-muted-foreground">{day.dayNumber}</div>
                              </th>
                            ))}
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((member) => {
                        const totalScheduled = getTotalScheduledHours(undefined, member.id)
                        const rowKey = `none-${member.id}`
                        const entries = getEntriesForRow(undefined, member.id)
                        
                        return (
                          <tr key={member.id} className="border-b hover:bg-muted/30">
                            <td className="sticky left-0 z-10 bg-background px-4 py-3 text-sm font-medium border-r whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                                  {member.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
                                </div>
                                <span>{member.full_name}</span>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center text-sm font-semibold border-r-2 border-border bg-muted/20">
                              {totalScheduled > 0 ? `${totalScheduled}h` : '-'}
                            </td>
                            <td colSpan={21} className="p-0 relative" style={{ height: '48px' }}>
                              <div className="absolute inset-0 flex">
                                {weeks.map((week, weekIdx) => (
                                  <React.Fragment key={weekIdx}>
                                    {week.map((day, dayIdx) => (
                                        <div
                                          key={day.date}
                                          className={cn(
                                            "flex-shrink-0 border-r forecast-cell",
                                            "w-[80px] min-w-[80px] max-w-[80px]",
                                            day.isWeekend && "bg-muted/20",
                                            dayIdx === 0 && weekIdx > 0 && "border-l-2 border-border"
                                          )}
                                          onMouseDown={(e) => handleMouseDown(e, day.date, undefined, member.id)}
                                          onMouseEnter={() => handleMouseEnter(day.date, undefined, member.id)}
                                      />
                                    ))}
                                  </React.Fragment>
                                ))}
                                {/* Render entries as bars */}
                                {entries.map(entry => {
                                  const project = projects.find(p => p.id === entry.project_id)
                                  return renderEntryBar(entry, project?.color || '#3f69dc', rowKey)
                                })}
                                {/* Render drag preview */}
                                {dragState.isDragging && dragState.rowKey === rowKey && renderDragPreview()}
                              </div>
                            </td>
                          </tr>
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

      {/* Add Planned Entry Modal (after drag creation) */}
      <Dialog open={isAddEntryOpen} onOpenChange={setIsAddEntryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Planned Entry</DialogTitle>
            <DialogDescription>
              Confirm the details for this planned work allocation
            </DialogDescription>
          </DialogHeader>

          {/* Debug info */}
          <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
            <p>Project: {entryForm.projectId || 'NOT SET'}</p>
            <p>User: {entryForm.userId || 'NOT SET'}</p>
            <p>Hours: {entryForm.hours}</p>
            <p>Button enabled: {!(!entryForm.projectId || !entryForm.userId) ? 'YES' : 'NO'}</p>
          </div>

          <div className="space-y-4 py-4">
            {/* Time Entry Length */}
            <div className="space-y-2">
              <Label>Time Entry Length</Label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-2xl font-bold">{selectedCell?.durationDays || 0}</span>
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
                <span className="text-muted-foreground">:</span>
                <div className="flex items-center gap-1">
                  <span className="text-2xl font-bold">{selectedCell?.durationHours || 0}</span>
                  <span className="text-sm text-muted-foreground">hours</span>
                </div>
              </div>
            </div>

            {/* Selected Time Window */}
            <div className="space-y-2">
              <Label>Selected Time Window</Label>
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm">
                  <span className="font-medium">From:</span>{' '}
                  {selectedCell?.startDate ? new Date(selectedCell.startDate).toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  }) : '-'}
                </p>
                <p className="text-sm mt-1">
                  <span className="font-medium">To:</span>{' '}
                  {selectedCell?.endDate ? new Date(selectedCell.endDate).toLocaleDateString('en-US', { 
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
                value={entryForm.hours}
                onChange={(e) => setEntryForm({ ...entryForm, hours: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Adjust the total hours for this allocation
              </p>
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <Button 
              variant="destructive" 
              onClick={() => setIsAddEntryOpen(false)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsAddEntryOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  console.log('Create button clicked!')
                  handleAddEntry()
                }}
                disabled={!entryForm.projectId || !entryForm.userId}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit/Delete Planned Entry Modal */}
      <Dialog open={isEditEntryOpen} onOpenChange={setIsEditEntryOpen}>
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
                value={entryForm.projectId} 
                onValueChange={(value) => setEntryForm({ ...entryForm, projectId: value })}
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
                value={entryForm.userId} 
                onValueChange={(value) => setEntryForm({ ...entryForm, userId: value })}
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
                max="24"
                step="0.5"
                value={entryForm.hours}
                onChange={(e) => setEntryForm({ ...entryForm, hours: e.target.value })}
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
                onClick={() => setIsEditEntryOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateEntry}
                disabled={!entryForm.projectId || !entryForm.userId}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Update
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  )
}
