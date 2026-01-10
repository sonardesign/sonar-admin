import React from 'react'
import { cn } from '../lib/utils'

interface TimeEntryBarProps {
  entry: {
    id: string
    project_id: string
    user_id: string
    start_time: string
    end_time: string
    duration_minutes: number
    description?: string
    entry_type?: 'planned' | 'reported'
  }
  projectColor: string
  projectName: string
  mode: 'timetable' | 'forecast'
  style?: React.CSSProperties
  onMouseDown?: (e: React.MouseEvent) => void
  onClick?: () => void
  className?: string
}

export const TimeEntryBar: React.FC<TimeEntryBarProps> = ({
  entry,
  projectColor,
  projectName,
  mode,
  style,
  onMouseDown,
  onClick,
  className
}) => {
  const hours = Math.round(entry.duration_minutes / 60 * 10) / 10
  const now = new Date()
  const isPlanned = entry.entry_type === 'planned' || new Date(entry.start_time) > now

  if (mode === 'forecast') {
    // Forecast mode: Full solid background color
    return (
      <div
        className={cn(
          "absolute inset-y-1 rounded px-2 py-1 cursor-move group",
          "flex items-center justify-between",
          "hover:opacity-90 transition-opacity",
          className
        )}
        style={{
          ...style,
          backgroundColor: projectColor,
          zIndex: 5
        }}
        onMouseDown={onMouseDown}
        onClick={onClick}
      >
        {/* Left resize handle */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 z-10"
          data-resize="left"
        />
        
        <span className="text-white text-xs font-semibold truncate px-2">
          {hours}h
        </span>
        
        {/* Right resize handle */}
        <div 
          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 z-10"
          data-resize="right"
        />
      </div>
    )
  }

  // Timetable mode: This is handled by react-big-calendar's CustomEvent component
  // But we keep this here for consistency
  return null
}





