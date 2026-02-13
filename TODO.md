# ChiefOfStaff — TODO

## Authentication & Security
- [ ] Add real auth to the API (currently open with just anon key)
  - Options: Supabase Auth (JWT), API key middleware, or RLS policies
  - At minimum: validate Bearer token in Hono middleware before any route
  - Scope: all endpoints (tasks, projects, attachments, meeting-actions)

## Meeting Actions — Review UI
- [ ] Build a dedicated page/view for reviewing MeetingAction items
  - Filter by: mine vs delegated (based on assignee_name), status (pending/promoted/dismissed)
  - Sort by meeting date (most recent first)
  - Show meeting context and source link to Granola
- [ ] "Dismiss" action — sets status to 'dismissed'
- [ ] Bulk dismiss — select multiple and dismiss at once

## Meeting Actions — Promote to Task Workflow
- [ ] "Add to Tasks" button on each MeetingAction
  - Opens a pre-filled task creation form (title from MeetingAction, description with meeting context)
  - User can edit before confirming
  - On confirm: creates Task via existing API, updates MeetingAction status to 'promoted' with promoted_task_id
- [ ] Conversion mapping function (MeetingAction → Task fields)
  - Lives in frontend, easy to update when Task schema changes

## Data Layer Evolution
- [ ] Evaluate migrating MeetingAction from KV to a proper Postgres table
  - When: if we need server-side filtering, indexing, or volume exceeds ~1000 items
  - Migration path: create table, backfill from KV, update endpoints, drop KV entries
- [ ] Add explicit 'owner_type' column if filtering by mine/delegated becomes insufficient
  - Currently derived from assignee_name in frontend

## Sync Improvements
- [ ] Monitor extraction quality — review dismissed items to tune the prompt
- [ ] Add Slack/email notification on sync failures
- [ ] Consider storing raw Granola transcript snippets for better context

## Initial Setup & Testing
- [ ] Run initial seed sync for last 2 weeks: `bash scripts/granola-sync/run.sh`
- [ ] Verify MeetingAction items appear via API: `curl GET /meeting-actions`
- [ ] Test idempotency: run script twice, verify zero new meetings processed
- [ ] Load launchd plist to activate cron: `launchctl load ~/Library/LaunchAgents/com.chiefofstaff.granola-sync.plist`
- [ ] Check logs after first scheduled run: `tail -f ~/.chiefofstaff/logs/granola-sync-*.log`
