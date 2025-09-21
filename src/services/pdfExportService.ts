import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { format } from 'date-fns'
import { TimeEntry, Project, Client } from '../types'

/**
 * PDF Export Service with Poppins-like Font Styling
 * 
 * Note: jsPDF has limited custom font support. We use Helvetica with enhanced
 * spacing and sizing to achieve a modern, clean appearance similar to Poppins.
 * 
 * For true Poppins font support, consider upgrading to:
 * - pdf-lib (better custom font support)
 * - Server-side PDF generation with full font libraries
 * - Custom font embedding (requires font file conversion)
 */

interface ExportData {
  filteredEntries: TimeEntry[]
  projects: Project[]
  clients: Client[]
  users: any[]
  dateRange: { from: Date; to: Date }
  selectedClient: string
  selectedProject: string
  selectedColleague: string
}

interface GroupedEntry {
  clientName: string
  clientId: string
  projects: {
    projectName: string
    projectId: string
    projectColor: string
    entries: TimeEntry[]
    totalHours: number
  }[]
  totalHours: number
}

export class PDFExportService {
  private doc: jsPDF
  private pageHeight: number
  private margin: number
  private currentY: number
  private pageNumber: number

  constructor() {
    this.doc = new jsPDF('p', 'mm', 'a4')
    this.pageHeight = 297 // A4 height in mm
    this.margin = 20
    this.currentY = this.margin
    this.pageNumber = 1
    
    // Set default font to a modern sans-serif that's similar to Poppins
    this.setFont('normal')
  }

  private setFont(weight: 'normal' | 'bold' = 'normal', size: number = 12) {
    // Use a clean, modern font that's available in jsPDF
    // We'll use 'helvetica' as it's the most similar to Poppins in terms of:
    // - Clean, geometric appearance
    // - Good readability
    // - Modern sans-serif design
    // - Wide character spacing similar to Poppins
    
    // Set font with improved spacing for a more Poppins-like appearance
    this.doc.setFont('helvetica', weight)
    this.doc.setFontSize(size)
    
    // Adjust character spacing to be more similar to Poppins
    // Note: jsPDF doesn't have native letter-spacing, but we can simulate it with line height
    if (size >= 14) {
      this.doc.setLineHeightFactor(1.4) // More spacing for headers (Poppins-like)
    } else {
      this.doc.setLineHeightFactor(1.3) // Standard spacing for body text
    }
  }

  private addNewPage() {
    this.doc.addPage()
    this.pageNumber++
    this.currentY = this.margin
    this.addPageNumber()
  }

  private addPageNumber() {
    this.setFont('normal', 8)
    this.doc.setTextColor(100, 100, 100)
    this.doc.text(`Page ${this.pageNumber}`, 190, this.pageHeight - 10)
    this.doc.setTextColor(0, 0, 0)
  }

  private checkPageBreak(requiredHeight: number) {
    if (this.currentY + requiredHeight > this.pageHeight - 30) {
      this.addNewPage()
    }
  }

  private groupEntriesByClientAndProject(entries: TimeEntry[], projects: Project[], clients: Client[]): GroupedEntry[] {
    const grouped: { [clientId: string]: GroupedEntry } = {}

    entries.forEach(entry => {
      const project = projects.find(p => p.id === (entry.project_id || entry.projectId))
      const client = clients.find(c => c.id === project?.client_id)
      
      const clientId = client?.id || 'unknown'
      const clientName = client?.name || 'Unknown Client'
      const projectId = project?.id || 'unknown'
      const projectName = project?.name || 'Unknown Project'
      const projectColor = project?.color || '#3b82f6'

      if (!grouped[clientId]) {
        grouped[clientId] = {
          clientName,
          clientId,
          projects: [],
          totalHours: 0
        }
      }

      let projectGroup = grouped[clientId].projects.find(p => p.projectId === projectId)
      if (!projectGroup) {
        projectGroup = {
          projectName,
          projectId,
          projectColor,
          entries: [],
          totalHours: 0
        }
        grouped[clientId].projects.push(projectGroup)
      }

      projectGroup.entries.push(entry)
      projectGroup.totalHours += (entry.duration || entry.duration_minutes || 0) / 60
      grouped[clientId].totalHours += (entry.duration || entry.duration_minutes || 0) / 60
    })

    return Object.values(grouped).sort((a, b) => a.clientName.localeCompare(b.clientName))
  }

