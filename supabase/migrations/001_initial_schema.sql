-- Supabase Time Tracking System - Initial Schema
-- Created: 2024
-- Description: Complete relational schema for time tracking application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable RLS (Row Level Security)
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- =====================================================
-- USERS TABLE (extends auth.users)
-- =====================================================
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
    timezone TEXT DEFAULT 'UTC',
    date_format TEXT DEFAULT 'YYYY-MM-DD',
    time_format TEXT DEFAULT '24h' CHECK (time_format IN ('12h', '24h')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CLIENTS TABLE
-- =====================================================
CREATE TABLE public.clients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    website TEXT,
    contact_person TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT clients_name_not_empty CHECK (length(trim(name)) > 0)
);

-- =====================================================
-- PROJECTS TABLE
-- =====================================================
CREATE TABLE public.projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3b82f6',
    hourly_rate DECIMAL(10,2),
    budget DECIMAL(10,2),
    deadline DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'on_hold', 'completed', 'cancelled')),
    is_archived BOOLEAN DEFAULT false,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT projects_name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT projects_color_format CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT projects_rates_positive CHECK (hourly_rate IS NULL OR hourly_rate >= 0),
    CONSTRAINT projects_budget_positive CHECK (budget IS NULL OR budget >= 0)
);

-- =====================================================
-- PROJECT MEMBERS TABLE (Many-to-Many: Users <-> Projects)
-- =====================================================
CREATE TABLE public.project_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'manager', 'member', 'viewer')),
    hourly_rate DECIMAL(10,2),
    can_edit_project BOOLEAN DEFAULT false,
    can_view_reports BOOLEAN DEFAULT true,
    added_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(project_id, user_id),
    CONSTRAINT member_rates_positive CHECK (hourly_rate IS NULL OR hourly_rate >= 0)
);

-- =====================================================
-- TASKS TABLE (Optional: Break projects into tasks)
-- =====================================================
CREATE TABLE public.tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    estimated_hours DECIMAL(5,2),
    status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'completed', 'cancelled')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    due_date DATE,
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT tasks_name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT tasks_estimated_hours_positive CHECK (estimated_hours IS NULL OR estimated_hours > 0)
);

-- =====================================================
-- TIME ENTRIES TABLE
-- =====================================================
CREATE TABLE public.time_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_minutes INTEGER,
    is_billable BOOLEAN DEFAULT true,
    hourly_rate DECIMAL(10,2),
    tags TEXT[], -- Array of tags for categorization
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT time_entries_end_after_start CHECK (end_time IS NULL OR end_time > start_time),
    CONSTRAINT time_entries_duration_positive CHECK (duration_minutes IS NULL OR duration_minutes > 0),
    CONSTRAINT time_entries_rate_positive CHECK (hourly_rate IS NULL OR hourly_rate >= 0),
    CONSTRAINT time_entries_description_not_empty CHECK (description IS NULL OR length(trim(description)) > 0)
);

-- =====================================================
-- TIME ENTRY APPROVALS TABLE
-- =====================================================
CREATE TABLE public.time_entry_approvals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    time_entry_id UUID REFERENCES public.time_entries(id) ON DELETE CASCADE NOT NULL,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    notes TEXT,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(time_entry_id) -- One approval per time entry
);

-- =====================================================
-- INVOICES TABLE
-- =====================================================
CREATE TABLE public.invoices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    invoice_number TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    paid_date DATE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT invoices_amounts_positive CHECK (
        subtotal >= 0 AND 
        tax_amount >= 0 AND 
        discount_amount >= 0 AND 
        total_amount >= 0
    ),
    CONSTRAINT invoices_tax_rate_valid CHECK (tax_rate >= 0 AND tax_rate <= 100),
    CONSTRAINT invoices_due_after_issue CHECK (due_date IS NULL OR due_date >= issue_date)
);

-- =====================================================
-- INVOICE LINE ITEMS TABLE
-- =====================================================
CREATE TABLE public.invoice_line_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
    time_entry_id UUID REFERENCES public.time_entries(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(8,2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT line_items_quantity_positive CHECK (quantity > 0),
    CONSTRAINT line_items_unit_price_positive CHECK (unit_price >= 0),
    CONSTRAINT line_items_total_price_positive CHECK (total_price >= 0),
    CONSTRAINT line_items_description_not_empty CHECK (length(trim(description)) > 0)
);

-- =====================================================
-- REPORTS TABLE (Saved/Scheduled Reports)
-- =====================================================
CREATE TABLE public.reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('time_summary', 'project_summary', 'client_summary', 'detailed', 'invoice_summary')),
    filters JSONB, -- Store filter criteria
    schedule TEXT CHECK (schedule IN ('none', 'daily', 'weekly', 'monthly')),
    recipients TEXT[], -- Email addresses for scheduled reports
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT reports_name_not_empty CHECK (length(trim(name)) > 0)
);

