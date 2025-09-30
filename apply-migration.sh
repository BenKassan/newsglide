#!/bin/bash

# Script to apply AI Chat database migration
# This opens your Supabase SQL editor with instructions

echo "🚀 Opening Supabase SQL Editor..."
echo ""
echo "📋 Instructions:"
echo "1. Copy the contents of: supabase/migrations/20250930_create_ai_assistant_schema.sql"
echo "2. Paste it into the SQL editor"
echo "3. Click 'Run' to execute the migration"
echo ""
echo "Opening dashboard in 3 seconds..."
sleep 3

open "https://supabase.com/dashboard/project/icwusduvaohosrvxlahh/sql/new"

echo ""
echo "✅ Migration file location:"
echo "   $(pwd)/supabase/migrations/20250930_create_ai_assistant_schema.sql"
echo ""
echo "💡 Tip: You can also copy the file to clipboard with:"
echo "   cat supabase/migrations/20250930_create_ai_assistant_schema.sql | pbcopy"
