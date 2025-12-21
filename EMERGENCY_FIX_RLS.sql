-- =====================================================
-- EMERGENCY FIX: Remove Circular RLS Dependencies
-- Run this IMMEDIATELY in Supabase SQL Editor
-- =====================================================

-- Step 1: Drop ALL policies on project_members to start fresh
DROP POLICY IF EXISTS "View project members based on role" ON public.project_members;
DROP POLICY IF EXISTS "Admins can manage all project members" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can manage members" ON public.project_members;
DROP POLICY IF EXISTS "Users can view own project memberships" ON public.project_members;
DROP POLICY IF EXISTS "Users can view project members for assigned projects" ON public.project_members;
DROP POLICY IF EXISTS "Admins can view all project members" ON public.project_members;
DROP POLICY IF EXISTS "Managers can view project members" ON public.project_members;

-- Step 2: Create SIMPLE policies without recursion

-- SELECT policy - NO subqueries to avoid recursion
CREATE POLICY "project_members_select"
  ON public.project_members
  FOR SELECT
  USING (
    -- Admins can see all
    public.is_admin() OR
    -- Managers can see all
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'manager' OR
    -- Users can see their own memberships
    user_id = auth.uid()
  );

-- INSERT policy - Admins only
CREATE POLICY "project_members_insert"
  ON public.project_members
  FOR INSERT
  WITH CHECK (public.is_admin());

-- UPDATE policy - Admins only
CREATE POLICY "project_members_update"
  ON public.project_members
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- DELETE policy - Admins only
CREATE POLICY "project_members_delete"
  ON public.project_members
  FOR DELETE
  USING (public.is_admin());

-- Step 3: Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'project_members'
ORDER BY policyname;

