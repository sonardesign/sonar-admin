# Time Entry Types - Planned vs Reported

## Overview
Added the ability to distinguish between "planned" and "reported" time entries. Time entries can now be marked as either planned work (future/scheduled) or reported work (actual time logged). The time entry modal includes tabs to switch between these two types.

## Implementation Date
December 16, 2025

---

## 🎯 Features

### 1. **Database Column: `entry_type`**
- New column in `time_entries` table
- Values: `'planned'` or `'reported'`
- Default: `'reported'`
- Indexed for performance

### 2. **Tab Interface in Modals**
- Two tabs: "Reported" and "Planned"
- Appears at the top of create/edit modals
- Easy switching between entry types
- Auto-selects appropriate tab based on context

### 3. **Smart Default Selection**
- **Future dates**: Defaults to "Planned"
- **Past/current dates**: Defaults to "Reported"
- Can be manually changed via tabs

### 4. **Visual Distinction**
- Future entries already show with gray styling (from previous feature)
- Now backed by explicit database property
- Can filter/query by entry type

---

## 📁 Files Modified

### 1. **Migration: `supabase/migrations/010_add_time_entry_type.sql`**

```sql
-- Add entry_type column
ALTER TABLE public.time_entries 
ADD COLUMN entry_type TEXT DEFAULT 'reported' 
CHECK (entry_type IN ('planned', 'reported'));

-- Add index
CREATE INDEX idx_time_entries_entry_type 
ON public.time_entries(entry_type);

-- Update existing future entries
UPDATE public.time_entries 
SET entry_type = 'planned' 
WHERE start_time > NOW() AND entry_type = 'reported';
```

**Features:**
- ✅ Backward compatible (defaults to 'reported')
- ✅ Constraint ensures only valid values
- ✅ Automatically marks existing future entries as 'planned'
- ✅ Indexed for efficient queries

---

### 2. **TypeScript Types: `src/types/index.ts`**

```typescript
export interface TimeEntry {
  id: string;
  user_id: string;
  project_id: string;
  task_id?: string;
  description?: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  is_billable: boolean;
  hourly_rate?: number;
  tags?: string[];
  entry_type?: 'planned' | 'reported';  // ✨ NEW
  created_at: string;
  updated_at: string;
  // ... other fields
}
```

---

### 3. **Timetable Component: `src/pages/Timetable.tsx`**

#### New Imports
```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
```

#### New State Variables
```typescript
const [entryType, setEntryType] = useState<'planned' | 'reported'>('reported');
const [editEntryType, setEditEntryType] = useState<'planned' | 'reported'>('reported');
```

#### Smart Default Selection
```typescript
const handleSelectSlot = useCallback(({ start, end }: { start: Date; end: Date }) => {
  const now = new Date();
  const isFuture = start > now;
  
  setEntryType(isFuture ? 'planned' : 'reported');  // Smart default
  // ... rest of code
}, []);
```

#### Save with Entry Type
```typescript
await createTimeEntry({
  project_id: selectedProjectId,
  start_time: modalTimeSlot.startTime.toISOString(),
  end_time: modalTimeSlot.endTime.toISOString(),
  duration_minutes: duration,
  description: taskDescription || undefined,
  is_billable: true,
  entry_type: entryType,  // ✨ Include entry type
});
```

---

## 🎨 Modal UI Design

### Create Time Entry Modal

```
┌──────────────────────────────────────────┐
│  Create Time Entry                   [×] │
│  Monday, December 16, 2024               │
│  from 09:00 to 10:00 (60 minutes)        │
├──────────────────────────────────────────┤
│                                          │
│  ┌──────────────┬──────────────┐        │
│  │  Reported    │   Planned    │  ← Tabs│
│  └──────────────┴──────────────┘        │
│                                          │
│  Project                                 │
│  [Select a project...            ▼]     │
│                                          │
│  Description (Optional)                  │
│  ┌────────────────────────────────────┐ │
│  │ What did you work on?              │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ────────────────────────────────────── │
│                   [Cancel] [Create Entry]│
└──────────────────────────────────────────┘
```

### Tab Behavior

**Reported Tab:**
- For actual work done
- Placeholder: "What did you work on?"
- Creates entry with `entry_type: 'reported'`

**Planned Tab:**
- For future/scheduled work
- Placeholder: "What are you planning to work on?"
- Creates entry with `entry_type: 'planned'`

