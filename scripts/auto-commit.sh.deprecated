#!/bin/bash

# Auto-commit and push script
echo "🔄 Staging all changes..."
git add -A

echo "📝 Creating commit..."
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
COMMIT_MSG="Update: Changes made at $TIMESTAMP"

git commit -m "$COMMIT_MSG"

echo "🚀 Pushing to GitHub..."
git push origin main

echo "✅ Successfully committed and pushed to GitHub!"
echo "📅 Commit: $COMMIT_MSG"
