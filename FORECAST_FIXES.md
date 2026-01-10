# Forecast Planning Fixes - December 21, 2024

## Issues Fixed

### 1. ✅ Update Button Not Working
**Problem**: The update button in the edit modal wasn't properly updating time entries.

**Root Cause**: The update function was only updating `project_id`, `user_id`, and `duration_minutes`, but wasn't recalculating the `start_time` and `end_time` based on the new duration.

**Solution**:
```typescript
// Before:
await updateTimeEntry(editingEntry.id, {
  project_id: modalData.projectId,
  user_id: modalData.userId,
  duration_minutes: durationMinutes
})

// After:
const startTime = new Date(modalData.startDate)
const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000)

await updateTimeEntry(editingEntry.id, {
  project_id: modalData.projectId,
  user_id: modalData.userId,
  start_time: startTime.toISOString(),
  end_time: endTime.toISOString(),
  duration_minutes: durationMinutes
})
```

### 2. ✅ Missing Project Members
**Problem**: Only showing users who already have time entries, not all assigned project members.

**Root Cause**: The `getProjectMembers` function was filtering from `plannedEntries` instead of querying the `project_members` table.

**Solution**:
1. Added `projectMembersService` import from supabase services
2. Added `projectMembers` state to store members by project ID
3. Created `loadProjectMembers` function to fetch from `project_members` table
4. Updated `getProjectMembers` to return from the new state:

```typescript
// Before:
const getProjectMembers = useCallback((projectId: string) => {
  return users.filter(user => {
    return plannedEntries.some(entry => 
      entry.project_id === projectId && entry.user_id === user.id
    )
  })
}, [users, plannedEntries])

// After:
const getProjectMembers = useCallback((projectId: string) => {
  return projectMembers[projectId] || []
}, [projectMembers])
```

5. Added useEffect to load project members on mount:
```typescript
useEffect(() => {
  loadProjectMembers()
}, [activeProjects])

const loadProjectMembers = async () => {
  const membersMap: Record<string, any[]> = {}
  
  for (const project of activeProjects) {
    const { data, error } = await projectMembersService.getProjectMembers(project.id)
    if (!error && data) {
      membersMap[project.id] = data.map(pm => ({
        id: pm.profiles.id,
        full_name: pm.profiles.full_name,
        email: pm.profiles.email,
        role: pm.role
      }))
    }
  }
  
  setProjectMembers(membersMap)
}
```

6. Fixed the rendering to use the helper function:
```typescript
// Before:
{isExpanded && projectMembers.map((member) => {

// After:
{isExpanded && getProjectMembers(project.id).map((member) => {
```

## Result
- ✅ Update button now properly updates time entries with new hours
- ✅ All project members (from project_members table) are now visible in the forecast view
- ✅ Members without time entries can now have entries created for them
- ✅ Example: "Go-To-Market - pricing" now shows both gyorgy.herbszt and andrás.lőrincz

## Files Modified
- `src/pages/WorkloadPlanning.tsx`
  - Added `projectMembersService` import
  - Added `projectMembers` state
  - Added `loadProjectMembers` function
  - Updated `getProjectMembers` helper
  - Fixed `handleUpdateEntry` to include start_time and end_time
  - Fixed member row rendering






