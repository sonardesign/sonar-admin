/**
 * Undo/Redo Middleware for Zustand
 * 
 * This middleware provides global undo/redo functionality by tracking
 * commands (mutations) and allowing them to be undone/redone.
 * 
 * Usage:
 * ```ts
 * const useStore = create(
 *   undoRedoMiddleware(
 *     (set, get) => ({
 *       // your store state
 *     })
 *   )
 * )
 * ```
 */

import { StateCreator, StoreMutatorIdentifier } from 'zustand';
import { Command, HistoryState, UndoRedoState } from '../types';

const MAX_HISTORY_SIZE = 50;

// Extended UndoRedoState with methods
export interface UndoRedoStateWithMethods extends UndoRedoState {
  executeCommand: (command: Command) => Promise<void>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  clearHistory: () => void;
}

interface UndoRedoMiddleware {
  <
    T extends { undoRedo: UndoRedoStateWithMethods },
    Mps extends [StoreMutatorIdentifier, unknown][] = [],
    Mcs extends [StoreMutatorIdentifier, unknown][] = []
  >(
    initializer: StateCreator<T, Mps, Mcs>
  ): StateCreator<T, Mps, Mcs>;
}

type UndoRedoMiddlewareImpl = <T extends { undoRedo: UndoRedoStateWithMethods }>(
  storeInitializer: StateCreator<T, [], []>
) => StateCreator<T, [], []>;

const undoRedoMiddlewareImpl: UndoRedoMiddlewareImpl = (storeInitializer) => (set, get, api) => {
  // Helper to update undo/redo state
  const updateUndoRedoState = (updates: Partial<HistoryState>) => {
    set((state) => {
      const newHistory = {
        ...state.undoRedo.history,
        ...updates,
      };
      return {
        ...state,
        undoRedo: {
          ...state.undoRedo,
          history: newHistory,
          canUndo: newHistory.past.length > 0 || newHistory.present !== null,
          canRedo: newHistory.future.length > 0,
        },
      };
    });
  };

  // Execute a command and add it to history
  const executeCommand = async (command: Command) => {
    try {
      // Execute the command
      await command.execute();

      // Get current state
      const currentState = get();

      // Clear future if we're executing a new command (not redo)
      const newPast = [...currentState.undoRedo.history.past];
      
      // Add current present to past if it exists
      if (currentState.undoRedo.history.present) {
        newPast.push(currentState.undoRedo.history.present);
      }

      // Limit history size
      if (newPast.length > MAX_HISTORY_SIZE) {
        newPast.shift();
      }

      // Update history
      updateUndoRedoState({
        past: newPast,
        present: command,
        future: [], // Clear future when executing new command
      });
    } catch (error) {
      console.error('Error executing command:', error);
      throw error;
    }
  };

  // Undo the last command
  const undo = async () => {
    const currentState = get();
    const { past, present } = currentState.undoRedo.history;

    if (past.length === 0 && !present) {
      return; // Nothing to undo
    }

    try {
      const commandToUndo = present || past[past.length - 1];
      
      if (!commandToUndo) {
        return;
      }

      // Undo the command
      await commandToUndo.undo();

      // Update history
      const newPast = present ? past : past.slice(0, -1);
      const newFuture = present 
        ? [present, ...currentState.undoRedo.history.future]
        : currentState.undoRedo.history.future;
      const newPresent = present ? null : (past.length > 1 ? past[past.length - 2] : null);

      updateUndoRedoState({
        past: newPast,
        present: newPresent,
        future: newFuture,
      });
    } catch (error) {
      console.error('Error undoing command:', error);
    }
  };

  // Redo the last undone command
  const redo = async () => {
    const currentState = get();
    const { future } = currentState.undoRedo.history;

    if (future.length === 0) {
      return; // Nothing to redo
    }

    try {
      const commandToRedo = future[0];

      // Execute the redo (or use redo method if available)
      if (commandToRedo.redo) {
        await commandToRedo.redo();
      } else {
        await commandToRedo.execute();
      }

      // Update history
      const newPast = [...currentState.undoRedo.history.past];
      if (currentState.undoRedo.history.present) {
        newPast.push(currentState.undoRedo.history.present);
      }

      updateUndoRedoState({
        past: newPast,
        present: commandToRedo,
        future: future.slice(1),
      });
    } catch (error) {
      console.error('Error redoing command:', error);
    }
  };

  // Clear history
  const clearHistory = () => {
    updateUndoRedoState({
      past: [],
      present: null,
      future: [],
    });
  };

  // Initialize undo/redo state with methods
  const undoRedoState: UndoRedoStateWithMethods = {
    history: {
      past: [],
      present: null,
      future: [],
      maxHistorySize: MAX_HISTORY_SIZE,
    },
    canUndo: false,
    canRedo: false,
    executeCommand,
    undo,
    redo,
    clearHistory,
  };

  // Create the base store
  const baseStore = storeInitializer(
    (partial, replace) => {
      set(partial, replace);
    },
    get,
    api
  );

  // Return store with undo/redo state and methods
  return {
    ...baseStore,
    undoRedo: undoRedoState,
  } as T;
};

export const undoRedoMiddleware = undoRedoMiddlewareImpl as unknown as UndoRedoMiddleware;

/**
 * Helper function to create a command
 */
export function createCommand<T = any>(
  type: string,
  execute: () => Promise<void> | void,
  undo: () => Promise<void> | void,
  redo?: () => Promise<void> | void,
  metadata?: T
): Command<T> {
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    timestamp: Date.now(),
    execute,
    undo,
    redo,
    metadata,
  };
}

