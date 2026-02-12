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
- Deployed at: `https://dzuqvmnmmgqvtzdatyqg.supabase.co/functions/v1/taskbase`
- KV-store data layer (JSONB storage in single table)
- Polling-based sync from client

**Data Flow:**
- Client polls backend every 2 seconds via `api.ts`
- Backend reads/writes to KV store using prefix-based keys
- All entities stored as JSONB in a single `kv_store` table

## Key Files

### Frontend
- `src/App.tsx` — Main application orchestrator, routing, data sync
- `src/api.ts` — API client for backend communication
- `src/types.ts` — TypeScript types for Task, Project, Attachment entities
- `src/components/ui/*` — shadcn/ui components (button, input, card, etc.)
- `src/lib/utils.ts` — Utility functions (cn helper)

### Backend
- `supabase/functions/taskbase/index.tsx` — Hono server entry point
- `supabase/functions/taskbase/kv_store.tsx` — KV store implementation

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
