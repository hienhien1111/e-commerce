#!/bin/bash
# Pre-tool hook: Block dangerous Supabase CLI commands from Bash
# Exit 0 = allow, Exit 2 = block
set -e

input=$(cat)
command=$(echo "$input" | jq -r '.tool_input.command // empty')

if [ -z "$command" ]; then
  exit 0
fi

# Block dangerous supabase CLI commands
if echo "$command" | grep -qE 'supabase\s+(db\s+push|db\s+reset|migration\s+repair)'; then
  echo "BLOCKED: Direct Supabase CLI mutations are not allowed."
  echo "Write migration files to supabase/migrations/ instead."
  exit 2
fi

exit 0
