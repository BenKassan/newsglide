#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Verifying database migrations..."
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI is not installed${NC}"
    echo "Please install it from: https://supabase.com/docs/guides/cli"
    exit 1
fi

# List all migrations
echo "📋 Migration files in supabase/migrations/:"
if [ -d "supabase/migrations" ]; then
    ls -la supabase/migrations/*.sql 2>/dev/null || echo "No migration files found"
else
    echo -e "${RED}❌ supabase/migrations directory not found${NC}"
    exit 1
fi

echo ""
echo "🔄 Checking migration status..."

# Check if Supabase project is linked
if ! supabase migration list 2>/dev/null; then
    echo -e "${YELLOW}⚠️  No Supabase project linked or not running locally${NC}"
    echo ""
    echo "To run migrations locally:"
    echo "1. Start Supabase: npx supabase start"
    echo "2. Run migrations: npx supabase migration up"
    echo ""
    echo "To check production migrations:"
    echo "1. Link to project: npx supabase link --project-ref your-project-ref"
    echo "2. Check status: npx supabase migration list --linked"
else
    echo -e "${GREEN}✓ Migration status retrieved${NC}"
fi

echo ""
echo "📊 Checking for personalization columns..."

# Check if the personalization migration exists
if [ -f "supabase/migrations/20250109_add_personalization_fields.sql" ]; then
    echo -e "${GREEN}✓ Personalization migration file exists${NC}"
    echo ""
    echo "Expected columns in user_preferences table:"
    echo "  - survey_responses (JSONB)"
    echo "  - interest_profile (JSONB)"
    echo "  - content_preferences (JSONB)"
    echo "  - onboarding_completed (BOOLEAN)"
    echo "  - liked_recommendations (TEXT[])"
    echo "  - recommendation_history (JSONB)"
else
    echo -e "${RED}❌ Personalization migration file not found!${NC}"
    echo "Expected at: supabase/migrations/20250109_add_personalization_fields.sql"
fi

echo ""
echo "💡 Next steps:"
echo "1. If migrations are pending, run: npx supabase migration up"
echo "2. Verify in Supabase dashboard that columns exist"
echo "3. Generate TypeScript types: npm run generate-types"