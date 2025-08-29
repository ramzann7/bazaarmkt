#!/bin/bash

# File watcher script for auto-commit
echo "👀 Watching for file changes..."

# Function to commit and push
commit_and_push() {
    echo "🔄 Changes detected! Committing..."
    git add -A
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    COMMIT_MSG="Auto-commit: Changes at $TIMESTAMP"
    git commit -m "$COMMIT_MSG"
    git push origin main
    echo "✅ Pushed to GitHub at $TIMESTAMP"
}

# Watch for changes in key directories
fswatch -o frontend/src backend/src | while read f; do
    commit_and_push
done
