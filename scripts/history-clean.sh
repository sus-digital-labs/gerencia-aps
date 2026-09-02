#!/usr/bin/env bash
# Initialize a clean public history in the current directory.

set -euo pipefail

echo "WARNING: This will destroy the local .git history and start fresh."
echo "Ensure backup.sh has been run."

# Remove existing git history
rm -rf .git

# Initialize fresh repository
git init
git checkout -b main

# Add all current files (which are already sanitized)
git add .

# Create the initial public commit
git commit -m "chore: initialize public SUS analytics platform"

echo "Clean history initialized successfully."
