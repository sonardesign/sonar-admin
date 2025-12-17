# Timetable - Day View Drill Down Feature

## Overview
Added the ability to click on day headers in the week view to drill down into a detailed day view. When in day view, a "Back to Week" button appears to allow easy navigation back to the weekly resolution.

## Implementation Date
December 16, 2025

---

## 🎯 Features

### 1. **Clickable Day Headers**
- Click any day header (Mon, Tue, Wed, etc.) in week view
- Instantly switches to day view for that specific day
- Cursor changes to pointer on hover
- Subtle background color change on hover

### 2. **Back to Week Button**
- Appears when in day view
- Positioned in the top-left corner of the calendar
- Has a left arrow icon for clear direction
- Click to return to week view
- Shadow for depth and visibility

### 3. **Smooth Navigation**
- View state managed seamlessly
- Date context preserved during transitions
- No page reload required
- Instant visual feedback

---

## 📁 Code Changes

### File: `src/pages/Timetable.tsx`

#### 1. **New Imports**
```typescript
import { ArrowLeft } from 'lucide-react';
```

#### 2. **Custom Header Component**
```typescript
// Custom Header Component
const CustomHeader = ({ 
  label, 
  date, 
  onDrillDown 
}: { 
  label: React.ReactNode; 
  date: Date;
  onDrillDown: (date: Date) => void;
}) => {
  return (
    <div 
      onClick={() => onDrillDown(date)}
      style={{ 
        cursor: 'pointer',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      title="Click to view day"
    >
      {label}
    </div>
  );
};
```

**What it does:**
- Wraps the default header label
- Makes entire header area clickable
- Calls `onDrillDown` with the specific date
- Shows tooltip "Click to view day"

#### 3. **Drill Down Handler**
```typescript
// Handle drill down to day view
const handleDrillDown = useCallback((date: Date) => {
  setView(Views.DAY);
  setCurrentDate(date);
}, []);
```

**What it does:**
- Switches view to DAY
- Updates current date to the clicked day
- Wrapped in `useCallback` for performance

#### 4. **Back to Week Handler**
```typescript
// Handle back to week view
const handleBackToWeek = useCallback(() => {
  setView(Views.WEEK);
}, []);
```

**What it does:**
- Switches view back to WEEK
- Date remains as previously selected
- Simple and efficient

#### 5. **Back to Week Button (in JSX)**
```tsx
<Card className="flex-1 flex flex-col overflow-hidden relative">
  {/* Back to Week Button */}
  {view === Views.DAY && (
    <div className="absolute top-2 left-2 z-20">
      <Button
        variant="outline"
        size="sm"
        onClick={handleBackToWeek}
        className="shadow-md"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Week
      </Button>
    </div>
  )}
  
  <DragAndDropCalendar
    {/* ... existing props ... */}
    components={{
      event: CustomEvent,
      week: {
        header: (props: any) => (
          <CustomHeader 
            label={props.label} 
            date={props.date}
            onDrillDown={handleDrillDown}
          />
        )
      }
    }}
  />
</Card>
```

**Key Changes:**
- ✅ Card made `relative` for absolute positioning
- ✅ Button conditionally rendered when `view === Views.DAY`
- ✅ Positioned absolute with `top-2 left-2` and `z-20`
- ✅ `shadow-md` for depth
- ✅ Custom header component added to `components.week.header`

---

### File: `src/styles/timetable.css`

#### 1. **Clickable Header Styling**
```css
.rbc-header {
  height: 36px;
  font-weight: 600;
  padding: 8px 6px;
  background-color: hsl(var(--muted));
  border-bottom: 1px solid hsl(var(--border));
  border-right: none !important;
  cursor: pointer;                      /* NEW: Show clickable cursor */
  transition: background-color 0.2s ease; /* NEW: Smooth hover effect */
}

.rbc-header:hover {                      /* NEW: Hover state */
  background-color: hsl(var(--muted) / 0.7);
}
```

**What it does:**
- Makes cursor change to pointer on hover
- Adds smooth background color transition
- Lightens background on hover for feedback

