# Role-Based Access Control (RBAC) Implementation Guide

This document describes the comprehensive role-based access control system implemented in the Sonar Admin application.

## Overview

The application now supports three distinct user roles with different permission levels:

1. **Admin** - Full access to all features
2. **Manager** - Can view and manage specific projects assigned by admins
3. **Member** - Limited access, can only log their own time

## Database Changes

### 1. Updated Profile Roles

The `profiles` table role constraint has been updated:
- Old values: `'admin' | 'manager' | 'user'`
- New values: `'admin' | 'manager' | 'member'`
- All existing `'user'` roles have been automatically migrated to `'member'`

### 2. New Table: `project_manager_permissions`

A new table allows admins to grant managers project-specific permissions:

```sql
CREATE TABLE public.project_manager_permissions (
    id UUID PRIMARY KEY,
    manager_id UUID REFERENCES profiles(id),
    project_id UUID REFERENCES projects(id),
    can_view_time_entries BOOLEAN DEFAULT true,
    can_edit_time_entries BOOLEAN DEFAULT false,
    can_view_reports BOOLEAN DEFAULT true,
    can_edit_project BOOLEAN DEFAULT false,
    granted_by UUID REFERENCES profiles(id),
    granted_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Fields:**
- `can_view_time_entries` - Manager can see time entries for this project
- `can_edit_time_entries` - Manager can edit time entries for this project
- `can_view_reports` - Manager can view reports for this project
- `can_edit_project` - Manager can modify project settings

### 3. New Database Functions

#### `get_visible_users()`
Returns all users visible to the current user based on their role:
- **Admins** see all active users
- **Managers** see users in their assigned projects
- **Members** see only themselves

#### `can_view_project_time_entries(project_uuid)`
Checks if the current user can view time entries for a specific project based on their role and permissions.

#### `manager_has_project_permission(project_uuid)`
Checks if a manager has any permission for a specific project.

### 4. Updated RLS Policies

Row-Level Security policies have been updated to enforce the new permission model:

**Time Entries:**
- Members can only view and edit their own time entries
- Managers can view time entries for projects they're assigned to
- Admins can view and edit all time entries

**Projects:**
- Members can view projects they have time entries for (read-only)
- Managers can view and edit projects they're assigned to
- Admins have full access to all projects

**Profiles:**
- Members can only view their own profile
- Managers can view profiles of users in their assigned projects
- Admins can view all profiles

## Frontend Implementation

### 1. New Permission Hook: `usePermissions`

Located in `src/hooks/usePermissions.ts`, this hook provides:

```typescript
const {
  userRole,              // 'admin' | 'manager' | 'member'
  isAdmin,               // boolean
  isManager,             // boolean
  isMember,              // boolean
  canViewDashboard,      // Feature permissions
  canViewSummary,
  canViewReports,
  canViewAllUsers,
  canEditProjects,
  canManageUsers,
  canViewOthersTimeEntries,
  canEditOthersTimeEntries,
  allowedRoutes          // Array of allowed routes
} = usePermissions();
```

### 2. Permission Utilities

Located in `src/lib/permissions.ts`:

```typescript
// Role labels and badge colors
ROLE_LABELS: Record<UserRole, string>
ROLE_BADGES: Record<UserRole, { color: string; bgColor: string }>

// Permission check functions
canViewDashboard(role: UserRole): boolean
canViewReports(role: UserRole): boolean
canEditProjects(role: UserRole): boolean
canViewOthersTimeEntries(role: UserRole): boolean
isRouteAllowed(route: string, role: UserRole): boolean