---

## 🔄 User Workflows

### Scenario 1: Logging Past Work (Reported)

1. **Click on past time slot** (e.g., yesterday 2 PM)
2. Modal opens with **"Reported" tab active** (auto-selected)
3. Select project and add description
4. Click "Create Entry"
5. Entry saved as **`entry_type: 'reported'`**

### Scenario 2: Planning Future Work (Planned)

1. **Click on future time slot** (e.g., tomorrow 10 AM)
2. Modal opens with **"Planned" tab active** (auto-selected)
3. Select project and add description
4. Click "Create Entry"
5. Entry saved as **`entry_type: 'planned'`**

### Scenario 3: Manually Changing Type

1. Click on any time slot
2. Modal opens with default tab
3. **Click the other tab** to switch
4. Enter details
5. Entry saved with selected type

### Scenario 4: Converting Planned to Reported

1. **Click on planned entry** (gray with dot)
2. Edit modal opens with **"Planned" tab active**
3. **Click "Reported" tab** to convert
4. Update details if needed
5. Click "Update"
6. Entry converted to reported type

---

## 📊 Database Impact

### Schema Changes

**Before:**
```sql
CREATE TABLE public.time_entries (
    id UUID PRIMARY KEY,
    user_id UUID,
    project_id UUID,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    duration_minutes INTEGER,
    -- ... other columns
);
```

**After:**
```sql
CREATE TABLE public.time_entries (
    id UUID PRIMARY KEY,
    user_id UUID,
    project_id UUID,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    duration_minutes INTEGER,
    entry_type TEXT DEFAULT 'reported',  -- ✨ NEW
    -- ... other columns
);
```

### Index Performance

```sql
CREATE INDEX idx_time_entries_entry_type 
ON public.time_entries(entry_type);
```

**Benefits:**
- Fast filtering by entry type
- Efficient queries like `WHERE entry_type = 'planned'`
- Minimal performance overhead

---

## 🎯 Use Cases

### 1. **Workload Planning**
- Create "planned" entries for upcoming week
- See what work is scheduled
- Convert to "reported" when work is done

### 2. **Capacity Planning**
- Query all "planned" entries for a team member
- Calculate available capacity
- Identify over/under allocation

### 3. **Project Forecasting**
- Sum "planned" hours per project
- Compare with "reported" hours
- Track progress vs. plan

### 4. **Time Reporting**
- Filter only "reported" entries
- Generate accurate timesheets
- Exclude planned work from reports

### 5. **Plan vs. Actual Analysis**
- Compare planned vs. reported hours
- Identify estimation accuracy
- Improve future planning

---

## 🔍 Query Examples

### Get All Planned Entries
```sql
SELECT * FROM time_entries 
WHERE entry_type = 'planned'
ORDER BY start_time;
```

### Get Reported Hours for Project
```sql
SELECT 
  SUM(duration_minutes) / 60 as total_hours
FROM time_entries
WHERE project_id = 'abc123'
  AND entry_type = 'reported';
```

### Compare Plan vs. Actual
```sql
SELECT 
  project_id,
  SUM(CASE WHEN entry_type = 'planned' THEN duration_minutes ELSE 0 END) / 60 as planned_hours,
  SUM(CASE WHEN entry_type = 'reported' THEN duration_minutes ELSE 0 END) / 60 as reported_hours
FROM time_entries
GROUP BY project_id;
```

### Future Planned Work
```sql
SELECT * FROM time_entries
WHERE entry_type = 'planned'
  AND start_time > NOW()
ORDER BY start_time;
```

---

## 🔧 Technical Details

### Migration Backward Compatibility

**Existing entries:**
- Automatically get `entry_type = 'reported'`
- Past entries remain as reported
- Future entries auto-converted to planned

**New entries:**
- Default to 'reported' if not specified
- Frontend explicitly sets the value
- No breaking changes for existing code

### TypeScript Type Safety

```typescript
// Type is enforced at compile time
const entryType: 'planned' | 'reported' = 'planned';

// Invalid values cause errors
const invalid: 'planned' | 'reported' = 'scheduled'; // ❌ Error
```

### State Management

```typescript
// Separate state for create and edit
const [entryType, setEntryType] = useState<'planned' | 'reported'>('reported');
const [editEntryType, setEditEntryType] = useState<'planned' | 'reported'>('reported');

// Smart defaults based on context
const isFuture = start > new Date();
setEntryType(isFuture ? 'planned' : 'reported');
```

