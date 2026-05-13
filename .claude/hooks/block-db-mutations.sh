#!/bin/bash
# Pre-tool hook: Block mutation SQL via Supabase MCP tools
# Exit 0 = allow (SELECT), Exit 2 = block (mutations)
set -e

input=$(cat)

# Extract SQL from various possible field names
sql=$(echo "$input" | jq -r '.tool_input.sql // .tool_input.query // .tool_input.statement // empty')

if [ -z "$sql" ]; then
  # No SQL found — might be a non-SQL tool like list_tables. Allow.
  exit 0
fi

# Block mutation keywords (case-insensitive)
if echo "$sql" | grep -iqE '^\s*(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE)'; then
  echo "BLOCKED: SQL mutations are not allowed via MCP tools."
  echo "Write migration files to supabase/migrations/ instead."
  exit 2
fi

# Allow SELECT and other read-only queries
exit 0
