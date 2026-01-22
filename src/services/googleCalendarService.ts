import { supabase } from '../lib/supabase';

// Google Calendar API configuration (can be overridden at runtime)
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  status: string;
  htmlLink: string;
  created: string;
  updated: string;
  creator?: {
    email?: string;
    displayName?: string;
  };
  organizer?: {
    email?: string;
    displayName?: string;
  };
}

interface SyncOptions {
  calendarId?: string;
  startDate: Date;
  endDate: Date;
  projectId?: string; // Default project for unmapped events
  onProgress?: (current: number, total: number, message: string) => void;
}

interface SyncResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
  events: GoogleCalendarEvent[];
}

class GoogleCalendarService {
  private tokenClient: any = null;
  private accessToken: string | null = null;
  private gapiInitialized = false;
  private gisInitialized = false;
  private clientId: string | null = GOOGLE_CLIENT_ID || null;
  private apiKey: string | null = GOOGLE_API_KEY || null;

  setConfig(config: { clientId?: string | null; apiKey?: string | null }) {
    if (typeof config.clientId !== 'undefined') {
      this.clientId = config.clientId;
    }
    if (typeof config.apiKey !== 'undefined') {
      this.apiKey = config.apiKey;
    }
  }

  /**
   * Initialize the Google API client
   */
  async initialize(): Promise<void> {
    if (!this.clientId || !this.apiKey) {
      throw new Error('Missing Google Calendar config. Add a Client ID and API Key in Google Calendar settings or set VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_API_KEY.');
    }
    if (this.gapiInitialized && this.gisInitialized) {
      return;
    }

    return new Promise((resolve, reject) => {
      // Load gapi script
      const gapiScript = document.createElement('script');
      gapiScript.src = 'https://apis.google.com/js/api.js';
      gapiScript.async = true;
      gapiScript.defer = true;
      gapiScript.onload = () => {
        (window as any).gapi.load('client', async () => {
          try {
            await (window as any).gapi.client.init({
              apiKey: this.apiKey,
              discoveryDocs: [DISCOVERY_DOC],
            });
            this.gapiInitialized = true;
            
            // Load GIS script
            const gisScript = document.createElement('script');
            gisScript.src = 'https://accounts.google.com/gsi/client';
            gisScript.async = true;
            gisScript.defer = true;
            gisScript.onload = () => {
              this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
                client_id: this.clientId,
                scope: SCOPES,
                callback: '', // Will be set during authentication
              });
              this.gisInitialized = true;
              resolve();
            };
            gisScript.onerror = () => reject(new Error('Failed to load Google Identity Services'));
            document.body.appendChild(gisScript);
          } catch (error) {
            reject(error);
          }
        });
      };
      gapiScript.onerror = () => reject(new Error('Failed to load Google API'));
      document.body.appendChild(gapiScript);
    });
  }

  /**
   * Authenticate with Google and get access token
   */
  async authenticate(): Promise<boolean> {
    await this.initialize();

    return new Promise((resolve, reject) => {
      try {
        if (!this.tokenClient) {
          reject(new Error('Google Identity Services not initialized. Check network access and client ID.'));
          return;
        }
        let didRespond = false;
        const timeout = setTimeout(() => {
          if (!didRespond) {
            reject(new Error('No response from Google auth. The popup may be blocked or the OAuth origin is not allowed.'));
          }
        }, 8000);
        this.tokenClient.callback = (response: any) => {
          didRespond = true;
          clearTimeout(timeout);
          if (response.error !== undefined) {
            reject(response);
            return;
          }
          this.accessToken = response.access_token;
          resolve(true);
        };

        // Request an access token
        if (this.accessToken === null) {
          this.tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
          this.tokenClient.requestAccessToken({ prompt: '' });
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Sign out from Google
   */
  signOut(): void {
    if (this.accessToken) {
      (window as any).google.accounts.oauth2.revoke(this.accessToken, () => {
        console.log('Access token revoked');
      });
      this.accessToken = null;
    }
  }

  /**
   * Get list of user's calendars
   */
  async getCalendars(): Promise<any[]> {
    if (!this.accessToken) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    try {
      const response = await (window as any).gapi.client.calendar.calendarList.list();
      return response.result.items || [];
    } catch (error) {
      console.error('Error fetching calendars:', error);
      throw error;
    }
  }

  /**
   * Get events from a specific calendar within a date range
   */
  async getEvents(
    calendarId: string = 'primary',
    startDate: Date,
    endDate: Date
  ): Promise<GoogleCalendarEvent[]> {
    if (!this.accessToken) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    try {
      const response = await (window as any).gapi.client.calendar.events.list({
        calendarId: calendarId,
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        showDeleted: false,
        singleEvents: true,
        maxResults: 2500,
        orderBy: 'startTime',
      });

      return response.result.items || [];
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      throw error;
    }
  }

  /**
   * Convert Google Calendar event to time entry format
   */
  private convertEventToTimeEntry(
    event: GoogleCalendarEvent,
    userId: string,
    projectId: string
  ): any {
    // Skip all-day events
    if (!event.start.dateTime || !event.end.dateTime) {
      return null;
    }

    const startTime = new Date(event.start.dateTime);
    const endTime = new Date(event.end.dateTime);
    const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

    // Skip events with no duration or negative duration
    if (durationMinutes <= 0) {
      return null;
    }

    return {
      user_id: userId,
      project_id: projectId,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      duration_minutes: durationMinutes,
      description: event.summary || 'Imported from Google Calendar',
      is_billable: false, // Default to non-billable, can be changed later
      entry_type: startTime > new Date() ? 'planned' : 'reported',
      google_calendar_event_id: event.id,
      google_calendar_link: event.htmlLink,
    };
  }

  /**
   * Check if an event already exists in Supabase
   */
  private async eventExists(eventId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('id')
        .eq('google_calendar_event_id', eventId)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking if event exists:', error);
      return false;
    }
  }

  /**
   * Import selected events into Supabase
   */
  async importEvents(events: GoogleCalendarEvent[], projectId: string): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      imported: 0,
      skipped: 0,
      errors: [],
      events,
    };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated with Supabase');
      }

      for (const event of events) {
        try {
          const exists = await this.eventExists(event.id, user.id);
          if (exists) {
            result.skipped++;
            continue;
          }

          const timeEntry = this.convertEventToTimeEntry(event, user.id, projectId);
          if (!timeEntry) {
            result.skipped++;
            continue;
          }

          const { error } = await supabase
            .from('time_entries')
            .insert([timeEntry]);

          if (error) {
            result.errors.push(`Failed to import \"${event.summary}\": ${error.message}`);
          } else {
            result.imported++;
          }
        } catch (error: any) {
          result.errors.push(`Error processing \"${event.summary}\": ${error.message}`);
        }
      }

      result.success = result.errors.length === 0;
      return result;
    } catch (error: any) {
      result.errors.push(error.message);
      return result;
    }
  }

  /**
   * Sync Google Calendar events to Supabase
   */
  async syncEvents(options: SyncOptions): Promise<SyncResult> {
    const {
      calendarId = 'primary',
      startDate,
      endDate,
      projectId,
      onProgress,
    } = options;

    if (!projectId) {
      throw new Error('Project ID is required for syncing events');
    }

    const result: SyncResult = {
      success: false,
      imported: 0,
      skipped: 0,
      errors: [],
      events: [],
    };

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated with Supabase');
      }

      // Fetch events from Google Calendar
      onProgress?.(0, 100, 'Fetching events from Google Calendar...');
      const events = await this.getEvents(calendarId, startDate, endDate);
      result.events = events;

      if (events.length === 0) {
        onProgress?.(100, 100, 'No events found in the selected date range');
        result.success = true;
        return result;
      }

      onProgress?.(20, 100, `Found ${events.length} events. Processing...`);

      // Process each event
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const progress = 20 + Math.round((i / events.length) * 70);
        onProgress?.(progress, 100, `Processing event ${i + 1}/${events.length}: ${event.summary}`);

        try {
          // Check if event already exists
          const exists = await this.eventExists(event.id, user.id);
          if (exists) {
            result.skipped++;
            continue;
          }

          // Convert to time entry format
          const timeEntry = this.convertEventToTimeEntry(event, user.id, projectId);
          
          // Skip all-day events or invalid events
          if (!timeEntry) {
            result.skipped++;
            continue;
          }

          // Insert into Supabase
          const { error } = await supabase
            .from('time_entries')
            .insert([timeEntry]);

          if (error) {
            result.errors.push(`Failed to import "${event.summary}": ${error.message}`);
          } else {
            result.imported++;
          }
        } catch (error: any) {
          result.errors.push(`Error processing "${event.summary}": ${error.message}`);
        }
      }

      onProgress?.(100, 100, `Sync complete! Imported: ${result.imported}, Skipped: ${result.skipped}`);
      result.success = result.errors.length === 0;
      return result;
    } catch (error: any) {
      result.errors.push(error.message);
      return result;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.accessToken !== null;
  }
}

// Export singleton instance
export const googleCalendarService = new GoogleCalendarService();

