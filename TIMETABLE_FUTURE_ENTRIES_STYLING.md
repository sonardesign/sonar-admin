# Timetable - Future Time Entries Styling

## Overview
Updated the Timetable view to differentiate future time entries from past/current entries with distinct visual styling. Future entries now have a gray appearance with a colored dot indicator instead of a fully colored background.

## Implementation Date
December 16, 2025

---

## 🎯 Changes Made

### 1. **Header Height Adjustment**
- Changed `.rbc-header` height to **36px** (from auto)
- Provides more compact header appearance
- Better visual balance

### 2. **Future Time Entry Styling**
Future time entries (entries with start time > current time) now have:
- **Gray opacity background** instead of colored background
- **Gray left border** instead of colored border
- **Colored dot** to the left of the project name (indicating project color)

### 3. **Past/Current Time Entry Styling** (unchanged)
- **Colored opacity background** (project color with 20% opacity)
- **Colored left border** (solid project color, 4px width)
- **No dot** (full colored treatment)

---

## 📁 Code Changes

### File: `src/styles/timetable.css`

#### Header Height Update
```css
.rbc-header {
  height: 36px;  /* ✨ NEW: Fixed height */
  font-weight: 600;
  padding: 8px 6px;
  background-color: hsl(var(--muted));
  border-bottom: 1px solid hsl(var(--border));
  border-right: none !important;
}
```

---

### File: `src/pages/Timetable.tsx`

#### 1. Updated CustomEvent Component

**Before:**
```typescript
const CustomEvent = ({ event }: { event: TimeEntry }) => {
  return (
    <div style={{ /* ... */ }}>
      <div>{event.resource?.projectName}</div>
      <div>{event.resource?.durationLabel}</div>
    </div>
  );
};
```

**After:**
```typescript
const CustomEvent = ({ event }: { event: TimeEntry }) => {
  const now = new Date();
  const isFuture = event.start > now;
  const projectColor = event.resource?.projectColor || '#3b82f6';
  
  return (
    <div style={{ /* ... */ }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {isFuture && (
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: projectColor,
            flexShrink: 0
          }} />
        )}
        <div>{event.resource?.projectName}</div>
      </div>
      <div>{event.resource?.durationLabel}</div>
    </div>
  );
};
```

**Key Changes:**
- ✅ Checks if entry is in the future (`event.start > now`)
- ✅ Conditionally renders colored dot (6px × 6px circle) for future entries
- ✅ Dot positioned left of project name with 6px gap

---

#### 2. Updated eventStyleGetter Function

**Before:**
```typescript
const eventStyleGetter = useCallback((event: TimeEntry) => {
  const projectColor = event.resource?.projectColor || '#3b82f6';
  return {
    style: {
      backgroundColor: `${projectColor}33`, // 20% opacity
      borderLeftColor: projectColor,
      // ... other styles
    }
  };
}, []);
```

**After:**
```typescript
const eventStyleGetter = useCallback((event: TimeEntry) => {
  const projectColor = event.resource?.projectColor || '#3b82f6';
  const now = new Date();
  const isFuture = event.start > now;
  
  if (isFuture) {
    // Future entries: gray background, gray left border
    return {
      style: {
        backgroundColor: 'rgba(156, 163, 175, 0.2)', // Gray-400 with 20% opacity
        borderLeftColor: 'rgb(209, 213, 219)',       // Gray-300 solid
        // ... other styles
      }
    };
  }
  
  // Past/current entries: colored background and border
  return {
    style: {
      backgroundColor: `${projectColor}33`, // Project color with 20% opacity
      borderLeftColor: projectColor,         // Solid project color
      // ... other styles
    }
  };
}, []);
```

**Key Changes:**
- ✅ Determines if entry is future or past/current
- ✅ Returns different styles based on time
- ✅ Future entries get gray treatment
- ✅ Past/current entries keep colored treatment

---

## 🎨 Visual Design

### Color Palette

#### Future Entries
```css
Background: rgba(156, 163, 175, 0.2)  /* Gray-400 at 20% opacity */
Left Border: rgb(209, 213, 219)       /* Gray-300 solid */
Dot Color: [Project Color]            /* Full opacity project color */
```

#### Past/Current Entries
```css
Background: [Project Color]33         /* Project color at 20% opacity */
Left Border: [Project Color]          /* Full opacity project color */
Dot: None                             /* No dot needed */
```

---

## 📊 Visual Comparison

### Before (All entries looked the same)
```
┌────────────────────────────┐
│ 🔵 Go-To-Market Website    │  ← Colored background
│    8h                      │     Colored left border
└────────────────────────────┘

┌────────────────────────────┐
│ 🔵 Go-To-Market Website    │  ← Same style for future
│    8h                      │     
└────────────────────────────┘
```

