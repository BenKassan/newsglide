import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing environment variables');
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client with service role
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Read migration SQL
const migrationPath = join(__dirname, '../supabase/migrations/20251012_create_user_memories.sql');
const migrationSQL = readFileSync(migrationPath, 'utf8');

console.log('Applying user_memories migration...\n');

// Execute migration SQL
const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

if (error) {
  // If exec_sql doesn't exist, try direct SQL execution via REST API
  console.log('Trying alternative method...');

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify({ query: migrationSQL })
  });

  if (!response.ok) {
    console.error('Migration failed:', await response.text());
    process.exit(1);
  }

  console.log('✅ Migration applied successfully!');
} else {
  console.log('✅ Migration applied successfully!');
  console.log(data);
}

console.log('\nVerifying table creation...');

// Verify the table was created
const { data: tables, error: verifyError } = await supabase
  .from('user_memories')
  .select('id')
  .limit(0);

if (verifyError) {
  console.error('❌ Verification failed:', verifyError.message);
  process.exit(1);
}

console.log('✅ user_memories table verified and accessible!');
