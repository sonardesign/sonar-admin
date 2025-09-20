# Supabase Time Tracking System Database Schema

This directory contains the complete database schema for the Time Tracking System built with Supabase.

## Overview

The database is designed to support a comprehensive time tracking application with the following key features:

- **Multi-tenant Architecture**: Users, clients, projects, and time tracking
- **Project Management**: Tasks, team collaboration, and progress tracking
- **Invoicing System**: Generate and manage client invoices
- **Reporting**: Flexible reporting system with scheduled reports
- **Security**: Row Level Security (RLS) policies for data protection
- **Audit Trail**: Complete activity logging for compliance

## Schema Structure

### Core Tables

#### 1. Authentication & Users
- **`profiles`** - Extends Supabase auth.users with additional profile information
  - Links to `auth.users(id)` as primary key
  - Includes role-based access control (admin, manager, user)
  - Timezone and formatting preferences

#### 2. Client Management
- **`clients`** - Client/customer information
  - Contact details, billing information
  - Soft delete with `is_active` flag
  - Tracks who created each client

#### 3. Project Structure
- **`projects`** - Main project entities
  - Belongs to clients (foreign key relationship)
  - Status tracking (active, on_hold, completed, cancelled)
  - Budget and hourly rate management
  - Archiving capability

- **`project_members`** - Many-to-many relationship between users and projects
  - Role-based permissions within projects
  - Individual hourly rates per member
  - Access control flags

- **`tasks`** - Optional task breakdown within projects
  - Assignment to team members
  - Progress tracking and estimation
  - Priority and status management

#### 4. Time Tracking
- **`time_entries`** - Core time tracking records
  - Links to users, projects, and optionally tasks
  - Start/end times with automatic duration calculation
  - Billable/non-billable categorization
  - Tagging system for categorization

- **`time_entry_approvals`** - Approval workflow for time entries
  - Manager approval process
  - Status tracking (pending, approved, rejected)
  - Audit trail for approvals

#### 5. Invoicing
- **`invoices`** - Client invoices
  - Links to clients
  - Tax calculation and discount handling
  - Status tracking (draft, sent, paid, overdue)
  - Automatic invoice numbering

- **`invoice_line_items`** - Individual line items within invoices
  - Can link to specific time entries
  - Flexible pricing structure
  - Automatic total calculations

#### 6. Reporting & Analytics
- **`reports`** - Saved and scheduled reports
  - Configurable filters and parameters
  - Email scheduling capabilities
  - Report type categorization

- **`activity_log`** - Complete audit trail
  - Tracks all CRUD operations
  - Stores old and new values
  - User attribution and timestamps

## Migration Files

### `001_initial_schema.sql`
- Creates all tables with proper relationships
- Defines constraints and data validation
- Sets up indexes for optimal performance
- Creates views for common queries
- Implements triggers for automatic timestamp updates
- Adds business logic functions (duration calculation, invoice totals)

### `002_rls_policies.sql`
- Enables Row Level Security on all tables
- Creates helper functions for permission checking
- Implements comprehensive security policies
- Ensures users can only access authorized data
- Provides admin and manager override capabilities

### `003_seed_data.sql`
- Provides sample data for development and testing
- Creates realistic scenarios with multiple users, clients, and projects
- Includes time entries spanning different date ranges
- Sample invoices with line items
- Pre-configured reports and activity logs

### `004_functions_and_triggers.sql`
- Advanced business logic functions
- Automatic task completion based on time logged
- Time entry overlap prevention
- Comprehensive activity logging
- Reporting and analytics functions
- Cleanup and maintenance procedures

## Key Features

### Security Model
- **Row Level Security (RLS)** enabled on all tables
- **Role-based access control** (admin, manager, user)
- **Project-based permissions** for team collaboration
- **Data isolation** ensures users only see authorized data

