-- Verify RLS Fix
-- Run this script to check if the policies are working correctly

-- Check if RLS is enabled on all tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('profiles', 'clients', 'projects', 'project_members', 'tasks', 'time_entries')
ORDER BY tablename;

-- Check existing policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Test basic queries (these should work after the fix)
SELECT 'Testing profiles access...' as test;
SELECT COUNT(*) as profile_count FROM public.profiles;

SELECT 'Testing clients access...' as test;
SELECT COUNT(*) as client_count FROM public.clients;

SELECT 'Testing projects access...' as test;
SELECT COUNT(*) as project_count FROM public.projects;

SELECT 'RLS fix verification complete.' as status;
