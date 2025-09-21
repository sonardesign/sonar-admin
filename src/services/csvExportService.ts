import { format } from 'date-fns'
import { TimeEntry, Project, Client } from '../types'

interface CSVExportData {
  filteredEntries: TimeEntry[]
  projects: Project[]
  clients: Client[]
  users: any[]
  dateRange: { from: Date; to: Date }
  selectedClient: string
  selectedProject: string
  selectedColleague: string
}

export class CSVExportService {
  private escapeCSVField(field: string | null | undefined): string {
    if (!field) return ''
    
    // Convert to string and handle special characters
    const stringField = String(field)
    
    // If field contains comma, newline, or quote, wrap in quotes and escape internal quotes
    if (stringField.includes(',') || stringField.includes('\n') || stringField.includes('"')) {
      return `"${stringField.replace(/"/g, '""')}"`
    }
    
    return stringField
  }

  private formatTimeRange(startTime: Date, endTime?: Date): string {
    const start = format(startTime, 'HH:mm')
    if (endTime) {
      const end = format(endTime, 'HH:mm')
      return `${start} - ${end}`
    }
    return `${start} - Ongoing`
  }

  private calculateDuration(startTime: Date, endTime?: Date, durationMinutes?: number): string {
    if (durationMinutes) {
      const hours = Math.floor(durationMinutes / 60)
      const minutes = durationMinutes % 60
      if (hours > 0) {
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
      }
      return `${minutes}m`
    }
    
    if (endTime) {
      const diffMs = endTime.getTime() - startTime.getTime()
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      const hours = Math.floor(diffMinutes / 60)
      const minutes = diffMinutes % 60
      if (hours > 0) {
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
      }
      return `${minutes}m`
    }
    
    return 'Ongoing'
  }

  exportToCSV(data: CSVExportData): void {
    const { filteredEntries, projects, clients, users, dateRange } = data

    // Define CSV headers
    const headers = [
      'Date',
      'Client',
      'Project',
      'User',
      'Start Time',
      'End Time',
      'Time Range',
      'Duration',
      'Description',
      'Billable',
      'Tags'
    ]

    // Create CSV rows
    const rows: string[][] = []
    
    // Add headers
    rows.push(headers)

    // Sort entries by date and start time
    const sortedEntries = [...filteredEntries].sort((a, b) => {
      const dateA = new Date(a.start_time || a.startTime!)
      const dateB = new Date(b.start_time || b.startTime!)
      return dateA.getTime() - dateB.getTime()
    })

    // Process each time entry
    sortedEntries.forEach(entry => {
      const startTime = new Date(entry.start_time || entry.startTime!)
      const endTime = entry.end_time || entry.endTime ? new Date(entry.end_time || entry.endTime!) : undefined
      
      // Find related project and client
      const project = projects.find(p => p.id === (entry.project_id || entry.projectId))
      const client = clients.find(c => c.id === project?.client_id)
      const user = users.find(u => u.id === entry.user_id)

      // Format date
      const date = format(startTime, 'yyyy-MM-dd')
      
      // Format times
      const startTimeFormatted = format(startTime, 'HH:mm')
      const endTimeFormatted = endTime ? format(endTime, 'HH:mm') : ''
      const timeRange = this.formatTimeRange(startTime, endTime)
      
      // Calculate duration
      const duration = this.calculateDuration(
        startTime, 
        endTime, 
        entry.duration_minutes || entry.duration
      )

      // Get description
      const description = entry.description || entry.task || ''

      // Format billable status
      const billable = entry.is_billable !== false ? 'Yes' : 'No'

      // Format tags
      const tags = entry.tags ? entry.tags.join('; ') : ''

      // Create row
      const row = [
        date,
        client?.name || 'Unknown Client',
        project?.name || 'Unknown Project',
        user?.full_name || 'Unknown User',
        startTimeFormatted,
        endTimeFormatted,
        timeRange,
        duration,
        description,
        billable,
        tags
      ]

      rows.push(row)
    })

    // Convert to CSV string
    const csvContent = rows.map(row => 
      row.map(field => this.escapeCSVField(field)).join(',')
    ).join('\n')

    // Add BOM for proper UTF-8 encoding in Excel
    const BOM = '\uFEFF'
    const csvWithBOM = BOM + csvContent

    // Create and download file
    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      
      // Generate filename with timestamp and filter info
      const timestamp = format(new Date(), 'yyyy-MM-dd-HHmm')
      const dateRangeStr = `${format(dateRange.from, 'MMM-dd')}-to-${format(dateRange.to, 'MMM-dd')}`
      const filename = `time-entries-${dateRangeStr}-${timestamp}.csv`
      
      link.setAttribute('download', filename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up the URL object
      URL.revokeObjectURL(url)
    }
  }

  // Alternative method for getting CSV content as string (useful for testing or server-side)
  getCSVContent(data: CSVExportData): string {
    const { filteredEntries, projects, clients, users } = data

    const headers = [
      'Date',
      'Client',
      'Project',
      'User',
      'Start Time',
      'End Time',
      'Time Range',
      'Duration',
      'Description',
      'Billable',
      'Tags'
    ]

    const rows: string[][] = [headers]

    const sortedEntries = [...filteredEntries].sort((a, b) => {
      const dateA = new Date(a.start_time || a.startTime!)
      const dateB = new Date(b.start_time || b.startTime!)
      return dateA.getTime() - dateB.getTime()
    })

    sortedEntries.forEach(entry => {
      const startTime = new Date(entry.start_time || entry.startTime!)
      const endTime = entry.end_time || entry.endTime ? new Date(entry.end_time || entry.endTime!) : undefined
      
      const project = projects.find(p => p.id === (entry.project_id || entry.projectId))
      const client = clients.find(c => c.id === project?.client_id)
      const user = users.find(u => u.id === entry.user_id)

      const row = [
        format(startTime, 'yyyy-MM-dd'),
        client?.name || 'Unknown Client',
        project?.name || 'Unknown Project',
        user?.full_name || 'Unknown User',
        format(startTime, 'HH:mm'),
        endTime ? format(endTime, 'HH:mm') : '',
        this.formatTimeRange(startTime, endTime),
        this.calculateDuration(startTime, endTime, entry.duration_minutes || entry.duration),
        entry.description || entry.task || '',
        entry.is_billable !== false ? 'Yes' : 'No',
        entry.tags ? entry.tags.join('; ') : ''
      ]

      rows.push(row)
    })

    return rows.map(row => 
      row.map(field => this.escapeCSVField(field)).join(',')
    ).join('\n')
  }
}
