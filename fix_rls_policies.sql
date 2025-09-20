-- Fix RLS Policy Issues
-- This script fixes the infinite recursion and 406 errors

-- =====================================================
-- DROP EXISTING PROBLEMATIC POLICIES AND FUNCTIONS
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view project member profiles" ON public.profiles;

DROP POLICY IF EXISTS "Users can view accessible clients" ON public.clients;
DROP POLICY IF EXISTS "Managers can create clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update own clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can delete clients" ON public.clients;

DROP POLICY IF EXISTS "Users can view accessible projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create projects" ON public.projects;
DROP POLICY IF EXISTS "Project owners can update projects" ON public.projects;
DROP POLICY IF EXISTS "Project owners can delete projects" ON public.projects;

DROP POLICY IF EXISTS "Users can view project members" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can add members" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can update members" ON public.project_members;

-- Drop existing functions
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.is_manager_or_admin();
DROP FUNCTION IF EXISTS public.has_project_access(UUID);
DROP FUNCTION IF EXISTS public.has_client_access(UUID);

-- =====================================================
-- SIMPLIFIED RLS POLICIES WITHOUT CIRCULAR DEPENDENCIES
-- =====================================================

-- PROFILES TABLE POLICIES
-- Users can view and update their own profile
CREATE POLICY "profiles_own_access" ON public.profiles
    FOR ALL USING (auth.uid() = id);

-- Allow INSERT for new user registration (handled by auth trigger)
CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- CLIENTS TABLE POLICIES  
-- For now, allow all authenticated users to access clients
-- This can be refined later with proper role-based access
CREATE POLICY "clients_authenticated_access" ON public.clients
    FOR ALL USING (auth.uid() IS NOT NULL);

-- PROJECTS TABLE POLICIES
-- Allow all authenticated users to access projects
-- This can be refined later with proper membership checks
CREATE POLICY "projects_authenticated_access" ON public.projects
    FOR ALL USING (auth.uid() IS NOT NULL);

-- PROJECT MEMBERS TABLE POLICIES
-- Allow all authenticated users to access project members
CREATE POLICY "project_members_authenticated_access" ON public.project_members
    FOR ALL USING (auth.uid() IS NOT NULL);

-- TASKS TABLE POLICIES
CREATE POLICY "tasks_authenticated_access" ON public.tasks
    FOR ALL USING (auth.uid() IS NOT NULL);

-- TIME ENTRIES TABLE POLICIES
-- Users can only access their own time entries
CREATE POLICY "time_entries_own_access" ON public.time_entries
    FOR ALL USING (auth.uid() = user_id);

-- TIME ENTRY APPROVALS TABLE POLICIES
CREATE POLICY "time_entry_approvals_authenticated_access" ON public.time_entry_approvals
    FOR ALL USING (auth.uid() IS NOT NULL);

-- INVOICES TABLE POLICIES
CREATE POLICY "invoices_authenticated_access" ON public.invoices
    FOR ALL USING (auth.uid() IS NOT NULL);

-- INVOICE LINE ITEMS TABLE POLICIES
CREATE POLICY "invoice_line_items_authenticated_access" ON public.invoice_line_items
    FOR ALL USING (auth.uid() IS NOT NULL);

-- REPORTS TABLE POLICIES
CREATE POLICY "reports_authenticated_access" ON public.reports
    FOR ALL USING (auth.uid() IS NOT NULL);

-- ACTIVITY LOG TABLE POLICIES
CREATE POLICY "activity_log_authenticated_access" ON public.activity_log
    FOR ALL USING (auth.uid() IS NOT NULL);

-- =====================================================
-- CREATE TRIGGER FOR AUTOMATIC PROFILE CREATION
-- =====================================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'user'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- GRANT NECESSARY PERMISSIONS
-- =====================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant permissions on tables
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.clients TO authenticated;
GRANT ALL ON public.projects TO authenticated;
GRANT ALL ON public.project_members TO authenticated;
GRANT ALL ON public.tasks TO authenticated;
GRANT ALL ON public.time_entries TO authenticated;
GRANT ALL ON public.time_entry_approvals TO authenticated;
GRANT ALL ON public.invoices TO authenticated;
GRANT ALL ON public.invoice_line_items TO authenticated;
GRANT ALL ON public.reports TO authenticated;
GRANT ALL ON public.activity_log TO authenticated;

-- Grant permissions on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
