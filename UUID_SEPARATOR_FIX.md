# UUID Separator Bug Fix - December 21, 2024

## Issue
**Error**: `invalid input syntax for type uuid: "08831ec8"`

When trying to create time entries on the Forecast page, the system was passing truncated UUIDs to the database, causing a 400 Bad Request error.

## Root Cause

The `rowKey` used to identify rows in the drag-and-drop system was using a **hyphen (`-`)** as a separator:

```typescript
const rowKey = `${projectId}-${userId}`
// Example: "08831ec8-1234-5678-9012-123456789abc-12345678-abcd-efgh-ijkl-mnopqrstuvwx"
```

When parsing this back:
```typescript
const [projectId, userId] = rowKey.split('-')
// Result: ['08831ec8', '1234', '5678', ...] ❌
// Only gets the first segment!
```

**The problem**: UUIDs themselves contain hyphens! So splitting by `-` would break the UUID into multiple parts, resulting in only the first 8 characters being used.

## Solution

Changed the separator from `-` to `___` (triple underscore), which won't conflict with UUID format:

### Files Modified:

**1. src/hooks/useForecastDragAndDrop.ts**

```typescript
// Before:
const rowKey = `${projectId || 'none'}-${userId || 'none'}`
const [projectId, userId] = rowKey.split('-')

// After:
const rowKey = `${projectId || 'none'}___${userId || 'none'}`
const [projectId, userId] = rowKey.split('___')
```

**2. src/pages/WorkloadPlanning.tsx**

Updated all rowKey references:
```typescript
// Before:
`${project.id}-none`
`${project.id}-${member.id}`
`none-${member.id}`

// After:
`${project.id}___none`
`${project.id}___${member.id}`
`none___${member.id}`
```

## Result

✅ Full UUIDs are now correctly parsed
✅ Time entries can be created for any user
✅ No more "invalid input syntax for type uuid" errors

## Example

**Before (BROKEN)**:
```
rowKey: "08831ec8-1234-5678-9012-123456789abc-12345678-abcd-efgh-ijkl-mnopqrstuvwx"
split('-'): ["08831ec8", "1234", "5678", ...]
projectId: "08831ec8" ❌ (truncated!)
```

**After (FIXED)**:
```
rowKey: "08831ec8-1234-5678-9012-123456789abc___12345678-abcd-efgh-ijkl-mnopqrstuvwx"
split('___'): ["08831ec8-1234-5678-9012-123456789abc", "12345678-abcd-efgh-ijkl-mnopqrstuvwx"]
projectId: "08831ec8-1234-5678-9012-123456789abc" ✅ (complete!)
userId: "12345678-abcd-efgh-ijkl-mnopqrstuvwx" ✅ (complete!)
```

## Testing

1. ✅ Navigate to Forecast page
2. ✅ Drag to create a time entry for any team member
3. ✅ Entry should be created successfully
4. ✅ Entry should appear immediately in the UI
5. ✅ No UUID errors in console



