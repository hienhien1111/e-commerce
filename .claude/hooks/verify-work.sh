#!/bin/bash
# Stop hook: Run full verification before Claude finishes
# Called when Claude is about to stop responding
#
# Exit 0 = success, Exit 2 = blocking error (Claude must fix)
#
# This hook ensures all tests pass and lint is clean before Claude stops.

set -e

echo "=== Running verification checks ==="

errors=0

cd "$CLAUDE_PROJECT_DIR"

# Check for uncommitted changes
if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  echo "Uncommitted changes:"
  git status --short
fi

# Run tests if vitest is configured
if [ -f "vitest.config.ts" ] || [ -f "vitest.config.js" ]; then
  echo ""
  echo "Running tests..."
  if ! bun run test:run 2>&1 | tail -20; then
    echo "ERROR: Tests failed"
    errors=$((errors + 1))
  fi
fi

# Run lint
echo ""
echo "Running lint..."
if ! bun run lint 2>&1 | tail -10; then
  echo "WARNING: Lint issues found"
fi

echo ""
echo "=== Verification complete ==="

if [ $errors -gt 0 ]; then
  echo "FAILED: $errors error(s) found"
  exit 2  # Block Claude from stopping
else
  echo "All checks passed"
  exit 0
fi
