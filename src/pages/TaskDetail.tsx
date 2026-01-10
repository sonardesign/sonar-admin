import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import UnderlineExtension from '@tiptap/extension-underline'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Page } from '../components/Page'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Badge } from '../components/ui/badge'
import { Avatar, AvatarFallback } from '../components/ui/avatar'
import { Textarea } from '../components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover'
import { Calendar } from '../components/ui/calendar'
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { format } from 'date-fns'
import { 
  ArrowLeft, 
  ChevronRight, 
  ChevronLeft,
  Clock,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  ListTodo,
  Heading1,
  Heading2,
  Heading3,
  Send,
  Trash2,
  CalendarIcon,
  Search,
  Link as LinkIcon,
  X as XIcon
} from 'lucide-react'
import { useSupabaseAppState } from '../hooks/useSupabaseAppState'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { cn } from '../lib/utils'
import { TaskStatus, TimeEntry } from '../types'

// Status column definitions
const STATUSES: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'backlog', title: 'Backlog', color: 'bg-slate-500' },
  { id: 'todo', title: 'To Do', color: 'bg-blue-500' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-yellow-500' },
  { id: 'blocked', title: 'Blocked', color: 'bg-red-500' },
  { id: 'done', title: 'Done', color: 'bg-green-500' },
]

// Comment interface
interface Comment {
  id: string
  task_id: string
  user_id: string
  content: string
  created_at: string
  user?: { full_name: string }
}

// TipTap Rich Text Editor Component with floating toolbar
interface TipTapEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

const TipTapEditor: React.FC<TipTapEditorProps> = ({ value, onChange, placeholder }) => {
  const [showToolbar, setShowToolbar] = useState(false)
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 })
  const containerRef = React.useRef<HTMLDivElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      UnderlineExtension,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Start typing...',
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection
      const hasSelection = from !== to
      
      if (hasSelection && containerRef.current) {
        const { view } = editor
        const start = view.coordsAtPos(from)
        const end = view.coordsAtPos(to)
        const containerRect = containerRef.current.getBoundingClientRect()
        
        setToolbarPosition({
          top: start.top - containerRect.top - 45,
          left: ((start.left + end.left) / 2) - containerRect.left - 120
        })
        setShowToolbar(true)
      } else {
        setShowToolbar(false)
      }
    },
    onBlur: () => {
      // Delay to allow toolbar button clicks
      setTimeout(() => setShowToolbar(false), 150)
    },
    editorProps: {
      attributes: {
        class: 'min-h-[150px] focus:outline-none prose prose-sm dark:prose-invert max-w-none text-foreground',
      },
    },
  })


  // Update content when value changes externally
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value)
    }
  }, [value, editor])

  if (!editor) {
    return null
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Floating Toolbar - appears on text selection */}
      {showToolbar && (
        <div
          className="absolute z-50 flex items-center gap-0.5 p-1 bg-popover border border-border rounded-lg shadow-lg"
          style={{
            top: toolbarPosition.top,
            left: Math.max(0, toolbarPosition.left),
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("h-7 w-7 p-0", editor.isActive('heading', { level: 1 }) && "bg-muted")}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            title="Heading 1 (type # + space)"
          >
            <Heading1 className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("h-7 w-7 p-0", editor.isActive('heading', { level: 2 }) && "bg-muted")}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Heading 2 (type ## + space)"
          >
            <Heading2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("h-7 w-7 p-0", editor.isActive('heading', { level: 3 }) && "bg-muted")}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            title="Heading 3 (type ### + space)"
          >
            <Heading3 className="h-3.5 w-3.5" />
          </Button>
          <div className="w-px h-5 bg-border mx-0.5" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("h-7 w-7 p-0", editor.isActive('bold') && "bg-muted")}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("h-7 w-7 p-0", editor.isActive('italic') && "bg-muted")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("h-7 w-7 p-0", editor.isActive('underline') && "bg-muted")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="Underline"
          >
            <Underline className="h-3.5 w-3.5" />
          </Button>
          <div className="w-px h-5 bg-border mx-0.5" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("h-7 w-7 p-0", editor.isActive('bulletList') && "bg-muted")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet List"
          >
            <List className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("h-7 w-7 p-0", editor.isActive('orderedList') && "bg-muted")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Numbered List"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("h-7 w-7 p-0", editor.isActive('taskList') && "bg-muted")}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            title="Task List (type [] + space)"
          >
            <ListTodo className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      
      {/* Editor Content */}
      <EditorContent editor={editor} />
      
      <style>{`
        .ProseMirror {
          font-size: 0.875rem;
          line-height: 1.5;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          float: left;
          height: 0;
        }
        .ProseMirror h1 { font-size: 1rem; font-weight: 400; margin: 0.5rem 0; }
        .ProseMirror h2 { font-size: 0.9375rem; font-weight: 400; margin: 0.5rem 0; }
        .ProseMirror h3 { font-size: 0.875rem; font-weight: 400; margin: 0.5rem 0; }
        .ProseMirror ul { padding-left: 1.5rem; margin: 0.5rem 0; list-style-type: disc; }
        .ProseMirror ol { padding-left: 1.5rem; margin: 0.5rem 0; list-style-type: decimal; }
        .ProseMirror li { margin: 0.25rem 0; display: list-item; }
        .ProseMirror li p { margin: 0; }
        .ProseMirror p { margin: 0.25rem 0; }
        
        /* Task List Styles */
        .ProseMirror ul[data-type="taskList"] {
          list-style: none;
          padding-left: 0;
        }
        .ProseMirror ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
        }
        .ProseMirror ul[data-type="taskList"] li > label {
          flex-shrink: 0;
          margin-top: 0.25rem;
        }
        .ProseMirror ul[data-type="taskList"] li > label input[type="checkbox"] {
          width: 1rem;
          height: 1rem;
          cursor: pointer;
          accent-color: hsl(var(--primary));
        }
        .ProseMirror ul[data-type="taskList"] li > div {
          flex: 1;
        }
        .ProseMirror ul[data-type="taskList"] li[data-checked="true"] > div {
          text-decoration: line-through;
          opacity: 0.6;
        }
      `}</style>
    </div>
  )
}

