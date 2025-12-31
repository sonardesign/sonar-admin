import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Calendar, momentLocalizer, Views, Event as RBCEvent } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import moment from 'moment';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { SimpleCombobox, ComboboxOption } from '../components/ui/simple-combobox';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Calendar as CalendarComponent } from '../components/ui/calendar';
import { Page } from '../components/Page';
import { useSupabaseAppState } from '../hooks/useSupabaseAppState';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { ChevronLeft, ChevronRight, Clock, Users, ArrowLeft } from 'lucide-react';
import { notifications } from '../lib/notifications';
import { userService } from '../services/supabaseService';
import { ROLE_LABELS, ROLE_BADGES } from '../lib/permissions';

// Import styles
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../styles/timetable.css';

// Setup the localizer
const localizer = momentLocalizer(moment);

// Create the DragAndDrop Calendar with proper typing
const DragAndDropCalendar = withDragAndDrop<TimeEntry>(Calendar);

// Custom Event interface extending RBCEvent
interface TimeEntry extends RBCEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource?: {
    projectId: string;
    projectName: string;
    projectColor: string;
    description?: string;
    duration_minutes: number;
    durationLabel: string;
  };
}

// Custom Event Component
const CustomEvent = ({ event }: { event: TimeEntry }) => {
  const now = new Date();
  const isFuture = event.start > now;
  const projectColor = event.resource?.projectColor || '#3b82f6';
  
  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'space-between',
      fontSize: '12px',
      fontWeight: '600',
      color: '#1f2937',
      lineHeight: '1.4',
      position: 'relative'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {isFuture && (
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: projectColor,
            flexShrink: 0
          }} />
        )}
        <div>{event.resource?.projectName}</div>
      </div>
      <div style={{ 
        textAlign: 'right',
        fontSize: '11px',
        fontWeight: '500',
        opacity: 0.8
      }}>
        {event.resource?.durationLabel}
      </div>
    </div>
  );
};

