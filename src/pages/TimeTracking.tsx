import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Play, Pause, Square, Clock, Trash2 } from 'lucide-react';
import { useSupabaseAppState } from '../hooks/useSupabaseAppState';
import { Page } from '../components/Page';
// import { TimeEntry } from '../types'; // Type is imported via useAppState

export const TimeTracking: React.FC = () => {
  const { getActiveProjects, timeEntries, createTimeEntry, deleteTimeEntry, getProjectById, loading, error } = useSupabaseAppState();
  const [isTracking, setIsTracking] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const activeProjects = getActiveProjects();
  
  useEffect(() => {
    let interval: number;
    if (isTracking && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking, startTime]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const handleStartTracking = () => {
    if (!selectedProjectId) return;
    
    setIsTracking(true);
    setStartTime(new Date());
    setElapsedTime(0);
  };

  const handleStopTracking = () => {
    if (!startTime || !selectedProjectId) return;
    
    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 60000); // minutes
    
    createTimeEntry({
      projectId: selectedProjectId,
      startTime,
      endTime,
      duration,
      date: startTime.toISOString().split('T')[0],
    });
    
    setIsTracking(false);
    setStartTime(null);
    setElapsedTime(0);
  };

  const handlePauseTracking = () => {
    if (!startTime || !selectedProjectId) return;
    
    const now = new Date();
    const duration = Math.floor((now.getTime() - startTime.getTime()) / 60000); // minutes
    
    if (duration > 0) {
      createTimeEntry({
        projectId: selectedProjectId,
        startTime,
        endTime: now,
        duration,
        date: startTime.toISOString().split('T')[0],
      });
    }
    
    setIsTracking(false);
    setStartTime(null);
    setElapsedTime(0);
  };

  const todaysEntries = timeEntries.filter(
    entry => entry.date === new Date().toISOString().split('T')[0]
  );

  const totalTimeToday = todaysEntries.reduce((total, entry) => total + entry.duration, 0);

  return (
    <Page>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Time Tracking</h1>
        <p className="text-muted-foreground">
          Track your time across different projects.
        </p>
      </div>

      {/* Time Tracker */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Current Session</CardTitle>
          <CardDescription>
            Start tracking time for your projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-6">
            {/* Project Selection */}
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger>
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
            </div>

            {/* Timer Display */}
            <div className="text-center">
              <div className="text-6xl font-mono font-bold text-primary mb-4">
                {formatTime(elapsedTime)}
              </div>
              <div className="flex justify-center space-x-3">
                {!isTracking ? (
                  <Button 
                    onClick={handleStartTracking} 
                    disabled={!selectedProjectId}
                    size="lg"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Start
                  </Button>
                ) : (
                  <>
                    <Button onClick={handlePauseTracking} variant="outline" size="lg">
                      <Pause className="h-5 w-5 mr-2" />
                      Pause
                    </Button>
                    <Button onClick={handleStopTracking} size="lg">
                      <Square className="h-5 w-5 mr-2" />
                      Stop
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Current Project Info */}
            {isTracking && selectedProjectId && (
              <div className="text-center">
                <Badge variant="secondary" className="text-sm">
                  Tracking: {getProjectById(selectedProjectId)?.name}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Today's Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Total</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(totalTimeToday)}</div>
            <p className="text-xs text-muted-foreground">
              Across {new Set(todaysEntries.map(e => e.projectId)).size} projects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessions</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todaysEntries.length}</div>
            <p className="text-xs text-muted-foreground">
              Time tracking sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Session</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {todaysEntries.length > 0 
                ? formatDuration(Math.round(totalTimeToday / todaysEntries.length))
                : '0m'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Per session today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Time Entries</CardTitle>
          <CardDescription>
            Your time tracking sessions for today
          </CardDescription>
        </CardHeader>
        <CardContent>
          {todaysEntries.length > 0 ? (
            <div className="space-y-3">
              {todaysEntries.map((entry) => {
                const project = getProjectById(entry.projectId);
                return (
                  <div key={entry.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: project?.color || '#6b7280' }}
                      />
                      <div>
                        <p className="font-medium">{project?.name || 'Unknown Project'}</p>
                        {entry.task && (
                          <p className="text-sm text-foreground mb-1">{entry.task}</p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          {entry.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {' '}
                          {entry.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline">
                        {formatDuration(entry.duration)}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteTimeEntry(entry.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No time entries today</h3>
              <p className="text-muted-foreground">
                Start tracking time to see your sessions here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </Page>
  );
};
