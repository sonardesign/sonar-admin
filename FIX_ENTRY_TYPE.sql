-- =====================================================
-- VERIFY AND FIX entry_type COLUMN
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Check if column exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'time_entries' 
  AND column_name = 'entry_type';

-- If the query above returns no rows, the column doesn't exist
-- If it returns a row, the column exists

-- Step 2: Drop the column if it exists (to start fresh)
ALTER TABLE public.time_entries DROP COLUMN IF EXISTS entry_type;

-- Step 3: Add the column properly
ALTER TABLE public.time_entries 
ADD COLUMN entry_type TEXT NOT NULL DEFAULT 'reported';

-- Step 4: Add constraint
ALTER TABLE public.time_entries 
ADD CONSTRAINT time_entries_entry_type_check 
CHECK (entry_type IN ('planned', 'reported'));

-- Step 5: Create index
DROP INDEX IF EXISTS idx_time_entries_entry_type;
CREATE INDEX idx_time_entries_entry_type ON public.time_entries(entry_type);

-- Step 6: Add comment
COMMENT ON COLUMN public.time_entries.entry_type IS 
'Type of time entry: "planned" for future/scheduled work, "reported" for actual logged time';

-- Step 7: Update existing future entries to be marked as planned
UPDATE public.time_entries 
SET entry_type = 'planned' 
WHERE start_time > NOW();

-- Step 8: Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'time_entries' 
  AND column_name = 'entry_type';

-- Step 9: Check the data
SELECT entry_type, COUNT(*) as count
FROM public.time_entries
GROUP BY entry_type;

