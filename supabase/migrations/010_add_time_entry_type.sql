-- =====================================================
-- ADD TIME ENTRY TYPE (PLANNED vs REPORTED)
-- Allow distinguishing between planned and actual time entries
-- =====================================================

-- Add entry_type column to time_entries table
ALTER TABLE public.time_entries 
ADD COLUMN entry_type TEXT DEFAULT 'reported' CHECK (entry_type IN ('planned', 'reported'));

-- Add index for better query performance
CREATE INDEX idx_time_entries_entry_type ON public.time_entries(entry_type);

-- Add comment
COMMENT ON COLUMN public.time_entries.entry_type IS 
'Type of time entry: "planned" for future/scheduled work, "reported" for actual logged time';

-- Update existing future entries to be marked as "planned"
-- (entries that start in the future)
UPDATE public.time_entries 
SET entry_type = 'planned' 
WHERE start_time > NOW() AND entry_type = 'reported';

-- Note: This migration is backward compatible
-- Existing entries default to 'reported' (actual logged time)
-- New workload planning entries will be created as 'planned'

