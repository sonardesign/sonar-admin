# Project-Level Permissions System

## Overview

The application now supports **project-level permissions**, allowing fine-grained control over who can access and manage specific projects. This extends the existing role-based access control (RBAC) system.

## Features

### 1. **Project Members Management**
- Projects now have a "Project Members" section (replaces "Hourly Rates")
- Admins can invite users to specific projects
- Each project member has a project-specific role: **Member** or **Manager**

### 2. **Invite Members Modal**
- Click "Invite Members" button on any project page (admin only)
- Select a user from the dropdown
- Assign them a project role:
  - **Member**: Can log time, view project details
  - **Manager**: Can log time, view all project time entries, manage project

### 3. **Project Role Dropdown**
- Admins can change project roles on-the-fly
- Small dropdown in the "Project Role" column
- Changes take effect immediately

## Permission Rules

### Global Roles (from previous RBAC system)
- **Admin**: Full access to everything
- **Manager**: Global permissions across all projects they're invited to
- **Member**: Limited access, project-specific permissions

### Project-Level Access

#### **Members**
- ✅ Can see projects they **created**
- ✅ Can see projects they're **invited to**
- ✅ Can see projects they have **time entries for**
- ✅ Can **log time** on their projects
- ❌ **Cannot** see other users' time entries
- ❌ **Cannot** edit or manage projects

#### **Project Managers**
- ✅ Can see projects they **created**
- ✅ Can see projects they're **invited to** as manager
- ✅ Can see **all time entries** for projects they manage
- ✅ Can **invite members** to their projects
- ✅ Can **edit project details**
- ✅ Can **manage project members**

#### **Global Admins**
- ✅ Can see **all projects**
- ✅ Can see **all time entries** across all projects
- ✅ Can **invite members** to any project
- ✅ Can **change project roles**
- ✅ Can **remove members** from projects

## Database Changes

### Tables
- **`project_members`**: Stores project-level memberships
  - `project_id`: Reference to project
  - `user_id`: Reference to user
  - `role`: Either 'member' or 'manager'
  - `can_edit_project`: Boolean (auto-set based on role)
  - `can_view_reports`: Boolean
  - `added_by`: User who added this member
  - `added_at`: Timestamp

### Constraints
- Unique constraint on `(project_id, user_id)` prevents duplicates
- Role check constraint ensures only 'member' or 'manager'

### Automatic Behaviors
- When a user **creates a project**, they're automatically added as a **manager**
- Existing projects have been backfilled with their creators as managers

### RLS Policies

#### Projects Table
Users can see projects if:
- They're an admin
- They created the project
- They're a project member (in `project_members`)
- They have global manager permissions
- They have time entries on the project

#### Time Entries Table
Users can see time entries if:
- It's their own time entry
- They're an admin
- They're a project manager for that project
- They have global manager permissions for that project

#### Project Members Table
Users can:
- **View**: Members they share projects with
- **Insert/Update/Delete**: Only admins and project managers

## Frontend Changes

### New Components
- **`InviteMembersModal`** (`src/components/InviteMembersModal.tsx`)
  - User selection combobox
  - Role selection dropdown
  - Add member functionality

### Updated Components
- **`ProjectDetails`** (`src/pages/ProjectDetails.tsx`)
  - Renamed "Hourly Rates" to "Project Members"
  - Added "Invite Members" button
  - Added project role dropdown column
  - Added remove member button
  - Integrated member management hooks

- **`Timetable`** (`src/pages/Timetable.tsx`)
  - Managers now see time entries from projects they manage
  - RLS handles filtering automatically
  - No manual filtering needed for managers

### New Services
- **`projectMembersService`** (`src/services/supabaseService.ts`)
  - `getProjectMembers(projectId)`: Fetch all members
  - `addProjectMember(projectId, userId, role)`: Add member
  - `updateProjectMemberRole(memberId, role)`: Change role
  - `removeProjectMember(memberId)`: Remove member

## Usage Examples

### As an Admin

1. **Invite a Member to a Project**
   - Open a project
   - Click "Invite Members"
   - Select user and role
   - Click "Add Member"

2. **Change a Member's Role**
   - Open a project
   - Find the member in "Project Members" table
   - Use the dropdown to change their role
   - Changes are saved automatically

3. **Remove a Member**
   - Open a project
   - Find the member in "Project Members" table
   - Click the trash icon
   - Member is removed immediately

### As a Project Manager

1. **View Project Time Entries**
   - Open the Timetable view
   - See your own time entries + entries from projects you manage

2. **Invite Members to Your Project**
   - Open a project you manage
   - Click "Invite Members"
   - Add team members

### As a Member

1. **View Your Projects**
   - See only projects you created or were invited to
   - See only your own time entries

2. **Log Time**
   - Select any of your projects
   - Log your time entries as usual

## Testing Checklist

- [ ] Admin can invite members to any project
- [ ] Admin can change project roles
- [ ] Admin can remove members
- [ ] Project manager can invite members to their projects
- [ ] Project manager sees time entries from managed projects
- [ ] Member sees only their own projects
- [ ] Member sees only their own time entries
- [ ] Project creator is automatically added as manager
- [ ] Cannot add duplicate members to a project
- [ ] RLS prevents unauthorized access

## Migration Files

1. **`project_level_permissions.sql`**: Core RLS policies and helper functions
2. **`auto_add_project_creator.sql`**: Trigger to auto-add creators
3. **`project_members_rls_policies.sql`**: RLS policies for project_members table

## Next Steps

Consider adding:
- Email notifications when invited to a project
- Bulk member import
- Project access logs
- Custom permission templates
- Member activity tracking

---

**Last Updated**: December 14, 2025

