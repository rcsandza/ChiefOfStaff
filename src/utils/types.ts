export interface Project {
  id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'done';
  group: 'personal' | 'work';
  task_type: 'regular' | 'work-focus' | 'to-read';
  project_id: string | null;
  due_date: string | null;
  is_longer_term: boolean;
  priority: number | null;
  order_rank: number;
  completed_at: string | null;
  archived_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Attachment {
  id: string;
  task_id: string;
  file_name: string;
  file_path: string;
  mime_type: string;
  file_size_bytes: number;
  uploaded_at: string;
  signed_url?: string | null;
}

export interface MeetingAction {
  id: string;
  title: string;
  context: string;
  assignee_name: string;
  assignee_email: string | null;
  due_date: string | null;
  status: 'pending' | 'promoted' | 'dismissed';
  promoted_task_id: string | null;
  source_meeting_id: string;
  source_meeting_title: string;
  source_meeting_date: string;
  source_meeting_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  participants: any[];
  summary: string | null;
  notes: string | null;
  action_items: any[] | null;
  url: string | null;
  created_at: string;
}

export interface SyncRun {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: 'success' | 'partial' | 'failed';
  meetings_fetched: number;
  meetings_processed: number;
  actions_created: number;
  errors: string[];
  created_at: string;
}

export type DateSection = 'personal-focus' | 'to-read' | 'today' | 'this-week' | 'next-week' | 'after-next-week' | 'longer-term';
