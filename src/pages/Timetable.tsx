import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, momentLocalizer, Views, Event as RBCEvent } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import moment from 'moment';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { SimpleCombobox, ComboboxOption } from '../components/ui/simple-combobox';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Calendar as CalendarComponent } from '../components/ui/calendar';
import { Page } from '../components/Page';
import { TimeEntryModal } from '../components/TimeEntryModal';
import { useSupabaseAppState } from '../hooks/useSupabaseAppState';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { usePersistentState, useLastPage } from '../hooks/usePersistentState';
import { ChevronLeft, ChevronRight, Clock, Users, ArrowLeft } from 'lucide-react';
import { notifications } from '../lib/notifications';
import { userService } from '../services/supabaseService';
import { ROLE_LABELS, ROLE_BADGES } from '../lib/permissions';

// Import styles
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../styles/timetable.css';

// Configure moment to start weeks on Monday
moment.updateLocale('en', {
  week: {
    dow: 1, // Monday is the first day of the week
    doy: 4  // The week that contains Jan 4th is the first week of the year
  }
});

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
  task_number?: string;
  resource?: {
    projectId: string;
    projectName: string;
    projectColor: string;
    description?: string;
    duration_minutes: number;
    durationLabel: string;
    isBillable: boolean;
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
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
        {event.resource?.description && (
          <div style={{
            fontSize: '11px',
            fontWeight: '400',
            opacity: 0.8,
            paddingLeft: isFuture ? '12px' : '0'
          }}>
            {event.resource.description}
          </div>
        )}
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
  onDrillDown,
  events
}: { 
  label: React.ReactNode; 
  date: Date;
  onDrillDown: (date: Date) => void;
  events: TimeEntry[];
}) => {
  // Calculate total hours for this day
  const dayStart = moment(date).startOf('day');
  const dayEnd = moment(date).endOf('day');
  
  const totalMinutes = events
    .filter(event => {
      const eventStart = moment(event.start);
      return eventStart.isSameOrAfter(dayStart) && eventStart.isBefore(dayEnd);
    })
    .reduce((sum, event) => sum + (event.resource?.duration_minutes || 0), 0);
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const seconds = 0; // We don't track seconds
  
  const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  
  return (
    <div 
      onClick={() => onDrillDown(date)}
      style={{ 
        cursor: 'pointer',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2px'
      }}
      title="Click to view day"
    >
      <div>{label}</div>
      <div style={{
        fontSize: '11px',
        fontWeight: '500',
        color: '#6b7280',
        fontFamily: 'monospace'
      }}>
        {timeString}
      </div>
    </div>
  );
};

