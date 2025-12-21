-- =====================================================
-- FIX PROJECT MEMBERS RLS FOR GANTT ACCESS
-- Allow managers and admins to view all project members
-- =====================================================

-- First, check existing policies
-- SELECT * FROM pg_policies WHERE tablename = 'project_members';

-- Drop existing restrictive SELECT policies if they exist
DROP POLICY IF EXISTS "Users can view own project memberships" ON public.project_members;
DROP POLICY IF EXISTS "Users can view project members for assigned projects" ON public.project_members;
DROP POLICY IF EXISTS "Admins can view all project members" ON public.project_members;
DROP POLICY IF EXISTS "Managers can view project members" ON public.project_members;

-- Create new SELECT policy that allows:
-- 1. Admins to see all project members
-- 2. Managers to see all project members (needed for Gantt chart)
-- 3. Members to see only their own memberships
CREATE POLICY "View project members based on role"
  ON public.project_members
  FOR SELECT
  USING (
    -- Admins can see all
    public.is_admin() OR
    -- Managers can see all (needed for Gantt and Forecast)
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'manager' OR
    -- Users can see their own memberships
    user_id = auth.uid() OR
    -- Users can see members of projects they belong to
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
    )
  );

-- Ensure other policies exist for INSERT, UPDATE, DELETE
-- Admins can manage all project members
CREATE POLICY IF NOT EXISTS "Admins can manage all project members"
  ON public.project_members
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Project owners can manage their project members
CREATE POLICY IF NOT EXISTS "Project owners can manage members"
  ON public.project_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'owner'
    )
  );

-- Add comment
COMMENT ON TABLE public.project_members IS 
'Stores project membership and roles. Managers need full read access for Gantt and Forecast features.';

