import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { Page } from '../components/Page'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Badge } from '../components/ui/badge'
import { SimpleCombobox } from '../components/ui/simple-combobox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { Input } from '../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Kanban, List, Clock, User, Plus } from 'lucide-react'
import { ScrollArea } from '../components/ui/scroll-area'
import { useSupabaseAppState } from '../hooks/useSupabaseAppState'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { cn } from '../lib/utils'
import { TaskStatus, TimeEntry } from '../types'

// Kanban column definitions
const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'backlog', title: 'Backlog', color: 'bg-slate-500' },
  { id: 'todo', title: 'To Do', color: 'bg-blue-500' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-yellow-500' },
  { id: 'blocked', title: 'Blocked', color: 'bg-red-500' },
  { id: 'done', title: 'Done', color: 'bg-green-500' },
]

// Drag item type
const ItemTypes = {
  TASK: 'task',
}

// Task Card Component (Draggable)
interface TaskCardProps {
  entry: TimeEntry
  project?: { name: string; color: string }
  user?: { full_name: string }
  onClick?: () => void
}

const TaskCard: React.FC<TaskCardProps> = ({ entry, project, user, onClick }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.TASK,
    item: { id: entry.id, status: entry.task_status },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [entry.id, entry.task_status])

  const hours = entry.duration_minutes ? Math.round(entry.duration_minutes / 60 * 10) / 10 : 0

  return (
    <div
      ref={drag}
      onClick={onClick}
      className={cn(
        "bg-card border border-border rounded-lg p-3 cursor-grab shadow-sm hover:shadow-md transition-shadow active:cursor-grabbing",
        isDragging && "opacity-50"
      )}
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
      
      {/* Project */}
      {project && (
        <div className="flex items-center gap-1.5 mt-2">
          <div
            className="h-2 w-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: project.color }}
          />
          <span className="text-xs text-muted-foreground truncate">{project.name}</span>
        </div>
      )}
      
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
  projects: any[]
  users: any[]
  onDrop: (entryId: string, newStatus: TaskStatus) => void
  onTaskClick: (entry: TimeEntry) => void
  onAddClick: (status: TaskStatus) => void
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ column, entries, projects, users, onDrop, onTaskClick, onAddClick }) => {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.TASK,
    drop: (item: { id: string; status: TaskStatus }) => {
      if (item.status !== column.id) {
        onDrop(item.id, column.id)
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [column.id, onDrop])

  const getProject = (projectId: string) => projects.find(p => p.id === projectId)
  const getUser = (userId: string) => users.find(u => u.id === userId)

  return (
    <div
      ref={drop}
      className={cn(
        "flex flex-col bg-muted/30 rounded-lg min-w-[380px] w-[380px] max-h-full",
        isOver && canDrop && "ring-2 ring-primary ring-offset-2"
      )}
    >
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
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {entries.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
              No tasks
            </div>
          ) : (
            entries.map((entry) => (
              <TaskCard
                key={entry.id}
                entry={entry}
                project={getProject(entry.project_id)}
                user={getUser(entry.user_id)}
                onClick={() => onTaskClick(entry)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// Main Tasks Page Component
export const Tasks: React.FC = () => {
  const navigate = useNavigate()
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all')
  const [selectedUserId, setSelectedUserId] = useState<string>('all')
  const { projects, users } = useSupabaseAppState()
  const [taskEntries, setTaskEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)

  // Create task modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    title: '',
    status: 'backlog' as TaskStatus,
    userId: '',
    projectId: '',
    entryType: 'planned' as 'planned' | 'reported',
    hours: '1'
  })

  // Project options for filter
  const projectOptions = useMemo(() => {
    const activeProjects = projects.filter(p => !p.is_archived && !p.archived)
    return [
      { value: 'all', label: 'All Projects' },
      ...activeProjects.map(p => ({
        value: p.id,
        label: p.name,
        color: p.color
      }))
    ]
  }, [projects])

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

  // Load all time entries with task_status
  useEffect(() => {
    loadTaskEntries()
  }, [])

  const loadTaskEntries = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
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
      setLoading(false)
    }
  }

  // Handle dropping a task into a new column
  const handleDrop = useCallback(async (entryId: string, newStatus: TaskStatus) => {
    // Optimistic update
    setTaskEntries(prev => prev.map(entry => 
      entry.id === entryId ? { ...entry, task_status: newStatus } : entry
    ))

    try {
      const { error } = await supabase
        .from('time_entries')
        .update({ task_status: newStatus })
        .eq('id', entryId)

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
  }, [])

  // Filter entries by selected project and user
  const filteredEntries = useMemo(() => {
    let filtered = taskEntries
    
    if (selectedProjectId !== 'all') {
      filtered = filtered.filter(entry => entry.project_id === selectedProjectId)
    }
    
    if (selectedUserId !== 'all') {
      filtered = filtered.filter(entry => entry.user_id === selectedUserId)
    }
    
    return filtered
  }, [taskEntries, selectedProjectId, selectedUserId])

  // Group entries by status
  const entriesByStatus = COLUMNS.reduce((acc, column) => {
    acc[column.id] = filteredEntries.filter(entry => entry.task_status === column.id)
    return acc
  }, {} as Record<TaskStatus, TimeEntry[]>)

  // Handle clicking the add button on a column
  const handleAddClick = useCallback((status: TaskStatus) => {
    setCreateForm({
      title: '',
      status: status,
      userId: users[0]?.id || '',
      projectId: projects.filter(p => !p.is_archived && !p.archived)[0]?.id || '',
      entryType: 'planned',
      hours: '1'
    })
    setIsCreateModalOpen(true)
  }, [users, projects])

  // Handle creating a new task
  const handleCreateTask = async () => {
    if (!createForm.projectId || !createForm.userId) {
      toast.error('Please select a project and assignee')
      return
    }

    try {
      const hours = parseFloat(createForm.hours)
      // duration_minutes must be > 0 or NULL (database constraint)
      const durationMinutes = isNaN(hours) || hours <= 0 ? 60 : Math.round(hours * 60)
      const now = new Date().toISOString()

      const { error } = await supabase
        .from('time_entries')
        .insert({
          description: createForm.title || 'New Task',
          task_status: createForm.status,
          user_id: createForm.userId,
          project_id: createForm.projectId,
          entry_type: createForm.entryType,
          duration_minutes: durationMinutes > 0 ? durationMinutes : 60,
          start_time: now,
          // Don't set end_time - the database trigger calculates duration from end_time - start_time
          // Setting end_time = start_time would result in 0 duration which violates the constraint
          is_billable: true
        })

      if (error) {
        console.error('Error creating task:', error)
        toast.error('Failed to create task')
      } else {
        toast.success('Task created')
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
    
    // Track recently opened entry
    try {
      const recent = JSON.parse(localStorage.getItem('recentEntries') || '[]') as Array<{
        id: string;
        task_number?: string;
        description?: string;
        openedAt: number;
      }>;
      
      // Remove if already exists
      const filtered = recent.filter(e => e.id !== entry.id);
      
      // Add to beginning
      filtered.unshift({
        id: entry.id,
        task_number: entry.task_number,
        description: entry.description,
        openedAt: Date.now()
      });
      
      // Keep only last 20
      const limited = filtered.slice(0, 20);
      
      localStorage.setItem('recentEntries', JSON.stringify(limited));
    } catch (error) {
      console.error('Error tracking entry:', error);
    }
    
    navigate(`/tasks/${taskNumber}/${taskSlug}`)
  }, [navigate])

  return (
    <Page loading={loading} loadingText="Loading tasks...">
      <div className="space-y-4">
        {/* View Toggle and Filters */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Tabs value={view} onValueChange={(v) => setView(v as 'kanban' | 'list')}>
              <TabsList>
                <TabsTrigger value="kanban" className="flex items-center gap-2">
                  <Kanban className="h-4 w-4" />
                  Kanban
                </TabsTrigger>
                <TabsTrigger value="list" className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  List
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Project Filter */}
            <SimpleCombobox
              options={projectOptions}
              value={selectedProjectId}
              onValueChange={setSelectedProjectId}
              placeholder="Filter by project..."
              searchPlaceholder="Search projects..."
              emptyText="No projects found."
              className="w-[200px]"
            />

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
            {filteredEntries.length} {(selectedProjectId !== 'all' || selectedUserId !== 'all') ? 'filtered' : 'total'} tasks
          </div>
        </div>

        {/* Kanban View */}
        {view === 'kanban' && (
          <DndProvider backend={HTML5Backend}>
            <Card>
              <CardContent className="p-4">
                <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-120px)]">
                  {COLUMNS.map((column) => (
                    <KanbanColumn
                      key={column.id}
                      column={column}
                      entries={entriesByStatus[column.id] || []}
                      projects={projects}
                      users={users}
                      onDrop={handleDrop}
                      onTaskClick={handleTaskClick}
                      onAddClick={handleAddClick}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </DndProvider>
        )}

        {/* List View (placeholder) */}
        {view === 'list' && (
          <Card>
            <CardHeader>
              <CardTitle>List View</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">List view coming soon...</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Task Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
            <DialogDescription>
              Add a new task to the board
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

            {/* Project */}
            <div className="space-y-2">
              <Label htmlFor="createTaskProject">Project</Label>
              <Select
                value={createForm.projectId}
                onValueChange={(value) => setCreateForm(prev => ({ ...prev, projectId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.filter(p => !p.is_archived && !p.archived).map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: project.color }}
                        />
                        {project.name}
                      </div>
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

