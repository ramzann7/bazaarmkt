#!/bin/bash

# Manual commit script - requires user review and approval
echo "🔍 Manual Commit Process"
echo "========================"

# Check if there are any changes to commit
if [ -z "$(git status --porcelain)" ]; then
    echo "✅ No changes to commit"
    exit 0
fi

echo "📋 Current changes:"
echo "=================="
git status --short

echo ""
echo "🔍 Detailed changes:"
echo "==================="
git diff --cached

echo ""
echo "❓ Do you want to commit these changes? (y/N)"
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    echo ""
    echo "📝 Enter commit message (or press Enter for default):"
    read -r commit_msg
    
    if [ -z "$commit_msg" ]; then
        TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
        commit_msg="Manual commit: Changes at $TIMESTAMP"
    fi
    
    echo "🔄 Staging all changes..."
    git add -A
    
    echo "📝 Creating commit..."
    git commit -m "$commit_msg"
    
    echo ""
    echo "❓ Do you want to push to GitHub? (y/N)"
    read -r push_response
    
    if [[ "$push_response" =~ ^[Yy]$ ]]; then
        echo "🚀 Pushing to GitHub..."
        git push origin main
        echo "✅ Successfully committed and pushed to GitHub!"
    else
        echo "✅ Committed locally. Use 'git push' when ready to push."
    fi
    
    echo "📅 Commit: $commit_msg"
else
    echo "❌ Commit cancelled by user"
    exit 1
fi
