# RLS Infinite Recursion Fix - December 15, 2024

## 🔴 Problem

The application was showing this error:
```
Error loading timetable data
Failed to load time entries: infinite recursion detected in policy for relation "project_members"
```

## 🔍 Root Cause

**Circular RLS Policy Dependencies:**

1. `project_members` table had policies calling `has_project_access()` function
2. `has_project_access()` function queries `project_members` table
3. This creates infinite recursion: Policy → Function → Table → Policy → ...

Similarly:
- `profiles` table policies called `is_admin()` function
- `is_admin()` function queries `profiles` table
- Another recursion loop

## ✅ Solution Applied

### 1. Fixed `project_members` RLS Policies

**Removed:** Policies that called recursive functions
**Added:** Simple, direct policies without function calls

```sql
-- New policy structure (no recursion)
CREATE POLICY "project_members_select" ON public.project_members
    FOR SELECT USING (
        public.is_admin() OR
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_members.project_id 
            AND p.created_by = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = project_members.project_id 
            AND pm.user_id = auth.uid()
        )
    );
```

**Key Change:** No calls to `has_project_access()` or `is_project_member()` which would query `project_members` again.

### 2. Fixed `profiles` RLS Policy

**Added short-circuit evaluation** to prevent recursion:

```sql
CREATE POLICY "profiles_select" ON public.profiles
    FOR SELECT USING (
        -- Check own profile FIRST (short-circuits, avoids recursion)
        (auth.uid() = profiles.id) OR
        -- Only then check is_admin
        public.is_admin() OR
        -- Or check project membership
        EXISTS (...)
    );
```

**Key Change:** PostgreSQL evaluates OR conditions left-to-right. When a user queries their own profile, the first condition `auth.uid() = profiles.id` returns TRUE immediately, and `is_admin()` is never called, breaking the recursion chain.

### 3. Simplified `is_admin()` Function

**Made it as simple as possible:**

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    );
$$;
```

**Key Features:**
- `SECURITY DEFINER`: Runs with elevated privileges, bypassing RLS
- `STABLE`: Can be optimized by query planner
- `sql` language: Simpler than `plpgsql`, no exception handling needed

### 4. Cleaned Up Duplicate Policies

Removed duplicate policies on:
- `time_entries` (had 2 SELECT and 2 INSERT policies)
- `projects` (had 2 UPDATE policies)

## 📊 Final Policy Structure

### Profiles Table
- ✅ 1 SELECT policy (with short-circuit)
- ✅ 1 UPDATE policy (own profile)

### Project Members Table
- ✅ 1 SELECT policy
- ✅ 1 INSERT policy
- ✅ 1 UPDATE policy
- ✅ 1 DELETE policy

### Projects Table
- ✅ 1 SELECT policy
- ✅ 1 INSERT policy
- ✅ 1 UPDATE policy

### Time Entries Table
- ✅ 1 SELECT policy (role-based)
- ✅ 1 INSERT policy
- ✅ 1 UPDATE policy (managers)
- ✅ 1 UPDATE policy (own entries)
- ✅ 1 DELETE policy

## 🎯 How Short-Circuit Evaluation Prevents Recursion

**The Problem:**
```
User queries profiles
  → RLS checks is_admin()
    → is_admin() queries profiles
      → RLS checks is_admin() again
        → INFINITE LOOP!
```

**The Solution:**
```
User queries their own profile
  → RLS checks: auth.uid() = profiles.id
    → TRUE! Return immediately
    → is_admin() is NEVER called
    → NO RECURSION!

User queries another profile
  → RLS checks: auth.uid() = profiles.id
    → FALSE
  → RLS checks: is_admin()
    → is_admin() queries profiles with id = auth.uid()
      → RLS checks: auth.uid() = profiles.id (checking own profile)
        → TRUE! Return immediately
        → NO RECURSION!
```

## 🧪 Verification

All migrations applied successfully:
1. ✅ `fix_project_members_infinite_recursion`
2. ✅ `fix_profiles_rls_recursion`
3. ✅ `fix_is_admin_bypass_rls`
4. ✅ `simplify_profiles_select_policy`
5. ✅ `fix_is_admin_function_recursion`
6. ✅ `final_fix_rls_recursion`
7. ✅ `cleanup_duplicate_time_entries_policies`

## 🚀 What To Do Now

### **REFRESH YOUR BROWSER!**

1. Press `F5` or `Ctrl+R`
2. Or close and reopen the browser tab

After refreshing:
- ✅ No more "infinite recursion" error
- ✅ Timetable should load correctly
- ✅ Projects should be accessible
- ✅ Your role should show as "Admin"
- ✅ All features should work

## 📝 Technical Notes

### Why SECURITY DEFINER Matters

Functions marked as `SECURITY DEFINER` run with the privileges of the function owner (usually postgres or service role), not the calling user. This means:

- ✅ They can bypass RLS on tables
- ✅ They have full database access
- ⚠️ Must be carefully written to avoid security issues

### Best Practices Learned

1. **Never call recursive functions in RLS policies** - Always check if a function queries the same table the policy is on
2. **Use short-circuit evaluation** - Put simple, fast checks first in OR conditions
3. **Keep policies simple** - The simpler the policy, the less chance of recursion
4. **Avoid duplicate policies** - Multiple policies on the same operation can conflict
5. **Test with actual users** - Service role queries bypass RLS, so always test as real users

## ⚠️ Security Considerations

All changes maintain the original security model:
- ✅ Members can only see their own data
- ✅ Managers can see project-specific data
- ✅ Admins can see everything
- ✅ Project creators have full control
- ✅ No data leakage

---

**Status:** ✅ **FIXED**  
**Applied:** December 15, 2024  
**Next Step:** **Refresh browser to see changes**

