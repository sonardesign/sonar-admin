# RBAC System Fixes

## Issues Fixed

### Issue 1: Members Seeing Other Users' Time Entries ❌ → ✅

**Problem:** Members could see other users' time entries on the Timetable page.

**Root Cause:** The RLS policy for `time_entries` was using `has_project_access()` which allowed members to see all time entries for projects they had access to.

**Solution:** Updated the RLS policy to use `can_view_project_time_entries()` function which:
- Returns `true` for admins (see all)
- Returns `true` for managers with explicit permissions
- Returns `false` for members (they only see via `user_id = auth.uid()`)

**SQL Changes:**
```sql
DROP POLICY IF EXISTS "Users can view their own time entries" ON public.time_entries;

CREATE POLICY "Users can view their own time entries" ON public.time_entries
    FOR SELECT USING (
        user_id = auth.uid() OR 
        is_admin() OR
        can_view_project_time_entries(project_id)
    );
```

**Result:** ✅ Members now only see their own time entries

---

### Issue 2: Members Cannot Create Projects ❌ → ✅

**Problem:** Members couldn't create new projects (only view them).

**Requirement Change:** Members should be able to CREATE projects, but not EDIT or DELETE them, and not OPEN project details.

**Solution:** 
1. Updated RLS policy to allow all authenticated users to create projects
2. Added `canCreateProjects` permission (true for all roles)
3. Added `canOpenProjectDetails` permission (false for members)
4. Updated UI to show "New Project" button for all users
5. Updated UI to prevent members from clicking project names to open details

**SQL Changes:**
```sql
DROP POLICY IF EXISTS "Users can create projects" ON public.projects;

CREATE POLICY "Users can create projects" ON public.projects
    FOR INSERT WITH CHECK (
        -- All authenticated users can create projects
        auth.uid() IS NOT NULL
    );
```

**Frontend Changes:**
- `src/hooks/usePermissions.ts`: Added `canCreateProjects` and `canOpenProjectDetails`
- `src/lib/permissions.ts`: Added `canCreateProjects()` utility
- `src/pages/Projects.tsx`: 
  - Show "New Project" button based on `canCreateProjects`
  - Disable project name click for members (based on `canOpenProjectDetails`)

**Result:** ✅ Members can now create projects but cannot edit/delete or open project details

---

## Permission Matrix (Updated)

| Feature | Admin | Manager | Member |
|---------|-------|---------|--------|
| **View Dashboard** | ✅ | ✅ | ❌ |
| **View Reports** | ✅ | ✅ | ❌ |
| **View Own Time Entries** | ✅ | ✅ | ✅ |
| **View Others' Time Entries** | ✅ | ⚠️ Assigned Projects | ❌ |
| **Edit Own Time Entries** | ✅ | ✅ | ✅ |
| **Edit Others' Time Entries** | ✅ | ⚠️ If Granted | ❌ |
| **View Projects List** | ✅ | ✅ | ✅ |
| **Open Project Details** | ✅ | ✅ | ❌ |
| **Create Projects** | ✅ | ✅ | ✅ ⭐ NEW |
| **Edit Projects** | ✅ | ⚠️ If Granted | ❌ |
| **Delete Projects** | ✅ | ⚠️ If Granted | ❌ |

⭐ = Changed from original implementation

---

## Testing Checklist

### Test as Member (High Priority)

- [ ] Log in as a member user
- [ ] **Time Entries:**
  - [ ] Go to Timetable
  - [ ] Verify you only see YOUR OWN time entries
  - [ ] Verify no user selector dropdown appears
  - [ ] Create a time entry - should work
  - [ ] Edit your time entry - should work
  
- [ ] **Projects:**
  - [ ] Go to Projects page
  - [ ] Verify you can see project list
  - [ ] Click "New Project" button - should open dialog ✅
  - [ ] Create a new project - should work ✅
  - [ ] Try clicking a project name - should NOT navigate to details ✅
  - [ ] Verify no Edit/Archive/Delete buttons appear on projects
  
- [ ] **Navigation:**
  - [ ] Verify only see: Time Tracking, Timetable, Projects
  - [ ] Try accessing `/` or `/dashboard` - should redirect
  - [ ] Try accessing `/reports` - should redirect
  - [ ] Try accessing `/summary` - should redirect

### Test as Admin

- [ ] Log in as admin
- [ ] Go to Timetable
- [ ] Verify user selector dropdown appears
- [ ] Select different users - should see their time entries
- [ ] Go to Projects
- [ ] Verify can create, edit, and delete projects
- [ ] Click project name - should open details

### Test as Manager

- [ ] Log in as manager
- [ ] If no permissions granted yet, grant some via SQL:
  ```sql
  INSERT INTO project_manager_permissions (manager_id, project_id, can_view_time_entries)
  VALUES ('<manager-id>', '<project-id>', true);
  ```
- [ ] Go to Timetable
- [ ] Verify can see time entries for assigned projects only
- [ ] Go to Projects
- [ ] Verify can create projects
- [ ] Verify can see and open assigned projects

---

## Files Modified

### Database (Supabase)
- ✅ Updated `time_entries` SELECT policy
- ✅ Updated `projects` INSERT policy

### Frontend
- ✅ `src/hooks/usePermissions.ts` - Added new permissions
- ✅ `src/lib/permissions.ts` - Added utility functions
- ✅ `src/pages/Projects.tsx` - Conditional rendering

---

## Applied Via MCP

All database changes were applied directly to Supabase using the MCP server:
- Project: `ethrtamtoioydchylepo` (sonar-admin)
- Region: `eu-central-2`
- Applied: December 14, 2024

---

## Next Steps

1. **Test thoroughly** using the checklist above
2. **Grant manager permissions** if you have manager users:
   ```sql
   INSERT INTO project_manager_permissions 
   (manager_id, project_id, can_view_time_entries, can_edit_time_entries)
   VALUES ('<manager-uuid>', '<project-uuid>', true, false);
   ```
3. **Promote users to roles** as needed:
   ```sql
   -- Make someone an admin
   UPDATE profiles SET role = 'admin' WHERE email = 'admin@example.com';
   
   -- Make someone a manager
   UPDATE profiles SET role = 'manager' WHERE email = 'manager@example.com';
   ```

---

**Status:** ✅ Complete  
**Last Updated:** December 14, 2024

