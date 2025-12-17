# Workload Planning - RLS Fix for Creating Time Entries for Other Users

## Issue
When admins or managers tried to create planned time entries for other users in the Workload Planning page, they received this error:

```
new row violates row-level security policy for table "time_entries"
```

## Root Cause
The `time_entries` table had only one INSERT policy:

```sql
CREATE POLICY "Users can create own time entries" ON public.time_entries
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND public.has_project_access(project_id)
    );
```

This policy only allowed users to create entries where `user_id = auth.uid()`, meaning users could only create time entries for themselves. This prevented admins and managers from planning workloads for other team members.

---

## Solution

### Migration: `009_fix_time_entries_insert_rls.sql`

Created three INSERT policies with different permission levels:

#### 1. **Regular Users** (unchanged)
```sql
CREATE POLICY "Users can create own time entries" ON public.time_entries
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND public.has_project_access(project_id)
    );
```
- Users can still create their own time entries
- Must have access to the project

#### 2. **Admins** (NEW)
```sql
CREATE POLICY "Admins can create time entries for anyone" ON public.time_entries
    FOR INSERT WITH CHECK (
        public.is_admin()
    );
```
- Admins can create time entries for **any user**
- No restrictions on projects or users
- Essential for workload planning across the entire organization

#### 3. **Managers** (NEW)
```sql
CREATE POLICY "Managers can create time entries for project members" ON public.time_entries
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = time_entries.project_id 
            AND pm.user_id = auth.uid() 
            AND pm.role IN ('owner', 'manager')
        )
    );
```
- Managers can create time entries for users on **their projects**
- Must be a project owner or manager
- Limited to projects they manage

---

## How RLS Policies Work Together

PostgreSQL RLS evaluates INSERT policies with **OR logic** - if **any** policy passes, the insert is allowed.

### Example Scenarios:

#### Scenario 1: Regular user creates their own entry
- ✅ **Policy 1** passes: `user_id = auth.uid()` ✓
- ✅ **Insert allowed**

#### Scenario 2: Admin creates entry for another user
- ❌ **Policy 1** fails: `user_id ≠ auth.uid()`
- ✅ **Policy 2** passes: `is_admin()` ✓
- ✅ **Insert allowed**

#### Scenario 3: Manager creates entry for team member on their project
- ❌ **Policy 1** fails: `user_id ≠ auth.uid()`
- ❌ **Policy 2** fails: not an admin
- ✅ **Policy 3** passes: manager of the project ✓
- ✅ **Insert allowed**

#### Scenario 4: Manager tries to create entry for user on unmanaged project
- ❌ **Policy 1** fails: `user_id ≠ auth.uid()`
- ❌ **Policy 2** fails: not an admin
- ❌ **Policy 3** fails: not a manager of that project
- ❌ **Insert denied** ⛔

---

## Impact on Workload Planning Feature

### Before Fix
- ❌ Admins couldn't plan workload for team members
- ❌ Managers couldn't allocate time to their team
- ❌ Only self-time-tracking worked

### After Fix
- ✅ Admins can plan for **anyone**
- ✅ Managers can plan for team members on **their projects**
- ✅ Regular users can still log **their own** time
- ✅ Full workload planning functionality enabled

---

## Security Considerations

### Maintained Security
1. **Regular users** still can't create entries for others
2. **Managers** are limited to their managed projects only
3. **Admins** have full access (as intended by design)

### RLS Benefits
- Database-level security (can't be bypassed by frontend)
- Automatic enforcement across all queries
- No application code changes needed
- Works with Supabase client libraries automatically

---

## Testing Checklist

- [x] Admin can create time entry for another user
- [x] Admin can create time entry on any project
- [x] Manager can create time entry for team member on managed project
- [x] Manager cannot create time entry on unmanaged project
- [x] Regular user can create own time entry
- [x] Regular user cannot create entry for another user
- [x] Workload Planning page works for admins
- [x] Workload Planning page works for managers
- [x] All existing time tracking features still work

---

## Related Features

This fix enables:
- ✅ **Workload Planning** - "By Project" view
- ✅ **Workload Planning** - "By Team Member" view
- ✅ **Project Accordion** - Member-level planning
- ✅ **Future Planning** - Creating entries for upcoming dates
- ✅ **Resource Allocation** - Assigning work to team members

---

## Migration Steps

### Applied via Supabase MCP:
```bash
Migration: 009_fix_time_entries_insert_rls
Status: ✅ Applied successfully
Project: sonar-admin (ethrtamtoioydchylepo)
```

### Manual Application (if needed):
```bash
# Using Supabase CLI
supabase db push

# Or via Dashboard
# 1. Go to SQL Editor in Supabase Dashboard
# 2. Paste contents of supabase/migrations/009_fix_time_entries_insert_rls.sql
# 3. Run
```

---

## Verification

To verify the fix is working:

1. **As Admin:**
   - Go to Workload Planning
   - Click on a day cell for any project
   - Select another user from dropdown
   - Enter hours and save
   - ✅ Should succeed

2. **As Manager:**
   - Go to Workload Planning
   - Click on a day cell for YOUR project
   - Select a team member from dropdown
   - Enter hours and save
   - ✅ Should succeed

3. **As Regular User:**
   - Try to create time entry via API with different user_id
   - ❌ Should fail with RLS error (expected behavior)

---

## SQL Queries for Debugging

### Check current policies:
```sql
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check
FROM pg_policies 
WHERE tablename = 'time_entries' 
  AND cmd = 'INSERT'
ORDER BY policyname;
```

### Test admin check:
```sql
SELECT public.is_admin();
```

### Check project membership:
```sql
SELECT 
    pm.project_id,
    p.name as project_name,
    pm.role,
    pm.user_id
FROM public.project_members pm
JOIN public.projects p ON pm.project_id = p.id
WHERE pm.user_id = auth.uid();
```

---

## Summary

**Problem**: RLS prevented admins and managers from creating time entries for other users.

**Solution**: Added two new INSERT policies for admins and managers while maintaining the existing policy for regular users.

**Result**: Full workload planning functionality now works as intended, with proper role-based security maintained at the database level.

---

## Related Documentation

- [Workload Planning Implementation](./WORKLOAD_PLANNING_IMPLEMENTATION.md)
- [Workload Accordion Feature](./WORKLOAD_ACCORDION.md)
- [RLS Recursion Fix](./RLS_RECURSION_FIX.md)
- [RBAC Implementation](./RBAC_IMPLEMENTATION.md)

