# ChiefOfStaff Database Structure

This document provides a detailed overview of the database architecture, storage mechanisms, and data models for the ChiefOfStaff application.

## Supabase Project Information

**Project ID:** `ctmrnprvkyxvsjkbxyyv`

**Project Dashboard:** https://supabase.com/dashboard/project/ctmrnprvkyxvsjkbxyyv

**Database Tables View:** https://supabase.com/dashboard/project/ctmrnprvkyxvsjkbxyyv/database/tables

**Storage Buckets:** https://supabase.com/dashboard/project/ctmrnprvkyxvsjkbxyyv/storage/buckets

**Edge Functions:** https://supabase.com/dashboard/project/ctmrnprvkyxvsjkbxyyv/functions

**Public Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0bXJucHJ2a3l4dnNqa2J4eXl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NTcxMDMsImV4cCI6MjA3NjUzMzEwM30.HXd0nkDlPP0rCXz7HiEXlcvVMBF5xtgxcpdClnE278M`

## Database Architecture

### Core Table: `kv_store_5053ecf8`

The application uses a **single-table, key-value store design** where all entities are stored as JSONB values with text keys.

**Schema:**
```sql
CREATE TABLE kv_store_5053ecf8 (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL
);
```

**Access Pattern:**
- Prefix-based querying (e.g., `key LIKE 'task:%'`)
- Direct key lookups (e.g., `key = 'task:abc-123'`)
- JSONB values store complete entity objects

## Entity Types & Key Prefixes

### 1. Tasks (`task:`)

**Key Format:** `task:{uuid}`

**Example:** `task:f47ac10b-58cc-4372-a567-0e02b2c3d479`

**Full TypeScript Interface:**
```typescript
interface Task {
  id: string;                                    // UUID
  title: string;                                 // Task title
  description: string;                           // Task description (default: '')
  status: 'open' | 'done';                      // Task completion status
  group: 'personal' | 'work';                   // Task categorization
  task_type: 'regular' | 'work-focus' | 'to-read'; // Task type for UI sections
  project_id: string | null;                    // Foreign key to Project.id
  due_date: string | null;                      // ISO date string (YYYY-MM-DD)
  is_longer_term: boolean;                      // True when due_date is null
  priority: number | null;                      // Priority level (optional)
  order_rank: number;                           // For drag-and-drop ordering
  completed_at: string | null;                  // ISO timestamp when marked done
  archived_at: string | null;                   // ISO timestamp when archived
  deleted_at: string | null;                    // ISO timestamp for soft delete
  created_at: string;                           // ISO timestamp
  updated_at: string;                           // ISO timestamp
}
```

**Task Types Explained:**
- `regular` — Default task type, appears in main task sections
- `work-focus` — Special task type for "Work Focus" section (personal priorities)
- `to-read` — Special task type for "To Read" section (articles, docs, etc.)

**Task Groups:**
- `personal` — Personal tasks
- `work` — Work-related tasks

**Task Status:**
- `open` — Active/incomplete task
- `done` — Completed task (sets `completed_at` timestamp)

**Date-based Task Organization:**

Tasks are organized by due date into sections:
- **Today** — `due_date <= today`
- **This Week** — `due_date > today AND due_date <= next_saturday`
- **Next Week** — `due_date > next_saturday AND due_date <= saturday_after_next_sunday`
- **After Next Week** — `due_date > saturday_after_next_sunday`
- **Longer Term** — `due_date IS NULL` (or `is_longer_term = true`)

### 2. Projects (`project:`)

**Key Format:** `project:{uuid}`

**Example:** `project:d8e9f0a1-2b3c-4d5e-6f7a-8b9c0d1e2f3a`

**Full TypeScript Interface:**
```typescript
interface Project {
  id: string;           // UUID
  name: string;         // Project name
  color: string;        // Hex color code (default: '#7E3DD4')
  created_at: string;   // ISO timestamp
  updated_at: string;   // ISO timestamp
}
```

**Purpose:**
- Group related tasks together
- Provide visual organization via color coding
- Tasks reference projects via `task.project_id`

### 3. Attachments (`attachment:{task_id}:`)

**Key Format:** `attachment:{task_uuid}:{attachment_uuid}`

**Example:** `attachment:f47ac10b-58cc-4372-a567-0e02b2c3d479:a1b2c3d4-e5f6-7890-a1b2-c3d4e5f67890`

**Full TypeScript Interface:**
```typescript
interface Attachment {
  id: string;              // UUID (attachment ID)
  task_id: string;         // UUID (parent task ID)
  file_name: string;       // Original filename
  file_path: string;       // Storage path: "{task_id}/{attachment_id}.{ext}"
  mime_type: string;       // File MIME type
  file_size_bytes: number; // File size in bytes
  uploaded_at: string;     // ISO timestamp
  signed_url?: string | null; // Temporary signed URL (generated on fetch, 1hr expiry)
}
```

**Storage:**
- Files stored in Supabase Storage bucket: `make-5053ecf8-attachments`
- Path structure: `{task_id}/{attachment_id}.{extension}`
- Private bucket (requires signed URLs for access)

## API Endpoints

All endpoints are served by the Hono server deployed as a Supabase Edge Function.

**Base URL:** `{SUPABASE_URL}/functions/v1/make-server-5053ecf8`

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tasks` | Fetch all non-deleted tasks |
| GET | `/tasks/archived` | Fetch all archived tasks |
| POST | `/tasks` | Create a new task |
| PUT | `/tasks/:id` | Update a task |
| DELETE | `/tasks/:id` | Soft delete a task (sets `deleted_at`) |
| POST | `/tasks/:id/archive` | Archive a task (sets `archived_at`) |
| POST | `/tasks/:id/snooze` | Move task due date forward by 1 day |
| POST | `/tasks/:id/reorder` | Reorder task with drag-and-drop logic |

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects` | Fetch all projects |
| POST | `/projects` | Create a new project |
| PUT | `/projects/:id` | Update a project |
| DELETE | `/projects/:id` | Delete a project |

### Attachments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tasks/:id/attachments` | Fetch all attachments for a task |
| POST | `/tasks/:id/attachments` | Upload a file attachment (multipart/form-data) |
| DELETE | `/attachments/:id` | Delete an attachment |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health check |

