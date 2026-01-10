-- Diagnostic queries to debug role update issue
-- Run these in your Supabase SQL Editor

-- 1. Check current user roles
SELECT id, full_name, email, role, is_active
FROM public.profiles
ORDER BY full_name;

-- 2. Check if the is_admin() function works correctly
SELECT 
    p.id,
    p.full_name,
    p.role,
    public.is_admin() as is_current_user_admin
FROM public.profiles p
WHERE p.id = auth.uid();

-- 3. Test if RLS allows profile updates
-- This will show if there's a permission issue
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'profiles';

-- 4. Check if the constraint still exists
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.project_manager_permissions'::regclass
  AND conname LIKE '%manager%';

-- 5. Check for any users with project_manager_permissions
SELECT 
    pmp.id,
    p.full_name,
    p.role,
    proj.name as project_name
FROM public.project_manager_permissions pmp
JOIN public.profiles p ON p.id = pmp.manager_id
JOIN public.projects proj ON proj.id = pmp.project_id;

-- 6. Test a manual update (replace with actual user_id)
-- UNCOMMENT AND REPLACE 'user-id-here' to test:
-- UPDATE public.profiles 
-- SET role = 'admin' 
-- WHERE id = 'user-id-here'
-- RETURNING *;



