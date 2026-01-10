import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Page } from '../components/Page'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Badge } from '../components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { ArrowLeft, ExternalLink, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { Lead, LeadStatus } from '../types'
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
  const [contacts, setContacts] = useState<string[]>([])
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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
          setContacts(data.contacts || [])
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

    setIsSaving(true)
    try {
      const { data, error } = await supabase
        .from('leads')
        .update({
          name: name.trim() || lead.name,
          industry: industry.trim() || null,
          ticket_size: ticketSize || null,
          website: website.trim() || null,
          notes: notes.trim() || null,
          contacts: contacts && contacts.length > 0 ? contacts : null,
          status: status,
        })
        .eq('id', leadId)
        .select()
        .single()

      if (error) {
        console.error('Error saving lead:', error)
        toast.error('Failed to save changes')
      } else if (data) {
        setLead(data)
        setLastSaved(new Date())
      }
    } catch (error) {
      console.error('Error saving lead:', error)
      toast.error('Failed to save changes')
    } finally {
      setIsSaving(false)
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
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Row 0: Back button + Breadcrumb */}
          <div className="flex items-center justify-between gap-2 p-4 mb-6 border-b border-border">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/funnel')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Funnel
              </Button>
              {isSaving && (
                <span className="text-xs text-muted-foreground ml-2">Saving...</span>
              )}
              {!isSaving && lastSaved && (
                <span className="text-xs text-muted-foreground ml-2">
                  Saved {lastSaved.toLocaleTimeString()}
                </span>
              )}
            </div>
            
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
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

            {/* Row 3: Contacts */}
            <div className="mb-6">
              <Label className="text-sm font-medium mb-3 block">Contacts</Label>
              <div className="space-y-2 mb-3">
                {contacts && contacts.length > 0 ? (
                  contacts.map((contact, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                      <span>{contact}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => {
                          const newContacts = contacts.filter((_, i) => i !== index)
                          setContacts(newContacts)
                          triggerAutosave()
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No contacts added</p>
                )}
              </div>
              <Input
                placeholder="Add contact (press Enter)"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const value = e.currentTarget.value.trim()
                    if (value) {
                      setContacts([...contacts, value])
                      e.currentTarget.value = ''
                      triggerAutosave()
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="w-px bg-border flex-shrink-0" />

        {/* Right Side - Sidebar */}
        <div className="w-[300px] flex-shrink-0 h-full">
          <div className="space-y-4 p-6">
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

            {/* Website */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Website</Label>
              <Input
                type="url"
                value={website}
                onChange={(e) => {
                  setWebsite(e.target.value)
                  triggerAutosave()
                }}
                placeholder="https://example.com"
              />
              {website && (
                <a 
                  href={website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  Visit website
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {/* Created */}
            <div className="space-y-2 pt-4 border-t">
              <Label className="text-xs text-muted-foreground">Created</Label>
              <p className="text-sm">
                {new Date(lead.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>

            {/* Updated */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Last Updated</Label>
              <p className="text-sm">
                {new Date(lead.updated_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
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
