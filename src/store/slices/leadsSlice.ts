/**
 * Leads Slice
 * Manages lead state with autosave functionality
 */

import { StateCreator } from 'zustand'
import { Lead } from '../../types'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'

export interface LeadsSlice {
  // State
  currentLead: Lead | null
  leadDraft: Partial<Lead>
  isSaving: boolean
  lastSaved: Date | null

  // Actions
  setCurrentLead: (lead: Lead | null) => void
  updateLeadDraft: (updates: Partial<Lead>) => void
  saveLead: () => Promise<void>
  clearLeadDraft: () => void
}

let saveTimeout: NodeJS.Timeout | null = null

export const createLeadsSlice: StateCreator<LeadsSlice> = (set, get) => ({
  // Initial state
  currentLead: null,
  leadDraft: {},
  isSaving: false,
  lastSaved: null,

  // Set the current lead being edited
  setCurrentLead: (lead) => {
    set({
      currentLead: lead,
      leadDraft: lead ? { ...lead } : {},
      lastSaved: null,
    })
  },

  // Update draft with debounced autosave
  updateLeadDraft: (updates) => {
    const { currentLead, leadDraft } = get()
    
    if (!currentLead) return

    // Update draft immediately for UI responsiveness
    const newDraft = { ...leadDraft, ...updates }
    set({ leadDraft: newDraft })

    // Debounce the save operation (500ms)
    if (saveTimeout) {
      clearTimeout(saveTimeout)
    }

    saveTimeout = setTimeout(() => {
      get().saveLead()
    }, 500)
  },

  // Save lead to database
  saveLead: async () => {
    const { currentLead, leadDraft } = get()
    
    if (!currentLead) return

    set({ isSaving: true })

    try {
      // Parse contacts if it's a string
      const contacts = typeof leadDraft.contacts === 'string'
        ? (leadDraft.contacts as string).split(',').map(c => c.trim()).filter(Boolean)
        : leadDraft.contacts

      const { data, error } = await supabase
        .from('leads')
        .update({
          name: leadDraft.name?.trim() || currentLead.name,
          industry: leadDraft.industry?.trim() || null,
          ticket_size: leadDraft.ticket_size || null,
          website: leadDraft.website?.trim() || null,
          notes: leadDraft.notes?.trim() || null,
          contacts: contacts && contacts.length > 0 ? contacts : null,
          status: leadDraft.status || currentLead.status,
        })
        .eq('id', currentLead.id)
        .select()
        .single()

      if (error) {
        console.error('Error saving lead:', error)
        toast.error('Failed to save changes')
      } else if (data) {
        set({
          currentLead: data,
          leadDraft: { ...data },
          lastSaved: new Date(),
        })
      }
    } catch (error) {
      console.error('Error saving lead:', error)
      toast.error('Failed to save changes')
    } finally {
      set({ isSaving: false })
    }
  },

  // Clear draft
  clearLeadDraft: () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout)
      saveTimeout = null
    }
    set({
      currentLead: null,
      leadDraft: {},
      isSaving: false,
      lastSaved: null,
    })
  },
})

