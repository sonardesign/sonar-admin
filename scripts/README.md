# Migration Scripts

## Apply RBAC Migration

This script applies the RBAC migration to your Supabase database.

### Prerequisites

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up your `.env` file with Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

   **Where to find these:**
   - Go to your Supabase project dashboard
   - Navigate to: **Project Settings** > **API**
   - Copy **Project URL** → use for `VITE_SUPABASE_URL`
   - Copy **service_role key** → use for `SUPABASE_SERVICE_ROLE_KEY`
     - ⚠️ Keep this key secret! It bypasses Row Level Security

### Usage

```bash
node scripts/apply-migration.js
```

### What It Does

1. Reads the `005_rbac_system.sql` migration file
2. Connects to your Supabase database
3. Executes the SQL to:
   - Update role names (user → member)
   - Create project_manager_permissions table
   - Set up RLS policies
   - Create helper functions
4. Verifies the migration succeeded

### Troubleshooting

**Error: Missing Supabase credentials**
- Make sure your `.env` file exists and has the correct values

**Error: Permission denied**
- Make sure you're using the `service_role` key, not the `anon` key

**Error: SQL execution failed**
- The script will suggest using Supabase SQL Editor instead
- Go to your Supabase dashboard → SQL Editor
- Copy/paste the SQL from `005_rbac_system.sql`

### Alternative Methods

If the script doesn't work, you can:

1. **Use Supabase Dashboard** (Recommended)
   - Open: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
   - Click "New query"
   - Paste SQL from `supabase/migrations/005_rbac_system.sql`
   - Click "Run"

2. **Use psql** (If you have PostgreSQL client)
   ```bash
   psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" -f supabase/migrations/005_rbac_system.sql
   ```
   - Get connection string from Supabase dashboard → Project Settings → Database

3. **Use Supabase CLI** (If installed)
   ```bash
   supabase db push
   ```

