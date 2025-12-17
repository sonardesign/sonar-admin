# Workload Planning - Project Accordion Feature

## Overview
Added accordion/expand functionality to the Workload Planning page (Projects view), allowing admins and managers to expand projects and see member-specific allocations within each project.

## Implementation Date
December 15, 2025

---

## 🎯 Features

### 1. **Expandable Project Rows**
- Each project row now displays a chevron icon (▶ or ▼)
- Chevron positioned at the end of the cell (flexbox: `justify-between`)
- Click anywhere on the project name cell to expand/collapse

### 2. **Member Sub-Rows**
When a project is expanded, it shows:
- All team members who have time entries for that project
- Each member row displays:
  - User avatar with initials
  - Full name (indented with left padding)
  - Total scheduled hours for that member on that project
  - Daily allocations across the 3-week calendar

### 3. **Visual Hierarchy**
- **Project rows**: White background, bold text
- **Member rows**: Light gray background (`bg-muted/5`), slightly smaller padding
- **Member names**: Muted text color, indented 24px (`pl-6`)
- **Member avatars**: Smaller (6x6) compared to main member view (8x8)

### 4. **Granular Planning**
- Click on any member's day cell to plan/edit time for that specific person on that specific project
- Maintains all CRUD functionality (create, read, update, delete)
- Member-specific totals in "Total Scheduled" column

---

## 📁 Code Changes

### File: `src/pages/WorkloadPlanning.tsx`

#### 1. **New Imports**
```typescript
import { 
  // ... existing imports
  ChevronDown, 
  ChevronRight as ChevronRightIcon 
} from 'lucide-react'
```

#### 2. **New State**
```typescript
const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
```

#### 3. **New Helper Functions**

**Toggle Project Expansion:**
```typescript
const toggleProject = (projectId: string) => {
  const newExpanded = new Set(expandedProjects)
  if (newExpanded.has(projectId)) {
    newExpanded.delete(projectId)
  } else {
    newExpanded.add(projectId)
  }
  setExpandedProjects(newExpanded)
}
```

**Get Project Members:**
```typescript
const getProjectMembers = (projectId: string) => {
  // Get all users who have entries for this project
  const memberIds = new Set(
    plannedEntries
      .filter(entry => entry.project_id === projectId)
      .map(entry => entry.user_id)
  )
  return users.filter(user => memberIds.has(user.id))
}
```

#### 4. **Updated Project Row Rendering**

**Before:**
```tsx
<tr key={project.id}>
  <td>
    <div className="flex items-center gap-2">
      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: project.color }} />
      {project.name}
    </div>
  </td>
  {/* ... cells */}
</tr>
```

**After:**
```tsx
<React.Fragment key={project.id}>
  <tr>
    <td 
      className="cursor-pointer"
      onClick={() => toggleProject(project.id)}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: project.color }} />
          {project.name}
        </div>
        {isExpanded ? <ChevronDown /> : <ChevronRightIcon />}
      </div>
    </td>
    {/* ... cells */}
  </tr>

  {/* Member rows when expanded */}
  {isExpanded && projectMembers.map(member => (
    <tr key={`${project.id}-${member.id}`} className="bg-muted/5">
      <td className="pl-6">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-primary/10">
            {member.full_name?.split(' ').map(n => n[0]).join('').toUpperCase()}
          </div>
          <span className="text-muted-foreground">{member.full_name}</span>
        </div>
      </td>
      <td>{memberTotalScheduled}h</td>
      {/* ... member's day cells with project.id + member.id filtering */}
    </tr>
  ))}
</React.Fragment>
```

---

## 🎨 Visual Design

### Collapsed State
```
┌────────────────────────┬─────────┬────┬────┬────┐
│ 🔵 Go-To-Market      ▶ │  40h    │ 8h │ 8h │ 8h │
├────────────────────────┼─────────┼────┼────┼────┤
│ 🟢 Sonar Development ▶ │  32h    │ 8h │ -  │ 8h │
└────────────────────────┴─────────┴────┴────┴────┘
```

