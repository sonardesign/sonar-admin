-- Migration: Tasks Kanban Setup
-- This migration adds task_status column and updates RLS policies for the Tasks/Kanban feature

-- =====================================================
-- STEP 1: Add task_status column to time_entries
-- =====================================================

-- Add task_status column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'time_entries' AND column_name = 'task_status'
    ) THEN
        ALTER TABLE time_entries ADD COLUMN task_status TEXT DEFAULT 'backlog';
    END IF;
END $$;

-- Set all existing entries to 'backlog' if null
UPDATE time_entries 
SET task_status = 'backlog' 
WHERE task_status IS NULL;

-- Add check constraint for valid status values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE table_name = 'time_entries' AND constraint_name = 'time_entries_task_status_check'
    ) THEN
        ALTER TABLE time_entries 
        ADD CONSTRAINT time_entries_task_status_check 
        CHECK (task_status IN ('backlog', 'todo', 'in_progress', 'blocked', 'done'));
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create index for faster queries on task_status
CREATE INDEX IF NOT EXISTS idx_time_entries_task_status ON time_entries(task_status);

-- =====================================================
-- STEP 2: Update RLS policies to allow admins full access
-- =====================================================

-- Drop existing update policies that might conflict
DROP POLICY IF EXISTS "Admins can update all time entries" ON time_entries;
DROP POLICY IF EXISTS "Admins can update any time entries" ON time_entries;

-- Create policy for admins to update ANY time entry
CREATE POLICY "Admins can update any time entries" ON time_entries
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Drop existing delete policy for admins if it exists with different name
DROP POLICY IF EXISTS "Admins can delete any time entries" ON time_entries;

-- Ensure admins can delete any time entry
CREATE POLICY "Admins can delete any time entries" ON time_entries
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- STEP 3: Create policy for managers to update time entries
-- =====================================================

-- Drop and recreate the managers update policy to ensure it works
DROP POLICY IF EXISTS "Managers can update project time entries" ON time_entries;

CREATE POLICY "Managers can update project time entries" ON time_entries
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- =====================================================
-- STEP 4: Ensure SELECT policies allow viewing all entries for admins/managers
-- =====================================================

-- Drop and recreate select policy for admins/managers
DROP POLICY IF EXISTS "Admins can view all time entries" ON time_entries;

CREATE POLICY "Admins can view all time entries" ON time_entries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- =====================================================
-- DONE
-- =====================================================

-- Add comment for documentation
COMMENT ON COLUMN time_entries.task_status IS 'Kanban status: backlog, todo, in_progress, blocked, done';

SELECT 'Tasks Kanban setup completed successfully!' as message;

