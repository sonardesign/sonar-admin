# Database Migrations Required

You need to apply the following migrations to fix the Gantt chart errors:

## Migration 1: Add `entry_type` column to time_entries

**File:** `supabase/migrations/010_add_time_entry_type.sql`

This migration adds the `entry_type` column to distinguish between 'planned' and 'reported' time entries.

### SQL to Run:

```sql
-- Add entry_type column to time_entries
ALTER TABLE public.time_entries 
ADD COLUMN IF NOT EXISTS entry_type TEXT DEFAULT 'reported' CHECK (entry_type IN ('planned', 'reported'));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_time_entries_entry_type ON public.time_entries(entry_type);

-- Add comment
COMMENT ON COLUMN public.time_entries.entry_type IS 
'Type of time entry: "planned" for future/scheduled work, "reported" for actual logged time';

-- Update existing future entries to be marked as planned
UPDATE public.time_entries 
SET entry_type = 'planned' 
WHERE start_time > NOW() AND entry_type = 'reported';
```

## How to Apply:

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy the SQL above
4. Paste into the editor
5. Click **Run**

### Option 2: If using Supabase CLI

```bash
supabase db push
```

## After Applying:

1. Refresh your browser
2. The Gantt chart should now load without errors
3. The Forecast page planned entries will work correctly

## Note:

This migration is safe to run multiple times (uses `IF NOT EXISTS` and `IF NOT EXISTS` clauses).

