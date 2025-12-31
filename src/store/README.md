# Zustand State Management - Modular Architecture

This directory contains a modular, plug-and-play Zustand state management system with built-in undo/redo functionality.

## 📁 Structure

```
src/store/
├── types.ts              # Core TypeScript types
├── middleware/
│   └── undoRedo.ts      # Undo/Redo middleware (reusable)
├── slices/
│   └── tasksSlice.ts    # Example slice (tasks domain)
├── index.ts             # Main store setup
└── README.md           # This file
```

## 🚀 Quick Start

### 1. Basic Usage

```tsx
import { useAppStore, useTasks, useTasksActions } from '../store';

function MyComponent() {
  // Get state
  const tasks = useTasks();
  
  // Get actions
  const { addTask, updateTask, deleteTask } = useTasksActions();
  
  // Use actions (automatically tracked for undo/redo)
  const handleAdd = async () => {
    await addTask({
      description: 'New task',
      project_id: '123',
      // ... other fields
    });
  };
  
  return <div>{/* Your UI */}</div>;
}
```

### 2. Undo/Redo

```tsx
import { useUndoRedo } from '../store';
import { useUndoRedoShortcuts } from '../hooks/useUndoRedoShortcuts';

function App() {
  // Enable keyboard shortcuts (Ctrl+Z / Ctrl+Y)
  useUndoRedoShortcuts();
  
  const { undo, redo, canUndo, canRedo } = useUndoRedo();
  
  return (
    <div>
      <button onClick={undo} disabled={!canUndo}>
        Undo (Ctrl+Z)
      </button>
      <button onClick={redo} disabled={!canRedo}>
        Redo (Ctrl+Y)
      </button>
    </div>
  );
}
```

## 🧩 Creating a New Slice

### Step 1: Create Slice File

Create `src/store/slices/mySlice.ts`:

```typescript
import { StateCreator } from 'zustand';
import { StoreState } from '../types';
import { createCommand } from '../middleware/undoRedo';

export interface MySlice {
  // State
  items: Item[];
  isLoading: boolean;
  
  // Actions
  addItem: (item: Item) => Promise<void>;
  updateItem: (id: string, updates: Partial<Item>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}

export const createMySlice: StateCreator<
  StoreState & MySlice,
  [],
  [],
  MySlice
> = (set, get) => {
  const executeCommand = (get() as any).undoRedo?.executeCommand;
  
  return {
    // Initial state
    items: [],
    isLoading: false,
    
    // Actions with undo/redo support
    addItem: async (item) => {
      if (!executeCommand) {
        // Fallback without undo/redo
        // ... your implementation
        return;
      }
      
      const command = createCommand(
        'ADD_ITEM',
        async () => {
          // Execute action
          // ... your implementation
        },
        async () => {
          // Undo action
          // ... your implementation
        }
      );
      
      await executeCommand(command);
    },
    
    // ... other actions
  };
};
```

### Step 2: Add to Store

Update `src/store/index.ts`:

```typescript
import { createMySlice, MySlice } from './slices/mySlice';

export type AppStore = StoreState & TasksSlice & MySlice; // Add MySlice

export const useAppStore = create<AppStore>()(
  undoRedoMiddleware((set, get, api) => ({
    // ... existing slices
    ...createMySlice(set, get, api), // Add your slice
  }))
);
```

### Step 3: Create Selectors (Optional)

Add to `src/store/index.ts`:

```typescript
export const useMyItems = () => useAppStore((state) => state.items);
export const useMyActions = () => useAppStore((state) => ({
  addItem: state.addItem,
  updateItem: state.updateItem,
  deleteItem: state.deleteItem,
}));
```

## 🔧 Advanced Usage

### Custom Commands

```typescript
import { createCommand } from '../store/middleware/undoRedo';
import { useAppStore } from '../store';

const { undoRedo } = useAppStore.getState();

const customCommand = createCommand(
  'CUSTOM_ACTION',
  async () => {
    // Do something
    console.log('Executing custom action');
  },
  async () => {
    // Undo it
    console.log('Undoing custom action');
  }
);

await undoRedo.executeCommand(customCommand);
```

### Without Undo/Redo

If you don't need undo/redo for certain actions, you can skip the command pattern:

```typescript
updateItem: async (id, updates) => {
  // Direct update without undo/redo tracking
  await supabase.from('items').update(updates).eq('id', id);
  set((state) => ({
    items: state.items.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    ),
  }));
},
```

## 🎯 Best Practices

1. **Keep slices focused**: Each slice should handle one domain (tasks, projects, etc.)
2. **Use selectors**: Create selector hooks to prevent unnecessary re-renders
3. **Command pattern**: Use `createCommand` for actions that should be undoable
4. **Error handling**: Always handle errors in your async actions
5. **Type safety**: Use TypeScript types for all slices

## 🔌 Integration with Existing Code

This store can coexist with your existing hooks:

```tsx
// Old way (still works)
const { timeEntries } = useSupabaseAppState();

// New way (with undo/redo)
const tasks = useTasks();
const { addTask } = useTasksActions();
```

You can migrate incrementally - no need to refactor everything at once!

## 📚 API Reference

### `useAppStore`
Main store hook. Use selectors instead of accessing directly.

### `useUndoRedo()`
Returns: `{ undo, redo, canUndo, canRedo, clearHistory }`

### `createCommand(type, execute, undo, redo?, metadata?)`
Creates a command for undo/redo tracking.

### `undoRedoMiddleware`
Middleware that adds undo/redo functionality to any Zustand store.

## 🐛 Troubleshooting

**Undo/Redo not working?**
- Make sure you're using `executeCommand` in your actions
- Check that the middleware is applied to your store
- Verify commands have proper `execute` and `undo` functions

**Type errors?**
- Make sure all slices are added to `AppStore` type
- Check that slice types extend `StoreState`

## 📝 Example: Complete Slice

See `src/store/slices/tasksSlice.ts` for a complete example with:
- State management
- CRUD operations
- Undo/redo support
- Error handling
- TypeScript types

