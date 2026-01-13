import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { Page } from '../components/Page'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { FolderKanban, Users, ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronRightIcon } from 'lucide-react'
import { usePermissions } from '../hooks/usePermissions'
import { useSupabaseAppState } from '../hooks/useSupabaseAppState'
import { supabase } from '../lib/supabase'
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

export const ForecastPlanning: React.FC = () => {
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

  // Expand all projects by default on load
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
                              {/* Day cells - empty for now */}
                              {weeks.map((week, weekIdx) => (
                                <React.Fragment key={weekIdx}>
                                  {week.map((day, dayIdx) => (
                                    <td
                                      key={day.date}
                                      className={cn(
                                        "px-2 py-3 text-center text-xs",
                                        "w-[80px] min-w-[80px] max-w-[80px]",
                                        day.isWeekend && "bg-muted/20",
                                        dayIdx === 0 && weekIdx > 0 && "border-l-2 border-border"
                                      )}
                                    >
                                      <div className="text-muted-foreground">-</div>
                                    </td>
                                  ))}
                                </React.Fragment>
                              ))}
                            </tr>

                            {/* Expanded member rows */}
                            {isExpanded && projectMembers.map((member) => {
                              const memberTotalScheduled = getTotalScheduledHours(project.id, member.id)
                              
                              return (
                                <tr key={`${project.id}-${member.id}`} className="border-b hover:bg-muted/20 bg-muted/5">
                                  <td className="sticky left-0 z-10 bg-muted/5 px-4 py-2 text-sm border-r whitespace-nowrap">
                                    <div className="flex items-center gap-2 pl-6">
                                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                                        {member.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
                                      </div>
                                      <span className="text-muted-foreground">{member.full_name}</span>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 text-center text-sm font-medium border-r-2 border-border bg-muted/10">
                                    {memberTotalScheduled > 0 ? `${memberTotalScheduled}h` : '-'}
                                  </td>
                                  {/* Day cells - empty for now */}
                                  {weeks.map((week, weekIdx) => (
                                    <React.Fragment key={weekIdx}>
                                      {week.map((day, dayIdx) => (
                                        <td
                                          key={day.date}
                                          className={cn(
                                            "px-2 py-2 text-center text-xs",
                                            "w-[80px] min-w-[80px] max-w-[80px]",
                                            day.isWeekend && "bg-muted/20",
                                            dayIdx === 0 && weekIdx > 0 && "border-l-2 border-border"
                                          )}
                                        >
                                          <div className="text-muted-foreground">-</div>
                                        </td>
                                      ))}
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
                        
                        return (
                          <tr key={member.id} className="border-b hover:bg-muted/30">
                            <td className="sticky left-0 z-10 bg-background px-4 py-3 text-sm font-medium border-r whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                                  {member.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
                                </div>
                                <span>{member.full_name}</span>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center text-sm font-semibold border-r-2 border-border bg-muted/20">
                              {totalScheduled > 0 ? `${totalScheduled}h` : '-'}
                            </td>
                            {/* Day cells - empty for now */}
                            {weeks.map((week, weekIdx) => (
                              <React.Fragment key={weekIdx}>
                                {week.map((day, dayIdx) => (
                                  <td
                                    key={day.date}
                                    className={cn(
                                      "px-2 py-3 text-center text-xs",
                                      "w-[80px] min-w-[80px] max-w-[80px]",
                                      day.isWeekend && "bg-muted/20",
                                      dayIdx === 0 && weekIdx > 0 && "border-l-2 border-border"
                                    )}
                                  >
                                    <div className="text-muted-foreground">-</div>
                                  </td>
                                ))}
                              </React.Fragment>
                            ))}
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
    </Page>
  )
}







