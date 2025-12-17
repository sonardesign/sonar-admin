-- =====================================================
-- FIX TIME ENTRIES UPDATE RLS POLICY
-- Allow admins and managers to update time entries for other users
-- =====================================================

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can update own time entries" ON public.time_entries;

-- Recreate with support for admins/managers updating entries for others
-- Users can update their own time entries
CREATE POLICY "Users can update own time entries" ON public.time_entries
    FOR UPDATE USING (
        user_id = auth.uid()
    );

-- Drop old manager policy if exists (from migration 002 or 005)
DROP POLICY IF EXISTS "Managers can update project time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Managers can update assigned project time entries" ON public.time_entries;

-- Admins can update any time entry
CREATE POLICY "Admins can update any time entry" ON public.time_entries
    FOR UPDATE USING (
        public.is_admin()
    );

-- Managers can update time entries for projects they manage
CREATE POLICY "Managers can update project time entries" ON public.time_entries
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = time_entries.project_id 
            AND pm.user_id = auth.uid() 
            AND pm.role IN ('owner', 'manager')
        )
    );

-- Add comments for documentation
COMMENT ON POLICY "Users can update own time entries" ON public.time_entries IS 
'Allows users to update their own time entries';

COMMENT ON POLICY "Admins can update any time entry" ON public.time_entries IS 
'Allows administrators to update any time entry (needed for workload planning and corrections)';

COMMENT ON POLICY "Managers can update project time entries" ON public.time_entries IS 
'Allows project managers to update time entries for their assigned projects';