export const Timetable: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { saveLastPage } = useLastPage();
  const { projects, timeEntries, getActiveProjects, createTimeEntry, updateTimeEntry, deleteTimeEntry, loading, error } = useSupabaseAppState();
  const { isAdmin, isManager, canViewOthersTimeEntries } = usePermissions();
  
  // Save current page
  React.useEffect(() => {
    saveLastPage('/timetable');
  }, [saveLastPage]);
  
  // Persistent state for calendar with ISO date string to avoid Date serialization issues
  const [currentDateISO, setCurrentDateISO] = usePersistentState('timetable_currentDate', new Date().toISOString());
  const currentDate = useMemo(() => new Date(currentDateISO), [currentDateISO]);
  const setCurrentDate = useCallback((date: Date) => {
    setCurrentDateISO(date.toISOString());
  }, [setCurrentDateISO]);
  
  const [view, setView] = usePersistentState<typeof Views.WEEK | typeof Views.DAY>('timetable_view', Views.WEEK);
  
  // User selection state (for admins) - persistent
  const [selectedUserId, setSelectedUserId] = usePersistentState('timetable_selectedUserId', user?.id || '');
  const [visibleUsers, setVisibleUsers] = useState<any[]>([]);
  const [userTimeEntries, setUserTimeEntries] = useState<any[]>([]);
  
  // Persistent scroll position
  const [scrollPosition, setScrollPosition] = usePersistentState('timetable_scrollPosition', 540); // Default to 9 AM (540 minutes)
  
  // Track scroll position
  useEffect(() => {
    const handleScroll = () => {
      const timeColumn = document.querySelector('.rbc-time-content');
      if (timeColumn) {
        const scrollTop = timeColumn.scrollTop;
        // Convert scroll pixels to approximate time (rough estimation)
        const minutesPerPixel = 1440 / timeColumn.scrollHeight; // 1440 minutes in a day
        const scrollMinutes = Math.floor(scrollTop * minutesPerPixel);
        setScrollPosition(scrollMinutes);
      }
    };

    const timeColumn = document.querySelector('.rbc-time-content');
    if (timeColumn) {
      timeColumn.addEventListener('scroll', handleScroll);
      return () => timeColumn.removeEventListener('scroll', handleScroll);
    }
  }, [view]);
  
  // Modal state (unified for create and edit)
  const [isTimeEntryModalOpen, setIsTimeEntryModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [modalTimeSlot, setModalTimeSlot] = useState<{
    startTime: Date;
    endTime: Date;
    date: string;
  } | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [taskDescription, setTaskDescription] = useState('');
  const [entryType, setEntryType] = useState<'planned' | 'reported'>('reported');
  const [isBillable, setIsBillable] = useState<boolean>(true);
  const [startTimeString, setStartTimeString] = useState('');
  const [endTimeString, setEndTimeString] = useState('');
  const [durationString, setDurationString] = useState('');
  
  // For edit mode only
  const [editingTimeEntry, setEditingTimeEntry] = useState<TimeEntry | null>(null);

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
        task_number: entry.task_number,
        resource: {
          projectId: entry.project_id || entry.projectId!,
          projectName: projectName,
          projectColor: project?.color || '#3b82f6',
          description: entry.description || entry.task,
          duration_minutes: durationMinutes,
          durationLabel: durationLabel,
          isBillable: entry.is_billable !== undefined ? entry.is_billable : true
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

  // Handle duration change - update end time based on start time and new duration
  const handleDurationChange = (newDuration: string) => {
    setDurationString(newDuration);
    
    if (!startTimeString || !newDuration.match(/^\d{1,2}:\d{2}$/)) return;
    
    const [dh, dm] = newDuration.split(':').map(Number);
    const [sh, sm] = startTimeString.split(':').map(Number);
    
    const totalMinutes = (sh * 60 + sm) + (dh * 60 + dm);
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    
    setEndTimeString(`${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`);
  };

  // Handle start time change - update duration
  const handleStartTimeChange = (newStartTime: string) => {
    setStartTimeString(newStartTime);
    
    if (!newStartTime || !endTimeString) return;
    
    const [sh, sm] = newStartTime.split(':').map(Number);
    const [eh, em] = endTimeString.split(':').map(Number);
    const totalMinutes = (eh * 60 + em) - (sh * 60 + sm);
    
    if (totalMinutes >= 0) {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      setDurationString(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
    }
  };

  // Handle end time change - update duration
  const handleEndTimeChange = (newEndTime: string) => {
    setEndTimeString(newEndTime);
    
    if (!startTimeString || !newEndTime) return;
    
    const [sh, sm] = startTimeString.split(':').map(Number);
    const [eh, em] = newEndTime.split(':').map(Number);
    const totalMinutes = (eh * 60 + em) - (sh * 60 + sm);
    
    if (totalMinutes >= 0) {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      setDurationString(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
    }
  };

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
    setIsBillable(true);
    
    // Set time strings for the modal
    const startTimeStr = moment(start).format('HH:mm');
    const endTimeStr = moment(end).format('HH:mm');
    setStartTimeString(startTimeStr);
    setEndTimeString(endTimeStr);
    
    // Calculate initial duration
    const [sh, sm] = startTimeStr.split(':').map(Number);
    const [eh, em] = endTimeStr.split(':').map(Number);
    const totalMinutes = (eh * 60 + em) - (sh * 60 + sm);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    setDurationString(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
    
    setModalMode('create');
    setIsTimeEntryModalOpen(true);
  }, []);

  // Handle event selection (for editing)
  const handleSelectEvent = useCallback((event: TimeEntry) => {
    setEditingTimeEntry(event);
    setSelectedProjectId(event.resource?.projectId || '');
    setTaskDescription(event.resource?.description || '');
    setIsBillable(event.resource?.isBillable !== undefined ? event.resource.isBillable : true);
    const startTimeStr = moment(event.start).format('HH:mm');
    const endTimeStr = moment(event.end).format('HH:mm');
    setStartTimeString(startTimeStr);
    setEndTimeString(endTimeStr);
    
    // Calculate initial duration
    const [sh, sm] = startTimeStr.split(':').map(Number);
    const [eh, em] = endTimeStr.split(':').map(Number);
    const totalMinutes = (eh * 60 + em) - (sh * 60 + sm);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    setDurationString(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
    
    // Set modal time slot
    setModalTimeSlot({
      startTime: event.start,
      endTime: event.end,
      date: moment(event.start).format('YYYY-MM-DD')
    });
    
    // Determine entry type from the actual entry data
    const now = new Date();
    const isFuture = event.start > now;
    setEntryType(isFuture ? 'planned' : 'reported');
    
    setModalMode('edit');
    setIsTimeEntryModalOpen(true);
  }, []);

  // Handle drag and drop
  const handleEventDrop = useCallback(async ({ event, start, end }: any) => {
    const timeEntry = event as TimeEntry;
    const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    
    await updateTimeEntry(timeEntry.id, {
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      duration_minutes: duration
    });
  }, [updateTimeEntry]);

  // Handle event resize
  const handleEventResize = useCallback(async ({ event, start, end }: any) => {
    const timeEntry = event as TimeEntry;
    const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    
    await updateTimeEntry(timeEntry.id, {
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      duration_minutes: duration
    });
  }, [updateTimeEntry]);

  // Unified save handler for both create and edit
  const handleSaveTimeEntry = async () => {
    if (!selectedProjectId || !modalTimeSlot) return;

    // Parse the time strings and create Date objects
    const [startHours, startMinutes] = startTimeString.split(':').map(Number);
    const [endHours, endMinutes] = endTimeString.split(':').map(Number);
    
    const newStart = new Date(modalTimeSlot.startTime);
    newStart.setHours(startHours, startMinutes, 0, 0);
    
    const newEnd = new Date(modalTimeSlot.endTime);
    newEnd.setHours(endHours, endMinutes, 0, 0);
    
    // Validation: End time must be after start time
    if (newEnd <= newStart) {
      notifications.timeEntry.updateError('End time must be after start time');
      return;
    }

    // Validation: Planned entries can only be for future times
    const now = new Date();
    if (entryType === 'planned' && newStart <= now) {
      notifications.timeEntry.createError('Planned entries can only be created for future times. Please switch to "Reported" for past entries.');
      return;
    }

      const durationMinutes = Math.round((newEnd.getTime() - newStart.getTime()) / (1000 * 60));
    
    try {
      if (modalMode === 'create') {
        // Create new time entry
        await createTimeEntry({
          project_id: selectedProjectId,
          start_time: newStart.toISOString(),
          end_time: newEnd.toISOString(),
          duration_minutes: durationMinutes,
          description: taskDescription || undefined,
          is_billable: isBillable,
          entry_type: entryType,
        });

        notifications.timeEntry.createSuccess(taskDescription);
      } else {
        // Update existing time entry
        if (!editingTimeEntry) return;
      
      await updateTimeEntry(editingTimeEntry.id, {
          project_id: selectedProjectId,
          description: taskDescription || undefined,
          entry_type: entryType,
          is_billable: isBillable,
        start_time: newStart.toISOString(),
        end_time: newEnd.toISOString(),
        duration_minutes: durationMinutes,
      });

        notifications.timeEntry.updateSuccess(taskDescription);
      }
      
      // Close modal and reset state
      setIsTimeEntryModalOpen(false);
      setModalTimeSlot(null);
      setSelectedProjectId('');
      setTaskDescription('');
      setEntryType('reported');
      setIsBillable(true);
      setStartTimeString('');
      setEndTimeString('');
      setDurationString('');
      setEditingTimeEntry(null);
    } catch (error) {
      console.error(`Error ${modalMode === 'create' ? 'creating' : 'updating'} time entry:`, error);
      if (modalMode === 'create') {
        notifications.timeEntry.createError(error instanceof Error ? error.message : 'Unknown error');
      } else {
      notifications.timeEntry.updateError(error instanceof Error ? error.message : 'Unknown error');
      }
    }
  };

  // Delete time entry
  const handleDeleteTimeEntry = async () => {
    if (!editingTimeEntry) return;

    try {
      await deleteTimeEntry(editingTimeEntry.id);
      notifications.timeEntry.deleteSuccess();
      
      setIsTimeEntryModalOpen(false);
      setEditingTimeEntry(null);
      setSelectedProjectId('');
      setTaskDescription('');
      setEntryType('reported');
      setIsBillable(true);
      setStartTimeString('');
      setEndTimeString('');
      setDurationString('');
    } catch (error) {
      console.error('Error deleting time entry:', error);
      notifications.timeEntry.deleteError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  // Calendar navigation
  const handleCalendarNavigate = (action: 'PREV' | 'NEXT' | 'TODAY') => {
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
        {/* Fixed Top Bar */}
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
                <Button variant="outline" size="sm" onClick={() => handleCalendarNavigate('PREV')}>
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
                <Button variant="outline" size="sm" onClick={() => handleCalendarNavigate('NEXT')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <Button onClick={() => handleCalendarNavigate('TODAY')} variant="outline">
                Today
              </Button>
            </div>
          </div>

        {/* Calendar Body - Fixed Height */}
        <Card className="flex flex-col overflow-hidden relative h-[calc(100vh-150px)]">
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
              scrollToTime={new Date(1970, 1, 1, Math.floor(scrollPosition / 60), scrollPosition % 60)}
              components={{
                event: CustomEvent,
                week: {
                  header: (props: any) => (
                    <CustomHeader 
                      label={props.label} 
                      date={props.date}
                      onDrillDown={handleDrillDown}
                      events={events}
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

        {/* Custom Calendar Styles */}
        <style>{`
          /* Set hour row height to 60px */
          .rbc-timeslot-group {
            min-height: 60px !important;
          }
          
          /* Hide inner quarter-hour lines but keep snapping */
          .rbc-time-slot {
            border-top: none !important;
          }
          
          /* Keep the hour lines visible */
          .rbc-timeslot-group {
            border-bottom: 1px solid hsl(var(--border)) !important;
          }
        `}</style>

        {/* Unified Time Entry Modal */}
        <TimeEntryModal
          isOpen={isTimeEntryModalOpen}
          onClose={() => {
            setIsTimeEntryModalOpen(false);
            setModalTimeSlot(null);
            setSelectedProjectId('');
            setTaskDescription('');
            setEntryType('reported');
            setIsBillable(true);
            setStartTimeString('');
            setEndTimeString('');
            setDurationString('');
            setEditingTimeEntry(null);
          }}
          mode={modalMode}
          startTime={modalTimeSlot?.startTime || null}
          endTime={modalTimeSlot?.endTime || null}
          projectId={selectedProjectId}
          description={taskDescription}
          entryType={entryType}
          isBillable={isBillable}
          duration={durationString}
          startTimeString={startTimeString}
          endTimeString={endTimeString}
          projectOptions={projectOptions}
          onProjectChange={setSelectedProjectId}
          onDescriptionChange={setTaskDescription}
          onEntryTypeChange={setEntryType}
          onBillableChange={setIsBillable}
          onDurationChange={handleDurationChange}
          onStartTimeChange={handleStartTimeChange}
          onEndTimeChange={handleEndTimeChange}
          onSave={handleSaveTimeEntry}
          onDelete={modalMode === 'edit' ? handleDeleteTimeEntry : undefined}
          taskNumber={editingTimeEntry?.task_number}
        />
      </Page>
    </DndProvider>
  );
};
