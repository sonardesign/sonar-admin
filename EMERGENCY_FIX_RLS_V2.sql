-- =====================================================
-- EMERGENCY FIX V2: Remove ALL policies first, then create new ones
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Drop EVERY possible policy name (old and new)
DROP POLICY IF EXISTS "View project members based on role" ON public.project_members;
DROP POLICY IF EXISTS "Admins can manage all project members" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can manage members" ON public.project_members;
DROP POLICY IF EXISTS "Users can view own project memberships" ON public.project_members;
DROP POLICY IF EXISTS "Users can view project members for assigned projects" ON public.project_members;
DROP POLICY IF EXISTS "Admins can view all project members" ON public.project_members;
DROP POLICY IF EXISTS "Managers can view project members" ON public.project_members;
DROP POLICY IF EXISTS "project_members_select" ON public.project_members;
DROP POLICY IF EXISTS "project_members_insert" ON public.project_members;
DROP POLICY IF EXISTS "project_members_update" ON public.project_members;
DROP POLICY IF EXISTS "project_members_delete" ON public.project_members;

-- Step 2: Create SIMPLE policies without recursion

-- SELECT policy
CREATE POLICY "project_members_select"
  ON public.project_members
  FOR SELECT
  USING (
    public.is_admin() OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'manager' OR
    user_id = auth.uid()
  );

-- INSERT policy
CREATE POLICY "project_members_insert"
  ON public.project_members
  FOR INSERT
  WITH CHECK (public.is_admin());

-- UPDATE policy
CREATE POLICY "project_members_update"
  ON public.project_members
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- DELETE policy
CREATE POLICY "project_members_delete"
  ON public.project_members
  FOR DELETE
  USING (public.is_admin());

-- Step 3: Verify
SELECT policyname FROM pg_policies WHERE tablename = 'project_members';

