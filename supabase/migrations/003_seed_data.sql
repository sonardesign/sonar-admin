-- Seed Data for Time Tracking System
-- Description: Sample data for development and testing

-- =====================================================
-- SEED DATA FOR PROFILES
-- =====================================================

-- Note: In production, profiles will be created via Supabase Auth
-- These are sample UUIDs for development
INSERT INTO public.profiles (id, email, full_name, role, timezone, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'admin@sonaradmin.com', 'John Doe', 'admin', 'America/New_York', true),
('550e8400-e29b-41d4-a716-446655440001', 'manager@sonaradmin.com', 'Jane Smith', 'manager', 'America/Los_Angeles', true),
('550e8400-e29b-41d4-a716-446655440002', 'developer@sonaradmin.com', 'Mike Johnson', 'user', 'Europe/London', true),
('550e8400-e29b-41d4-a716-446655440003', 'designer@sonaradmin.com', 'Sarah Wilson', 'user', 'America/Chicago', true),
('550e8400-e29b-41d4-a716-446655440004', 'freelancer@sonaradmin.com', 'David Brown', 'user', 'Australia/Sydney', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SEED DATA FOR CLIENTS
-- =====================================================

INSERT INTO public.clients (id, name, email, contact_person, created_by) VALUES
('client-550e-8400-e29b-41d4a7164466', 'Acme Corporation', 'contact@acmecorp.com', 'Robert Johnson', '550e8400-e29b-41d4-a716-446655440000'),
('client-550e-8401-e29b-41d4a7164466', 'TechStart Inc.', 'hello@techstart.io', 'Emily Davis', '550e8400-e29b-41d4-a716-446655440001'),
('client-550e-8402-e29b-41d4a7164466', 'Global Solutions', 'info@globalsolutions.com', 'Michael Chen', '550e8400-e29b-41d4-a716-446655440000'),
('client-550e-8403-e29b-41d4a7164466', 'Digital Agency', 'projects@digitalagency.com', 'Lisa Rodriguez', '550e8400-e29b-41d4-a716-446655440001'),
('client-550e-8404-e29b-41d4a7164466', 'StartupXYZ', 'team@startupxyz.com', 'Alex Thompson', '550e8400-e29b-41d4-a716-446655440000')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SEED DATA FOR PROJECTS
-- =====================================================

INSERT INTO public.projects (id, client_id, name, description, color, hourly_rate, status, created_by) VALUES
('proj-550e-8400-e29b-41d4a7164466', 'client-550e-8400-e29b-41d4a7164466', 'Website Redesign', 'Complete redesign of corporate website with modern UI/UX', '#3b82f6', 120.00, 'active', '550e8400-e29b-41d4-a716-446655440000'),
('proj-550e-8401-e29b-41d4a7164466', 'client-550e-8400-e29b-41d4a7164466', 'Mobile App Development', 'Native iOS and Android app for customer engagement', '#22c55e', 150.00, 'active', '550e8400-e29b-41d4-a716-446655440001'),
('proj-550e-8402-e29b-41d4a7164466', 'client-550e-8401-e29b-41d4a7164466', 'API Integration', 'RESTful API integration with third-party services', '#f97316', 100.00, 'active', '550e8400-e29b-41d4-a716-446655440000'),
('proj-550e-8403-e29b-41d4a7164466', 'client-550e-8401-e29b-41d4a7164466', 'Database Migration', 'Migration from legacy system to modern cloud database', '#ef4444', 130.00, 'on_hold', '550e8400-e29b-41d4-a716-446655440001'),
('proj-550e-8404-e29b-41d4a7164466', 'client-550e-8402-e29b-41d4a7164466', 'Security Audit', 'Comprehensive security audit and penetration testing', '#8b5cf6', 180.00, 'active', '550e8400-e29b-41d4-a716-446655440000'),
('proj-550e-8405-e29b-41d4a7164466', 'client-550e-8403-e29b-41d4a7164466', 'Brand Identity', 'Complete brand identity design including logo and guidelines', '#ec4899', 90.00, 'completed', '550e8400-e29b-41d4-a716-446655440003'),
('proj-550e-8406-e29b-41d4a7164466', 'client-550e-8404-e29b-41d4a7164466', 'MVP Development', 'Minimum viable product development for startup launch', '#6b7280', 110.00, 'active', '550e8400-e29b-41d4-a716-446655440002')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SEED DATA FOR PROJECT MEMBERS
-- =====================================================

INSERT INTO public.project_members (project_id, user_id, role, hourly_rate, can_edit_project, can_view_reports, added_by) VALUES
-- Website Redesign team
('proj-550e-8400-e29b-41d4a7164466', '550e8400-e29b-41d4-a716-446655440000', 'owner', 120.00, true, true, '550e8400-e29b-41d4-a716-446655440000'),
('proj-550e-8400-e29b-41d4a7164466', '550e8400-e29b-41d4-a716-446655440002', 'member', 85.00, false, true, '550e8400-e29b-41d4-a716-446655440000'),
('proj-550e-8400-e29b-41d4a7164466', '550e8400-e29b-41d4-a716-446655440003', 'member', 75.00, false, true, '550e8400-e29b-41d4-a716-446655440000'),

-- Mobile App team
('proj-550e-8401-e29b-41d4a7164466', '550e8400-e29b-41d4-a716-446655440001', 'owner', 150.00, true, true, '550e8400-e29b-41d4-a716-446655440001'),
('proj-550e-8401-e29b-41d4a7164466', '550e8400-e29b-41d4-a716-446655440002', 'member', 95.00, false, true, '550e8400-e29b-41d4-a716-446655440001'),

-- API Integration
('proj-550e-8402-e29b-41d4a7164466', '550e8400-e29b-41d4-a716-446655440000', 'owner', 100.00, true, true, '550e8400-e29b-41d4-a716-446655440000'),
('proj-550e-8402-e29b-41d4a7164466', '550e8400-e29b-41d4-a716-446655440002', 'member', 85.00, false, true, '550e8400-e29b-41d4-a716-446655440000'),

-- Database Migration
('proj-550e-8403-e29b-41d4a7164466', '550e8400-e29b-41d4-a716-446655440001', 'owner', 130.00, true, true, '550e8400-e29b-41d4-a716-446655440001'),

-- Security Audit
('proj-550e-8404-e29b-41d4a7164466', '550e8400-e29b-41d4-a716-446655440000', 'owner', 180.00, true, true, '550e8400-e29b-41d4-a716-446655440000'),
('proj-550e-8404-e29b-41d4a7164466', '550e8400-e29b-41d4-a716-446655440004', 'member', 120.00, false, true, '550e8400-e29b-41d4-a716-446655440000'),

-- Brand Identity
('proj-550e-8405-e29b-41d4a7164466', '550e8400-e29b-41d4-a716-446655440003', 'owner', 90.00, true, true, '550e8400-e29b-41d4-a716-446655440003'),

-- MVP Development
('proj-550e-8406-e29b-41d4a7164466', '550e8400-e29b-41d4-a716-446655440002', 'owner', 110.00, true, true, '550e8400-e29b-41d4-a716-446655440002'),
('proj-550e-8406-e29b-41d4a7164466', '550e8400-e29b-41d4-a716-446655440003', 'member', 80.00, false, true, '550e8400-e29b-41d4-a716-446655440002')
ON CONFLICT (project_id, user_id) DO NOTHING;

-- =====================================================
-- SEED DATA FOR TASKS
-- =====================================================

INSERT INTO public.tasks (id, project_id, name, description, estimated_hours, status, priority, assigned_to, created_by) VALUES
-- Website Redesign tasks
('task-550e-8400-e29b-41d4a7164466', 'proj-550e-8400-e29b-41d4a7164466', 'Homepage Design', 'Design new homepage layout and components', 20.00, 'completed', 'high', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000'),
('task-550e-8401-e29b-41d4a7164466', 'proj-550e-8400-e29b-41d4a7164466', 'Frontend Development', 'Implement responsive frontend with React', 40.00, 'in_progress', 'high', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000'),
('task-550e-8402-e29b-41d4a7164466', 'proj-550e-8400-e29b-41d4a7164466', 'Content Migration', 'Migrate existing content to new structure', 15.00, 'todo', 'medium', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000'),

-- Mobile App tasks
('task-550e-8403-e29b-41d4a7164466', 'proj-550e-8401-e29b-41d4a7164466', 'User Authentication', 'Implement secure user login and registration', 25.00, 'completed', 'high', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001'),
('task-550e-8404-e29b-41d4a7164466', 'proj-550e-8401-e29b-41d4a7164466', 'Push Notifications', 'Set up Firebase push notification system', 18.00, 'in_progress', 'medium', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001'),

-- API Integration tasks
('task-550e-8405-e29b-41d4a7164466', 'proj-550e-8402-e29b-41d4a7164466', 'Payment Gateway', 'Integrate Stripe payment processing', 30.00, 'review', 'high', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000'),
('task-550e-8406-e29b-41d4a7164466', 'proj-550e-8402-e29b-41d4a7164466', 'Third-party APIs', 'Connect to external service APIs', 22.00, 'todo', 'medium', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SEED DATA FOR TIME ENTRIES
-- =====================================================

INSERT INTO public.time_entries (id, user_id, project_id, task_id, description, start_time, end_time, duration_minutes, is_billable, hourly_rate, tags) VALUES
-- Recent entries (last 30 days)
('time-550e-8400-e29b-41d4a7164466', '550e8400-e29b-41d4-a716-446655440003', 'proj-550e-8400-e29b-41d4a7164466', 'task-550e-8400-e29b-41d4a7164466', 'Working on homepage wireframes and mockups', 
 NOW() - INTERVAL '1 day' - INTERVAL '4 hours', NOW() - INTERVAL '1 day' - INTERVAL '1 hour', 180, true, 75.00, ARRAY['design', 'wireframes']),

('time-550e-8401-e29b-41d4a7164466', '550e8400-e29b-41d4-a716-446655440002', 'proj-550e-8400-e29b-41d4a7164466', 'task-550e-8401-e29b-41d4a7164466', 'Setting up React components and routing', 
 NOW() - INTERVAL '1 day' - INTERVAL '8 hours', NOW() - INTERVAL '1 day' - INTERVAL '4 hours', 240, true, 85.00, ARRAY['development', 'react']),

('time-550e-8402-e29b-41d4a7164466', '550e8400-e29b-41d4-a716-446655440002', 'proj-550e-8401-e29b-41d4a7164466', 'task-550e-8403-e29b-41d4a7164466', 'Implementing JWT authentication flow', 
 NOW() - INTERVAL '2 days' - INTERVAL '6 hours', NOW() - INTERVAL '2 days' - INTERVAL '2 hours', 240, true, 95.00, ARRAY['development', 'authentication']),

('time-550e-8403-e29b-41d4a7164466', '550e8400-e29b-41d4-a716-446655440002', 'proj-550e-8402-e29b-41d4a7164466', 'task-550e-8405-e29b-41d4a7164466', 'Stripe API integration and testing', 
 NOW() - INTERVAL '3 days' - INTERVAL '5 hours', NOW() - INTERVAL '3 days' - INTERVAL '2 hours', 180, true, 85.00, ARRAY['development', 'payment', 'api']),

('time-550e-8404-e29b-41d4a7164466', '550e8400-e29b-41d4-a716-446655440003', 'proj-550e-8405-e29b-41d4a7164466', NULL, 'Logo design iterations and client feedback', 
 NOW() - INTERVAL '4 days' - INTERVAL '3 hours', NOW() - INTERVAL '4 days' - INTERVAL '1 hour', 120, true, 90.00, ARRAY['design', 'branding', 'logo']),

('time-550e-8405-e29b-41d4a7164466', '550e8400-e29b-41d4-a716-446655440004', 'proj-550e-8404-e29b-41d4a7164466', NULL, 'Security vulnerability assessment', 
 NOW() - INTERVAL '5 days' - INTERVAL '6 hours', NOW() - INTERVAL '5 days' - INTERVAL '2 hours', 240, true, 120.00, ARRAY['security', 'audit', 'testing']),

('time-550e-8406-e29b-41d4a7164466', '550e8400-e29b-41d4-a716-446655440002', 'proj-550e-8406-e29b-41d4a7164466', NULL, 'MVP feature planning and architecture design', 
 NOW() - INTERVAL '6 days' - INTERVAL '4 hours', NOW() - INTERVAL '6 days' - INTERVAL '1 hour', 180, true, 110.00, ARRAY['planning', 'architecture']),

-- Older entries for reporting
('time-550e-8407-e29b-41d4a7164466', '550e8400-e29b-41d4-a716-446655440003', 'proj-550e-8400-e29b-41d4a7164466', 'task-550e-8400-e29b-41d4a7164466', 'Homepage design revisions', 
 NOW() - INTERVAL '10 days' - INTERVAL '5 hours', NOW() - INTERVAL '10 days' - INTERVAL '2 hours', 180, true, 75.00, ARRAY['design', 'revisions']),

('time-550e-8408-e29b-41d4a7164466', '550e8400-e29b-41d4-a716-446655440002', 'proj-550e-8401-e29b-41d4a7164466', 'task-550e-8404-e29b-41d4a7164466', 'Firebase setup and configuration', 
 NOW() - INTERVAL '12 days' - INTERVAL '3 hours', NOW() - INTERVAL '12 days' - INTERVAL '1 hour', 120, true, 95.00, ARRAY['development', 'firebase']),

('time-550e-8409-e29b-41d4a7164466', '550e8400-e29b-41d4-a716-446655440000', 'proj-550e-8404-e29b-41d4a7164466', NULL, 'Project planning and client meeting', 
 NOW() - INTERVAL '15 days' - INTERVAL '2 hours', NOW() - INTERVAL '15 days' - INTERVAL '1 hour', 60, true, 180.00, ARRAY['management', 'planning'])
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SEED DATA FOR INVOICES
-- =====================================================

INSERT INTO public.invoices (id, client_id, invoice_number, title, description, subtotal, tax_rate, tax_amount, total_amount, status, issue_date, due_date, created_by) VALUES
('inv-550e-8400-e29b-41d4a7164466', 'client-550e-8400-e29b-41d4a7164466', 'INV-2024-001', 'Website Redesign - Phase 1', 'Design and development work for homepage redesign', 2250.00, 8.5, 191.25, 2441.25, 'sent', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '15 days', '550e8400-e29b-41d4-a716-446655440000'),
('inv-550e-8401-e29b-41d4a7164466', 'client-550e-8401-e29b-41d4a7164466', 'INV-2024-002', 'API Integration Services', 'Payment gateway and third-party API integration', 1800.00, 8.5, 153.00, 1953.00, 'paid', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '15 days', '550e8400-e29b-41d4-a716-446655440000'),
('inv-550e-8402-e29b-41d4a7164466', 'client-550e-8403-e29b-41d4a7164466', 'INV-2024-003', 'Brand Identity Design', 'Logo design and brand guidelines', 1080.00, 8.5, 91.80, 1171.80, 'paid', CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE - INTERVAL '30 days', '550e8400-e29b-41d4-a716-446655440003')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SEED DATA FOR INVOICE LINE ITEMS
-- =====================================================

INSERT INTO public.invoice_line_items (id, invoice_id, time_entry_id, description, quantity, unit_price, total_price) VALUES
-- Invoice 1 line items
('line-550e-8400-e29b-41d4a7164466', 'inv-550e-8400-e29b-41d4a7164466', 'time-550e-8400-e29b-41d4a7164466', 'Homepage Design - Wireframes and Mockups', 3.00, 75.00, 225.00),
('line-550e-8401-e29b-41d4a7164466', 'inv-550e-8400-e29b-41d4a7164466', 'time-550e-8401-e29b-41d4a7164466', 'Frontend Development - React Setup', 4.00, 85.00, 340.00),
('line-550e-8402-e29b-41d4a7164466', 'inv-550e-8400-e29b-41d4a7164466', 'time-550e-8407-e29b-41d4a7164466', 'Design Revisions and Iterations', 3.00, 75.00, 225.00),
('line-550e-8403-e29b-41d4a7164466', 'inv-550e-8400-e29b-41d4a7164466', NULL, 'Project Management and Coordination', 10.00, 120.00, 1200.00),
('line-550e-8404-e29b-41d4a7164466', 'inv-550e-8400-e29b-41d4a7164466', NULL, 'Quality Assurance and Testing', 3.00, 85.00, 255.00),

-- Invoice 2 line items
('line-550e-8405-e29b-41d4a7164466', 'inv-550e-8401-e29b-41d4a7164466', 'time-550e-8403-e29b-41d4a7164466', 'Payment Gateway Integration', 3.00, 85.00, 255.00),
('line-550e-8406-e29b-41d4a7164466', 'inv-550e-8401-e29b-41d4a7164466', NULL, 'API Documentation and Testing', 8.00, 85.00, 680.00),
('line-550e-8407-e29b-41d4a7164466', 'inv-550e-8401-e29b-41d4a7164466', NULL, 'Third-party Service Configuration', 6.00, 85.00, 510.00),
('line-550e-8408-e29b-41d4a7164466', 'inv-550e-8401-e29b-41d4a7164466', NULL, 'Security Implementation and Review', 3.00, 118.33, 355.00),

-- Invoice 3 line items
('line-550e-8409-e29b-41d4a7164466', 'inv-550e-8402-e29b-41d4a7164466', 'time-550e-8404-e29b-41d4a7164466', 'Logo Design and Concepts', 2.00, 90.00, 180.00),
('line-550e-8410-e29b-41d4a7164466', 'inv-550e-8402-e29b-41d4a7164466', NULL, 'Brand Guidelines Creation', 6.00, 90.00, 540.00),
('line-550e-8411-e29b-41d4a7164466', 'inv-550e-8402-e29b-41d4a7164466', NULL, 'Color Palette and Typography', 4.00, 90.00, 360.00)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SEED DATA FOR REPORTS
-- =====================================================

INSERT INTO public.reports (id, name, description, type, filters, schedule, recipients, created_by) VALUES
('rep-550e-8400-e29b-41d4a7164466', 'Weekly Time Summary', 'Weekly summary of time entries by project', 'time_summary', 
 '{"period": "week", "group_by": "project"}', 'weekly', ARRAY['admin@sonaradmin.com'], '550e8400-e29b-41d4-a716-446655440000'),
('rep-550e-8401-e29b-41d4a7164466', 'Monthly Client Report', 'Monthly billable hours by client', 'client_summary', 
 '{"period": "month", "billable_only": true}', 'monthly', ARRAY['admin@sonaradmin.com', 'manager@sonaradmin.com'], '550e8400-e29b-41d4-a716-446655440001'),
('rep-550e-8402-e29b-41d4a7164466', 'Project Progress Report', 'Detailed project status and time tracking', 'project_summary', 
 '{"status": ["active", "on_hold"], "include_tasks": true}', 'none', ARRAY[], '550e8400-e29b-41d4-a716-446655440000')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- UPDATE SEQUENCES TO AVOID CONFLICTS
-- =====================================================

-- This ensures that any new records created will have IDs that don't conflict with our seed data
-- Note: Adjust these values based on your seed data count

-- Success message
SELECT 'Seed data inserted successfully!' as message,
       (SELECT COUNT(*) FROM public.profiles) as profiles_count,
       (SELECT COUNT(*) FROM public.clients) as clients_count,
       (SELECT COUNT(*) FROM public.projects) as projects_count,
       (SELECT COUNT(*) FROM public.project_members) as members_count,
       (SELECT COUNT(*) FROM public.tasks) as tasks_count,
       (SELECT COUNT(*) FROM public.time_entries) as time_entries_count,
       (SELECT COUNT(*) FROM public.invoices) as invoices_count,
       (SELECT COUNT(*) FROM public.invoice_line_items) as line_items_count,
       (SELECT COUNT(*) FROM public.reports) as reports_count;