// Display helpers
formatUserNameWithRole(name: string, role: UserRole, isCurrentUser: boolean): string
```

### 3. Protected Routes

All routes are now wrapped with the `ProtectedRoute` component that:
- Checks if the user's role allows access to the route
- Redirects unauthorized users to appropriate pages
- Members are redirected to `/time-tracking`
- Managers are redirected to `/` (Dashboard)

### 4. Filtered Navigation

The sidebar navigation in `Layout.tsx` is now filtered based on user role:
- **Members** see: Time Tracking, Timetable, Projects (read-only)
- **Managers** see: Dashboard, Time Tracking, Timetable, Projects, Reports, Summary
- **Admins** see: All navigation items

### 5. Feature-Level Restrictions

#### Timetable Page
- **New Feature:** Admins can select different users from a dropdown to view their time entries
- The dropdown shows user names with role tags for the current user
- Format: "John Doe (Admin)" for current user, "Jane Smith" for others

#### Projects Page
- **Members:** Can view projects but cannot:
  - Create, edit, or delete projects
  - Create, edit, or delete clients
  - Archive or unarchive projects
- **Managers:** Can view and edit projects based on assigned permissions
- **Admins:** Full access to all project management features

#### Dashboard & Reports
- **Members:** No access (hidden from navigation)
- **Managers:** Full access to view reports and analytics
- **Admins:** Full access to all features

## Migration Instructions

### Running the Migration

1. **Backup your database** before running migrations

2. **Apply the migration:**
   ```bash
   # If using Supabase CLI
   supabase db push

   # Or apply the SQL file directly
   psql -h <host> -U <user> -d <database> -f supabase/migrations/005_rbac_system.sql
   ```

3. **Verify the migration:**
   ```sql
   -- Check that roles were updated
   SELECT role, COUNT(*) FROM profiles GROUP BY role;
   
   -- Should show: admin, manager, member (no 'user')
   ```

### Setting Up Manager Permissions

To grant a manager access to specific projects:

```sql
-- Grant manager access to a project
INSERT INTO project_manager_permissions (
    manager_id,
    project_id,
    can_view_time_entries,
    can_edit_time_entries,
    can_view_reports,
    can_edit_project,
    granted_by
) VALUES (
    '<manager-user-id>',
    '<project-id>',
    true,  -- can view time entries
    false, -- cannot edit time entries
    true,  -- can view reports
    false, -- cannot edit project
    '<admin-user-id>'
);
```

## Testing the Implementation

### Test as Admin
1. Log in as an admin user
2. Verify all navigation items are visible
3. Go to Timetable and verify user selector dropdown appears
4. Select different users and verify their time entries load
5. Try creating, editing, and deleting projects

### Test as Manager
1. Log in as a manager user
2. Verify Dashboard, Reports, and Summary are accessible
3. Verify you can only see projects you're assigned to
4. Verify you can view time entries for assigned projects
5. Try creating a project (should work if you have permissions)

### Test as Member
1. Log in as a member user
2. Verify only Time Tracking, Timetable, and Projects appear in nav
3. Go to Projects page - verify no edit/delete buttons appear
4. Try accessing `/` (Dashboard) - should redirect to `/time-tracking`
5. Verify you can only see your own time entries

## Security Considerations

1. **Row-Level Security (RLS):** All permissions are enforced at the database level through RLS policies, ensuring data security even if frontend checks are bypassed.

2. **Frontend Validation:** The frontend permission checks provide a better UX by hiding/disabling features, but security is always enforced by the backend.

3. **API Endpoints:** The Supabase RLS policies automatically apply to all API calls, ensuring secure data access.

4. **Token-Based Auth:** User roles are stored in the JWT token and validated on every request.

## Future Enhancements

Potential improvements to consider:

1. **Admin UI for Permission Management:**
   - Create an admin interface to assign manager permissions
   - Bulk permission assignments
   - Permission templates

2. **Project-Level Roles:**
   - More granular project member roles
   - Custom permission sets per project

3. **Audit Trail:**
   - Log permission changes
   - Track who granted/revoked access

4. **Time Entry Approval Workflow:**
   - Manager review and approval
   - Bulk approval actions

5. **Department/Team Management:**
   - Group users into teams
   - Team-based permissions

## Troubleshooting

### Common Issues

**Issue:** Users still showing as 'user' role
- **Solution:** Re-run the migration script to update role values

**Issue:** Manager can't see any projects
- **Solution:** Ensure project_manager_permissions entries exist for the manager

**Issue:** Member can still edit projects
- **Solution:** Clear browser cache and verify RLS policies are enabled

**Issue:** User selector not showing on Timetable
- **Solution:** Verify the user has admin role and `get_visible_users()` function exists

### Debug Queries

```sql
-- Check user role
SELECT id, email, role FROM profiles WHERE email = 'user@example.com';

-- Check manager permissions
SELECT * FROM project_manager_permissions WHERE manager_id = '<user-id>';

-- Test get_visible_users function
SELECT * FROM get_visible_users();

-- Check RLS policies
SELECT tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```

## Support

For issues or questions about the RBAC implementation:
1. Check this documentation
2. Review the migration SQL file for details
3. Check Supabase logs for RLS policy violations
4. Verify user roles in the database

---

**Version:** 1.0.0  
**Last Updated:** December 2024  
**Migration File:** `supabase/migrations/005_rbac_system.sql`

