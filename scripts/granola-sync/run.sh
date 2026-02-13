#!/bin/bash
set -euo pipefail

# ChiefOfStaff - Granola Meeting Action Sync Script (Two-Phase Architecture)
# Phase 1: Discovery - list unprocessed meetings
# Phase 2: Extraction - per-meeting action item extraction (parallel)

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
STATE_DIR="$HOME/.chiefofstaff"
MEETINGS_DIR="$STATE_DIR/meetings"
LOG_DIR="$STATE_DIR/logs"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$LOG_DIR/granola-sync-$TIMESTAMP.log"
PARALLEL_JOBS=5

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

PHASE1_START=$(date +%s)

# Run discovery and capture the JSON array output
DISCOVERY_OUTPUT=$(claude --print \
  --allowedTools "mcp__granola__list_meetings,Read" \
  --model sonnet \
  --output-format text \
  < "$SCRIPT_DIR/discover-prompt.md" 2>>"$LOG_FILE")

PHASE1_END=$(date +%s)

# Parse the meeting count
MEETING_COUNT=$(echo "$DISCOVERY_OUTPUT" | jq 'length' 2>/dev/null || echo "0")

log "Found $MEETING_COUNT meetings to process"
log "Phase 1 complete in $((PHASE1_END - PHASE1_START))s"

if [ "$MEETING_COUNT" -eq 0 ]; then
  log "No meetings to process. Exiting."
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

  # Run extraction
  claude --print \
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
echo "$DISCOVERY_OUTPUT" | jq -c '.[]' | \
  xargs -P "$PARALLEL_JOBS" -I {} bash -c 'process_meeting "{}"'

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
# STATE UPDATE: Update state file with processed meetings
# ============================================================================

log ""
log "=== Updating State ==="
log ""

TOTAL_ACTIONS=0
MEETINGS_WITH_ACTIONS=0
MEETINGS_EMPTY=0

for actions_file in "$MEETINGS_DIR"/*.actions.json; do
  [ -f "$actions_file" ] || continue

  meeting_id=$(basename "$actions_file" .actions.json)
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
done

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
log ""
log "Timing breakdown:"
log "  Phase 1 (Discovery): $((PHASE1_END - PHASE1_START))s"
log "  Phase 2 (Extraction): $((PHASE2_END - PHASE2_START))s"
log "  Total elapsed: ${TOTAL_ELAPSED}s"
log ""
log "Log saved to: $LOG_FILE"
log "========================================="

exit 0