#### 2. **Relative Positioning for Button**
```css
/* Back to Week button positioning */
.rbc-time-view {
  position: relative;
}
```

**What it does:**
- Ensures absolute positioning of back button works correctly
- Provides positioning context

---

## 🎨 Visual Design

### Week View (with Clickable Headers)
```
┌────────────────────────────────────────────────┐
│ Mon   Tue   Wed   Thu   Fri   Sat   Sun       │  ← Clickable, cursor: pointer
│  15    16    17    18    19    20    21        │     Hover: lighter background
├────────────────────────────────────────────────┤
│ 9:00  ███████████████████████████████████      │
│10:00                                           │
│11:00  ███████████████████████████████████      │
└────────────────────────────────────────────────┘
       ↑ Click on any day header to drill down
```

### Day View (with Back Button)
```
┌────────────────────────────────────────────────┐
│ ◄ Back to Week │      Wednesday, Dec 18       │  ← Button appears
├────────────────────────────────────────────────┤
│ 9:00 AM  ████████████████████████████████      │
│10:00 AM                                        │
│11:00 AM  ████████████████████████████████      │
│12:00 PM                                        │
│ 1:00 PM  ████████████████████████████████      │
└────────────────────────────────────────────────┘
```

---

## 🔄 User Workflow

### Drilling Down to Day View

1. **View Week Calendar**
   - See all 7 days of the week
   - Hover over any day header
   - Background lightens (visual feedback)

2. **Click Day Header**
   - Click on "Wed 18" for example
   - View instantly switches to day view
   - Shows detailed hourly breakdown for that day
   - "Back to Week" button appears

3. **Navigate Within Day**
   - Scroll through hours
   - View all time entries for that day
   - Create/edit entries as usual
   - All existing functionality works

### Returning to Week View

1. **Click "Back to Week" Button**
   - Located top-left corner
   - Clear left arrow icon
   - Click to return

2. **View Returns to Week**
   - Shows the week containing the day you were viewing
   - Current date preserved
   - Can immediately click another day if needed

---

## 🎯 Use Cases

### 1. **Detailed Day Planning**
- Need to plan a busy day hour-by-hour
- Click on that day's header
- See full 24-hour timeline
- Add/adjust entries with precision

### 2. **Review Specific Day**
- Need to review what happened on Tuesday
- Click Tuesday header
- See all entries for that day
- Edit or add missing entries

### 3. **Focus Mode**
- Week view too cluttered
- Drill down to single day
- Focus on just today's tasks
- Less distraction

### 4. **Mobile/Small Screens**
- Week view cramped on mobile
- Drill down to day view
- More space per entry
- Easier touch interaction

---

## 🔧 Technical Details

### React Big Calendar Components Override

The custom header is registered via the `components` prop:

```typescript
components={{
  event: CustomEvent,
  week: {
    header: (props: any) => (
      <CustomHeader 
        label={props.label} 
        date={props.date}
        onDrillDown={handleDrillDown}
      />
    )
  }
}}
```

**How it works:**
- `week.header` overrides default week view headers
- Receives `label` (day name/date) and `date` (Date object)
- Custom component wraps label with click handler
- Only affects week view headers (not day view)

### View State Management

```typescript
const [view, setView] = useState<typeof Views.WEEK | typeof Views.DAY>(Views.WEEK);
```

- Simple state toggle between WEEK and DAY
- No complex state machine needed
- React Big Calendar handles the rest

### Date Management

```typescript
const [currentDate, setCurrentDate] = useState(new Date());
```

- Clicking day header updates `currentDate` to that specific day
- React Big Calendar automatically centers on that date in day view
- Returning to week view keeps the date context

---

## 📱 Responsive Behavior

### Desktop
- ✅ Hover effects work smoothly
- ✅ Button positioned top-left with good spacing
- ✅ Full day names visible in headers

### Tablet
- ✅ Touch targets are large enough
- ✅ Button remains accessible
- ✅ Abbreviated day names may show

### Mobile
- ✅ Touch-friendly day headers
- ✅ Button positioned to not interfere with content
- ✅ Day view particularly useful on small screens

---

## ♿ Accessibility Considerations

