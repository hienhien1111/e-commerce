#!/usr/bin/env bash
# Ralph loop — autonomous build/bugfix agent
# Exits on: ALL_TASKS_COMPLETE, BLOCKED, or max iterations
# Usage: ./ralph.sh [--mode=build|bugfix]
set -uo pipefail

# --- Mode ---
MODE=${MODE:-build}
for arg in "$@"; do
  case "$arg" in
    --mode=*) MODE="${arg#*=}" ;;
  esac
done

if [[ "$MODE" != "build" && "$MODE" != "bugfix" ]]; then
  echo "ERROR: Unknown mode '$MODE'. Use --mode=build or --mode=bugfix."
  exit 1
fi

# --- Configuration (mode-specific defaults) ---
if [[ "$MODE" == "bugfix" ]]; then
  MAX_ITERATIONS=${MAX_ITERATIONS:-3}
  MAX_STALLS=${MAX_STALLS:-1}
  PROMPT_FILE="PROMPT_bugfix.md"
else
  MAX_ITERATIONS=${MAX_ITERATIONS:-50}
  MAX_STALLS=${MAX_STALLS:-3}
  PROMPT_FILE="PROMPT_build.md"
fi
MODEL=${MODEL:-sonnet}
MAX_TURNS=${MAX_TURNS:-30}
COOLDOWN=${COOLDOWN:-5}

# --- Logging ---
mkdir -p logs
LOGFILE="logs/ralph-$(date '+%Y%m%d-%H%M%S').log"
DONE_FLAG=$(mktemp)
BLOCKED_FLAG=$(mktemp)
rm -f "$DONE_FLAG" "$BLOCKED_FLAG"

# --- Pre-flight checks ---
preflight_ok=true

if [[ ! -f "$PROMPT_FILE" ]]; then
  echo "ERROR: $PROMPT_FILE not found. Run /kickoff, /prd, or /bugfix first."
  preflight_ok=false
fi

if [[ -f "$PROMPT_FILE" ]]; then
  # Extract active feature directory from prompt file
  active_feature=$(grep -o 'features/[^/]*/' "$PROMPT_FILE" | head -1)
  if [[ -z "$active_feature" ]]; then
    echo "ERROR: No active feature found in $PROMPT_FILE."
    preflight_ok=false
  elif [[ ! -f "${active_feature}PRD.md" ]]; then
    echo "ERROR: ${active_feature}PRD.md not found. Run /kickoff or /prd first."
    preflight_ok=false
  fi
fi

if [[ -f "BLOCKER.md" ]]; then
  echo "WARNING: BLOCKER.md exists. Ralph was previously blocked:"
  cat BLOCKER.md
  echo ""
  echo "Remove BLOCKER.md to continue, or fix the issue first."
  preflight_ok=false
fi

if [[ "$preflight_ok" != "true" ]]; then
  echo "Pre-flight checks failed. Fix the issues above and try again."
  exit 1
fi

# --- Dev server ---
DEV_SERVER_PID=""
DEV_PORT=${PORT:-0}

if [[ "$DEV_PORT" -eq 0 ]]; then
  DEV_PORT=3000
fi

DEV_URL="http://localhost:$DEV_PORT"

# Only start dev server if package.json exists (project has been initialized)
if [[ -f "package.json" ]]; then
  if ! lsof -iTCP:$DEV_PORT -sTCP:LISTEN -t &>/dev/null; then
    echo "Starting dev server on port $DEV_PORT..."
    bun run dev -- -p "$DEV_PORT" &>/dev/null &
    DEV_SERVER_PID=$!
    for i in {1..30}; do
      if lsof -iTCP:$DEV_PORT -sTCP:LISTEN -t &>/dev/null; then
        echo "Dev server ready on port $DEV_PORT (PID $DEV_SERVER_PID)"
        break
      fi
      sleep 1
    done
    if ! lsof -iTCP:$DEV_PORT -sTCP:LISTEN -t &>/dev/null; then
      echo "WARNING: Dev server failed to start. Browser verification will be skipped."
      kill "$DEV_SERVER_PID" 2>/dev/null
      DEV_SERVER_PID=""
    fi
  else
    echo "Dev server already running on port $DEV_PORT"
  fi
else
  echo "No package.json found — skipping dev server. Ralph will init the project first."
fi

cleanup() {
  rm -f "$DONE_FLAG" "$BLOCKED_FLAG"
  if [[ -n "$DEV_SERVER_PID" ]]; then
    echo "Stopping dev server (PID $DEV_SERVER_PID)..."
    kill "$DEV_SERVER_PID" 2>/dev/null
    wait "$DEV_SERVER_PID" 2>/dev/null
  fi
}
trap cleanup EXIT

# --- Progress tracking ---
count_done_tasks() {
  local n
  n=$(grep -c '\[x\]' "${active_feature}PRD.md" 2>/dev/null) || true
  echo "${n:-0}"
}
count_total_tasks() {
  local n
  n=$(grep -c '^\- \[' "${active_feature}PRD.md" 2>/dev/null) || true
  echo "${n:-0}"
}