-- =====================================================
-- ACTIVITY LOG TABLE (Audit Trail)
-- =====================================================
CREATE TABLE public.activity_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- 'project', 'client', 'time_entry', etc.
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT activity_log_action_not_empty CHECK (length(trim(action)) > 0),
    CONSTRAINT activity_log_entity_type_not_empty CHECK (length(trim(entity_type)) > 0)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Profiles indexes
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_is_active ON public.profiles(is_active);

-- Clients indexes
CREATE INDEX idx_clients_name ON public.clients(name);
CREATE INDEX idx_clients_is_active ON public.clients(is_active);
CREATE INDEX idx_clients_created_by ON public.clients(created_by);

-- Projects indexes
CREATE INDEX idx_projects_client_id ON public.projects(client_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_is_archived ON public.projects(is_archived);
CREATE INDEX idx_projects_created_by ON public.projects(created_by);
CREATE INDEX idx_projects_name ON public.projects(name);

-- Project members indexes
CREATE INDEX idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX idx_project_members_user_id ON public.project_members(user_id);
CREATE INDEX idx_project_members_role ON public.project_members(role);

-- Tasks indexes
CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);

-- Time entries indexes
CREATE INDEX idx_time_entries_user_id ON public.time_entries(user_id);
CREATE INDEX idx_time_entries_project_id ON public.time_entries(project_id);
CREATE INDEX idx_time_entries_task_id ON public.time_entries(task_id);
CREATE INDEX idx_time_entries_start_time ON public.time_entries(start_time);
CREATE INDEX idx_time_entries_date ON public.time_entries(DATE(start_time));
CREATE INDEX idx_time_entries_is_billable ON public.time_entries(is_billable);

-- Invoices indexes
CREATE INDEX idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_issue_date ON public.invoices(issue_date);
CREATE INDEX idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX idx_invoices_created_by ON public.invoices(created_by);

-- Invoice line items indexes
CREATE INDEX idx_invoice_line_items_invoice_id ON public.invoice_line_items(invoice_id);
CREATE INDEX idx_invoice_line_items_time_entry_id ON public.invoice_line_items(time_entry_id);

-- Reports indexes
CREATE INDEX idx_reports_type ON public.reports(type);
CREATE INDEX idx_reports_created_by ON public.reports(created_by);
CREATE INDEX idx_reports_is_active ON public.reports(is_active);

-- Activity log indexes
CREATE INDEX idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX idx_activity_log_entity_type ON public.activity_log(entity_type);
CREATE INDEX idx_activity_log_entity_id ON public.activity_log(entity_id);
CREATE INDEX idx_activity_log_created_at ON public.activity_log(created_at);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- =====================================================

-- Create function for updating timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_time_entries_updated_at
    BEFORE UPDATE ON public.time_entries
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_reports_updated_at
    BEFORE UPDATE ON public.reports
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- FUNCTIONS FOR BUSINESS LOGIC
-- =====================================================

-- Function to calculate time entry duration
CREATE OR REPLACE FUNCTION public.calculate_time_entry_duration()
RETURNS TRIGGER AS $$
BEGIN
    -- Only calculate if both start_time and end_time are provided
    IF NEW.start_time IS NOT NULL AND NEW.end_time IS NOT NULL THEN
        NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_time_entry_duration
    BEFORE INSERT OR UPDATE ON public.time_entries
    FOR EACH ROW EXECUTE FUNCTION public.calculate_time_entry_duration();

-- Function to update invoice totals
CREATE OR REPLACE FUNCTION public.update_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
    invoice_subtotal DECIMAL(10,2);
    invoice_tax_amount DECIMAL(10,2);
    invoice_total DECIMAL(10,2);
    invoice_tax_rate DECIMAL(5,2);
    invoice_discount DECIMAL(10,2);