// Main TaskDetail Component
export const TaskDetail: React.FC = () => {
  const { taskNumber } = useParams<{ taskNumber: string; taskSlug: string }>()
  const navigate = useNavigate()
  const { projects, users } = useSupabaseAppState()
  
  const [task, setTask] = useState<TimeEntry | null>(null)
  const [taskId, setTaskId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('backlog')
  const [assigneeId, setAssigneeId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [hours, setHours] = useState<number>(0)
  const [entryDate, setEntryDate] = useState<Date | undefined>(undefined)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [startTime, setStartTime] = useState<string>('')
  const [endTime, setEndTime] = useState<string>('')
  const [entryType, setEntryType] = useState<'planned' | 'reported'>('reported')
  
  // Comments state
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)
  
  // Related time entries state
  const [relatedTimeEntries, setRelatedTimeEntries] = useState<TimeEntry[]>([])
  const [allProjectTimeEntries, setAllProjectTimeEntries] = useState<TimeEntry[]>([])
  const [timeEntrySearch, setTimeEntrySearch] = useState('')
  const [loadingTimeEntries, setLoadingTimeEntries] = useState(false)
  const [isTimeEntryModalOpen, setIsTimeEntryModalOpen] = useState(false)
  
  // Navigation state for prev/next tasks
  const [allTaskNumbers, setAllTaskNumbers] = useState<string[]>([])
  const [currentTaskIndex, setCurrentTaskIndex] = useState(-1)

  // Load all task numbers for prev/next navigation
  useEffect(() => {
    loadAllTaskNumbers()
  }, [])

  // Load task data
  useEffect(() => {
    if (taskNumber) {
      loadTask()
    }
  }, [taskNumber])

  // Load comments when taskId is available
  useEffect(() => {
    if (taskId) {
      loadComments()
    }
  }, [taskId])

  // Load time entries when projectId and taskId are available
  useEffect(() => {
    if (projectId && taskId) {
      loadTimeEntries()
    }
  }, [projectId, taskId])

  // Update current task index when task or allTaskNumbers changes
  useEffect(() => {
    if (task && task.task_number && allTaskNumbers.length > 0) {
      setCurrentTaskIndex(allTaskNumbers.indexOf(task.task_number))
    }
  }, [task, allTaskNumbers])

  const loadAllTaskNumbers = async () => {
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('task_number')
        .not('task_number', 'is', null)
        .order('created_at', { ascending: false })

      if (!error && data) {
        const taskNumbers = data.map(t => t.task_number).filter(Boolean)
        setAllTaskNumbers(taskNumbers)
      }
    } catch (error) {
      console.error('Error loading task numbers:', error)
    }
  }

  const loadTask = async () => {
    if (!taskNumber) return
    
    setLoading(true)
    try {
      // Try to find by task_number first, fallback to id for backward compatibility
      let query = supabase
        .from('time_entries')
        .select('*')
      
      // Check if it looks like a task number (snr-XXX) or a UUID
      if (taskNumber.startsWith('snr-')) {
        query = query.eq('task_number', taskNumber)
      } else {
        query = query.eq('id', taskNumber)
      }
      
      const { data, error } = await query.single()

      if (error) {
        console.error('Error loading task:', error)
        toast.error('Failed to load task')
        navigate('/tasks')
      } else if (data) {
        setTask(data)
        setTaskId(data.id)
        setTitle(data.description || '')
        setDescription(data.notes || '')
        setStatus(data.task_status || 'backlog')
        setAssigneeId(data.user_id)
        setProjectId(data.project_id)
        setHours(data.duration_minutes ? Math.round(data.duration_minutes / 60 * 10) / 10 : 0)
        setEntryDate(data.start_time ? new Date(data.start_time) : undefined)
        setEntryType(data.entry_type || 'reported')
        
        // Set start and end times
        if (data.start_time) {
          const start = new Date(data.start_time)
          setStartTime(format(start, 'HH:mm'))
        }
        if (data.end_time) {
          const end = new Date(data.end_time)
          setEndTime(format(end, 'HH:mm'))
        }
        
        // Track recently opened entry
        try {
          const recent = JSON.parse(localStorage.getItem('recentEntries') || '[]') as Array<{
            id: string;
            task_number?: string;
            description?: string;
            openedAt: number;
          }>;
          
          // Remove if already exists
          const filtered = recent.filter(e => e.id !== data.id);
          
          // Add to beginning
          filtered.unshift({
            id: data.id,
            task_number: data.task_number,
            description: data.description,
            openedAt: Date.now()
          });
          
          // Keep only last 20
          const limited = filtered.slice(0, 20);
          
          localStorage.setItem('recentEntries', JSON.stringify(limited));
        } catch (error) {
          console.error('Error tracking entry:', error);
        }
      }
    } catch (error) {
      console.error('Error loading task:', error)
      toast.error('Failed to load task')
    } finally {
      setLoading(false)
    }
  }

  const loadComments = async () => {
    if (!taskId) return
    
    setLoadingComments(true)
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .select(`
          *,
          user:profiles(full_name)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })

      if (!error && data) {
        setComments(data)
      }
    } catch (error) {
      console.error('Error loading comments:', error)
    } finally {
      setLoadingComments(false)
    }
  }

  const loadTimeEntries = async () => {
    if (!projectId || !taskId) return
    
    setLoadingTimeEntries(true)
    try {
      console.log('Loading time entries for project:', projectId, 'task:', taskId)
      
      // Load all time entries for this project (excluding this task itself)
      const { data: allEntries, error: allError } = await supabase
        .from('time_entries')
        .select('*')
        .eq('project_id', projectId)
        .neq('id', taskId) // Exclude the current task
        .order('start_time', { ascending: false })

      console.log('All entries from project:', allEntries?.length || 0)

      // Load time entries already linked to this task
      const { data: linkedEntries, error: linkedError } = await supabase
        .from('time_entries')
        .select('*')
        .eq('task_id', taskId)
        .neq('id', taskId) // Exclude the current task
        .order('start_time', { ascending: false })

      console.log('Already linked entries:', linkedEntries?.length || 0)

      if (allError) {
        console.error('Error loading all entries:', allError)
      }
      
      if (linkedError) {
        console.error('Error loading linked entries:', linkedError)
      }

      if (!allError && allEntries) {
        setAllProjectTimeEntries(allEntries)
      }

      if (!linkedError && linkedEntries) {
        setRelatedTimeEntries(linkedEntries)
      }
    } catch (error) {
      console.error('Error loading time entries:', error)
    } finally {
      setLoadingTimeEntries(false)
    }
  }

  const handleLinkTimeEntry = async (entryId: string) => {
    if (!taskId) return

    try {
      const { error } = await supabase
        .from('time_entries')
        .update({ task_id: taskId })
        .eq('id', entryId)

      if (error) {
        console.error('Error linking time entry:', error)
        toast.error('Failed to link time entry')
      } else {
        toast.success('Time entry linked to task')
        loadTimeEntries() // Reload to update both lists
      }
    } catch (error) {
      console.error('Error linking time entry:', error)
      toast.error('Failed to link time entry')
    }
  }

  const handleUnlinkTimeEntry = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from('time_entries')
        .update({ task_id: null })
        .eq('id', entryId)

      if (error) {
        console.error('Error unlinking time entry:', error)
        toast.error('Failed to unlink time entry')
      } else {
        toast.success('Time entry unlinked from task')
        loadTimeEntries() // Reload to update both lists
      }
    } catch (error) {
      console.error('Error unlinking time entry:', error)
      toast.error('Failed to unlink time entry')
    }
  }

  // Auto-save on field changes
  const saveTask = useCallback(async (updates: Partial<TimeEntry>) => {
    if (!taskId) return
    
    setSaving(true)
    try {
      const { error } = await supabase
        .from('time_entries')
        .update(updates)
        .eq('id', taskId)

      if (error) {
        console.error('Error saving task:', error)
        toast.error('Failed to save changes')
      }
    } catch (error) {
      console.error('Error saving task:', error)
    } finally {
      setSaving(false)
    }
  }, [taskId])

  // Debounced save for text fields
  const debouncedSaveRef = React.useRef<NodeJS.Timeout>()
  
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle)
    if (debouncedSaveRef.current) clearTimeout(debouncedSaveRef.current)
    debouncedSaveRef.current = setTimeout(() => {
      saveTask({ description: newTitle })
    }, 500)
  }

  const handleDescriptionChange = (newDescription: string) => {
    setDescription(newDescription)
    if (debouncedSaveRef.current) clearTimeout(debouncedSaveRef.current)
    debouncedSaveRef.current = setTimeout(() => {
      saveTask({ notes: newDescription } as any)
    }, 500)
  }

  const handleStatusChange = (newStatus: TaskStatus) => {
    setStatus(newStatus)
    saveTask({ task_status: newStatus })
  }

  const handleAssigneeChange = (newAssigneeId: string) => {
    setAssigneeId(newAssigneeId)
    saveTask({ user_id: newAssigneeId })
  }

  const handleProjectChange = (newProjectId: string) => {
    setProjectId(newProjectId)
    saveTask({ project_id: newProjectId })
  }

  const handleHoursChange = (newHours: number) => {
    setHours(newHours)
    const durationMinutes = Math.round(newHours * 60)
    
    // Calculate new end_time based on start_time and duration
    // This is needed because a DB trigger recalculates duration_minutes from start_time/end_time
    if (task?.start_time) {
      const startTime = new Date(task.start_time)
      const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000)
      saveTask({ 
        duration_minutes: durationMinutes,
        end_time: endTime.toISOString()
      })
    } else {
      saveTask({ duration_minutes: durationMinutes })
    }
  }

  const handleDateChange = (date: Date | undefined) => {
    if (!date) return
    
    setEntryDate(date)
    
    // Update start_time, and if duration is set, update end_time accordingly
    const startTime = date
    const updates: any = { start_time: startTime.toISOString() }
    
    if (hours > 0) {
      const durationMinutes = Math.round(hours * 60)
      const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000)
      updates.end_time = endTime.toISOString()
      updates.duration_minutes = durationMinutes
    }
    
    saveTask(updates)
  }

  const handleStartTimeChange = (time: string) => {
    setStartTime(time)
    
    if (!entryDate) return
    
    const [hours, minutes] = time.split(':').map(Number)
    const newStartTime = new Date(entryDate)
    newStartTime.setHours(hours, minutes, 0, 0)
    
    const updates: any = { start_time: newStartTime.toISOString() }
    
    // If end time is set, recalculate duration
    if (endTime) {
      const [endHours, endMinutes] = endTime.split(':').map(Number)
      const newEndTime = new Date(entryDate)
      newEndTime.setHours(endHours, endMinutes, 0, 0)
      
      if (newEndTime > newStartTime) {
        updates.end_time = newEndTime.toISOString()
        const durationMinutes = Math.round((newEndTime.getTime() - newStartTime.getTime()) / (1000 * 60))
        updates.duration_minutes = durationMinutes
        setHours(Math.round(durationMinutes / 60 * 10) / 10)
      }
    }
    
    saveTask(updates)
  }

  const handleEndTimeChange = (time: string) => {
    setEndTime(time)
    
    if (!entryDate) return
    
    const [hours, minutes] = time.split(':').map(Number)
    const newEndTime = new Date(entryDate)
    newEndTime.setHours(hours, minutes, 0, 0)
    
    const updates: any = { end_time: newEndTime.toISOString() }
    
    // If start time is set, recalculate duration
    if (startTime) {
      const [startHours, startMinutes] = startTime.split(':').map(Number)
      const newStartTime = new Date(entryDate)
      newStartTime.setHours(startHours, startMinutes, 0, 0)
      
      if (newEndTime > newStartTime) {
        const durationMinutes = Math.round((newEndTime.getTime() - newStartTime.getTime()) / (1000 * 60))
        updates.duration_minutes = durationMinutes
        setHours(Math.round(durationMinutes / 60 * 10) / 10)
      }
    }
    
    saveTask(updates)
  }

  const handleEntryTypeChange = (newType: 'planned' | 'reported') => {
    setEntryType(newType)
    saveTask({ entry_type: newType })
  }

  // Navigation functions
  const handlePrevTask = () => {
    if (currentTaskIndex > 0 && allTaskNumbers.length > 0) {
      const prevTaskNumber = allTaskNumbers[currentTaskIndex - 1]
      const slug = prevTaskNumber.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      navigate(`/tasks/${prevTaskNumber}/${slug}`)
    }
  }

  const handleNextTask = () => {
    if (currentTaskIndex >= 0 && currentTaskIndex < allTaskNumbers.length - 1) {
      const nextTaskNumber = allTaskNumbers[currentTaskIndex + 1]
      const slug = nextTaskNumber.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      navigate(`/tasks/${nextTaskNumber}/${slug}`)
    }
  }

  const handleGoToTimetable = () => {
    if (task && task.start_time) {
      const date = new Date(task.start_time)
      const dateStr = format(date, 'yyyy-MM-dd')
      navigate(`/timetable?date=${dateStr}&view=week`)
    } else {
      navigate('/timetable')
    }
  }

  // Add comment
  const handleAddComment = async () => {
    if (!newComment.trim() || !taskId) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          user_id: user.id,
          content: newComment.trim()
        })
        .select(`
          *,
          user:profiles(full_name)
        `)
        .single()

      if (error) {
        console.error('Error adding comment:', error)
        toast.error('Failed to add comment')
      } else if (data) {
        setComments(prev => [...prev, data])
        setNewComment('')
        toast.success('Comment added')
      }
    } catch (error) {
      console.error('Error adding comment:', error)
    }
  }

  // Delete comment
  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('task_comments')
        .delete()
        .eq('id', commentId)

      if (error) {
        console.error('Error deleting comment:', error)
        toast.error('Failed to delete comment')
      } else {
        setComments(prev => prev.filter(c => c.id !== commentId))
        toast.success('Comment deleted')
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
    }
  }

  // Get user initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Get project and assignee info
  const project = projects.find(p => p.id === projectId)
  const assignee = users.find(u => u.id === assigneeId)

  if (loading) {
    return (
      <Page title="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Page>
    )
  }

  if (!task) {
    return (
      <Page title="Task Not Found">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-muted-foreground">The task you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/tasks')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tasks
          </Button>
        </div>
      </Page>
    )
  }

  return (
    <Page title="">
      <div className="h-full flex border border-border rounded-lg">
        {/* Left Side - Breadcrumbs + Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Row 0: Back button + Breadcrumb */}
          <div className="flex items-center justify-between gap-2 p-4 mb-6 border-b border-border">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/tasks')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Tasks
              </Button>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <Badge variant="outline" className="font-mono text-xs">
                {task.task_number}
              </Badge>
              {saving && (
                <span className="text-xs text-muted-foreground ml-2">Saving...</span>
              )}
            </div>
            
            {/* Navigation buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGoToTimetable}
                className="flex items-center gap-2"
              >
                <CalendarIcon className="h-4 w-4" />
                View in Timetable
              </Button>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrevTask}
                  disabled={currentTaskIndex <= 0}
                  className="h-8 w-8 p-0"
                  title="Previous Task"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNextTask}
                  disabled={currentTaskIndex < 0 || currentTaskIndex >= allTaskNumbers.length - 1}
                  className="h-8 w-8 p-0"
                  title="Next Task"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Content body - centered with max-width */}
          <div className="max-w-[80ch] mx-auto w-full px-6">
            {/* Row 1: Title */}
          <div className="mb-6">
            <div
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleTitleChange(e.currentTarget.textContent || '')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  e.currentTarget.blur()
                }
              }}
              className="font-normal text-foreground outline-none"
              style={{ fontSize: '1.5rem' }}
              data-placeholder="Task title..."
              dangerouslySetInnerHTML={{ __html: title || '' }}
            />
            <style>{`
              [data-placeholder]:empty:before {
                content: attr(data-placeholder);
                color: hsl(var(--muted-foreground));
              }
            `}</style>
          </div>

          {/* Row 2: Description - Rich Text Editor */}
          <div className="mb-6">
            <TipTapEditor
              value={description}
              onChange={handleDescriptionChange}
              placeholder="Add a description..."
            />
          </div>

          {/* Row 2.5: Related Time Entries */}
          <div className="mb-6">
            <Label className="text-sm font-medium mb-3 block">Related Time Entries</Label>
            
            {/* Linked Time Entries List */}
            {relatedTimeEntries.length > 0 && (
              <div className="space-y-2 mb-4">
                {relatedTimeEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 border border-border rounded-md bg-muted/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {entry.description || 'Untitled entry'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(entry.start_time), 'MMM d, yyyy HH:mm')}
                        {entry.end_time && ` - ${format(new Date(entry.end_time), 'HH:mm')}`}
                        {entry.duration_minutes && ` (${(entry.duration_minutes / 60).toFixed(1)}h)`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnlinkTimeEntry(entry.id)}
                      className="ml-2"
                      title="Unlink time entry"
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Search field - opens modal */}
            <div 
              className="relative cursor-pointer"
              onClick={() => setIsTimeEntryModalOpen(true)}
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search and link time entries..."
                value=""
                readOnly
                className="pl-10 cursor-pointer"
              />
            </div>
          </div>

          {/* Row 3: Comments */}
          <div className="flex-1">
            <Label className="text-sm font-medium mb-3 block">Comments</Label>
            
            {/* Comments List */}
            <div className="space-y-4 mb-4">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No comments yet.</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 group">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="text-xs">
                        {getInitials(comment.user?.full_name || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {comment.user?.full_name || 'Unknown'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.created_at).toLocaleDateString()} {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                      <p className="text-sm text-foreground mt-1">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment */}
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="text-xs">ME</AvatarFallback>
              </Avatar>
              <div className="flex-1 flex gap-2">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="min-h-[80px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      handleAddComment()
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="self-end"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          </div>
          {/* End of content body */}
        </div>
        {/* End of left side */}

        {/* Separator */}
        <div className="w-px bg-border flex-shrink-0" />

        {/* Right Side - Sidebar */}
        <div className="w-[300px] flex-shrink-0 h-full">
          <div className="space-y-4 p-6">
              {/* Assignee */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Assignee</Label>
                <Select value={assigneeId} onValueChange={handleAssigneeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[10px]">
                              {getInitials(user.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          {user.full_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Project */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Project</Label>
                <Select value={projectId} onValueChange={handleProjectChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.filter(p => !p.is_archived && !p.archived).map((project) => (
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

              {/* Status */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={status} onValueChange={handleStatusChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status..." />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <div className={cn("h-2 w-2 rounded-full", s.color)} />
                          {s.title}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Date</Label>
                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !entryDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {entryDate ? format(entryDate, 'PPP') : 'Select date...'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={entryDate}
                      onSelect={(date) => {
                        if (date) {
                          handleDateChange(date)
                          setIsDatePickerOpen(false)
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Start Time & End Time */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Time Range</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    placeholder="Start"
                    className="w-full"
                  />
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => handleEndTimeChange(e.target.value)}
                    placeholder="End"
                    className="w-full"
                  />
                </div>
              </div>

              {/* Total Hours */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Total Hours</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={hours}
                    onChange={(e) => handleHoursChange(parseFloat(e.target.value) || 0)}
                    className="w-full pl-10"
                  />
                </div>
              </div>

              {/* Entry Type Tabs */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Entry Type</Label>
                <Tabs 
                  value={entryType} 
                  onValueChange={(value) => handleEntryTypeChange(value as 'planned' | 'reported')}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="reported">Reported</TabsTrigger>
                    <TabsTrigger value="planned">Planned</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
        </div>
      </div>

      {/* Time Entry Link Modal */}
      <Dialog open={isTimeEntryModalOpen} onOpenChange={setIsTimeEntryModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Link Time Entries to Task</DialogTitle>
          </DialogHeader>

          {/* Search within modal */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search time entries..."
              value={timeEntrySearch}
              onChange={(e) => setTimeEntrySearch(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          {/* Available Time Entries to Link */}
          <div className="flex-1 overflow-y-auto">
            {loadingTimeEntries ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-2">
                {allProjectTimeEntries
                  .filter(entry => 
                    !relatedTimeEntries.some(re => re.id === entry.id) &&
                    (timeEntrySearch === '' || 
                      entry.description?.toLowerCase().includes(timeEntrySearch.toLowerCase()))
                  )
                  .map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 border border-border rounded-md hover:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {entry.description || 'Untitled entry'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(entry.start_time), 'MMM d, yyyy HH:mm')}
                          {entry.end_time && ` - ${format(new Date(entry.end_time), 'HH:mm')}`}
                          {entry.duration_minutes && ` (${(entry.duration_minutes / 60).toFixed(1)}h)`}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          handleLinkTimeEntry(entry.id)
                          setIsTimeEntryModalOpen(false)
                          setTimeEntrySearch('')
                        }}
                        className="ml-2"
                      >
                        <LinkIcon className="h-4 w-4 mr-2" />
                        Link
                      </Button>
                    </div>
                  ))}
                {allProjectTimeEntries.filter(entry => 
                  !relatedTimeEntries.some(re => re.id === entry.id) &&
                  (timeEntrySearch === '' || 
                    entry.description?.toLowerCase().includes(timeEntrySearch.toLowerCase()))
                ).length === 0 && (
                  <div className="text-center p-8">
                    <p className="text-sm text-muted-foreground">
                      {timeEntrySearch ? 'No time entries match your search' : 'No available time entries from this project'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => {
              setIsTimeEntryModalOpen(false)
              setTimeEntrySearch('')
            }}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  )
}

