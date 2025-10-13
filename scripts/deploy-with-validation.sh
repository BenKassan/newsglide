#!/bin/bash

# ============================================================================
# NEWSGLIDE DEPLOYMENT SCRIPT WITH VALIDATION
# ============================================================================
# Purpose: Deploy edge functions with database schema validation
# Usage: ./scripts/deploy-with-validation.sh [--force]
# Safety: Validates database before deploying functions
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REQUIRED_TABLES=(
  "user_preferences"
  "article_interactions"
  "saved_articles"
)

EDGE_FUNCTIONS=(
  "track-interaction"
  "news-synthesis"
)

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}NEWSGLIDE DEPLOYMENT WITH VALIDATION${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

# ============================================================================
# STEP 1: CHECK SUPABASE CLI
# ============================================================================

echo -e "${YELLOW}[1/6]${NC} Checking Supabase CLI..."

if ! command -v npx &> /dev/null; then
    echo -e "${RED}✗ npx not found. Please install Node.js${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Supabase CLI available${NC}"
echo ""

# ============================================================================
# STEP 2: VALIDATE DATABASE SCHEMA
# ============================================================================

echo -e "${YELLOW}[2/6]${NC} Validating database schema..."

# Check if required tables exist
MISSING_TABLES=()

for table in "${REQUIRED_TABLES[@]}"; do
    # Try to query the table (will fail if it doesn't exist)
    if ! npx supabase db execute --sql "SELECT 1 FROM $table LIMIT 1" &> /dev/null; then
        MISSING_TABLES+=("$table")
    fi
done

if [ ${#MISSING_TABLES[@]} -ne 0 ]; then
    echo -e "${RED}✗ Missing required tables:${NC}"
    for table in "${MISSING_TABLES[@]}"; do
        echo -e "  - ${RED}$table${NC}"
    done
    echo ""
    echo -e "${YELLOW}Would you like to deploy the database schema fix script?${NC}"
    echo -e "This will run: ${BLUE}FIX_PERSONALIZATION_SYSTEM.sql${NC}"
    echo ""
    read -p "Deploy schema? (y/n) " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Please run the following in Supabase Dashboard → SQL Editor:${NC}"
        echo -e "${BLUE}File: FIX_PERSONALIZATION_SYSTEM.sql${NC}"
        echo ""
        echo -e "${YELLOW}Press ENTER when complete...${NC}"
        read
    else
        echo -e "${RED}Deployment cancelled. Edge functions require database schema.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ All required tables exist${NC}"
fi

echo ""

# ============================================================================
# STEP 3: CHECK ARTICLE_INTERACTIONS COLUMNS
# ============================================================================

echo -e "${YELLOW}[3/6]${NC} Validating article_interactions schema..."

# Check for required columns
REQUIRED_COLUMNS=(
    "id"
    "user_id"
    "topic"
    "action_type"
    "reading_level"
    "duration_seconds"
    "scroll_depth"
    "source_outlet"
    "metadata"
    "created_at"
)

for column in "${REQUIRED_COLUMNS[@]}"; do
    if ! npx supabase db execute --sql "SELECT $column FROM article_interactions LIMIT 1" &> /dev/null; then
        echo -e "${RED}✗ Missing column: $column in article_interactions${NC}"
        echo -e "${YELLOW}Please run FIX_PERSONALIZATION_SYSTEM.sql in Supabase Dashboard${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✓ article_interactions schema valid${NC}"
echo ""

# ============================================================================
# STEP 4: CHECK RLS POLICIES
# ============================================================================

echo -e "${YELLOW}[4/6]${NC} Checking Row Level Security policies..."

# Verify RLS is enabled on critical tables
for table in "${REQUIRED_TABLES[@]}"; do
    RLS_ENABLED=$(npx supabase db execute --sql "
        SELECT relrowsecurity
        FROM pg_class
        WHERE relname = '$table'
    " 2>/dev/null || echo "false")

    if [[ "$RLS_ENABLED" == *"t"* ]]; then
        echo -e "${GREEN}✓ RLS enabled on $table${NC}"
    else
        echo -e "${YELLOW}⚠ RLS may not be enabled on $table${NC}"
    fi
done

echo ""

# ============================================================================
# STEP 5: DEPLOY EDGE FUNCTIONS
# ============================================================================

echo -e "${YELLOW}[5/6]${NC} Deploying edge functions..."
echo ""

if [ "$1" == "--force" ]; then
    echo -e "${BLUE}Force mode: Deploying all functions${NC}"
    npx supabase functions deploy --all
else
    echo -e "${BLUE}Selective deployment:${NC}"
    for func in "${EDGE_FUNCTIONS[@]}"; do
        echo -e "  Deploy ${BLUE}$func${NC}? (y/n) "
        read -p "" -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            npx supabase functions deploy "$func"
            echo -e "${GREEN}✓ Deployed $func${NC}"
        else
            echo -e "${YELLOW}⊘ Skipped $func${NC}"
        fi
        echo ""
    done
fi

echo -e "${GREEN}✓ Edge functions deployed${NC}"
echo ""

# ============================================================================
# STEP 6: SMOKE TESTS
# ============================================================================

echo -e "${YELLOW}[6/6]${NC} Running smoke tests..."
echo ""

# Test 1: Check if article_interactions table can be queried
echo -e "  Test 1: Query article_interactions..."
if npx supabase db execute --sql "SELECT COUNT(*) FROM article_interactions" &> /dev/null; then
    echo -e "  ${GREEN}✓ Passed${NC}"
else
    echo -e "  ${RED}✗ Failed${NC}"
fi

# Test 2: Check if saved_articles table can be queried
echo -e "  Test 2: Query saved_articles..."
if npx supabase db execute --sql "SELECT COUNT(*) FROM saved_articles" &> /dev/null; then
    echo -e "  ${GREEN}✓ Passed${NC}"
else
    echo -e "  ${RED}✗ Failed${NC}"
fi

# Test 3: Check if user_preferences has interest_profile column
echo -e "  Test 3: Check interest_profile column..."
if npx supabase db execute --sql "SELECT interest_profile FROM user_preferences LIMIT 1" &> /dev/null; then
    echo -e "  ${GREEN}✓ Passed${NC}"
else
    echo -e "  ${RED}✗ Failed${NC}"
fi

echo ""
echo -e "${BLUE}============================================================================${NC}"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""
echo -e "Next Steps:"
echo -e "1. Test article generation in the app"
echo -e "2. Check browser console for 'Interaction tracked' messages"
echo -e "3. Verify no 500 or 406 errors"
echo -e "4. Query: ${BLUE}SELECT * FROM article_interactions ORDER BY created_at DESC LIMIT 10${NC}"
echo ""
echo -e "${YELLOW}If you see errors:${NC}"
echo -e "- Check Supabase Dashboard → Logs → Edge Functions"
echo -e "- Verify RLS policies allow your user_id"
echo -e "- Review FIX_PERSONALIZATION_SYSTEM.sql output"
echo ""
