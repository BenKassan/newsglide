#!/bin/bash

# Quick test script for AI improvements
# Run this after starting Supabase to quickly test changes

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the anon key from supabase status
ANON_KEY=$(supabase status | grep "anon key" | awk '{print $NF}')

if [ -z "$ANON_KEY" ]; then
    echo "❌ Supabase not running. Start it with: supabase start"
    exit 1
fi

echo -e "${GREEN}✅ Found Supabase anon key${NC}"
echo ""

# Function to test news synthesis
test_news() {
    local topic="$1"
    echo -e "${YELLOW}🔍 Testing news synthesis for: $topic${NC}"
    
    response=$(curl -s -X POST http://localhost:54321/functions/v1/news-synthesis \
        -H "Authorization: Bearer $ANON_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"topic\": \"$topic\"}")
    
    # Extract and display key parts
    echo "$response" | jq -r '.output[0].content[0].text' | jq -r '.headline'
    echo ""
    echo "📝 Article preview:"
    echo "$response" | jq -r '.output[0].content[0].text' | jq -r '.article.base' | head -n 10
    echo "..."
    echo ""
    
    # Check for AI phrases
    article=$(echo "$response" | jq -r '.output[0].content[0].text' | jq -r '.article.base')
    
    if echo "$article" | grep -qi "furthermore\|moreover\|it's important to note"; then
        echo "⚠️  Found AI phrases!"
    else
        echo "✅ No common AI phrases detected!"
    fi
    echo ""
}

# Function to test Q&A
test_qa() {
    local question="$1"
    echo -e "${YELLOW}💬 Testing Q&A: $question${NC}"
    
    response=$(curl -s -X POST http://localhost:54321/functions/v1/news-qa \
        -H "Authorization: Bearer $ANON_KEY" \
        -H "Content-Type: application/json" \
        -d "{
            \"topic\": \"Technology\",
            \"question\": \"$question\",
            \"context\": {
                \"headline\": \"Tech News Update\",
                \"summaryPoints\": [\"AI advances\", \"New regulations\", \"Market growth\"],
                \"sources\": []
            }
        }")
    
    answer=$(echo "$response" | jq -r '.answer')
    echo "$answer"
    
    if echo "$answer" | grep -q "^Certainly!\|^Indeed!"; then
        echo "⚠️  Starts with robotic phrase"
    else
        echo "✅ Natural response style!"
    fi
    echo ""
}

# Main menu
echo "🚀 Quick AI Test Menu"
echo "===================="
echo "1) Test news synthesis"
echo "2) Test Q&A"
echo "3) Test both"
echo "4) Custom topic"
echo ""

read -p "Choose option (1-4): " choice

case $choice in
    1)
        test_news "OpenAI GPT-5 development"
        ;;
    2)
        test_qa "What are the main concerns about AI?"
        ;;
    3)
        test_news "AI regulation debate"
        test_qa "What are the key points?"
        ;;
    4)
        read -p "Enter topic: " custom_topic
        test_news "$custom_topic"
        ;;
    *)
        echo "Invalid choice"
        ;;
esac