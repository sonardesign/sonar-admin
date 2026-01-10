import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog'
import { Badge } from '../components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs'
import { ArrowLeft, Plus, Clock, DollarSign, Receipt, Calculator, Edit2, Users, Trash2, BarChart3, ListTodo, Wallet, Settings, ChevronLeft, ChevronRight, Search, User } from 'lucide-react'
import { ScrollArea } from '../components/ui/scroll-area'
import { SimpleCombobox } from '../components/ui/simple-combobox'
import { useSupabaseAppState } from '../hooks/useSupabaseAppState'
import { useProjectsData } from '../hooks/useProjectsData'
import { usePermissions } from '../hooks/usePermissions'
import { InviteMembersModal } from '../components/InviteMembersModal'
import { projectMembersService } from '../services/supabaseService'
import { supabase } from '../lib/supabase'
import { Project, TimeEntry, TaskStatus } from '../types'
import { Page } from '../components/Page'
import { notifications } from '../lib/notifications'
import { toast } from 'sonner'
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

// Kanban column definitions
const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'backlog', title: 'Backlog', color: 'bg-slate-500' },
  { id: 'todo', title: 'To Do', color: 'bg-blue-500' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-yellow-500' },
  { id: 'blocked', title: 'Blocked', color: 'bg-red-500' },
  { id: 'done', title: 'Done', color: 'bg-green-500' },
]

// Task Card Component (Draggable) - Project-specific version
interface TaskCardProps {
  entry: TimeEntry
  index: number
  user?: { full_name: string }
  onClick?: () => void
}

