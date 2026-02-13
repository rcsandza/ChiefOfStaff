#!/bin/bash
set -euo pipefail

# ChiefOfStaff - Granola Meeting Action Sync Script (Two-Phase Architecture)
# Phase 1: Discovery - list unprocessed meetings
# Phase 2: Extraction - per-meeting action item extraction (parallel)
#
# Usage:
#   ./run.sh                                    # Use this_week (default)
#   ./run.sh --start 2026-01-29 --end 2026-02-12  # Use custom date range

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
STATE_DIR="$HOME/.chiefofstaff"
MEETINGS_DIR="$STATE_DIR/meetings"
LOG_DIR="$STATE_DIR/logs"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$LOG_DIR/granola-sync-$TIMESTAMP.log"
PARALLEL_JOBS=5

# Parse optional date range arguments
TIME_RANGE_MODE="this_week"
CUSTOM_START=""
CUSTOM_END=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --start)
      CUSTOM_START="$2"
      TIME_RANGE_MODE="custom"
      shift 2
      ;;
    --end)
      CUSTOM_END="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--start YYYY-MM-DD --end YYYY-MM-DD]"
      exit 1
      ;;
  esac
done

# Validate custom range if specified
if [[ "$TIME_RANGE_MODE" == "custom" ]]; then
  if [[ -z "$CUSTOM_START" || -z "$CUSTOM_END" ]]; then
    echo "ERROR: Both --start and --end are required for custom date range"
    exit 1
  fi
fi

# Track overall script timing
SCRIPT_START=$(date +%s)

# Ensure directories exist
mkdir -p "$LOG_DIR" "$MEETINGS_DIR"

# Initialize state file if it doesn't exist
if [ ! -f "$STATE_DIR/granola-sync-state.json" ]; then
  echo '{"last_run_at":null,"processed_meetings":{}}' > "$STATE_DIR/granola-sync-state.json"
fi

# Log function with tee for both console and file output
log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "========================================="
log "Granola Sync - Two-Phase Architecture"
log "========================================="

# Check if Claude CLI is available
if ! command -v claude &> /dev/null; then
  log "ERROR: Claude CLI not found. Please install it first."
  exit 1
fi

# Check if jq is available
if ! command -v jq &> /dev/null; then
  log "ERROR: jq not found. Please install it first (brew install jq)."
  exit 1
fi

# ============================================================================
# PHASE 1: Discovery - List unprocessed meetings
# ============================================================================

log ""
log "=== Phase 1: Discovery ==="
log ""

# Log time range being used
if [[ "$TIME_RANGE_MODE" == "custom" ]]; then
  log "Time range: custom ($CUSTOM_START to $CUSTOM_END)"
else
  log "Time range: $TIME_RANGE_MODE"
fi

PHASE1_START=$(date +%s)

# Build time range override for discovery prompt
if [[ "$TIME_RANGE_MODE" == "custom" ]]; then
  TIME_RANGE_OVERRIDE="OVERRIDE: Call list_meetings with time_range 'custom', custom_start '$CUSTOM_START', custom_end '$CUSTOM_END'"
else
  TIME_RANGE_OVERRIDE="OVERRIDE: Call list_meetings with time_range '$TIME_RANGE_MODE'"
fi

# Run discovery with stream-json for real-time progress
STREAM_FILE=$(mktemp)

# Unset CLAUDECODE to allow nested claude invocations (e.g., when run from Claude Code)
env -u CLAUDECODE claude --print \
  --verbose \
  --allowedTools "mcp__granola__list_meetings,Read" \
  --model sonnet \
  --output-format stream-json \
  --append-system-prompt "$TIME_RANGE_OVERRIDE" \
  < "$SCRIPT_DIR/discover-prompt.md" > "$STREAM_FILE" 2>>"$LOG_FILE" &
CLAUDE_PID=$!

# Background progress display — parse stream events and print summaries
(tail -f "$STREAM_FILE" 2>/dev/null || true) | while IFS= read -r line; do
  # Show tool use events (e.g., "Reading file", "Calling list_meetings")
  tool_name=$(echo "$line" | jq -r 'select(.type == "assistant") | .message.content[]? | select(.type == "tool_use") | .name // empty' 2>/dev/null)
  if [[ -n "$tool_name" ]]; then
    log "  → Calling: $tool_name"
  fi

  # Best-effort: extract meeting count from list_meetings tool result
  if echo "$line" | jq -e 'select(.type == "tool_result") | select(.tool_name == "mcp__granola__list_meetings")' &>/dev/null; then
    meeting_total=$(echo "$line" | jq -r '.content[0]?.text // empty' 2>/dev/null | jq 'length' 2>/dev/null || echo "")
    if [[ -n "$meeting_total" && "$meeting_total" != "null" ]]; then
      log "  → list_meetings returned $meeting_total meetings"
    fi
  fi
