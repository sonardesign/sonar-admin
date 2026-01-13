import React, { useState, useMemo, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, startOfToday, endOfToday } from 'date-fns'
import { CalendarIcon, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover'
import { Calendar } from '../components/ui/calendar'
import { Pie, PieChart, Cell, Tooltip, Bar, BarChart, XAxis, YAxis, CartesianGrid } from 'recharts'
import { supabase } from '../lib/supabase'
import { Lead, LeadStatus } from '../types'
import { cn } from '../lib/utils'
import { Page } from '../components/Page'

interface DateRange {
  from: Date
  to: Date
}

const STATUS_OPTIONS: { value: LeadStatus; label: string; color: string }[] = [
  { value: 'contacted', label: 'Contacted', color: '#64748b' },
  { value: 'prospect', label: 'Prospect', color: '#3b82f6' },
  { value: 'lead', label: 'Lead', color: '#8b5cf6' },
  { value: 'negotiation', label: 'Negotiation', color: '#eab308' },
  { value: 'contract', label: 'Contract', color: '#22c55e' },
  { value: 'lost', label: 'Lost', color: '#ef4444' },
]

export const CRMReports: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [leads, setLeads] = useState<Lead[]>([])
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const today = new Date()
    return {
      from: startOfMonth(today),
      to: endOfMonth(today)
    }
  })

  useEffect(() => {
    loadLeads()
  }, [])

  const loadLeads = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setLeads(data || [])
    } catch (error) {
      console.error('Error loading leads:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDateRange = (range: DateRange) => {
    if (range.from && range.to) {
      return `${format(range.from, 'MMM d, yyyy')} - ${format(range.to, 'MMM d, yyyy')}`
    }
    return 'Select date range'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Filter leads by date range
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const leadDate = new Date(lead.created_at)
      return leadDate >= dateRange.from && leadDate <= dateRange.to
    })
  }, [leads, dateRange])

  // Prepare pie chart data - Lead status distribution
  const statusDistribution = useMemo(() => {
    const distribution: { [key: string]: number } = {}
    
    STATUS_OPTIONS.forEach(status => {
      distribution[status.value] = 0
    })

    filteredLeads.forEach(lead => {
      if (distribution[lead.status] !== undefined) {
        distribution[lead.status]++
      }
    })

    return STATUS_OPTIONS.map(status => ({
      name: status.label,
      value: distribution[status.value],
      color: status.color
    })).filter(item => item.value > 0)
  }, [filteredLeads])

  // Prepare bar chart data - Money by stage
  const moneyByStage = useMemo(() => {
    const amounts: { [key: string]: number } = {}
    
    STATUS_OPTIONS.forEach(status => {
      amounts[status.value] = 0
    })

    filteredLeads.forEach(lead => {
      if (lead.ticket_size && amounts[lead.status] !== undefined) {
        amounts[lead.status] += lead.ticket_size
      }
    })

    return STATUS_OPTIONS.map(status => ({
      name: status.label,
      value: amounts[status.value],
      color: status.color
    }))
  }, [filteredLeads])

  // Calculate totals
  const totalLeads = filteredLeads.length
  const totalValue = filteredLeads.reduce((sum, lead) => sum + (lead.ticket_size || 0), 0)

  return (
    <Page loading={loading} loadingText="Loading reports...">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">CRM Reports</h1>
            <p className="text-muted-foreground">
              Analyze your sales funnel and lead performance
            </p>
          </div>

          {/* Date Range Picker */}
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-[280px] justify-start text-left font-normal',
                  !dateRange && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formatDateRange(dateRange)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="flex">
                <div className="flex flex-col p-3 border-r">
                  <div className="text-sm font-medium mb-2">Quick Select</div>
                  <div className="space-y-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start"
                      onClick={() => {
                        const today = new Date()
                        setDateRange({ from: startOfToday(), to: endOfToday() })
                        setIsCalendarOpen(false)
                      }}
                    >
                      Today
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start"
                      onClick={() => {
                        const today = new Date()
                        setDateRange({ from: startOfMonth(today), to: endOfMonth(today) })
                        setIsCalendarOpen(false)
                      }}
                    >
                      This Month
                    </Button>
                  </div>
                </div>
                <div className="p-3">
                  <Calendar
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={{
                      from: dateRange.from,
                      to: dateRange.to
                    }}
                    onSelect={(range) => {
                      if (range?.from && range?.to) {
                        setDateRange({
                          from: range.from,
                          to: range.to
                        })
                      }
                    }}
                    numberOfMonths={2}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalLeads}</div>
              <p className="text-xs text-muted-foreground">
                {formatDateRange(dateRange)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pipeline Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
              <p className="text-xs text-muted-foreground">
                Across all stages
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Two Column Layout */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Left Column - Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Lead Status Distribution</CardTitle>
              <CardDescription>
                Number of leads by stage
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              {statusDistribution.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No data available</p>
                </div>
              ) : (
                <div className="w-full">
                  <PieChart width={400} height={300}>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => `${value} leads`}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem',
                        color: 'hsl(var(--foreground))'
                      }}
                    />
                  </PieChart>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {statusDistribution.map((entry, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-sm"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-xs text-muted-foreground">{entry.name}</span>
                        <span className="text-xs font-medium ml-auto">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Column - Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Pipeline Value by Stage</CardTitle>
              <CardDescription>
                Total ticket size by lead stage
              </CardDescription>
            </CardHeader>
            <CardContent>
              {moneyByStage.every(item => item.value === 0) ? (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No data available</p>
                </div>
              ) : (
                <BarChart
                  width={500}
                  height={300}
                  data={moneyByStage}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis 
                    tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                      color: 'hsl(var(--foreground))'
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {moneyByStage.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Page>
  )
}


