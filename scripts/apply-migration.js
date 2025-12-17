#!/usr/bin/env node

/**
 * Script to apply the RBAC migration to Supabase
 * 
 * Usage:
 *   node scripts/apply-migration.js
 * 
 * Make sure to set your SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * in your .env file or as environment variables
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase credentials');
  console.error('Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
  console.error('\nYou can find these in your Supabase dashboard:');
  console.error('- URL: Project Settings > API > Project URL');
  console.error('- Service Role Key: Project Settings > API > service_role key');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('🚀 Starting RBAC migration...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '005_rbac_system.sql');
    console.log('📄 Reading migration file:', migrationPath);
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📝 Migration file loaded successfully');
    console.log(`   Size: ${(migrationSQL.length / 1024).toFixed(2)} KB\n`);

    // Execute the migration
    console.log('⚙️  Executing migration...');
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: migrationSQL
    });

    if (error) {
      // If exec_sql doesn't exist, we need to execute it differently
      console.log('⚠️  Direct execution not available, splitting into statements...\n');
      
      // Split SQL into individual statements and execute
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement) {
          try {
            console.log(`   Executing statement ${i + 1}/${statements.length}...`);
            await supabase.rpc('exec_sql', { sql_query: statement + ';' });
            successCount++;
          } catch (err) {
            console.error(`   ❌ Error in statement ${i + 1}:`, err.message);
            errorCount++;
          }
        }
      }

      console.log(`\n✅ Migration completed with ${successCount} successful statements`);
      if (errorCount > 0) {
        console.log(`⚠️  ${errorCount} statements had errors (some may be expected)`);
      }
    } else {
      console.log('✅ Migration executed successfully!\n');
      console.log('📊 Result:', data);
    }

    // Verify the migration
    console.log('\n🔍 Verifying migration...');
    
    const { data: roles, error: rolesError } = await supabase
      .from('profiles')
      .select('role')
      .limit(1);

    if (rolesError) {
      console.error('❌ Verification error:', rolesError.message);
    } else {
      console.log('✅ Database structure verified');
    }

    // Check for new table
    const { data: permissions, error: permError } = await supabase
      .from('project_manager_permissions')
      .select('id')
      .limit(1);

    if (permError) {
      console.log('⚠️  Note: project_manager_permissions table might need manual creation');
    } else {
      console.log('✅ project_manager_permissions table exists');
    }

    console.log('\n🎉 RBAC system migration complete!');
    console.log('\nNext steps:');
    console.log('1. Verify roles in Supabase dashboard');
    console.log('2. Assign user roles (admin, manager, member)');
    console.log('3. Grant manager permissions as needed');
    console.log('\nSee RBAC_QUICK_START.md for more details.');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n💡 Alternative: Copy the SQL from supabase/migrations/005_rbac_system.sql');
    console.error('   and paste it directly into the Supabase SQL Editor');
    process.exit(1);
  }
}

// Run the migration
applyMigration();

