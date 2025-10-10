/**
 * Automated CORS Migration Script for Edge Functions
 *
 * This script automatically updates all edge functions to use
 * secure CORS configuration from the _shared utility.
 *
 * Usage:
 *   deno run --allow-read --allow-write scripts/migrate-cors.ts
 */

const FUNCTIONS_DIR = './supabase/functions';

const FUNCTIONS_TO_UPDATE = [
  'stripe-webhook',
  'create-checkout-session',
  'create-portal-session',
  'news-synthesis',
  'news-qa',
  'trending-topics',
  'generate-debate',
  'generate-topics',
  'generate-discover-topics',
  'generate-subtopics',
  'personalized-trending',
  'text-to-speech',
  'fix-subscription',
  'subscription-success',
  'seed-topic-cache',
  'check-webhook-config',
];

interface MigrationResult {
  function: string;
  success: boolean;
  message: string;
}

async function migrateFunction(functionName: string): Promise<MigrationResult> {
  const filePath = `${FUNCTIONS_DIR}/${functionName}/index.ts`;

  try {
    // Read file
    let content = await Deno.readTextFile(filePath);

    // Check if already migrated
    if (content.includes('getCorsHeaders')) {
      return {
        function: functionName,
        success: true,
        message: 'Already migrated',
      };
    }

    // Backup original
    await Deno.writeTextFile(`${filePath}.backup`, content);

    // Add imports after existing imports
    const importRegex = /(import[\s\S]*?from\s+['"][^'"]+['"];?\n)/g;
    const imports = content.match(importRegex) || [];
    const lastImportIndex = content.lastIndexOf(imports[imports.length - 1]) + imports[imports.length - 1].length;

    const newImports = `import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';\n`;

    content =
      content.slice(0, lastImportIndex) +
      newImports +
      content.slice(lastImportIndex);

    // Replace corsHeaders definition
    content = content.replace(
      /const corsHeaders = \{[\s\S]*?'Access-Control-Allow-Headers':[\s\S]*?\};/,
      '// CORS headers now managed by getCorsHeaders(req)'
    );

    // Replace OPTIONS handler
    content = content.replace(
      /if \(req\.method === 'OPTIONS'\) \{[\s\S]*?return new Response\(null, \{ headers: corsHeaders \}\);[\s\S]*?\}/,
      `if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }`
    );

    // Add corsHeaders = getCorsHeaders(req) after OPTIONS check
    content = content.replace(
      /(if \(req\.method === 'OPTIONS'\) \{[\s\S]*?\}\s*)/,
      `$1\n  const corsHeaders = getCorsHeaders(req);\n`
    );

    // Write updated file
    await Deno.writeTextFile(filePath, content);

    return {
      function: functionName,
      success: true,
      message: 'Successfully migrated',
    };
  } catch (error) {
    return {
      function: functionName,
      success: false,
      message: `Error: ${error.message}`,
    };
  }
}

async function main() {
  console.log('🔒 Starting CORS Migration...\n');

  const results: MigrationResult[] = [];

  for (const func of FUNCTIONS_TO_UPDATE) {
    const result = await migrateFunction(func);
    results.push(result);

    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.function}: ${result.message}`);
  }

  console.log('\n📊 Migration Summary:');
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  console.log(`  ✅ Successful: ${successful}`);
  console.log(`  ❌ Failed: ${failed}`);

  if (failed > 0) {
    console.log('\n⚠️  Some migrations failed. Check errors above.');
    console.log('   Backups are saved as .backup files.');
  } else {
    console.log('\n🎉 All functions migrated successfully!');
    console.log('\nNext steps:');
    console.log('  1. Review changes: git diff supabase/functions');
    console.log('  2. Test locally: npm run dev');
    console.log('  3. Deploy: npx supabase functions deploy --all');
  }
}

if (import.meta.main) {
  main();
}
