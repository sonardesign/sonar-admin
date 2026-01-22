# Google Calendar Integration Setup

This guide will help you set up Google Calendar synchronization for your time tracking app.

## Prerequisites

- A Google account
- Access to [Google Cloud Console](https://console.cloud.google.com/)

## Step-by-Step Setup

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter a project name (e.g., "Sonar Admin Time Tracker")
5. Click "Create"

### 2. Enable Google Calendar API

1. In the Google Cloud Console, navigate to "APIs & Services" > "Library"
2. Search for "Google Calendar API"
3. Click on it and press "Enable"

### 3. Create OAuth 2.0 Credentials

1. Navigate to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - User Type: External (for testing) or Internal (if using Google Workspace)
   - Fill in the required fields:
     - App name: Your app name
     - User support email: Your email
     - Developer contact: Your email
   - Add scopes: `https://www.googleapis.com/auth/calendar.readonly`
   - Add test users (if External): Add your email and any test users
   - Click "Save and Continue"

4. Back to "Create OAuth client ID":
   - Application type: **Web application**
   - Name: "Sonar Admin Web Client"
   - Authorized JavaScript origins:
     - `http://localhost:5173` (for development)
     - Your production domain (e.g., `https://yourdomain.com`)
   - Authorized redirect URIs:
     - `http://localhost:5173` (for development)
     - Your production domain (e.g., `https://yourdomain.com`)
   - Click "Create"

5. Copy the **Client ID** that appears

### 4. Create an API Key

1. In "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API key"
3. Copy the API key
4. (Optional but recommended) Click "Restrict Key":
   - API restrictions: Select "Restrict key"
   - Check "Google Calendar API"
   - HTTP referrers: Add your domains
   - Click "Save"

### 5. Add Environment Variables

Add these environment variables to your `.env` file:

```bash
# Google Calendar API Configuration
VITE_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=your-api-key-here
```

Replace `your-client-id-here` and `your-api-key-here` with the actual values from steps 3 and 4.

### 6. Restart Your Development Server

If your dev server is running, restart it to pick up the new environment variables:

```bash
npm run dev
```

### 7. Run the Database Migration

Apply the migration to add Google Calendar fields to your database:

```bash
# If using Supabase CLI
supabase db push

# Or run the migration manually in Supabase Dashboard
# SQL Editor > New Query > Paste contents of:
# supabase/migrations/028_add_google_calendar_fields.sql
```

### 8. Test the Integration

1. Navigate to the Google Calendar Sync page in your app
2. Click "Connect Google Calendar"
3. Sign in with your Google account
4. Grant the requested permissions
5. Select a calendar, date range, and project
6. Click "Import Events"

## Features

### What Gets Imported

- ✅ Timed calendar events within the selected date range
- ✅ Event title as the time entry description
- ✅ Event start/end times converted to time entry duration
- ✅ Link back to the original Google Calendar event

### What Gets Skipped

- ❌ All-day events (no specific time)
- ❌ Events with zero or negative duration
- ❌ Events that have already been imported (duplicate detection)

### How Duplicates Are Detected

Each imported event is tagged with its Google Calendar Event ID. If you try to import the same event again, it will be automatically skipped.

## Troubleshooting

### "Failed to authenticate" Error

- Make sure your Client ID and API Key are correct
- Check that your domain is in the authorized JavaScript origins
- Clear your browser cache and try again

### "Not authenticated with Supabase" Error

- Make sure you're logged into the app
- Check your Supabase connection

### Events Not Showing in Timetable

- Check that the events have specific start and end times (not all-day events)
- Verify the events are within your selected date range
- Check the console for any error messages

### OAuth Consent Screen Verification

If you're using "External" user type, your app will be in testing mode and limited to 100 users. To make it public:
1. Go to "OAuth consent screen"
2. Click "Publish App"
3. Submit for verification (required for production use)

## Security Notes

- The app requests **read-only** access to your Google Calendar
- The app cannot create, modify, or delete calendar events
- Your Google Calendar data is only accessed when you explicitly trigger a sync
- Access tokens are stored in memory and cleared when you sign out
- All imported data is stored in your Supabase database

## Additional Resources

- [Google Calendar API Documentation](https://developers.google.com/calendar/api/guides/overview)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Documentation](https://supabase.com/docs)

