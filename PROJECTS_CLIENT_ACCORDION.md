# Projects Page - Client Accordion Feature

## Overview
Added accordion functionality to the Projects page, allowing users to expand and collapse client blocks using a chevron icon positioned to the left of the client name (Google Material Design style).

## Implementation Date
December 16, 2025

---

## 🎯 Features

### 1. **Collapsible Client Blocks**
- Each client section can be expanded or collapsed
- Click anywhere on the client name row to toggle
- Chevron icon positioned to the **left** of the client name
- Smooth visual feedback on hover

### 2. **Chevron Icons**
- **Right chevron (▶)**: Client is collapsed
- **Down chevron (▼)**: Client is expanded
- Material Design style icons from Lucide React
- Muted color for subtlety

### 3. **Default State**
- All clients start **expanded** by default
- Users can collapse clients they don't need to see
- State is preserved during the session

### 4. **Interactive Header**
- Entire client name area is clickable
- Hover effect for better UX (opacity transition)
- Cursor changes to pointer on hover

---

## 📁 Code Changes

### File: `src/pages/Projects.tsx`

#### 1. **New Imports**
```typescript
import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
```

#### 2. **New State**
```typescript
const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
```

#### 3. **Initialize All Clients as Expanded**
```typescript
useEffect(() => {
  if (clients.length > 0 && expandedClients.size === 0) {
    const allClientNames = new Set(clients.map(c => c.name));
    setExpandedClients(allClientNames);
  }
}, [clients]);
```

#### 4. **Toggle Function**
```typescript
const toggleClient = (clientName: string) => {
  const newExpanded = new Set(expandedClients);
  if (newExpanded.has(clientName)) {
    newExpanded.delete(clientName);
  } else {
    newExpanded.add(clientName);
  }
  setExpandedClients(newExpanded);
};
```

#### 5. **Updated Client Header**

**Before:**
```tsx
<div className="mb-4 flex items-center justify-between">
  <div>
    <h2 className="text-xl font-semibold text-foreground">{clientName}</h2>
  </div>
  {/* Edit buttons */}
</div>
```

**After:**
```tsx
<div className="mb-4 flex items-center justify-between">
  <div 
    className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
    onClick={() => toggleClient(clientName)}
  >
    {isExpanded ? (
      <ChevronDown className="h-5 w-5 text-muted-foreground" />
    ) : (
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    )}
    <h2 className="text-xl font-semibold text-foreground">{clientName}</h2>
  </div>
  {/* Edit buttons remain on the right */}
</div>
```

#### 6. **Conditional Project List Rendering**
```tsx
{/* Only show projects when expanded */}
{isExpanded && (
  <Card>
    <CardContent className="p-0">
      {/* Project list */}
    </CardContent>
  </Card>
)}
```

---

## 🎨 Visual Design

### Collapsed State
```
▶ Sonar Digital                                    [Edit]
                                                   
▶ Client ABC                                       [Edit]
                                                   
▶ Unassigned                                       [Edit]
```

### Expanded State
```
▼ Sonar Digital                                    [Edit]
┌─────────────────────────────────────────────────────┐
│ 🔵 Go-To-Market Website          Active    [⚙️]    │
│ 🟢 Internal Operations           Active    [⚙️]    │
│ 🔴 Brand Refresh Project         Active    [⚙️]    │
└─────────────────────────────────────────────────────┘

▶ Client ABC                                       [Edit]

▼ Unassigned                                       [Edit]
┌─────────────────────────────────────────────────────┐
│ 🟡 Personal Tasks                Active    [⚙️]    │
└─────────────────────────────────────────────────────┘
```

---

## 🎯 User Experience

### Interaction Flow

1. **Initial Load**
   - All clients are expanded by default
   - All projects are visible
   - Easy to scan all available projects

2. **Collapse a Client**
   - Click on the client name row
   - Chevron rotates from ▼ to ▶
   - Project list disappears (smoother scroll)

