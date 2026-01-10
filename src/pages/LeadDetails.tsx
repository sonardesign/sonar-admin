import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Page } from '../components/Page'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Badge } from '../components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { ArrowLeft, ExternalLink, Trash2, Phone, Globe, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { Lead, LeadStatus, Contact } from '../types'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'

const STATUS_OPTIONS: { value: LeadStatus; label: string; color: string }[] = [
  { value: 'contacted', label: 'Contacted', color: 'bg-slate-500' },
  { value: 'prospect', label: 'Prospect', color: 'bg-blue-500' },
  { value: 'lead', label: 'Lead', color: 'bg-purple-500' },
  { value: 'negotiation', label: 'Negotiation', color: 'bg-yellow-500' },
  { value: 'contract', label: 'Contract', color: 'bg-green-500' },
  { value: 'lost', label: 'Lost', color: 'bg-red-500' },
]

export const LeadDetails: React.FC = () => {
  const { leadId } = useParams<{ leadId: string }>()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [lead, setLead] = useState<Lead | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  
  // Draft state for editing
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<LeadStatus>('contacted')
  const [industry, setIndustry] = useState('')
  const [ticketSize, setTicketSize] = useState<number | undefined>()
  const [website, setWebsite] = useState('')
  const [contactIds, setContactIds] = useState<string[]>([])
  const [linkedContacts, setLinkedContacts] = useState<Contact[]>([])
  const [allContacts, setAllContacts] = useState<Contact[]>([])
  const [selectedContactId, setSelectedContactId] = useState<string>('')
  const [allLeads, setAllLeads] = useState<Lead[]>([])
  const [currentLeadIndex, setCurrentLeadIndex] = useState<number>(-1)
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Load all leads for navigation
  useEffect(() => {
    const loadAllLeads = async () => {
      try {
        const { data, error } = await supabase
          .from('leads')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error loading leads:', error)
        } else if (data) {
          setAllLeads(data)
          const index = data.findIndex(l => l.id === leadId)
          setCurrentLeadIndex(index)
        }
      } catch (error) {
        console.error('Error loading leads:', error)
      }
    }

    if (leadId) {
      loadAllLeads()
    }
  }, [leadId])

  // Load all contacts for dropdown
  useEffect(() => {
    const loadAllContacts = async () => {
      try {
        const { data, error } = await supabase
          .from('contacts')
          .select('*')
          .order('name')

        if (error) {
          console.error('Error loading contacts:', error)
        } else if (data) {
          setAllContacts(data)
        }
      } catch (error) {
        console.error('Error loading contacts:', error)
      }
    }

    loadAllContacts()
  }, [])

  // Load lead data
  useEffect(() => {
    const loadLead = async () => {
      if (!leadId) return
      
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('leads')
          .select('*')
          .eq('id', leadId)
          .single()

        if (error) {
          console.error('Error loading lead:', error)
          toast.error('Failed to load lead')
        } else if (data) {
          setLead(data)
          setName(data.name || '')
          setNotes(data.notes || '')
          setStatus(data.status)
          setIndustry(data.industry || '')
          setTicketSize(data.ticket_size || undefined)
          setWebsite(data.website || '')
          const ids = data.contacts || []
          setContactIds(ids)
          
          // Load linked contacts
          if (ids.length > 0) {
            const { data: contactsData } = await supabase
              .from('contacts')
              .select('*')
              .in('id', ids)
            
            if (contactsData) {
              setLinkedContacts(contactsData)
            }
          }
        }
      } catch (error) {
        console.error('Error loading lead:', error)
      } finally {
        setLoading(false)
      }
    }

    if (leadId) {
      loadLead()
    }
  }, [leadId])

  // Autosave function
  const saveLead = async () => {
    if (!lead || !leadId) return

    console.log('💾 Saving lead with contacts:', contactIds)
    setIsSaving(true)
    try {
      const updateData = {
        name: name.trim() || lead.name,
        industry: industry.trim() || null,
        ticket_size: ticketSize || null,
        website: website.trim() || null,
        notes: notes.trim() || null,
        contacts: contactIds.length > 0 ? contactIds : [],
        status: status,
      }
      console.log('📝 Update data:', updateData)

      const { data, error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', leadId)
        .select()
        .single()

      if (error) {
        console.error('❌ Error saving lead:', error)
        toast.error('Failed to save changes')
      } else if (data) {
        console.log('✅ Lead saved successfully:', data)
        setLead(data)
        setLastSaved(new Date())
      }
    } catch (error) {
      console.error('❌ Error saving lead:', error)
      toast.error('Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  // Remove contact from lead
  const handleRemoveContact = (contactId: string) => {
    // Update local state
    setContactIds(contactIds.filter(id => id !== contactId))
    setLinkedContacts(linkedContacts.filter(c => c.id !== contactId))
    // Autosave will be triggered by useEffect watching contactIds
  }

  // Navigate to previous lead
  const handlePrevLead = () => {
    if (currentLeadIndex > 0 && allLeads[currentLeadIndex - 1]) {
      navigate(`/funnel/${allLeads[currentLeadIndex - 1].id}`)
    }
  }

  // Navigate to next lead
  const handleNextLead = () => {
    if (currentLeadIndex < allLeads.length - 1 && allLeads[currentLeadIndex + 1]) {
      navigate(`/funnel/${allLeads[currentLeadIndex + 1].id}`)
    }
  }

  // Debounced autosave
  const triggerAutosave = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveLead()
    }, 500)
  }

  // Watch for changes and trigger autosave
  useEffect(() => {
    if (!lead) return // Don't save until initial load is complete
    
    triggerAutosave()
  }, [name, notes, status, industry, ticketSize, website, contactIds])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  const handleDelete = async () => {
    if (!lead) return

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', lead.id)

      if (error) {
        console.error('Error deleting lead:', error)
        toast.error('Failed to delete lead')
      } else {
        toast.success('Lead deleted successfully')
        navigate('/funnel')
      }
    } catch (error) {
      console.error('Error deleting lead:', error)
      toast.error('Failed to delete lead')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return (
      <Page loading={loading} loadingText="Loading lead...">
        <div />
      </Page>
    )
  }

  if (!lead) {
    return (
      <Page title="Lead Not Found">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-muted-foreground">The lead you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/funnel')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Funnel
          </Button>
        </div>
      </Page>
    )
  }

  return (
    <Page title="">
      <div className="h-full flex border border-border rounded-lg">
        {/* Left Side - Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto border-r border-border">
          {/* Row 0: Top bar */}
          <div className="flex items-center justify-between gap-2 p-4 mb-6 border-b border-border">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/funnel')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Funnel
              </Button>
              
              {/* Status chip */}
              <Badge className={`${STATUS_OPTIONS.find(opt => opt.value === status)?.color} text-white`}>
                {STATUS_OPTIONS.find(opt => opt.value === status)?.label}
              </Badge>
              
              {isSaving && (
                <span className="text-xs text-muted-foreground">Saving...</span>
              )}
              {!isSaving && lastSaved && (
                <span className="text-xs text-muted-foreground">
                  Saved {lastSaved.toLocaleTimeString()}
                </span>
              )}
            </div>
            
            {/* Navigation buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevLead}
                disabled={currentLeadIndex <= 0}
                className="h-8 w-8 p-0"
                title="Previous Lead"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextLead}
                disabled={currentLeadIndex >= allLeads.length - 1}
                className="h-8 w-8 p-0"
                title="Next Lead"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content body - centered with max-width */}
          <div className="max-w-[80ch] mx-auto w-full px-6">
            {/* Row 1: Title */}
            <div className="mb-6">
              <div
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => {
                  setName(e.currentTarget.textContent || '')
                  triggerAutosave()
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    e.currentTarget.blur()
                  }
                }}
                className="font-normal text-foreground outline-none"
                style={{ fontSize: '1.5rem' }}
                data-placeholder="Lead name..."
                dangerouslySetInnerHTML={{ __html: name || '' }}
              />
              <style>{`
                [data-placeholder]:empty:before {
                  content: attr(data-placeholder);
                  color: hsl(var(--muted-foreground));
                }
              `}</style>
            </div>

            {/* Row 2: Notes */}
            <div className="mb-6">
              <Label className="text-sm font-medium mb-3 block">Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value)
                  triggerAutosave()
                }}
                placeholder="Add notes about this lead..."
                rows={10}
                className="resize-none"
              />
            </div>

          </div>
        </div>

        {/* Right Side - Sidebar */}
        <div className="w-80 flex flex-col bg-muted/10">
          <div className="p-4 space-y-4">
            {/* Delete Button */}
            <Button 
              variant="destructive" 
              className="w-full"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Lead
            </Button>

            {/* Status */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select 
                value={status} 
                onValueChange={(value: LeadStatus) => {
                  setStatus(value)
                  triggerAutosave()
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Industry */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Industry</Label>
              <Input
                value={industry}
                onChange={(e) => {
                  setIndustry(e.target.value)
                  triggerAutosave()
                }}
                placeholder="e.g., Technology"
              />
            </div>

            {/* Ticket Size */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Ticket Size (HUF)</Label>
              <Input
                type="text"
                value={ticketSize ? new Intl.NumberFormat('hu-HU').format(ticketSize) : ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/\s/g, '')
                  if (value === '' || /^\d+$/.test(value)) {
                    setTicketSize(value ? parseInt(value) : undefined)
                    triggerAutosave()
                  }
                }}
                placeholder="Expected deal size"
              />
            </div>
          </div>

          {/* Contacts Section */}
          <div className="border-t border-border">
            <div className="p-4 border-b border-border">
              <h3 className="font-medium mb-4">Contacts</h3>
            
            {/* Add Contact Combobox */}
            <div className="flex gap-2 mb-4">
              <Select 
                value={selectedContactId} 
                onValueChange={(value) => {
                  setSelectedContactId(value)
                  // Auto-add when selected
                  if (value) {
                    setTimeout(() => {
                      const newIds = [...contactIds, value]
                      setContactIds(newIds)
                      const contact = allContacts.find(c => c.id === value)
                      if (contact) {
                        setLinkedContacts([...linkedContacts, contact])
                      }
                      setSelectedContactId('')
                    }, 100)
                  }
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select contact to add..." />
                </SelectTrigger>
                <SelectContent>
                  {allContacts
                    .filter(c => !contactIds.includes(c.id))
                    .map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

            {/* Contacts List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {linkedContacts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No contacts linked
                </p>
              ) : (
                linkedContacts.map((contact) => (
                  <div 
                    key={contact.id} 
                    className="p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-medium text-sm">{contact.name}</div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleRemoveContact(contact.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    {contact.organization_name && (
                      <div className="text-xs text-muted-foreground mb-2">
                        {contact.organization_name}
                      </div>
                    )}
                    
                    {contact.phone && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Phone className="h-3 w-3" />
                        <span>{contact.phone}</span>
                      </div>
                    )}
                    
                    {contact.email && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <span className="truncate">{contact.email}</span>
                      </div>
                    )}
                    
                    {contact.url && (
                      <div className="flex items-center gap-2 text-xs mt-2">
                        <Globe className="h-3 w-3 text-muted-foreground" />
                        <a 
                          href={contact.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline truncate"
                        >
                          {contact.url}
                        </a>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Lead</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{lead.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  )
}
