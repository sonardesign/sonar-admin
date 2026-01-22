/**
 * UI Slice - Stores UI state like filters, selections, etc.
 * 
 * This slice manages UI-related state that should persist across navigation
 * and be accessible globally.
 */

import { StateCreator } from 'zustand';
import { StoreState } from '../types';

export interface UISlice {
  // Kanban filters
  kanbanFilters: {
    selectedProjectId: string; // 'all' or project ID
    selectedUserId: string; // 'all' or user ID
  };
  // Funnel card fields visibility
  funnelCardFields: {
    industry: boolean;
    ticketSize: boolean;
    website: boolean;
  };

  // Actions
  setKanbanProjectFilter: (projectId: string) => void;
  setKanbanUserFilter: (userId: string) => void;
  resetKanbanFilters: () => void;
  setFunnelCardFields: (fields: UISlice['funnelCardFields']) => void;
  setFunnelCardField: (field: keyof UISlice['funnelCardFields'], value: boolean) => void;
}

/**
 * UI slice creator
 */
export const createUISlice: StateCreator<
  StoreState & UISlice,
  [],
  [],
  UISlice
> = (set) => {
  return {
    // Initial state
    kanbanFilters: {
      selectedProjectId: 'all',
      selectedUserId: 'all',
    },
    funnelCardFields: {
      industry: true,
      ticketSize: true,
      website: false,
    },

    // Set project filter
    setKanbanProjectFilter: (projectId) => {
      set((state) => ({
        kanbanFilters: {
          ...state.kanbanFilters,
          selectedProjectId: projectId,
        },
      }));
    },

    // Set user filter
    setKanbanUserFilter: (userId) => {
      set((state) => ({
        kanbanFilters: {
          ...state.kanbanFilters,
          selectedUserId: userId,
        },
      }));
    },

    // Reset all Kanban filters
    resetKanbanFilters: () => {
      set((state) => ({
        kanbanFilters: {
          selectedProjectId: 'all',
          selectedUserId: 'all',
        },
      }));
    },

    // Set all funnel card fields at once
    setFunnelCardFields: (fields) => {
      set(() => ({
        funnelCardFields: { ...fields },
      }));
    },

    // Set a single funnel card field
    setFunnelCardField: (field, value) => {
      set((state) => ({
        funnelCardFields: {
          ...state.funnelCardFields,
          [field]: value,
        },
      }));
    },
  };
};






