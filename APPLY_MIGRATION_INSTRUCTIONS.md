# Apply Database Migration - entry_type Column

## Issue
You're getting "Failed to update time entry" because the `entry_type` column doesn't exist in the database yet. The frontend code is trying to save this field, but the database doesn't recognize it.

## Solution
Apply the migration to add the `entry_type` column to the `time_entries` table.

---

## Option 1: Supabase Dashboard (Recommended)

### Steps:

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project: `sonar-admin`

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Or go to: https://supabase.com/dashboard/project/ethrtamtoioydchylepo/sql

3. **Create New Query**
   - Click "+ New query" button

4. **Copy and Paste the Migration SQL**

```sql
-- =====================================================
-- ADD TIME ENTRY TYPE (PLANNED vs REPORTED)
-- Allow distinguishing between planned and actual time entries
-- =====================================================

-- Add entry_type column to time_entries table
ALTER TABLE public.time_entries 
ADD COLUMN entry_type TEXT DEFAULT 'reported' CHECK (entry_type IN ('planned', 'reported'));

-- Add index for better query performance
CREATE INDEX idx_time_entries_entry_type ON public.time_entries(entry_type);

-- Add comment
COMMENT ON COLUMN public.time_entries.entry_type IS 
'Type of time entry: "planned" for future/scheduled work, "reported" for actual logged time';

-- Update existing future entries to be marked as "planned"
-- (entries that start in the future)
UPDATE public.time_entries 
SET entry_type = 'planned' 
WHERE start_time > NOW() AND entry_type = 'reported';
```

5. **Run the Query**
   - Click "Run" or press `Ctrl + Enter` (Windows/Linux) / `Cmd + Enter` (Mac)
   - Wait for confirmation: "Success. No rows returned"

6. **Verify the Column Was Added**

```sql
-- Verify column exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'time_entries' 
  AND column_name = 'entry_type';
```

Expected result:
```
column_name | data_type | column_default
entry_type  | text      | 'reported'::text
```

---

## Option 2: Supabase CLI (If Installed)

If you have Supabase CLI installed:

```bash
# Navigate to project directory
cd c:\code\sonar-admin

# Apply pending migrations
supabase db push

# Or reset database (⚠️ WARNING: This will delete all data)
# supabase db reset
```

---

## Verification Steps

### 1. Check Column Exists
```sql
SELECT * FROM time_entries LIMIT 1;
```

You should see `entry_type` in the columns.

### 2. Check Constraint Works
```sql
-- This should succeed
INSERT INTO time_entries (user_id, project_id, start_time, end_time, duration_minutes, is_billable, entry_type)
VALUES ('test-uuid', 'test-project-uuid', NOW(), NOW() + INTERVAL '1 hour', 60, true, 'reported');

-- This should fail (invalid entry_type)
INSERT INTO time_entries (user_id, project_id, start_time, end_time, duration_minutes, is_billable, entry_type)
VALUES ('test-uuid', 'test-project-uuid', NOW(), NOW() + INTERVAL '1 hour', 60, true, 'invalid');
```

### 3. Check Index Exists
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'time_entries' 
  AND indexname = 'idx_time_entries_entry_type';
```

Expected result:
```
indexname                    | indexdef
idx_time_entries_entry_type  | CREATE INDEX idx_time_entries_entry_type ON public.time_entries USING btree (entry_type)
```

---

## After Migration

### 1. Hard Refresh Your Browser
```
Windows/Linux: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

### 2. Test the Feature

**Create Reported Entry:**
1. Click on a past time slot
2. Modal opens with "Reported" tab active
3. Select project, add description
4. Click "Create Entry"
5. ✅ Should save successfully

**Create Planned Entry:**
1. Click on a future time slot
2. Modal opens with "Planned" tab active
3. Select project, add description
4. Click "Create Entry"
5. ✅ Should save successfully

**Edit Entry and Change Type:**
1. Click on existing entry
2. Edit modal opens
3. Switch between "Reported" and "Planned" tabs
4. Click "Update"
5. ✅ Should update successfully (this was failing before)

---

## Troubleshooting

### Error: "column entry_type already exists"
**Solution:** The column is already there. Skip the ALTER TABLE and run only the index creation:
```sql
CREATE INDEX IF NOT EXISTS idx_time_entries_entry_type 
ON public.time_entries(entry_type);
```

### Error: "permission denied for table time_entries"
**Solution:** Make sure you're logged into Supabase Dashboard as the project owner.

### Error: Still getting "Failed to update time entry"
**Solutions:**
1. Check browser console (F12) for detailed error message
2. Verify column exists: `SELECT * FROM time_entries LIMIT 1;`
3. Hard refresh browser to clear cached code
4. Check RLS policies aren't blocking the update

### Error: "check constraint is violated"
**Cause:** Trying to set entry_type to something other than 'planned' or 'reported'
**Solution:** Ensure your code only uses these two values

---

## What This Migration Does

1. **Adds `entry_type` column**
   - Type: TEXT
   - Default: 'reported'
   - Only allows: 'planned' or 'reported'

2. **Creates index**
   - Improves query performance
   - Useful for filtering by type

3. **Adds comment**
   - Documents the column purpose
   - Visible in database tools

4. **Updates existing data**
   - Future entries → 'planned'
   - Past/current entries → 'reported'

---

## Impact

- ✅ **Zero downtime** - Migration is non-blocking
- ✅ **Backward compatible** - Existing queries still work
- ✅ **Default value** - New entries automatically get 'reported'
- ✅ **Safe** - Constraint prevents invalid values

---

## Quick Copy-Paste

Here's the entire migration in one block:

```sql
ALTER TABLE public.time_entries ADD COLUMN entry_type TEXT DEFAULT 'reported' CHECK (entry_type IN ('planned', 'reported'));
CREATE INDEX idx_time_entries_entry_type ON public.time_entries(entry_type);
COMMENT ON COLUMN public.time_entries.entry_type IS 'Type of time entry: "planned" for future/scheduled work, "reported" for actual logged time';
UPDATE public.time_entries SET entry_type = 'planned' WHERE start_time > NOW() AND entry_type = 'reported';
```

Copy this, paste in Supabase SQL Editor, and click Run!

---

## Support

If you encounter any issues:
1. Check the browser console (F12) for detailed errors
2. Verify you're connected to the correct Supabase project
3. Ensure you have permission to modify the database schema
4. Try refreshing the Supabase Dashboard

---

That's it! Once the migration is applied, your time entry updates should work perfectly! 🎉