  private async generatePieChart(entries: TimeEntry[], projects: Project[]): Promise<string> {
    // Calculate project distribution
    const projectHours: { [projectId: string]: number } = {}
    const projectData: { [projectId: string]: { name: string; color: string } } = {}

    entries.forEach(entry => {
      const projectId = entry.project_id || entry.projectId || 'unknown'
      const project = projects.find(p => p.id === projectId)
      
      projectHours[projectId] = (projectHours[projectId] || 0) + ((entry.duration || entry.duration_minutes || 0) / 60)
      projectData[projectId] = {
        name: project?.name || 'Unknown Project',
        color: project?.color || '#3b82f6'
      }
    })

    // Create canvas for pie chart
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 400
    const ctx = canvas.getContext('2d')!

    const total = Object.values(projectHours).reduce((sum, hours) => sum + hours, 0)
    let currentAngle = -Math.PI / 2 // Start from top

    const centerX = 200
    const centerY = 200
    const radius = 150

    // Draw pie slices
    Object.entries(projectHours).forEach(([projectId, hours]) => {
      const sliceAngle = (hours / total) * 2 * Math.PI
      const project = projectData[projectId]

      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle)
      ctx.closePath()
      ctx.fillStyle = project.color
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.stroke()

      currentAngle += sliceAngle
    })

    // Add legend
    let legendY = 50
    Object.entries(projectHours).forEach(([projectId, hours]) => {
      const project = projectData[projectId]
      const percentage = ((hours / total) * 100).toFixed(1)

      // Legend color box
      ctx.fillStyle = project.color
      ctx.fillRect(320, legendY - 10, 15, 15)
      
      // Legend text
      ctx.fillStyle = '#000000'
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      ctx.fillText(`${project.name} (${percentage}%)`, 340, legendY)
      
      legendY += 25
    })

