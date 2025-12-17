import React, { useState, useMemo, useEffect } from 'react'
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
import { supabase } from '../lib/supabase'
import { notifications } from '../lib/notifications'
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

export const WorkloadPlanning: React.FC = () => {
  const { isAdmin, isManager } = usePermissions()
  const { projects, users } = useSupabaseAppState()
  
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

  // Modal state - Add/Edit
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false)
  const [isEditEntryOpen, setIsEditEntryOpen] = useState(false)
  const [selectedCell, setSelectedCell] = useState<{
    date: string
    projectId?: string
    userId?: string
  } | null>(null)
  const [editingEntry, setEditingEntry] = useState<PlannedEntry | null>(null)
  const [entryForm, setEntryForm] = useState({
    projectId: '',
    userId: '',
    hours: '8'
  })

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

  // Get entries for a specific cell
  const getEntriesForCell = (date: string, projectId?: string, userId?: string) => {
    return plannedEntries.filter(entry => {
      const entryDate = new Date(entry.start_time).toISOString().split('T')[0]
      const matchesDate = entryDate === date
      const matchesProject = projectId ? entry.project_id === projectId : true
      const matchesUser = userId ? entry.user_id === userId : true
      return matchesDate && matchesProject && matchesUser
    })
  }

  // Calculate total hours for a cell
  const getTotalHours = (date: string, projectId?: string, userId?: string) => {
    const entries = getEntriesForCell(date, projectId, userId)
    const totalMinutes = entries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0)
    return totalMinutes / 60
  }

  // Calculate total scheduled hours for a project or user across all visible dates
  const getTotalScheduledHours = (projectId?: string, userId?: string) => {
    const relevantEntries = plannedEntries.filter(entry => {
      const matchesProject = projectId ? entry.project_id === projectId : true
      const matchesUser = userId ? entry.user_id === userId : true
      return matchesProject && matchesUser
    })
    const totalMinutes = relevantEntries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0)
    return totalMinutes / 60
  }

  // Toggle project expansion
  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects)
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId)
    } else {
      newExpanded.add(projectId)
    }
    setExpandedProjects(newExpanded)
  }

  // Get project members
  const getProjectMembers = (projectId: string) => {
    // Get all users who have entries for this project
    const memberIds = new Set(
      plannedEntries
        .filter(entry => entry.project_id === projectId)
        .map(entry => entry.user_id)
    )
    return users.filter(user => memberIds.has(user.id))
  }

  // Redirect non-managers/non-admins - MUST be after all hooks
  if (!isAdmin && !isManager) {
    return (
      <Page title="Workload Planning" subtitle="Access Denied">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">You don't have permission to access this page.</p>
          </CardContent>
        </Card>
      </Page>
    )
  }

  // Navigate weeks
  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeekStart)
    newDate.setDate(currentWeekStart.getDate() - 7)
    setCurrentWeekStart(newDate)
  }

  const goToNextWeek = () => {
    const newDate = new Date(currentWeekStart)
    newDate.setDate(currentWeekStart.getDate() + 7)
    setCurrentWeekStart(newDate)
  }

  const goToToday = () => {
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(today.setDate(diff))
    monday.setHours(0, 0, 0, 0)
    setCurrentWeekStart(monday)
  }

  // Handle cell click to add planned entry
  const handleCellClick = (date: string, projectId?: string, userId?: string, entries?: PlannedEntry[]) => {
    // If there are existing entries, show them in edit mode
    if (entries && entries.length > 0) {
      const entry = entries[0] // For now, edit the first entry
      handleEditEntry(entry)
    } else {
      // No entries, open add modal
      setSelectedCell({ date, projectId, userId })
      setEntryForm({
        projectId: projectId || '',
        userId: userId || '',
        hours: '8'
      })
      setIsAddEntryOpen(true)
    }
  }

  const handleEditEntry = (entry: PlannedEntry) => {
    setEditingEntry(entry)
    setEntryForm({
      projectId: entry.project_id,
      userId: entry.user_id,
      hours: String(entry.duration_minutes / 60)
    })
    setIsEditEntryOpen(true)
  }

  const handleAddEntry = async () => {
    if (!entryForm.projectId || !entryForm.userId || !selectedCell) {
      notifications.createError('Add Entry', 'Please fill in all required fields')
      return
    }

    try {
      // Create a planned time entry (future date)
      const startDate = new Date(selectedCell.date)
      startDate.setHours(9, 0, 0, 0) // Start at 9 AM
      
      const endDate = new Date(selectedCell.date)
      const hours = parseFloat(entryForm.hours)
      endDate.setHours(9 + hours, 0, 0, 0)

      const { error } = await supabase
        .from('time_entries')
        .insert({
          user_id: entryForm.userId,
          project_id: entryForm.projectId,
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          duration_minutes: hours * 60,
          description: 'Planned work allocation',
          is_billable: true
        })

      if (error) {
        notifications.createError('Add Entry', error.message)
        return
      }

      notifications.createSuccess('Entry Added', 'Planned time entry has been added')
      setIsAddEntryOpen(false)
      setEntryForm({ projectId: '', userId: '', hours: '8' })
      
      // Reload entries to show the new one
      loadPlannedEntries()
    } catch (error) {
      console.error('Error adding planned entry:', error)
      notifications.createError('Add Entry', 'Failed to add planned entry')
    }
  }

  const handleUpdateEntry = async () => {
    if (!editingEntry || !entryForm.projectId || !entryForm.userId) {
      notifications.createError('Update Entry', 'Please fill in all required fields')
      return
    }

    try {
      const hours = parseFloat(entryForm.hours)
      const startDate = new Date(editingEntry.start_time)
      const endDate = new Date(startDate)
      endDate.setHours(startDate.getHours() + hours)

      const { error } = await supabase
        .from('time_entries')
        .update({
          project_id: entryForm.projectId,
          user_id: entryForm.userId,
          end_time: endDate.toISOString(),
          duration_minutes: hours * 60
        })
        .eq('id', editingEntry.id)

      if (error) {
        notifications.createError('Update Entry', error.message)
        return
      }

      notifications.createSuccess('Entry Updated', 'Planned time entry has been updated')
      setIsEditEntryOpen(false)
      setEditingEntry(null)
      setEntryForm({ projectId: '', userId: '', hours: '8' })
      
      // Reload entries
      loadPlannedEntries()
    } catch (error) {
      console.error('Error updating planned entry:', error)
      notifications.createError('Update Entry', 'Failed to update planned entry')
    }
  }

  const handleDeleteEntry = async () => {
    if (!editingEntry) return

    if (!confirm('Are you sure you want to delete this planned entry?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', editingEntry.id)

      if (error) {
        notifications.createError('Delete Entry', error.message)
        return
      }

      notifications.createSuccess('Entry Deleted', 'Planned time entry has been deleted')
      setIsEditEntryOpen(false)
      setEditingEntry(null)
      setEntryForm({ projectId: '', userId: '', hours: '8' })
      
      // Reload entries
      loadPlannedEntries()
    } catch (error) {
      console.error('Error deleting planned entry:', error)
      notifications.createError('Delete Entry', 'Failed to delete planned entry')
    }
  }

  return (
    <Page 
      title="Workload Planning" 
      subtitle="Plan and allocate team resources across projects"
    >
      <div className="space-y-6">
        {/* Navigation Controls */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
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
                <span className="text-sm font-medium ml-4">
                  {currentWeekStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Tabs for different views */}
        <Tabs value={view} onValueChange={(v) => setView(v as 'projects' | 'members')}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="projects" className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4" />
              By Project
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              By Team Member
            </TabsTrigger>
          </TabsList>

          {/* Projects View */}
          <TabsContent value="projects">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="sticky left-0 z-10 bg-muted/50 px-4 py-3 text-left text-sm font-semibold min-w-[200px]">
                          Project
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-semibold border-r-2 border-border bg-muted/50">
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
                                  "max-w-[80px] min-w-[60px]",
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
                        
                        return (
                          <React.Fragment key={project.id}>
                            <tr className="border-b hover:bg-muted/30">
                              <td 
                                className="sticky left-0 z-10 bg-background px-4 py-3 text-sm font-medium border-r cursor-pointer"
                                onClick={() => toggleProject(project.id)}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="h-3 w-3 rounded-full"
                                      style={{ backgroundColor: project.color }}
                                    />
                                    {project.name}
                                  </div>
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                              </td>
                            <td className="px-3 py-3 text-center text-sm font-semibold border-r-2 border-border bg-muted/20">
                              {totalScheduled > 0 ? `${totalScheduled}h` : '-'}
                            </td>
                            {weeks.map((week, weekIdx) => (
                            <React.Fragment key={weekIdx}>
                              {week.map((day, dayIdx) => {
                                const entries = getEntriesForCell(day.date, project.id, undefined)
                                const totalHours = getTotalHours(day.date, project.id, undefined)
                                const hasEntries = entries.length > 0

                                return (
                                  <td
                                    key={day.date}
                                    className={cn(
                                      "px-2 py-3 text-center text-xs cursor-pointer",
                                      "max-w-[80px] min-w-[60px]",
                                      day.isWeekend && "bg-muted/20",
                                      dayIdx === 0 && weekIdx > 0 && "border-l-2 border-border",
                                      hasEntries ? "hover:bg-primary/20" : "hover:bg-primary/10"
                                    )}
                                    onClick={() => handleCellClick(day.date, project.id, undefined, entries)}
                                  >
                                    {hasEntries ? (
                                      <div 
                                        className="font-semibold px-2 py-1 rounded text-white"
                                        style={{ backgroundColor: project.color }}
                                      >
                                        {totalHours}h
                                      </div>
                                    ) : (
                                      <div className="text-muted-foreground">-</div>
                                    )}
                                  </td>
                                )
                              })}
                            </React.Fragment>
                          ))}
                            </tr>

                            {/* Expanded member rows */}
                            {isExpanded && projectMembers.map((member) => {
                              const memberTotalScheduled = getTotalScheduledHours(project.id, member.id)
                              
                              return (
                                <tr key={`${project.id}-${member.id}`} className="border-b hover:bg-muted/20 bg-muted/5">
                                  <td className="sticky left-0 z-10 bg-muted/5 px-4 py-2 text-sm border-r">
                                    <div className="flex items-center gap-2 pl-6">
                                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold">
                                        {member.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
                                      </div>
                                      <span className="text-muted-foreground">{member.full_name}</span>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 text-center text-sm font-medium border-r-2 border-border bg-muted/10">
                                    {memberTotalScheduled > 0 ? `${memberTotalScheduled}h` : '-'}
                                  </td>
                                  {weeks.map((week, weekIdx) => (
                                    <React.Fragment key={weekIdx}>
                                      {week.map((day, dayIdx) => {
                                        const entries = getEntriesForCell(day.date, project.id, member.id)
                                        const totalHours = getTotalHours(day.date, project.id, member.id)
                                        const hasEntries = entries.length > 0

                                        return (
                                          <td
                                            key={day.date}
                                            className={cn(
                                              "px-2 py-2 text-center text-xs cursor-pointer",
                                              "max-w-[80px] min-w-[60px]",
                                              day.isWeekend && "bg-muted/20",
                                              dayIdx === 0 && weekIdx > 0 && "border-l-2 border-border",
                                              hasEntries ? "hover:bg-primary/20" : "hover:bg-primary/10"
                                            )}
                                            onClick={() => handleCellClick(day.date, project.id, member.id, entries)}
                                          >
                                            {hasEntries ? (
                                              <div 
                                                className="font-semibold px-1 py-0.5 rounded text-white text-xs"
                                                style={{ backgroundColor: project.color }}
                                              >
                                                {totalHours}h
                                              </div>
                                            ) : (
                                              <div className="text-muted-foreground">-</div>
                                            )}
                                          </td>
                                        )
                                      })}
                                    </React.Fragment>
                                  ))}
                                </tr>
                              )
                            })}
                          </React.Fragment>
                        )
                      })}
                      {activeProjects.length === 0 && (
                        <tr>
                          <td colSpan={22} className="py-8 text-center text-muted-foreground">
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
                        <th className="sticky left-0 z-10 bg-muted/50 px-4 py-3 text-left text-sm font-semibold min-w-[200px]">
                          Team Member
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-semibold border-r-2 border-border bg-muted/50">
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
                                  "max-w-[80px] min-w-[60px]",
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
                      {users.map((user) => {
                        const totalScheduled = getTotalScheduledHours(undefined, user.id)
                        
                        return (
                          <tr key={user.id} className="border-b hover:bg-muted/30">
                            <td className="sticky left-0 z-10 bg-background px-4 py-3 text-sm font-medium border-r">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold">
                                  {user.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
                                </div>
                                {user.full_name}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center text-sm font-semibold border-r-2 border-border bg-muted/20">
                              {totalScheduled > 0 ? `${totalScheduled}h` : '-'}
                            </td>
                            {weeks.map((week, weekIdx) => (
                            <React.Fragment key={weekIdx}>
                              {week.map((day, dayIdx) => {
                                const entries = getEntriesForCell(day.date, undefined, user.id)
                                const totalHours = getTotalHours(day.date, undefined, user.id)
                                const hasEntries = entries.length > 0

                                return (
                                  <td
                                    key={day.date}
                                    className={cn(
                                      "px-2 py-3 text-center text-xs cursor-pointer",
                                      "max-w-[80px] min-w-[60px]",
                                      day.isWeekend && "bg-muted/20",
                                      dayIdx === 0 && weekIdx > 0 && "border-l-2 border-border",
                                      hasEntries ? "hover:bg-primary/20" : "hover:bg-primary/10"
                                    )}
                                    onClick={() => handleCellClick(day.date, undefined, user.id, entries)}
                                  >
                                    {hasEntries ? (
                                      <div 
                                        className="font-semibold px-2 py-1 rounded bg-primary text-primary-foreground"
                                      >
                                        {totalHours}h
                                      </div>
                                    ) : (
                                      <div className="text-muted-foreground">-</div>
                                    )}
                                  </td>
                                )
                              })}
                            </React.Fragment>
                          ))}
                          </tr>
                        )
                      })}
                      {users.length === 0 && (
                        <tr>
                          <td colSpan={22} className="py-8 text-center text-muted-foreground">
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

      {/* Add Planned Entry Modal */}
      <Dialog open={isAddEntryOpen} onOpenChange={setIsAddEntryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Plan Work Allocation</DialogTitle>
            <DialogDescription>
              Allocate time for {selectedCell?.date ? new Date(selectedCell.date).toLocaleDateString() : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Project */}
            <div className="space-y-2">
              <Label htmlFor="project">Project *</Label>
              <Select 
                value={entryForm.projectId} 
                onValueChange={(value) => setEntryForm({ ...entryForm, projectId: value })}
                disabled={!!selectedCell?.projectId}
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
              <Label htmlFor="user">Team Member *</Label>
              <Select 
                value={entryForm.userId} 
                onValueChange={(value) => setEntryForm({ ...entryForm, userId: value })}
                disabled={!!selectedCell?.userId}
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
              <Label htmlFor="hours">Hours *</Label>
              <Input
                id="hours"
                type="number"
                min="0.5"
                max="24"
                step="0.5"
                value={entryForm.hours}
                onChange={(e) => setEntryForm({ ...entryForm, hours: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsAddEntryOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddEntry}
              disabled={!entryForm.projectId || !entryForm.userId}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Allocation
            </Button>
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

