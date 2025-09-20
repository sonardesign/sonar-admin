-- Additional Functions and Triggers for Time Tracking System
-- Description: Business logic functions, triggers, and stored procedures

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Function to generate next invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    current_year TEXT;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    SELECT COALESCE(MAX(
        CAST(SPLIT_PART(invoice_number, '-', 3) AS INTEGER)
    ), 0) + 1 INTO next_number
    FROM public.invoices 
    WHERE invoice_number LIKE 'INV-' || current_year || '-%';
    
    RETURN 'INV-' || current_year || '-' || LPAD(next_number::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to calculate project statistics
CREATE OR REPLACE FUNCTION public.get_project_stats(project_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_hours', COALESCE(SUM(te.duration_minutes) / 60.0, 0),
        'billable_hours', COALESCE(SUM(CASE WHEN te.is_billable THEN te.duration_minutes ELSE 0 END) / 60.0, 0),
        'total_entries', COUNT(te.id),
        'team_members', COUNT(DISTINCT pm.user_id),
        'completed_tasks', COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END),
        'total_tasks', COUNT(DISTINCT t.id),
        'estimated_hours', COALESCE(SUM(t.estimated_hours), 0),
        'completion_percentage', 
            CASE 
                WHEN COUNT(t.id) > 0 THEN 
                    ROUND((COUNT(CASE WHEN t.status = 'completed' THEN 1 END) * 100.0) / COUNT(t.id), 2)
                ELSE 0 
            END
    ) INTO result
    FROM public.projects p
    LEFT JOIN public.time_entries te ON p.id = te.project_id
    LEFT JOIN public.project_members pm ON p.id = pm.project_id
    LEFT JOIN public.tasks t ON p.id = t.project_id
    WHERE p.id = project_uuid;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's time summary for a date range
