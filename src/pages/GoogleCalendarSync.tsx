import React, { useState, useEffect } from 'react';
import { Page } from '../components/Page';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { SimpleCombobox, ComboboxOption } from '../components/ui/simple-combobox';
import { Calendar as CalendarIcon, CheckCircle2, XCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { googleCalendarService, type GoogleCalendarEvent } from '../services/googleCalendarService';
import { useSupabaseAppState } from '../hooks/useSupabaseAppState';
import { usePermissions } from '../hooks/usePermissions';
import { notifications } from '../lib/notifications';
import { toast } from 'sonner';
import { Progress } from '../components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Calendar } from '../components/ui/calendar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { Checkbox } from '../components/ui/checkbox';
import moment from 'moment';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

export const GoogleCalendarSettingsPanel: React.FC = () => {
  const { projects, getActiveProjects } = useSupabaseAppState();
  const { isAdmin } = usePermissions();
  const activeProjects = getActiveProjects();

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Calendar selection
  const [calendars, setCalendars] = useState<any[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<string>('primary');
  const [calendarInput, setCalendarInput] = useState('');

  // Date range
  const [startDate, setStartDate] = useState<Date>(
    moment().subtract(30, 'days').toDate()
  );
  const [endDate, setEndDate] = useState<Date>(new Date());

  // Project selection
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncMessage, setSyncMessage] = useState('');
  const [syncResult, setSyncResult] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<GoogleCalendarEvent[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [isLoadingUpcoming, setIsLoadingUpcoming] = useState(false);
  const [isImportingSelected, setIsImportingSelected] = useState(false);
  const [drawerStartDate, setDrawerStartDate] = useState<Date>(new Date());
  const [drawerEndDate, setDrawerEndDate] = useState<Date>(moment().add(30, 'days').toDate());
  const [drawerSearchQuery, setDrawerSearchQuery] = useState('');

  // Google config stored in backend
  const [clientId, setClientId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isSavingCalendar, setIsSavingCalendar] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

  const isGoogleConfigMissing = !clientId || !apiKey;

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('key,value')
          .in('key', ['google_calendar_client_id', 'google_calendar_api_key', 'google_calendar_id']);

        if (error) {
          console.error('Error loading Google Calendar settings:', error);
          return;
        }

        const settingsMap = new Map((data || []).map((row) => [row.key, row.value]));
        const storedClientId = settingsMap.get('google_calendar_client_id') || '';
        const storedApiKey = settingsMap.get('google_calendar_api_key') || '';
        const storedCalendarId = settingsMap.get('google_calendar_id') || '';

        setClientId(storedClientId);
        setApiKey(storedApiKey);
        if (storedCalendarId) {
          setCalendarInput(storedCalendarId);
          setSelectedCalendar(storedCalendarId);
        }

        googleCalendarService.setConfig({
          clientId: storedClientId,
          apiKey: storedApiKey,
        });
      } finally {
        setConfigLoaded(true);
      }
    };

    loadSettings();
  }, []);

  // Project options for combobox
  const projectOptions: ComboboxOption[] = activeProjects.map(project => ({
    value: project.id,
    label: project.name,
    color: project.color
  }));

  // Calendar options for combobox
  const calendarOptions: ComboboxOption[] = calendars.map(cal => ({
    value: cal.id,
    label: cal.summary,
    color: cal.backgroundColor
  }));

  const parseCalendarId = (value: string) => {
    if (!value) return '';
    try {
      const url = new URL(value);
      const src = url.searchParams.get('src');
      return src || value;
    } catch {
      return value;
    }
  };

  // Handle Google authentication
  const handleAuthenticate = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      await googleCalendarService.authenticate();
      setIsAuthenticated(true);
      
      // Load calendars
      const cals = await googleCalendarService.getCalendars();
      setCalendars(cals);
      
      toast.success('Successfully connected to Google Calendar');
    } catch (error: any) {
      console.error('Authentication error:', error);
      const message = error?.message || 'Unknown error';
      setAuthError(message);
      toast.error(`Failed to authenticate: ${message}`);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Handle sign out
  const handleSignOut = () => {
    googleCalendarService.signOut();
    setIsAuthenticated(false);
    setCalendars([]);
    setSyncResult(null);
    toast.success('Signed out from Google Calendar');
  };

  const handleSaveConfig = async () => {
    if (!isAdmin) {
      toast.error('Only admins can update Google Calendar settings.');
      return;
    }
    if (!clientId || !apiKey) {
      toast.error('Both Client ID and API Key are required.');
      return;
    }

    setIsSavingConfig(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert(
          [
            { key: 'google_calendar_client_id', value: clientId },
            { key: 'google_calendar_api_key', value: apiKey },
            { key: 'google_calendar_id', value: calendarInput || selectedCalendar || 'primary' },
          ],
          { onConflict: 'key' }
        );

      if (error) {
        throw error;
      }

      googleCalendarService.setConfig({ clientId, apiKey });
      toast.success('Google Calendar settings saved');
    } catch (error: any) {
      console.error('Error saving Google Calendar settings:', error);
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleSaveCalendarId = async () => {
    const calendarId = calendarInput || selectedCalendar || 'primary';
    setIsSavingCalendar(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert([{ key: 'google_calendar_id', value: calendarId }], { onConflict: 'key' });

      if (error) {
        throw error;
      }
      setSelectedCalendar(calendarId);
      toast.success('Calendar ID saved');
    } catch (error: any) {
      console.error('Error saving calendar ID:', error);
      toast.error(error.message || 'Failed to save calendar ID');
    } finally {
      setIsSavingCalendar(false);
    }
  };

  const loadUpcomingEvents = async () => {
    if (!isAuthenticated) return;
    setIsLoadingUpcoming(true);
    try {
      const events = await googleCalendarService.getEvents(
        selectedCalendar || 'primary',
        drawerStartDate,
        drawerEndDate
      );
      setUpcomingEvents(events);
      setSelectedEventIds(new Set());
    } catch (error: any) {
      console.error('Error loading upcoming events:', error);
      toast.error(error.message || 'Failed to load events');
    } finally {
      setIsLoadingUpcoming(false);
    }
  };

  const toggleEventSelection = (eventId: string, checked: boolean) => {
    setSelectedEventIds(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(eventId);
      } else {
        next.delete(eventId);
      }
      return next;
    });
  };

  const handleImportSelected = async () => {
    if (!selectedProjectId) {
      toast.error('Please select a project');
      return;
    }
    if (selectedEventIds.size === 0) {
      toast.error('Select at least one event to import');
      return;
    }
    setIsImportingSelected(true);
    try {
      const eventsToImport = upcomingEvents.filter(event => selectedEventIds.has(event.id));
      const result = await googleCalendarService.importEvents(eventsToImport, selectedProjectId);
      setSyncResult(result);
      if (result.success && result.errors.length === 0) {
        toast.success(`Imported ${result.imported} event(s)`);
      } else if (result.imported > 0) {
        toast.warning(`Imported ${result.imported} event(s) with errors`);
      } else {
        toast.error('Import failed. Check the results for details.');
      }
    } catch (error: any) {
      console.error('Error importing events:', error);
      toast.error(error.message || 'Failed to import events');
    } finally {
      setIsImportingSelected(false);
    }
  };

  useEffect(() => {
    if (isDrawerOpen && isAuthenticated) {
      loadUpcomingEvents();
    }
  }, [isDrawerOpen, isAuthenticated, selectedCalendar, drawerStartDate, drawerEndDate]);

  // Handle sync
  const handleSync = async () => {
    if (!selectedProjectId) {
      toast.error('Please select a project');
      return;
    }

    setIsSyncing(true);
    setSyncProgress(0);
    setSyncMessage('Starting sync...');
    setSyncResult(null);

    try {
      const result = await googleCalendarService.syncEvents({
        calendarId: selectedCalendar,
        startDate,
        endDate,
        projectId: selectedProjectId,
        onProgress: (current, total, message) => {
          setSyncProgress(current);
          setSyncMessage(message);
        },
      });

      setSyncResult(result);

      if (result.success && result.errors.length === 0) {
        toast.success(
          `Successfully imported ${result.imported} events!${result.skipped > 0 ? ` (${result.skipped} skipped)` : ''}`
        );
      } else if (result.imported > 0) {
        toast.warning(
          `Imported ${result.imported} events with ${result.errors.length} errors`
        );
      } else {
        toast.error('Sync failed. Check the results below for details.');
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error(`Sync failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSyncing(false);
      setSyncProgress(0);
      setSyncMessage('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Google Calendar Sync
          </h1>
          <p className="text-muted-foreground">
            Import your Google Calendar events as time entries
          </p>
        </div>

        {/* Authentication Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Google Calendar Connection
            </CardTitle>
            <CardDescription>
              Connect your Google account to import calendar events
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Google API Settings */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Google API Settings</Label>
                {!isAdmin && <Badge variant="outline">Admin only</Badge>}
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="google-client-id" className="text-xs text-muted-foreground">
                    Client ID
                  </Label>
                  <Input
                    id="google-client-id"
                    placeholder="your-client-id.apps.googleusercontent.com"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    disabled={!isAdmin || !configLoaded}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="google-api-key" className="text-xs text-muted-foreground">
                    API Key
                  </Label>
                  <Input
                    id="google-api-key"
                    placeholder="AIza..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    disabled={!isAdmin || !configLoaded}
                  />
                </div>
              </div>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveConfig}
                  disabled={isSavingConfig || !clientId || !apiKey}
                >
                  {isSavingConfig ? 'Saving...' : 'Save Settings'}
                </Button>
              )}
            </div>
            {/* Calendar Link / ID */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Calendar Link or ID</Label>
              <Input
                placeholder="Paste calendar embed link or calendar ID/email"
                value={calendarInput}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setCalendarInput(nextValue);
                  const parsed = parseCalendarId(nextValue.trim());
                  if (parsed) {
                    setSelectedCalendar(parsed);
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                You can paste an embed link like{" "}
                <span className="font-mono">calendar.google.com/calendar/embed?src=you@example.com</span>
                {" "}or enter the calendar ID/email directly.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveCalendarId}
                disabled={isSavingCalendar || !(calendarInput || selectedCalendar)}
              >
                {isSavingCalendar ? 'Saving...' : 'Save Calendar'}
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={() => setIsDrawerOpen(true)}
              disabled={!isAuthenticated}
              className="w-full sm:w-auto"
            >
              Sync Events
            </Button>
            {authError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Google auth failed</AlertTitle>
                <AlertDescription>{authError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Checklist</Label>
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox checked={!isGoogleConfigMissing} />
                  Google API credentials saved
                </label>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox checked={Boolean(calendarInput || selectedCalendar)} />
                  Calendar link/ID saved
                </label>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox checked={isAuthenticated} />
                  Google account connected
                </label>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox checked={Boolean(selectedProjectId)} />
                  Project selected
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Default Project</Label>
              <SimpleCombobox
                options={projectOptions}
                value={selectedProjectId}
                onValueChange={setSelectedProjectId}
                placeholder="Select a project..."
                searchPlaceholder="Search projects..."
                emptyText="No projects found."
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Imported events will be assigned to this project.
              </p>
            </div>
            {!isAuthenticated ? (
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Before you start</AlertTitle>
                  <AlertDescription>
                    You'll need to grant permission to read your Google Calendar events.
                    This app will only read your calendar data and will not make any changes to your Google Calendar.
                  </AlertDescription>
                </Alert>
                {isGoogleConfigMissing ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Missing Google credentials</AlertTitle>
                    <AlertDescription>
                      {isAdmin
                        ? 'Add the Client ID and API Key above, then click "Save Settings".'
                        : 'Ask an admin to configure Google API credentials.'}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-2">
                    <Button
                      onClick={handleAuthenticate}
                      disabled={isAuthenticating}
                      className="w-full sm:w-auto"
                    >
                      {isAuthenticating ? 'Connecting...' : 'Connect Google Calendar'}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      If no Google login window appears, allow pop-ups for this site and ensure your OAuth
                      settings include this origin.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertTitle className="text-green-900 dark:text-green-100">Connected</AlertTitle>
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    You're connected to Google Calendar. {calendars.length} calendar{calendars.length !== 1 ? 's' : ''} available.
                  </AlertDescription>
                </Alert>
                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  Disconnect
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sync Configuration Card */}
        {isAuthenticated && (
          <Card>
            <CardHeader>
              <CardTitle>Import Settings</CardTitle>
              <CardDescription>
                Configure which events to import and how they should be saved
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Calendar Selection */}
              <div className="space-y-2">
                <Label>Calendar</Label>
                <SimpleCombobox
                  options={calendarOptions}
                  value={selectedCalendar}
                  onValueChange={setSelectedCalendar}
                  placeholder="Select a calendar..."
                  searchPlaceholder="Search calendars..."
                  emptyText="No calendars found."
                  className="w-full"
                />
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? moment(startDate).format('MMM D, YYYY') : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => date && setStartDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? moment(endDate).format('MMM D, YYYY') : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(date) => date && setEndDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Sync Progress */}
              {isSyncing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{syncMessage}</span>
                    <span className="font-medium">{syncProgress}%</span>
                  </div>
                  <Progress value={syncProgress} className="w-full" />
                </div>
              )}

              {/* Sync Button */}
              <Button
                onClick={handleSync}
                disabled={isSyncing || !selectedProjectId}
                className="w-full"
                size="lg"
              >
                {isSyncing ? 'Syncing...' : 'Import Events'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Sync Results Card */}
        {syncResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {syncResult.success && syncResult.errors.length === 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : syncResult.imported > 0 ? (
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                Import Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Events</p>
                  <p className="text-2xl font-bold">{syncResult.events.length}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Imported</p>
                  <p className="text-2xl font-bold text-green-600">{syncResult.imported}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Skipped</p>
                  <p className="text-2xl font-bold text-yellow-600">{syncResult.skipped}</p>
                </div>
              </div>

              {/* Errors */}
              {syncResult.errors.length > 0 && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Errors ({syncResult.errors.length})</AlertTitle>
                  <AlertDescription>
                    <ul className="mt-2 space-y-1 text-sm">
                      {syncResult.errors.slice(0, 5).map((error: string, index: number) => (
                        <li key={index}>• {error}</li>
                      ))}
                      {syncResult.errors.length > 5 && (
                        <li className="text-muted-foreground">
                          ... and {syncResult.errors.length - 5} more errors
                        </li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Success message */}
              {syncResult.success && syncResult.errors.length === 0 && (
                <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertTitle className="text-green-900 dark:text-green-100">Success!</AlertTitle>
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    All events were imported successfully. You can now view them in the Timetable.
                  </AlertDescription>
                </Alert>
              )}

              {/* Link to timetable */}
              <Button
                variant="outline"
                onClick={() => window.location.href = '/timetable'}
                className="w-full"
              >
                View Imported Entries in Timetable
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Upcoming Events Drawer */}
        <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <SheetContent side="right" className="w-full sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>Upcoming Google Calendar Events</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {isLoadingUpcoming
                    ? 'Loading events...'
                    : `${upcomingEvents.length} event${upcomingEvents.length !== 1 ? 's' : ''} found`}
                </div>
                <Button variant="outline" size="sm" onClick={loadUpcomingEvents} disabled={isLoadingUpcoming}>
                  Refresh
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Start date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal", !drawerStartDate && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {drawerStartDate ? moment(drawerStartDate).format('MMM D, YYYY') : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={drawerStartDate}
                        onSelect={(date) => date && setDrawerStartDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">End date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal", !drawerEndDate && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {drawerEndDate ? moment(drawerEndDate).format('MMM D, YYYY') : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={drawerEndDate}
                        onSelect={(date) => date && setDrawerEndDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Search events</Label>
                <Input
                  placeholder="Search by title or description..."
                  value={drawerSearchQuery}
                  onChange={(e) => setDrawerSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={
                      upcomingEvents.filter(e => e.start.dateTime && e.end.dateTime).length > 0 &&
                      selectedEventIds.size === upcomingEvents.filter(e => e.start.dateTime && e.end.dateTime).length
                        ? true
                        : selectedEventIds.size > 0
                          ? 'indeterminate'
                          : false
                    }
                    onCheckedChange={(checked) => {
                      const selectable = upcomingEvents.filter(e => e.start.dateTime && e.end.dateTime);
                      if (checked) {
                        setSelectedEventIds(new Set(selectable.map(e => e.id)));
                      } else {
                        setSelectedEventIds(new Set());
                      }
                    }}
                  />
                  Select all timed events
                </label>
                <div className="text-xs text-muted-foreground">
                  Timed only
                </div>
              </div>

              <div className="max-h-[50vh] overflow-y-auto space-y-2 border rounded-md p-2">
                {isLoadingUpcoming && (
                  <div className="text-sm text-muted-foreground p-2">Loading events…</div>
                )}
                {!isLoadingUpcoming && upcomingEvents.length === 0 && (
                  <div className="text-sm text-muted-foreground p-2">No upcoming events found.</div>
                )}
                {!isLoadingUpcoming && upcomingEvents
                  .filter((event) => {
                    if (!drawerSearchQuery.trim()) return true;
                    const query = drawerSearchQuery.toLowerCase();
                    return (
                      (event.summary || '').toLowerCase().includes(query) ||
                      (event.description || '').toLowerCase().includes(query)
                    );
                  })
                  .map((event) => {
                  const isAllDay = !event.start.dateTime || !event.end.dateTime;
                  const startLabel = event.start.dateTime
                    ? moment(event.start.dateTime).format('MMM D, HH:mm')
                    : moment(event.start.date).format('MMM D');
                  const endLabel = event.end.dateTime
                    ? moment(event.end.dateTime).format('MMM D, HH:mm')
                    : moment(event.end.date).format('MMM D');
                  return (
                    <label key={event.id} className="flex items-start gap-3 rounded-md border p-3 hover:bg-muted/30">
                      <Checkbox
                        checked={selectedEventIds.has(event.id)}
                        onCheckedChange={(checked) => toggleEventSelection(event.id, Boolean(checked))}
                        disabled={isAllDay}
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-foreground">
                          {event.summary || 'Untitled event'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {isAllDay ? 'All day event (skipped)' : `${startLabel} → ${endLabel}`}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Selected: {selectedEventIds.size}
                </div>
                <Button
                  onClick={handleImportSelected}
                  disabled={isImportingSelected || selectedEventIds.size === 0 || !selectedProjectId}
                >
                  {isImportingSelected ? 'Importing...' : 'Import Selected'}
                </Button>
              </div>
              {!selectedProjectId && (
                <p className="text-xs text-muted-foreground">
                  Select a project in “Import Settings” before importing events.
                </p>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>How it works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">1. Connect:</strong> Click the "Connect Google Calendar" button above, then sign in and approve the read-only access prompt from Google.
            </p>
            <p>
              <strong className="text-foreground">2. Configure:</strong> Select which calendar to import from, choose a date range, and pick a default project.
            </p>
            <p>
              <strong className="text-foreground">3. Import:</strong> Click "Import Events" to sync your Google Calendar events as time entries.
            </p>
            <p className="pt-2 border-t">
              <strong className="text-foreground">Note:</strong> Only timed events will be imported (all-day events are skipped). Events that have already been imported will be automatically skipped to avoid duplicates.
            </p>
          </CardContent>
        </Card>
    </div>
  );
};

export const GoogleCalendarSync: React.FC = () => {
  return (
    <Page>
      <GoogleCalendarSettingsPanel />
    </Page>
  );
};

