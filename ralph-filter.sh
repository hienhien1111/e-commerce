#!/usr/bin/env bash
# Filters stream-json output from claude -p into readable updates
jq -r --unbuffered '
  if .type == "assistant" then
    (.message.content[]? |
      if .type == "text" then "> " + .text
      elif .type == "tool_use" then
        "[TOOL] " + .name + "(" + (
          if .name == "Read" then (.input.file_path // "")
          elif .name == "Write" then (.input.file_path // "")
          elif .name == "Edit" then (.input.file_path // "")
          elif .name == "Bash" then (.input.command // "" | split("\n") | .[0])
          elif .name == "Grep" then (.input.pattern // "")
          elif .name == "Glob" then (.input.pattern // "")
          else (.input | keys | join(", "))
          end
        ) + ")"
      else empty end)
  elif .type == "result" then
    "\n=== ITERATION COMPLETE ===\n"
  else empty end
' 2>/dev/null
