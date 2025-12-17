# Apply Both Migrations to Fix Time Entry Updates

## Issue
After switching a time entry from "planned" to "reported" and trying to save, you get:
```
"Error loading timetable data"
"Failed to update time entry"
```

## Root Causes

### 1. Missing Database Column
The `entry_type` column doesn't exist in the database yet.

### 2. Restrictive RLS Policy
Even if the column exists, the RLS policy only allows users to update their own entries. Admins and managers can't update entries for other users.

---

## Solution: Apply BOTH Migrations

You need to run **two** migrations in sequence:

---

## STEP 1: Add the `entry_type` Column

### SQL to Run:
```sql
-- Add entry_type column to time_entries table
ALTER TABLE public.time_entries 
ADD COLUMN IF NOT EXISTS entry_type TEXT DEFAULT 'reported' 
CHECK (entry_type IN ('planned', 'reported'));

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_time_entries_entry_type 
ON public.time_entries(entry_type);

-- Add comment
COMMENT ON COLUMN public.time_entries.entry_type IS 
'Type of time entry: "planned" for future/scheduled work, "reported" for actual logged time';

-- Update existing future entries to be marked as "planned"
UPDATE public.time_entries 
SET entry_type = 'planned' 
WHERE start_time > NOW() 
  AND (entry_type IS NULL OR entry_type = 'reported');
```

---

## STEP 2: Fix RLS Update Policies

### SQL to Run:
```sql
-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can update own time entries" ON public.time_entries;

-- Recreate with support for users updating their own entries
CREATE POLICY "Users can update own time entries" ON public.time_entries
    FOR UPDATE USING (
        user_id = auth.uid()
    );

-- Drop old manager policies if they exist
DROP POLICY IF EXISTS "Managers can update project time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Managers can update assigned project time entries" ON public.time_entries;

-- Admins can update any time entry
CREATE POLICY "Admins can update any time entry" ON public.time_entries
    FOR UPDATE USING (
        public.is_admin()
    );

-- Managers can update time entries for projects they manage
CREATE POLICY "Managers can update project time entries" ON public.time_entries
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = time_entries.project_id 
            AND pm.user_id = auth.uid() 
            AND pm.role IN ('owner', 'manager')
        )
    );
```

---

## Quick Copy-Paste: Run Everything Together

Open Supabase Dashboard SQL Editor and paste this:

```sql
-- =====================================================
-- MIGRATION 1: Add entry_type column
-- =====================================================
ALTER TABLE public.time_entries 
ADD COLUMN IF NOT EXISTS entry_type TEXT DEFAULT 'reported' 
CHECK (entry_type IN ('planned', 'reported'));

CREATE INDEX IF NOT EXISTS idx_time_entries_entry_type 
ON public.time_entries(entry_type);

COMMENT ON COLUMN public.time_entries.entry_type IS 
'Type of time entry: "planned" for future/scheduled work, "reported" for actual logged time';

UPDATE public.time_entries 
SET entry_type = 'planned' 
WHERE start_time > NOW() 
  AND (entry_type IS NULL OR entry_type = 'reported');

-- =====================================================
-- MIGRATION 2: Fix RLS UPDATE policies
-- =====================================================
DROP POLICY IF EXISTS "Users can update own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Managers can update project time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Managers can update assigned project time entries" ON public.time_entries;

CREATE POLICY "Users can update own time entries" ON public.time_entries
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can update any time entry" ON public.time_entries
    FOR UPDATE USING (public.is_admin());

CREATE POLICY "Managers can update project time entries" ON public.time_entries
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = time_entries.project_id 
            AND pm.user_id = auth.uid() 
            AND pm.role IN ('owner', 'manager')
        )
    );

COMMENT ON POLICY "Users can update own time entries" ON public.time_entries IS 
'Allows users to update their own time entries';

COMMENT ON POLICY "Admins can update any time entry" ON public.time_entries IS 
'Allows administrators to update any time entry (needed for workload planning and corrections)';

COMMENT ON POLICY "Managers can update project time entries" ON public.time_entries IS 
'Allows project managers to update time entries for their assigned projects';
```

---

## How to Apply

### 1. Open Supabase Dashboard
- Go to: https://supabase.com/dashboard/project/ethrtamtoioydchylepo/sql
- Or: Dashboard → SQL Editor

### 2. Paste the SQL Above
- Create a new query
- Paste the entire block

### 3. Run the Query
- Click "Run" button
- Or press `Ctrl + Enter` (Windows/Linux) / `Cmd + Enter` (Mac)

### 4. Verify Success
You should see:
```
Success. No rows returned
```

---

## Verification

### Check Column Exists
```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'time_entries' 
  AND column_name = 'entry_type';
```

Expected: One row showing `entry_type`, `text`, `'reported'::text`

### Check Policies Exist
```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'time_entries' 
  AND cmd = 'UPDATE'
ORDER BY policyname;
```

Expected: Three policies:
1. `Admins can update any time entry`
2. `Managers can update project time entries`
3. `Users can update own time entries`

### Test Update
```sql
-- Get a time entry ID (replace with actual ID from your data)
SELECT id, user_id, entry_type FROM time_entries LIMIT 1;

-- Try updating it (replace 'your-entry-id-here' with actual ID)
UPDATE time_entries 
SET entry_type = 'reported' 
WHERE id = 'your-entry-id-here';
```

Should succeed without errors!

---

## After Running Migrations

### 1. Hard Refresh Browser
```
Windows/Linux: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

### 2. Test the Feature

**As Admin:**
1. Click on another user's time entry
2. Switch between "Reported" and "Planned" tabs
3. Click "Update"
4. ✅ Should work now!

**As Manager:**
1. Click on time entry for your managed project
2. Switch tabs
3. Click "Update"
4. ✅ Should work!

**As Regular User:**
1. Click on your own time entry
2. Switch tabs
3. Click "Update"
4. ✅ Should work!

---

## What Was Fixed

### Before:
```
Admin tries to update another user's entry
  ↓
RLS Policy: "user_id = auth.uid()"
  ↓
❌ DENIED (admin's ID ≠ entry's user_id)
  ↓
"Failed to update time entry"
```

### After:
```
Admin tries to update another user's entry
  ↓
RLS Policy 1: "user_id = auth.uid()" → ❌ No
RLS Policy 2: "is_admin()" → ✅ YES!
  ↓
✅ UPDATE ALLOWED
  ↓
Success!
```

---

## Security Maintained

- ✅ **Regular users** can only update their own entries
- ✅ **Managers** can update entries for their managed projects only
- ✅ **Admins** can update any entry (as intended by design)
- ✅ Database-level security (can't be bypassed)

---

## Troubleshooting

### Still getting "Failed to update"?
1. Check browser console (F12) for detailed error
2. Verify both migrations ran successfully
3. Check if you're logged in as the correct user
4. Try hard refresh again
5. Check RLS is enabled: `SELECT * FROM pg_tables WHERE tablename = 'time_entries';`

### Error: "column entry_type already exists"?
- Good! That means migration 1 already ran
- Just run migration 2 (the RLS policy updates)

### Error: "policy already exists"?
- Use `DROP POLICY IF EXISTS` (which is already in the script)
- Or skip policy creation if it's already there

---

## Quick Checklist

- [ ] Opened Supabase Dashboard SQL Editor
- [ ] Pasted the combined SQL script
- [ ] Clicked "Run"
- [ ] Saw "Success" message
- [ ] Verified column exists
- [ ] Verified policies exist
- [ ] Hard refreshed browser
- [ ] Tested updating time entry
- [ ] ✅ Works!

---

That's it! Both issues should now be resolved! 🎉

