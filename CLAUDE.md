# ChiefOfStaff

A task and project management application built with React and Hono, featuring a KV-store backend on Supabase Edge Functions.

## Build & Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server (port 5173)
npm run build        # Build for production
```

## Architecture Overview

**Frontend:**
- React 18 single-page application
- Vite build tooling
- shadcn/ui component library
- Tailwind CSS v4
- TypeScript

**Backend:**
- Hono server running on Supabase Edge Functions (Deno runtime)
- Deployed at: `https://ctmrnprvkyxvsjkbxyyv.supabase.co/functions/v1/make-server-5053ecf8`
- KV-store data layer (JSONB storage in single table)
- Polling-based sync from client

**Data Flow:**
- Client polls backend every 2 seconds via `api.ts`
- Backend reads/writes to KV store using prefix-based keys
- All entities stored as JSONB in a single `kv_store` table

## Module Architecture

The frontend is organized into self-contained modules with clear boundaries:

**`src/components/tasks/`** — Task management module
- Entry point: `TasksTab.tsx`
- Components: `QuickAddBar`, `TaskSection`, `TaskCard`, `TaskDetailDrawer`, `WorkFocusSection`, `ToReadSection`, `ArchivedTasksView`
- Responsibilities: All task CRUD operations, filtering, drag-and-drop reordering, archiving
- May import from: `@/utils/`, `@/components/ui/`, `@/components/shared/`, `@/components/tasks/`

**`src/components/meeting-actions/`** — Meeting actions triage module
- Entry point: `MeetingActionsTab.tsx`
- Components: `MeetingGroup`, `MeetingActionCard`, `PromoteDialog`
- Responsibilities: Displaying meeting action items, promoting to tasks, dismissing
- May import from: `@/utils/`, `@/components/ui/`, `@/components/meeting-actions/`
- **Agent independence:** Should NOT import from `@/components/tasks/`

**`src/components/shared/`** — Shared app-level components
- Components: `PasswordProtection`, `Favicon`
- Shared across multiple modules

**`src/components/ui/`** — shadcn/ui primitives
- Reusable UI components (button, input, dialog, etc.)
- Shared across all modules

**`src/utils/`** — Shared utilities and API client
- `api.ts` — Backend API client
- `types.ts` — TypeScript type definitions
- `dateUtils.ts` — Date calculation helpers
- Shared across all modules

## Key Files

### Frontend
- `src/App.tsx` — Top-level app with tab navigation (Tasks, Meeting Actions)
- `src/components/tasks/TasksTab.tsx` — Task management module entry point
- `src/components/meeting-actions/MeetingActionsTab.tsx` — Meeting actions module entry point
- `src/utils/api.ts` — API client for backend communication
- `src/utils/types.ts` — TypeScript types for Task, Project, Attachment, MeetingAction entities
- `src/components/ui/*` — shadcn/ui components (button, input, card, etc.)
- `src/lib/utils.ts` — Utility functions (cn helper)

### Backend
- `src/supabase/functions/server/index.tsx` — Hono server entry point (source)
- `src/supabase/functions/server/kv_store.tsx` — KV store implementation (source)
- `supabase/functions/make-server-5053ecf8/index.ts` — Deployed Edge Function
- `supabase/functions/make-server-5053ecf8/kv_store.tsx` — Deployed KV store

### Automation
- `scripts/granola-sync/discover-prompt.md` — Claude prompt for discovering new meetings (Phase 1)
- `scripts/granola-sync/extract-prompt.md` — Claude prompt for extracting action items (Phase 2)
- `scripts/granola-sync/run.sh` — Three-phase sync script: (1) Discovery, (2) Extraction, (3) Push to backend API
- `scripts/granola-sync/backfill.sh` — One-time script to push existing local meeting files to backend
- `~/Library/LaunchAgents/com.chiefofstaff.granola-sync.plist` — launchd schedule (every 2 hours, weekdays 9am-7pm)
- State tracked in `~/.chiefofstaff/granola-sync-state.json`
- Meeting data stored in `~/.chiefofstaff/meetings/*.actions.json`

### Config
- `vite.config.ts` — Vite configuration with `@` path alias
- `tsconfig.json` — TypeScript configuration
- `tailwind.config.ts` — Tailwind CSS v4 configuration
- `components.json` — shadcn/ui configuration

## Data Model

All entities stored in a single `kv_store` table with prefix-based keys:

### Task
```typescript
{
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  priority?: 'low' | 'medium' | 'high';
  projectId?: string;
  assigneeId?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}
```
**Key prefix:** `task:`

### Project
```typescript
{
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}
```
**Key prefix:** `project:`

### Attachment
```typescript
{
  id: string;
  taskId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}
```
**Key prefix:** `attachment:`

### MeetingAction
```typescript
{
  id: string;
  title: string;
  context: string;
  assignee_name: string;
  assignee_email: string | null;
  due_date: string | null;
  status: 'new' | 'pending' | 'promoted' | 'dismissed';
  promoted_task_id: string | null;
  source_meeting_id: string;
  source_meeting_title: string;
  source_meeting_date: string;
  source_meeting_url: string | null;
  created_at: string;
  updated_at: string;
}
```
**Key prefix:** `meeting-action:`

**Purpose:** Staging area for action items extracted from Granola meeting notes. Items can be reviewed and promoted to Tasks or dismissed.

**Status workflow:**
- `new` — Unprocessed action item, needs triage (default for newly synced items)
- `pending` — Triaged/kept, awaiting action
- `promoted` — Converted to a task
- `dismissed` — Explicitly dismissed and hidden

**Due date:** Defaults to 3 days from creation for new meeting actions. Users can edit dates inline via the calendar picker in the UI.

**Sync:** Automated via `claude --print` running every 2 hours (weekdays 9am-7pm). State tracked in `~/.chiefofstaff/granola-sync-state.json`.

## Path Aliases & Conventions

- `@/*` maps to `./src/*` (configured in vite.config.ts and tsconfig.json)
- shadcn/ui components follow the pattern: `@/components/ui/{component-name}`
- Use `cn()` utility from `@/lib/utils` for conditional classNames
- All API calls go through `src/api.ts` client

## Project Origin

This project was created using Figma Make, which generated the initial React + Hono structure with Supabase backend integration.

## Notes

- No test suite currently exists
- No linting configuration present
- No CI/CD pipeline configured
- Environment variables should be configured in `.env` for local development (Supabase URL and keys)