done &
TAIL_PID=$!

# Wait for claude to finish, capture exit code
CLAUDE_EXIT=0
wait $CLAUDE_PID || CLAUDE_EXIT=$?

# Kill the tail watcher - suppress all job control messages
{
  kill $TAIL_PID 2>/dev/null || true
  pkill -f "tail.*$STREAM_FILE" 2>/dev/null || true
  sleep 0.1
  wait $TAIL_PID 2>/dev/null || true
} 2>/dev/null

# Handle claude failure
if [ $CLAUDE_EXIT -ne 0 ]; then
  log "ERROR: Discovery failed (exit code $CLAUDE_EXIT). Check log: $LOG_FILE"
  rm -f "$STREAM_FILE"
  exit 1
fi

# Extract the final text result from the stream
DISCOVERY_OUTPUT=$(jq -r 'select(.type == "result") | .result' "$STREAM_FILE")
rm "$STREAM_FILE"

PHASE1_END=$(date +%s)

# Parse the meeting count
MEETING_COUNT=$(echo "$DISCOVERY_OUTPUT" | jq 'length' 2>/dev/null || echo "0")

log "Found $MEETING_COUNT new meetings to process"
log "Phase 1 complete in $((PHASE1_END - PHASE1_START))s"

if [ "$MEETING_COUNT" -eq 0 ]; then
  PROCESSED_COUNT=$(jq '.processed_meetings | length' "$STATE_DIR/granola-sync-state.json" 2>/dev/null || echo "?")
  log "All meetings in this range already processed ($PROCESSED_COUNT in state file). Exiting."

  # Record sync run even when no meetings found
  ENV_FILE="$(dirname "$SCRIPT_DIR")/../.env"
  if [ -f "$ENV_FILE" ]; then
    export $(grep -v '^#' "$ENV_FILE" | xargs)
    if [ -n "$VITE_SUPABASE_PROJECT_ID" ] && [ -n "$VITE_SUPABASE_ANON_KEY" ]; then
      API_BASE="https://${VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/make-server-5053ecf8"
      AUTH_HEADER="Authorization: Bearer ${VITE_SUPABASE_ANON_KEY}"

      SYNC_END_TIME=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)
      sync_run_payload=$(jq -n \
        --arg started_at "$(date -r $SCRIPT_START -u +%Y-%m-%dT%H:%M:%S.000Z)" \
        --arg completed_at "$SYNC_END_TIME" \
        --arg status "success" \
        --argjson meetings_fetched "0" \
        --argjson meetings_processed "0" \
        --argjson actions_created "0" \
        --argjson errors "[]" \
        '{started_at: $started_at, completed_at: $completed_at, status: $status, meetings_fetched: $meetings_fetched, meetings_processed: $meetings_processed, actions_created: $actions_created, errors: $errors}')

      curl -s -X POST "$API_BASE/sync-runs" \
        -H "$AUTH_HEADER" \
        -H "Content-Type: application/json" \
        -d "$sync_run_payload" > /dev/null 2>&1

      log "Sync run recorded (0 meetings)"
    fi
  fi

  exit 0
fi

# ============================================================================
# PHASE 2: Extraction - Process each meeting in parallel
# ============================================================================

log ""
log "=== Phase 2: Parallel Extraction ==="
log ""

PHASE2_START=$(date +%s)

STATE_FILE="$STATE_DIR/granola-sync-state.json"

# Function to process a single meeting (will be run in parallel)
process_meeting() {
  local meeting_json="$1"
  local meeting_id=$(echo "$meeting_json" | jq -r '.id')
  local meeting_title=$(echo "$meeting_json" | jq -r '.title')
  local output_file="$MEETINGS_DIR/${meeting_id}.actions.json"
  local meeting_log="$LOG_DIR/${meeting_id}.log"

  local start_time=$(date +%s)
  echo "  📋 Extracting: $meeting_title ($meeting_id)"

  # Run extraction (unset CLAUDECODE to allow nested invocations)
  env -u CLAUDECODE claude --print \
    --allowedTools "mcp__granola__get_meetings,mcp__granola__query_granola_meetings,Read,Write" \
    --model sonnet \
    --output-format text \
    --append-system-prompt "Meeting ID: $meeting_id" \
    --append-system-prompt "Meeting title: $meeting_title" \
    --append-system-prompt "Output file: $output_file" \
    < "$SCRIPT_DIR/extract-prompt.md" >> "$meeting_log" 2>&1 || {
      echo "  ❌ Failed: $meeting_title"
      return 0  # Don't fail entire pipeline
    }

  local end_time=$(date +%s)
  local elapsed=$((end_time - start_time))

  # Extract action count from log
  local actions_count=$(grep -o 'ACTIONS_CREATED:[0-9]*' "$meeting_log" | tail -n1 | cut -d: -f2 || echo "0")
  echo "  ✅ Done: $meeting_title — $actions_count actions (${elapsed}s)"
}

