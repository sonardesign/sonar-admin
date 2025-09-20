-- Row Level Security (RLS) Policies
-- Description: Security policies to ensure users can only access their own data

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entry_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS FOR RLS
-- =====================================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is manager or admin
CREATE OR REPLACE FUNCTION public.is_manager_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has access to project
CREATE OR REPLACE FUNCTION public.has_project_access(project_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        public.is_admin() OR
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = project_uuid AND pm.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_uuid AND p.created_by = auth.uid()
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has access to client
CREATE OR REPLACE FUNCTION public.has_client_access(client_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        public.is_admin() OR
        EXISTS (
            SELECT 1 FROM public.clients c
            WHERE c.id = client_uuid AND c.created_by = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.projects p
            JOIN public.project_members pm ON p.id = pm.project_id
            WHERE p.client_id = client_uuid AND pm.user_id = auth.uid()
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PROFILES TABLE POLICIES
-- =====================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (public.is_admin());

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles" ON public.profiles
    FOR UPDATE USING (public.is_admin());

-- Users can view profiles of project members
CREATE POLICY "Users can view project member profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm1
            JOIN public.project_members pm2 ON pm1.project_id = pm2.project_id
            WHERE pm1.user_id = auth.uid() AND pm2.user_id = profiles.id
        )
    );

-- =====================================================
-- CLIENTS TABLE POLICIES
-- =====================================================

-- Users can view clients they have access to
CREATE POLICY "Users can view accessible clients" ON public.clients
    FOR SELECT USING (public.has_client_access(id));

-- Admins and managers can create clients
CREATE POLICY "Managers can create clients" ON public.clients
    FOR INSERT WITH CHECK (public.is_manager_or_admin());

-- Users can update clients they created or admins can update any
CREATE POLICY "Users can update own clients" ON public.clients
    FOR UPDATE USING (
        public.is_admin() OR created_by = auth.uid()
    );

-- Admins can delete clients
CREATE POLICY "Admins can delete clients" ON public.clients
    FOR DELETE USING (public.is_admin());

-- =====================================================
-- PROJECTS TABLE POLICIES
-- =====================================================

-- Users can view projects they have access to
CREATE POLICY "Users can view accessible projects" ON public.projects
    FOR SELECT USING (public.has_project_access(id));

-- Users with client access can create projects
CREATE POLICY "Users can create projects" ON public.projects
    FOR INSERT WITH CHECK (
        public.is_manager_or_admin() AND public.has_client_access(client_id)
    );

-- Project owners and admins can update projects
CREATE POLICY "Project owners can update projects" ON public.projects
    FOR UPDATE USING (
        public.is_admin() OR 
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = id AND pm.user_id = auth.uid() 
            AND pm.role IN ('owner', 'manager') AND pm.can_edit_project = true
        )
    );

-- Admins and project owners can delete projects
CREATE POLICY "Project owners can delete projects" ON public.projects
    FOR DELETE USING (
        public.is_admin() OR created_by = auth.uid()
    );

-- =====================================================
-- PROJECT MEMBERS TABLE POLICIES
-- =====================================================

-- Users can view project members for projects they have access to
CREATE POLICY "Users can view project members" ON public.project_members
    FOR SELECT USING (public.has_project_access(project_id));

-- Project owners and admins can add members
CREATE POLICY "Project owners can add members" ON public.project_members
    FOR INSERT WITH CHECK (
        public.is_admin() OR
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_id AND p.created_by = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = project_id AND pm.user_id = auth.uid() 
            AND pm.role IN ('owner', 'manager')
        )
    );

-- Project owners and admins can update member roles
CREATE POLICY "Project owners can update members" ON public.project_members
    FOR UPDATE USING (
        public.is_admin() OR
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_id AND p.created_by = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = project_id AND pm.user_id = auth.uid() 
            AND pm.role IN ('owner', 'manager')
        )
    );

-- Project owners and admins can remove members
CREATE POLICY "Project owners can remove members" ON public.project_members
    FOR DELETE USING (
        public.is_admin() OR
        user_id = auth.uid() OR -- Users can remove themselves
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_id AND p.created_by = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = project_id AND pm.user_id = auth.uid() 
            AND pm.role IN ('owner', 'manager')
        )
    );

-- =====================================================
-- TASKS TABLE POLICIES
-- =====================================================

-- Users can view tasks for projects they have access to
CREATE POLICY "Users can view project tasks" ON public.tasks
    FOR SELECT USING (public.has_project_access(project_id));

-- Project members can create tasks
CREATE POLICY "Project members can create tasks" ON public.tasks
    FOR INSERT WITH CHECK (public.has_project_access(project_id));

-- Task assignees and project managers can update tasks
CREATE POLICY "Users can update tasks" ON public.tasks
    FOR UPDATE USING (
        public.is_admin() OR
        assigned_to = auth.uid() OR
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = tasks.project_id AND pm.user_id = auth.uid() 
            AND pm.role IN ('owner', 'manager')
        )
    );

-- Task creators, assignees, and project managers can delete tasks
CREATE POLICY "Users can delete tasks" ON public.tasks
    FOR DELETE USING (
        public.is_admin() OR
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = tasks.project_id AND pm.user_id = auth.uid() 
            AND pm.role IN ('owner', 'manager')
        )
    );

-- =====================================================
-- TIME ENTRIES TABLE POLICIES
-- =====================================================

-- Users can view their own time entries
CREATE POLICY "Users can view own time entries" ON public.time_entries
    FOR SELECT USING (user_id = auth.uid());

