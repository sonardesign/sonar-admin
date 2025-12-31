import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Clock, Calendar, FolderOpen, Timer } from 'lucide-react';
// import { useSupabaseAppState } from '../hooks/useSupabaseAppState'; // Temporarily disabled
import { useAppState } from '../hooks/useAppState';
import { Page } from '../components/Page';

export const Dashboard: React.FC = () => {
  const { projects, timeEntries, getActiveProjects } = useAppState();
  const loading = false;
  const error = null;
  
  console.log('📊 Dashboard using mock data:', { 
    projects: projects.length, 
    timeEntries: timeEntries.length 
  });
  
  // Show error state
  if (error) {
    return (
      <Page>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-destructive mb-2">Error loading dashboard</p>
            <p className="text-muted-foreground text-sm">{error}</p>
          </div>
        </div>
      </Page>
    )
  }
  
  const activeProjects = getActiveProjects();
  const totalTimeToday = timeEntries
    .filter(entry => entry.date === new Date().toISOString().split('T')[0])
    .reduce((total, entry) => total + (entry.duration || entry.duration_minutes || 0), 0);
  
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <Page loading={loading} loadingText="Loading dashboard...">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's an overview of your time tracking.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProjects.length}</div>
            <p className="text-xs text-muted-foreground">
              {projects.filter(p => p.is_archived || p.archived).length} archived
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Time</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(totalTimeToday)}</div>
            <p className="text-xs text-muted-foreground">
              Across all projects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTime(timeEntries.reduce((total, entry) => total + (entry.duration || entry.duration_minutes || 0), 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              Total tracked time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average/Day</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTime(Math.round(totalTimeToday / 1) || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Based on today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Active Projects</CardTitle>
            <CardDescription>
              Your current active projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeProjects.length > 0 ? (
              <div className="space-y-3">
                {activeProjects.slice(0, 5).map((project) => (
                  <div key={project.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: project.color }}
                      />
                      <span className="font-medium">{project.name}</span>
                    </div>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No active projects. Create one to get started!
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted cursor-pointer transition-colors">
                <Timer className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Start Time Tracking</p>
                  <p className="text-sm text-muted-foreground">Begin tracking time for a project</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted cursor-pointer transition-colors">
                <FolderOpen className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Create New Project</p>
                  <p className="text-sm text-muted-foreground">Add a new project to track</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted cursor-pointer transition-colors">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">View Calendar</p>
                  <p className="text-sm text-muted-foreground">See your weekly time schedule</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Page>
  );
};
