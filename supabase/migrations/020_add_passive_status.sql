-- Add 'passive' status to projects table

-- Drop the existing constraint
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;

-- Add new constraint with 'passive' status
ALTER TABLE projects ADD CONSTRAINT projects_status_check 
  CHECK (status IN ('active', 'passive', 'on_hold', 'completed', 'cancelled'));

-- Update any NULL statuses to 'active'
UPDATE projects SET status = 'active' WHERE status IS NULL;






