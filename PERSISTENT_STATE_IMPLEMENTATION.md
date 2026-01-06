# Persistent State Management Implementation

## Overview
Implemented persistent state management using localStorage to preserve user preferences and navigation state across page refreshes.

## New Hook: `usePersistentState`

**Location:** `src/hooks/usePersistentState.ts`

### Features

#### 1. `usePersistentState<T>`
A generic hook that works like `useState` but persists to localStorage:

```typescript
const [value, setValue] = usePersistentState('key', defaultValue);
```

- Automatically saves to localStorage on every update
- Loads from localStorage on mount
- Type-safe with TypeScript generics
- Handles errors gracefully

#### 2. `useLastPage`
Tracks the last visited page:

```typescript
const { saveLastPage, getLastPage } = useLastPage();
```

## Implementation Details

### 1. Global Page Tracking (`Layout.tsx`)

Every page change is automatically tracked:

```typescript
const { saveLastPage } = useLastPage();

useEffect(() => {
  saveLastPage(location.pathname);
}, [location.pathname, saveLastPage]);
```

**Stored:** `lastPage` → Current route path

### 2. Projects Page (`Projects.tsx`)

#### Persistent Filters:
- **Status Filter** → `projects_statusFilter` (e.g., "all", "active", "completed")
- **Client Filter** → `projects_clientFilter` (e.g., "all", or specific client name)
- **Group By** → `projects_groupBy` (e.g., "none", "status", "client", "last_edited")

```typescript
const [statusFilter, setStatusFilter] = usePersistentState('projects_statusFilter', 'all');
const [clientFilter, setClientFilter] = usePersistentState('projects_clientFilter', 'all');
const [groupBy, setGroupBy] = usePersistentState<'none' | 'status' | 'client' | 'last_edited'>('projects_groupBy', 'none');
```

**User Experience:**
- Set filters → Refresh page → Filters remain the same
- Group projects by client → Refresh → Still grouped by client

### 3. Timetable Page (`Timetable.tsx`)

#### Persistent State:
- **Current Date** → `timetable_currentDate` (ISO string)
- **View Mode** → `timetable_view` (week or day)
- **Selected User** → `timetable_selectedUserId` (for admins viewing others' entries)
- **Scroll Position** → `timetable_scrollPosition` (minutes from midnight)

```typescript
const [currentDateISO, setCurrentDateISO] = usePersistentState('timetable_currentDate', new Date().toISOString());
const [view, setView] = usePersistentState<typeof Views.WEEK | typeof Views.DAY>('timetable_view', Views.WEEK);
const [selectedUserId, setSelectedUserId] = usePersistentState('timetable_selectedUserId', user?.id || '');
const [scrollPosition, setScrollPosition] = usePersistentState('timetable_scrollPosition', 540); // 9 AM
```

**Scroll Tracking:**
```typescript
useEffect(() => {
  const handleScroll = () => {
    const timeColumn = document.querySelector('.rbc-time-content');
    if (timeColumn) {
      const scrollTop = timeColumn.scrollTop;
      const minutesPerPixel = 1440 / timeColumn.scrollHeight;
      const scrollMinutes = Math.floor(scrollTop * minutesPerPixel);
      setScrollPosition(scrollMinutes);
    }
  };

  const timeColumn = document.querySelector('.rbc-time-content');
  if (timeColumn) {
    timeColumn.addEventListener('scroll', handleScroll);
    return () => timeColumn.removeEventListener('scroll', handleScroll);
  }
}, [view]);
```

**User Experience:**
- Navigate to a specific week → Refresh → Still on that week
- Scroll to 2 PM → Refresh → Still scrolled to 2 PM
- Switch to user "John" (admin) → Refresh → Still viewing John's entries

### 4. Week Start Fix

Changed week calculations to use ISO weeks (Monday-Sunday):

**Before:**
```typescript
moment(currentDate).startOf('week') // Sunday-Saturday
```

**After:**
```typescript
moment(currentDate).startOf('isoWeek') // Monday-Sunday
```

**Changes Applied:**
- Week display: `{moment(currentDate).startOf('isoWeek').format('MMM D')} - {moment(currentDate).endOf('isoWeek').format('MMM D, YYYY')}`
- Previous week: `moment(currentDate).subtract(1, 'isoWeek')`
- Next week: `moment(currentDate).add(1, 'isoWeek')`
- Calendar culture: `culture="en-GB"` (ensures Monday start)

## LocalStorage Keys

### Global
- `lastPage` - Last visited route

### Projects Page
- `projects_statusFilter` - Current status filter
- `projects_clientFilter` - Current client filter
- `projects_groupBy` - Current grouping option

### Timetable Page
- `timetable_currentDate` - Current calendar date (ISO string)
- `timetable_view` - Current view (week/day)
- `timetable_selectedUserId` - Selected user ID (admins)
- `timetable_scrollPosition` - Scroll position in minutes

## Benefits

### User Experience
1. **Continuity** - No jarring resets when refreshing
2. **Efficiency** - Don't have to re-apply filters every time
3. **Context Preservation** - Stay where you were working
4. **Less Friction** - Natural, desktop-app-like experience

### Technical Benefits
1. **Type-Safe** - Full TypeScript support
2. **Reusable** - Single hook works everywhere
3. **Error Handling** - Graceful fallbacks for localStorage issues
4. **Performance** - Minimal overhead, only updates on change

## Testing

### Projects Page
1. Go to Projects page
2. Set filter: Status = "Active"
3. Set Group By = "Client"
4. Refresh page (F5)
5. ✅ Filters should remain: Active + Grouped by Client

### Timetable Page
1. Go to Timetable
2. Navigate to next week
3. Scroll down to 3 PM
4. (If admin) Select a different user
5. Refresh page (F5)
6. ✅ Should remain: Same week + Scrolled to 3 PM + Same user selected

### Week Start
1. Go to Timetable
2. Check the week view
3. ✅ Week should start on Monday
4. ✅ Week should end on Sunday
5. Use Previous/Next week navigation
6. ✅ Should jump by Monday-Sunday weeks

### Page Tracking
1. Navigate to Projects page
2. Check localStorage: `localStorage.getItem('lastPage')`
3. ✅ Should be `/projects`
4. Navigate to Timetable
5. ✅ Should update to `/timetable`

## Browser Compatibility

Works in all modern browsers that support:
- localStorage API
- JSON.parse/stringify
- ES6 features

**Fallback:** If localStorage fails, hooks gracefully fall back to regular state (session-only).

## Future Enhancements

Potential additions:
- Persist table sorting state
- Persist column visibility
- Persist sidebar collapse state
- Sync state across tabs (using storage events)
- Add expiration times for stale data
- Compress large state objects

