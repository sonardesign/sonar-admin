import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { 
  Home, 
  Clock, 
  CalendarDays,
  FolderOpen,
  BarChart3,
  PieChart,
  Moon,
  Sun,
  Monitor,
  LogOut,
  ChevronUp,
  Settings,
  Users,
  Kanban,
  Plus,
  CalendarIcon,
  Search,
  X,
  TrendingUp
} from 'lucide-react';
import snrLogo from '../assets/snr-logo.svg';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { format } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import { useSupabaseAppState } from '../hooks/useSupabaseAppState';
import { usePermissions } from '../hooks/usePermissions';
import { useTheme } from '../hooks/useTheme';
import { useKeyboardShortcut, createShortcut } from '../hooks/useKeyboardShortcut';
import { useLastPage } from '../hooks/usePersistentState';
import { notifications } from '../lib/notifications';
import { isRouteAllowed } from '../lib/permissions';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { TaskStatus } from '../types';

interface LayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Timetable', href: '/timetable', icon: CalendarDays },
  { name: 'Tasks', href: '/tasks', icon: Kanban },
  { name: 'Funnel', href: '/funnel', icon: TrendingUp },
  { name: 'Projects', href: '/projects', icon: FolderOpen },
  { name: 'Forecast', href: '/workload', icon: Users },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Summary', href: '/summary', icon: PieChart },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { users, projects, getActiveProjects } = useSupabaseAppState();
  const { userRole } = usePermissions();
  const { theme, setTheme, isDark } = useTheme();
  const { saveLastPage } = useLastPage();
  
  // Save current page on location change
  useEffect(() => {
    saveLastPage(location.pathname);
  }, [location.pathname, saveLastPage]);
  
  // Settings modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    userName: '',
    dateFormat: 'MM/DD/YYYY',
    workweekStart: 'monday',
    currency: 'USD'
  });

  // Create task modal state
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [createTaskForm, setCreateTaskForm] = useState({
    title: '',
    description: '',
    assigneeId: '',
    projectId: '',
    status: 'backlog' as TaskStatus,
    hours: '1',
    dateTime: new Date()
  });

  // Search modal state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentEntries, setRecentEntries] = useState<Array<{ id: string; task_number?: string; description?: string; openedAt: number }>>([]);

  // Get active projects for the selector
  const activeProjects = getActiveProjects();

  // Initialize form with current user as default assignee
  useEffect(() => {
    if (user?.id && !createTaskForm.assigneeId) {
      setCreateTaskForm(prev => ({ ...prev, assigneeId: user.id }));
    }
  }, [user?.id]);

  // Open create task modal function
  const openCreateTaskModal = useCallback(() => {
    setCreateTaskForm({
      title: '',
      description: '',
      assigneeId: user?.id || '',
      projectId: activeProjects[0]?.id || '',
      status: 'backlog',
      hours: '1',
      dateTime: new Date()
    });
    setIsCreateTaskOpen(true);
  }, [user?.id, activeProjects]);

  // Track recently opened entries
  const trackOpenedEntry = useCallback((entryId: string, taskNumber?: string, description?: string) => {
    try {
      const recent = JSON.parse(localStorage.getItem('recentEntries') || '[]') as Array<{
        id: string;
        task_number?: string;
        description?: string;
        openedAt: number;
      }>;
      
      // Remove if already exists
      const filtered = recent.filter(e => e.id !== entryId);
      
      // Add to beginning
      filtered.unshift({
        id: entryId,
        task_number: taskNumber,
        description: description,
        openedAt: Date.now()
      });
      
      // Keep only last 20
      const limited = filtered.slice(0, 20);
      
      localStorage.setItem('recentEntries', JSON.stringify(limited));
      setRecentEntries(limited);
    } catch (error) {
      console.error('Error tracking entry:', error);
    }
  }, []);

  // Load recently opened entries
  useEffect(() => {
    try {
      const recent = JSON.parse(localStorage.getItem('recentEntries') || '[]');
      setRecentEntries(recent);
    } catch (error) {
      console.error('Error loading recent entries:', error);
    }
  }, []);

  // Open search modal function
  const openSearchModal = useCallback(() => {
    setSearchQuery('');
    // Refresh recent entries
    try {
      const recent = JSON.parse(localStorage.getItem('recentEntries') || '[]');
      setRecentEntries(recent);
    } catch (error) {
      console.error('Error loading recent entries:', error);
    }
    setIsSearchOpen(true);
  }, []);

  // Global keyboard shortcuts
  useKeyboardShortcut([
    createShortcut(
      'c',
      { ctrl: true, cmd: true },
      () => {
        openCreateTaskModal()
      },
      {
        preventDefault: true,
        allowInInputs: false
      }
    ),
    createShortcut(
      'k',
      { ctrl: true, cmd: true },
      () => {
        openSearchModal()
      },
      {
        preventDefault: true,
        allowInInputs: true // Allow in inputs for search
      }
    )
  ], [openCreateTaskModal, openSearchModal]);

  const handleCreateTask = async () => {
    if (!createTaskForm.title.trim()) {
      toast.error('Please enter a task title');
      return;
    }
    if (!createTaskForm.projectId) {
      toast.error('Please select a project');
      return;
    }

    setIsCreating(true);
    try {
      const startTime = createTaskForm.dateTime;
      const durationMinutes = Math.round(parseFloat(createTaskForm.hours) * 60) || 60;
      const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

      const { error } = await supabase
        .from('time_entries')
        .insert({
          user_id: createTaskForm.assigneeId,
          project_id: createTaskForm.projectId,
          description: createTaskForm.title,
          notes: createTaskForm.description || null,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          duration_minutes: durationMinutes,
          entry_type: 'planned',
          task_status: createTaskForm.status,
          is_billable: true
        });

      if (error) {
        console.error('Error creating task:', error);
        toast.error('Failed to create task');
      } else {
        toast.success('Task created successfully');
        setIsCreateTaskOpen(false);
      }
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    } finally {
      setIsCreating(false);
    }
  };
  
  // Get user profile from Supabase profiles table
  const userProfile = users.find(u => u.id === user?.id);
  const profileName = userProfile?.full_name || user?.user_metadata?.full_name || user?.email || 'User';
  
  // Filter navigation items based on user permissions
  const filteredNavigation = useMemo(() => {
    return navigation.filter(item => isRouteAllowed(item.href, userRole));
  }, [userRole]);
  
  // Generate proper initials from the full name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word[0].toUpperCase())
      .slice(0, 2) // Take only first 2 initials
      .join('');
  };
  
  // Get theme icon and label
  const getThemeIcon = () => {
    if (theme === 'light') return Sun;
    if (theme === 'dark') return Moon;
    return Monitor; // system
  };
  
  const getThemeLabel = () => {
    if (theme === 'light') return 'Light Mode';
    if (theme === 'dark') return 'Dark Mode';
    return 'System';
  };
  
  const ThemeIcon = getThemeIcon();
  
  const handleOpenSettings = () => {
    // Initialize form with current user data
    setSettingsForm({
      userName: profileName,
      dateFormat: 'MM/DD/YYYY', // TODO: Get from user preferences
      workweekStart: 'monday', // TODO: Get from user preferences
      currency: 'USD' // TODO: Get from user preferences
    });
    setIsSettingsOpen(true);
  };
  
  const handleSaveSettings = async () => {
    try {
      // TODO: Save settings to database
      console.log('Saving settings:', settingsForm);
      notifications.createSuccess('Settings', 'Preferences updated');
      setIsSettingsOpen(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      notifications.createError('Settings', error instanceof Error ? error.message : 'Unknown error');
    }
  };
  
  const handleCancelSettings = () => {
    setIsSettingsOpen(false);
  };
  
  const handleLogout = async () => {
    console.log('🚪 Logout clicked');
    try {
      const { error } = await signOut();
      if (error) {
        console.error('❌ Logout error:', error);
      }
    } catch (error) {
      console.error('💥 Logout exception:', error);
    }
  };

  return (
    <div className="w-full h-full">
      {/* Sidebar moved to App.tsx - hiding old sidebar */}
      <div className="hidden w-64 bg-card">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6">
            <div className="flex flex-col gap-3 items-start">
              <img src={snrLogo} alt="Sonar" style={{ height: '1.5rem' }} />
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-2 px-2.5 py-1.5 h-auto"
                  onClick={openCreateTaskModal}
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-muted-foreground text-xs">ctrl+c</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-2 px-2.5 py-1.5 h-auto"
                  onClick={openSearchModal}
                >
                  <Search className="h-4 w-4" />
                  <span className="text-muted-foreground text-xs">ctrl+k</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {filteredNavigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      className={cn(
                        'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary/20 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                    >
                      <item.icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                      <span className={cn(isActive && 'text-primary')}>{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Profile Section */}
          <div className="p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="w-full justify-between p-2 h-auto hover:bg-muted/50"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" alt={profileName} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {getInitials(profileName)}
                      </AvatarFallback>
                    </Avatar>
                        <div className="text-left">
                          <p className="text-sm font-medium text-foreground">{profileName}</p>
                          <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
                        </div>
                  </div>
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                side="top" 
                className="w-56 mb-2"
                sideOffset={8}
              >
                <DropdownMenuItem onClick={handleOpenSettings}>
                  <Settings className="h-4 w-4 mr-2" />
                  Preferences
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('light')}>
                  <Sun className="h-4 w-4 mr-2" />
                  Light
                  {theme === 'light' && <span className="ml-auto text-primary">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')}>
                  <Moon className="h-4 w-4 mr-2" />
                  Dark
                  {theme === 'dark' && <span className="ml-auto text-primary">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('system')}>
                  <Monitor className="h-4 w-4 mr-2" />
                  System
                  {theme === 'system' && <span className="ml-auto text-primary">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main content - now just renders children */}
      {children}

      {/* Settings Modal */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Manage your account preferences and application settings.
            </DialogDescription>
          </DialogHeader>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto space-y-6 py-4 px-4">
            {/* User Name Section */}
            <div className="space-y-2">
              <Label htmlFor="userName" className="text-sm font-medium">
                User Name
              </Label>
              <Input
                id="userName"
                value={settingsForm.userName}
                onChange={(e) => setSettingsForm(prev => ({ ...prev, userName: e.target.value }))}
                placeholder="Enter your name"
              />
            </div>

            {/* Data Format Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground">Data Format</h3>
              
              {/* Workweek Start */}
              <div className="space-y-2">
                <Label htmlFor="workweekStart" className="text-sm">
                  Calendar view - workweek starts
                </Label>
                <Select
                  value={settingsForm.workweekStart}
                  onValueChange={(value) => setSettingsForm(prev => ({ ...prev, workweekStart: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monday">Monday</SelectItem>
                    <SelectItem value="sunday">Sunday</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Format */}
              <div className="space-y-2">
                <Label htmlFor="dateFormat" className="text-sm">
                  Select date format
                </Label>
                <Select
                  value={settingsForm.dateFormat}
                  onValueChange={(value) => setSettingsForm(prev => ({ ...prev, dateFormat: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="YYYY/MM/DD">YYYY/MM/DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Currency Section */}
            <div className="space-y-2">
              <Label htmlFor="currency" className="text-sm font-medium">
                Currency
              </Label>
              <Select
                value={settingsForm.currency}
                onValueChange={(value) => setSettingsForm(prev => ({ ...prev, currency: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="HUF">HUF - Hungarian Forint</SelectItem>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fixed Footer */}
          <DialogFooter className="flex-shrink-0 pt-4 border-t">
            <Button variant="outline" onClick={handleCancelSettings}>
              Cancel
            </Button>
            <Button onClick={handleSaveSettings}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Task Modal */}
      <Dialog open={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen}>
        <DialogContent className="w-full max-w-full md:w-[750px] md:max-w-[750px]">
          <DialogHeader className="pb-2">
            <DialogTitle style={{ fontSize: '1rem' }}>Create New Entry</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* First line: ID (preset) + Title */}
            <div className="flex items-end gap-3">
              <div className="flex-shrink-0">
                <Label style={{ fontSize: '1rem' }} className="mb-1 block">ID</Label>
                <div className="px-2 py-1 bg-muted rounded text-sm text-foreground min-w-[90px] font-mono">
                  snr-XXX
                </div>
              </div>
              <div className="flex-1">
                <Input
                  id="taskTitle"
                  placeholder="Enter task title..."
                  value={createTaskForm.title}
                  onChange={(e) => setCreateTaskForm(prev => ({ ...prev, title: e.target.value }))}
                  className="border-0 border-b border-transparent hover:border-border focus:border-primary rounded-none px-0 bg-transparent shadow-none focus-visible:ring-0 h-7 text-sm"
                  autoFocus
                />
              </div>
            </div>

            {/* Second line: Description */}
            <div>
              <Textarea
                id="taskDescription"
                placeholder="Add description"
                value={createTaskForm.description}
                onChange={(e) => setCreateTaskForm(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
                className="border-0 border-b border-transparent hover:border-border focus:border-primary rounded-none px-0 bg-transparent shadow-none focus-visible:ring-0 resize-none text-sm min-h-[2.5rem]"
              />
            </div>

            {/* Third line: All dropdowns in one line */}
            <div className="grid grid-cols-5 gap-3">
              {/* Assignee */}
              <div className="space-y-1">
                <Label className="text-xs">Assignee</Label>
                <Select
                  value={createTaskForm.assigneeId}
                  onValueChange={(value) => setCreateTaskForm(prev => ({ ...prev, assigneeId: value }))}
                >
                  <SelectTrigger className="h-7 text-xs py-1">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id} className="text-xs">
                        {u.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Project */}
              <div className="space-y-1">
                <Label className="text-xs">Project</Label>
                <Select
                  value={createTaskForm.projectId}
                  onValueChange={(value) => setCreateTaskForm(prev => ({ ...prev, projectId: value }))}
                >
                  <SelectTrigger className="h-7 text-xs py-1">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeProjects.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        <div className="flex items-center gap-1.5">
                          <div 
                            className="w-2.5 h-2.5 rounded-full" 
                            style={{ backgroundColor: p.color }}
                          />
                          {p.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select
                  value={createTaskForm.status}
                  onValueChange={(value) => setCreateTaskForm(prev => ({ ...prev, status: value as TaskStatus }))}
                >
                  <SelectTrigger className="h-7 text-xs py-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="backlog" className="text-xs">Backlog</SelectItem>
                    <SelectItem value="todo" className="text-xs">To Do</SelectItem>
                    <SelectItem value="in_progress" className="text-xs">In Progress</SelectItem>
                    <SelectItem value="blocked" className="text-xs">Blocked</SelectItem>
                    <SelectItem value="done" className="text-xs">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date & Time */}
              <div className="space-y-1">
                <Label className="text-xs">Date & Time</Label>
                <div className="flex gap-1">
                  <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          'flex-1 justify-start text-left font-normal h-7 text-xs px-1.5 py-1',
                          !createTaskForm.dateTime && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-1 h-3 w-3" />
                        {createTaskForm.dateTime ? format(createTaskForm.dateTime, 'MMM d') : 'Date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={createTaskForm.dateTime}
                        onSelect={(date) => {
                          if (date) {
                            const newDateTime = new Date(date);
                            newDateTime.setHours(createTaskForm.dateTime.getHours());
                            newDateTime.setMinutes(createTaskForm.dateTime.getMinutes());
                            setCreateTaskForm(prev => ({ ...prev, dateTime: newDateTime }));
                          }
                          setIsDatePickerOpen(false);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Input
                    type="time"
                    value={format(createTaskForm.dateTime, 'HH:mm')}
                    onChange={(e) => {
                      const [hours, minutes] = e.target.value.split(':').map(Number);
                      const newDateTime = new Date(createTaskForm.dateTime);
                      newDateTime.setHours(hours || 0);
                      newDateTime.setMinutes(minutes || 0);
                      setCreateTaskForm(prev => ({ ...prev, dateTime: newDateTime }));
                    }}
                    className="w-16 h-7 text-xs px-1"
                  />
                </div>
              </div>

              {/* Hours */}
              <div className="space-y-1">
                <Label className="text-xs">Hours</Label>
                <Input
                  id="taskHours"
                  type="number"
                  step="0.5"
                  min="0.5"
                  placeholder="1"
                  value={createTaskForm.hours}
                  onChange={(e) => setCreateTaskForm(prev => ({ ...prev, hours: e.target.value }))}
                  className="h-7 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsCreateTaskOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateTask} disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Search Modal */}
      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="w-full max-w-full md:w-[750px] md:max-w-[750px] p-0">
          <div className="flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <DialogTitle className="text-base font-normal">Search for entry</DialogTitle>
            </div>

            {/* Search Bar */}
            <div className="px-6 py-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search entries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm"
                  autoFocus
                />
              </div>
            </div>

            {/* Recent Entries List */}
            <div className="px-6 py-4 max-h-[400px] overflow-y-auto">
              {recentEntries.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No recently opened entries
                </div>
              ) : (
                <div className="space-y-2">
                  {recentEntries
                    .filter(entry => {
                      if (!searchQuery) return true;
                      const query = searchQuery.toLowerCase();
                      return (
                        entry.task_number?.toLowerCase().includes(query) ||
                        entry.description?.toLowerCase().includes(query)
                      );
                    })
                    .map((entry) => (
                      <Link
                        key={entry.id}
                        to={`/tasks/${entry.task_number || entry.id}/${entry.description ? entry.description.toLowerCase().replace(/\s+/g, '-') : 'untitled-task'}`}
                        onClick={() => {
                          setIsSearchOpen(false);
                        }}
                        className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            {entry.task_number && (
                              <div className="text-xs font-mono text-muted-foreground mb-1">
                                {entry.task_number}
                              </div>
                            )}
                            <div className="text-sm text-foreground truncate">
                              {entry.description || 'Untitled task'}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
