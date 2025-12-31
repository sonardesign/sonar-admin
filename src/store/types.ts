/**
 * Core types for Zustand store
 */

export interface Command<T = any> {
  id: string;
  type: string;
  timestamp: number;
  execute: () => Promise<void> | void;
  undo: () => Promise<void> | void;
  redo?: () => Promise<void> | void;
  metadata?: T;
}

export interface HistoryState {
  past: Command[];
  present: Command | null;
  future: Command[];
  maxHistorySize: number;
}

export interface UndoRedoState {
  history: HistoryState;
  canUndo: boolean;
  canRedo: boolean;
  executeCommand?: (command: Command) => Promise<void>;
  undo?: () => Promise<void>;
  redo?: () => Promise<void>;
  clearHistory?: () => void;
}

/**
 * Store state interface
 */
export interface StoreState {
  // Undo/Redo state
  undoRedo: UndoRedoState;
  
  // Add other slices here as needed
  // Example: tasks, projects, etc.
}