---

## 📱 Responsive Behavior

### Desktop
- ✅ Full tabs visible
- ✅ Easy clicking between tabs
- ✅ Clear labels

### Tablet
- ✅ Tabs stack horizontally
- ✅ Touch-friendly targets
- ✅ Readable labels

### Mobile
- ✅ Tabs fill width
- ✅ Large touch targets
- ✅ May show abbreviated labels if needed

---

## ♿ Accessibility

### Keyboard Navigation
- ✅ Tab key navigates between tabs
- ✅ Arrow keys switch active tab
- ✅ Enter key selects tab

### Screen Readers
- ✅ Tabs announce role and state
- ✅ Selected tab announced
- ✅ Content changes announced

### Visual Clarity
- ✅ Clear active state (underline/background)
- ✅ High contrast labels
- ✅ Focus indicators

---

## 🎯 Benefits

### 1. **Clear Distinction**
- Explicit separation of planned vs. actual work
- No ambiguity about entry purpose
- Database-backed classification

### 2. **Better Reporting**
- Accurate timesheets (reported only)
- Workload forecasts (planned only)
- Plan vs. actual analysis

### 3. **Improved Planning**
- Schedule future work explicitly
- Track what's coming up
- Convert plans to actuals easily

### 4. **Flexible Workflow**
- Switch between types easily
- Change mind during entry
- Update type when editing

### 5. **Data Integrity**
- Database constraint ensures valid values
- Type-safe frontend code
- Indexed for performance

---

## 🐛 Edge Cases Handled

### 1. **Null/Undefined Values**
- Defaults to 'reported' if not specified
- Backward compatible with existing entries
- Migration handles all existing data

### 2. **Future Entries**
- Automatically suggested as 'planned'
- Can be overridden manually
- Smart defaults save time

### 3. **Past Entries**
- Default to 'reported'
- Unusual to plan work in the past
- Can still be set to 'planned' if needed

### 4. **Type Conversion**
- Easy to change type when editing
- No data loss during conversion
- Updates immediately

---

## 🚀 Future Enhancements

Possible improvements:

1. **Automatic Conversion**
   - Auto-convert 'planned' to 'reported' when edited after start time
   - Prompt user to convert when time passes

2. **Batch Operations**
   - Convert multiple planned entries to reported
   - Bulk edit entry types

3. **Reporting Filters**
   - Filter timetable by entry type
   - Show only planned or only reported

4. **Visual Indicators**
   - Different icons for planned vs. reported
   - Color coding beyond just future/past

5. **Statistics**
   - Show planned vs. reported hours in dashboard
   - Track planning accuracy

6. **Notifications**
   - Remind to log time for planned entries
   - Alert when planned work hasn't been reported

---

## 📝 Testing Checklist

- [x] Migration applied successfully
- [x] Database column exists with correct type
- [x] Index created
- [x] TypeScript types updated
- [x] Tabs appear in create modal
- [x] Tabs appear in edit modal
- [x] Future slots default to "Planned"
- [x] Past slots default to "Reported"
- [x] Can switch between tabs
- [x] Entry saves with correct type
- [x] Entry updates with new type
- [x] No linter errors
- [x] Backward compatible with existing entries

---

## 📚 Related Documentation

- [Timetable Future Entries Styling](./TIMETABLE_FUTURE_ENTRIES_STYLING.md)
- [Workload Planning Implementation](./WORKLOAD_PLANNING_IMPLEMENTATION.md)
- [Workload RLS Fix](./WORKLOAD_RLS_FIX.md)

---

## Summary

The time entry types feature adds explicit classification of time entries as either "planned" (future/scheduled work) or "reported" (actual logged time). The modal interface includes intuitive tabs for switching between types, with smart defaults based on the selected time slot. This enhancement enables better workload planning, accurate reporting, and plan-vs-actual analysis while maintaining full backward compatibility with existing data.

### Key Benefits:
- ✅ **Clear distinction** between planned and reported work
- ✅ **Database-backed** classification
- ✅ **Smart defaults** save time
- ✅ **Easy switching** via tabs
- ✅ **Backward compatible** with existing entries
- ✅ **Type-safe** implementation
- ✅ **Indexed** for performance

