-- Check what roles exist in the database
SELECT DISTINCT role, COUNT(*) as user_count
FROM public.profiles
GROUP BY role
ORDER BY role;

-- Show all users and their roles
SELECT id, full_name, email, role, is_active
FROM public.profiles
ORDER BY role, full_name;

-- Check the role constraint on profiles table
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass
  AND conname LIKE '%role%';



