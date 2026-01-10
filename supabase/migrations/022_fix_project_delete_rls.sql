-- Fix Project Delete RLS Policy
-- Description: Allow admins to delete any project (not just ones they created)
-- Issue: Current policy only allows deletion if you're the creator OR admin, but the admin check might not be working correctly

-- Drop the existing delete policy
DROP POLICY IF EXISTS "Project owners can delete projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can delete projects" ON public.projects;

-- Create separate policies for clarity

-- Policy 1: Admins can delete any project
CREATE POLICY "Admins can delete any project" ON public.projects
    FOR DELETE 
    USING (public.is_admin());

-- Policy 2: Users can delete projects they created
CREATE POLICY "Users can delete own projects" ON public.projects
    FOR DELETE 
    USING (created_by = auth.uid());

-- Add comments for documentation
COMMENT ON POLICY "Admins can delete any project" ON public.projects IS 
'Allows admin users to delete any project regardless of creator';

COMMENT ON POLICY "Users can delete own projects" ON public.projects IS 
'Allows users to delete projects they created';

-- Verify the is_admin function is correct
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



