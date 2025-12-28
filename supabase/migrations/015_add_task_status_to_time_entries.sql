-- Migration: Add task_status column to time_entries table
-- This column enables Kanban-style task management for time entries

-- Create enum type for task status
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
        CREATE TYPE task_status AS ENUM ('backlog', 'todo', 'in_progress', 'blocked', 'done');
    END IF;
END $$;

-- Add task_status column to time_entries table
ALTER TABLE time_entries 
ADD COLUMN IF NOT EXISTS task_status task_status DEFAULT 'backlog';

-- Set all existing entries to 'backlog' if null
UPDATE time_entries 
SET task_status = 'backlog' 
WHERE task_status IS NULL;

-- Create index for faster queries on task_status
CREATE INDEX IF NOT EXISTS idx_time_entries_task_status ON time_entries(task_status);

-- Add comment for documentation
COMMENT ON COLUMN time_entries.task_status IS 'Kanban status for task management: backlog, todo, in_progress, blocked, done';