### Expanded State
```
┌────────────────────────┬─────────┬────┬────┬────┐
│ 🔵 Go-To-Market      ▼ │  40h    │ 8h │ 8h │ 8h │
├────────────────────────┼─────────┼────┼────┼────┤
│   👤 György Herbszt    │  24h    │ 8h │ -  │ 8h │ ← Member row (indented)
│   👤 András Lakatos    │  16h    │ -  │ 8h │ -  │ ← Member row (indented)
├────────────────────────┼─────────┼────┼────┼────┤
│ 🟢 Sonar Development ▶ │  32h    │ 8h │ -  │ 8h │
└────────────────────────┴─────────┴────┴────┴────┘
```

---

## 🔄 User Workflow

### Expanding a Project
1. **Click** on the project name cell
2. Chevron rotates from right (▶) to down (▼)
3. Member rows slide in below the project row
4. Each member shows their individual allocations

### Planning at Member Level
1. **Expand** the project
2. **Click** on a member's day cell
3. Modal opens with:
   - **Project**: Pre-selected (disabled)
   - **Team Member**: Pre-selected (disabled)
   - **Hours**: Editable
4. **Save** creates an entry for that specific project-member-date combination

### Collapsing a Project
1. **Click** on the expanded project name cell
2. Chevron rotates back to right (▶)
3. Member rows are hidden
4. Project-level summary remains visible

---

## 📊 Data Filtering

### Project Row (Top Level)
- Shows **all entries** for the project (all members combined)
- Total Scheduled: Sum of all member hours for this project

### Member Row (Sub Level)
- Shows **only entries** for that specific member on that project
- Filtering: `project_id === project.id && user_id === member.id`
- Total Scheduled: Sum of hours for this member on this project only

---

## 🎯 Benefits

1. **Hierarchical View**: See both project-level and member-level allocations
2. **Granular Planning**: Allocate specific hours to specific people on specific projects
3. **Quick Overview**: Collapsed view shows totals; expanded view shows details
4. **Better UX**: Reduced clutter when collapsed; detailed when needed
5. **Flexible**: Can expand multiple projects simultaneously

---

## 🔧 Technical Details

### State Management
- Uses `Set<string>` to track expanded project IDs
- Allows multiple projects to be expanded at once
- State persists during component lifecycle (resets on page reload)

### Performance Considerations
- Member rows only render when expanded (conditional rendering)
- `getProjectMembers()` filters efficiently using `Set` for uniqueness
- No unnecessary re-renders; state updates are localized

### Accessibility
- Entire cell is clickable (large click target)
- Visual feedback: cursor changes to pointer on hover
- Clear visual distinction between project and member rows

---

## 🚀 Future Enhancements

Possible improvements:
1. **Persist expanded state** in localStorage
2. **Expand all/collapse all** button
3. **Keyboard navigation** (arrow keys)
4. **Drag-and-drop** to reassign allocations
5. **Add member button** within expanded view to quickly assign new members
6. **Filter by member** to show only projects with specific team members

---

## 📝 Testing Checklist

- [x] Chevron appears at end of project cell
- [x] Click toggles expansion
- [x] Member rows display correctly when expanded
- [x] Member rows hide when collapsed
- [x] Member-specific totals calculate correctly
- [x] Cell clicks open modal with correct pre-filled data
- [x] CRUD operations work for member-specific entries
- [x] Multiple projects can be expanded simultaneously
- [x] Visual styling matches design (indentation, colors, spacing)
- [x] No linter errors

---

## 📚 Related Documentation

- [Workload Planning Implementation](./WORKLOAD_PLANNING_IMPLEMENTATION.md)
- [Workload Visual Indicators](./WORKLOAD_VISUAL_INDICATORS.md)
- [RBAC System](./RBAC_IMPLEMENTATION.md)

---

## Summary

The accordion feature transforms the Workload Planning page from a flat project list into a hierarchical, expandable view that enables precise, member-level planning while maintaining a clean, summarized view when collapsed. This enhancement significantly improves the user experience for resource planning and allocation.

