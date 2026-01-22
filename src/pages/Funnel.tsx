import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Page } from '../components/Page'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '../components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { Plus, ExternalLink, DollarSign, ChevronDown } from 'lucide-react'
import { ScrollArea } from '../components/ui/scroll-area'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { cn } from '../lib/utils'
import { Lead, LeadStatus } from '../types'
import { useAuth } from '../hooks/useAuth'
import { useAppStore } from '../store'

// Kanban column definitions
const COLUMNS: { id: LeadStatus; title: string; color: string }[] = [
  { id: 'contacted', title: 'Contacted', color: 'bg-slate-500' },
  { id: 'prospect', title: 'Prospect', color: 'bg-blue-500' },
  { id: 'lead', title: 'Lead', color: 'bg-purple-500' },
  { id: 'negotiation', title: 'Negotiation', color: 'bg-yellow-500' },
  { id: 'contract', title: 'Contract', color: 'bg-green-500' },
  { id: 'lost', title: 'Lost', color: 'bg-red-500' },
]

// Lead Card Component
interface LeadCardFieldVisibility {
  industry: boolean
  ticketSize: boolean
  website: boolean
}

interface LeadCardProps {
  lead: Lead
  index: number
  fieldVisibility: LeadCardFieldVisibility
  onClick?: () => void
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, index, fieldVisibility, onClick }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const showIndustry = fieldVisibility.industry && Boolean(lead.industry)
  const showTicketSize = fieldVisibility.ticketSize && Boolean(lead.ticket_size)
  const showWebsite = fieldVisibility.website && Boolean(lead.website)
  const showDetails = showIndustry || showTicketSize || showWebsite

  return (
    <div
      onClick={onClick}
      className="bg-card border border-border rounded-lg p-3 cursor-pointer shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Lead Name */}
      <p className="text-sm font-medium text-foreground line-clamp-2">
        {lead.name}
      </p>

      {/* Selected fields */}
      {showDetails && (
        <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
          {showIndustry && (
            <div className="flex items-center gap-1.5">
              <span className="truncate">{lead.industry}</span>
            </div>
          )}
          {showWebsite && (
            <div className="flex items-center gap-1.5">
              <ExternalLink className="h-3 w-3" />
              <span className="truncate">{lead.website}</span>
            </div>
          )}
          {showTicketSize && (
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-3 w-3" />
              <span>{formatCurrency(lead.ticket_size as number)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Kanban Column Component
interface KanbanColumnProps {
  column: { id: LeadStatus; title: string; color: string }
  leads: Lead[]
  cardFieldVisibility: LeadCardFieldVisibility
  onLeadClick: (lead: Lead) => void
  onAddClick: (status: LeadStatus) => void
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ column, leads, cardFieldVisibility, onLeadClick, onAddClick }) => {
  // Calculate total ticket value for this column
  const totalValue = leads.reduce((sum, lead) => sum + (lead.ticket_size || 0), 0)
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="flex flex-col bg-muted/30 rounded-lg min-w-[280px] w-[280px] max-h-full">
      {/* Column Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className={cn("h-3 w-3 rounded-full", column.color)} />
            <h3 className="font-semibold text-sm">{column.title}</h3>
            <span className="text-xs text-muted-foreground">({leads.length})</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onAddClick(column.id)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {cardFieldVisibility.ticketSize && (
          <div className="text-xs font-semibold text-foreground/80">
            {formatCurrency(totalValue)}
          </div>
        )}
      </div>
      
      {/* Column Content */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <ScrollArea className="flex-1">
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={cn(
                "p-2 min-h-[100px]",
                snapshot.isDraggingOver && "bg-primary/5"
              )}
            >
              {leads.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
                  No leads
                </div>
              ) : (
                leads.map((lead, index) => (
                  <Draggable key={lead.id} draggableId={lead.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={cn(
                          "mb-2",
                          snapshot.isDragging && "opacity-50"
                        )}
                      >
                        <LeadCard
                          lead={lead}
                          index={index}
                          fieldVisibility={cardFieldVisibility}
                          onClick={() => onLeadClick(lead)}
                        />
                      </div>
                    )}
                  </Draggable>
                ))
              )}
              {provided.placeholder}
            </div>
          </ScrollArea>
        )}
      </Droppable>
    </div>
  )
}

// Main Funnel Page Component
export const Funnel: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const showIndustry = useAppStore((state) => state.funnelCardFields.industry)
  const showTicketSize = useAppStore((state) => state.funnelCardFields.ticketSize)
  const showWebsite = useAppStore((state) => state.funnelCardFields.website)
  const setFunnelCardField = useAppStore((state) => state.setFunnelCardField)
  const cardFieldVisibility = useMemo(() => ({
    industry: showIndustry,
    ticketSize: showTicketSize,
    website: showWebsite,
  }), [showIndustry, showTicketSize, showWebsite])
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  // Create lead modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    industry: '',
    ticket_size: '',
    website: '',
    notes: '',
    contacts: '',
    status: 'contacted' as LeadStatus,
  })

  // Load all leads
  useEffect(() => {
    loadLeads()
  }, [])

  const loadLeads = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading leads:', error)
        toast.error('Failed to load leads')
      } else {
        setLeads(data || [])
      }
    } catch (error) {
      console.error('Error loading leads:', error)
    } finally {
      setLoading(false)
    }
  }

  // Group leads by status
  const leadsByStatus = useMemo(() => {
    const grouped: Record<LeadStatus, Lead[]> = {
      contacted: [],
      prospect: [],
      lead: [],
      negotiation: [],
      contract: [],
      lost: [],
    }

    leads.forEach(lead => {
      if (grouped[lead.status]) {
        grouped[lead.status].push(lead)
      }
    })

    return grouped
  }, [leads])

  // Handle drag end
  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result

    if (!destination) return

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return
    }

    const draggedLead = leads.find(l => l.id === draggableId)
    if (!draggedLead) return

    const newStatus = destination.droppableId as LeadStatus

    // Optimistic update
    setLeads(prev =>
      prev.map(l =>
        l.id === draggableId ? { ...l, status: newStatus } : l
      )
    )

    // Update in database
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', draggableId)

      if (error) {
        console.error('Error updating lead status:', error)
        toast.error('Failed to update lead status')
        await loadLeads()
      }
    } catch (error) {
      console.error('Error updating lead:', error)
      await loadLeads()
    }
  }

  // Handle lead click
  const handleLeadClick = useCallback((lead: Lead) => {
    navigate(`/funnel/${lead.id}`)
  }, [navigate])

  // Handle add lead click (opens modal with pre-selected status)
  const handleAddClick = useCallback((status: LeadStatus) => {
    setCreateForm(prev => ({ ...prev, status }))
    setIsCreateModalOpen(true)
  }, [])

  // Handle create lead
  const handleCreateLead = async () => {
    if (!createForm.name.trim()) {
      toast.error('Please enter a lead name')
      return
    }

    if (!user) {
      toast.error('You must be logged in')
      return
    }

    try {
      // Parse contacts (comma-separated)
      const contacts = createForm.contacts
        ? createForm.contacts.split(',').map(c => c.trim()).filter(Boolean)
        : []

      const { data, error } = await supabase
        .from('leads')
        .insert([
          {
            name: createForm.name.trim(),
            industry: createForm.industry.trim() || null,
            ticket_size: createForm.ticket_size ? parseInt(createForm.ticket_size) : null,
            website: createForm.website.trim() || null,
            notes: createForm.notes.trim() || null,
            contacts: contacts.length > 0 ? contacts : null,
            status: createForm.status,
            created_by: user.id,
          },
        ])
        .select()
        .single()

      if (error) {
        console.error('Error creating lead:', error)
        toast.error('Failed to create lead')
      } else {
        toast.success('Lead created successfully')
        setIsCreateModalOpen(false)
        setCreateForm({
          name: '',
          industry: '',
          ticket_size: '',
          website: '',
          notes: '',
          contacts: '',
          status: 'contacted',
        })
        await loadLeads()
      }
    } catch (error) {
      console.error('Error creating lead:', error)
      toast.error('Failed to create lead')
    }
  }

  return (
    <Page loading={loading} loadingText="Loading funnel...">
      <div className="space-y-4">
        {/* Header with Filters and Create Button */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-xl font-bold">Sales Funnel</h2>
              <p className="text-xs text-muted-foreground">
                Manage your sales pipeline
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              {leads.length} total leads
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Card fields
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Show on cards</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={cardFieldVisibility.industry}
                  onCheckedChange={(checked) => {
                    setFunnelCardField('industry', Boolean(checked))
                  }}
                >
                  Industry
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={cardFieldVisibility.ticketSize}
                  onCheckedChange={(checked) => {
                    setFunnelCardField('ticketSize', Boolean(checked))
                  }}
                >
                  Ticket size
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={cardFieldVisibility.website}
                  onCheckedChange={(checked) => {
                    setFunnelCardField('website', Boolean(checked))
                  }}
                >
                  Website
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Lead
            </Button>
          </div>
        </div>

        {/* Kanban Board */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-150px)]">
                {COLUMNS.map(column => (
                  <KanbanColumn
                    key={column.id}
                    column={column}
                    leads={leadsByStatus[column.id]}
                    cardFieldVisibility={cardFieldVisibility}
                    onLeadClick={handleLeadClick}
                    onAddClick={handleAddClick}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </DragDropContext>
      </div>

      {/* Create Lead Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Lead</DialogTitle>
            <DialogDescription>
              Add a new lead to your sales pipeline
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Company or person name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              />
            </div>

            {/* Industry */}
            <div className="grid gap-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                placeholder="e.g., Technology, Healthcare, Finance"
                value={createForm.industry}
                onChange={(e) => setCreateForm({ ...createForm, industry: e.target.value })}
              />
            </div>

            {/* Ticket Size */}
            <div className="grid gap-2">
              <Label htmlFor="ticket_size">Ticket Size (HUF)</Label>
              <Input
                id="ticket_size"
                type="text"
                placeholder="Expected deal size"
                value={createForm.ticket_size ? new Intl.NumberFormat('hu-HU').format(parseInt(createForm.ticket_size.replace(/\s/g, ''))) : ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/\s/g, '')
                  if (value === '' || /^\d+$/.test(value)) {
                    setCreateForm({ ...createForm, ticket_size: value })
                  }
                }}
              />
            </div>

            {/* Website */}
            <div className="grid gap-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://example.com"
                value={createForm.website}
                onChange={(e) => setCreateForm({ ...createForm, website: e.target.value })}
              />
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes about this lead..."
                rows={4}
                value={createForm.notes}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
              />
            </div>

            {/* Contacts */}
            <div className="grid gap-2">
              <Label htmlFor="contacts">Contacts</Label>
              <Input
                id="contacts"
                placeholder="Comma-separated: John Doe, jane@example.com"
                value={createForm.contacts}
                onChange={(e) => setCreateForm({ ...createForm, contacts: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Enter contact names or emails, separated by commas
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateLead}>
              Create Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  )
}

