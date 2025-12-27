import { useState, useRef, useEffect, useCallback } from 'react'

interface DragState {
  isDragging: boolean
  type: 'create' | 'move' | 'resize-left' | 'resize-right' | null
  rowKey: string | null // projectId-userId combination
  startDate: string | null
  endDate: string | null
  entry: any | null
}

interface UseForecastDragAndDropProps {
  allDays: Array<{ date: string; dayName: string; dayNumber: number; isWeekend: boolean }>
  onCreateEntry: (data: {
    projectId: string
    userId: string
    startDate: string
    endDate: string
    durationDays: number
    durationHours: number
  }) => void
  onUpdateEntry: (entryId: string, data: {
    start_time: string
    end_time: string
    duration_minutes: number
  }) => void
}

export const useForecastDragAndDrop = ({
  allDays,
  onCreateEntry,
  onUpdateEntry
}: UseForecastDragAndDropProps) => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    type: null,
    rowKey: null,
    startDate: null,
    endDate: null,
    entry: null
  })

  const dragOccurred = useRef(false)

  // Start drag
  const handleMouseDown = useCallback((
    e: React.MouseEvent,
    date: string,
    projectId?: string,
    userId?: string,
    entry?: any
  ) => {
    e.preventDefault()
    e.stopPropagation()
    
    const rowKey = `${projectId || 'none'}___${userId || 'none'}`
    
    if (entry) {
      // Check if clicking on resize handles
      const target = e.target as HTMLElement
      const resizeType = target.getAttribute('data-resize')
      
      if (resizeType === 'left') {
        setDragState({
          isDragging: true,
          type: 'resize-left',
          rowKey,
          startDate: entry.start_time.split('T')[0],
          endDate: entry.end_time.split('T')[0],
          entry
        })
      } else if (resizeType === 'right') {
        setDragState({
          isDragging: true,
          type: 'resize-right',
          rowKey,
          startDate: entry.start_time.split('T')[0],
          endDate: entry.end_time.split('T')[0],
          entry
        })
      } else {
        // Moving entry
        setDragState({
          isDragging: true,
          type: 'move',
          rowKey,
          startDate: date,
          endDate: date,
          entry
        })
      }
    } else {
      // Creating new entry
      setDragState({
        isDragging: true,
        type: 'create',
        rowKey,
        startDate: date,
        endDate: date,
        entry: null
      })
    }
    
    dragOccurred.current = false
  }, [])

  // Continue drag
  const handleMouseEnter = useCallback((
    date: string,
    projectId?: string,
    userId?: string
  ) => {
    if (!dragState.isDragging) return
    
    const rowKey = `${projectId || 'none'}___${userId || 'none'}`
    
    // Only update if we're in the same row
    if (dragState.rowKey === rowKey) {
      dragOccurred.current = true
      
      if (dragState.type === 'create') {
        setDragState(prev => ({ ...prev, endDate: date }))
      } else if (dragState.type === 'move' && dragState.entry) {
        // Calculate offset
        const startIdx = allDays.findIndex(d => d.date === dragState.startDate)
        const currentIdx = allDays.findIndex(d => d.date === date)
        const offset = currentIdx - startIdx
        
        const entryStartIdx = allDays.findIndex(d => d.date === dragState.entry.start_time.split('T')[0])
        const entryEndIdx = allDays.findIndex(d => d.date === dragState.entry.end_time.split('T')[0])
        const duration = entryEndIdx - entryStartIdx
        
        const newStartIdx = entryStartIdx + offset
        const newEndIdx = newStartIdx + duration
        
        if (newStartIdx >= 0 && newEndIdx < allDays.length) {
          setDragState(prev => ({
            ...prev,
            startDate: allDays[newStartIdx].date,
            endDate: allDays[newEndIdx].date
          }))
        }
      } else if (dragState.type === 'resize-left') {
        setDragState(prev => ({ ...prev, startDate: date }))
      } else if (dragState.type === 'resize-right') {
        setDragState(prev => ({ ...prev, endDate: date }))
      }
    }
  }, [dragState, allDays])

  // End drag
  const handleMouseUp = useCallback(async () => {
    if (!dragState.isDragging) return
    
    const { type, startDate, endDate, entry, rowKey } = dragState
    
    if (!startDate || !endDate || !rowKey) {
      setDragState({
        isDragging: false,
        type: null,
        rowKey: null,
        startDate: null,
        endDate: null,
        entry: null
      })
      return
    }
    
    // Parse rowKey
    const [projectId, userId] = rowKey.split('___').map(s => s === 'none' ? undefined : s)
    
    // Ensure dates are in correct order
    const start = new Date(startDate)
    const end = new Date(endDate)
    const orderedStart = start < end ? start : end
    const orderedEnd = start < end ? end : start
    
    // Set times (9am to 5pm)
    orderedStart.setHours(9, 0, 0, 0)
    orderedEnd.setHours(17, 0, 0, 0)
    
    const durationMs = orderedEnd.getTime() - orderedStart.getTime()
    const durationMinutes = Math.round(durationMs / (1000 * 60))
    const durationDays = Math.ceil(durationMinutes / (24 * 60))
    const durationHours = Math.round((durationMinutes % (24 * 60)) / 60)
    
    try {
      if (type === 'create' && projectId && userId) {
        // Create new entry
        onCreateEntry({
          projectId,
          userId,
          startDate: orderedStart.toISOString(),
          endDate: orderedEnd.toISOString(),
          durationDays,
          durationHours
        })
      } else if ((type === 'move' || type === 'resize-left' || type === 'resize-right') && entry) {
        // Update existing entry
        onUpdateEntry(entry.id, {
          start_time: orderedStart.toISOString(),
          end_time: orderedEnd.toISOString(),
          duration_minutes: durationMinutes
        })
      }
    } catch (error) {
      console.error('Error updating entry:', error)
    }
    
    setDragState({
      isDragging: false,
      type: null,
      rowKey: null,
      startDate: null,
      endDate: null,
      entry: null
    })
  }, [dragState, allDays, onCreateEntry, onUpdateEntry])

  // Add/remove global mouseup listener
  useEffect(() => {
    if (dragState.isDragging) {
      document.body.classList.add('is-dragging')
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.body.classList.remove('is-dragging')
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [dragState.isDragging, handleMouseUp])

  // Get drag preview position
  const getDragPreview = useCallback(() => {
    if (!dragState.isDragging || !dragState.startDate || !dragState.endDate) return null
    
    const start = new Date(dragState.startDate)
    const end = new Date(dragState.endDate)
    const orderedStart = start < end ? dragState.startDate : dragState.endDate
    const orderedEnd = start < end ? dragState.endDate : dragState.startDate
    
    const startIdx = allDays.findIndex(d => d.date === orderedStart)
    const endIdx = allDays.findIndex(d => d.date === orderedEnd)
    
    if (startIdx === -1 || endIdx === -1) return null
    
    return {
      startIdx,
      endIdx,
      rowKey: dragState.rowKey
    }
  }, [dragState, allDays])

  return {
    dragState,
    dragOccurred,
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
    getDragPreview
  }
}