-- Project managers and admins can view project time entries
CREATE POLICY "Managers can view project time entries" ON public.time_entries
    FOR SELECT USING (
        public.is_admin() OR
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = time_entries.project_id AND pm.user_id = auth.uid() 
            AND pm.role IN ('owner', 'manager') AND pm.can_view_reports = true
        )
    );

-- Users can create their own time entries for projects they have access to
CREATE POLICY "Users can create own time entries" ON public.time_entries
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND public.has_project_access(project_id)
    );

-- Users can update their own time entries
CREATE POLICY "Users can update own time entries" ON public.time_entries
    FOR UPDATE USING (user_id = auth.uid());

-- Admins and project managers can update any time entries for their projects
CREATE POLICY "Managers can update project time entries" ON public.time_entries
    FOR UPDATE USING (
        public.is_admin() OR
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = time_entries.project_id AND pm.user_id = auth.uid() 
            AND pm.role IN ('owner', 'manager')
        )
    );

-- Users can delete their own time entries
CREATE POLICY "Users can delete own time entries" ON public.time_entries
    FOR DELETE USING (user_id = auth.uid());

-- Admins can delete any time entries
CREATE POLICY "Admins can delete time entries" ON public.time_entries
    FOR DELETE USING (public.is_admin());

-- =====================================================
-- TIME ENTRY APPROVALS TABLE POLICIES
-- =====================================================

-- Users can view approvals for their time entries
CREATE POLICY "Users can view own time entry approvals" ON public.time_entry_approvals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.time_entries te
            WHERE te.id = time_entry_id AND te.user_id = auth.uid()
        )
    );

-- Managers can view approvals for their projects
CREATE POLICY "Managers can view project approvals" ON public.time_entry_approvals
    FOR SELECT USING (
        public.is_admin() OR
        EXISTS (
            SELECT 1 FROM public.time_entries te
            JOIN public.project_members pm ON te.project_id = pm.project_id
            WHERE te.id = time_entry_id AND pm.user_id = auth.uid() 
            AND pm.role IN ('owner', 'manager')
        )
    );

-- Managers can create approvals
CREATE POLICY "Managers can create approvals" ON public.time_entry_approvals
    FOR INSERT WITH CHECK (
        approved_by = auth.uid() AND
        (public.is_admin() OR
        EXISTS (
            SELECT 1 FROM public.time_entries te
            JOIN public.project_members pm ON te.project_id = pm.project_id
            WHERE te.id = time_entry_id AND pm.user_id = auth.uid() 
            AND pm.role IN ('owner', 'manager')
        ))
    );

-- Approvers can update their approvals
CREATE POLICY "Approvers can update approvals" ON public.time_entry_approvals
    FOR UPDATE USING (approved_by = auth.uid());

-- =====================================================
-- INVOICES TABLE POLICIES
-- =====================================================

-- Users can view invoices for clients they have access to
CREATE POLICY "Users can view client invoices" ON public.invoices
    FOR SELECT USING (public.has_client_access(client_id));

-- Managers and admins can create invoices
CREATE POLICY "Managers can create invoices" ON public.invoices
    FOR INSERT WITH CHECK (
        public.is_manager_or_admin() AND public.has_client_access(client_id)
    );

-- Invoice creators and admins can update invoices
CREATE POLICY "Users can update own invoices" ON public.invoices
    FOR UPDATE USING (
        public.is_admin() OR created_by = auth.uid()
    );

-- Admins can delete invoices
CREATE POLICY "Admins can delete invoices" ON public.invoices
    FOR DELETE USING (public.is_admin());

-- =====================================================
-- INVOICE LINE ITEMS TABLE POLICIES
-- =====================================================

-- Users can view line items for invoices they can access
CREATE POLICY "Users can view invoice line items" ON public.invoice_line_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.invoices i
            WHERE i.id = invoice_id AND public.has_client_access(i.client_id)
        )
    );

-- Users who can update the invoice can manage line items
CREATE POLICY "Users can manage invoice line items" ON public.invoice_line_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.invoices i
            WHERE i.id = invoice_id AND 
            (public.is_admin() OR i.created_by = auth.uid())
        )
    );

-- =====================================================
-- REPORTS TABLE POLICIES
-- =====================================================

-- Users can view their own reports
CREATE POLICY "Users can view own reports" ON public.reports
    FOR SELECT USING (created_by = auth.uid());

-- Admins can view all reports
CREATE POLICY "Admins can view all reports" ON public.reports
    FOR SELECT USING (public.is_admin());

-- Users can create their own reports
CREATE POLICY "Users can create reports" ON public.reports
    FOR INSERT WITH CHECK (created_by = auth.uid());

-- Users can update their own reports
CREATE POLICY "Users can update own reports" ON public.reports
    FOR UPDATE USING (created_by = auth.uid());

-- Users can delete their own reports
CREATE POLICY "Users can delete own reports" ON public.reports
    FOR DELETE USING (created_by = auth.uid());

-- Admins can manage all reports
CREATE POLICY "Admins can manage all reports" ON public.reports
    FOR ALL USING (public.is_admin());

-- =====================================================
-- ACTIVITY LOG TABLE POLICIES
-- =====================================================

-- Admins can view all activity logs
CREATE POLICY "Admins can view activity logs" ON public.activity_log
    FOR SELECT USING (public.is_admin());

-- Users can view their own activity
CREATE POLICY "Users can view own activity" ON public.activity_log
    FOR SELECT USING (user_id = auth.uid());

-- System can insert activity logs (no user restriction on INSERT)
CREATE POLICY "System can insert activity logs" ON public.activity_log
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant permissions on tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Grant permissions on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- Success message
SELECT 'RLS policies created successfully!' as message;
