import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Badge } from '../components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs'
import { ArrowLeft, Plus, Clock, DollarSign, Receipt, Calculator, Edit2, Users, Trash2, BarChart3, ListTodo, Wallet, Settings, ChevronLeft, ChevronRight } from 'lucide-react'
import { useSupabaseAppState } from '../hooks/useSupabaseAppState'
import { useProjectsData } from '../hooks/useProjectsData'
import { usePermissions } from '../hooks/usePermissions'
import { InviteMembersModal } from '../components/InviteMembersModal'
import { projectMembersService } from '../services/supabaseService'
import { Project, TimeEntry } from '../types'
import { Page } from '../components/Page'
import { notifications } from '../lib/notifications'
import { cn } from '../lib/utils'

interface MaterialCost {
  id: string
  description: string
  cost: number
  type: 'cost' | 'bill'
  date: string
  created_at: string
}

interface UserHourlyRate {
  userId: string
  userName: string
  costPerHour: number
  pricePerHour: number
  currency: 'HUF' | 'USD' | 'EUR'
}

interface EditRateData {
  userId: string
  userName: string
  costPerHour: number
  pricePerHour: number
  currency: 'HUF' | 'USD' | 'EUR'
}

export const ProjectDetails: React.FC = () => {
  const { projectName } = useParams<{ projectName: string }>()
  const navigate = useNavigate()
  const { timeEntries, users, loading: appLoading } = useSupabaseAppState()
  const { projects, updateProject, loading: projectsLoading } = useProjectsData()
  
  const [materialCosts, setMaterialCosts] = useState<MaterialCost[]>([])
  const [isAddCostOpen, setIsAddCostOpen] = useState(false)
  const [newCostDescription, setNewCostDescription] = useState('')
  const [newCostAmount, setNewCostAmount] = useState('')
  const [newCostType, setNewCostType] = useState<'cost' | 'bill'>('cost')
  
  // Hourly rate management state
  const [userHourlyRates, setUserHourlyRates] = useState<UserHourlyRate[]>([])
  const [isEditRateOpen, setIsEditRateOpen] = useState(false)
  const [editingRate, setEditingRate] = useState<EditRateData | null>(null)
  
  // Project members management state
  const [projectMembers, setProjectMembers] = useState<any[]>([])
  const [isInviteMembersOpen, setIsInviteMembersOpen] = useState(false)
  const [loadingMembers, setLoadingMembers] = useState(false)
  
  // Inline editing state
  const [editingField, setEditingField] = useState<'code' | 'name' | null>(null)
  const [editedCode, setEditedCode] = useState('')
  const [editedName, setEditedName] = useState('')
  const [activeTab, setActiveTab] = useState('workload')
  
  // Workload view state
  const [workloadView, setWorkloadView] = useState<'weekly' | 'monthly'>('monthly')
  const [workloadOffset, setWorkloadOffset] = useState(0) // 0 = current period, -1 = previous, 1 = next
  
  const { isAdmin } = usePermissions()

  // Find the project by name from URL
  const project = useMemo(() => {
    if (!projectName || !projects.length) return null
    const decodedName = decodeURIComponent(projectName)
    return projects.find(p => p.name === decodedName) || null
  }, [projectName, projects])

  // Load project members when project is loaded
  useEffect(() => {
    if (project?.id) {
      loadProjectMembers();
    }
  }, [project?.id]);

  const loadProjectMembers = async () => {
    if (!project?.id) return;
    
    setLoadingMembers(true);
    try {
      const { data, error } = await projectMembersService.getProjectMembers(project.id);
      if (error) {
        console.error('Error loading project members:', error);
      } else {
        setProjectMembers(data || []);
      }
    } catch (err) {
      console.error('Error loading project members:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleMemberRoleChange = async (memberId: string, newRole: 'member' | 'manager') => {
    try {
      const { error } = await projectMembersService.updateProjectMemberRole(memberId, newRole);
      if (error) {
        notifications.createError('Update Role', error.message);
      } else {
        notifications.createSuccess('Role Updated', 'Project role has been updated');
        loadProjectMembers();
      }
    } catch (err) {
      console.error('Error updating member role:', err);
      notifications.createError('Update Role', 'Failed to update role');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await projectMembersService.removeProjectMember(memberId);
      if (error) {
        notifications.createError('Remove Member', error.message);
      } else {
        notifications.createSuccess('Member Removed', 'Member has been removed from project');
        loadProjectMembers();
      }
    } catch (err) {
      console.error('Error removing member:', err);
      notifications.createError('Remove Member', 'Failed to remove member');
    }
  };

  // Get time entries for this project
  const projectTimeEntries = useMemo(() => {
    if (!project || !timeEntries.length) return []
    return timeEntries.filter(entry => 
      entry.project_id === project.id || entry.projectId === project.id
    )
  }, [project, timeEntries])

  // Get unique contributors (users who have time entries on this project)
  const projectContributors = useMemo(() => {
    if (!projectTimeEntries.length || !users.length) return []
    
    const contributorIds = [...new Set(projectTimeEntries.map(entry => entry.user_id))]
    return contributorIds.map(userId => {
      const user = users.find(u => u.id === userId)
      if (!user) return null
      
      // Get or create hourly rate for this user
      const existingRate = userHourlyRates.find(rate => rate.userId === userId)
      const defaultCostRate = project?.hourly_rate || 50
      const defaultPriceRate = defaultCostRate * 1.5
      
      return {
        userId,
        userName: user.full_name,
        costPerHour: existingRate?.costPerHour || defaultCostRate,
        pricePerHour: existingRate?.pricePerHour || defaultPriceRate,
        currency: existingRate?.currency || 'USD' as const
      }
    }).filter(Boolean) as UserHourlyRate[]
  }, [projectTimeEntries, users, userHourlyRates, project])

  // Calculate time entries costs by user
  const timeEntriesCosts = useMemo(() => {
    if (!projectTimeEntries.length || !users.length) return []
    
    const userCosts = new Map()
    
    projectTimeEntries.forEach(entry => {
      const userId = entry.user_id
      const user = users.find(u => u.id === userId)
      if (!user) return
      
      const durationHours = (entry.duration_minutes || entry.duration || 0) / 60
      
      // Use custom rates if available, otherwise fall back to defaults
      const contributor = projectContributors.find(c => c.userId === userId)
      const costPerHour = contributor?.costPerHour || entry.hourly_rate || project?.hourly_rate || 50
      const pricePerHour = contributor?.pricePerHour || (costPerHour * 1.5)
      
      const totalCost = durationHours * costPerHour
      const totalIncome = durationHours * pricePerHour
      const totalProfit = totalIncome - totalCost
      
      if (userCosts.has(userId)) {
        const existing = userCosts.get(userId)
        userCosts.set(userId, {
          ...existing,
          timeSpent: existing.timeSpent + durationHours,
          totalCost: existing.totalCost + totalCost,
          totalIncome: existing.totalIncome + totalIncome,
          totalProfit: existing.totalProfit + totalProfit,
          // Keep the same rates (they should be consistent per user)
          costPerHour: existing.costPerHour || costPerHour,
          pricePerHour: existing.pricePerHour || pricePerHour
        })
      } else {
        userCosts.set(userId, {
          userId,
          userName: user.full_name,
          timeSpent: durationHours,
          costPerHour,
          pricePerHour,
          totalCost,
          totalProfit,
          totalIncome
        })
      }
    })
    
    return Array.from(userCosts.values())
  }, [projectTimeEntries, users, project, projectContributors])

  // Calculate totals
  const totals = useMemo(() => {
    const timeCosts = timeEntriesCosts.reduce((sum, entry) => sum + entry.totalCost, 0)
    const timeIncome = timeEntriesCosts.reduce((sum, entry) => sum + entry.totalIncome, 0)
    const timeProfit = timeEntriesCosts.reduce((sum, entry) => sum + entry.totalProfit, 0)
    const materialCostsTotal = materialCosts.reduce((sum, cost) => sum + cost.cost, 0)
    const totalCosts = timeCosts + materialCostsTotal
    const totalIncome = timeIncome // Material costs don't generate income directly
    const totalProfit = timeProfit - materialCostsTotal // Subtract material costs from profit
    
    return {
      totalCosts,
      totalIncome,
      totalProfit,
      timeCosts,
      timeIncome,
      timeProfit,
      materialCosts: materialCostsTotal
    }
  }, [timeEntriesCosts, materialCosts])

  const handleAddMaterialCost = () => {
    if (!newCostDescription.trim() || !newCostAmount.trim()) return
    
    const newCost: MaterialCost = {
      id: Date.now().toString(),
      description: newCostDescription.trim(),
      cost: parseFloat(newCostAmount),
      type: newCostType,
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    }
    
    setMaterialCosts(prev => [...prev, newCost])
    setNewCostDescription('')
    setNewCostAmount('')
    setIsAddCostOpen(false)
  }

  const handleDeleteMaterialCost = (costId: string) => {
    setMaterialCosts(prev => prev.filter(cost => cost.id !== costId))
  }

  const handleEditRate = (contributor: UserHourlyRate) => {
    setEditingRate(contributor)
    setIsEditRateOpen(true)
  }

  const handleSaveRate = () => {
    if (!editingRate) return
    
    setUserHourlyRates(prev => {
      const existing = prev.find(rate => rate.userId === editingRate.userId)
      if (existing) {
        return prev.map(rate => 
          rate.userId === editingRate.userId ? editingRate : rate
        )
      } else {
        return [...prev, editingRate]
      }
    })
    
    setIsEditRateOpen(false)
    setEditingRate(null)
  }

  const handleCancelEditRate = () => {
    setIsEditRateOpen(false)
    setEditingRate(null)
  }

  // Handle inline editing
  const handleStartEditCode = () => {
    if (!project) return
    setEditedCode(project.project_code || '')
    setEditingField('code')
  }

  const handleStartEditName = () => {
    if (!project) return
    setEditedName(project.name)
    setEditingField('name')
  }

  const handleSaveCode = async () => {
    if (!project) {
      setEditingField(null)
      return
    }
    
    if (!editedCode.trim()) {
      // Reset to original value if empty
      setEditedCode(project.project_code || '')
      setEditingField(null)
      return
    }

    try {
      await updateProject(project.id, { project_code: editedCode.trim() })
      notifications.project.updateSuccess(project.name)
      setEditingField(null)
    } catch (error) {
      notifications.project.updateError('Failed to update project ID')
      setEditingField(null)
    }
  }

  const handleSaveName = async () => {
    if (!project) {
      setEditingField(null)
      return
    }
    
    if (!editedName.trim()) {
      // Reset to original value if empty
      setEditedName(project.name)
      setEditingField(null)
      return
    }

    try {
      await updateProject(project.id, { name: editedName.trim() })
      notifications.project.updateSuccess(editedName.trim())
      setEditingField(null)
    } catch (error) {
      notifications.project.updateError('Failed to update project name')
      setEditingField(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, field: 'code' | 'name') => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (field === 'code') {
        handleSaveCode()
      } else {
        handleSaveName()
      }
    } else if (e.key === 'Escape') {
      setEditingField(null)
    }
  }

  const formatCurrency = (amount: number, currency: 'HUF' | 'USD' | 'EUR' = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`
  }

  if (appLoading || projectsLoading) {
    return (
      <Page>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading project details...</p>
          </div>
        </div>
      </Page>
    )
  }

  if (!project) {
    return (
      <Page>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-destructive mb-2">Project Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The project "{projectName}" could not be found.
            </p>
            <Button onClick={() => navigate('/projects')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
          </div>
        </div>
      </Page>
    )
  }

  return (
    <Page>
      {/* Full-width top bar */}
      <div className="-mx-6 -mt-6 px-6 py-4 border-b border-border">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/projects')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          
          <div 
            className="w-8 h-8 rounded-md border-2 border-background shadow-sm flex-shrink-0"
            style={{ backgroundColor: project.color }}
          />
          
          {/* Editable Project Code */}
          {editingField === 'code' ? (
            <input
              type="text"
              value={editedCode}
              onChange={(e) => setEditedCode(e.target.value)}
              onBlur={handleSaveCode}
              onKeyDown={(e) => handleKeyDown(e, 'code')}
              autoFocus
              className="font-mono text-sm px-2.5 py-1 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              style={{ width: `${Math.max(editedCode.length * 8 + 20, 80)}px` }}
            />
          ) : (
            (project.project_code || editedCode) && (
              <Badge 
                variant="outline" 
                className="font-mono text-sm px-2.5 py-1 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={handleStartEditCode}
              >
                {project.project_code || editedCode}
              </Badge>
            )
          )}
          
          {/* Editable Project Name */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {editingField === 'name' ? (
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={(e) => handleKeyDown(e, 'name')}
                autoFocus
                className="text-2xl font-bold text-foreground bg-transparent focus:outline-none px-1 w-full"
              />
            ) : (
              <h1 
                className="text-2xl font-bold text-foreground truncate cursor-pointer hover:text-primary/80 transition-colors"
                onClick={handleStartEditName}
              >
                {project.name}
              </h1>
            )}
          </div>
          
          <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
            <span>{project.client_name || project.clientName}</span>
            <span>•</span>
            <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
              {project.status}
            </Badge>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="mb-6">
          <TabsTrigger value="workload" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Workload
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <ListTodo className="h-4 w-4" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="finances" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Finances
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Workload Tab */}
        <TabsContent value="workload">
          {/* Column Graph - Monthly Workload */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-3">
                      Monthly Workload
                      {(() => {
                        const totalHours = projectTimeEntries.reduce((sum, entry) => 
                          sum + ((entry.duration_minutes || entry.duration || 0) / 60), 0
                        )
                        return (
                          <Badge variant="secondary" className="text-sm">
                            {totalHours.toFixed(1)}h total
                          </Badge>
                        )
                      })()}
                    </CardTitle>
                    <CardDescription>
                      {(() => {
                        const now = new Date()
                        if (workloadView === 'monthly') {
                          const targetDate = new Date(now.getFullYear(), now.getMonth() + workloadOffset, 1)
                          return targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                        } else {
                          const daysOffset = workloadOffset * 7
                          const targetDate = new Date(now)
                          targetDate.setDate(targetDate.getDate() + daysOffset)
                          const startOfWeek = new Date(targetDate)
                          startOfWeek.setDate(targetDate.getDate() - targetDate.getDay())
                          const endOfWeek = new Date(startOfWeek)
                          endOfWeek.setDate(startOfWeek.getDate() + 6)
                          return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                        }
                      })()}
                    </CardDescription>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* View Switcher */}
                  <div className="flex border rounded-md">
                    <Button
                      variant={workloadView === 'weekly' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => {
                        setWorkloadView('weekly')
                        setWorkloadOffset(0)
                      }}
                      className="rounded-r-none"
                    >
                      Weekly
                    </Button>
                    <Button
                      variant={workloadView === 'monthly' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => {
                        setWorkloadView('monthly')
                        setWorkloadOffset(0)
                      }}
                      className="rounded-l-none"
                    >
                      Monthly
                    </Button>
                  </div>
                  
                  {/* Navigation Buttons */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setWorkloadOffset(prev => prev - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setWorkloadOffset(prev => prev + 1)}
                    disabled={workloadOffset >= 0}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-end justify-between gap-2">
                {(() => {
                  // Calculate date range based on view and offset
                  const now = new Date()
                  let days: string[] = []
                  
                  if (workloadView === 'monthly') {
                    const targetDate = new Date(now.getFullYear(), now.getMonth() + workloadOffset, 1)
                    const year = targetDate.getFullYear()
                    const month = targetDate.getMonth()
                    const daysInMonth = new Date(year, month + 1, 0).getDate()
                    
                    days = Array.from({ length: daysInMonth }, (_, i) => {
                      const date = new Date(year, month, i + 1)
                      return date.toISOString().split('T')[0]
                    })
                  } else {
                    // Weekly view
                    const daysOffset = workloadOffset * 7
                    const targetDate = new Date(now)
                    targetDate.setDate(targetDate.getDate() + daysOffset)
                    const startOfWeek = new Date(targetDate)
                    startOfWeek.setDate(targetDate.getDate() - targetDate.getDay())
                    
                    days = Array.from({ length: 7 }, (_, i) => {
                      const date = new Date(startOfWeek)
                      date.setDate(startOfWeek.getDate() + i)
                      return date.toISOString().split('T')[0]
                    })
                  }

                  // Calculate hours per day
                  const hoursPerDay = days.map(day => {
                    const dayEntries = projectTimeEntries.filter(entry => {
                      const entryDate = entry.start_time?.split('T')[0]
                      return entryDate === day
                    })
                    return dayEntries.reduce((sum, entry) => 
                      sum + ((entry.duration_minutes || entry.duration || 0) / 60), 0
                    )
                  })

                  const maxHours = Math.max(...hoursPerDay, 8)

                  return days.map((day, index) => {
                    const hours = hoursPerDay[index]
                    const heightPercent = maxHours > 0 ? (hours / maxHours) * 100 : 0
                    const date = new Date(day)
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6

                    return (
                      <div key={day} className="flex-1 flex flex-col items-center gap-2">
                        <div 
                          className={cn(
                            "w-full rounded-t transition-all hover:opacity-80",
                            hours > 0 ? "bg-primary" : "bg-muted",
                            isWeekend && "opacity-50"
                          )}
                          style={{ height: `${heightPercent}%`, minHeight: hours > 0 ? '4px' : '0' }}
                          title={`${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${hours.toFixed(1)}h`}
                        />
                        <div className="text-[10px] text-muted-foreground text-center">
                          {workloadView === 'weekly' ? date.toLocaleDateString('en-US', { weekday: 'short' }) : date.getDate()}
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Table - Hours by Assignee per Day */}
          <Card>
            <CardHeader>
              <CardTitle>Hours by Assignee</CardTitle>
              <CardDescription>Daily breakdown of hours worked by team members</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background z-10 min-w-[150px]">Assignee</TableHead>
                      {(() => {
                        const now = new Date()
                        let days: Date[] = []
                        
                        if (workloadView === 'monthly') {
                          const targetDate = new Date(now.getFullYear(), now.getMonth() + workloadOffset, 1)
                          const year = targetDate.getFullYear()
                          const month = targetDate.getMonth()
                          const daysInMonth = new Date(year, month + 1, 0).getDate()
                          
                          days = Array.from({ length: daysInMonth }, (_, i) => {
                            return new Date(year, month, i + 1)
                          })
                        } else {
                          const daysOffset = workloadOffset * 7
                          const targetDate = new Date(now)
                          targetDate.setDate(targetDate.getDate() + daysOffset)
                          const startOfWeek = new Date(targetDate)
                          startOfWeek.setDate(targetDate.getDate() - targetDate.getDay())
                          
                          days = Array.from({ length: 7 }, (_, i) => {
                            const date = new Date(startOfWeek)
                            date.setDate(startOfWeek.getDate() + i)
                            return date
                          })
                        }
                        
                        return days.map(date => (
                          <TableHead key={date.toISOString()} className="text-center min-w-[60px] text-xs">
                            <div>{date.toLocaleDateString('en-US', { month: 'short' })}</div>
                            <div className="font-bold">{date.getDate()}</div>
                          </TableHead>
                        ))
                      })()}
                      <TableHead className="text-center min-w-[80px]">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      // Get unique assignees
                      const assignees = Array.from(new Set(
                        projectTimeEntries
                          .map(entry => entry.user_id)
                          .filter(Boolean)
                      )).map(userId => users.find(u => u.id === userId)).filter(Boolean)

                      if (assignees.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={32} className="text-center text-muted-foreground py-8">
                              No time entries for this project
                            </TableCell>
                          </TableRow>
                        )
                      }

                      return assignees.map(user => {
                        const now = new Date()
                        let days: string[] = []
                        
                        if (workloadView === 'monthly') {
                          const targetDate = new Date(now.getFullYear(), now.getMonth() + workloadOffset, 1)
                          const year = targetDate.getFullYear()
                          const month = targetDate.getMonth()
                          const daysInMonth = new Date(year, month + 1, 0).getDate()
                          
                          days = Array.from({ length: daysInMonth }, (_, i) => {
                            const date = new Date(year, month, i + 1)
                            return date.toISOString().split('T')[0]
                          })
                        } else {
                          const daysOffset = workloadOffset * 7
                          const targetDate = new Date(now)
                          targetDate.setDate(targetDate.getDate() + daysOffset)
                          const startOfWeek = new Date(targetDate)
                          startOfWeek.setDate(targetDate.getDate() - targetDate.getDay())
                          
                          days = Array.from({ length: 7 }, (_, i) => {
                            const date = new Date(startOfWeek)
                            date.setDate(startOfWeek.getDate() + i)
                            return date.toISOString().split('T')[0]
                          })
                        }

                        const hoursPerDay = days.map(day => {
                          const dayEntries = projectTimeEntries.filter(entry => 
                            entry.user_id === user.id && entry.start_time?.split('T')[0] === day
                          )
                          return dayEntries.reduce((sum, entry) => 
                            sum + ((entry.duration_minutes || entry.duration || 0) / 60), 0
                          )
                        })

                        const totalHours = hoursPerDay.reduce((sum, h) => sum + h, 0)

                        return (
                          <TableRow key={user.id}>
                            <TableCell className="sticky left-0 bg-background z-10 font-medium">
                              {user.full_name || user.email}
                            </TableCell>
                            {hoursPerDay.map((hours, index) => (
                              <TableCell 
                                key={index} 
                                className={cn(
                                  "text-center text-sm",
                                  hours > 0 ? "font-medium" : "text-muted-foreground"
                                )}
                              >
                                {hours > 0 ? hours.toFixed(1) : '-'}
                              </TableCell>
                            ))}
                            <TableCell className="text-center font-bold">
                              {totalHours.toFixed(1)}h
                            </TableCell>
                          </TableRow>
                        )
                      })
                    })()}
                    {/* Total Row */}
                    {projectTimeEntries.length > 0 && (
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell className="sticky left-0 bg-muted/50 z-10">Total</TableCell>
                        {(() => {
                          const now = new Date()
                          let days: string[] = []
                          
                          if (workloadView === 'monthly') {
                            const targetDate = new Date(now.getFullYear(), now.getMonth() + workloadOffset, 1)
                            const year = targetDate.getFullYear()
                            const month = targetDate.getMonth()
                            const daysInMonth = new Date(year, month + 1, 0).getDate()
                            
                            days = Array.from({ length: daysInMonth }, (_, i) => {
                              const date = new Date(year, month, i + 1)
                              return date.toISOString().split('T')[0]
                            })
                          } else {
                            const daysOffset = workloadOffset * 7
                            const targetDate = new Date(now)
                            targetDate.setDate(targetDate.getDate() + daysOffset)
                            const startOfWeek = new Date(targetDate)
                            startOfWeek.setDate(targetDate.getDate() - targetDate.getDay())
                            
                            days = Array.from({ length: 7 }, (_, i) => {
                              const date = new Date(startOfWeek)
                              date.setDate(startOfWeek.getDate() + i)
                              return date.toISOString().split('T')[0]
                            })
                          }

                          return days.map((day, index) => {
                            const dayTotal = projectTimeEntries
                              .filter(entry => entry.start_time?.split('T')[0] === day)
                              .reduce((sum, entry) => 
                                sum + ((entry.duration_minutes || entry.duration || 0) / 60), 0
                              )
                            return (
                              <TableCell key={index} className="text-center">
                                {dayTotal > 0 ? dayTotal.toFixed(1) : '-'}
                              </TableCell>
                            )
                          })
                        })()}
                        <TableCell className="text-center">
                          {projectTimeEntries.reduce((sum, entry) => 
                            sum + ((entry.duration_minutes || entry.duration || 0) / 60), 0
                          ).toFixed(1)}h
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Tasks view coming soon...</p>
          </div>
        </TabsContent>

        {/* Finances Tab */}
        <TabsContent value="finances">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - 2/3 width */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Time Entries Costs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Cost by Time Entries
                </CardTitle>
                <CardDescription>
                  Time tracking costs and billing for this project
                </CardDescription>
              </CardHeader>
              <CardContent>
                {timeEntriesCosts.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User Name</TableHead>
                        <TableHead className="text-right">Time Spent</TableHead>
                        <TableHead className="text-right">Cost per Hour</TableHead>
                        <TableHead className="text-right">Price per Hour</TableHead>
                        <TableHead className="text-right">Total Cost</TableHead>
                        <TableHead className="text-right">Total Profit</TableHead>
                        <TableHead className="text-right">Total Income</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {timeEntriesCosts.map((entry) => (
                        <TableRow key={entry.userId}>
                          <TableCell className="font-medium">
                            {entry.userName}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatHours(entry.timeSpent)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(entry.costPerHour)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(entry.pricePerHour)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(entry.totalCost)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-green-600">
                            {formatCurrency(entry.totalProfit)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-primary">
                            {formatCurrency(entry.totalIncome)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Totals Row */}
                      <TableRow className="border-t-2 border-border bg-muted/30 font-semibold">
                        <TableCell className="font-bold">
                          TOTALS
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatHours(
                            timeEntriesCosts.reduce((sum, entry) => sum + entry.timeSpent, 0)
                          )}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          —
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          —
                        </TableCell>
                        <TableCell className="text-right font-bold text-red-600">
                          {formatCurrency(totals.timeCosts)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          {formatCurrency(totals.timeProfit)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          {formatCurrency(totals.timeIncome)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No time entries recorded for this project yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Material Costs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Other Material Costs
                </CardTitle>
                <CardDescription>
                  Additional costs and expenses for this project
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Add New Cost Button */}
                  <Dialog open={isAddCostOpen} onOpenChange={setIsAddCostOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full" variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Cost Entry
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Material Cost</DialogTitle>
                        <DialogDescription>
                          Add a new cost entry from costs or bills.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="costDescription">Description</Label>
                          <Input
                            id="costDescription"
                            value={newCostDescription}
                            onChange={(e) => setNewCostDescription(e.target.value)}
                            placeholder="Enter cost description..."
                          />
                        </div>
                        <div>
                          <Label htmlFor="costAmount">Amount</Label>
                          <Input
                            id="costAmount"
                            type="number"
                            step="0.01"
                            value={newCostAmount}
                            onChange={(e) => setNewCostAmount(e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="costType">Type</Label>
                          <Select value={newCostType} onValueChange={(value: 'cost' | 'bill') => setNewCostType(value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cost">From Costs</SelectItem>
                              <SelectItem value="bill">From Bill</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setIsAddCostOpen(false)}>
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleAddMaterialCost}
                            disabled={!newCostDescription.trim() || !newCostAmount.trim()}
                          >
                            Add Cost
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Material Costs Table */}
                  {materialCosts.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Description</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {materialCosts.map((cost) => (
                          <TableRow key={cost.id}>
                            <TableCell className="font-medium">
                              {cost.description}
                            </TableCell>
                            <TableCell>
                              <Badge variant={cost.type === 'bill' ? 'default' : 'secondary'}>
                                {cost.type === 'bill' ? 'Bill' : 'Cost'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(cost.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(cost.cost)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteMaterialCost(cost.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                ×
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No material costs added yet.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Project Members Management */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Project Members
                    </CardTitle>
                    <CardDescription>
                      Manage team members and their roles
                    </CardDescription>
                  </div>
                  {isAdmin && (
                    <Button
                      onClick={() => setIsInviteMembersOpen(true)}
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Invite Members
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {loadingMembers ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p>Loading members...</p>
                  </div>
                ) : projectMembers.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Project Role</TableHead>
                        <TableHead className="text-right">Net Cost</TableHead>
                        <TableHead className="text-right">Tax (27%)</TableHead>
                        <TableHead className="text-right">Gross Cost</TableHead>
                        {isAdmin && <TableHead className="w-[50px]"></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectMembers.map((member) => {
                        // Calculate costs for this member
                        const memberEntries = projectTimeEntries.filter(
                          entry => entry.user_id === member.user_id
                        )
                        const totalHours = memberEntries.reduce(
                          (sum, entry) => sum + ((entry.duration_minutes || entry.duration || 0) / 60), 0
                        )
                        const contributor = projectContributors.find(c => c.userId === member.user_id)
                        const costPerHour = contributor?.costPerHour || 50
                        const netCost = totalHours * costPerHour
                        const tax = netCost * 0.27 // 27% tax
                        const grossCost = netCost + tax
                        
                        return (
                          <TableRow key={member.id}>
                            <TableCell className="font-medium">
                              {member.profiles?.full_name || 'Unknown User'}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {member.profiles?.email || ''}
                            </TableCell>
                            <TableCell>
                              {isAdmin ? (
                                <Select
                                  value={member.role}
                                  onValueChange={(value: 'member' | 'manager') => 
                                    handleMemberRoleChange(member.id, value)
                                  }
                                >
                                  <SelectTrigger className="h-8 w-[120px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="member">Member</SelectItem>
                                    <SelectItem value="manager">Manager</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge variant={member.role === 'manager' ? 'default' : 'secondary'}>
                                  {member.role === 'manager' ? 'Manager' : 'Member'}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(netCost)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {formatCurrency(tax)}
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              {formatCurrency(grossCost)}
                            </TableCell>
                            {isAdmin && (
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveMember(member.id)}
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        )
                      })}
                      {/* Total Row */}
                      {projectMembers.length > 0 && (
                        <TableRow className="bg-muted/50 font-bold border-t-2">
                          <TableCell colSpan={3}>Total</TableCell>
                          <TableCell className="text-right">
                            {(() => {
                              const totalNet = projectMembers.reduce((sum, member) => {
                                const memberEntries = projectTimeEntries.filter(
                                  entry => entry.user_id === member.user_id
                                )
                                const totalHours = memberEntries.reduce(
                                  (s, entry) => s + ((entry.duration_minutes || entry.duration || 0) / 60), 0
                                )
                                const contributor = projectContributors.find(c => c.userId === member.user_id)
                                const costPerHour = contributor?.costPerHour || 50
                                return sum + (totalHours * costPerHour)
                              }, 0)
                              return formatCurrency(totalNet)
                            })()}
                          </TableCell>
                          <TableCell className="text-right">
                            {(() => {
                              const totalNet = projectMembers.reduce((sum, member) => {
                                const memberEntries = projectTimeEntries.filter(
                                  entry => entry.user_id === member.user_id
                                )
                                const totalHours = memberEntries.reduce(
                                  (s, entry) => s + ((entry.duration_minutes || entry.duration || 0) / 60), 0
                                )
                                const contributor = projectContributors.find(c => c.userId === member.user_id)
                                const costPerHour = contributor?.costPerHour || 50
                                return sum + (totalHours * costPerHour)
                              }, 0)
                              return formatCurrency(totalNet * 0.27)
                            })()}
                          </TableCell>
                          <TableCell className="text-right">
                            {(() => {
                              const totalNet = projectMembers.reduce((sum, member) => {
                                const memberEntries = projectTimeEntries.filter(
                                  entry => entry.user_id === member.user_id
                                )
                                const totalHours = memberEntries.reduce(
                                  (s, entry) => s + ((entry.duration_minutes || entry.duration || 0) / 60), 0
                                )
                                const contributor = projectContributors.find(c => c.userId === member.user_id)
                                const costPerHour = contributor?.costPerHour || 50
                                return sum + (totalHours * costPerHour)
                              }, 0)
                              const totalTax = totalNet * 0.27
                              return formatCurrency(totalNet + totalTax)
                            })()}
                          </TableCell>
                          {isAdmin && <TableCell></TableCell>}
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No members added to this project yet.</p>
                    {isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsInviteMembersOpen(true)}
                        className="mt-4"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Invite First Member
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sticky Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Project Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-3 border-b">
                      <span className="font-medium">Total Income</span>
                      <span className="text-2xl font-bold text-primary">
                        {formatCurrency(totals.totalIncome)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="font-medium">Total Profit</span>
                      <span className="text-xl font-bold text-green-600">
                        {formatCurrency(totals.totalProfit)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total Costs</span>
                      <span className="font-semibold text-red-600">
                        {formatCurrency(totals.totalCosts)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Time Costs
                      </span>
                      <span className="font-medium">
                        {formatCurrency(totals.timeCosts)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Receipt className="h-4 w-4" />
                        Material Costs
                      </span>
                      <span className="font-medium">
                        {formatCurrency(totals.materialCosts)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Time Income
                      </span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(totals.timeIncome)}
                      </span>
                    </div>
                  </div>

                  {/* Additional Project Info */}
                  <div className="pt-4 border-t space-y-2">
                    <div className="text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Time Entries:</span>
                        <span>{projectTimeEntries.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Material Costs:</span>
                        <span>{materialCosts.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Hours:</span>
                        <span>
                          {formatHours(
                            projectTimeEntries.reduce((sum, entry) => 
                              sum + ((entry.duration_minutes || entry.duration || 0) / 60), 0
                            )
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Settings view coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Hourly Rate Modal */}
      <Dialog open={isEditRateOpen} onOpenChange={setIsEditRateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Hourly Rates</DialogTitle>
            <DialogDescription>
              Update cost and price rates for {editingRate?.userName}
            </DialogDescription>
          </DialogHeader>
          {editingRate && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="costPerHour">Cost per Hour</Label>
                <Input
                  id="costPerHour"
                  type="number"
                  step="0.01"
                  value={editingRate.costPerHour}
                  onChange={(e) => setEditingRate({
                    ...editingRate,
                    costPerHour: parseFloat(e.target.value) || 0
                  })}
                  placeholder="50.00"
                />
              </div>
              <div>
                <Label htmlFor="pricePerHour">Price per Hour</Label>
                <Input
                  id="pricePerHour"
                  type="number"
                  step="0.01"
                  value={editingRate.pricePerHour}
                  onChange={(e) => setEditingRate({
                    ...editingRate,
                    pricePerHour: parseFloat(e.target.value) || 0
                  })}
                  placeholder="75.00"
                />
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select 
                  value={editingRate.currency} 
                  onValueChange={(value: 'HUF' | 'USD' | 'EUR') => setEditingRate({
                    ...editingRate,
                    currency: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="HUF">HUF - Hungarian Forint</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCancelEditRate}>
                  Cancel
                </Button>
                <Button onClick={handleSaveRate}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Invite Members Modal */}
      {project && (
        <InviteMembersModal
          open={isInviteMembersOpen}
          onOpenChange={setIsInviteMembersOpen}
          projectId={project.id}
          projectName={project.name}
          availableUsers={users}
          existingMemberIds={projectMembers.map(m => m.user_id)}
          onMemberAdded={loadProjectMembers}
        />
      )}
    </Page>
  )
}
