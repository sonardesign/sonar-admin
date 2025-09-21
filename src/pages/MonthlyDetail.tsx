import React, { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { ArrowLeft, Receipt, DollarSign, TrendingUp, Clock } from 'lucide-react'
import { useSupabaseAppState } from '../hooks/useSupabaseAppState'
import { Page } from '../components/Page'

interface CostItem {
  id: string
  costName: string
  partnerName: string
  netCost: number
  grossCost: number
}

interface ProjectIncome {
  projectId: string
  projectName: string
  clientName: string
  totalHours: number
  totalNetIncome: number
  totalNetCost: number
  color: string
}

export const MonthlyDetail: React.FC = () => {
  const { monthKey } = useParams<{ monthKey: string }>()
  const navigate = useNavigate()
  const { timeEntries, projects, users, loading, error } = useSupabaseAppState()

  // Parse month from URL parameter (format: 2024-09)
  const monthDate = useMemo(() => {
    if (!monthKey) return null
    const [year, month] = monthKey.split('-')
    return new Date(parseInt(year), parseInt(month) - 1, 1)
  }, [monthKey])

  const displayMonth = monthDate ? format(monthDate, 'yyyy. MMMM') : ''

  // Get time entries for this month
  const monthTimeEntries = useMemo(() => {
    if (!monthDate || !timeEntries.length) return []
    
    const monthStart = startOfMonth(monthDate)
    const monthEnd = endOfMonth(monthDate)
    
    return timeEntries.filter(entry => {
      const entryDate = parseISO(entry.start_time || entry.startTime!.toISOString())
      return entryDate >= monthStart && entryDate <= monthEnd
    })
  }, [monthDate, timeEntries])

  // Generate cost items (mock data for now - can be extended to real cost tracking)
  const costItems = useMemo((): CostItem[] => {
    const costs: CostItem[] = []
    
    // Add salary costs based on time entries
    const userSalaries = new Map<string, number>()
    monthTimeEntries.forEach(entry => {
      const userId = entry.user_id
      const user = users.find(u => u.id === userId)
      if (!user) return
      
      const durationHours = (entry.duration_minutes || entry.duration || 0) / 60
      const project = projects.find(p => p.id === (entry.project_id || entry.projectId))
      const costPerHour = entry.hourly_rate || project?.hourly_rate || 50
      const cost = durationHours * costPerHour
      
      if (userSalaries.has(userId)) {
        userSalaries.set(userId, userSalaries.get(userId)! + cost)
      } else {
        userSalaries.set(userId, cost)
      }
    })
    
    // Convert to cost items
    userSalaries.forEach((netCost, userId) => {
      const user = users.find(u => u.id === userId)
      if (user) {
        const grossCost = netCost * 1.27 // Add 27% for taxes and benefits
        costs.push({
          id: `salary-${userId}`,
          costName: `Salary - ${user.full_name}`,
          partnerName: 'Internal',
          netCost,
          grossCost
        })
      }
    })
    
    // Add some example operational costs
    if (costs.length > 0) {
      const totalSalaries = costs.reduce((sum, cost) => sum + cost.netCost, 0)
      const officeRent = Math.max(1000, totalSalaries * 0.1) // 10% of salaries or $1000 minimum
      const utilities = Math.max(200, totalSalaries * 0.02) // 2% of salaries or $200 minimum
      const software = Math.max(500, totalSalaries * 0.05) // 5% of salaries or $500 minimum
      
      costs.push(
        {
          id: 'office-rent',
          costName: 'Office Rent',
          partnerName: 'Property Management Co.',
          netCost: officeRent,
          grossCost: officeRent * 1.2 // 20% VAT
        },
        {
          id: 'utilities',
          costName: 'Utilities & Internet',
          partnerName: 'Utility Provider',
          netCost: utilities,
          grossCost: utilities * 1.2 // 20% VAT
        },
        {
          id: 'software',
          costName: 'Software Licenses',
          partnerName: 'Various Vendors',
          netCost: software,
          grossCost: software * 1.2 // 20% VAT
        }
      )
    }
    
    return costs
  }, [monthTimeEntries, users, projects])

  // Generate project income data
  const projectIncomes = useMemo((): ProjectIncome[] => {
    const projectMap = new Map<string, ProjectIncome>()
    
    monthTimeEntries.forEach(entry => {
      const projectId = entry.project_id || entry.projectId!
      const project = projects.find(p => p.id === projectId)
      if (!project) return
      
      const durationHours = (entry.duration_minutes || entry.duration || 0) / 60
      const costPerHour = entry.hourly_rate || project.hourly_rate || 50
      const pricePerHour = costPerHour * 1.5 // 50% markup
      const netCost = durationHours * costPerHour
      const netIncome = durationHours * pricePerHour
      
      if (projectMap.has(projectId)) {
        const existing = projectMap.get(projectId)!
        projectMap.set(projectId, {
          ...existing,
          totalHours: existing.totalHours + durationHours,
          totalNetCost: existing.totalNetCost + netCost,
          totalNetIncome: existing.totalNetIncome + netIncome
        })
      } else {
        projectMap.set(projectId, {
          projectId,
          projectName: project.name,
          clientName: project.client_name || project.clientName || 'Unknown Client',
          totalHours: durationHours,
          totalNetCost: netCost,
          totalNetIncome: netIncome,
          color: project.color || '#3b82f6'
        })
      }
    })
    
    return Array.from(projectMap.values())
  }, [monthTimeEntries, projects])

  // Calculate totals
  const totals = useMemo(() => {
    const totalNetCosts = costItems.reduce((sum, item) => sum + item.netCost, 0)
    const totalGrossCosts = costItems.reduce((sum, item) => sum + item.grossCost, 0)
    const totalHours = projectIncomes.reduce((sum, project) => sum + project.totalHours, 0)
    const totalNetIncome = projectIncomes.reduce((sum, project) => sum + project.totalNetIncome, 0)
    const totalProjectCosts = projectIncomes.reduce((sum, project) => sum + project.totalNetCost, 0)
    
    return {
      totalNetCosts,
      totalGrossCosts,
      totalHours,
      totalNetIncome,
      totalProjectCosts,
      netProfit: totalNetIncome - totalNetCosts
    }
  }, [costItems, projectIncomes])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`
  }

  if (loading) {
    return (
      <Page>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading monthly details...</p>
          </div>
        </div>
      </Page>
    )
  }

  if (error || !monthDate) {
    return (
      <Page>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-destructive mb-2">Error loading monthly data</p>
            <p className="text-muted-foreground text-sm">{error || 'Invalid month parameter'}</p>
            <Button onClick={() => navigate('/summary')} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Summary
            </Button>
          </div>
        </div>
      </Page>
    )
  }

  return (
    <Page>
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/summary')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Summary
          </Button>
          
          <div>
            <h1 className="text-3xl font-bold text-foreground">{displayMonth}</h1>
            <p className="text-muted-foreground">
              Detailed financial breakdown for the month
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Receipt className="h-4 w-4 text-red-600" />
                <span className="text-sm text-muted-foreground">Total Costs</span>
              </div>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(totals.totalGrossCosts)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Total Income</span>
              </div>
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(totals.totalNetIncome)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm text-muted-foreground">Net Profit</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totals.netProfit)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-muted-foreground">Total Hours</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {formatHours(totals.totalHours)}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Costs Block */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Costs
              </CardTitle>
              <CardDescription>
                Detailed breakdown of all costs for {displayMonth}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {costItems.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cost Name</TableHead>
                      <TableHead>Partner Name</TableHead>
                      <TableHead className="text-right">Net Cost</TableHead>
                      <TableHead className="text-right">Gross Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {costItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.costName}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.partnerName}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.netCost)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(item.grossCost)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totals Row */}
                    <TableRow className="border-t-2 border-border bg-muted/30 font-bold">
                      <TableCell className="font-bold">TOTALS</TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(totals.totalNetCosts)}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(totals.totalGrossCosts)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No cost data available for this month.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Income Block */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Income
              </CardTitle>
              <CardDescription>
                Project-based income breakdown for {displayMonth}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {projectIncomes.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead className="text-right">Total Hours</TableHead>
                      <TableHead className="text-right">Net Cost</TableHead>
                      <TableHead className="text-right">Net Income</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectIncomes.map((project) => (
                      <TableRow key={project.projectId}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: project.color }}
                            />
                            <div>
                              <div className="font-medium">{project.projectName}</div>
                              <div className="text-xs text-muted-foreground">
                                {project.clientName}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatHours(project.totalHours)}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {formatCurrency(project.totalNetCost)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          {formatCurrency(project.totalNetIncome)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totals Row */}
                    <TableRow className="border-t-2 border-border bg-muted/30 font-bold">
                      <TableCell className="font-bold">TOTALS</TableCell>
                      <TableCell className="text-right font-bold">
                        {formatHours(totals.totalHours)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-red-600">
                        {formatCurrency(totals.totalProjectCosts)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-600">
                        {formatCurrency(totals.totalNetIncome)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No project income data for this month.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Page>
  )
}
