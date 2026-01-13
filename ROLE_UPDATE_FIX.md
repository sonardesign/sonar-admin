# Role Update Issue - Complete Fix Guide

## Problem
When updating a user's role from Manager to Admin (or any role change), the change doesn't persist after page refresh. The role reverts to its original value.

## Root Causes Identified

### 1. Database Constraint Issue
The `project_manager_permissions` table has a constraint that only allows users with the 'manager' role. When changing a manager to admin, this constraint causes the update to fail.

### 2. Frontend Refresh Timing
The frontend was refreshing the user list, but the Select component might be reverting before the refresh completes.

## Solutions Applied

### Frontend Changes (`src/pages/Settings.tsx`)

#### 1. Added Loading State
```typescript
const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
```

#### 2. Improved Error Handling
- Added `.select()` to the update query to get the updated data back
- Added detailed console logging to track the update process
- Made the refresh operation `await` to ensure it completes
- Added loading state to prevent multiple simultaneous updates

#### 3. Disabled Select During Update
```typescript
<Select
  value={user.role}
  disabled={updatingUserId === user.id}
  onValueChange={(value) => handleUpdateRole(user.id, value, user.full_name)}
>
```

### Database Migration Required

**File:** `supabase/migrations/021_fix_role_update_constraint.sql`

This migration:
1. Drops the old constraint that only allowed 'manager' role
2. Creates a validation trigger that allows both 'manager' and 'admin' roles
3. Enables smooth role transitions

#### How to Apply the Migration

**Option 1: Supabase Dashboard (Recommended)**

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the following SQL:

```sql
-- Fix Role Update Constraint
-- Drop the old constraint that prevents role changes
ALTER TABLE public.project_manager_permissions 
DROP CONSTRAINT IF EXISTS manager_must_be_manager_role;

-- Create a function to validate manager/admin role
CREATE OR REPLACE FUNCTION validate_project_permission_role()
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Get the role of the user being assigned permission
    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = NEW.manager_id;
    
    -- Only allow manager or admin roles
    IF user_role NOT IN ('manager', 'admin') THEN
        RAISE EXCEPTION 'Only managers and admins can have project-specific permissions';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to validate role on insert/update
DROP TRIGGER IF EXISTS trigger_validate_project_permission_role ON public.project_manager_permissions;

CREATE TRIGGER trigger_validate_project_permission_role
    BEFORE INSERT OR UPDATE ON public.project_manager_permissions
    FOR EACH ROW
    EXECUTE FUNCTION validate_project_permission_role();

-- Add comment for documentation
COMMENT ON FUNCTION validate_project_permission_role() IS 
'Validates that only managers and admins can have project-specific permissions. Allows role transitions from manager to admin.';
```

5. Click **Run** or press `Ctrl+Enter`

**Option 2: Using psql**

```bash
psql [your-database-url] -f supabase/migrations/021_fix_role_update_constraint.sql
```

## Diagnostic Queries

If the issue persists after applying the fix, run these queries in the Supabase SQL Editor to diagnose:

```sql
-- 1. Check current user roles
SELECT id, full_name, email, role, is_active
FROM public.profiles
ORDER BY full_name;

-- 2. Check if you have admin permissions
SELECT 
    p.id,
    p.full_name,
    p.role,
    public.is_admin() as is_current_user_admin
FROM public.profiles p
WHERE p.id = auth.uid();

-- 3. Check RLS policies on profiles table
SELECT 
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'profiles';

-- 4. Check if the old constraint still exists
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.project_manager_permissions'::regclass
  AND conname LIKE '%manager%';

-- 5. Test manual update (replace 'user-id-here' with actual ID)
UPDATE public.profiles 
SET role = 'admin' 
WHERE id = 'user-id-here'
RETURNING *;
```

## Testing the Fix

1. **Apply the database migration** using one of the methods above
2. **Refresh your browser** to load the updated frontend code
3. **Open browser console** (F12) to see detailed logs
4. **Update a user's role** in Settings page
5. **Check console logs** for:
   - `🔄 Updating role for user:`
   - `✅ Role update successful:`
   - `🔄 Refreshing users list...`
   - `✅ Users list refreshed`
6. **Refresh the page** - the role should persist

## Console Logs to Expect

### Successful Update:
```
🔄 Updating role for user: {userId: "...", userName: "...", newRole: "admin"}
✅ Role update successful: [{id: "...", role: "admin", ...}]
🔄 Refreshing users list...
✅ Users list refreshed
```

### Failed Update:
```
🔄 Updating role for user: {userId: "...", userName: "...", newRole: "admin"}
❌ Role update error: {message: "..."}
```

## Common Issues

### Issue: "Cannot use subquery in check constraint"
**Cause:** The old migration tried to use a CHECK constraint with a subquery
**Solution:** Use the trigger-based migration provided above

### Issue: Role updates but reverts after refresh
**Cause:** The database migration hasn't been applied
**Solution:** Apply the migration using Supabase SQL Editor

### Issue: "Permission denied for table profiles"
**Cause:** RLS policy might not allow updates
**Solution:** Check that you're logged in as an admin user

## Verification

After applying all fixes, verify:
- [ ] Database migration applied successfully
- [ ] No console errors when updating role
- [ ] Success notification appears
- [ ] Role persists after page refresh
- [ ] Can change from any role to any role (admin, manager, member)