### Keyboard Navigation
- Headers are clickable divs (not ideal for keyboard)
- Could be improved with button elements and keyboard handlers
- Current implementation mouse/touch focused

### Screen Readers
- Tooltip provides context: "Click to view day"
- Button has clear text: "Back to Week"
- Arrow icon enhances visual understanding

### Future Improvements
1. Add keyboard support for header clicks
2. Add ARIA labels for better screen reader support
3. Add keyboard shortcut (e.g., "W" for week, "D" for day)

---

## 🎯 Benefits

### 1. **Better Context Switching**
- Quick drill-down for detailed view
- Easy return to overview
- No need for separate navigation menu

### 2. **Improved Focus**
- Reduce visual clutter when needed
- Focus on one day at a time
- Better for detail-oriented tasks

### 3. **Intuitive Interaction**
- Common UI pattern (calendar apps)
- Natural click target (day headers)
- Clear back navigation

### 4. **No Disruption**
- Existing functionality unchanged
- Additive feature only
- Optional interaction

---

## 🔄 Comparison with Other Calendar Apps

### Google Calendar
- ✅ Similar: Click day number to drill down
- ✅ Similar: Shows week/day toggle
- ❌ Different: Uses toolbar for navigation

### Outlook Calendar
- ✅ Similar: Clickable day headers
- ✅ Similar: Back button to return
- ✅ Similar: Hover effects

### Apple Calendar
- ✅ Similar: Click to focus on day
- ❌ Different: Uses sidebar navigation
- ✅ Similar: Visual hierarchy

**Our Implementation:**
- ✅ Combines best practices from multiple apps
- ✅ Clean, minimal approach
- ✅ Consistent with existing UI

---

## 🐛 Known Limitations

1. **No Keyboard Support**
   - Headers only clickable with mouse/touch
   - Could add keyboard handlers

2. **No Animation**
   - View switch is instant
   - Could add slide/fade transition

3. **Button Always Visible**
   - Button shows immediately in day view
   - Could add fade-in animation

4. **No View Memory**
   - Doesn't remember if you came from week or month
   - Always returns to week view

---

## 🚀 Future Enhancements

Possible improvements:
1. **Keyboard shortcuts**: W for week, D for day
2. **Smooth transitions**: Slide animation between views
3. **Breadcrumb navigation**: Show week context in day view
4. **Mini week preview**: Show week overview alongside day view
5. **Swipe gestures**: Swipe left/right for previous/next day
6. **View history**: Browser back button returns to previous view
7. **Configurable default**: Allow users to set preferred view

---

## 📝 Testing Checklist

- [x] Day headers are clickable in week view
- [x] Cursor changes to pointer on hover
- [x] Background changes on hover
- [x] Clicking header switches to day view
- [x] Correct day is shown in day view
- [x] "Back to Week" button appears in day view
- [x] Button is positioned correctly (top-left)
- [x] Button has shadow for depth
- [x] Clicking button returns to week view
- [x] Week shows correct date range after returning
- [x] All time entry CRUD operations work in day view
- [x] Drag and drop works in day view
- [x] No linter errors
- [x] Responsive on mobile

---

## 📚 Related Documentation

- [Timetable Future Entries Styling](./TIMETABLE_FUTURE_ENTRIES_STYLING.md)
- [Primary Color Update](./PRIMARY_COLOR_UPDATE.md)
- [React Big Calendar Documentation](https://github.com/jquense/react-big-calendar)

---

## Summary

The day view drill-down feature provides an intuitive way to switch between week and day views in the timetable. Users can click on any day header to zoom into that day's schedule, and easily return to the week view with a clearly positioned "Back to Week" button. This enhancement improves both navigation and focus, following common calendar UI patterns that users are familiar with.

### Key Benefits:
- ✅ **Intuitive navigation** - Click headers to drill down
- ✅ **Easy return** - Clear back button
- ✅ **Better focus** - Detailed day view when needed
- ✅ **Familiar pattern** - Common in calendar apps
- ✅ **No disruption** - Existing features work the same
- ✅ **Responsive** - Works on all screen sizes

