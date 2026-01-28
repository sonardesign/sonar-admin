/**
 * Main Zustand Store
 * 
 * This is the central store that combines all slices and middleware.
 * It's designed to be modular - you can add/remove slices as needed.
 */

import { create } from 'zustand';
import { shallow } from 'zustand/shallow';
import { undoRedoMiddleware, UndoRedoStateWithMethods } from './middleware/undoRedo';
import { StoreState } from './types';
import { createTasksSlice, TasksSlice } from './slices/tasksSlice';
import { createUISlice, UISlice } from './slices/uiSlice';
import { createLeadsSlice, LeadsSlice } from './slices/leadsSlice';

/**
 * Combined store type
 * Add new slices to this type as you create them
 */
export type AppStore = Omit<StoreState, 'undoRedo'> & { undoRedo: UndoRedoStateWithMethods } & TasksSlice & UISlice & LeadsSlice;

/**
 * Create the store with undo/redo middleware
 * 
 * To add a new slice:
 * 1. Create a slice file in src/store/slices/
 * 2. Import it here
 * 3. Add it to the AppStore type above
 * 4. Combine it in the store creator below
 */
export const useAppStore = create<AppStore>()(
  undoRedoMiddleware((set, get, api) => ({
    // Undo/Redo state is initialized by middleware
    // Combine all slices here
    ...createTasksSlice(set, get, api),
    ...createUISlice(set, get, api),
    ...createLeadsSlice(set, get, api),

    // Add more slices here:
    // ...createProjectsSlice(set, get, api),
    // ...createTimeEntriesSlice(set, get, api),
  }))
);

/**
 * Selector hooks for better performance
 * These allow components to subscribe only to specific parts of the store
 */

// Undo/Redo selectors
export const useUndoRedo = () => {
  return useAppStore(
    (state) => ({
      canUndo: state.undoRedo.canUndo,
      canRedo: state.undoRedo.canRedo,
      undo: state.undoRedo.undo,
      redo: state.undoRedo.redo,
      clearHistory: state.undoRedo.clearHistory,
    }),
    shallow
  );
};

// Tasks selectors
export const useTasks = () => useAppStore((state) => state.tasks);
export const useSelectedTask = () => useAppStore((state) => state.selectedTaskId);
export const useTasksActions = () =>
  useAppStore(
    (state) => ({
      setTasks: state.setTasks,
      addTask: state.addTask,
      updateTask: state.updateTask,
      deleteTask: state.deleteTask,
      setSelectedTask: state.setSelectedTask,
      loadTasks: state.loadTasks,
    }),
    shallow
  );

// UI selectors
export const useKanbanFilters = () =>
  useAppStore(
    (state) => state.kanbanFilters,
    shallow
  );
export const useFunnelCardFields = () =>
  useAppStore(
    (state) => state.funnelCardFields,
    shallow
  );
export const useUIActions = () =>
  useAppStore(
    (state) => ({
      setKanbanProjectFilter: state.setKanbanProjectFilter,
      setKanbanUserFilter: state.setKanbanUserFilter,
      resetKanbanFilters: state.resetKanbanFilters,
      setFunnelCardFields: state.setFunnelCardFields,
      setFunnelCardField: state.setFunnelCardField,
      setLastVisitedPath: state.setLastVisitedPath,
    }),
    shallow
  );

// Leads selectors
export const useCurrentLead = () => useAppStore((state) => state.currentLead);
export const useLeadDraft = () => useAppStore((state) => state.leadDraft);
export const useLeadSaveStatus = () => useAppStore((state) => ({
  isSaving: state.isSaving,
  lastSaved: state.lastSaved,
}), shallow);
export const useLeadsActions = () =>
  useAppStore(
    (state) => ({
      setCurrentLead: state.setCurrentLead,
      updateLeadDraft: state.updateLeadDraft,
      saveLead: state.saveLead,
      clearLeadDraft: state.clearLeadDraft,
    }),
    shallow
  );