# Export function and variables for parallel execution
export -f process_meeting
export MEETINGS_DIR
export LOG_DIR
export SCRIPT_DIR

# Run extractions in parallel
# Use a simpler approach: write meeting IDs to temp file and process
TEMP_IDS=$(mktemp)
echo "$DISCOVERY_OUTPUT" | jq -r '.[].id' > "$TEMP_IDS"

while IFS= read -r meeting_id; do
  meeting_title=$(echo "$DISCOVERY_OUTPUT" | jq -r ".[] | select(.id == \"$meeting_id\") | .title")
  meeting_json=$(echo "$DISCOVERY_OUTPUT" | jq -c ".[] | select(.id == \"$meeting_id\")")

  (process_meeting "$meeting_json") &

  # Limit concurrent jobs
  while [ $(jobs -r | wc -l) -ge "$PARALLEL_JOBS" ]; do
    sleep 0.1
  done
done < "$TEMP_IDS"

# Wait for all background jobs to finish
wait

rm "$TEMP_IDS"

PHASE2_END=$(date +%s)

log ""
log "Phase 2 complete in $((PHASE2_END - PHASE2_START))s. Merging logs..."

# Merge per-meeting logs into main log
for meeting_log in "$LOG_DIR"/*.log; do
  if [ "$meeting_log" != "$LOG_FILE" ] && [ -f "$meeting_log" ]; then
    cat "$meeting_log" >> "$LOG_FILE"
    rm "$meeting_log"
  fi
done

# ============================================================================
# PHASE 3: Push data to backend API
# ============================================================================

log ""
log "=== Phase 3: Push to Backend ==="
log ""

PHASE3_START=$(date +%s)

# Load API credentials from .env
ENV_FILE="$(dirname "$SCRIPT_DIR")/../.env"
if [ ! -f "$ENV_FILE" ]; then
  log "WARNING: .env file not found at $ENV_FILE, skipping backend sync"
else
  # Source the .env file
  export $(grep -v '^#' "$ENV_FILE" | xargs)

  if [ -z "$VITE_SUPABASE_PROJECT_ID" ] || [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    log "WARNING: Missing Supabase credentials in .env, skipping backend sync"
  else
    API_BASE="https://${VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/make-server-5053ecf8"
    AUTH_HEADER="Authorization: Bearer ${VITE_SUPABASE_ANON_KEY}"

    SYNC_START_TIME=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)
    ACTIONS_PUSHED=0
    MEETINGS_PUSHED=0
    PUSH_ERRORS=()

    # Process each meeting from this run
    while IFS= read -r meeting_id; do
      meeting_json=$(echo "$DISCOVERY_OUTPUT" | jq -c ".[] | select(.id == \"$meeting_id\")")
      meeting_title=$(echo "$meeting_json" | jq -r '.title')
      meeting_date=$(echo "$meeting_json" | jq -r '.date')
      meeting_url=$(echo "$meeting_json" | jq -r '.url // empty')

      actions_file="$MEETINGS_DIR/${meeting_id}.actions.json"

      if [ ! -f "$actions_file" ]; then
        log "⚠️  No actions file for meeting: $meeting_id"
        continue
      fi

      # Push meeting metadata (upsert)
      log "  📤 Pushing meeting: $meeting_title"
      meeting_payload=$(jq -n \
        --arg id "$meeting_id" \
        --arg title "$meeting_title" \
        --arg date "$meeting_date" \
        --arg url "$meeting_url" \
        '{id: $id, title: $title, date: $date, participants: [], url: $url}')

      curl_output=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/meetings" \
        -H "$AUTH_HEADER" \
        -H "Content-Type: application/json" \
        -d "$meeting_payload" 2>&1)

      http_code=$(echo "$curl_output" | tail -n1)
      response_body=$(echo "$curl_output" | sed '$d')

      if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        MEETINGS_PUSHED=$((MEETINGS_PUSHED + 1))
      else
        log "  ❌ Failed to push meeting (HTTP $http_code): $meeting_id"
        PUSH_ERRORS+=("Meeting $meeting_id: HTTP $http_code")
      fi

      # Push each action item
      action_count=$(jq 'length' "$actions_file")
      if [ "$action_count" -eq 0 ]; then
        log "  ℹ️  No actions to push for meeting: $meeting_id"
        continue
      fi

      log "  📤 Pushing $action_count actions for meeting: $meeting_title"

      jq -c '.[]' "$actions_file" | while IFS= read -r action_json; do
        curl_output=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/meeting-actions" \
          -H "$AUTH_HEADER" \
          -H "Content-Type: application/json" \
          -d "$action_json" 2>&1)

        http_code=$(echo "$curl_output" | tail -n1)

        if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
          ACTIONS_PUSHED=$((ACTIONS_PUSHED + 1))
        else
          action_title=$(echo "$action_json" | jq -r '.title')
          log "  ⚠️  Failed to push action (HTTP $http_code): $action_title"
          PUSH_ERRORS+=("Action '$action_title': HTTP $http_code")
        fi
      done

    done < <(echo "$DISCOVERY_OUTPUT" | jq -r '.[].id')

    PHASE3_END=$(date +%s)
    SYNC_END_TIME=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)

    log ""
    log "Phase 3 complete in $((PHASE3_END - PHASE3_START))s"
    log "Pushed $MEETINGS_PUSHED meetings and $ACTIONS_PUSHED actions to backend"

    # Record sync run
    sync_status="success"
    if [ ${#PUSH_ERRORS[@]} -gt 0 ]; then
      sync_status="partial"
    fi

    errors_json=$(printf '%s\n' "${PUSH_ERRORS[@]}" | jq -R . | jq -s .)

    sync_run_payload=$(jq -n \
      --arg started_at "$SYNC_START_TIME" \
      --arg completed_at "$SYNC_END_TIME" \
      --arg status "$sync_status" \
      --argjson meetings_fetched "$MEETING_COUNT" \
      --argjson meetings_processed "$MEETING_COUNT" \
      --argjson actions_created "$ACTIONS_PUSHED" \
      --argjson errors "$errors_json" \
      '{started_at: $started_at, completed_at: $completed_at, status: $status, meetings_fetched: $meetings_fetched, meetings_processed: $meetings_processed, actions_created: $actions_created, errors: $errors}')

    curl -s -X POST "$API_BASE/sync-runs" \
      -H "$AUTH_HEADER" \
      -H "Content-Type: application/json" \
      -d "$sync_run_payload" > /dev/null 2>&1

    log "Sync run recorded in backend"
  fi
fi

# ============================================================================
# STATE UPDATE: Update state file with processed meetings
# ============================================================================

log ""
log "=== Updating State ==="
log ""

TOTAL_ACTIONS=0
MEETINGS_WITH_ACTIONS=0
MEETINGS_EMPTY=0

# Only process meetings from THIS run (parse from DISCOVERY_OUTPUT)
# Use process substitution to avoid subshell
while IFS= read -r meeting_id; do
  actions_file="$MEETINGS_DIR/${meeting_id}.actions.json"

  if [ ! -f "$actions_file" ]; then
    log "⚠️  Warning: Expected action file not found: $meeting_id"
    continue
  fi

  action_count=$(jq 'length' "$actions_file" 2>/dev/null || echo "0")

  if [ "$action_count" -gt 0 ]; then
    MEETINGS_WITH_ACTIONS=$((MEETINGS_WITH_ACTIONS + 1))
    TOTAL_ACTIONS=$((TOTAL_ACTIONS + action_count))
  else
    MEETINGS_EMPTY=$((MEETINGS_EMPTY + 1))
  fi

  # Update state file
  jq --arg id "$meeting_id" \
     --arg ts "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)" \
     --argjson count "$action_count" \
     '.processed_meetings[$id] = {"processed_at": $ts, "actions_created": $count} | .last_run_at = $ts' \
     "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"
done < <(echo "$DISCOVERY_OUTPUT" | jq -r '.[].id')

log "✅ State updated"

# ============================================================================
# Summary
# ============================================================================

SCRIPT_END=$(date +%s)
TOTAL_ELAPSED=$((SCRIPT_END - SCRIPT_START))

log ""
log "========================================="
log "Summary"
log "========================================="
log "Meetings discovered: $MEETING_COUNT"
log "Meetings with actions: $MEETINGS_WITH_ACTIONS"
log "Meetings with no actions: $MEETINGS_EMPTY"
log "Total actions extracted: $TOTAL_ACTIONS"
if [ -n "$ACTIONS_PUSHED" ]; then
  log "Actions pushed to backend: $ACTIONS_PUSHED"
fi
log ""
log "Timing breakdown:"
log "  Phase 1 (Discovery): $((PHASE1_END - PHASE1_START))s"
log "  Phase 2 (Extraction): $((PHASE2_END - PHASE2_START))s"
if [ -n "$PHASE3_END" ]; then
  log "  Phase 3 (Backend Sync): $((PHASE3_END - PHASE3_START))s"
fi
log "  Total elapsed: ${TOTAL_ELAPSED}s"
log ""
log "Log saved to: $LOG_FILE"
log "========================================="

exit 0
