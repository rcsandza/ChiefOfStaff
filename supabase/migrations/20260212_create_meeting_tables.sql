-- Create meetings table
CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,                -- Granola meeting ID (not UUID)
  title TEXT NOT NULL DEFAULT '',
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  participants JSONB DEFAULT '[]',
  summary TEXT,
  notes TEXT,
  action_items JSONB,
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create meeting_actions table
CREATE TABLE IF NOT EXISTS meeting_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  context TEXT NOT NULL DEFAULT '',
  assignee_name TEXT NOT NULL,
  assignee_email TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',    -- 'pending' | 'promoted' | 'dismissed'
  promoted_task_id TEXT,                      -- references KV task ID when promoted
  source_meeting_id TEXT NOT NULL REFERENCES meetings(id),
  source_meeting_title TEXT NOT NULL,
  source_meeting_date TEXT NOT NULL,
  source_meeting_url TEXT,
  deleted_at TIMESTAMPTZ,                    -- soft delete
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create sync_runs table
CREATE TABLE IF NOT EXISTS sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'success',    -- 'success' | 'partial' | 'failed'
  meetings_fetched INTEGER NOT NULL DEFAULT 0,
  meetings_processed INTEGER NOT NULL DEFAULT 0,
  actions_created INTEGER NOT NULL DEFAULT 0,
  errors JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_meeting_actions_source_meeting ON meeting_actions(source_meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_actions_status ON meeting_actions(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(date DESC);
CREATE INDEX IF NOT EXISTS idx_sync_runs_created_at ON sync_runs(created_at DESC);
