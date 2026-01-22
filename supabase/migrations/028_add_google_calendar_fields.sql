-- Add Google Calendar integration fields to time_entries table
ALTER TABLE time_entries
ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT,
ADD COLUMN IF NOT EXISTS google_calendar_link TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_time_entries_google_calendar_event_id 
ON time_entries(google_calendar_event_id) 
WHERE google_calendar_event_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN time_entries.google_calendar_event_id IS 'Google Calendar event ID for synced events';
COMMENT ON COLUMN time_entries.google_calendar_link IS 'Direct link to the Google Calendar event';