    return canvas.toDataURL('image/png')
  }

  async exportReport(data: ExportData): Promise<void> {
    const { filteredEntries, projects, clients, users, dateRange, selectedClient, selectedProject, selectedColleague } = data

    // Add title page
    this.addPageNumber()
    this.setFont('bold', 24)
    this.doc.text('Time Tracking Report', this.margin, this.currentY)
    this.currentY += 20

    // Add report parameters
    this.setFont('normal', 12)
    this.doc.text(`Generated on: ${format(new Date(), 'MMMM dd, yyyy HH:mm')}`, this.margin, this.currentY)
    this.currentY += 8
    this.doc.text(`Date Range: ${format(dateRange.from, 'MMM dd, yyyy')} - ${format(dateRange.to, 'MMM dd, yyyy')}`, this.margin, this.currentY)
    this.currentY += 8

    // Add filter information
    const clientName = selectedClient === 'all' ? 'All Clients' : clients.find(c => c.id === selectedClient)?.name || 'Unknown'
    const projectName = selectedProject === 'all' ? 'All Projects' : projects.find(p => p.id === selectedProject)?.name || 'Unknown'
    const userName = selectedColleague === 'all' ? 'All Colleagues' : users.find(u => u.id === selectedColleague)?.full_name || 'Unknown'

    this.doc.text(`Client: ${clientName}`, this.margin, this.currentY)
    this.currentY += 8
    this.doc.text(`Project: ${projectName}`, this.margin, this.currentY)
    this.currentY += 8
    this.doc.text(`Colleague: ${userName}`, this.margin, this.currentY)
    this.currentY += 15

    // Add summary statistics
    const totalHours = filteredEntries.reduce((sum, entry) => sum + ((entry.duration || entry.duration_minutes || 0) / 60), 0)
    const totalEntries = filteredEntries.length
    const uniqueProjects = new Set(filteredEntries.map(entry => entry.project_id || entry.projectId)).size
    const uniqueClients = new Set(filteredEntries.map(entry => {
      const project = projects.find(p => p.id === (entry.project_id || entry.projectId))
      return project?.client_id
    })).size

    this.setFont('bold', 12)
    this.doc.text('Summary', this.margin, this.currentY)
    this.currentY += 10
    this.setFont('normal', 12)
    this.doc.text(`Total Hours: ${totalHours.toFixed(2)}`, this.margin, this.currentY)
    this.currentY += 8
    this.doc.text(`Total Entries: ${totalEntries}`, this.margin, this.currentY)
    this.currentY += 8
    this.doc.text(`Projects Involved: ${uniqueProjects}`, this.margin, this.currentY)
    this.currentY += 8
    this.doc.text(`Clients Involved: ${uniqueClients}`, this.margin, this.currentY)
    this.currentY += 20

    // Add pie chart if there are multiple projects
    if (uniqueProjects > 1 && filteredEntries.length > 0) {
      this.checkPageBreak(100)
      
      this.setFont('bold', 14)
      this.doc.text('Project Time Distribution', this.margin, this.currentY)
      this.currentY += 15

      try {
        const chartImage = await this.generatePieChart(filteredEntries, projects)
        this.doc.addImage(chartImage, 'PNG', this.margin, this.currentY, 170, 100)
        this.currentY += 110
      } catch (error) {
        console.error('Error generating pie chart:', error)
        this.doc.text('Chart generation failed', this.margin, this.currentY)
        this.currentY += 10
      }
    }

    // Group and display time entries
    const groupedEntries = this.groupEntriesByClientAndProject(filteredEntries, projects, clients)

    this.checkPageBreak(20)
    this.setFont('bold', 16)
    this.doc.text('Detailed Time Entries', this.margin, this.currentY)
    this.currentY += 15

    groupedEntries.forEach(clientGroup => {
      this.checkPageBreak(30)
      
      // Client header
      this.setFont('bold', 14)
      this.doc.text(`${clientGroup.clientName} (${clientGroup.totalHours.toFixed(2)}h)`, this.margin, this.currentY)
      this.currentY += 12

      clientGroup.projects.forEach(projectGroup => {
        this.checkPageBreak(25)
        
        // Project header
        this.setFont('bold', 12)
        this.doc.setTextColor(100, 100, 100)
        this.doc.text(`  ${projectGroup.projectName} (${projectGroup.totalHours.toFixed(2)}h)`, this.margin, this.currentY)
        this.doc.setTextColor(0, 0, 0)
        this.currentY += 10

        // Time entries
        this.setFont('normal', 10)

        projectGroup.entries.forEach(entry => {
          this.checkPageBreak(12)
          
          const date = format(new Date(entry.start_time || entry.startTime!), 'MMM dd, yyyy')
          const startTime = format(new Date(entry.start_time || entry.startTime!), 'HH:mm')
          const endTime = entry.end_time || entry.endTime ? format(new Date(entry.end_time || entry.endTime!), 'HH:mm') : 'Ongoing'
          const duration = ((entry.duration || entry.duration_minutes || 0) / 60).toFixed(2)
          const description = entry.description || entry.task || 'No description'
          const userName = users.find(u => u.id === entry.user_id)?.full_name || 'Unknown User'

          this.doc.text(`    ${date} | ${startTime}-${endTime} | ${duration}h | ${userName}`, this.margin, this.currentY)
          this.currentY += 6
          
          if (description && description !== 'No description') {
            this.doc.setTextColor(100, 100, 100)
            const wrappedDescription = this.doc.splitTextToSize(`      ${description}`, 150)
            this.doc.text(wrappedDescription, this.margin, this.currentY)
            this.currentY += wrappedDescription.length * 4
            this.doc.setTextColor(0, 0, 0)
          }
          
          this.currentY += 2
        })

        this.currentY += 5
      })

      this.currentY += 10
    })

    // Save the PDF
    const fileName = `time-report-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`
    this.doc.save(fileName)
  }
}