CREATE OR REPLACE FUNCTION public.get_user_time_summary(
    user_uuid UUID,
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    actual_start_date DATE;
    actual_end_date DATE;
BEGIN
    -- Default to current month if no dates provided
    actual_start_date := COALESCE(start_date, DATE_TRUNC('month', CURRENT_DATE)::DATE);
    actual_end_date := COALESCE(end_date, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE);
    
    SELECT json_build_object(
        'period', json_build_object(
            'start_date', actual_start_date,
            'end_date', actual_end_date
        ),
        'total_hours', COALESCE(SUM(te.duration_minutes) / 60.0, 0),
        'billable_hours', COALESCE(SUM(CASE WHEN te.is_billable THEN te.duration_minutes ELSE 0 END) / 60.0, 0),
        'total_entries', COUNT(te.id),
        'projects_worked', COUNT(DISTINCT te.project_id),
        'average_hours_per_day', 
            CASE 
                WHEN (actual_end_date - actual_start_date + 1) > 0 THEN
                    ROUND(COALESCE(SUM(te.duration_minutes) / 60.0, 0) / (actual_end_date - actual_start_date + 1), 2)
                ELSE 0 
            END,
        'by_project', json_agg(
            json_build_object(
                'project_id', p.id,
                'project_name', p.name,
                'client_name', c.name,
                'hours', ROUND(project_hours.hours, 2),
                'entries', project_hours.entries
            ) ORDER BY project_hours.hours DESC
        ) FILTER (WHERE p.id IS NOT NULL)
    ) INTO result
    FROM (
        SELECT 
            te.project_id,
            SUM(te.duration_minutes) / 60.0 as hours,
            COUNT(te.id) as entries
        FROM public.time_entries te
        WHERE te.user_id = user_uuid
        AND DATE(te.start_time) BETWEEN actual_start_date AND actual_end_date
        GROUP BY te.project_id
    ) project_hours
    RIGHT JOIN public.time_entries te ON te.project_id = project_hours.project_id 
        AND te.user_id = user_uuid
        AND DATE(te.start_time) BETWEEN actual_start_date AND actual_end_date
    LEFT JOIN public.projects p ON project_hours.project_id = p.id
    LEFT JOIN public.clients c ON p.client_id = c.id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to validate time entry overlap
CREATE OR REPLACE FUNCTION public.check_time_entry_overlap(
    user_uuid UUID,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    exclude_entry_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    overlap_count INTEGER;
BEGIN
    -- Check for overlapping time entries for the same user
    SELECT COUNT(*) INTO overlap_count
    FROM public.time_entries
    WHERE user_id = user_uuid
    AND id != COALESCE(exclude_entry_id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND end_time IS NOT NULL
    AND (
        (start_time >= time_entries.start_time AND start_time < time_entries.end_time) OR
        (end_time > time_entries.start_time AND end_time <= time_entries.end_time) OR
        (start_time <= time_entries.start_time AND end_time >= time_entries.end_time)
    );
    
    RETURN overlap_count > 0;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ADVANCED TRIGGERS
-- =====================================================

-- Trigger to prevent overlapping time entries
CREATE OR REPLACE FUNCTION public.prevent_time_entry_overlap()
RETURNS TRIGGER AS $$
BEGIN
    -- Only check if both start_time and end_time are provided
    IF NEW.start_time IS NOT NULL AND NEW.end_time IS NOT NULL THEN
        IF public.check_time_entry_overlap(NEW.user_id, NEW.start_time, NEW.end_time, NEW.id) THEN
            RAISE EXCEPTION 'Time entry overlaps with existing entry for this user';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_time_entry_overlap
    BEFORE INSERT OR UPDATE ON public.time_entries
    FOR EACH ROW EXECUTE FUNCTION public.prevent_time_entry_overlap();

-- Trigger to automatically complete tasks when all time is logged
CREATE OR REPLACE FUNCTION public.auto_complete_tasks()
RETURNS TRIGGER AS $$
DECLARE
    task_estimated_hours DECIMAL(5,2);
    task_logged_hours DECIMAL(5,2);
BEGIN
    -- Only process if this time entry is linked to a task
    IF NEW.task_id IS NOT NULL THEN
        -- Get task estimated hours
        SELECT estimated_hours INTO task_estimated_hours
        FROM public.tasks
        WHERE id = NEW.task_id;
        
        -- Calculate total logged hours for this task
        SELECT COALESCE(SUM(duration_minutes) / 60.0, 0) INTO task_logged_hours
        FROM public.time_entries
        WHERE task_id = NEW.task_id;
        
        -- If logged hours >= estimated hours and task is not completed, mark as completed
        IF task_estimated_hours IS NOT NULL 
           AND task_logged_hours >= task_estimated_hours 
           AND (SELECT status FROM public.tasks WHERE id = NEW.task_id) != 'completed' THEN
            
            UPDATE public.tasks 
            SET status = 'completed', 
                completed_at = NOW(),
                updated_at = NOW()
            WHERE id = NEW.task_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_complete_tasks
    AFTER INSERT OR UPDATE ON public.time_entries
    FOR EACH ROW EXECUTE FUNCTION public.auto_complete_tasks();

-- Trigger to log activity for audit trail
CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS TRIGGER AS $$
DECLARE
    table_name TEXT;
    action_type TEXT;
    entity_id UUID;
    old_data JSONB;
    new_data JSONB;
BEGIN
    table_name := TG_TABLE_NAME;
    
    -- Determine action type
    IF TG_OP = 'INSERT' THEN
        action_type := 'created';
        entity_id := NEW.id;
        new_data := to_jsonb(NEW);
        old_data := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        action_type := 'updated';
        entity_id := NEW.id;
        new_data := to_jsonb(NEW);
        old_data := to_jsonb(OLD);
    ELSIF TG_OP = 'DELETE' THEN
        action_type := 'deleted';
        entity_id := OLD.id;
        new_data := NULL;
        old_data := to_jsonb(OLD);
    END IF;
    
    -- Insert activity log entry
    INSERT INTO public.activity_log (
        user_id,
        action,
        entity_type,
        entity_id,
        old_values,
        new_values
    ) VALUES (
        auth.uid(),
        action_type,
        table_name,
        entity_id,
        old_data,
        new_data
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply activity logging to key tables
CREATE TRIGGER trigger_log_activity_profiles
    AFTER INSERT OR UPDATE OR DELETE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER trigger_log_activity_clients
    AFTER INSERT OR UPDATE OR DELETE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER trigger_log_activity_projects
    AFTER INSERT OR UPDATE OR DELETE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER trigger_log_activity_time_entries
    AFTER INSERT OR UPDATE OR DELETE ON public.time_entries
    FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER trigger_log_activity_invoices
    AFTER INSERT OR UPDATE OR DELETE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.log_activity();

-- =====================================================
-- REPORTING FUNCTIONS
-- =====================================================

-- Function to generate time report data
CREATE OR REPLACE FUNCTION public.generate_time_report(
    report_type TEXT,
    start_date DATE,
    end_date DATE,
    project_ids UUID[] DEFAULT NULL,
    user_ids UUID[] DEFAULT NULL,
    client_ids UUID[] DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    CASE report_type
        WHEN 'time_summary' THEN
            SELECT json_build_object(
                'report_type', 'time_summary',
                'period', json_build_object('start_date', start_date, 'end_date', end_date),
                'summary', json_build_object(
                    'total_hours', COALESCE(SUM(te.duration_minutes) / 60.0, 0),
                    'billable_hours', COALESCE(SUM(CASE WHEN te.is_billable THEN te.duration_minutes ELSE 0 END) / 60.0, 0),
                    'total_entries', COUNT(te.id),
                    'unique_users', COUNT(DISTINCT te.user_id),
                    'unique_projects', COUNT(DISTINCT te.project_id)
                ),
                'by_user', json_agg(DISTINCT json_build_object(
                    'user_id', p.id,
                    'user_name', p.full_name,
                    'hours', user_stats.hours,
                    'entries', user_stats.entries
                )) FILTER (WHERE p.id IS NOT NULL),
                'by_project', json_agg(DISTINCT json_build_object(
                    'project_id', pr.id,
                    'project_name', pr.name,
                    'client_name', c.name,
                    'hours', project_stats.hours,
                    'entries', project_stats.entries
                )) FILTER (WHERE pr.id IS NOT NULL)
            ) INTO result
            FROM public.time_entries te
            JOIN public.profiles p ON te.user_id = p.id
            JOIN public.projects pr ON te.project_id = pr.id
            JOIN public.clients c ON pr.client_id = c.id
            LEFT JOIN (
                SELECT user_id, 
                       ROUND(SUM(duration_minutes) / 60.0, 2) as hours,
                       COUNT(*) as entries
                FROM public.time_entries
                WHERE DATE(start_time) BETWEEN start_date AND end_date
                GROUP BY user_id
            ) user_stats ON te.user_id = user_stats.user_id
            LEFT JOIN (
                SELECT project_id,
                       ROUND(SUM(duration_minutes) / 60.0, 2) as hours,
                       COUNT(*) as entries
                FROM public.time_entries
                WHERE DATE(start_time) BETWEEN start_date AND end_date
                GROUP BY project_id
            ) project_stats ON te.project_id = project_stats.project_id
            WHERE DATE(te.start_time) BETWEEN start_date AND end_date
            AND (project_ids IS NULL OR te.project_id = ANY(project_ids))
            AND (user_ids IS NULL OR te.user_id = ANY(user_ids))
            AND (client_ids IS NULL OR pr.client_id = ANY(client_ids));
            
        WHEN 'detailed' THEN
            SELECT json_build_object(
                'report_type', 'detailed',
                'period', json_build_object('start_date', start_date, 'end_date', end_date),
                'entries', json_agg(json_build_object(
                    'id', te.id,
                    'user_name', p.full_name,
                    'project_name', pr.name,
                    'client_name', c.name,
                    'task_name', t.name,
                    'description', te.description,
                    'start_time', te.start_time,
                    'end_time', te.end_time,
                    'duration_hours', ROUND(te.duration_minutes / 60.0, 2),
                    'is_billable', te.is_billable,
                    'hourly_rate', te.hourly_rate,
                    'tags', te.tags
                ) ORDER BY te.start_time DESC)
            ) INTO result
            FROM public.time_entries te
            JOIN public.profiles p ON te.user_id = p.id
            JOIN public.projects pr ON te.project_id = pr.id
            JOIN public.clients c ON pr.client_id = c.id
            LEFT JOIN public.tasks t ON te.task_id = t.id
            WHERE DATE(te.start_time) BETWEEN start_date AND end_date
            AND (project_ids IS NULL OR te.project_id = ANY(project_ids))
            AND (user_ids IS NULL OR te.user_id = ANY(user_ids))
            AND (client_ids IS NULL OR pr.client_id = ANY(client_ids));
            
        ELSE
            result := json_build_object('error', 'Invalid report type');
    END CASE;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get dashboard statistics
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
    is_admin_user BOOLEAN;
BEGIN
    -- Check if user is admin
    SELECT role = 'admin' INTO is_admin_user
    FROM public.profiles
    WHERE id = user_uuid;
    
    IF is_admin_user THEN
        -- Admin gets global stats
        SELECT json_build_object(
            'today', json_build_object(
                'hours', COALESCE(SUM(CASE WHEN DATE(te.start_time) = CURRENT_DATE THEN te.duration_minutes END) / 60.0, 0),
                'entries', COUNT(CASE WHEN DATE(te.start_time) = CURRENT_DATE THEN 1 END)
            ),
            'this_week', json_build_object(
                'hours', COALESCE(SUM(CASE WHEN te.start_time >= DATE_TRUNC('week', CURRENT_DATE) THEN te.duration_minutes END) / 60.0, 0),
                'entries', COUNT(CASE WHEN te.start_time >= DATE_TRUNC('week', CURRENT_DATE) THEN 1 END)
            ),
            'this_month', json_build_object(
                'hours', COALESCE(SUM(CASE WHEN te.start_time >= DATE_TRUNC('month', CURRENT_DATE) THEN te.duration_minutes END) / 60.0, 0),
                'entries', COUNT(CASE WHEN te.start_time >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END)
            ),
            'active_projects', (SELECT COUNT(*) FROM public.projects WHERE status = 'active'),
            'total_clients', (SELECT COUNT(*) FROM public.clients WHERE is_active = true),
            'team_members', (SELECT COUNT(*) FROM public.profiles WHERE is_active = true)
        ) INTO result
        FROM public.time_entries te;
    ELSE
        -- Regular user gets personal stats
        SELECT json_build_object(
            'today', json_build_object(
                'hours', COALESCE(SUM(CASE WHEN DATE(te.start_time) = CURRENT_DATE THEN te.duration_minutes END) / 60.0, 0),
                'entries', COUNT(CASE WHEN DATE(te.start_time) = CURRENT_DATE THEN 1 END)
            ),
            'this_week', json_build_object(
                'hours', COALESCE(SUM(CASE WHEN te.start_time >= DATE_TRUNC('week', CURRENT_DATE) THEN te.duration_minutes END) / 60.0, 0),
                'entries', COUNT(CASE WHEN te.start_time >= DATE_TRUNC('week', CURRENT_DATE) THEN 1 END)
            ),
            'this_month', json_build_object(
                'hours', COALESCE(SUM(CASE WHEN te.start_time >= DATE_TRUNC('month', CURRENT_DATE) THEN te.duration_minutes END) / 60.0, 0),
                'entries', COUNT(CASE WHEN te.start_time >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END)
            ),
            'my_projects', (
                SELECT COUNT(DISTINCT pm.project_id) 
                FROM public.project_members pm 
                JOIN public.projects p ON pm.project_id = p.id
                WHERE pm.user_id = user_uuid AND p.status = 'active'
            ),
            'pending_tasks', (
                SELECT COUNT(*) 
                FROM public.tasks t
                JOIN public.project_members pm ON t.project_id = pm.project_id
                WHERE pm.user_id = user_uuid AND t.status IN ('todo', 'in_progress')
            )
        ) INTO result
        FROM public.time_entries te
        WHERE te.user_id = user_uuid;
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CLEANUP FUNCTIONS
-- =====================================================

-- Function to archive old completed projects
CREATE OR REPLACE FUNCTION public.archive_old_projects(days_old INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    UPDATE public.projects 
    SET is_archived = true, updated_at = NOW()
    WHERE status = 'completed' 
    AND updated_at < (CURRENT_DATE - INTERVAL '1 day' * days_old)
    AND is_archived = false;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old activity logs
CREATE OR REPLACE FUNCTION public.cleanup_old_activity_logs(days_old INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.activity_log 
    WHERE created_at < (CURRENT_DATE - INTERVAL '1 day' * days_old);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SCHEDULED FUNCTIONS (to be called by cron jobs)
-- =====================================================

-- Function to send report reminders (placeholder for external service)
CREATE OR REPLACE FUNCTION public.process_scheduled_reports()
RETURNS INTEGER AS $$
DECLARE
    processed_count INTEGER;
BEGIN
    -- This would typically trigger external notifications
    -- For now, just count active scheduled reports
    SELECT COUNT(*) INTO processed_count
    FROM public.reports
    WHERE is_active = true 
    AND schedule != 'none';
    
    -- Log that reports were processed
    INSERT INTO public.activity_log (action, entity_type, new_values)
    VALUES ('system_task', 'reports', json_build_object('processed_count', processed_count));
    
    RETURN processed_count;
END;
$$ LANGUAGE plpgsql;

-- Success message
SELECT 'Advanced functions and triggers created successfully!' as message;