### Data Integrity
- **Foreign key constraints** maintain referential integrity
- **Check constraints** validate data formats and ranges
- **Triggers** automatically calculate derived values
- **Overlap prevention** for time entries
- **Audit trail** for all changes

### Performance Optimization
- **Strategic indexes** on frequently queried columns
- **Materialized views** for complex reporting queries
- **Efficient pagination** support
- **Query optimization** for time-based filtering

### Business Logic
- **Automatic duration calculation** for time entries
- **Invoice total calculations** with tax and discounts
- **Task completion tracking** based on logged time
- **Project statistics** and progress monitoring

## Views

### `time_entries_detailed`
Combines time entries with project, client, and user information for easy reporting.

### `projects_summary`
Provides project statistics including total hours, team size, and completion metrics.

### `user_time_summary`
Aggregates user time data with billable/non-billable breakdowns.

## Functions

### Utility Functions
- `generate_invoice_number()` - Creates sequential invoice numbers
- `get_project_stats(uuid)` - Returns comprehensive project statistics
- `get_user_time_summary(uuid, date, date)` - User time analysis
- `check_time_entry_overlap()` - Validates time entry conflicts

### Reporting Functions
- `generate_time_report()` - Flexible report generation
- `get_dashboard_stats(uuid)` - Dashboard metrics
- `process_scheduled_reports()` - Automated report processing

### Maintenance Functions
- `archive_old_projects(integer)` - Cleanup completed projects
- `cleanup_old_activity_logs(integer)` - Remove old audit records

## Usage

### Running Migrations
1. Set up your Supabase project
2. Run migrations in order:
   ```sql
   -- Run each migration file in sequence
   \i 001_initial_schema.sql
   \i 002_rls_policies.sql
   \i 003_seed_data.sql
   \i 004_functions_and_triggers.sql
   ```

### Development Setup
1. Use the seed data for development and testing
2. The sample data includes realistic scenarios
3. Test different user roles and permissions
4. Verify RLS policies are working correctly

### Production Deployment
1. Run only `001_initial_schema.sql` and `002_rls_policies.sql`
2. Skip seed data in production
3. Set up proper backup and monitoring
4. Configure scheduled maintenance functions

## API Integration

### Supabase Client Configuration
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'your-supabase-url',
  'your-supabase-anon-key'
)
```

### Example Queries
```typescript
// Get user's projects
const { data: projects } = await supabase
  .from('projects_summary')
  .select('*')
  .eq('member_id', userId)

// Create time entry
const { data: timeEntry } = await supabase
  .from('time_entries')
  .insert({
    user_id: userId,
    project_id: projectId,
    start_time: new Date().toISOString(),
    description: 'Working on feature X'
  })

// Get project statistics
const { data: stats } = await supabase
  .rpc('get_project_stats', { project_uuid: projectId })
```

## Maintenance

### Regular Tasks
- **Weekly**: Review activity logs for unusual patterns
- **Monthly**: Archive completed projects older than 90 days
- **Quarterly**: Clean up old activity logs (retain 1 year)
- **Annually**: Review and optimize indexes

### Monitoring
- Track database size and growth
- Monitor query performance
- Review RLS policy effectiveness
- Audit user access patterns

## Security Considerations

### Data Protection
- All sensitive data is protected by RLS
- User passwords are handled by Supabase Auth
- Activity logging provides complete audit trail
- Data encryption at rest and in transit

### Access Control
- Principle of least privilege
- Role-based permissions
- Project-based data isolation
- Admin override capabilities for management

### Compliance
- Complete audit trail for all changes
- Data retention policies
- User activity monitoring
- Secure data export capabilities

## Support

For questions about the database schema:
1. Review this documentation
2. Check the inline SQL comments
3. Test with the provided seed data
4. Consult Supabase documentation for platform-specific features

## Version History

- **v1.0** - Initial schema with core functionality
- **v1.1** - Added RLS policies and security model
- **v1.2** - Enhanced with business logic functions
- **v1.3** - Added reporting and analytics features