3. **Expand a Client**
   - Click on the collapsed client row
   - Chevron rotates from ▶ to ▼
   - Project list appears

4. **Mixed State**
   - Some clients expanded, some collapsed
   - Reduces clutter for clients with many projects
   - Allows focus on relevant clients

---

## 🔧 Technical Details

### State Management
- Uses `Set<string>` to track expanded client names
- Efficient add/remove operations
- No duplicates automatically

### Default Behavior
- `useEffect` runs when `clients` load
- Initializes `expandedClients` with all client names
- Only runs once (when `expandedClients.size === 0`)

### Click Target
- Entire left section is clickable (client name + icon)
- Edit buttons remain separate on the right
- No accidental clicks on edit buttons when toggling

### Visual Feedback
```css
cursor-pointer              /* Show it's clickable */
hover:opacity-80           /* Fade on hover */
transition-opacity         /* Smooth animation */
```

---

## 📊 Benefits

1. **🎯 Reduced Clutter**
   - Hide clients with many projects
   - Focus on relevant clients
   - Better for users with 10+ clients

2. **⚡ Faster Navigation**
   - Less scrolling required
   - Quick collapse/expand
   - Mental model: folders/files

3. **👁️ Better Scanning**
   - See all client names at once when collapsed
   - Expand only what you need
   - Hierarchical organization

4. **🎨 Clean UI**
   - Matches modern design patterns
   - Similar to file explorers
   - Familiar interaction model

---

## 🔄 Comparison with Workload Planning

### Similarities
- Both use accordion pattern
- Both use chevron icons
- Both support multiple items expanded

### Differences

| Feature | Projects Page | Workload Planning |
|---------|---------------|-------------------|
| **Icon Position** | Left of name | Right of name |
| **Default State** | All expanded | All collapsed |
| **Purpose** | Organize by client | Show member details |
| **Click Target** | Name + icon | Name cell only |
| **Sub-items** | Projects | Team members |

---

## 🎯 Future Enhancements

Possible improvements:
1. **Persist State**: Save expanded/collapsed state in localStorage
2. **Expand All / Collapse All**: Bulk toggle button
3. **Keyboard Shortcuts**: Arrow keys for navigation
4. **Search Filter**: Auto-expand clients matching search
5. **Animation**: Smooth slide-in/out for project list
6. **Count Badge**: Show project count on collapsed clients

---

## 📝 Testing Checklist

- [x] Chevron appears left of client name
- [x] Click toggles expansion
- [x] Chevron icon changes (▶ ⟷ ▼)
- [x] Projects show when expanded
- [x] Projects hide when collapsed
- [x] All clients start expanded by default
- [x] Multiple clients can be expanded simultaneously
- [x] Edit buttons still work (don't trigger toggle)
- [x] Hover effect works
- [x] Cursor changes to pointer
- [x] No linter errors

---

## 🐛 Known Limitations

1. **State Not Persisted**: Refreshing page resets to all-expanded
2. **No Animation**: Projects appear/disappear instantly
3. **No Count Badge**: Can't see project count when collapsed

These are intentional design choices for simplicity and can be enhanced later if needed.

---

## 📚 Related Documentation

- [Workload Accordion Feature](./WORKLOAD_ACCORDION.md)
- [Projects Page](./src/pages/Projects.tsx)
- [RBAC Implementation](./RBAC_IMPLEMENTATION.md)

---

## Summary

The client accordion feature transforms the Projects page from a flat list into an organized, collapsible structure. Users can now hide clients they're not actively working with, reducing visual clutter and improving focus. The left-positioned chevron follows Material Design patterns and provides clear visual feedback for expand/collapse actions.

### Key Benefits:
- ✅ **Cleaner UI** with collapsible sections
- ✅ **Better organization** for many clients
- ✅ **Familiar UX** pattern (folder tree)
- ✅ **Flexible viewing** - expand only what you need
- ✅ **Material Design** compliant icons and interaction

