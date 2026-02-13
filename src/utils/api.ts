import { Task, Project, Attachment, MeetingAction, Meeting, SyncRun } from './types';
import { formatDateISO } from './dateUtils';

const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-5053ecf8`;

const headers = {
  'Authorization': `Bearer ${publicAnonKey}`,
  'Content-Type': 'application/json',
};

// Retry utility with exponential backoff for network errors
async function retryFetch<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 500
): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const errorString = String(error);

      // Only retry on network errors, not on 4xx errors
      const isRetryable =
        errorString.includes('Failed to fetch') ||
        errorString.includes('NetworkError') ||
        errorString.includes('timeout');

      if (!isRetryable || attempt === maxRetries - 1) {
        throw error;
      }

      // Exponential backoff with jitter
      const delay = initialDelay * Math.pow(2, attempt) + Math.random() * 200;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

// Generic API request wrapper that handles fetch, response checking, and error handling
async function apiRequest<T>(
  method: string,
  path: string,
  body?: any,
  customHeaders?: HeadersInit
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const requestHeaders = customHeaders || headers;

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`API request failed (${method} ${path}): ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
  }

  // For DELETE requests with no content, return undefined
  if (response.status === 204 || method === 'DELETE') {
    return undefined as T;
  }

  return await response.json();
}

// Result type for read operations
export type ApiResult<T> = {
  data: T | null;
  error: Error | null;
};

// Projects
export async function fetchProjects(): Promise<ApiResult<Project[]>> {
  try {
    const data = await retryFetch(async () => {
      return await apiRequest<{ projects: Project[] }>('GET', '/projects');
    });
    return { data: data.projects || [], error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

export async function createProject(name: string, color?: string): Promise<Project> {
  return apiRequest<Project>('POST', '/projects', { name, color });
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<Project> {
  return apiRequest<Project>('PUT', `/projects/${id}`, updates);
}

export async function deleteProject(id: string): Promise<void> {
  return apiRequest<void>('DELETE', `/projects/${id}`);
}

// Tasks
export async function fetchTasks(): Promise<ApiResult<Task[]>> {
  try {
    const data = await retryFetch(async () => {
      return await apiRequest<{ tasks: Task[] }>('GET', '/tasks');
    });
    const filteredTasks = (data.tasks || []).filter((t: Task) => t && !t.deleted_at);
    return { data: filteredTasks, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

export async function createTask(task: Partial<Task>): Promise<Task> {
  return apiRequest<Task>('POST', '/tasks', task);
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  return apiRequest<Task>('PUT', `/tasks/${id}`, updates);
}

export async function deleteTask(id: string): Promise<void> {
  return apiRequest<void>('DELETE', `/tasks/${id}`);
}

export async function archiveTask(id: string): Promise<Task> {
  return apiRequest<Task>('POST', `/tasks/${id}/archive`);
}

export async function fetchArchivedTasks(): Promise<ApiResult<Task[]>> {
  try {
    const data = await retryFetch(async () => {
      return await apiRequest<{ tasks: Task[] }>('GET', '/tasks/archived');
    });
    return { data: data.tasks || [], error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

export async function snoozeTask(id: string): Promise<Task> {
  // Get client's local "today" date to send to server (avoids timezone issues)
  const clientToday = formatDateISO(new Date());
  return apiRequest<Task>('POST', `/tasks/${id}/snooze`, { clientToday });
}

// Attachments
export async function fetchAttachments(taskId: string): Promise<ApiResult<Attachment[]>> {
  try {
    const data = await retryFetch(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      try {
        const url = `${BASE_URL}/tasks/${taskId}/attachments`;
        const response = await fetch(url, {
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`API request failed (GET /tasks/${taskId}/attachments): ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
        }

        const result = await response.json();
        return result;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    }, 2, 1000); // Retry up to 2 times with 1 second initial delay
    return { data: data.attachments || [], error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

export async function uploadAttachment(taskId: string, file: File): Promise<Attachment> {
  const formData = new FormData();
  formData.append('file', file);

  // For FormData, we need custom headers (no Content-Type)
  return apiRequest<Attachment>(
    'POST',
    `/tasks/${taskId}/attachments`,
    formData,
    { 'Authorization': `Bearer ${publicAnonKey}` }
  );
}

export async function deleteAttachment(id: string): Promise<void> {
  return apiRequest<void>('DELETE', `/attachments/${id}`);
}

// Reorder task
export async function reorderTask(
  taskId: string,
  targetSection: string,
  beforeTaskId: string | null,
  afterTaskId: string | null
): Promise<Task> {
  // Get client's local "today" date to send to server (avoids timezone issues)
  const clientToday = formatDateISO(new Date());
  return apiRequest<Task>('POST', `/tasks/${taskId}/reorder`, {
    targetSection,
    beforeTaskId,
    afterTaskId,
    clientToday,
  });
}

// Meeting Actions
export async function fetchMeetingActions(): Promise<ApiResult<MeetingAction[]>> {
  try {
    const data = await retryFetch(async () => {
      return await apiRequest<{ meeting_actions: MeetingAction[] }>('GET', '/meeting-actions');
    });
    return { data: data.meeting_actions || [], error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

export async function updateMeetingAction(id: string, updates: Partial<MeetingAction>): Promise<MeetingAction> {
  return apiRequest<MeetingAction>('PUT', `/meeting-actions/${id}`, updates);
}

// Meetings
export async function fetchMeetings(): Promise<ApiResult<Meeting[]>> {
  try {
    const data = await retryFetch(async () => {
      return await apiRequest<{ meetings: Meeting[] }>('GET', '/meetings');
    });
    return { data: data.meetings || [], error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

// Sync Runs
export async function fetchSyncRuns(): Promise<ApiResult<SyncRun[]>> {
  try {
    const data = await retryFetch(async () => {
      return await apiRequest<{ sync_runs: SyncRun[] }>('GET', '/sync-runs');
    });
    return { data: data.sync_runs || [], error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
  }
}
