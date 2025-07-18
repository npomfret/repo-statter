#!/bin/bash

# Script to clean up the persistent test repository

PERSISTENT_REPO_PATH="${TMPDIR:-/tmp}/repo-statter-test-repo-persistent"

if [ -d "$PERSISTENT_REPO_PATH" ]; then
    echo "🧹 Removing persistent test repository at: $PERSISTENT_REPO_PATH"
    rm -rf "$PERSISTENT_REPO_PATH"
    echo "✅ Cleanup complete"
else
    echo "ℹ️  No persistent test repository found at: $PERSISTENT_REPO_PATH"
fi