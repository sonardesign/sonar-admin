import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Badge } from '../components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { ArrowLeft, Plus, Clock, DollarSign, Receipt, Calculator, Edit2 } from 'lucide-react'
import { useSupabaseAppState } from '../hooks/useSupabaseAppState'
import { useProjectsData } from '../hooks/useProjectsData'
import { Project, TimeEntry } from '../types'
import { Page } from '../components/Page'

interface MaterialCost {
  id: string
  description: string
  cost: number
  type: 'cost' | 'bill'
  date: string
  created_at: string
}

interface UserHourlyRate {
  userId: string
  userName: string
  costPerHour: number
  pricePerHour: number
  currency: 'HUF' | 'USD' | 'EUR'
}

interface EditRateData {
  userId: string
  userName: string
  costPerHour: number
  pricePerHour: number
  currency: 'HUF' | 'USD' | 'EUR'
}

export const ProjectDetails: React.FC = () => {
  const { projectName } = useParams<{ projectName: string }>()
  const navigate = useNavigate()
  const { timeEntries, users, loading: appLoading } = useSupabaseAppState()
  const { projects, loading: projectsLoading } = useProjectsData()
  
  const [materialCosts, setMaterialCosts] = useState<MaterialCost[]>([])
  const [isAddCostOpen, setIsAddCostOpen] = useState(false)
  const [newCostDescription, setNewCostDescription] = useState('')
  const [newCostAmount, setNewCostAmount] = useState('')
  const [newCostType, setNewCostType] = useState<'cost' | 'bill'>('cost')
  
  // Hourly rate management state
  const [userHourlyRates, setUserHourlyRates] = useState<UserHourlyRate[]>([])
  const [isEditRateOpen, setIsEditRateOpen] = useState(false)
  const [editingRate, setEditingRate] = useState<EditRateData | null>(null)

  // Find the project by name from URL
  const project = useMemo(() => {
    if (!projectName || !projects.length) return null
    const decodedName = decodeURIComponent(projectName)
    return projects.find(p => p.name === decodedName) || null
  }, [projectName, projects])

  // Get time entries for this project
  const projectTimeEntries = useMemo(() => {
    if (!project || !timeEntries.length) return []
    return timeEntries.filter(entry => 
      entry.project_id === project.id || entry.projectId === project.id
    )
  }, [project, timeEntries])

  // Get unique contributors (users who have time entries on this project)
  const projectContributors = useMemo(() => {
    if (!projectTimeEntries.length || !users.length) return []
    
    const contributorIds = [...new Set(projectTimeEntries.map(entry => entry.user_id))]
    return contributorIds.map(userId => {
      const user = users.find(u => u.id === userId)
      if (!user) return null
      
      // Get or create hourly rate for this user
      const existingRate = userHourlyRates.find(rate => rate.userId === userId)
      const defaultCostRate = project?.hourly_rate || 50
      const defaultPriceRate = defaultCostRate * 1.5
      
      return {
        userId,
        userName: user.full_name,
        costPerHour: existingRate?.costPerHour || defaultCostRate,
        pricePerHour: existingRate?.pricePerHour || defaultPriceRate,
        currency: existingRate?.currency || 'USD' as const
      }
    }).filter(Boolean) as UserHourlyRate[]
  }, [projectTimeEntries, users, userHourlyRates, project])

  // Calculate time entries costs by user
  const timeEntriesCosts = useMemo(() => {
    if (!projectTimeEntries.length || !users.length) return []
    
    const userCosts = new Map()
    
    projectTimeEntries.forEach(entry => {
      const userId = entry.user_id
      const user = users.find(u => u.id === userId)
      if (!user) return
      
      const durationHours = (entry.duration_minutes || entry.duration || 0) / 60
      
      // Use custom rates if available, otherwise fall back to defaults
      const contributor = projectContributors.find(c => c.userId === userId)
      const costPerHour = contributor?.costPerHour || entry.hourly_rate || project?.hourly_rate || 50
      const pricePerHour = contributor?.pricePerHour || (costPerHour * 1.5)
      
      const totalCost = durationHours * costPerHour
      const totalIncome = durationHours * pricePerHour
      const totalProfit = totalIncome - totalCost
      
      if (userCosts.has(userId)) {
        const existing = userCosts.get(userId)
        userCosts.set(userId, {
          ...existing,
          timeSpent: existing.timeSpent + durationHours,
          totalCost: existing.totalCost + totalCost,
          totalIncome: existing.totalIncome + totalIncome,
          totalProfit: existing.totalProfit + totalProfit,
          // Keep the same rates (they should be consistent per user)
          costPerHour: existing.costPerHour || costPerHour,
          pricePerHour: existing.pricePerHour || pricePerHour
        })
      } else {
        userCosts.set(userId, {
          userId,
          userName: user.full_name,
          timeSpent: durationHours,
          costPerHour,
          pricePerHour,
          totalCost,
          totalProfit,
          totalIncome
        })
      }
    })
    
    return Array.from(userCosts.values())
  }, [projectTimeEntries, users, project, projectContributors])

  // Calculate totals
  const totals = useMemo(() => {
    const timeCosts = timeEntriesCosts.reduce((sum, entry) => sum + entry.totalCost, 0)
    const timeIncome = timeEntriesCosts.reduce((sum, entry) => sum + entry.totalIncome, 0)
    const timeProfit = timeEntriesCosts.reduce((sum, entry) => sum + entry.totalProfit, 0)
    const materialCostsTotal = materialCosts.reduce((sum, cost) => sum + cost.cost, 0)
    const totalCosts = timeCosts + materialCostsTotal
    const totalIncome = timeIncome // Material costs don't generate income directly
    const totalProfit = timeProfit - materialCostsTotal // Subtract material costs from profit
    
    return {
      totalCosts,
      totalIncome,
      totalProfit,
      timeCosts,
      timeIncome,
      timeProfit,
      materialCosts: materialCostsTotal
    }
  }, [timeEntriesCosts, materialCosts])

  const handleAddMaterialCost = () => {
    if (!newCostDescription.trim() || !newCostAmount.trim()) return
    
    const newCost: MaterialCost = {
      id: Date.now().toString(),
      description: newCostDescription.trim(),
      cost: parseFloat(newCostAmount),
      type: newCostType,
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    }
    
    setMaterialCosts(prev => [...prev, newCost])
    setNewCostDescription('')
    setNewCostAmount('')
    setIsAddCostOpen(false)
  }

  const handleDeleteMaterialCost = (costId: string) => {
    setMaterialCosts(prev => prev.filter(cost => cost.id !== costId))
  }

  const handleEditRate = (contributor: UserHourlyRate) => {
    setEditingRate(contributor)
    setIsEditRateOpen(true)
  }

  const handleSaveRate = () => {
    if (!editingRate) return
    
    setUserHourlyRates(prev => {
      const existing = prev.find(rate => rate.userId === editingRate.userId)
      if (existing) {
        return prev.map(rate => 
          rate.userId === editingRate.userId ? editingRate : rate
        )
      } else {
        return [...prev, editingRate]
      }
    })
    
    setIsEditRateOpen(false)
    setEditingRate(null)
  }

  const handleCancelEditRate = () => {
    setIsEditRateOpen(false)
    setEditingRate(null)
  }

  const formatCurrency = (amount: number, currency: 'HUF' | 'USD' | 'EUR' = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`
  }

  if (appLoading || projectsLoading) {
    return (
      <Page>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading project details...</p>
          </div>
        </div>
      </Page>
    )
  }

  if (!project) {
    return (
      <Page>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-destructive mb-2">Project Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The project "{projectName}" could not be found.
            </p>
            <Button onClick={() => navigate('/projects')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
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
            onClick={() => navigate('/projects')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Button>
          
          <div className="flex items-center gap-3">
            <div 
              className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
              style={{ backgroundColor: project.color }}
            />
            <div>
              <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
              <p className="text-muted-foreground">
                {project.client_name || project.clientName} • {project.status}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - 2/3 width */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Time Entries Costs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Cost by Time Entries
                </CardTitle>
                <CardDescription>
                  Time tracking costs and billing for this project
                </CardDescription>
              </CardHeader>
              <CardContent>
                {timeEntriesCosts.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User Name</TableHead>
                        <TableHead className="text-right">Time Spent</TableHead>
                        <TableHead className="text-right">Cost per Hour</TableHead>
                        <TableHead className="text-right">Price per Hour</TableHead>
                        <TableHead className="text-right">Total Cost</TableHead>
                        <TableHead className="text-right">Total Profit</TableHead>
                        <TableHead className="text-right">Total Income</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {timeEntriesCosts.map((entry) => (
                        <TableRow key={entry.userId}>
                          <TableCell className="font-medium">
                            {entry.userName}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatHours(entry.timeSpent)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(entry.costPerHour)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(entry.pricePerHour)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(entry.totalCost)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-green-600">
                            {formatCurrency(entry.totalProfit)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-primary">
                            {formatCurrency(entry.totalIncome)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Totals Row */}
                      <TableRow className="border-t-2 border-border bg-muted/30 font-semibold">
                        <TableCell className="font-bold">
                          TOTALS
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatHours(
                            timeEntriesCosts.reduce((sum, entry) => sum + entry.timeSpent, 0)
                          )}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          —
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          —
                        </TableCell>
                        <TableCell className="text-right font-bold text-red-600">
                          {formatCurrency(totals.timeCosts)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          {formatCurrency(totals.timeProfit)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          {formatCurrency(totals.timeIncome)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No time entries recorded for this project yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Material Costs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Other Material Costs
                </CardTitle>
                <CardDescription>
                  Additional costs and expenses for this project
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Add New Cost Button */}
                  <Dialog open={isAddCostOpen} onOpenChange={setIsAddCostOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full" variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Cost Entry
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Material Cost</DialogTitle>
                        <DialogDescription>
                          Add a new cost entry from costs or bills.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="costDescription">Description</Label>
                          <Input
                            id="costDescription"
                            value={newCostDescription}
                            onChange={(e) => setNewCostDescription(e.target.value)}
                            placeholder="Enter cost description..."
                          />
                        </div>
                        <div>
                          <Label htmlFor="costAmount">Amount</Label>
                          <Input
                            id="costAmount"
                            type="number"
                            step="0.01"
                            value={newCostAmount}
                            onChange={(e) => setNewCostAmount(e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="costType">Type</Label>
                          <Select value={newCostType} onValueChange={(value: 'cost' | 'bill') => setNewCostType(value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cost">From Costs</SelectItem>
                              <SelectItem value="bill">From Bill</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setIsAddCostOpen(false)}>
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleAddMaterialCost}
                            disabled={!newCostDescription.trim() || !newCostAmount.trim()}
                          >
                            Add Cost
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Material Costs Table */}
                  {materialCosts.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Description</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {materialCosts.map((cost) => (
                          <TableRow key={cost.id}>
                            <TableCell className="font-medium">
                              {cost.description}
                            </TableCell>
                            <TableCell>
                              <Badge variant={cost.type === 'bill' ? 'default' : 'secondary'}>
                                {cost.type === 'bill' ? 'Bill' : 'Cost'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(cost.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(cost.cost)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteMaterialCost(cost.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                ×
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No material costs added yet.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Hourly Rates Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Hourly Rates
                </CardTitle>
                <CardDescription>
                  Manage cost and price rates for project contributors
                </CardDescription>
              </CardHeader>
              <CardContent>
                {projectContributors.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User Name</TableHead>
                        <TableHead className="text-right">Cost per Hour</TableHead>
                        <TableHead className="text-right">Price per Hour</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectContributors.map((contributor) => (
                        <TableRow key={contributor.userId}>
                          <TableCell className="font-medium">
                            {contributor.userName}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(contributor.costPerHour, contributor.currency)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(contributor.pricePerHour, contributor.currency)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditRate(contributor)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No contributors found for this project.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sticky Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Project Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-3 border-b">
                      <span className="font-medium">Total Income</span>
                      <span className="text-2xl font-bold text-primary">
                        {formatCurrency(totals.totalIncome)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="font-medium">Total Profit</span>
                      <span className="text-xl font-bold text-green-600">
                        {formatCurrency(totals.totalProfit)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total Costs</span>
                      <span className="font-semibold text-red-600">
                        {formatCurrency(totals.totalCosts)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Time Costs
                      </span>
                      <span className="font-medium">
                        {formatCurrency(totals.timeCosts)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Receipt className="h-4 w-4" />
                        Material Costs
                      </span>
                      <span className="font-medium">
                        {formatCurrency(totals.materialCosts)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Time Income
                      </span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(totals.timeIncome)}
                      </span>
                    </div>
                  </div>

                  {/* Additional Project Info */}
                  <div className="pt-4 border-t space-y-2">
                    <div className="text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Time Entries:</span>
                        <span>{projectTimeEntries.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Material Costs:</span>
                        <span>{materialCosts.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Hours:</span>
                        <span>
                          {formatHours(
                            projectTimeEntries.reduce((sum, entry) => 
                              sum + ((entry.duration_minutes || entry.duration || 0) / 60), 0
                            )
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Hourly Rate Modal */}
      <Dialog open={isEditRateOpen} onOpenChange={setIsEditRateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Hourly Rates</DialogTitle>
            <DialogDescription>
              Update cost and price rates for {editingRate?.userName}
            </DialogDescription>
          </DialogHeader>
          {editingRate && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="costPerHour">Cost per Hour</Label>
                <Input
                  id="costPerHour"
                  type="number"
                  step="0.01"
                  value={editingRate.costPerHour}
                  onChange={(e) => setEditingRate({
                    ...editingRate,
                    costPerHour: parseFloat(e.target.value) || 0
                  })}
                  placeholder="50.00"
                />
              </div>
              <div>
                <Label htmlFor="pricePerHour">Price per Hour</Label>
                <Input
                  id="pricePerHour"
                  type="number"
                  step="0.01"
                  value={editingRate.pricePerHour}
                  onChange={(e) => setEditingRate({
                    ...editingRate,
                    pricePerHour: parseFloat(e.target.value) || 0
                  })}
                  placeholder="75.00"
                />
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select 
                  value={editingRate.currency} 
                  onValueChange={(value: 'HUF' | 'USD' | 'EUR') => setEditingRate({
                    ...editingRate,
                    currency: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="HUF">HUF - Hungarian Forint</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCancelEditRate}>
                  Cancel
                </Button>
                <Button onClick={handleSaveRate}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Page>
  )
}
