-- =====================================================
-- FIX TIME ENTRIES INSERT RLS POLICIES
-- Allow admins and managers to create entries for other users
-- =====================================================

-- Drop all existing INSERT policies to avoid conflicts
DROP POLICY IF EXISTS "Users can create own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Admins can create time entries for anyone" ON public.time_entries;
DROP POLICY IF EXISTS "Managers can create time entries for project members" ON public.time_entries;

-- Recreate clean policies

-- 1. Users can create their own time entries
CREATE POLICY "Users can create own time entries" ON public.time_entries
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND public.has_project_access(project_id)
    );

-- 2. Admins can create time entries for anyone
CREATE POLICY "Admins can create time entries for anyone" ON public.time_entries
    FOR INSERT WITH CHECK (
        public.is_admin()
    );

-- 3. Managers can create time entries for users on their projects
CREATE POLICY "Managers can create time entries for project members" ON public.time_entries
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = time_entries.project_id 
            AND pm.user_id = auth.uid() 
            AND pm.role IN ('owner', 'manager')
        )
    );

-- Add comments
COMMENT ON POLICY "Admins can create time entries for anyone" ON public.time_entries IS 
'Allows administrators to create planned time entries for any user in the workload planning feature';

COMMENT ON POLICY "Managers can create time entries for project members" ON public.time_entries IS 
'Allows project managers to create planned time entries for team members on their projects';



