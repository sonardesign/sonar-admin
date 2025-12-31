/**
 * Global Undo/Redo Keyboard Shortcuts Hook
 * 
 * Provides Ctrl+Z (Cmd+Z on Mac) for undo and Ctrl+Y (Cmd+Shift+Z on Mac) for redo
 */

import { useEffect } from 'react';
import { useUndoRedo } from '../store';
import { useKeyboardShortcut, createShortcut } from './useKeyboardShortcut';

/**
 * Hook to enable global undo/redo keyboard shortcuts
 * 
 * Usage:
 * ```tsx
 * function App() {
 *   useUndoRedoShortcuts();
 *   // ... rest of your app
 * }
 * ```
 */
export function useUndoRedoShortcuts() {
  const { undo, redo, canUndo, canRedo } = useUndoRedo();

  useKeyboardShortcut(
    [
      // Undo: Ctrl+Z (Windows/Linux) or Cmd+Z (Mac)
      createShortcut(
        'z',
        { ctrl: true, cmd: true },
        () => {
          if (canUndo) {
            undo();
          }
        },
        {
          preventDefault: true,
          allowInInputs: false, // Don't interfere with text input undo
        }
      ),
      // Redo: Ctrl+Y (Windows/Linux) or Cmd+Shift+Z (Mac)
      createShortcut(
        'y',
        { ctrl: true },
        () => {
          if (canRedo) {
            redo();
          }
        },
        {
          preventDefault: true,
          allowInInputs: false,
        }
      ),
      // Redo alternative: Cmd+Shift+Z (Mac)
      createShortcut(
        'z',
        { cmd: true, shift: true },
        () => {
          if (canRedo) {
            redo();
          }
        },
        {
          preventDefault: true,
          allowInInputs: false,
        }
      ),
    ],
    [undo, redo, canUndo, canRedo]
  );
}

