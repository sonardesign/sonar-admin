-- Fix RLS policies for profiles table
-- Issue: UPDATE works but SELECT afterwards is blocked

-- First, let's see what policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'profiles'
ORDER BY cmd, policyname;

-- The issue is likely that the UPDATE policy works, but there's no SELECT policy
-- that allows admins to read the updated row immediately after

-- Let's ensure the admin SELECT policy exists and is correct
-- Drop and recreate to ensure it's correct
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT 
    USING (public.is_admin());

-- Also ensure the UPDATE policy is correct
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Admins can update all profiles" ON public.profiles
    FOR UPDATE 
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Verify the is_admin function works correctly
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the policies (run this as an admin user)
-- This should return rows if you're an admin
SELECT 
    id, 
    full_name, 
    role,
    public.is_admin() as am_i_admin
FROM public.profiles
LIMIT 5;





