# Google Calendar Integration - User Guide

## Overview

The Google Calendar integration allows you to import events from your Google Calendar as time entries into the time tracking system. This is useful for:

- Migrating historical data from Google Calendar
- Importing meeting times as billable/non-billable hours
- Syncing scheduled work blocks into your time tracking system

## Accessing the Feature

Navigate to **Google Calendar** in the sidebar under the **Tracking** group.

## Quick Start

### 1. Connect Your Google Account

1. Click the "Connect Google Calendar" button
2. Sign in with your Google account
3. Grant read-only access to your calendars
4. You'll be redirected back to the app

### 2. Configure Import Settings

**Calendar Selection:**
- Choose which calendar to import from
- By default, "primary" (your main calendar) is selected
- You can select any calendar you have access to

**Date Range:**
- Set the start and end dates for the import
- Only events within this range will be imported
- Default: Last 30 days to today

**Default Project:**
- Select which project the imported time entries should be assigned to
- This is required - you must select a project before importing
- All imported events will be assigned to this project

### 3. Import Events

1. Click "Import Events" button
2. Watch the progress bar as events are processed
3. Review the results summary:
   - **Total Events**: How many events were found
   - **Imported**: Successfully imported as time entries
   - **Skipped**: Events that were skipped (already imported or all-day events)
   - **Errors**: Any errors that occurred during import

### 4. View Imported Entries

Click "View Imported Entries in Timetable" to see your newly imported time entries on the timetable page.

## Important Notes

### What Gets Imported

✅ **Timed events only**: Events with specific start and end times
✅ **Event title**: Becomes the time entry description
✅ **Duration**: Calculated from start/end times
✅ **Link**: Direct link back to the Google Calendar event

### What Gets Skipped

❌ **All-day events**: Events without specific times
❌ **Zero-duration events**: Events with the same start and end time
❌ **Duplicates**: Events that have already been imported

### Duplicate Detection

Each imported event is tagged with its unique Google Calendar Event ID. If you try to import the same event again (even with different date ranges), it will be automatically skipped.

This means you can:
- Run multiple imports without creating duplicates
- Safely re-import overlapping date ranges
- Import additional events by extending your date range

## Managing Imported Entries

### Editing Imported Entries

Imported time entries can be edited like any other time entry:
1. Go to the Timetable page
2. Click on the imported entry
3. Edit the project, description, duration, etc.
4. Changes only affect your time tracking database, not Google Calendar

### Viewing Original Event

Imported entries include a link back to the original Google Calendar event (stored in the database but not currently displayed in the UI).

### Billable Status

All imported events are marked as **non-billable** by default. You can:
- Edit individual entries to mark them as billable
- Bulk update entries in the database if needed

## Troubleshooting

### "Please select a project" Error

You must select a default project before importing. All events will be assigned to this project.

### No Events Imported

Check if:
- Your selected date range includes events
- Events have specific start/end times (not all-day)
- Events haven't already been imported

### Authentication Issues

If you see "Failed to authenticate":
1. Make sure the Google Calendar API is properly configured
2. Check that environment variables are set
3. Try signing out and signing in again
4. Clear browser cache and cookies

### Partial Import

If some events imported but others didn't:
- Check the error messages in the results section
- Common issues:
  - Invalid date/time formats
  - Events in the future marked as "reported" type
  - Database connection issues

## Privacy & Security

- **Read-only access**: The app can only read your calendar, never modify it
- **No automatic sync**: Events are only imported when you click "Import"
- **Local storage**: Access tokens are stored in browser memory only
- **Sign out**: Click "Disconnect" to revoke access at any time

## Tips & Best Practices

1. **Start with a small date range** to test the import
2. **Review imported entries** before marking them as billable
3. **Use specific date ranges** rather than importing everything at once
4. **Select the right calendar** if you have multiple calendars
5. **Create project categories** beforehand for better organization

## Future Enhancements

Potential future features (not yet implemented):
- Automatic recurring sync
- Smart project mapping based on event titles/descriptions
- Billable/non-billable detection based on calendar or event properties
- Two-way sync (updating Google Calendar from time entries)
- Multiple calendar import in one go
- Custom field mapping

## Support

For issues or questions:
1. Check the error messages in the import results
2. Review the setup guide (GOOGLE_CALENDAR_SETUP.md)
3. Check browser console for detailed error logs
4. Ensure all environment variables are configured correctly

