# Project Delete Issue - Complete Fix

## Problem
Projects appear to be deleted (count goes from 21 → 20), but after refreshing the page, they're back. This indicates the database delete is being blocked by RLS policies, but no error is shown.

## Root Cause
The RLS (Row Level Security) policy on the `projects` table only allows deletion if:
1. You are an admin, OR
2. You are the project creator

However, when the policy blocks the delete, Supabase returns no error - it just silently doesn't delete anything.

## Solution Applied

### Frontend Changes

#### 1. Improved Delete Detection (`src/hooks/useProjectsData.ts`)
- Added `{ count: 'exact' }` to the delete query to get the number of deleted rows
- Check if `count === 0` (meaning delete was blocked)
- Throw explicit error when delete is blocked by RLS

**New behavior:**
```javascript
const { error, count } = await supabase
  .from('projects')
  .delete({ count: 'exact' })
  .eq('id', id)

if (count === 0) {
  throw new Error('Permission denied: You can only delete projects you created')
}
```

#### 2. Better Error Messages (`src/pages/Projects.tsx`)
- Show user-friendly permission error messages
- Distinguish between RLS blocks and other errors

### Database Migration Required

**File:** `supabase/migrations/022_fix_project_delete_rls.sql`

This migration:
1. Drops the old combined delete policy
2. Creates two separate, clearer policies:
   - Admins can delete ANY project
   - Users can delete their OWN projects
3. Ensures the `is_admin()` function is correct

## How to Apply the Fix

### Step 1: Apply Database Migration

**Option 1: Supabase Dashboard (Recommended)**

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste this SQL:

```sql
-- Fix Project Delete RLS Policy
DROP POLICY IF EXISTS "Project owners can delete projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can delete projects" ON public.projects;

-- Policy 1: Admins can delete any project
CREATE POLICY "Admins can delete any project" ON public.projects
    FOR DELETE 
    USING (public.is_admin());

-- Policy 2: Users can delete projects they created
CREATE POLICY "Users can delete own projects" ON public.projects
    FOR DELETE 
    USING (created_by = auth.uid());

-- Verify the is_admin function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

5. Click **Run** or press `Ctrl+Enter`

**Option 2: Using psql**
```bash
psql [your-database-url] -f supabase/migrations/022_fix_project_delete_rls.sql
```

### Step 2: Test the Fix

1. **Refresh your browser** to load the updated code
2. **Open browser console** (F12)
3. **Try to delete a project**
4. **Check the console logs:**

**If you're an admin and delete succeeds:**
```
🗑️ Deleting project: [id]
📋 Project to delete: {...}
📊 Delete count: 1
✅ Project deleted from database
📊 Projects count after delete: 21 -> 20
```

**If delete is blocked by RLS:**
```
🗑️ Deleting project: [id]
📋 Project to delete: {...}
📊 Delete count: 0
❌ Delete blocked - no rows deleted (likely RLS policy)
💥 Error deleting project: Permission denied: You can only delete projects you created
```

5. **Refresh the page** - The project should now stay deleted!

## Diagnostic Queries

If issues persist, run these in Supabase SQL Editor:

```sql
-- 1. Check current delete policies on projects
SELECT 
    policyname,
    permissive,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'projects'
  AND cmd = 'DELETE';

-- 2. Check if you're an admin
SELECT 
    id,
    full_name,
    role,
    public.is_admin() as is_admin
FROM public.profiles
WHERE id = auth.uid();

-- 3. Check project ownership
SELECT 
    p.id,
    p.name,
    p.created_by,
    p.created_by = auth.uid() as i_own_this,
    prof.full_name as creator_name
FROM public.projects p
LEFT JOIN public.profiles prof ON prof.id = p.created_by
WHERE p.id = 'project-id-here'; -- Replace with actual project ID

-- 4. Test delete permission without actually deleting
EXPLAIN (VERBOSE, COSTS OFF)
DELETE FROM public.projects
WHERE id = 'project-id-here'; -- Replace with actual project ID
```

## Why This Happened

The original RLS policy used:
```sql
FOR DELETE USING (public.is_admin() OR created_by = auth.uid())
```

This policy is correct, BUT:
- If the `is_admin()` function returns false (due to role mismatch, timing, or caching)
- AND you're not the creator
- The delete is silently blocked with no error

The fix:
1. **Splits into two policies** for clarity and better debugging
2. **Adds delete count checking** to detect when deletes are blocked
3. **Shows proper error messages** to the user

## Verification Checklist

After applying the fix:
- [ ] Database migration applied successfully
- [ ] Browser refreshed with new code
- [ ] Delete count is logged in console
- [ ] Error message shown if delete is blocked
- [ ] Projects stay deleted after page refresh
- [ ] Admins can delete any project
- [ ] Users can delete their own projects only

