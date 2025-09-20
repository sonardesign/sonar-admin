# Supabase Setup Guide

This guide will help you connect your React time-tracking application to Supabase.

## Prerequisites

- A Supabase account (sign up at [supabase.com](https://supabase.com))
- Node.js and npm installed
- The Supabase CLI (optional but recommended)

## Step 1: Create a New Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Fill in your project details:
   - **Name**: `sonar-admin` (or your preferred name)
   - **Database Password**: Choose a strong password
   - **Region**: Choose the closest region to your users
5. Click "Create new project"
6. Wait for the project to be set up (this takes a few minutes)

## Step 2: Get Your Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (something like `https://xyzcompany.supabase.co`)
   - **Anon public key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

## Step 3: Configure Environment Variables

1. Create a `.env.local` file in your project root:

```bash
# Create the environment file
touch .env.local
```

2. Add your Supabase credentials to `.env.local`:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important**: Replace the placeholder values with your actual Supabase project URL and anon key.

## Step 4: Run Database Migrations

You have two options to set up your database schema:

### Option A: Using Supabase Dashboard (Recommended for beginners)

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of each migration file in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql` 
   - `supabase/migrations/003_seed_data.sql` (optional - for sample data)
   - `supabase/migrations/004_functions_and_triggers.sql`
4. Click "Run" for each migration

### Option B: Using Supabase CLI (Recommended for developers)

1. Install the Supabase CLI:
```bash
npm install -g supabase
```

2. Login to Supabase:
```bash
supabase login
```

3. Link your project:
```bash
supabase link --project-ref your-project-id
```

4. Push the migrations:
```bash
supabase db push
```

## Step 5: Configure Authentication

1. In your Supabase dashboard, go to **Authentication** → **Settings**
2. Configure the following settings:

### Site URL
- Set your site URL to `http://localhost:5173` for development
- For production, use your actual domain

### Auth Providers
- **Email**: Enable email authentication
- **Confirm email**: Enable email confirmation (recommended)

### Email Templates (Optional)
- Customize the email templates for signup confirmation and password reset

## Step 6: Test the Connection

1. Start your development server:
```bash
npm run dev
```

2. Open your browser to `http://localhost:5173`
3. You should see the authentication page
4. Try creating a new account - you should receive a confirmation email
5. After confirming your email, you should be able to sign in and access the application

## Step 7: Set Up Row Level Security (RLS)

The migrations automatically enable RLS, but verify it's working:

1. Go to **Authentication** → **Policies** in your Supabase dashboard
2. You should see policies for all tables (profiles, clients, projects, etc.)
3. Test by creating a user and ensuring they can only see their own data

## Troubleshooting

### Common Issues

1. **"Invalid JWT" errors**
   - Check that your `VITE_SUPABASE_ANON_KEY` is correct
   - Make sure there are no extra spaces or characters

2. **Database connection errors**
   - Verify your `VITE_SUPABASE_URL` is correct
   - Check that your project is active in the Supabase dashboard

3. **Authentication not working**
   - Ensure email confirmation is set up correctly
   - Check the browser console for detailed error messages
   - Verify RLS policies are not blocking legitimate requests

4. **Environment variables not loading**
   - Restart your development server after creating `.env.local`
   - Make sure the file is in the project root (same level as `package.json`)
   - Ensure variables start with `VITE_` for Vite to pick them up

### Getting Help

- Check the [Supabase documentation](https://supabase.com/docs)
- Visit the [Supabase community](https://github.com/supabase/supabase/discussions)
- Review the console logs for detailed error messages

## Production Deployment

For production deployment:

1. Update your environment variables with production values
2. Set the correct Site URL in Supabase Auth settings
3. Consider using Supabase's built-in hosting or deploy to Vercel/Netlify
4. Set up proper backup and monitoring
5. Review and adjust RLS policies for your security requirements

## Database Schema Overview

Your database includes the following main tables:

- **profiles** - User profiles (extends Supabase auth.users)
- **clients** - Client/customer information
- **projects** - Projects belonging to clients
- **project_members** - Many-to-many relationship between users and projects
- **tasks** - Optional task breakdown within projects
- **time_entries** - Individual time tracking entries
- **invoices** - Client invoices
- **reports** - Saved and scheduled reports
- **activity_log** - Audit trail for all system changes

All tables have Row Level Security enabled to ensure users can only access authorized data.

## Next Steps

Once your Supabase connection is working:

1. Customize the user profile fields as needed
2. Set up email templates for your brand
3. Configure additional authentication providers if needed
4. Set up database backups
5. Consider implementing real-time subscriptions for live updates
6. Add monitoring and analytics

Your time tracking application is now connected to Supabase and ready for use!