// Custom Header Component
const CustomHeader = ({ 
  label, 
  date, 
  onDrillDown 
}: { 
  label: React.ReactNode; 
  date: Date;
  onDrillDown: (date: Date) => void;
}) => {
  return (
    <div 
      onClick={() => onDrillDown(date)}
      style={{ 
        cursor: 'pointer',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      title="Click to view day"
    >
      {label}
    </div>
  );
};

export const Timetable: React.FC = () => {
  const { user } = useAuth();
  const { projects, timeEntries, getActiveProjects, createTimeEntry, updateTimeEntry, deleteTimeEntry, loading, error } = useSupabaseAppState();
  const { isAdmin, isManager, canViewOthersTimeEntries } = usePermissions();
  
  // State for calendar
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<typeof Views.WEEK | typeof Views.DAY>(Views.WEEK);
  
  // User selection state (for admins)
  const [selectedUserId, setSelectedUserId] = useState<string>(user?.id || '');
  const [visibleUsers, setVisibleUsers] = useState<any[]>([]);
  const [userTimeEntries, setUserTimeEntries] = useState<any[]>([]);
  
  // Modal state
  const [isTimeSlotModalOpen, setIsTimeSlotModalOpen] = useState(false);
  const [modalTimeSlot, setModalTimeSlot] = useState<{
    startTime: Date;
    endTime: Date;
    date: string;
  } | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [taskDescription, setTaskDescription] = useState('');
  const [entryType, setEntryType] = useState<'planned' | 'reported'>('reported');
  
  // Edit modal state
  const [isEditTimeEntryOpen, setIsEditTimeEntryOpen] = useState(false);
  const [editingTimeEntry, setEditingTimeEntry] = useState<TimeEntry | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editProjectId, setEditProjectId] = useState('');
  const [editEntryType, setEditEntryType] = useState<'planned' | 'reported'>('reported');

  const activeProjects = getActiveProjects();

  // Load visible users (for admins/managers)
  useEffect(() => {
    if (canViewOthersTimeEntries) {
      loadVisibleUsers();
    }
  }, [canViewOthersTimeEntries]);

  // Load time entries for selected user
  useEffect(() => {
    if (isAdmin && selectedUserId && selectedUserId !== user?.id) {
      loadUserTimeEntries(selectedUserId);
    } else {
      // Clear user time entries when viewing your own entries
      setUserTimeEntries([]);
    }
  }, [isAdmin, selectedUserId, user?.id]);

  const loadVisibleUsers = async () => {
    try {
      const { data, error } = await userService.getVisibleUsers();
      if (error) {
        console.error('Error loading visible users:', error);
      } else {
        setVisibleUsers(data || []);
      }
    } catch (err) {
      console.error('Error loading visible users:', err);
    }
  };

  const loadUserTimeEntries = async (userId: string) => {
    try {
      const { data, error } = await userService.getUserTimeEntries(userId);
      if (error) {
        console.error('Error loading user time entries:', error);
        setUserTimeEntries([]);
      } else {
        setUserTimeEntries(data || []);
      }
    } catch (err) {
      console.error('Error loading user time entries:', err);
      setUserTimeEntries([]);
    }
  };

  // Prepare combobox options for projects
  const projectOptions: ComboboxOption[] = useMemo(() => 
    activeProjects.map(project => ({
      value: project.id,
      label: project.name,
      color: project.color
    })), [activeProjects]
  );

  // Prepare combobox options for users (for admins)
  const userOptions: ComboboxOption[] = useMemo(() => {
    return visibleUsers.map(u => {
      const isCurrentUser = u.id === user?.id;
      const label = isCurrentUser 
        ? `${u.full_name} (${ROLE_LABELS[u.role as 'admin' | 'manager' | 'member']})`
        : u.full_name;
      
      return {
        value: u.id,
        label: label,
        color: ROLE_BADGES[u.role as 'admin' | 'manager' | 'member']?.color
      };
    });
  }, [visibleUsers, user?.id]);

  // Convert time entries to calendar events
  const events: TimeEntry[] = useMemo(() => {
    // Determine which entries to display based on selected user and role
    let entriesToDisplay: any[];
    
    if (isAdmin && selectedUserId && selectedUserId !== user?.id) {
      // Admin viewing another user's entries
      entriesToDisplay = userTimeEntries;
    } else if (isManager) {
      // Managers see their own entries + entries from projects they manage
      // RLS policies already filter this at the database level
      entriesToDisplay = timeEntries;
    } else {
      // Members viewing their own entries only
      entriesToDisplay = timeEntries.filter(entry => 
        entry.user_id === user?.id
      );
    }
    
    return entriesToDisplay.map(entry => {
      const project = projects.find(p => p.id === (entry.project_id || entry.projectId));
      const durationMinutes = entry.duration_minutes || entry.duration || 0;
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      const durationLabel = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      
      const projectName = project?.name || 'Unknown Project';
      
      return {
        id: entry.id,
        title: projectName, // Just the project name for the title
        start: new Date(entry.start_time || entry.startTime!),
        end: new Date(entry.end_time || entry.endTime!),
        resource: {
          projectId: entry.project_id || entry.projectId!,
          projectName: projectName,
          projectColor: project?.color || '#3b82f6',
          description: entry.description || entry.task,
          duration_minutes: durationMinutes,
          durationLabel: durationLabel
        }
      };
    });
  }, [timeEntries, projects, userTimeEntries, isAdmin, isManager, selectedUserId, user?.id]);

  // Custom event style getter
  const eventStyleGetter = useCallback((event: TimeEntry) => {
    const projectColor = event.resource?.projectColor || '#3b82f6';
    const now = new Date();
    const isFuture = event.start > now;
    
    if (isFuture) {
      // Future entries: gray background, gray left border, colored dot in content
      return {
        style: {
          backgroundColor: 'rgba(156, 163, 175, 0.2)', // Gray with 20% opacity
          borderRadius: '4px',
          borderLeftWidth: '4px',
          borderLeftStyle: 'solid' as const,
          borderLeftColor: 'rgb(209, 213, 219)', // Gray-300
          display: 'block',
          paddingLeft: '6px'
        }
      };
    }
    
    // Past/current entries: colored background and left border
    return {
      style: {
        backgroundColor: `${projectColor}33`, // 20% opacity (hex: 33)
        borderRadius: '4px',
        borderLeftWidth: '4px',
        borderLeftStyle: 'solid' as const,
        borderLeftColor: projectColor,
        display: 'block',
        paddingLeft: '6px'
      }
    };
  }, []);

  // Handle slot selection (for creating new time entries)
  const handleSelectSlot = useCallback(({ start, end }: { start: Date; end: Date }) => {
    const now = new Date();
    const isFuture = start > now;
    
    setModalTimeSlot({
      startTime: start,
      endTime: end,
      date: start.toISOString().split('T')[0]
    });
    setSelectedProjectId('');
    setTaskDescription('');
    setEntryType(isFuture ? 'planned' : 'reported');
    setIsTimeSlotModalOpen(true);
  }, []);

  // Handle event selection (for editing)
  const handleSelectEvent = useCallback((event: TimeEntry) => {
    setEditingTimeEntry(event);
    setEditProjectId(event.resource?.projectId || '');
    setEditDescription(event.resource?.description || '');
    // Determine entry type from the actual entry data
    const now = new Date();
    const isFuture = event.start > now;
    setEditEntryType(isFuture ? 'planned' : 'reported');
    setIsEditTimeEntryOpen(true);
  }, []);

  // Handle drag and drop
  const handleEventDrop = useCallback(async ({ event, start, end }: any) => {
    const timeEntry = event as TimeEntry;
    const duration = (end.getTime() - start.getTime()) / (1000 * 60);
    
    await updateTimeEntry(timeEntry.id, {
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      duration_minutes: duration
    });
  }, [updateTimeEntry]);

  // Handle event resize
  const handleEventResize = useCallback(async ({ event, start, end }: any) => {
    const timeEntry = event as TimeEntry;
    const duration = (end.getTime() - start.getTime()) / (1000 * 60);
    
    await updateTimeEntry(timeEntry.id, {
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      duration_minutes: duration
    });
  }, [updateTimeEntry]);

  // Save new time slot
  const saveTimeSlot = async () => {
    if (!selectedProjectId || !modalTimeSlot) return;

    // Validation: Planned entries can only be created for future times
    const now = new Date();
    if (entryType === 'planned' && modalTimeSlot.startTime <= now) {
      notifications.timeEntry.createError('Planned entries can only be created for future times. Please switch to "Reported" for past entries.');
      return;
    }

    const duration = (modalTimeSlot.endTime.getTime() - modalTimeSlot.startTime.getTime()) / (1000 * 60);
    
    try {
      await createTimeEntry({
        project_id: selectedProjectId,
        start_time: modalTimeSlot.startTime.toISOString(),
        end_time: modalTimeSlot.endTime.toISOString(),
        duration_minutes: duration,
        description: taskDescription || undefined,
        is_billable: true,
        entry_type: entryType,
      });

      notifications.timeEntry.createSuccess(taskDescription);
      
      setIsTimeSlotModalOpen(false);
      setModalTimeSlot(null);
      setSelectedProjectId('');
      setTaskDescription('');
      setEntryType('reported');
    } catch (error) {
      console.error('Error creating time entry:', error);
      notifications.timeEntry.createError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  // Update time entry
  const handleUpdateTimeEntry = async () => {
    if (!editingTimeEntry || !editProjectId) return;

    // Validation: Planned entries can only be for future times
    const now = new Date();
    if (editEntryType === 'planned' && editingTimeEntry.start <= now) {
      notifications.timeEntry.updateError('Planned entries can only be for future times. Please switch to "Reported" for past entries.');
      return;
    }

    try {
      await updateTimeEntry(editingTimeEntry.id, {
        project_id: editProjectId,
        description: editDescription || undefined,
        entry_type: editEntryType,
      });

      notifications.timeEntry.updateSuccess(editDescription);

      setIsEditTimeEntryOpen(false);
      setEditingTimeEntry(null);
      setEditProjectId('');
      setEditDescription('');
      setEditEntryType('reported');
    } catch (error) {
      console.error('Error updating time entry:', error);
      notifications.timeEntry.updateError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  // Delete time entry
  const handleDeleteTimeEntry = async () => {
    if (!editingTimeEntry) return;

    try {
      await deleteTimeEntry(editingTimeEntry.id);
      notifications.timeEntry.deleteSuccess();
      
      setIsEditTimeEntryOpen(false);
      setEditingTimeEntry(null);
    } catch (error) {
      console.error('Error deleting time entry:', error);
      notifications.timeEntry.deleteError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  // Navigation
  const navigate = (action: 'PREV' | 'NEXT' | 'TODAY') => {
    let newDate = new Date(currentDate);
    
    if (action === 'PREV') {
      newDate = moment(currentDate).subtract(1, 'week').toDate();
    } else if (action === 'NEXT') {
      newDate = moment(currentDate).add(1, 'week').toDate();
    } else if (action === 'TODAY') {
      newDate = new Date();
    }
    
    setCurrentDate(newDate);
  };

  // Handle drill down to day view
  const handleDrillDown = useCallback((date: Date) => {
    setView(Views.DAY);
    setCurrentDate(date);
  }, []);

  // Handle back to week view
  const handleBackToWeek = useCallback(() => {
    setView(Views.WEEK);
  }, []);

  if (error) {
    return (
      <Page>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-destructive mb-2">Error loading timetable data</p>
            <p className="text-muted-foreground text-sm">{error}</p>
          </div>
        </div>
      </Page>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <Page loading={loading} loadingText="Loading timetable...">
        <div className="flex flex-col h-full gap-6">
          {/* Header with Date Navigation and User Selector */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Timetable</h1>
              <p className="text-muted-foreground">
                Drag and drop time entries across days and hours
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* User Selector for Admins */}
              {isAdmin && visibleUsers.length > 0 && (
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <SimpleCombobox
                    options={userOptions}
                    value={selectedUserId}
                    onValueChange={setSelectedUserId}
                    placeholder="Select user..."
                    searchPlaceholder="Search users..."
                    emptyText="No users found."
                    className="w-[250px]"
                  />
                </div>
              )}
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => navigate('PREV')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="min-w-[200px] font-medium">
                      {moment(currentDate).startOf('week').format('MMM D')} - {moment(currentDate).endOf('week').format('MMM D, YYYY')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center">
                    <CalendarComponent
                      mode="single"
                      selected={currentDate}
                      onSelect={(date) => {
                        if (date) {
                          setCurrentDate(date);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Button variant="outline" size="sm" onClick={() => navigate('NEXT')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <Button onClick={() => navigate('TODAY')} variant="outline">
                Today
              </Button>
            </div>
          </div>

          {/* Calendar */}
          <Card className="flex-1 flex flex-col overflow-hidden relative">
            {/* Back to Week Button */}
            {view === Views.DAY && (
              <div className="absolute top-2 left-2 z-20">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBackToWeek}
                  className="shadow-md"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Week
                </Button>
              </div>
            )}
            
            <DragAndDropCalendar
              localizer={localizer}
              events={events}
              startAccessor={(event: TimeEntry) => event.start}
              endAccessor={(event: TimeEntry) => event.end}
              style={{ height: '100%' }}
              view={view}
              onView={(newView) => {
                if (newView === Views.WEEK || newView === Views.DAY) {
                  setView(newView);
                }
              }}
              date={currentDate}
              onNavigate={setCurrentDate}
              selectable
              resizable
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              onEventDrop={handleEventDrop}
              onEventResize={handleEventResize}
              eventPropGetter={eventStyleGetter}
              components={{
                event: CustomEvent,
                week: {
                  header: (props: any) => (
                    <CustomHeader 
                      label={props.label} 
                      date={props.date}
                      onDrillDown={handleDrillDown}
                    />
                  )
                }
              }}
              step={15}
              timeslots={4}
              defaultView={Views.WEEK}
              views={[Views.WEEK, Views.DAY]}
              min={new Date(0, 0, 0, 0, 0, 0)} // 12 AM (midnight)
              max={new Date(0, 0, 0, 23, 59, 59)} // 11:59 PM
              toolbar={false} // Remove the toolbar completely
              formats={{
                timeGutterFormat: 'HH:mm',
                eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) => 
                  `${moment(start).format('HH:mm')} - ${moment(end).format('HH:mm')}`,
              }}
            />
          </Card>
        </div>

        {/* Create Time Entry Modal */}
        <Dialog open={isTimeSlotModalOpen} onOpenChange={setIsTimeSlotModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Time Entry</DialogTitle>
              <DialogDescription>
                {modalTimeSlot && (
                  <>
                    {moment(modalTimeSlot.startTime).format('dddd, MMMM Do YYYY')} from{' '}
                    {moment(modalTimeSlot.startTime).format('HH:mm')} to{' '}
                    {moment(modalTimeSlot.endTime).format('HH:mm')}
                    {' '}({Math.round((modalTimeSlot.endTime.getTime() - modalTimeSlot.startTime.getTime()) / (1000 * 60))} minutes)
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <Tabs value={entryType} onValueChange={(value) => setEntryType(value as 'planned' | 'reported')} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="reported">Reported</TabsTrigger>
                <TabsTrigger value="planned">Planned</TabsTrigger>
              </TabsList>
              
              <TabsContent value="reported" className="space-y-4">
                <div>
                  <Label htmlFor="projectSelect">Project</Label>
                  <div className="mt-1">
                    <SimpleCombobox
                      options={projectOptions}
                      value={selectedProjectId}
                      onValueChange={setSelectedProjectId}
                      placeholder="Select a project..."
                      searchPlaceholder="Search projects..."
                      emptyText="No projects found."
                      className="w-full"
                      autoFocus={true}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="taskDescription">Task Title (Optional)</Label>
                  <Textarea
                    id="taskDescription"
                    placeholder="Enter task title..."
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsTimeSlotModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={saveTimeSlot} disabled={!selectedProjectId}>
                    Create Entry
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="planned" className="space-y-4">
                <div>
                  <Label htmlFor="projectSelect">Project</Label>
                  <div className="mt-1">
                    <SimpleCombobox
                      options={projectOptions}
                      value={selectedProjectId}
                      onValueChange={setSelectedProjectId}
                      placeholder="Select a project..."
                      searchPlaceholder="Search projects..."
                      emptyText="No projects found."
                      className="w-full"
                      autoFocus={true}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="taskDescription">Task Title (Optional)</Label>
                  <Textarea
                    id="taskDescription"
                    placeholder="Enter task title..."
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsTimeSlotModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={saveTimeSlot} disabled={!selectedProjectId}>
                    Create Entry
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* Edit Time Entry Modal */}
        <Dialog open={isEditTimeEntryOpen} onOpenChange={setIsEditTimeEntryOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Time Entry</DialogTitle>
              <DialogDescription>
                {editingTimeEntry && (
                  <>
                    {moment(editingTimeEntry.start).format('dddd, MMMM Do YYYY')} from{' '}
                    {moment(editingTimeEntry.start).format('HH:mm')} to{' '}
                    {moment(editingTimeEntry.end).format('HH:mm')}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <Tabs value={editEntryType} onValueChange={(value) => setEditEntryType(value as 'planned' | 'reported')} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="reported">Reported</TabsTrigger>
                <TabsTrigger value="planned">Planned</TabsTrigger>
              </TabsList>
              
              <TabsContent value="reported" className="space-y-4">
                <div>
                  <Label htmlFor="editProjectSelect">Project</Label>
                  <div className="mt-1">
                    <SimpleCombobox
                      options={projectOptions}
                      value={editProjectId}
                      onValueChange={setEditProjectId}
                      placeholder="Select a project..."
                      searchPlaceholder="Search projects..."
                      emptyText="No projects found."
                      className="w-full"
                      autoFocus={true}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="editTaskDescription">Task Title</Label>
                  <Textarea
                    id="editTaskDescription"
                    placeholder="Enter task title..."
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="flex justify-between pt-4 border-t">
                  <Button variant="destructive" onClick={handleDeleteTimeEntry}>
                    Delete Entry
                  </Button>
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={() => setIsEditTimeEntryOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleUpdateTimeEntry} disabled={!editProjectId}>
                      Update
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="planned" className="space-y-4">
                <div>
                  <Label htmlFor="editProjectSelect">Project</Label>
                  <div className="mt-1">
                    <SimpleCombobox
                      options={projectOptions}
                      value={editProjectId}
                      onValueChange={setEditProjectId}
                      placeholder="Select a project..."
                      searchPlaceholder="Search projects..."
                      emptyText="No projects found."
                      className="w-full"
                      autoFocus={true}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="editTaskDescription">Task Title</Label>
                  <Textarea
                    id="editTaskDescription"
                    placeholder="Enter task title..."
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="flex justify-between pt-4 border-t">
                  <Button variant="destructive" onClick={handleDeleteTimeEntry}>
                    Delete Entry
                  </Button>
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={() => setIsEditTimeEntryOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleUpdateTimeEntry} disabled={!editProjectId}>
                      Update
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </Page>
    </DndProvider>
  );
};
