# RBAC Quick Start Guide

## 🚀 What Was Implemented

A comprehensive role-based access control (RBAC) system with three roles:

### Roles & Permissions

| Feature | Admin | Manager | Member |
|---------|-------|---------|--------|
| **Dashboard** | ✅ Full Access | ✅ Full Access | ❌ No Access |
| **Summary & Reports** | ✅ Full Access | ✅ Full Access | ❌ No Access |
| **Time Tracking** | ✅ All Users | ✅ Assigned Projects | ✅ Own Only |
| **Timetable** | ✅ All Users | ✅ Assigned Projects | ✅ Own Only |
| **Projects - View** | ✅ All Projects | ✅ Assigned Projects | ✅ View Only |
| **Projects - Edit** | ✅ Full Control | ⚠️ If Granted | ❌ No Access |
| **User Management** | ✅ Yes | ❌ No | ❌ No |

## 📦 Files Created/Modified

### Backend (Database)
- ✅ `supabase/migrations/005_rbac_system.sql` - Complete migration file

### Frontend
- ✅ `src/hooks/usePermissions.ts` - Permission hook
- ✅ `src/lib/permissions.ts` - Permission utilities
- ✅ `src/components/ProtectedRoute.tsx` - Route protection
- ✅ `src/types/index.ts` - Updated types
- ✅ `src/services/supabaseService.ts` - Added user service
- ✅ `src/pages/Timetable.tsx` - Added user selector for admins
- ✅ `src/pages/Projects.tsx` - Added permission checks
- ✅ `src/components/Layout.tsx` - Filtered navigation
- ✅ `src/App.tsx` - Protected routes

### Documentation
- ✅ `RBAC_IMPLEMENTATION.md` - Complete implementation guide
- ✅ `RBAC_QUICK_START.md` - This file

## 🎯 Key Features

### 1. Admin User Selector on Timetable
Admins can now select different users from a dropdown to view their time entries:
- Dropdown shows all users in the system
- Current user's name includes their role tag (e.g., "John Doe (Admin)")
- Time entries update when a different user is selected

### 2. Project-Specific Manager Permissions
Admins can grant managers granular access to specific projects:
- View time entries
- Edit time entries
- View reports
- Edit project settings

### 3. Member Restrictions
Members have limited access:
- ❌ Cannot see Dashboard or Summary
- ❌ Cannot create/edit/delete projects
- ✅ Can log their own time
- ✅ Can view projects (read-only)

### 4. Automatic Route Protection
Routes automatically redirect based on role:
- Members trying to access Dashboard → Redirected to Time Tracking
- Unauthorized access to any page → Redirected to appropriate page

### 5. Filtered Navigation
Sidebar navigation automatically hides unavailable features

## 🔧 Setup Instructions

### Step 1: Apply Database Migration

```bash
# If using Supabase CLI
cd supabase
supabase db push

# Or apply directly via psql
psql -h your-host -U your-user -d your-db -f supabase/migrations/005_rbac_system.sql
```

### Step 2: Verify Migration

```sql
-- Check roles were updated
SELECT role, COUNT(*) FROM profiles GROUP BY role;
-- Should show: admin, manager, member (NO 'user')

-- Check new table exists
SELECT * FROM project_manager_permissions LIMIT 1;

-- Test function
SELECT * FROM get_visible_users();
```

### Step 3: Set Up Test Users (Optional)

```sql
-- Make a user an admin
UPDATE profiles SET role = 'admin' WHERE email = 'admin@example.com';

-- Make a user a manager
UPDATE profiles SET role = 'manager' WHERE email = 'manager@example.com';

-- Make a user a member
UPDATE profiles SET role = 'member' WHERE email = 'member@example.com';
```

### Step 4: Grant Manager Permissions (Optional)

```sql
-- Grant a manager access to a specific project
INSERT INTO project_manager_permissions (
    manager_id,
    project_id,
    can_view_time_entries,
    can_edit_time_entries,
    can_view_reports,
    can_edit_project
) 
SELECT 
    (SELECT id FROM profiles WHERE email = 'manager@example.com'),
    (SELECT id FROM projects WHERE name = 'Project Name'),
    true,   -- can view time entries
    false,  -- cannot edit time entries
    true,   -- can view reports
    false   -- cannot edit project
WHERE EXISTS (SELECT 1 FROM profiles WHERE email = 'manager@example.com')
  AND EXISTS (SELECT 1 FROM projects WHERE name = 'Project Name');
```

## ✅ Testing Checklist

### Test as Admin
- [ ] Log in with an admin account
- [ ] Verify all nav items visible (Dashboard, Time Tracking, Timetable, Projects, Reports, Summary)
- [ ] Go to Timetable → User selector dropdown should appear
- [ ] Select a different user → Their time entries should load
- [ ] Go to Projects → All edit/delete buttons should be visible
- [ ] Try creating a project → Should work

### Test as Manager
- [ ] Log in with a manager account
- [ ] Verify Dashboard, Reports, and Summary are visible
- [ ] Go to Projects → Should see only assigned projects
- [ ] If granted permission, should see edit buttons
- [ ] Go to Timetable → Should see time entries for assigned projects only
- [ ] Try accessing admin-only features → Should be restricted

### Test as Member
- [ ] Log in with a member account
- [ ] Verify only Time Tracking, Timetable, and Projects in nav
- [ ] Try accessing `/` → Should redirect to `/time-tracking`
- [ ] Go to Projects → No edit/delete buttons should appear
- [ ] Can only view projects, not edit them
- [ ] Go to Timetable → Can only see own time entries

## 🎨 UI Changes

### Timetable Page (Admins Only)
```
┌─────────────────────────────────────────────┐
│ Timetable                                   │
│                                             │
│  👥 [Select User ▾]  📅 [Date Picker]     │
│                                             │
│  [Calendar View]                            │
└─────────────────────────────────────────────┘
```

### Projects Page (Role-Based)

**Admin/Manager View:**
```
Project Name  [Edit] [Archive] [Delete]
```

**Member View:**
```
Project Name  (Read-only)
```

## 🔐 Security Notes

1. **Backend Enforced**: All permissions are enforced at the database level via RLS
2. **Frontend UX**: Frontend checks hide features for better UX but don't provide security
3. **Token-Based**: User roles are in JWT tokens, validated on every request
4. **Automatic**: RLS policies apply automatically to all Supabase API calls

## 🐛 Troubleshooting

### "User still shows as 'user' role"
```sql
-- Manually update
UPDATE profiles SET role = 'member' WHERE role = 'user';
```

### "Manager can't see any projects"
```sql
-- Check permissions
SELECT * FROM project_manager_permissions WHERE manager_id = 'manager-id';

-- Grant access if missing
INSERT INTO project_manager_permissions (manager_id, project_id, ...)
VALUES (...);
```

### "Edit buttons still showing for members"
- Clear browser cache
- Verify `canEditProjects` is false in browser console
- Check RLS policies are enabled

### "User selector not appearing for admin"
- Verify user has role = 'admin'
- Check browser console for errors
- Verify `get_visible_users()` function exists

## 📚 More Information

See `RBAC_IMPLEMENTATION.md` for complete technical documentation.

## 🎉 What's Next?

Consider implementing:
1. Admin UI for managing manager permissions
2. Bulk permission assignments
3. Permission templates
4. Audit trail for permission changes
5. Time entry approval workflows

---

**Need Help?** Check the main implementation guide or database logs for RLS violations.