## KV Store Operations

The backend provides these low-level KV operations (in `kv_store.tsx`):

```typescript
// Single operations
set(key: string, value: any): Promise<void>
get(key: string): Promise<any>
del(key: string): Promise<void>

// Batch operations
mset(keys: string[], values: any[]): Promise<void>
mget(keys: string[]): Promise<any[]>
mdel(keys: string[]): Promise<void>

// Prefix search
getByPrefix(prefix: string): Promise<any[]>
```

**Common Queries:**
```typescript
// Get all tasks
const tasks = await getByPrefix('task:');

// Get all projects
const projects = await getByPrefix('project:');

// Get attachments for a specific task
const attachments = await getByPrefix(`attachment:${taskId}:`);

// Get a specific task
const task = await get(`task:${taskId}`);

// Update a task
await set(`task:${taskId}`, updatedTask);

// Delete a task (soft delete)
const task = await get(`task:${taskId}`);
await set(`task:${taskId}`, { ...task, deleted_at: new Date().toISOString() });
```

## Task Lifecycle & State Management

### Creating a Task

When a task is created:
1. Generate a new UUID
2. Set `status` to `'open'`
3. Set `order_rank` to `Date.now()` for initial ordering
4. If `due_date` is provided and not empty, set `is_longer_term` to `false`
5. If `due_date` is null/empty, set `is_longer_term` to `true`
6. Default `task_type` to `'regular'` if not provided
7. Default `group` to `'personal'` if not provided
8. Store in KV with key `task:{uuid}`

### Completing a Task

When marking a task as done:
- Set `status` to `'done'`
- Set `completed_at` to current ISO timestamp
- Update `updated_at`

When reopening a task:
- Set `status` to `'open'`
- Set `completed_at` to `null`
- Update `updated_at`

### Archiving a Task

When archiving:
- Set `archived_at` to current ISO timestamp
- Update `updated_at`
- Task remains in database but filtered from main views

