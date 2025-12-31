import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '../components/ui/chart'
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import { TrendingUp, Calendar, DollarSign, PieChart } from 'lucide-react'
import { useSupabaseAppState } from '../hooks/useSupabaseAppState'
import { Page } from '../components/Page'

interface MonthlyData {
  month: string
  displayMonth: string
  cost: number
  income: number
  profit: number
  activeProjects: number
  totalExpense: number
  salaryTax: number
  vat: number
}

const chartConfig = {
  views: {
    label: "Financial Metrics",
  },
  cost: {
    label: "Cost",
    color: "hsl(var(--destructive))",
  },
  income: {
    label: "Income", 
    color: "hsl(var(--primary))",
  },
  profit: {
    label: "Profit",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export const Summary: React.FC = () => {
  const { timeEntries, projects, loading, error } = useSupabaseAppState()
  const navigate = useNavigate()
  const [activeChart, setActiveChart] = useState<keyof typeof chartConfig>("income")

  // Generate last 12 months of data
  const monthlyData = useMemo(() => {
    const months: MonthlyData[] = []
    const now = new Date()
    
    for (let i = 11; i >= 0; i--) {
      const monthDate = subMonths(now, i)
      const monthStart = startOfMonth(monthDate)
      const monthEnd = endOfMonth(monthDate)
      const monthKey = format(monthDate, 'yyyy-MM')
      const displayMonth = format(monthDate, 'yyyy. MMMM')
      
      // Filter time entries for this month
      const monthTimeEntries = timeEntries.filter(entry => {
        const entryDate = parseISO(entry.start_time || entry.startTime!.toISOString())
        return entryDate >= monthStart && entryDate <= monthEnd
      })
      
      // Get active projects for this month
      const monthProjectIds = new Set(monthTimeEntries.map(entry => 
        entry.project_id || entry.projectId
      ))
      const activeProjects = monthProjectIds.size
      
      // Calculate financial metrics
      let totalCost = 0
      let totalIncome = 0
      
      monthTimeEntries.forEach(entry => {
        const durationHours = (entry.duration_minutes || entry.duration || 0) / 60
        const project = projects.find(p => p.id === (entry.project_id || entry.projectId))
        const costPerHour = entry.hourly_rate || project?.hourly_rate || 50
        const pricePerHour = costPerHour * 1.5 // 50% markup
        
        totalCost += durationHours * costPerHour
        totalIncome += durationHours * pricePerHour
      })
      
      const profit = totalIncome - totalCost
      const salaryTax = totalIncome * 0.15 // 15% salary tax estimate
      const vat = totalIncome * 0.20 // 20% VAT estimate
      const totalExpense = totalCost + salaryTax + vat
      
      months.push({
        month: monthKey,
        displayMonth,
        cost: totalCost,
        income: totalIncome,
        profit,
        activeProjects,
        totalExpense,
        salaryTax,
        vat
      })
    }
    
    return months
  }, [timeEntries, projects])

  // Calculate totals for the period
  const totals = useMemo(() => {
    return monthlyData.reduce((acc, month) => ({
      cost: acc.cost + month.cost,
      income: acc.income + month.income,
      profit: acc.profit + month.profit,
      expense: acc.expense + month.totalExpense,
      salaryTax: acc.salaryTax + month.salaryTax,
      vat: acc.vat + month.vat,
      projects: Math.max(acc.projects, month.activeProjects)
    }), {
      cost: 0,
      income: 0,
      profit: 0,
      expense: 0,
      salaryTax: 0,
      vat: 0,
      projects: 0
    })
  }, [monthlyData])

  // Chart totals for interactive buttons
  const chartTotals = useMemo(() => ({
    cost: monthlyData.reduce((acc, curr) => acc + curr.cost, 0),
    income: monthlyData.reduce((acc, curr) => acc + curr.income, 0),
    profit: monthlyData.reduce((acc, curr) => acc + curr.profit, 0),
  }), [monthlyData])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  if (error) {
    return (
      <Page>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-destructive mb-2">Error loading summary data</p>
            <p className="text-muted-foreground text-sm">{error}</p>
          </div>
        </div>
      </Page>
    )
  }

  return (
    <Page loading={loading} loadingText="Loading summary...">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Summary</h1>
            <p className="text-muted-foreground">
              Financial overview and monthly performance analysis
            </p>
          </div>
          
          <div className="flex items-center gap-6 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{formatCurrency(totals.income)}</div>
              <div className="text-muted-foreground">Total Income</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totals.profit)}</div>
              <div className="text-muted-foreground">Total Profit</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{formatCurrency(totals.expense)}</div>
              <div className="text-muted-foreground">Total Expense</div>
            </div>
          </div>
        </div>

        {/* Monthly Chart */}
        <Card className="mb-8">
          <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
            <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-0">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Monthly Financial Performance
              </CardTitle>
              <CardDescription>
                Interactive view of cost, income, and profit trends over the last 12 months
              </CardDescription>
            </div>
            <div className="flex">
              {(["cost", "income", "profit"] as const).map((key) => {
                const chart = key as keyof typeof chartConfig
                if (chart === "views") return null
                return (
                  <button
                    key={chart}
                    data-active={activeChart === chart}
                    className="data-[active=true]:bg-muted/50 relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
                    onClick={() => setActiveChart(chart)}
                  >
                    <span className="text-muted-foreground text-xs">
                      {chartConfig[chart].label}
                    </span>
                    <span className="text-lg leading-none font-bold sm:text-3xl">
                      {formatCurrency(chartTotals[key as keyof typeof chartTotals])}
                    </span>
                  </button>
                )
              })}
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:p-6">
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-[250px] w-full"
            >
              <BarChart
                accessibilityLayer
                data={monthlyData}
                margin={{
                  left: 12,
                  right: 12,
                }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="displayMonth"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  tickFormatter={(value) => {
                    const [year, month] = value.split('. ')
                    return new Date(`${month} 1, ${year}`).toLocaleDateString("en-US", {
                      month: "short",
                    })
                  }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      className="w-[200px]"
                      nameKey="views"
                      labelFormatter={(value) => {
                        return value
                      }}
                      formatter={(value) => [formatCurrency(value as number), chartConfig[activeChart].label]}
                    />
                  }
                />
                <Bar dataKey={activeChart} fill={`var(--color-${activeChart})`} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Monthly Summary Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Monthly Summary
            </CardTitle>
            <CardDescription>
              Detailed financial breakdown by month including taxes and expenses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Month</TableHead>
                  <TableHead className="text-right">Active Projects</TableHead>
                  <TableHead className="text-right">Total Income</TableHead>
                  <TableHead className="text-right">Total Expense</TableHead>
                  <TableHead className="text-right">Salary Tax</TableHead>
                  <TableHead className="text-right">VAT</TableHead>
                  <TableHead className="text-right">Total Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyData.map((month) => (
                  <TableRow key={month.month}>
                    <TableCell className="font-medium">
                      <button
                        onClick={() => navigate(`/summary/${month.month}`)}
                        className="flex items-center gap-2 hover:text-primary transition-colors text-left w-full"
                      >
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {month.displayMonth}
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      {month.activeProjects}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      {formatCurrency(month.income)}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(month.totalExpense)}
                    </TableCell>
                    <TableCell className="text-right text-orange-600">
                      {formatCurrency(month.salaryTax)}
                    </TableCell>
                    <TableCell className="text-right text-purple-600">
                      {formatCurrency(month.vat)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      {formatCurrency(month.profit)}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Totals Row */}
                <TableRow className="border-t-2 border-border bg-muted/30 font-bold">
                  <TableCell className="font-bold">
                    TOTALS (12 months)
                  </TableCell>
                  <TableCell className="text-right">
                    {totals.projects}
                  </TableCell>
                  <TableCell className="text-right text-primary">
                    {formatCurrency(totals.income)}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {formatCurrency(totals.expense)}
                  </TableCell>
                  <TableCell className="text-right text-orange-600">
                    {formatCurrency(totals.salaryTax)}
                  </TableCell>
                  <TableCell className="text-right text-purple-600">
                    {formatCurrency(totals.vat)}
                  </TableCell>
                  <TableCell className="text-right text-green-600">
                    {formatCurrency(totals.profit)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Page>
  )
}