echo "Starting Ralph loop. Ctrl+C to stop."
echo "Logging to: $LOGFILE"
echo "Mode: $MODE | Model: $MODEL | Max turns: $MAX_TURNS | Max iterations: $MAX_ITERATIONS | Dev: $DEV_URL"
total_tasks=$(count_total_tasks)
tasks_done=$(count_done_tasks)
echo "Tasks: $tasks_done/$total_tasks complete"
echo ""

iteration=0
stall_count=0
ORIGINAL_COOLDOWN=$COOLDOWN
while :; do
  iteration=$((iteration + 1))

  if [[ $iteration -gt $MAX_ITERATIONS ]]; then
    echo "=== Max iterations ($MAX_ITERATIONS) reached ===" | tee -a "$LOGFILE"
    break
  fi

  tasks_before=$(count_done_tasks)
  echo "=== Iteration $iteration ($(date '+%H:%M:%S')) — $tasks_before/$total_tasks done ===" | tee -a "$LOGFILE"

  (echo "IMPORTANT: The dev server is running at $DEV_URL — use this URL (not localhost:3000) for all browser verification steps."; echo ""; cat "$PROMPT_FILE") | claude -p \
    --verbose \
    --dangerously-skip-permissions \
    --model "$MODEL" \
    --max-turns "$MAX_TURNS" \
    --output-format=stream-json \
    --allowedTools 'Read,Write,Edit,Bash,Glob,Grep,NotebookEdit,WebFetch,WebSearch,mcp__supabase__*,mcp__playwright__*' \
    | ./ralph-filter.sh \
    | tee -a "$LOGFILE" \
    | while IFS= read -r line; do
        echo "$line"
        if [[ "$line" == *"ALL_TASKS_COMPLETE"* ]]; then
          touch "$DONE_FLAG"
        fi
        if [[ "$line" == *"BLOCKED:"* ]]; then
          touch "$BLOCKED_FLAG"
        fi
      done

  # Check completion
  if [[ -f "$DONE_FLAG" ]]; then
    echo "" | tee -a "$LOGFILE"
    tasks_final=$(count_done_tasks)
    echo "=== ALL TASKS COMPLETE ($tasks_final/$total_tasks) ===" | tee -a "$LOGFILE"

    # --- Post-completion validation ---
    echo "--- Post-completion checks ---" | tee -a "$LOGFILE"
    unchecked=$(grep -c '^\- \[ \]' "${active_feature}PRD.md" 2>/dev/null || echo 0)
    if [[ "$unchecked" -gt 0 ]]; then
      echo "WARNING: $unchecked tasks still unchecked in tasks.md" | tee -a "$LOGFILE"
    fi

    verify_count=$(grep -c 'VERIFY:' "${active_feature}PRD.md" 2>/dev/null || echo 0)
    screenshot_count=$(ls verification/ 2>/dev/null | wc -l | tr -d ' ')
    if [[ "$verify_count" -gt 0 ]] && [[ "$screenshot_count" -lt "$verify_count" ]]; then
      echo "WARNING: $verify_count VERIFY blocks but only $screenshot_count screenshots in verification/" | tee -a "$LOGFILE"
    fi

    echo "=== Ralph loop finished ===" | tee -a "$LOGFILE"
    break
  fi

  # Check blocked
  if [[ -f "$BLOCKED_FLAG" ]]; then
    echo "" | tee -a "$LOGFILE"
    tasks_at_block=$(count_done_tasks)
    echo "=== BLOCKED ($tasks_at_block/$total_tasks done) — Ralph needs human help ===" | tee -a "$LOGFILE"
    if [[ -f "BLOCKER.md" ]]; then
      echo "Reason:" | tee -a "$LOGFILE"
      cat BLOCKER.md | tee -a "$LOGFILE"
    fi
    break
  fi

  # --- Stall detection ---
  tasks_after=$(count_done_tasks)
  if [[ "$tasks_after" -eq "$tasks_before" ]]; then
    stall_count=$((stall_count + 1))
    current_cooldown=$((ORIGINAL_COOLDOWN * (stall_count + 1)))
    echo "WARNING: No task completed this iteration (stall $stall_count/$MAX_STALLS)" | tee -a "$LOGFILE"
    if [[ $stall_count -ge $MAX_STALLS ]]; then
      echo "" | tee -a "$LOGFILE"
      echo "=== STALLED — $MAX_STALLS iterations with no progress ($tasks_after/$total_tasks done) ===" | tee -a "$LOGFILE"
      echo "Check $LOGFILE for details. Ralph may be stuck on a task." | tee -a "$LOGFILE"
      break
    fi
    echo "--- Restarting in ${current_cooldown}s (backoff) ---" | tee -a "$LOGFILE"
    sleep "$current_cooldown"
  else
    stall_count=0
    echo "--- Restarting in ${ORIGINAL_COOLDOWN}s ---" | tee -a "$LOGFILE"
    sleep "$ORIGINAL_COOLDOWN"
  fi
done
