/**
 * Tasks Slice - Example of how to create a modular slice
 * 
 * This is a plug-and-play slice that can be added to the store.
 * You can create similar slices for projects, timeEntries, etc.
 */

import { StateCreator } from 'zustand';
import { StoreState } from '../types';
import { createCommand } from '../middleware/undoRedo';
import { supabase } from '../../lib/supabase';
import { TimeEntry } from '../../types';

export interface TasksSlice {
  // State
  tasks: TimeEntry[];
  selectedTaskId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setTasks: (tasks: TimeEntry[]) => void;
  addTask: (task: Omit<TimeEntry, 'id'>) => Promise<void>;
  updateTask: (id: string, updates: Partial<TimeEntry>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  setSelectedTask: (id: string | null) => void;
  loadTasks: () => Promise<void>;
}

/**
 * Tasks slice creator
 * This can be combined with other slices using Zustand's combine pattern
 */
export const createTasksSlice: StateCreator<
  StoreState & TasksSlice,
  [],
  [],
  TasksSlice
> = (set, get) => {
  // Helper to get executeCommand - will be available after middleware initialization
  const getExecuteCommand = () => {
    const state = get() as any;
    return state.undoRedo?.executeCommand;
  };

  return {
    // Initial state
    tasks: [],
    selectedTaskId: null,
    isLoading: false,
    error: null,

    // Set tasks (synchronous)
    setTasks: (tasks) => {
      set({ tasks });
    },

    // Add task with undo/redo support
    addTask: async (taskData) => {
      const executeCommand = getExecuteCommand();
      
      if (!executeCommand) {
        // Fallback if undo/redo not available
        const { data, error } = await supabase
          .from('time_entries')
          .insert(taskData)
          .select()
          .single();

        if (error) throw error;
        set((state) => ({ tasks: [...state.tasks, data] }));
        return;
      }

      // Create command for undo/redo
      let insertedTask: TimeEntry | null = null;

      const command = createCommand(
        'ADD_TASK',
        async () => {
          const { data, error } = await supabase
            .from('time_entries')
            .insert(taskData)
            .select()
            .single();

          if (error) throw error;
          insertedTask = data;
          set((state) => ({ tasks: [...state.tasks, data] }));
        },
        async () => {
          if (insertedTask) {
            await supabase.from('time_entries').delete().eq('id', insertedTask.id);
            set((state) => ({
              tasks: state.tasks.filter((t) => t.id !== insertedTask!.id),
            }));
          }
        }
      );

      await executeCommand(command);
    },

    // Update task with undo/redo support
    updateTask: async (id, updates) => {
      const executeCommand = getExecuteCommand();
      
      if (!executeCommand) {
        // Fallback if undo/redo not available
        const { error } = await supabase
          .from('time_entries')
          .update(updates)
          .eq('id', id);

        if (error) throw error;
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        }));
        return;
      }

      // Get current task state
      const currentTask = get().tasks.find((t) => t.id === id);
      if (!currentTask) return;

      const previousState = { ...currentTask };

      const command = createCommand(
        'UPDATE_TASK',
        async () => {
          const { error } = await supabase
            .from('time_entries')
            .update(updates)
            .eq('id', id);

          if (error) throw error;
          set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
          }));
        },
        async () => {
          const { error } = await supabase
            .from('time_entries')
            .update(previousState)
            .eq('id', id);

          if (error) throw error;
          set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? previousState : t)),
          }));
        }
      );

      await executeCommand(command);
    },

    // Delete task with undo/redo support
    deleteTask: async (id) => {
      const executeCommand = getExecuteCommand();
      
      if (!executeCommand) {
        // Fallback if undo/redo not available
        const { error } = await supabase.from('time_entries').delete().eq('id', id);
        if (error) throw error;
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
        return;
      }

      // Get current task state
      const currentTask = get().tasks.find((t) => t.id === id);
      if (!currentTask) return;

      const command = createCommand(
        'DELETE_TASK',
        async () => {
          const { error } = await supabase.from('time_entries').delete().eq('id', id);
          if (error) throw error;
          set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
        },
        async () => {
          const { data, error } = await supabase
            .from('time_entries')
            .insert(currentTask)
            .select()
            .single();

          if (error) throw error;
          set((state) => ({ tasks: [...state.tasks, data] }));
        }
      );

      await executeCommand(command);
    },

    // Set selected task (no undo/redo needed for UI state)
    setSelectedTask: (id) => {
      set({ selectedTaskId: id });
    },

    // Load tasks (no undo/redo needed for data fetching)
    loadTasks: async () => {
      set({ isLoading: true, error: null });
      try {
        const { data, error } = await supabase
          .from('time_entries')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        set({ tasks: data || [], isLoading: false });
      } catch (error: any) {
        set({ error: error.message, isLoading: false });
      }
    },
  };
};

