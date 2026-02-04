import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { format } from 'date-fns'
import { TimeEntry, Project, Client } from '../types'
import snrLogoFull from '../assets/snr-logo-full.svg'

/**
 * PDF Export Service with Unicode Support
 * 
 * Supports Hungarian and other special characters in:
 * - PDF content (titles, names, descriptions)
 * - Filenames (preserves Unicode characters, only removes filesystem-invalid chars)
 * 
 * Uses Helvetica font which provides good Unicode character support in modern browsers.
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
  private headerHeight: number = 25 // Height reserved for header with logo
  private logoImageCache: string | null = null // Cache for logo image

  constructor() {
    this.doc = new jsPDF('p', 'mm', 'a4')
    this.pageHeight = 297 // A4 height in mm
    this.margin = 20
    this.currentY = this.margin + this.headerHeight // Start below the header
    this.pageNumber = 1
    
    // Use helvetica which has better Unicode support when properly configured
    // jsPDF will handle Unicode characters in modern browsers
    this.setFont('normal')
  }

  private setFont(weight: 'normal' | 'bold' = 'normal', size: number = 12) {
    // Note: To use DM Sans, we need to embed the font file as base64
    // For now, using helvetica which has good Unicode support
    // TODO: Add DM Sans font embedding for custom typography
    
    this.doc.setFont('helvetica', weight === 'bold' ? 'bold' : 'normal')
    this.doc.setFontSize(size)
    
    // Adjust character spacing
    if (size >= 14) {
      this.doc.setLineHeightFactor(1.4) // More spacing for headers
    } else {
      this.doc.setLineHeightFactor(1.3) // Standard spacing for body text
    }
  }

  private async addNewPage() {
    this.doc.addPage()
    this.pageNumber++
    this.currentY = this.margin + this.headerHeight // Start below the header on new pages
    
    // Add logo on every page (using cached image)
    if (this.logoImageCache) {
      this.doc.addImage(this.logoImageCache, 'PNG', this.margin, this.margin, 21, 0, undefined, 'FAST')
    }
    
    await this.addHeader()
    this.addPageNumber()
  }

  private async addHeader() {
    // Header is just the logo now - no separator or text needed
    // Logo is added separately in exportReport and addNewPage
  }

  private async loadLogoAsImage(): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        // Set canvas size to match desired output (maintaining aspect ratio)
        const maxWidth = 80 * 2 // 80px at 2x for better quality
        const maxHeight = 80 * 2  // 80px at 2x for better quality
        
        const ratio = Math.min(maxWidth / img.width, maxHeight / img.height)
        canvas.width = img.width * ratio
        canvas.height = img.height * ratio
        
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = reject
      img.src = snrLogoFull
    })
  }

  private addPageNumber() {
    this.setFont('normal', 8)
    this.doc.setTextColor(100, 100, 100)
    this.doc.text(`Page ${this.pageNumber}`, 190, this.pageHeight - 10)
    this.doc.setTextColor(0, 0, 0)
  }

  private async checkPageBreak(requiredHeight: number) {
    if (this.currentY + requiredHeight > this.pageHeight - 30) {
      await this.addNewPage()
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

    // Load and cache logo image
    try {
      this.logoImageCache = await this.loadLogoAsImage()
      // Add logo on first page - max width 21mm (80px), max height 21mm (80px)
      this.doc.addImage(this.logoImageCache, 'PNG', this.margin, this.margin, 21, 0, undefined, 'FAST')
    } catch (error) {
      console.error('Error loading logo:', error)
    }
    
    await this.addHeader()
    this.addPageNumber()
    
    // Add title
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
      await this.checkPageBreak(100)
      
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

    await this.checkPageBreak(20)
    this.setFont('bold', 16)
    this.doc.text('Detailed Time Entries', this.margin, this.currentY)
    this.currentY += 15

    for (const clientGroup of groupedEntries) {
      await this.checkPageBreak(30)
      
      // Client header
      this.setFont('bold', 14)
      this.doc.text(`${clientGroup.clientName} (${clientGroup.totalHours.toFixed(2)}h)`, this.margin, this.currentY)
      this.currentY += 12

      for (const projectGroup of clientGroup.projects) {
        await this.checkPageBreak(25)
        
        // Project header
        this.setFont('bold', 12)
        this.doc.setTextColor(100, 100, 100)
        this.doc.text(`  ${projectGroup.projectName} (${projectGroup.totalHours.toFixed(2)}h)`, this.margin, this.currentY)
        this.doc.setTextColor(0, 0, 0)
        this.currentY += 10

        // Time entries
        this.setFont('normal', 10)

        for (const entry of projectGroup.entries) {
          await this.checkPageBreak(12)
          
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
        }

        this.currentY += 5
      }

      this.currentY += 10
    }

    // Generate filename based on filters
    // Sanitize filename: convert Hungarian and special characters to ASCII equivalents
    const sanitizeFilename = (str: string) => {
      return str
        // Hungarian characters to ASCII
        .replace(/á/g, 'a').replace(/Á/g, 'A')
        .replace(/é/g, 'e').replace(/É/g, 'E')
        .replace(/í/g, 'i').replace(/Í/g, 'I')
        .replace(/ó/g, 'o').replace(/Ó/g, 'O')
        .replace(/ö/g, 'o').replace(/Ö/g, 'O')
        .replace(/ő/g, 'o').replace(/Ő/g, 'O')
        .replace(/ú/g, 'u').replace(/Ú/g, 'U')
        .replace(/ü/g, 'u').replace(/Ü/g, 'U')
        .replace(/ű/g, 'u').replace(/Ű/g, 'U')
        // Other common special characters
        .replace(/ä/g, 'a').replace(/Ä/g, 'A')
        .replace(/ß/g, 'ss')
        .replace(/ñ/g, 'n').replace(/Ñ/g, 'N')
        .replace(/ç/g, 'c').replace(/Ç/g, 'C')
        // Remove remaining special characters and filesystem-invalid chars
        .replace(/[^a-zA-Z0-9-_\s]/g, '')
        // Replace spaces with underscores
        .replace(/\s+/g, '_')
        // Remove multiple consecutive underscores
        .replace(/_+/g, '_')
        // Trim underscores from start and end
        .replace(/^_+|_+$/g, '')
    }
    
    const fileProjectName = selectedProject === 'all' 
      ? 'All-Projects' 
      : sanitizeFilename(projects.find(p => p.id === selectedProject)?.name || 'Unknown-Project')
    
    const timeWindow = `${format(dateRange.from, 'yyyy.MM.dd')}-${format(dateRange.to, 'yyyy.MM.dd')}`
    
    const fileColleagueName = selectedColleague === 'all'
      ? 'All-Colleagues'
      : sanitizeFilename(users.find(u => u.id === selectedColleague)?.full_name || 'Unknown-Colleague')
    
    const fileName = `${fileProjectName}_${timeWindow}_${fileColleagueName}.pdf`
    this.doc.save(fileName)
  }
}
