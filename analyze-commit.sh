#!/bin/bash

# Script to analyze commit 67efd87 and generate detailed documentation

echo "# Detailed Commit Analysis for 67efd87" > COMMIT_ANALYSIS.md
echo "" >> COMMIT_ANALYSIS.md
echo "## Summary" >> COMMIT_ANALYSIS.md
git show 67efd87 --format="%B" -s >> COMMIT_ANALYSIS.md
echo "" >> COMMIT_ANALYSIS.md

echo "## File Changes Overview" >> COMMIT_ANALYSIS.md
echo "\`\`\`" >> COMMIT_ANALYSIS.md
git show 67efd87 --stat >> COMMIT_ANALYSIS.md
echo "\`\`\`" >> COMMIT_ANALYSIS.md
echo "" >> COMMIT_ANALYSIS.md

echo "## File-by-File Analysis" >> COMMIT_ANALYSIS.md
echo "" >> COMMIT_ANALYSIS.md

# Get list of changed files
git show 67efd87 --name-only --format="" | while read -r file; do
    if [ ! -z "$file" ]; then
        echo "### $file" >> COMMIT_ANALYSIS.md
        echo "" >> COMMIT_ANALYSIS.md
        
        # Show what type of change
        status=$(git show 67efd87 --name-status --format="" | grep "^[AMD]\s*$file" | cut -f1)
        case $status in
            A) echo "**Status**: New file added" >> COMMIT_ANALYSIS.md ;;
            M) echo "**Status**: Modified" >> COMMIT_ANALYSIS.md ;;
            D) echo "**Status**: Deleted" >> COMMIT_ANALYSIS.md ;;
        esac
        echo "" >> COMMIT_ANALYSIS.md
        
        # For text files, show the diff (limit to first 50 lines to keep it manageable)
        if [[ "$file" =~ \.(ts|tsx|js|jsx|json|md|css|html)$ ]]; then
            echo "<details>" >> COMMIT_ANALYSIS.md
            echo "<summary>View changes</summary>" >> COMMIT_ANALYSIS.md
            echo "" >> COMMIT_ANALYSIS.md
            echo "\`\`\`diff" >> COMMIT_ANALYSIS.md
            git show 67efd87 -- "$file" | head -50 >> COMMIT_ANALYSIS.md
            echo "\`\`\`" >> COMMIT_ANALYSIS.md
            echo "</details>" >> COMMIT_ANALYSIS.md
        fi
        echo "" >> COMMIT_ANALYSIS.md
    fi
done

echo "Analysis complete! Check COMMIT_ANALYSIS.md"