BEGIN
    -- Get the invoice details
    SELECT tax_rate, discount_amount INTO invoice_tax_rate, invoice_discount
    FROM public.invoices 
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    -- Calculate subtotal from line items
    SELECT COALESCE(SUM(total_price), 0) INTO invoice_subtotal
    FROM public.invoice_line_items 
    WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    -- Calculate tax amount
    invoice_tax_amount = (invoice_subtotal - COALESCE(invoice_discount, 0)) * COALESCE(invoice_tax_rate, 0) / 100;
    
    -- Calculate total
    invoice_total = invoice_subtotal + invoice_tax_amount - COALESCE(invoice_discount, 0);
    
    -- Update invoice
    UPDATE public.invoices 
    SET 
        subtotal = invoice_subtotal,
        tax_amount = invoice_tax_amount,
        total_amount = invoice_total,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoice_totals
    AFTER INSERT OR UPDATE OR DELETE ON public.invoice_line_items
    FOR EACH ROW EXECUTE FUNCTION public.update_invoice_totals();

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for time entries with project and client info
CREATE VIEW public.time_entries_detailed AS
SELECT 
    te.id,
    te.user_id,
    p.full_name as user_name,
    te.project_id,
    pr.name as project_name,
    pr.color as project_color,
    te.task_id,
    t.name as task_name,
    te.description,
    te.start_time,
    te.end_time,
    te.duration_minutes,
    te.is_billable,
    te.hourly_rate,
    te.tags,
    c.id as client_id,
    c.name as client_name,
    te.created_at,
    te.updated_at
FROM public.time_entries te
JOIN public.profiles p ON te.user_id = p.id
JOIN public.projects pr ON te.project_id = pr.id
JOIN public.clients c ON pr.client_id = c.id
LEFT JOIN public.tasks t ON te.task_id = t.id;

-- View for project summary with stats
CREATE VIEW public.projects_summary AS
SELECT 
    p.id,
    p.name,
    p.description,
    p.color,
    p.status,
    p.is_archived,
    c.name as client_name,
    c.id as client_id,
    COUNT(DISTINCT pm.user_id) as member_count,
    COUNT(DISTINCT t.id) as task_count,
    COUNT(DISTINCT te.id) as time_entry_count,
    COALESCE(SUM(te.duration_minutes), 0) as total_minutes,
    ROUND(COALESCE(SUM(te.duration_minutes), 0) / 60.0, 2) as total_hours,
    p.created_at,
    p.updated_at
FROM public.projects p
JOIN public.clients c ON p.client_id = c.id
LEFT JOIN public.project_members pm ON p.id = pm.project_id
LEFT JOIN public.tasks t ON p.id = t.project_id
LEFT JOIN public.time_entries te ON p.id = te.project_id
GROUP BY p.id, p.name, p.description, p.color, p.status, p.is_archived, 
         c.name, c.id, p.created_at, p.updated_at;

-- View for user time summary
CREATE VIEW public.user_time_summary AS
SELECT 
    p.id as user_id,
    p.full_name,
    p.email,
    COUNT(DISTINCT te.project_id) as active_projects,
    COUNT(te.id) as total_entries,
    COALESCE(SUM(te.duration_minutes), 0) as total_minutes,
    ROUND(COALESCE(SUM(te.duration_minutes), 0) / 60.0, 2) as total_hours,
    COALESCE(SUM(CASE WHEN te.is_billable THEN te.duration_minutes ELSE 0 END), 0) as billable_minutes,
    ROUND(COALESCE(SUM(CASE WHEN te.is_billable THEN te.duration_minutes ELSE 0 END), 0) / 60.0, 2) as billable_hours
FROM public.profiles p
LEFT JOIN public.time_entries te ON p.id = te.user_id
WHERE p.is_active = true
GROUP BY p.id, p.full_name, p.email;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.profiles IS 'User profiles extending Supabase auth.users';
COMMENT ON TABLE public.clients IS 'Client/customer information';
COMMENT ON TABLE public.projects IS 'Projects belonging to clients';
COMMENT ON TABLE public.project_members IS 'Many-to-many relationship between users and projects';
COMMENT ON TABLE public.tasks IS 'Optional task breakdown within projects';
COMMENT ON TABLE public.time_entries IS 'Individual time tracking entries';
COMMENT ON TABLE public.time_entry_approvals IS 'Approval workflow for time entries';
COMMENT ON TABLE public.invoices IS 'Client invoices';
COMMENT ON TABLE public.invoice_line_items IS 'Line items within invoices';
COMMENT ON TABLE public.reports IS 'Saved and scheduled reports';
COMMENT ON TABLE public.activity_log IS 'Audit trail for all system changes';

-- Success message
SELECT 'Initial schema created successfully!' as message;
