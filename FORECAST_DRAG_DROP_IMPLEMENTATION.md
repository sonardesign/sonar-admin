# Forecast Drag-and-Drop Implementation

## Overview
Implemented a reusable drag-and-drop system for time entry management that works in both Timetable (vertical) and Forecast (horizontal) views.

## Architecture

### 1. **TimeEntryBar Component** (`src/components/TimeEntryBar.tsx`)
- Reusable visual component for time entries
- Supports two modes: `'timetable'` and `'forecast'`
- **Forecast mode**: Full solid background color with project color
- **Timetable mode**: Handled by react-big-calendar's CustomEvent
- Features:
  - Left and right resize handles
  - Hover effects
  - Click handlers for editing
  - Mouse down handlers for dragging

### 2. **useForecastDragAndDrop Hook** (`src/hooks/useForecastDragAndDrop.ts`)
- Custom React hook for horizontal drag-and-drop logic
- Manages drag state (create, move, resize-left, resize-right)
- Features:
  - **Create**: Click and drag to create new entries spanning multiple days
  - **Move**: Drag existing entries horizontally across days
  - **Resize**: Drag left or right edges to adjust duration
  - Snap to day boundaries
  - Same-row constraint (can't drag across different project/user rows)
  - Drag preview rendering

### 3. **Updated WorkloadPlanning.tsx**
- Integrated drag-and-drop functionality
- Interactive table cells with mouse event handlers
- Entry rendering with proper positioning
- Create and Edit modals for CRUD operations

## Features

### Drag-to-Create
1. Click and hold on any empty cell
2. Drag horizontally across days
3. Release to open creation modal
4. Modal shows:
   - Selected time window (from/to dates)
   - Duration calculation
   - Hours input field

### Drag-to-Move
1. Click and hold on an existing entry
2. Drag horizontally to new position
3. Release to update entry
4. Maintains original duration

### Drag-to-Resize
1. Hover over entry edges (left or right)
2. Click and drag to resize
3. Release to update entry
4. Adjusts duration accordingly

### Click-to-Edit
1. Click on an existing entry (without dragging)
2. Opens edit modal with:
   - Project selector
   - User selector
   - Hours input
   - Delete button

## Visual Design

### Forecast Entries
- **Full solid background** with project color
- White text for hours display
- Rounded corners
- Hover opacity effect
- Resize handles on edges (hover to see)

### Drag Preview
- Semi-transparent blue rectangle
- Shows where entry will be created/moved
- Follows mouse during drag

## Technical Details

### Date Handling
- Entries snap to day boundaries
- Start time: 9:00 AM
- End time: 5:00 PM
- Duration calculated in minutes

### Row Keys
- Format: `{projectId}-{userId}`
- Used to constrain drag operations to same row
- Prevents cross-row dragging

### State Management
- `dragState`: Tracks current drag operation
- `dragOccurred`: Prevents click event after drag
- `modalData`: Stores form data for create/edit

### Performance
- Memoized calculations for weeks and days
- Efficient entry filtering by row
- Minimal re-renders during drag

## Usage

### By Project View
- Top-level rows: Project entries (all users)
- Expanded rows: Per-user entries within project

### By Team Member View
- Rows: Individual team members
- Shows all projects for each member

## Future Enhancements
- Multi-day selection with keyboard shortcuts
- Bulk operations (copy, paste, delete)
- Drag-and-drop between rows (with confirmation)
- Weekly/daily fragmentation toggle
- Undo/redo functionality



