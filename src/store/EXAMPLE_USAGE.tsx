/**
 * Example Usage of Zustand Store with Undo/Redo
 * 
 * This file demonstrates how to use the modular Zustand store
 * in your React components.
 */

import React from 'react';
import { useTasks, useTasksActions, useUndoRedo } from './index';
import { useUndoRedoShortcuts } from '../hooks/useUndoRedoShortcuts';

/**
 * Example Component: Task List with Undo/Redo
 */
export function TaskListExample() {
  // Enable global keyboard shortcuts (Ctrl+Z / Ctrl+Y)
  useUndoRedoShortcuts();

  // Get state from store
  const tasks = useTasks();
  
  // Get actions from store
  const { addTask, updateTask, deleteTask, loadTasks } = useTasksActions();
  
  // Get undo/redo controls
  const { undo, redo, canUndo, canRedo } = useUndoRedo();

  // Load tasks on mount
  React.useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleAddTask = async () => {
    try {
      await addTask({
        description: 'New Task',
        project_id: 'project-123',
        user_id: 'user-123',
        start_time: new Date().toISOString(),
        end_time: new Date().toISOString(),
        duration_minutes: 60,
        entry_type: 'planned',
        task_status: 'todo',
        is_billable: true,
      });
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  const handleUpdateTask = async (id: string) => {
    try {
      await updateTask(id, {
        description: 'Updated Task',
        task_status: 'in_progress',
      });
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTask(id);
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  return (
    <div>
      {/* Undo/Redo Controls */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          Undo (Ctrl+Z)
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
        >
          Redo (Ctrl+Y)
        </button>
      </div>

      {/* Task Actions */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleAddTask}
          className="px-4 py-2 bg-purple-500 text-white rounded"
        >
          Add Task
        </button>
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="p-4 border rounded-lg flex items-center justify-between"
          >
            <div>
              <h3 className="font-medium">{task.description}</h3>
              <p className="text-sm text-gray-500">
                Status: {task.task_status || 'backlog'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleUpdateTask(task.id)}
                className="px-3 py-1 bg-yellow-500 text-white rounded text-sm"
              >
                Update
              </button>
              <button
                onClick={() => handleDeleteTask(task.id)}
                className="px-3 py-1 bg-red-500 text-white rounded text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Example: Using store in App.tsx
 * 
 * ```tsx
 * import { useUndoRedoShortcuts } from './hooks/useUndoRedoShortcuts';
 * 
 * function App() {
 *   // Enable global undo/redo shortcuts
 *   useUndoRedoShortcuts();
 *   
 *   return (
 *     <Router>
 *       {/* Your app */}
 *     </Router>
 *   );
 * }
 * ```
 */

