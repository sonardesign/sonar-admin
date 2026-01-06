# Forecast Today Indicator - December 21, 2024

## Changes

### 1. **Start from Current Day**
Changed the forecast table to start from today instead of Monday of the current week.

**Before:**
```typescript
const [currentWeekStart, setCurrentWeekStart] = useState(() => {
  const today = new Date()
  const day = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? -6 : 1) // Adjust to Monday
  const monday = new Date(today.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday
})
```

**After:**
```typescript
const [currentWeekStart, setCurrentWeekStart] = useState(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
})
```

### 2. **Add `isToday` Property to Days**
Updated the weeks generation to include an `isToday` flag for each day.

```typescript
const weeks = useMemo(() => {
  const result = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]
  
  for (let weekOffset = 0; weekOffset < 3; weekOffset++) {
    // ... generate days
    days.push({
      date: dateStr,
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: date.getDate(),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      isToday: dateStr === todayStr  // ✅ Added
    })
  }
  return result
}, [currentWeekStart])
```

### 3. **Visual Today Indicator**
Updated table headers to highlight today's column with:
- Light blue background (`bg-primary/10`)
- Primary color text for day name and number
- Bottom border line in primary color

```tsx
<th
  className={cn(
    "px-2 py-3 text-center text-xs font-medium relative",
    "w-[80px] min-w-[80px] max-w-[80px]",
    day.isWeekend && "bg-muted/30",
    day.isToday && "bg-primary/10",  // ✅ Background highlight
    dayIdx === 0 && weekIdx > 0 && "border-l-2 border-border"
  )}
>
  <div className={cn(day.isToday && "text-primary font-semibold")}>
    {day.dayName}
  </div>
  <div className={cn("text-muted-foreground", day.isToday && "text-primary font-semibold")}>
    {day.dayNumber}
  </div>
  {day.isToday && (
    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />  // ✅ Bottom line
  )}
</th>
```

### 4. **Updated "Today" Button**
Fixed the "Today" button to go to current day instead of Monday.

```typescript
const goToToday = () => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  setCurrentWeekStart(today)
}
```

## Visual Result

**Today's column now has:**
- ✅ Light blue background
- ✅ Primary color text (day name and number in bold)
- ✅ Primary color bottom border line
- ✅ Stands out from other days

**Weekend columns:**
- Gray background (`bg-muted/30`)

**Regular days:**
- White background

## Files Modified
- `src/pages/WorkloadPlanning.tsx`
  - Updated `currentWeekStart` initialization
  - Added `isToday` property to day objects
  - Updated table header styling for both views (Projects and Team Members)
  - Fixed `goToToday` function

## Testing
1. ✅ Open Forecast page
2. ✅ Today's column should be highlighted with blue background
3. ✅ Today's date should be in primary color and bold
4. ✅ A blue line should appear at the bottom of today's header
5. ✅ Click "Today" button to navigate back to current day
6. ✅ Use Previous/Next buttons to navigate weeks



