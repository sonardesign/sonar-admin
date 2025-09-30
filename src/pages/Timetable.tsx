import React, { useState, useCallback, useMemo } from 'react';
import { Calendar, momentLocalizer, Views, Event as RBCEvent } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import moment from 'moment';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { SimpleCombobox, ComboboxOption } from '../components/ui/simple-combobox';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Calendar as CalendarComponent } from '../components/ui/calendar';
import { Page } from '../components/Page';
import { useSupabaseAppState } from '../hooks/useSupabaseAppState';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { notifications } from '../lib/notifications';

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
      <div>{event.resource?.projectName}</div>
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

export const Timetable: React.FC = () => {
  const { projects, timeEntries, getActiveProjects, createTimeEntry, updateTimeEntry, deleteTimeEntry, loading, error } = useSupabaseAppState();
  
  // State for calendar
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<typeof Views.WEEK | typeof Views.DAY>(Views.WEEK);
  
  // Modal state
  const [isTimeSlotModalOpen, setIsTimeSlotModalOpen] = useState(false);
  const [modalTimeSlot, setModalTimeSlot] = useState<{
    startTime: Date;
    endTime: Date;
    date: string;
  } | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [taskDescription, setTaskDescription] = useState('');
  
  // Edit modal state
  const [isEditTimeEntryOpen, setIsEditTimeEntryOpen] = useState(false);
  const [editingTimeEntry, setEditingTimeEntry] = useState<TimeEntry | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editProjectId, setEditProjectId] = useState('');

  const activeProjects = getActiveProjects();

  // Prepare combobox options for projects
  const projectOptions: ComboboxOption[] = useMemo(() => 
    activeProjects.map(project => ({
      value: project.id,
      label: project.name,
      color: project.color
    })), [activeProjects]
  );

  // Convert time entries to calendar events
  const events: TimeEntry[] = useMemo(() => {
    return timeEntries.map(entry => {
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
  }, [timeEntries, projects]);

  // Custom event style getter
  const eventStyleGetter = useCallback((event: TimeEntry) => {
    const projectColor = event.resource?.projectColor || '#3b82f6';
    return {
      style: {
        backgroundColor: `${projectColor}33`, // 20% opacity (hex: 33)
        borderRadius: '4px',
        borderLeftWidth: '4px',
        borderLeftStyle: 'solid',
        borderLeftColor: projectColor,
        display: 'block',
        paddingLeft: '6px'
      }
    };
  }, []);

  // Handle slot selection (for creating new time entries)
  const handleSelectSlot = useCallback(({ start, end }: { start: Date; end: Date }) => {
    
    setModalTimeSlot({
      startTime: start,
      endTime: end,
      date: start.toISOString().split('T')[0]
    });
    setSelectedProjectId('');
    setTaskDescription('');
    setIsTimeSlotModalOpen(true);
  }, []);

  // Handle event selection (for editing)
  const handleSelectEvent = useCallback((event: TimeEntry) => {
    setEditingTimeEntry(event);
    setEditProjectId(event.resource?.projectId || '');
    setEditDescription(event.resource?.description || '');
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

    const duration = (modalTimeSlot.endTime.getTime() - modalTimeSlot.startTime.getTime()) / (1000 * 60);
    
    try {
      await createTimeEntry({
        project_id: selectedProjectId,
        start_time: modalTimeSlot.startTime.toISOString(),
        end_time: modalTimeSlot.endTime.toISOString(),
        duration_minutes: duration,
        description: taskDescription || undefined,
        is_billable: true,
      });

      notifications.timeEntry.createSuccess(taskDescription);
      
      setIsTimeSlotModalOpen(false);
      setModalTimeSlot(null);
      setSelectedProjectId('');
      setTaskDescription('');
    } catch (error) {
      console.error('Error creating time entry:', error);
      notifications.timeEntry.createError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  // Update time entry
  const handleUpdateTimeEntry = async () => {
    if (!editingTimeEntry || !editProjectId) return;

    try {
      await updateTimeEntry(editingTimeEntry.id, {
        project_id: editProjectId,
        description: editDescription || undefined,
      });

      notifications.timeEntry.updateSuccess(editDescription);

      setIsEditTimeEntryOpen(false);
      setEditingTimeEntry(null);
      setEditProjectId('');
      setEditDescription('');
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

  if (loading) {
    return (
      <Page>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading timetable...</p>
          </div>
        </div>
      </Page>
    );
  }

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
      <Page>
        <div className="flex flex-col h-full gap-6">
          {/* Header with Date Navigation */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Timetable</h1>
              <p className="text-muted-foreground">
                Drag and drop time entries across days and hours
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
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
          <Card className="flex-1 flex flex-col overflow-hidden">
            <DragAndDropCalendar
              localizer={localizer}
              events={events}
              startAccessor={(event: TimeEntry) => event.start}
              endAccessor={(event: TimeEntry) => event.end}
              style={{ height: '100%' }}
              view={view}
              onView={setView}
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
                event: CustomEvent
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

            <div className="space-y-4">
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
                <Label htmlFor="taskDescription">Description (Optional)</Label>
                <Textarea
                  id="taskDescription"
                  placeholder="What did you work on?"
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
            </div>
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

            <div className="space-y-4">
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
                <Label htmlFor="editTaskDescription">Description</Label>
                <Textarea
                  id="editTaskDescription"
                  placeholder="What did you work on?"
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
            </div>
          </DialogContent>
        </Dialog>
      </Page>
    </DndProvider>
  );
};