const TaskCard: React.FC<TaskCardProps> = ({ entry, index, user, onClick }) => {
  const hours = entry.duration_minutes ? Math.round(entry.duration_minutes / 60 * 10) / 10 : 0

  return (
    <div
      onClick={onClick}
      className="bg-card border border-border rounded-lg p-3 cursor-pointer shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Task Number */}
      {entry.task_number && (
        <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded inline-block mb-1.5">
          {entry.task_number}
        </span>
      )}
      
      {/* Task Title */}
      <p className="text-sm font-medium text-foreground line-clamp-2">
        {entry.description || 'Untitled Task'}
      </p>
      
      {/* Meta info - full width */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
        {/* Hours */}
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{hours}h</span>
        </div>
        
        {/* User */}
        {user && (
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span className="truncate max-w-[100px]">{user.full_name}</span>
          </div>
        )}
        
        {/* Entry type badge */}
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          {entry.entry_type === 'planned' ? 'Planned' : 'Reported'}
        </Badge>
      </div>
    </div>
  )
}

// Kanban Column Component (Drop Zone)
interface KanbanColumnProps {
  column: { id: TaskStatus; title: string; color: string }
  entries: TimeEntry[]
  users: any[]
  onTaskClick: (entry: TimeEntry) => void
  onAddClick: (status: TaskStatus) => void
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ column, entries, users, onTaskClick, onAddClick }) => {
  const getUser = (userId: string) => users.find(u => u.id === userId)

  return (
    <div className="flex flex-col bg-muted/30 rounded-lg min-w-[380px] w-[380px] max-h-full">
      {/* Column Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("h-3 w-3 rounded-full", column.color)} />
            <h3 className="font-semibold text-sm">{column.title}</h3>
            <span className="text-xs text-muted-foreground">({entries.length})</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onAddClick(column.id)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Column Content */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <ScrollArea className="flex-1">
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={cn(
                "p-2 min-h-[100px]",
                snapshot.isDraggingOver && "bg-primary/5"
              )}
            >
              {entries.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
                  No tasks
                </div>
              ) : (
                entries.map((entry, index) => (
                  <Draggable key={entry.id} draggableId={entry.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={cn(
                          "mb-2",
                          snapshot.isDragging && "opacity-50"
                        )}
                      >
                        <TaskCard
                          entry={entry}
                          index={index}
                          user={getUser(entry.user_id)}
                          onClick={() => onTaskClick(entry)}
                        />
                      </div>
                    )}
                  </Draggable>
                ))
              )}
              {provided.placeholder}
            </div>
          </ScrollArea>
        )}
      </Droppable>
    </div>
  )
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
  
  // Tasks view state
  const [taskEntries, setTaskEntries] = useState<TimeEntry[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string>('all')
  
  // Create task modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    title: '',
    status: 'backlog' as TaskStatus,
    userId: '',
    entryType: 'planned' as 'planned' | 'reported',
    hours: '1'
  })
  
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

  // Load tasks when project changes
  useEffect(() => {
    if (project?.id && activeTab === 'tasks') {
      loadTaskEntries()
    }
  }, [project?.id, activeTab])

  const loadTaskEntries = async () => {
    if (!project?.id) return
    
    setLoadingTasks(true)
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading task entries:', error)
        toast.error('Failed to load tasks')
      } else {
        // Set all entries without task_status to 'backlog'
        const entriesWithStatus = (data || []).map(entry => ({
          ...entry,
          task_status: entry.task_status || 'backlog'
        }))
        setTaskEntries(entriesWithStatus)
      }
    } catch (error) {
      console.error('Error loading task entries:', error)
    } finally {
      setLoadingTasks(false)
    }
  }

  // Handle drag end - move cards between columns or reorder within column
  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result

    // If dropped outside a droppable area, do nothing
    if (!destination) {
      return
    }

    // If dropped in the same position, do nothing
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return
    }

    const draggedEntry = taskEntries.find(e => e.id === draggableId)
    if (!draggedEntry) return

    const newStatus = destination.droppableId as TaskStatus
    const isSameColumn = draggedEntry.task_status === newStatus

    // If reordering within the same column
    if (isSameColumn) {
      // Get all entries in the same column
      const columnEntries = taskEntries.filter(e => e.task_status === newStatus)
      const reorderedEntries = Array.from(columnEntries)
      const [removed] = reorderedEntries.splice(source.index, 1)
      reorderedEntries.splice(destination.index, 0, removed)

      // Update state: rebuild array with reordered entries
      setTaskEntries(prev => {
        const otherEntries = prev.filter(e => e.task_status !== newStatus)
        return [...otherEntries, ...reorderedEntries]
      })
      
      return
    }

    // Moving to a different column
    // Optimistic update
    setTaskEntries(prev => prev.map(entry => 
      entry.id === draggableId ? { ...entry, task_status: newStatus } : entry
    ))

    try {
      const { error } = await supabase
        .from('time_entries')
        .update({ task_status: newStatus })
        .eq('id', draggableId)

      if (error) {
        console.error('Error updating task status:', error)
        toast.error('Failed to update task status')
        // Revert on error
        loadTaskEntries()
      } else {
        toast.success(`Task moved to ${COLUMNS.find(c => c.id === newStatus)?.title}`)
      }
    } catch (error) {
      console.error('Error updating task status:', error)
      loadTaskEntries()
    }
  }

  // User options for filter
  const userOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All Users' },
      ...users.map(u => ({
        value: u.id,
        label: u.full_name || u.email
      }))
    ]
  }, [users])

  // Filter entries by selected user and search query
  const filteredTaskEntries = useMemo(() => {
    let filtered = taskEntries
    
    if (selectedUserId !== 'all') {
      filtered = filtered.filter(entry => entry.user_id === selectedUserId)
    }
    
    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(entry => 
        entry.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.task_number?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    return filtered
  }, [taskEntries, selectedUserId, searchQuery])

  // Group entries by status
  const entriesByStatus = COLUMNS.reduce((acc, column) => {
    acc[column.id] = filteredTaskEntries.filter(entry => entry.task_status === column.id)
    return acc
  }, {} as Record<TaskStatus, TimeEntry[]>)

  // Handle clicking the add button on a column
  const handleAddClick = useCallback((status: TaskStatus) => {
    setCreateForm({
      title: '',
      status: status,
      userId: users[0]?.id || '',
      entryType: 'planned',
      hours: '1'
    })
    setIsCreateModalOpen(true)
  }, [users])

  // Handle creating a new task
  const handleCreateTask = async () => {
    if (!project?.id || !createForm.userId) {
      toast.error('Please select an assignee')
      return
    }

    try {
      const hours = parseFloat(createForm.hours)
      const durationMinutes = isNaN(hours) || hours <= 0 ? 60 : Math.round(hours * 60)
      const now = new Date().toISOString()

      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          description: createForm.title || 'New Task',
          task_status: createForm.status,
          user_id: createForm.userId,
          project_id: project.id,
          entry_type: createForm.entryType,
          duration_minutes: durationMinutes > 0 ? durationMinutes : 60,
          start_time: now,
          is_billable: true
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating task:', error)
        toast.error('Failed to create task')
      } else if (data) {
        const taskNumber = data.task_number || data.id
        const taskSlug = slugify(data.description || 'untitled')
        const taskUrl = `/tasks/${taskNumber}/${taskSlug}`
        
        // Show custom toast with link
        toast.success(
          <div className="flex flex-col gap-1.5">
            <div className="font-semibold">Task created</div>
            <div className="text-sm text-muted-foreground">{data.description || 'Untitled Task'}</div>
            <button
              onClick={() => {
                navigate(taskUrl)
                toast.dismiss()
              }}
              className="text-[14px] text-primary hover:text-primary/80 underline text-left w-fit mt-0.5 transition-colors"
            >
              Open Task
            </button>
          </div>,
          {
            duration: Infinity,
            closeButton: true,
          }
        )
        
        setIsCreateModalOpen(false)
        await loadTaskEntries()
      }
    } catch (error) {
      console.error('Error creating task:', error)
      toast.error('Failed to create task')
    }
  }

  // Create URL-friendly slug from task title
  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50) || 'untitled'
  }

  // Handle clicking on a task - navigate to detail page
  const handleTaskClick = useCallback((entry: TimeEntry) => {
    const taskNumber = entry.task_number || entry.id
    const taskSlug = slugify(entry.description || 'untitled')
    navigate(`/tasks/${taskNumber}/${taskSlug}`)
  }, [navigate])

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
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Search Field */}
                <div className="relative w-[250px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* User Filter */}
                <SimpleCombobox
                  options={userOptions}
                  value={selectedUserId}
                  onValueChange={setSelectedUserId}
                  placeholder="Filter by user..."
                  searchPlaceholder="Search users..."
                  emptyText="No users found."
                  className="w-[200px]"
                />
              </div>

              <div className="text-sm text-muted-foreground">
                {filteredTaskEntries.length} {(selectedUserId !== 'all' || searchQuery) ? 'filtered' : 'total'} tasks
              </div>
            </div>

            {/* Kanban View */}
            {loadingTasks ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading tasks...</p>
                </div>
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-150px)]">
                      {COLUMNS.map((column) => (
                        <KanbanColumn
                          key={column.id}
                          column={column}
                          entries={entriesByStatus[column.id] || []}
                          users={users}
                          onTaskClick={handleTaskClick}
                          onAddClick={handleAddClick}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </DragDropContext>
            )}
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

      {/* Create Task Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
            <DialogDescription>
              Add a new task to {project?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="createTaskTitle">Title</Label>
              <Input
                id="createTaskTitle"
                placeholder="Enter task title..."
                value={createForm.title}
                onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="createTaskStatus">Status</Label>
              <Select
                value={createForm.status}
                onValueChange={(value: TaskStatus) => setCreateForm(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status..." />
                </SelectTrigger>
                <SelectContent>
                  {COLUMNS.map((col) => (
                    <SelectItem key={col.id} value={col.id}>
                      <div className="flex items-center gap-2">
                        <div className={cn("h-2 w-2 rounded-full", col.color)} />
                        {col.title}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assignee */}
            <div className="space-y-2">
              <Label htmlFor="createTaskAssignee">Assignee</Label>
              <Select
                value={createForm.userId}
                onValueChange={(value) => setCreateForm(prev => ({ ...prev, userId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee..." />
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

            {/* Entry Type */}
            <div className="space-y-2">
              <Label htmlFor="createTaskEntryType">Type</Label>
              <Select
                value={createForm.entryType}
                onValueChange={(value: 'planned' | 'reported') => setCreateForm(prev => ({ ...prev, entryType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="reported">Reported</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Hours */}
            <div className="space-y-2">
              <Label htmlFor="createTaskHours">Hours</Label>
              <Input
                id="createTaskHours"
                type="number"
                min="0"
                step="0.5"
                placeholder="Enter hours..."
                value={createForm.hours}
                onChange={(e) => setCreateForm(prev => ({ ...prev, hours: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateTask}>
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  )
}
