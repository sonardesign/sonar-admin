-- RBAC (Role-Based Access Control) System Migration
-- Description: Implements comprehensive permission system with admin, manager, and member roles
-- Created: 2024

-- =====================================================
-- 1. UPDATE PROFILE ROLE CONSTRAINT
-- =====================================================

-- Drop the old role constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add new role constraint with 'member' instead of 'user'
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'manager', 'member'));

-- Update existing 'user' roles to 'member'
UPDATE public.profiles SET role = 'member' WHERE role = 'user';

-- =====================================================
-- 2. CREATE PROJECT MANAGER PERMISSIONS TABLE
-- =====================================================

-- This table allows admins to grant managers project-specific access
CREATE TABLE IF NOT EXISTS public.project_manager_permissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    manager_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    can_view_time_entries BOOLEAN DEFAULT true,
    can_edit_time_entries BOOLEAN DEFAULT false,
    can_view_reports BOOLEAN DEFAULT true,
    can_edit_project BOOLEAN DEFAULT false,
    granted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(manager_id, project_id),
    
    -- Only managers can have project-specific permissions
    CONSTRAINT manager_must_be_manager_role CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = manager_id AND role = 'manager'
        )
    )
);

-- Index for performance
CREATE INDEX idx_project_manager_permissions_manager_id ON public.project_manager_permissions(manager_id);
CREATE INDEX idx_project_manager_permissions_project_id ON public.project_manager_permissions(project_id);

-- Enable RLS
ALTER TABLE public.project_manager_permissions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. UPDATE RLS HELPER FUNCTIONS
-- =====================================================

-- Drop and recreate the is_manager_or_admin function to handle new role name
DROP FUNCTION IF EXISTS public.is_manager_or_admin();

CREATE OR REPLACE FUNCTION public.is_manager_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if manager has access to a specific project
CREATE OR REPLACE FUNCTION public.manager_has_project_permission(project_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        -- Admins have access to all projects
        public.is_admin() OR
        -- Check if manager has explicit permission for this project
        EXISTS (
            SELECT 1 FROM public.project_manager_permissions pmp
            WHERE pmp.project_id = project_uuid 
            AND pmp.manager_id = auth.uid()
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if manager can view time entries for a project
CREATE OR REPLACE FUNCTION public.can_view_project_time_entries(project_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Get current user role
    SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
    
    -- Admins can view all time entries
    IF user_role = 'admin' THEN
        RETURN true;
    END IF;
    
    -- Managers can view time entries if they have permission
    IF user_role = 'manager' THEN
        RETURN EXISTS (
            SELECT 1 FROM public.project_manager_permissions pmp
            WHERE pmp.project_id = project_uuid 
            AND pmp.manager_id = auth.uid()
            AND pmp.can_view_time_entries = true
        );
    END IF;
    
    -- Members can only view their own time entries
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. UPDATE TIME ENTRIES RLS POLICIES
-- =====================================================

-- Drop existing manager policy
DROP POLICY IF EXISTS "Managers can view project time entries" ON public.time_entries;

-- Create new policy for managers with project-specific permissions
CREATE POLICY "Managers can view assigned project time entries" ON public.time_entries
    FOR SELECT USING (
        public.can_view_project_time_entries(project_id)
    );

-- Update the time entries update policy for managers
DROP POLICY IF EXISTS "Managers can update project time entries" ON public.time_entries;

CREATE POLICY "Managers can update assigned project time entries" ON public.time_entries
    FOR UPDATE USING (
        public.is_admin() OR
        EXISTS (
            SELECT 1 FROM public.project_manager_permissions pmp
            WHERE pmp.project_id = time_entries.project_id 
            AND pmp.manager_id = auth.uid()
            AND pmp.can_edit_time_entries = true
        )
    );

-- =====================================================
-- 5. UPDATE PROJECTS RLS POLICIES
-- =====================================================

-- Update project view policy to include managers with permissions
DROP POLICY IF EXISTS "Users can view accessible projects" ON public.projects;

CREATE POLICY "Users can view accessible projects" ON public.projects
    FOR SELECT USING (
        public.is_admin() OR
        public.manager_has_project_permission(id) OR
        public.has_project_access(id) OR
        -- Members can view projects they have time entries for
        EXISTS (
            SELECT 1 FROM public.time_entries te
            WHERE te.project_id = projects.id AND te.user_id = auth.uid()
        )
    );

-- Update project edit policy for managers
DROP POLICY IF EXISTS "Project owners can update projects" ON public.projects;

CREATE POLICY "Authorized users can update projects" ON public.projects
    FOR UPDATE USING (
        public.is_admin() OR 
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.project_manager_permissions pmp
            WHERE pmp.project_id = id 
            AND pmp.manager_id = auth.uid()
            AND pmp.can_edit_project = true
        ) OR
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = id AND pm.user_id = auth.uid() 
            AND pm.role IN ('owner', 'manager') AND pm.can_edit_project = true
        )
    );

-- =====================================================
-- 6. PROJECT MANAGER PERMISSIONS TABLE RLS POLICIES
-- =====================================================

-- Admins can view all manager permissions
CREATE POLICY "Admins can view all manager permissions" ON public.project_manager_permissions
    FOR SELECT USING (public.is_admin());

-- Managers can view their own permissions
CREATE POLICY "Managers can view own permissions" ON public.project_manager_permissions
    FOR SELECT USING (manager_id = auth.uid());

-- Only admins can create manager permissions
CREATE POLICY "Admins can create manager permissions" ON public.project_manager_permissions
    FOR INSERT WITH CHECK (public.is_admin());

-- Only admins can update manager permissions
CREATE POLICY "Admins can update manager permissions" ON public.project_manager_permissions
    FOR UPDATE USING (public.is_admin());

-- Only admins can delete manager permissions
CREATE POLICY "Admins can delete manager permissions" ON public.project_manager_permissions
    FOR DELETE USING (public.is_admin());

-- =====================================================
-- 7. UPDATE PROFILES RLS POLICIES FOR ROLE-BASED VISIBILITY
-- =====================================================

-- Drop the old policy for viewing project member profiles
DROP POLICY IF EXISTS "Users can view project member profiles" ON public.profiles;

-- Managers can view profiles of users in projects they manage
CREATE POLICY "Managers can view managed project user profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.time_entries te
            JOIN public.project_manager_permissions pmp ON te.project_id = pmp.project_id
            WHERE te.user_id = profiles.id 
            AND pmp.manager_id = auth.uid()
            AND pmp.can_view_time_entries = true
        )
    );