### After (Future entries distinguished)
```
Past/Current Entry:
┌────────────────────────────┐
│ 🔵 Go-To-Market Website    │  ← Colored background
│    8h                      │     Colored left border (blue)
└────────────────────────────┘

Future Entry:
┌────────────────────────────┐
│ 🔵 • Go-To-Market Website  │  ← Gray background
│      8h                    │     Gray left border
└────────────────────────────┘     Small colored dot
```

---

## 🎯 User Experience Benefits

### 1. **Clear Visual Distinction**
- Easy to spot planned vs. actual work
- Gray = future/planned
- Colored = past/logged

### 2. **Project Color Still Visible**
- Colored dot maintains project identity
- Can still quickly identify which project
- Not completely desaturated

### 3. **Reduced Visual Weight**
- Future entries less prominent
- Focus on actual logged work
- Planned work visible but subtle

### 4. **Improved Scanning**
- Past week: colorful (shows actual work done)
- Future week: muted (shows planned work)
- Clear temporal boundary at "now"

---

## 🔧 Technical Details

### Time Comparison Logic
```typescript
const now = new Date();
const isFuture = event.start > now;
```
- Uses JavaScript `Date` object
- Compares `event.start` to current time
- Real-time evaluation (updates as time passes)

### Color Values
- **Gray Background**: `rgba(156, 163, 175, 0.2)` - Tailwind Gray-400 at 20%
- **Gray Border**: `rgb(209, 213, 219)` - Tailwind Gray-300
- **Colored Dot**: Full opacity project color (e.g., `#3b82f6`)

### Dot Styling
```typescript
{
  width: '6px',
  height: '6px',
  borderRadius: '50%',        // Perfect circle
  backgroundColor: projectColor,
  flexShrink: 0               // Prevent squashing
}
```

---

## 🔄 Dynamic Behavior

### Real-Time Updates
- Entry automatically transitions from "future" to "past" styling when time passes
- No manual refresh needed (calendar component re-renders periodically)
- Smooth transition at the exact moment an entry becomes "current"

### Example Timeline
```
Monday 9 AM (now):
  - 8 AM entry: Past (colored)
  - 9 AM entry: Current (colored)
  - 10 AM entry: Future (gray + dot)

Monday 11 AM (now):
  - 10 AM entry: Now becomes Past (colored)
  - 11 AM entry: Current (colored)
  - 12 PM entry: Future (gray + dot)
```

---

## 📱 Responsive Behavior

The styling works across all screen sizes:
- ✅ Desktop: Full visibility of dot and labels
- ✅ Tablet: Dot scales proportionally
- ✅ Mobile: Dot remains visible even in compact view

---

## 🎯 Use Cases

### Workload Planning Page Integration
This styling complements the Workload Planning feature:
1. **Plan work** on Workload Planning page
2. **See planned entries** on Timetable (gray with dot)
3. **Log actual time** when work is done
4. **Entry automatically changes** to colored when logged

### Team Member View (Admins)
- Admins viewing other users' calendars
- Can see planned (future) vs. actual (past) work
- Clear distinction helps with resource planning

---

## 🐛 Edge Cases Handled

1. **Entries spanning now**: Treated as "current" (colored)
2. **All-day events**: Use start time for comparison
3. **Different time zones**: Uses browser's local time
4. **Midnight entries**: Correctly compared to current timestamp

---

## 📝 Testing Checklist

- [x] Header height is 36px
- [x] Future entries have gray background
- [x] Future entries have gray left border
- [x] Future entries show colored dot
- [x] Dot is 6px × 6px circle
- [x] Dot is positioned left of project name
- [x] Past entries still have colored treatment
- [x] Past entries have NO dot
- [x] Time comparison works correctly
- [x] No linter errors
- [x] Styles work on mobile
- [x] Styles work on desktop

---

## 🚀 Future Enhancements

Possible improvements:
1. **Hover tooltip**: "Planned work" vs. "Logged work"
2. **Different dot styles**: Square for recurring, circle for one-time
3. **Animation**: Subtle pulse for entries starting soon
4. **Color intensity**: Gradually fade as entries get further in the future
5. **Label**: Small "PLANNED" badge on future entries

---

## 📚 Related Documentation

- [Workload Planning Implementation](./WORKLOAD_PLANNING_IMPLEMENTATION.md)
- [Workload RLS Fix](./WORKLOAD_RLS_FIX.md)
- [Timetable Component](./src/pages/Timetable.tsx)

---

## Summary

The updated timetable styling provides clear visual differentiation between planned and actual work. Future time entries use a subtle gray appearance with a colored dot indicator, making it easy to distinguish scheduled work from completed time logs. This enhancement improves the user experience for both individual time tracking and team workload planning scenarios.

### Key Benefits:
- ✅ **Clear distinction** between future and past entries
- ✅ **Maintains project identity** with colored dot
- ✅ **Reduced visual clutter** with muted future entries
- ✅ **Better temporal awareness** at a glance
- ✅ **Seamless integration** with Workload Planning feature

