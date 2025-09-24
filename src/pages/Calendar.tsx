import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { SimpleCombobox, ComboboxOption } from '../components/ui/simple-combobox';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Sun, Grid3X3 } from 'lucide-react';
import { useSupabaseAppState } from '../hooks/useSupabaseAppState';
import { cn } from '../lib/utils';
import { Page } from '../components/Page';

interface TimeSlot {
  hour: number;
  quarter: number; // 0, 15, 30, 45
  day: number; // 0-6 (Sunday-Saturday)
}

interface SelectedSlot extends TimeSlot {
  projectId?: string;
}

export const Calendar: React.FC = () => {
  const { projects, timeEntries, getActiveProjects, createTimeEntry, updateTimeEntry, deleteTimeEntry, user, loading, error } = useSupabaseAppState();
  
  console.log('📅 Calendar page data:', { 
    projects: projects.length, 
    timeEntries: timeEntries.length,
    loading,
    error 
  });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [currentView, setCurrentView] = useState<'day' | 'week' | 'month'>('week');
  const [isTimeSlotModalOpen, setIsTimeSlotModalOpen] = useState(false);
  const [modalTimeSlot, setModalTimeSlot] = useState<{
    startTime: Date;
    endTime: Date;
    date: string;
  } | null>(null);
  const [taskDescription, setTaskDescription] = useState('');
  // const calendarRef = useRef<HTMLDivElement>(null); // Unused for now
  
  // Edit time entry state
  const [isEditTimeEntryOpen, setIsEditTimeEntryOpen] = useState(false);
  const [editingTimeEntry, setEditingTimeEntry] = useState<any>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editProjectId, setEditProjectId] = useState('');

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const [draggedEntry, setDraggedEntry] = useState<any>(null);
  const [dragStartPosition, setDragStartPosition] = useState<{x: number, y: number} | null>(null);
  const [currentMousePosition, setCurrentMousePosition] = useState<{x: number, y: number}>({x: 0, y: 0});
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);
  const [dragPreviewOffset, setDragPreviewOffset] = useState<{x: number, y: number}>({x: 0, y: 0});
  
  // Mouse state for drag detection
  const [mouseDownEntry, setMouseDownEntry] = useState<any>(null);
  const [mouseDownPosition, setMouseDownPosition] = useState<{x: number, y: number} | null>(null);
  const [hasMoved, setHasMoved] = useState(false);
  
  // Resize state
  const [isResizing, setIsResizing] = useState(false);
  const [resizingEntry, setResizingEntry] = useState<any>(null);
  const [resizeHandle, setResizeHandle] = useState<'top' | 'bottom' | null>(null);
  const [resizeStartPosition, setResizeStartPosition] = useState<{x: number, y: number} | null>(null);
  const [resizeVisualOffset, setResizeVisualOffset] = useState<{deltaQuarters: number}>({deltaQuarters: 0});
  
  const activeProjects = getActiveProjects();

  // Prepare combobox options for projects
  const projectOptions: ComboboxOption[] = React.useMemo(() => 
    activeProjects.map(project => ({
      value: project.id,
      label: project.name,
      color: project.color
    })), [activeProjects]
  );

  // Helper function to get project by ID
  const getProjectById = useCallback((projectId: string) => {
    return projects.find(p => p.id === projectId);
  }, [projects]);

  // Helper function to get time entries for a specific date and time range
  const getTimeEntriesForSlot = useCallback((date: Date, hour: number, quarter: number) => {
    const slotStart = new Date(date);
    slotStart.setHours(hour, quarter, 0, 0);
    
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + 15);

    return timeEntries.filter(entry => {
      const entryStart = new Date(entry.start_time || entry.startTime!);
      const entryEnd = new Date(entry.end_time || entry.endTime!);
      
      // Check if the time entry overlaps with this 15-minute slot
      return entryStart < slotEnd && entryEnd > slotStart;
    });
  }, [timeEntries]);

  // Helper function to get time entries for a specific day
  const getTimeEntriesForDay = useCallback((date: Date) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return timeEntries.filter(entry => {
      const entryStart = new Date(entry.start_time || entry.startTime!);
      return entryStart >= dayStart && entryStart <= dayEnd;
    });
  }, [timeEntries]);

  // Group time entries into unified blocks
  const getTimeEntryBlocks = useCallback((date: Date) => {
    const dayEntries = getTimeEntriesForDay(date);
    const blocks: any[] = [];

    dayEntries.forEach(entry => {
      const startTime = new Date(entry.start_time || entry.startTime!);
      const endTime = new Date(entry.end_time || entry.endTime!);
      const project = getProjectById(entry.project_id || entry.projectId!);

      if (project) {
        blocks.push({
          ...entry,
          project,
          startTime,
          endTime,
          startHour: startTime.getHours(),
          startQuarter: startTime.getMinutes(),
          endHour: endTime.getHours(),
          endQuarter: endTime.getMinutes(),
          durationQuarters: (endTime.getTime() - startTime.getTime()) / (15 * 60 * 1000)
        });
      }
    });

    return blocks;
  }, [getTimeEntriesForDay, getProjectById]);

  // Generate week dates
  const getWeekDates = (date: Date) => {
    const week = [];
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
    }
    return week;
  };

  // Generate month dates
  const getMonthDates = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    // const lastDay = new Date(year, month + 1, 0); // Not used currently
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const dates = [];
    const current = new Date(startDate);
    
    // Generate 6 weeks (42 days) to cover the full month view
    for (let i = 0; i < 42; i++) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  };

  const weekDates = getWeekDates(currentDate);
  const monthDates = getMonthDates(currentDate);
  // These functions are now implemented in individual view components

  const handleMouseDown = (day: number, hour: number, quarter: number) => {
    setIsSelecting(true);
    setSelectedSlots([{ day, hour, quarter }]);
  };

  const handleMouseEnter = useCallback((day: number, hour: number, quarter: number) => {
    if (!isSelecting) return;

    setSelectedSlots(prev => {
      if (prev.length === 0) return [{ day, hour, quarter }];
      
      const first = prev[0];
      if (first.day !== day) return prev; // Only select within same day
      
      const startTime = first.hour * 60 + first.quarter;
      const endTime = hour * 60 + quarter;
      const minTime = Math.min(startTime, endTime);
      const maxTime = Math.max(startTime, endTime);
      
      const newSlots: SelectedSlot[] = [];
      for (let time = minTime; time <= maxTime; time += 15) {
        const slotHour = Math.floor(time / 60);
        const slotQuarter = time % 60;
        newSlots.push({ day, hour: slotHour, quarter: slotQuarter });
      }
      
      console.log('📅 Selected slots:', newSlots.length, 'from', first.hour + ':' + first.quarter, 'to', hour + ':' + quarter);
      return newSlots;
    });
  }, [isSelecting]);

  const handleMouseUp = () => {
    setIsSelecting(false);
    // Open modal if we have selected slots
    if (selectedSlots.length > 0) {
      openTimeSlotModal();
    }
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsSelecting(false);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const openTimeSlotModal = () => {
    if (selectedSlots.length === 0) return;

    // Sort slots to get start and end time
    const sortedSlots = [...selectedSlots].sort((a, b) => {
      const timeA = a.hour * 60 + a.quarter;
      const timeB = b.hour * 60 + b.quarter;
      return timeA - timeB;
    });

    const startSlot = sortedSlots[0];
    const endSlot = sortedSlots[sortedSlots.length - 1];
    
    // Get the date based on view
    let date: Date;
    if (currentView === 'day') {
      date = currentDate;
    } else if (currentView === 'week') {
      date = weekDates[startSlot.day];
    } else {
      // For month view, we'll need to calculate the date
      date = monthDates[startSlot.day] || currentDate;
    }
    
    const startTime = new Date(date);
    // If clicking on hour boundary (quarter === 0), start at exact hour
    const startMinute = startSlot.quarter === 0 ? 0 : startSlot.quarter;
    startTime.setHours(startSlot.hour, startMinute, 0, 0);

    const endTime = new Date(date);
    // For end time, if it's the same slot, add 15 minutes. Otherwise, go to the end of the end slot.
    if (startSlot.day === endSlot.day && startSlot.hour === endSlot.hour && startSlot.quarter === endSlot.quarter) {
      // Single slot selected - make it 15 minutes from start
      const endMinute = startSlot.quarter === 0 ? 15 : startSlot.quarter + 15;
      endTime.setHours(endSlot.hour, endMinute, 0, 0);
    } else {
      // Multiple slots selected - end at the end of the last slot
      const endMinute = endSlot.quarter === 0 ? 15 : endSlot.quarter + 15;
      endTime.setHours(endSlot.hour, endMinute, 0, 0);
    }
    
    setModalTimeSlot({
      startTime,
      endTime,
      date: date.toISOString().split('T')[0],
    });
    
    setIsTimeSlotModalOpen(true);
  };

  const saveTimeSlot = async () => {
    if (!selectedProjectId || !modalTimeSlot) return;

    const duration = (modalTimeSlot.endTime.getTime() - modalTimeSlot.startTime.getTime()) / (1000 * 60);
    
    try {
      await createTimeEntry({
        project_id: selectedProjectId,
        start_time: modalTimeSlot.startTime.toISOString(),
        end_time: modalTimeSlot.endTime.toISOString(),
        duration_minutes: duration,
        description: taskDescription.trim() || undefined,
        is_billable: true
      });

      console.log('Time entry created successfully');
      
      // Reset modal state
      setIsTimeSlotModalOpen(false);
      setModalTimeSlot(null);
      setSelectedProjectId('');
      setTaskDescription('');
      setSelectedSlots([]);
    } catch (error) {
      console.error('Failed to create time entry:', error);
      // You might want to show an error message to the user here
    }
  };

  const cancelTimeSlot = () => {
    setIsTimeSlotModalOpen(false);
    setModalTimeSlot(null);
    setSelectedProjectId('');
    setTaskDescription('');
    setSelectedSlots([]);
  };

  // Edit time entry handlers
  const handleEditTimeEntry = (timeEntry: any) => {
    console.log('Editing time entry:', timeEntry);
    setEditingTimeEntry(timeEntry);
    setEditDescription(timeEntry.description || timeEntry.task || '');
    setEditProjectId(timeEntry.project_id || timeEntry.projectId || '');
    setIsEditTimeEntryOpen(true);
  };

  const handleUpdateTimeEntry = async () => {
    if (!editingTimeEntry || !editProjectId) return;

    try {
      await updateTimeEntry(editingTimeEntry.id, {
        project_id: editProjectId,
        description: editDescription.trim() || undefined,
      });
      
      setIsEditTimeEntryOpen(false);
      setEditingTimeEntry(null);
      setEditDescription('');
      setEditProjectId('');
    } catch (error) {
      console.error('Error updating time entry:', error);
    }
  };

  const handleDeleteTimeEntry = async () => {
    if (!editingTimeEntry) return;

    try {
      await deleteTimeEntry(editingTimeEntry.id);
      
      setIsEditTimeEntryOpen(false);
      setEditingTimeEntry(null);
      setEditDescription('');
      setEditProjectId('');
    } catch (error) {
      console.error('Error deleting time entry:', error);
    }
  };

  const cancelEditTimeEntry = () => {
    setIsEditTimeEntryOpen(false);
    setEditingTimeEntry(null);
    setEditDescription('');
    setEditProjectId('');
  };

  // New mouse handlers for proper drag detection
  const handleTimeEntryMouseDown = useCallback((e: React.MouseEvent, timeEntry: any) => {
    if (e.button !== 0) return; // Only left mouse button
    
    e.preventDefault();
    setMouseDownEntry(timeEntry);
    setMouseDownPosition({ x: e.clientX, y: e.clientY });
    setHasMoved(false);
    
    console.log('Mouse down on time entry:', timeEntry);
  }, []);

  const handleTimeEntryMouseMove = useCallback((e: MouseEvent) => {
    if (!mouseDownEntry || !mouseDownPosition) return;
    
    const deltaX = e.clientX - mouseDownPosition.x;
    const deltaY = e.clientY - mouseDownPosition.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Start dragging if mouse moved more than 5 pixels
    if (distance > 5 && !isDragging) {
      setHasMoved(true);
      
      // Get the time entry element to calculate the offset from mouse to element center
      const timeEntryElement = document.querySelector(`[data-time-entry-id="${mouseDownEntry.id}"]`);
      if (timeEntryElement) {
        const rect = timeEntryElement.getBoundingClientRect();
        const offsetX = mouseDownPosition.x - rect.left;
        const offsetY = mouseDownPosition.y - rect.top;
        
        setDraggedEntry(mouseDownEntry);
        setDragStartPosition(mouseDownPosition);
        setDragPreviewOffset({ x: offsetX, y: offsetY });
        setCurrentMousePosition({ x: e.clientX, y: e.clientY });
        setIsDragging(true);
        
        console.log('🎯 Drag started for entry:', mouseDownEntry.id, 'offset:', { x: offsetX, y: offsetY });
      }
    } else if (isDragging) {
      // Update mouse position during drag
      setCurrentMousePosition({ x: e.clientX, y: e.clientY });
    }
  }, [mouseDownEntry, mouseDownPosition, isDragging]);

  const handleTimeEntryMouseUp = useCallback((e: MouseEvent) => {
    if (mouseDownEntry && !hasMoved && !isDragging) {
      // This was a click, not a drag - open edit modal
      console.log('Click detected - opening edit modal');
      handleEditTimeEntry(mouseDownEntry);
    }
    
    // Reset mouse state
    setMouseDownEntry(null);
    setMouseDownPosition(null);
    setHasMoved(false);
  }, [mouseDownEntry, hasMoved, isDragging, handleEditTimeEntry]);

  // Drag and drop handlers
  const handleDragStart = (e: React.MouseEvent, timeEntry: any) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    
    setDraggedEntry(timeEntry);
    setDragStartPosition({ x: e.clientX, y: e.clientY });
    setIsDragging(true);
    
    console.log('Drag started for entry:', timeEntry);
  };

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    // Update current mouse position for smooth dragging
    setCurrentMousePosition({ x: e.clientX, y: e.clientY });
    
    // Find the closest time slot for drop zone highlighting
    const elements = document.elementsFromPoint(e.clientX, e.clientY);
    const timeSlotElement = elements.find(el => 
      el.hasAttribute('data-time-slot') || el.closest('[data-time-slot]')
    );
    
    if (timeSlotElement) {
      const slotElement = timeSlotElement.hasAttribute('data-time-slot') 
        ? timeSlotElement 
        : timeSlotElement.closest('[data-time-slot]');
        
      if (slotElement) {
        const timeSlot = slotElement.getAttribute('data-time-slot');
        const dateAttr = slotElement.getAttribute('data-date');
        if (timeSlot && dateAttr) {
          setHoveredSlot(`${dateAttr}-${timeSlot}`);
        } else {
          setHoveredSlot(null);
        }
      } else {
        setHoveredSlot(null);
      }
    } else {
      setHoveredSlot(null);
    }
  }, [isDragging]);

  const handleDragEnd = useCallback(async (e: MouseEvent) => {
    console.log('handleDragEnd called', { isDragging, draggedEntry });
    
    if (!isDragging || !draggedEntry) {
      console.log('Early return: not dragging or no dragged entry');
      // Reset drag state
      setIsDragging(false);
      setDraggedEntry(null);
      setDragStartPosition(null);
      setDragOffset({ x: 0, y: 0 });
      return;
    }
    
    // Find the drop target (time slot)
    console.log('Looking for drop target at:', e.clientX, e.clientY);
    const elements = document.elementsFromPoint(e.clientX, e.clientY);
    console.log('Elements at drop point:', elements.map(el => ({ tagName: el.tagName, className: el.className, dataTimeSlot: el.getAttribute('data-time-slot') })));
    
    const timeSlotElement = elements.find(el => 
      el.hasAttribute('data-time-slot') || el.closest('[data-time-slot]')
    );
    
    console.log('Found time slot element:', timeSlotElement);
    
    if (timeSlotElement) {
      const slotElement = timeSlotElement.hasAttribute('data-time-slot') 
        ? timeSlotElement 
        : timeSlotElement.closest('[data-time-slot]');
        
      console.log('Slot element:', slotElement);
        
      if (slotElement) {
        const timeSlot = slotElement.getAttribute('data-time-slot');
        const dateAttr = slotElement.getAttribute('data-date');
        
        console.log('Time slot data:', { timeSlot, dateAttr });
        
        if (timeSlot && dateAttr) {
          const [hours, minutes] = timeSlot.split(':').map(Number);
          const newDate = new Date(dateAttr);
          newDate.setHours(hours, minutes, 0, 0);
          
          const endDate = new Date(newDate);
          endDate.setMinutes(endDate.getMinutes() + draggedEntry.duration_minutes);
          
          console.log('Dropping entry at:', timeSlot, dateAttr, { newDate, endDate });
          
          try {
            const result = await updateTimeEntry(draggedEntry.id, {
              start_time: newDate.toISOString(),
              end_time: endDate.toISOString(),
            });
            console.log('Time entry moved successfully:', result);
          } catch (error) {
            console.error('Error moving time entry:', error);
          }
        } else {
          console.log('Missing time slot or date attributes');
        }
      } else {
        console.log('No slot element found');
      }
    } else {
      console.log('No time slot element found at drop point');
    }
    
    // Reset drag state
    setIsDragging(false);
    setDraggedEntry(null);
    setDragStartPosition(null);
    setCurrentMousePosition({ x: 0, y: 0 });
    setDragPreviewOffset({ x: 0, y: 0 });
    setHoveredSlot(null);
  }, [isDragging, draggedEntry, updateTimeEntry]);

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent, timeEntry: any, handle: 'top' | 'bottom') => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setResizingEntry(timeEntry);
    setResizeHandle(handle);
    setResizeStartPosition({ x: e.clientX, y: e.clientY });
    
    console.log('Resize started:', { timeEntry, handle });
  }, []);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !resizingEntry || !resizeHandle || !resizeStartPosition) return;
    
    // Calculate how many quarter hours the mouse has moved
    const deltaY = e.clientY - resizeStartPosition.y;
    const deltaQuarters = Math.round(deltaY / 11.5); // 11.5px per quarter hour (46px per hour)
    
    // Update visual offset for real-time feedback
    setResizeVisualOffset({ deltaQuarters });
    
    console.log('Resize move:', { deltaY, deltaQuarters });
  }, [isResizing, resizingEntry, resizeHandle, resizeStartPosition]);

  const handleResizeEnd = useCallback(async (e: MouseEvent) => {
    if (!isResizing || !resizingEntry || !resizeHandle || !resizeStartPosition) {
      return;
    }

    // Calculate the new duration
    const deltaY = e.clientY - resizeStartPosition.y;
    const deltaQuarters = Math.round(deltaY / 11.5); // 11.5px per quarter hour (46px per hour)
    const deltaMinutes = deltaQuarters * 15;
    
    let newStartTime = new Date(resizingEntry.start_time);
    let newEndTime = new Date(resizingEntry.end_time);
    
    if (resizeHandle === 'top') {
      // Resizing from top - adjust start time
      newStartTime.setMinutes(newStartTime.getMinutes() + deltaMinutes);
    } else {
      // Resizing from bottom - adjust end time
      newEndTime.setMinutes(newEndTime.getMinutes() + deltaMinutes);
    }
    
    // Ensure minimum duration of 15 minutes
    const newDuration = newEndTime.getTime() - newStartTime.getTime();
    if (newDuration < 15 * 60 * 1000) {
      if (resizeHandle === 'top') {
        newStartTime = new Date(newEndTime.getTime() - 15 * 60 * 1000);
      } else {
        newEndTime = new Date(newStartTime.getTime() + 15 * 60 * 1000);
      }
    }
    
    console.log('Resize end:', {
      id: resizingEntry.id,
      newStartTime: newStartTime.toISOString(),
      newEndTime: newEndTime.toISOString(),
      newDuration: newEndTime.getTime() - newStartTime.getTime()
    });
    
    try {
      await updateTimeEntry(resizingEntry.id, {
        start_time: newStartTime.toISOString(),
        end_time: newEndTime.toISOString()
      });
      console.log('Time entry resized successfully');
    } catch (error) {
      console.error('Failed to resize time entry:', error);
    }

    // Reset resize state
    setIsResizing(false);
    setResizingEntry(null);
    setResizeHandle(null);
    setResizeStartPosition(null);
    setResizeVisualOffset({deltaQuarters: 0});
  }, [isResizing, resizingEntry, resizeHandle, resizeStartPosition, updateTimeEntry]);

  // Add global mouse event listeners for dragging and resizing
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  // Add global mouse event listeners for time entry drag detection
  React.useEffect(() => {
    if (mouseDownEntry) {
      document.addEventListener('mousemove', handleTimeEntryMouseMove);
      document.addEventListener('mouseup', handleTimeEntryMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleTimeEntryMouseMove);
        document.removeEventListener('mouseup', handleTimeEntryMouseUp);
      };
    }
  }, [mouseDownEntry, handleTimeEntryMouseMove, handleTimeEntryMouseUp]);

  const navigate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    switch (currentView) {
      case 'day':
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'month':
        newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
    }
    
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getDateRangeText = () => {
    switch (currentView) {
      case 'day':
        return currentDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      case 'week':
        const startOfWeek = weekDates[0];
        const endOfWeek = weekDates[6];
        return `${startOfWeek.toLocaleDateString()} - ${endOfWeek.toLocaleDateString()}`;
      case 'month':
        return currentDate.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long' 
        });
      default:
        return '';
    }
  };

  // Show loading state
  if (loading) {
    return (
      <Page>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading calendar data...</p>
          </div>
        </div>
      </Page>
    )
  }

  // Show error state
  if (error) {
    return (
      <Page>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-destructive mb-2">Error loading calendar data</p>
            <p className="text-muted-foreground text-sm">{error}</p>
          </div>
        </div>
      </Page>
    )
  }

  return (
    <Page>
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Calendar</h1>
            <p className="text-muted-foreground">
              {currentView === 'day' && 'Daily view with 15-minute time slots'}
              {currentView === 'week' && 'Weekly view with 15-minute time slots'}
              {currentView === 'month' && 'Monthly overview'}
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => navigate('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium min-w-[250px] text-center">
                {getDateRangeText()}
              </span>
              <Button variant="outline" size="sm" onClick={() => navigate('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <Button onClick={goToToday} variant="outline">
              Today
            </Button>
          </div>
        </div>

        {/* View Selector */}
        <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as 'day' | 'week' | 'month')}>
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="week" className="flex items-center space-x-2">
              <CalendarIcon className="h-4 w-4" />
              <span>Week</span>
            </TabsTrigger>
            <TabsTrigger value="day" className="flex items-center space-x-2">
              <Sun className="h-4 w-4" />
              <span>Day</span>
            </TabsTrigger>
            <TabsTrigger value="month" className="flex items-center space-x-2">
              <Grid3X3 className="h-4 w-4" />
              <span>Month</span>
            </TabsTrigger>
          </TabsList>

          {/* Week View */}
          <TabsContent value="week" className="space-y-6">
                   <WeekView
                     weekDates={weekDates}
                     selectedSlots={selectedSlots}
                     isSelecting={isSelecting}
                     onMouseDown={handleMouseDown}
                     onMouseEnter={handleMouseEnter}
                     onMouseUp={handleMouseUp}
                     getTimeEntryBlocks={getTimeEntryBlocks}
                     onEditTimeEntry={handleEditTimeEntry}
                     onDragStart={handleDragStart}
                     isDragging={isDragging}
                     draggedEntry={draggedEntry}
                     hoveredSlot={hoveredSlot}
                     onResizeStart={handleResizeStart}
                     isResizing={isResizing}
                     resizingEntry={resizingEntry}
                     resizeHandle={resizeHandle}
                     resizeVisualOffset={resizeVisualOffset}
                     handleTimeEntryMouseDown={handleTimeEntryMouseDown}
                   />
          </TabsContent>

          {/* Day View */}
                 <TabsContent value="day" className="space-y-6">
                   <DayView
                     currentDate={currentDate}
                     selectedSlots={selectedSlots}
                     isSelecting={isSelecting}
                     onMouseDown={handleMouseDown}
                     onMouseEnter={handleMouseEnter}
                     onMouseUp={handleMouseUp}
                     getTimeEntryBlocks={getTimeEntryBlocks}
                     onEditTimeEntry={handleEditTimeEntry}
                     onDragStart={handleDragStart}
                     isDragging={isDragging}
                     draggedEntry={draggedEntry}
                     hoveredSlot={hoveredSlot}
                     onResizeStart={handleResizeStart}
                     isResizing={isResizing}
                     resizingEntry={resizingEntry}
                     resizeHandle={resizeHandle}
                     resizeVisualOffset={resizeVisualOffset}
                     handleTimeEntryMouseDown={handleTimeEntryMouseDown}
                   />
                 </TabsContent>

          {/* Month View */}
          <TabsContent value="month" className="space-y-6">
            <MonthView 
              monthDates={monthDates}
              currentDate={currentDate}
              selectedSlots={selectedSlots}
              isSelecting={isSelecting}
              onMouseDown={handleMouseDown}
              onMouseEnter={handleMouseEnter}
              onMouseUp={handleMouseUp}
              timeEntries={timeEntries}
              getProjectById={getProjectById}
              getTimeEntriesForDay={getTimeEntriesForDay}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Time Slot Modal */}
      <Dialog open={isTimeSlotModalOpen} onOpenChange={setIsTimeSlotModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Time Entry</DialogTitle>
            <DialogDescription>
              Create a time entry for the selected time slot.
            </DialogDescription>
          </DialogHeader>
          
          {modalTimeSlot && (
            <div className="space-y-4">
              {/* Time Window Display */}
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm font-medium text-muted-foreground mb-1">Time Window</div>
                <div className="text-lg font-semibold">
                  {modalTimeSlot.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {' '}
                  {modalTimeSlot.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="text-sm text-muted-foreground">
                  {new Date(modalTimeSlot.date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
              </div>

              {/* Task Description */}
              <div>
                <Label htmlFor="taskDescription">Task Description</Label>
                <Textarea
                  id="taskDescription"
                  placeholder="What are you working on?"
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Project Selection */}
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

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={cancelTimeSlot}>
                  Cancel
                </Button>
                <Button onClick={saveTimeSlot} disabled={!selectedProjectId}>
                  Save
                </Button>
              </div>
            </div>
          )}
               </DialogContent>
             </Dialog>

             {/* Edit Time Entry Modal */}
             <Dialog open={isEditTimeEntryOpen} onOpenChange={setIsEditTimeEntryOpen}>
               <DialogContent>
                 <DialogHeader>
                   <DialogTitle>Edit Time Entry</DialogTitle>
                   <DialogDescription>
                     Modify or delete the selected time entry.
                   </DialogDescription>
                 </DialogHeader>
                 
                 {editingTimeEntry && (
                   <div className="space-y-4">
                     <div className="p-3 bg-muted rounded-lg">
                       <div className="text-sm font-medium text-muted-foreground mb-1">Time Window</div>
                       <div className="text-lg font-semibold">
                         {editingTimeEntry.startTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {' '}
                         {editingTimeEntry.endTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                       </div>
                       <div className="text-sm text-muted-foreground">
                         {editingTimeEntry.startTime?.toLocaleDateString('en-US', { 
                           weekday: 'long', 
                           year: 'numeric', 
                           month: 'long', 
                           day: 'numeric' 
                         })}
                       </div>
                     </div>

                     <div>
                       <Label htmlFor="editTaskDescription">Task Description</Label>
                       <Textarea
                         id="editTaskDescription"
                         placeholder="What are you working on?"
                         value={editDescription}
                         onChange={(e) => {
                           console.log('Textarea changed:', e.target.value);
                           setEditDescription(e.target.value);
                         }}
                         className="mt-1"
                         disabled={false}
                       />
                     </div>

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

                     <div className="flex justify-between pt-4 border-t">
                       <Button 
                         variant="destructive" 
                         onClick={handleDeleteTimeEntry}
                       >
                         Delete Entry
                       </Button>
                       <div className="flex space-x-2">
                         <Button variant="outline" onClick={cancelEditTimeEntry}>
                           Cancel
                         </Button>
                         <Button onClick={handleUpdateTimeEntry} disabled={!editProjectId}>
                           Update
                         </Button>
                       </div>
                     </div>
                   </div>
                 )}
               </DialogContent>
             </Dialog>

      {/* Drag Preview */}
      {isDragging && draggedEntry && (
        <div 
          className="fixed pointer-events-none z-50"
          style={{
            left: currentMousePosition.x - dragPreviewOffset.x,
            top: currentMousePosition.y - dragPreviewOffset.y,
          }}
        >
          <div
            className="rounded-sm opacity-80 flex flex-col justify-start text-xs text-white font-medium overflow-hidden shadow-lg border-2 border-primary"
            style={{
              backgroundColor: draggedEntry.project?.color || '#3b82f6',
              width: '120px',
              height: `${Math.ceil(draggedEntry.duration_minutes / 15) * 11.5}px`,
              minHeight: '30px'
            }}
          >
            <div className="p-1 w-full h-full flex flex-col">
              <div className="font-semibold truncate text-xs">
                {draggedEntry.project?.name || 'Project'}
              </div>
              {draggedEntry.description && (
                <div className="truncate text-xs opacity-90 mt-0.5">
                  {draggedEntry.description}
                </div>
              )}
              <div className="flex-1 flex items-end justify-end">
                <div className="text-xs opacity-75 font-mono">
                  {Math.floor(draggedEntry.duration_minutes / 60)}:{(draggedEntry.duration_minutes % 60).toString().padStart(2, '0')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

          </Page>
        );
      };

// Day View Component
const DayView: React.FC<{
  currentDate: Date;
  selectedSlots: SelectedSlot[];
  isSelecting: boolean;
  onMouseDown: (day: number, hour: number, quarter: number) => void;
  onMouseEnter: (day: number, hour: number, quarter: number) => void;
  onMouseUp: () => void;
  getTimeEntryBlocks: (date: Date) => any[];
  onEditTimeEntry: (timeEntry: any) => void;
  onDragStart: (e: React.MouseEvent, timeEntry: any) => void;
  isDragging: boolean;
  draggedEntry: any;
  hoveredSlot: string | null;
  onResizeStart: (e: React.MouseEvent, timeEntry: any, handle: 'top' | 'bottom') => void;
  isResizing: boolean;
  resizingEntry: any;
  resizeHandle: 'top' | 'bottom' | null;
  resizeVisualOffset: {deltaQuarters: number};
  handleTimeEntryMouseDown: (e: React.MouseEvent, timeEntry: any) => void;
}> = ({ currentDate, selectedSlots, onMouseDown, onMouseEnter, onMouseUp, getTimeEntryBlocks, onEditTimeEntry, onDragStart, isDragging, draggedEntry, hoveredSlot, onResizeStart, isResizing, resizingEntry, resizeHandle, resizeVisualOffset, handleTimeEntryMouseDown }) => {
  const timeSlots = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let quarter = 0; quarter < 60; quarter += 15) {
      timeSlots.push({ hour, quarter });
    }
  }

  const formatTime = (hour: number, quarter: number) => {
    const totalMinutes = hour * 60 + quarter;
    const displayHour = Math.floor(totalMinutes / 60);
    const displayMinute = totalMinutes % 60;
    const ampm = displayHour >= 12 ? 'PM' : 'AM';
    const hour12 = displayHour > 12 ? displayHour - 12 : displayHour === 0 ? 12 : displayHour;
    return `${hour12}:${displayMinute.toString().padStart(2, '0')} ${ampm}`;
  };

  const isSlotSelected = (hour: number, quarter: number) => {
    return selectedSlots.some(slot => 
      slot.day === 0 && slot.hour === hour && slot.quarter === quarter
    );
  };

  // Get time entry blocks for the current date
  const timeBlocks = getTimeEntryBlocks(currentDate);

  // Helper function to check if a slot is occupied by a time block
  const getSlotTimeBlock = (hour: number, quarter: number) => {
    return timeBlocks.find(block => {
      const slotMinutes = hour * 60 + quarter;
      const blockStartMinutes = block.startHour * 60 + block.startQuarter;
      const blockEndMinutes = block.endHour * 60 + block.endQuarter;
      return slotMinutes >= blockStartMinutes && slotMinutes < blockEndMinutes;
    });
  };

  // Helper function to calculate exact position offset for a time block
  const getTimeBlockPositionOffset = (timeBlock: any, currentSlotHour: number, currentSlotQuarter: number) => {
    const slotStartMinutes = currentSlotHour * 60 + currentSlotQuarter;
    const blockStartMinutes = timeBlock.startHour * 60 + timeBlock.startQuarter;
    const offsetMinutes = blockStartMinutes - slotStartMinutes;
    const offsetPixels = (offsetMinutes / 15) * 11.5; // 11.5px per quarter hour
    return offsetPixels;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Sun className="h-5 w-5" />
          <span>Daily Schedule</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto" style={{ maxHeight: '70vh' }}>
          <div className="min-w-[400px]">
            {/* Header - Sticky */}
            <div className="grid grid-cols-2 border-b border-border bg-background sticky top-0 z-10 shadow-sm">
              <div className="p-2 text-sm font-medium border-r border-border">Time</div>
              <div className="p-2 text-sm font-medium text-center">
                {currentDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </div>
            </div>

            {/* Time slots - 4 slots per hour = 16px total per hour (64px per hour) */}
            {timeSlots.map(({ hour, quarter }) => {
              const timeBlock = getSlotTimeBlock(hour, quarter);
              const isSlotOccupied = !!timeBlock;
              const isBlockStart = timeBlock && 
                hour * 60 + quarter === timeBlock.startHour * 60 + timeBlock.startQuarter;
              const slotKey = `${currentDate.toISOString().split('T')[0]}-${hour}:${quarter.toString().padStart(2, '0')}`;
              const isHovered = isDragging && hoveredSlot === slotKey;
              
              // Calculate if this slot is part of a drop zone for the dragged entry
              const isDropZone = isDragging && draggedEntry && isHovered;
              const draggedDurationQuarters = draggedEntry ? Math.ceil(draggedEntry.duration_minutes / 15) : 0;
              const slotMinutes = hour * 60 + quarter;
              const hoveredSlotMinutes = hoveredSlot ? (() => {
                const [hoveredDate, hoveredTime] = hoveredSlot.split('-');
                if (hoveredDate === currentDate.toISOString().split('T')[0]) {
                  const [hoveredHour, hoveredQuarter] = hoveredTime.split(':').map(Number);
                  return hoveredHour * 60 + hoveredQuarter;
                }
                return -1;
              })() : -1;
              
              const isInDropZone = isDragging && draggedEntry && hoveredSlotMinutes >= 0 && 
                slotMinutes >= hoveredSlotMinutes && 
                slotMinutes < hoveredSlotMinutes + (draggedDurationQuarters * 15);
              
              return (
                <div key={`${hour}-${quarter}`} className={cn(
                  "grid grid-cols-2",
                  quarter === 0 ? "border-b border-border" : ""
                )}>
                  <div className="px-2 py-1 text-xs font-medium border-r border-border bg-muted/30 flex items-center" style={{ height: '11.5px' }}>
                    {quarter === 0 ? `${hour.toString().padStart(2, '0')}:00-${hour.toString().padStart(2, '0')}:15` : ''}
                  </div>
                  <div
                    className={cn(
                      'relative cursor-pointer transition-colors select-none',
                      quarter === 0 ? 'border-t-2 border-border' : quarter === 15 || quarter === 30 || quarter === 45 ? 'border-t border-gray-100' : '',
                      isSlotSelected(hour, quarter)
                        ? 'bg-primary/20'
                        : isSlotOccupied ? '' 
                        : isInDropZone ? '' // Invisible drop zone
                        : quarter === 0 ? 'hover:bg-blue-50' : 'hover:bg-muted/30'
                    )}
                    style={{ height: '11.5px' }}
                    data-time-slot={`${hour}:${quarter.toString().padStart(2, '0')}`}
                    data-date={currentDate.toISOString().split('T')[0]}
                    onMouseDown={() => !isSlotOccupied && onMouseDown(0, hour, quarter)}
                    onMouseEnter={() => !isSlotOccupied && onMouseEnter(0, hour, quarter)}
                    onMouseUp={() => !isSlotOccupied && onMouseUp()}
                    title={`Click to create: ${hour.toString().padStart(2, '0')}:${quarter === 0 ? '00' : quarter.toString().padStart(2, '0')}-${hour.toString().padStart(2, '0')}:${quarter === 0 ? '15' : (quarter + 15).toString().padStart(2, '0')}`}
                  >
                    {/* Visible drop zone indicator */}
                    {isDropZone && !isSlotOccupied && (
                      <div 
                        className="absolute inset-0 rounded-sm pointer-events-none z-5 border-2 border-dashed border-primary bg-primary/10"
                        style={{ 
                          height: `${draggedDurationQuarters * 11.5}px` // Match dragged entry height (11.5px per quarter)
                        }}
                      />
                    )}
                    
                      {timeBlock && isBlockStart && (
                        <div 
                          data-time-entry-id={timeBlock.id}
                          className={cn(
                            "absolute inset-0 rounded-sm opacity-90 flex flex-col justify-start text-xs text-white font-medium overflow-hidden z-10",
                            isDragging && draggedEntry?.id === timeBlock.id 
                              ? "cursor-grabbing opacity-30" 
                              : "cursor-grab hover:cursor-grab"
                          )}
                          style={{ 
                            backgroundColor: timeBlock.project.color || '#3b82f6',
                            height: isResizing && resizingEntry?.id === timeBlock.id 
                              ? `${Math.max(1, timeBlock.durationQuarters + (resizeHandle === 'bottom' ? resizeVisualOffset.deltaQuarters : (resizeHandle === 'top' ? -resizeVisualOffset.deltaQuarters : 0))) * 11.5}px`
                              : `${timeBlock.durationQuarters * 11.5}px`, // 11.5px per quarter hour (46px per hour)
                            top: isResizing && resizingEntry?.id === timeBlock.id && resizeHandle === 'top'
                              ? `${resizeVisualOffset.deltaQuarters * 11.5 + getTimeBlockPositionOffset(timeBlock, hour, quarter)}px`
                              : `${getTimeBlockPositionOffset(timeBlock, hour, quarter)}px`,
                            pointerEvents: isDragging && draggedEntry?.id === timeBlock.id ? 'none' : 'auto'
                          }}
                          onMouseDown={(e) => {
                            handleTimeEntryMouseDown(e, timeBlock);
                          }}
                          title={`${timeBlock.project.name}: ${timeBlock.description || timeBlock.task || 'Time entry'}`}
                        >
                        <div className="p-1 w-full h-full flex flex-col">
                          <div className="font-semibold truncate text-xs">
                            {timeBlock.project.name}
                          </div>
                          {timeBlock.description && (
                            <div className="truncate text-xs opacity-90 mt-0.5">
                              {timeBlock.description}
                            </div>
                          )}
                          
                          {/* Duration in bottom right */}
                          <div className="flex-1 flex items-end justify-end">
                            <div className="text-xs opacity-75 font-mono">
                              {Math.floor(timeBlock.duration_minutes / 60)}:{(timeBlock.duration_minutes % 60).toString().padStart(2, '0')}
                            </div>
                          </div>
                        </div>
                        
                        {/* Resize handles */}
                        {!isDragging && !isResizing && (
                          <>
                            {/* Top resize handle */}
                            <div
                              className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize bg-white/20 hover:bg-white/40 transition-colors"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                onResizeStart(e, timeBlock, 'top');
                              }}
                            />
                            {/* Bottom resize handle */}
                            <div
                              className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize bg-white/20 hover:bg-white/40 transition-colors"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                onResizeStart(e, timeBlock, 'bottom');
                              }}
                            />
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Week View Component
const WeekView: React.FC<{
  weekDates: Date[];
  selectedSlots: SelectedSlot[];
  isSelecting: boolean;
  onMouseDown: (day: number, hour: number, quarter: number) => void;
  onMouseEnter: (day: number, hour: number, quarter: number) => void;
  onMouseUp: () => void;
  getTimeEntryBlocks: (date: Date) => any[];
  onEditTimeEntry: (timeEntry: any) => void;
  onDragStart: (e: React.MouseEvent, timeEntry: any) => void;
  isDragging: boolean;
  draggedEntry: any;
  hoveredSlot: string | null;
  onResizeStart: (e: React.MouseEvent, timeEntry: any, handle: 'top' | 'bottom') => void;
  isResizing: boolean;
  resizingEntry: any;
  resizeHandle: 'top' | 'bottom' | null;
  resizeVisualOffset: {deltaQuarters: number};
  handleTimeEntryMouseDown: (e: React.MouseEvent, timeEntry: any) => void;
}> = ({ weekDates, selectedSlots, onMouseDown, onMouseEnter, onMouseUp, getTimeEntryBlocks, onEditTimeEntry, onDragStart, isDragging, draggedEntry, hoveredSlot, onResizeStart, isResizing, resizingEntry, resizeHandle, resizeVisualOffset, handleTimeEntryMouseDown }) => {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const timeSlots = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let quarter = 0; quarter < 60; quarter += 15) {
      timeSlots.push({ hour, quarter });
    }
  }

  const formatTime = (hour: number, quarter: number) => {
    const totalMinutes = hour * 60 + quarter;
    const displayHour = Math.floor(totalMinutes / 60);
    const displayMinute = totalMinutes % 60;
    const ampm = displayHour >= 12 ? 'PM' : 'AM';
    const hour12 = displayHour > 12 ? displayHour - 12 : displayHour === 0 ? 12 : displayHour;
    return `${hour12}:${displayMinute.toString().padStart(2, '0')} ${ampm}`;
  };

  const isSlotSelected = (day: number, hour: number, quarter: number) => {
    return selectedSlots.some(slot => 
      slot.day === day && slot.hour === hour && slot.quarter === quarter
    );
  };

  // Helper function to get time blocks for each day and check slot occupation
  const getSlotTimeBlock = (date: Date, hour: number, quarter: number) => {
    const dayBlocks = getTimeEntryBlocks(date);
    return dayBlocks.find(block => {
      const slotMinutes = hour * 60 + quarter;
      const blockStartMinutes = block.startHour * 60 + block.startQuarter;
      const blockEndMinutes = block.endHour * 60 + block.endQuarter;
      return slotMinutes >= blockStartMinutes && slotMinutes < blockEndMinutes;
    });
  };

  // Helper function to calculate exact position offset for a time block
  const getTimeBlockPositionOffset = (timeBlock: any, currentSlotHour: number, currentSlotQuarter: number) => {
    const slotStartMinutes = currentSlotHour * 60 + currentSlotQuarter;
    const blockStartMinutes = timeBlock.startHour * 60 + timeBlock.startQuarter;
    const offsetMinutes = blockStartMinutes - slotStartMinutes;
    const offsetPixels = (offsetMinutes / 15) * 11.5; // 11.5px per quarter hour
    return offsetPixels;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CalendarIcon className="h-5 w-5" />
          <span>Weekly Schedule</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto" style={{ maxHeight: '70vh' }}>
          <div className="min-w-[800px]">
            {/* Header - Sticky */}
            <div className="grid grid-cols-8 border-b border-border bg-background sticky top-0 z-10 shadow-sm">
              <div className="p-2 text-sm font-medium border-r border-border">Time</div>
              {weekDates.map((date, index) => (
                <div key={index} className="p-2 text-sm font-medium text-center border-r border-border">
                  <div>{dayNames[index]}</div>
                  <div className="text-xs text-muted-foreground">
                    {date.getDate()}/{date.getMonth() + 1}
                  </div>
                </div>
              ))}
            </div>

            {/* Time slots - 4 slots per hour = 16px total per hour (64px per hour) */}
            {timeSlots.map(({ hour, quarter }) => (
              <div key={`${hour}-${quarter}`} className={cn(
                "grid grid-cols-8",
                quarter === 0 ? "border-b border-border" : ""
              )}>
                <div className="px-2 py-1 text-xs font-medium border-r border-border bg-muted/30 flex items-center" style={{ height: '11.5px' }}>
                  {quarter === 0 ? `${hour.toString().padStart(2, '0')}:00` : ''}
                </div>
                {weekDates.map((date, dayIndex) => {
                  const timeBlock = getSlotTimeBlock(date, hour, quarter);
                  const isSlotOccupied = !!timeBlock;
                  const isBlockStart = timeBlock && 
                    hour * 60 + quarter === timeBlock.startHour * 60 + timeBlock.startQuarter;
                  const slotKey = `${date.toISOString().split('T')[0]}-${hour}:${quarter.toString().padStart(2, '0')}`;
                  const isHovered = isDragging && hoveredSlot === slotKey;
                  
                  // Calculate if this slot is part of a drop zone for the dragged entry
                  const isDropZone = isDragging && draggedEntry && isHovered;
                  const draggedDurationQuarters = draggedEntry ? Math.ceil(draggedEntry.duration_minutes / 15) : 0;
                  const slotMinutes = hour * 60 + quarter;
                  const hoveredSlotMinutes = hoveredSlot ? (() => {
                    const [hoveredDate, hoveredTime] = hoveredSlot.split('-');
                    if (hoveredDate === date.toISOString().split('T')[0]) {
                      const [hoveredHour, hoveredQuarter] = hoveredTime.split(':').map(Number);
                      return hoveredHour * 60 + hoveredQuarter;
                    }
                    return -1;
                  })() : -1;
                  
                  const isInDropZone = isDragging && draggedEntry && hoveredSlotMinutes >= 0 && 
                    slotMinutes >= hoveredSlotMinutes && 
                    slotMinutes < hoveredSlotMinutes + (draggedDurationQuarters * 15);
                  
                  return (
                    <div
                      key={`${dayIndex}-${hour}-${quarter}`}
                      className={cn(
                        'relative border-r border-border cursor-pointer transition-colors select-none',
                        quarter === 0 ? 'border-t-2 border-border' : quarter === 15 || quarter === 30 || quarter === 45 ? 'border-t border-gray-100' : '',
                        isSlotSelected(dayIndex, hour, quarter)
                          ? 'bg-primary/20'
                          : isSlotOccupied ? '' 
                          : isInDropZone ? '' // Invisible drop zone
                          : quarter === 0 ? 'hover:bg-blue-50' : 'hover:bg-muted/30'
                      )}
                      style={{ height: '11.5px' }}
                      data-time-slot={`${hour}:${quarter.toString().padStart(2, '0')}`}
                      data-date={date.toISOString().split('T')[0]}
                      onMouseDown={() => !isSlotOccupied && onMouseDown(dayIndex, hour, quarter)}
                      onMouseEnter={() => !isSlotOccupied && onMouseEnter(dayIndex, hour, quarter)}
                      onMouseUp={() => !isSlotOccupied && onMouseUp()}
                      title={`Click to create: ${hour.toString().padStart(2, '0')}:${quarter === 0 ? '00' : quarter.toString().padStart(2, '0')}-${hour.toString().padStart(2, '0')}:${quarter === 0 ? '15' : (quarter + 15).toString().padStart(2, '0')}`}
                    >
                      {/* Visible drop zone indicator */}
                      {isDropZone && !isSlotOccupied && (
                        <div 
                          className="absolute inset-0 rounded-sm pointer-events-none z-5 border-2 border-dashed border-primary bg-primary/10"
                          style={{ 
                            height: `${draggedDurationQuarters * 11.5}px` // Match dragged entry height (11.5px per quarter)
                          }}
                        />
                      )}
                      
                      {timeBlock && isBlockStart && (
                        <div 
                          data-time-entry-id={timeBlock.id}
                          className={cn(
                            "absolute inset-0 rounded-sm opacity-90 flex flex-col justify-start text-xs text-white font-medium overflow-hidden z-10",
                            isDragging && draggedEntry?.id === timeBlock.id 
                              ? "cursor-grabbing opacity-30" 
                              : "cursor-grab hover:cursor-grab"
                          )}
                          style={{ 
                            backgroundColor: timeBlock.project.color || '#3b82f6',
                            height: isResizing && resizingEntry?.id === timeBlock.id 
                              ? `${Math.max(1, timeBlock.durationQuarters + (resizeHandle === 'bottom' ? resizeVisualOffset.deltaQuarters : (resizeHandle === 'top' ? -resizeVisualOffset.deltaQuarters : 0))) * 11.5}px`
                              : `${timeBlock.durationQuarters * 11.5}px`, // 11.5px per quarter hour (46px per hour)
                            top: isResizing && resizingEntry?.id === timeBlock.id && resizeHandle === 'top'
                              ? `${resizeVisualOffset.deltaQuarters * 11.5 + getTimeBlockPositionOffset(timeBlock, hour, quarter)}px`
                              : `${getTimeBlockPositionOffset(timeBlock, hour, quarter)}px`,
                            pointerEvents: isDragging && draggedEntry?.id === timeBlock.id ? 'none' : 'auto'
                          }}
                          onMouseDown={(e) => {
                            handleTimeEntryMouseDown(e, timeBlock);
                          }}
                          title={`${timeBlock.project.name}: ${timeBlock.description || timeBlock.task || 'Time entry'}`}
                        >
                          <div className="p-1 w-full h-full flex flex-col">
                            <div className="font-semibold truncate text-xs">
                              {timeBlock.project.name}
                            </div>
                            {timeBlock.description && (
                              <div className="truncate text-xs opacity-90 mt-0.5">
                                {timeBlock.description}
                              </div>
                            )}
                            
                            {/* Duration in bottom right */}
                            <div className="flex-1 flex items-end justify-end">
                              <div className="text-xs opacity-75 font-mono">
                                {Math.floor(timeBlock.duration_minutes / 60)}:{(timeBlock.duration_minutes % 60).toString().padStart(2, '0')}
                              </div>
                            </div>
                          </div>
                          
                          {/* Resize handles */}
                          {!isDragging && !isResizing && (
                            <>
                              {/* Top resize handle */}
                              <div
                                className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize bg-white/20 hover:bg-white/40 transition-colors"
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  onResizeStart(e, timeBlock, 'top');
                                }}
                              />
                              {/* Bottom resize handle */}
                              <div
                                className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize bg-white/20 hover:bg-white/40 transition-colors"
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  onResizeStart(e, timeBlock, 'bottom');
                                }}
                              />
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Month View Component
const MonthView: React.FC<{
  monthDates: Date[];
  currentDate: Date;
  selectedSlots: SelectedSlot[];
  isSelecting: boolean;
  onMouseDown: (day: number, hour: number, quarter: number) => void;
  onMouseEnter: (day: number, hour: number, quarter: number) => void;
  onMouseUp: () => void;
  timeEntries: any[];
  getProjectById: (id: string) => any;
  getTimeEntriesForDay: (date: Date) => any[];
}> = ({ monthDates, currentDate, selectedSlots, onMouseDown, onMouseEnter, onMouseUp, timeEntries, getProjectById, getTimeEntriesForDay }) => {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const currentMonth = currentDate.getMonth();

  const isDateSelected = (dateIndex: number) => {
    return selectedSlots.some(slot => slot.day === dateIndex);
  };

  const handleDateClick = (dateIndex: number) => {
    // For month view, create a default time slot (9 AM - 10 AM)
    onMouseDown(dateIndex, 9, 0); // 9:00 AM
    onMouseEnter(dateIndex, 9, 45); // 9:45 AM (45 minutes)
    onMouseUp();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Grid3X3 className="h-5 w-5" />
          <span>Monthly Overview</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-7 gap-1">
          {/* Day headers */}
          {dayNames.map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
          
          {/* Calendar dates */}
          {monthDates.map((date, index) => {
            const isToday = date.toDateString() === today.toDateString();
            const isCurrentMonth = date.getMonth() === currentMonth;
            const isSelected = isDateSelected(index);
            const dayTimeEntries = getTimeEntriesForDay(date);
            const hasTimeEntries = dayTimeEntries.length > 0;
            
            // Get unique projects for this day
            const dayProjects = dayTimeEntries.reduce((acc: any[], entry: any) => {
              const projectId = entry.project_id || entry.projectId;
              const project = getProjectById(projectId);
              if (project && !acc.find((p: any) => p.id === project.id)) {
                acc.push(project);
              }
              return acc;
            }, []);
            
            return (
              <div
                key={index}
                className={cn(
                  'p-2 text-center text-sm border border-border rounded-md cursor-pointer transition-colors min-h-[40px] flex flex-col items-center justify-center relative',
                  isToday && 'bg-primary text-primary-foreground font-bold',
                  !isCurrentMonth && 'text-muted-foreground bg-muted/30',
                  isSelected && 'bg-primary/20 border-primary',
                  isCurrentMonth && !isSelected && 'hover:bg-muted/50'
                )}
                onClick={() => handleDateClick(index)}
              >
                <span className="mb-1">{date.getDate()}</span>
                {hasTimeEntries && (
                  <div className="flex flex-wrap gap-1 justify-center">
                    {dayProjects.slice(0, 3).map((project, pIndex) => (
                      <div
                        key={pIndex}
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: project.color || '#3b82f6' }}
                        title={project.name}
                      />
                    ))}
                    {dayProjects.length > 3 && (
                      <div 
                        className="w-2 h-2 rounded-full bg-gray-400"
                        title={`+${dayProjects.length - 3} more projects`}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="mt-4 text-xs text-muted-foreground text-center">
          Click on a date to create a time entry (default: 9:00 AM - 9:45 AM)
        </div>
      </CardContent>
    </Card>
  );
};