-- =====================================================
-- 8. CREATE FUNCTION TO GET USER ROLE
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role FROM public.profiles WHERE id = user_uuid;
    RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. CREATE FUNCTION TO GET USERS VISIBLE TO CURRENT USER
-- =====================================================

-- Function to get all users that the current user can see
CREATE OR REPLACE FUNCTION public.get_visible_users()
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    is_active BOOLEAN
) AS $$
DECLARE
    current_user_role TEXT;
BEGIN
    -- Get current user's role
    SELECT p.role INTO current_user_role 
    FROM public.profiles p 
    WHERE p.id = auth.uid();
    
    -- Admins can see all users
    IF current_user_role = 'admin' THEN
        RETURN QUERY
        SELECT p.id, p.email, p.full_name, p.role, p.is_active
        FROM public.profiles p
        WHERE p.is_active = true
        ORDER BY p.full_name;
        RETURN;
    END IF;
    
    -- Managers can see users in their assigned projects
    IF current_user_role = 'manager' THEN
        RETURN QUERY
        SELECT DISTINCT p.id, p.email, p.full_name, p.role, p.is_active
        FROM public.profiles p
        WHERE p.is_active = true
        AND (
            -- The manager themselves
            p.id = auth.uid() OR
            -- Users who have time entries in projects the manager can access
            EXISTS (
                SELECT 1 FROM public.time_entries te
                JOIN public.project_manager_permissions pmp ON te.project_id = pmp.project_id
                WHERE te.user_id = p.id 
                AND pmp.manager_id = auth.uid()
                AND pmp.can_view_time_entries = true
            )
        )
        ORDER BY p.full_name;
        RETURN;
    END IF;
    
    -- Members can only see themselves
    RETURN QUERY
    SELECT p.id, p.email, p.full_name, p.role, p.is_active
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_active = true;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 10. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.project_manager_permissions IS 'Project-specific permissions for managers, allowing admins to grant granular access';
COMMENT ON FUNCTION public.manager_has_project_permission(UUID) IS 'Check if a manager has any permission for a specific project';
COMMENT ON FUNCTION public.can_view_project_time_entries(UUID) IS 'Check if current user can view time entries for a specific project';
COMMENT ON FUNCTION public.get_visible_users() IS 'Get all users visible to the current user based on their role and permissions';

-- Success message
SELECT 'RBAC system created successfully! Roles updated: admin, manager, member' as message;

