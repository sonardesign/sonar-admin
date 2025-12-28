-- Add sequential task number to time_entries
-- Format: snr-001, snr-002, etc.

-- Add task_number column
ALTER TABLE time_entries 
ADD COLUMN IF NOT EXISTS task_number TEXT;

-- Create a sequence for task numbers
CREATE SEQUENCE IF NOT EXISTS task_number_seq START 1;

-- Create function to generate task number
CREATE OR REPLACE FUNCTION generate_task_number()
RETURNS TRIGGER AS $$
DECLARE
    next_num INTEGER;
BEGIN
    -- Get next value from sequence
    SELECT nextval('task_number_seq') INTO next_num;
    
    -- Format as snr-XXX (padded to 3 digits, will grow naturally beyond 999)
    NEW.task_number := 'snr-' || LPAD(next_num::TEXT, 3, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate task_number on insert
DROP TRIGGER IF EXISTS trigger_generate_task_number ON time_entries;
CREATE TRIGGER trigger_generate_task_number
    BEFORE INSERT ON time_entries
    FOR EACH ROW
    WHEN (NEW.task_number IS NULL)
    EXECUTE FUNCTION generate_task_number();

-- Backfill existing entries with sequential numbers (ordered by created_at)
DO $$
DECLARE
    entry_record RECORD;
    counter INTEGER := 0;
    max_existing INTEGER;
BEGIN
    -- First, find if any entries already have task numbers to continue from
    SELECT COALESCE(MAX(NULLIF(regexp_replace(task_number, '[^0-9]', '', 'g'), '')::INTEGER), 0)
    INTO max_existing
    FROM time_entries
    WHERE task_number IS NOT NULL;
    
    -- Backfill entries without task_number
    FOR entry_record IN 
        SELECT id FROM time_entries 
        WHERE task_number IS NULL 
        ORDER BY created_at ASC
    LOOP
        counter := counter + 1;
        UPDATE time_entries 
        SET task_number = 'snr-' || LPAD((max_existing + counter)::TEXT, 3, '0')
        WHERE id = entry_record.id;
    END LOOP;
    
    -- Reset sequence to continue after the highest number
    IF (max_existing + counter) > 0 THEN
        PERFORM setval('task_number_seq', max_existing + counter);
    END IF;
END $$;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_time_entries_task_number ON time_entries(task_number);

-- Add unique constraint to prevent duplicates
ALTER TABLE time_entries 
ADD CONSTRAINT time_entries_task_number_unique UNIQUE (task_number);