### Deleting a Task

**Soft Delete:**
- Set `deleted_at` to current ISO timestamp
- Task remains in database
- All associated attachments are deleted from both KV store and storage bucket

### Snoozing a Task

Snooze operation (moves due date forward):
1. Takes `clientToday` parameter (YYYY-MM-DD) to avoid timezone issues
2. Calculates new due date as `max(today, current_due_date) + 1 day`
3. Sets `is_longer_term` to `false`
4. Updates the task in KV store

### Reordering a Task

Complex drag-and-drop logic that:
1. Determines the target section (today, this-week, next-week, etc.)
2. Calculates appropriate `due_date` based on section
3. Optionally inherits `due_date` from adjacent task
4. Calculates `order_rank` between adjacent tasks for stable ordering
5. Special handling for `personal-focus` section (preserves existing due_date)

**Order Rank Calculation:**
- Between two tasks: `(beforeTask.order_rank + afterTask.order_rank) / 2`
- At end: `lastTask.order_rank + 1`
- At beginning: `firstTask.order_rank - 1`
- Empty section: `Date.now()`

## Data Synchronization

The client uses **polling-based sync**:
- Polls backend every **2 seconds** via `api.ts`
- Fetches all tasks, projects, and attachments
- Client merges server state with local state
- No WebSocket or real-time subscriptions

## Important Implementation Notes

### Timezone Handling

The backend explicitly handles timezone issues:
- Client sends `clientToday` (YYYY-MM-DD) for operations that need "today"
- Server parses dates in local timezone (not UTC) using manual parsing
- Due dates stored as `YYYY-MM-DD` strings (no time component)

### Retry Logic

All database operations use exponential backoff retry:
- Max retries: 3
- Initial delay: 100-200ms
- Retryable errors: 500, 502, timeouts, connection refused
- Helps handle transient Supabase errors

### Backward Compatibility

The backend provides backward compatibility:
- Tasks without `task_type` default to `'regular'`
- Empty `due_date` strings are normalized to `null`

### Error Handling

- Failed list operations (GET /tasks, /projects) return empty arrays instead of 500 errors
- Prevents UI from breaking on transient backend failures
- Logs errors but continues operation

## Storage Bucket: `make-5053ecf8-attachments`

**Properties:**
- **Visibility:** Private (requires signed URLs)
- **Signed URL Expiry:** 1 hour
- **Path Structure:** `{task_id}/{attachment_id}.{extension}`

**Lifecycle:**
- Bucket created automatically on server startup
- Files deleted when parent task is deleted
- Files deleted when attachment is explicitly removed

## Example Queries for Coding Agents

### Get all tasks due today
```typescript
const tasks = await getByPrefix('task:');
const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
const todayTasks = tasks.filter(t =>
  t && !t.deleted_at && !t.archived_at && t.due_date && t.due_date <= today
);
```

### Get all tasks in a project
```typescript
const tasks = await getByPrefix('task:');
const projectTasks = tasks.filter(t =>
  t && !t.deleted_at && !t.archived_at && t.project_id === targetProjectId
);
```

### Get all work-focus tasks
```typescript
const tasks = await getByPrefix('task:');
const workFocusTasks = tasks.filter(t =>
  t && !t.deleted_at && !t.archived_at && t.task_type === 'work-focus'
);
```

### Get all completed tasks
```typescript
const tasks = await getByPrefix('task:');
const completedTasks = tasks.filter(t =>
  t && !t.deleted_at && !t.archived_at && t.status === 'done'
);
```

## Key Files for Database Operations

- **Backend KV Store:** `src/supabase/functions/server/kv_store.tsx`
- **Backend API Server:** `src/supabase/functions/server/index.tsx`
- **Frontend API Client:** `src/utils/api.ts`
- **Type Definitions:** `src/utils/types.ts`
- **Supabase Config:** `src/utils/supabase/info.tsx`

## Additional Resources

- **Supabase Documentation:** https://supabase.com/docs
- **Supabase JS Client:** https://supabase.com/docs/reference/javascript
- **Hono Framework:** https://hono.dev/
