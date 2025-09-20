import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Sun, Grid3X3 } from 'lucide-react';
import { useAppState } from '../hooks/useAppState';
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
  const { getActiveProjects, createTimeEntry } = useAppState();
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
  
  const activeProjects = getActiveProjects();

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
    startTime.setHours(startSlot.hour, startSlot.quarter, 0, 0);
    
    const endTime = new Date(date);
    endTime.setHours(endSlot.hour, endSlot.quarter + 15, 0, 0);
    
    setModalTimeSlot({
      startTime,
      endTime,
      date: date.toISOString().split('T')[0],
    });
    
    setIsTimeSlotModalOpen(true);
  };

  const saveTimeSlot = () => {
    if (!selectedProjectId || !modalTimeSlot) return;

    const duration = (modalTimeSlot.endTime.getTime() - modalTimeSlot.startTime.getTime()) / (1000 * 60);
    
    createTimeEntry({
      projectId: selectedProjectId,
      startTime: modalTimeSlot.startTime,
      endTime: modalTimeSlot.endTime,
      duration,
      date: modalTimeSlot.date,
      task: taskDescription.trim() || undefined,
    });

    // Reset modal state
    setIsTimeSlotModalOpen(false);
    setModalTimeSlot(null);
    setSelectedProjectId('');
    setTaskDescription('');
    setSelectedSlots([]);
  };

  const cancelTimeSlot = () => {
    setIsTimeSlotModalOpen(false);
    setModalTimeSlot(null);
    setSelectedProjectId('');
    setTaskDescription('');
    setSelectedSlots([]);
  };

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
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a project..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: project.color }}
                          />
                          <span>{project.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
}> = ({ currentDate, selectedSlots, onMouseDown, onMouseEnter, onMouseUp }) => {
  const timeSlots = [];
  for (let hour = 6; hour < 22; hour++) {
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
            {timeSlots.map(({ hour, quarter }) => (
              <div key={`${hour}-${quarter}`} className={cn(
                "grid grid-cols-2",
                quarter === 0 ? "border-b border-border" : ""
              )}>
                <div className="px-2 py-1 text-xs font-medium border-r border-border bg-muted/30 h-4 flex items-center">
                  {quarter === 0 ? formatTime(hour, quarter) : ''}
                </div>
                <div
                  className={cn(
                    quarter === 45 
                      ? 'px-2 py-1 text-xs font-medium border-r border-border bg-muted/30 h-4 flex items-center cursor-pointer transition-colors select-none'
                      : 'h-4 cursor-pointer transition-colors select-none',
                    quarter === 0 ? 'border-t border-border' : '',
                    isSlotSelected(hour, quarter)
                      ? 'bg-primary/20' + (quarter === 0 ? ' border-primary' : '')
                      : quarter === 45 ? '' : 'hover:bg-muted/50'
                  )}
                  onMouseDown={() => onMouseDown(0, hour, quarter)}
                  onMouseEnter={() => onMouseEnter(0, hour, quarter)}
                  onMouseUp={onMouseUp}
                />
              </div>
            ))}
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
}> = ({ weekDates, selectedSlots, onMouseDown, onMouseEnter, onMouseUp }) => {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const timeSlots = [];
  for (let hour = 6; hour < 22; hour++) {
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
                <div className="px-2 py-1 text-xs font-medium border-r border-border bg-muted/30 h-4 flex items-center">
                  {quarter === 0 ? formatTime(hour, quarter) : ''}
                </div>
                {weekDates.map((_, dayIndex) => (
                  <div
                    key={`${dayIndex}-${hour}-${quarter}`}
                    className={cn(
                      quarter === 45 
                        ? 'px-2 py-1 text-xs font-medium border-r border-border bg-muted/30 h-4 flex items-center cursor-pointer transition-colors select-none'
                        : 'h-4 border-r border-border cursor-pointer transition-colors select-none',
                      quarter === 0 ? 'border-t border-border' : '',
                      isSlotSelected(dayIndex, hour, quarter)
                        ? 'bg-primary/20' + (quarter === 0 ? ' border-primary' : '')
                        : quarter === 45 ? '' : 'hover:bg-muted/50'
                    )}
                    onMouseDown={() => onMouseDown(dayIndex, hour, quarter)}
                    onMouseEnter={() => onMouseEnter(dayIndex, hour, quarter)}
                    onMouseUp={onMouseUp}
                  />
                ))}
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
}> = ({ monthDates, currentDate, selectedSlots, onMouseDown, onMouseEnter, onMouseUp }) => {
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
            
            return (
              <div
                key={index}
                className={cn(
                  'p-2 text-center text-sm border border-border rounded-md cursor-pointer transition-colors min-h-[40px] flex items-center justify-center',
                  isToday && 'bg-primary text-primary-foreground font-bold',
                  !isCurrentMonth && 'text-muted-foreground bg-muted/30',
                  isSelected && 'bg-primary/20 border-primary',
                  isCurrentMonth && !isSelected && 'hover:bg-muted/50'
                )}
                onClick={() => handleDateClick(index)}
              >
                {date.getDate()}
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
