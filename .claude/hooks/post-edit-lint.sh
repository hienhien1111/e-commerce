#!/bin/bash
# Post-edit hook: Run ESLint on changed files (fast feedback)
# Exit 0 = success (non-blocking), Exit 2 = blocking error
#
# This hook runs after every Edit/Write operation on JS/TS files.
# It provides immediate linting feedback without blocking Claude.

set -e

# Read tool input from stdin (JSON with file_path)
input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

# Skip if no file path or not a JS/TS file
if [ -z "$file_path" ] || ! echo "$file_path" | grep -qE '\.(ts|tsx|js|jsx)$'; then
  exit 0
fi

# Change to project directory
cd "$CLAUDE_PROJECT_DIR" || exit 0

# Run ESLint on the specific file (suppress errors for missing files)
if [ -f "$file_path" ]; then
  echo "Linting: $file_path"
  bun run lint -- "$file_path" 2>&1 | head -30 || true
fi

# Don't block on lint errors - just show them
exit 0
