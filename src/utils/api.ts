import { Task, Project, Attachment, MeetingAction, Meeting, SyncRun } from './types';

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
      console.log(`⏳ Retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms due to:`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

// Projects
export async function fetchProjects(): Promise<Project[]> {
  try {
    return await retryFetch(async () => {
      const response = await fetch(`${BASE_URL}/projects`, { headers });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch projects:', response.status, errorText);
        return [];
      }
      const data = await response.json();
      console.log('Fetched projects:', data.projects?.length || 0);
      return data.projects || [];
    });
  } catch (error) {
    console.error('Error fetching projects after retries:', error);
    return [];
  }
}

export async function createProject(name: string, color?: string): Promise<Project> {
  try {
    console.log('Creating project:', name, color);
    const response = await fetch(`${BASE_URL}/projects`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, color }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to create project:', response.status, errorText);
      throw new Error(`Failed to create project: ${response.status}`);
    }
    const createdProject = await response.json();
    console.log('Project created successfully:', createdProject);
    return createdProject;
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<Project> {
  try {
    console.log('Updating project:', id, updates);
    const response = await fetch(`${BASE_URL}/projects/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to update project:', response.status, errorText);
      throw new Error(`Failed to update project: ${response.status}`);
    }
    const updatedProject = await response.json();
    console.log('Project updated successfully:', updatedProject);
    return updatedProject;
  } catch (error) {
    console.error('Error updating project:', error);
    throw error;
  }
}

export async function deleteProject(id: string): Promise<void> {
  try {
    console.log('Deleting project:', id);
    const response = await fetch(`${BASE_URL}/projects/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to delete project:', response.status, errorText);
      throw new Error(`Failed to delete project: ${response.status}`);
    }
    console.log('Project deleted successfully:', id);
  } catch (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
}

// Tasks
export async function fetchTasks(): Promise<Task[]> {
  try {
    console.log('🔄 Fetching tasks from:', `${BASE_URL}/tasks`);
    return await retryFetch(async () => {
      const response = await fetch(`${BASE_URL}/tasks`, { headers });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to fetch tasks - HTTP', response.status, errorText);
        return [];
      }
      
      const data = await response.json();
      console.log('📦 Raw API response:', data);
      console.log(`✅ Fetched ${data.tasks?.length || 0} tasks from API`);
      
      const filteredTasks = (data.tasks || []).filter((t: Task) => t && !t.deleted_at);
      console.log(`🔍 After filtering deleted: ${filteredTasks.length} tasks`);
      
      return filteredTasks;
    });
  } catch (error) {
    console.error('❌ Error fetching tasks after retries (network/CORS issue?):', error);
    return [];
  }
}

export async function createTask(task: Partial<Task>): Promise<Task> {
  try {
    console.log('Creating task:', task);
    const response = await fetch(`${BASE_URL}/tasks`, {
      method: 'POST',
      headers,
      body: JSON.stringify(task),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to create task:', response.status, errorText);
      throw new Error(`Failed to create task: ${response.status}`);
    }
    const createdTask = await response.json();
    console.log('Task created successfully:', createdTask);
    return createdTask;
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  try {
    console.log('Updating task:', id, updates);
    const response = await fetch(`${BASE_URL}/tasks/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to update task:', response.status, errorText);
      throw new Error(`Failed to update task: ${response.status}`);
    }
    const updatedTask = await response.json();
    console.log('Task updated successfully:', updatedTask);
    return updatedTask;
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
}

export async function deleteTask(id: string): Promise<void> {
  try {
    console.log('Deleting task:', id);
    const response = await fetch(`${BASE_URL}/tasks/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to delete task:', response.status, errorText);
      throw new Error(`Failed to delete task: ${response.status}`);
    }
    console.log('Task deleted successfully:', id);
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
}

export async function archiveTask(id: string): Promise<Task> {
  try {
    console.log('Archiving task:', id);
    const response = await fetch(`${BASE_URL}/tasks/${id}/archive`, {
      method: 'POST',
      headers,
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to archive task:', response.status, errorText);
      throw new Error(`Failed to archive task: ${response.status}`);
    }
    const archivedTask = await response.json();
    console.log('Task archived successfully:', archivedTask);
    return archivedTask;
  } catch (error) {
    console.error('Error archiving task:', error);
    throw error;
  }
}

export async function fetchArchivedTasks(): Promise<Task[]> {
  try {
    console.log('Fetching archived tasks...');
    const response = await fetch(`${BASE_URL}/tasks/archived`, { headers });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch archived tasks:', response.status, errorText);
      return [];
    }
    const data = await response.json();
    console.log('Fetched archived tasks:', data.tasks?.length || 0);
    return data.tasks || [];
  } catch (error) {
    console.error('Error fetching archived tasks:', error);
    return [];
  }
}

export async function snoozeTask(id: string): Promise<Task> {
  try {
    // Get client's local "today" date to send to server (avoids timezone issues)
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const clientToday = `${year}-${month}-${day}`;
    
    console.log('Snoozing task:', id, 'clientToday:', clientToday);
    const response = await fetch(`${BASE_URL}/tasks/${id}/snooze`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ clientToday }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to snooze task:', response.status, errorText);
      throw new Error(`Failed to snooze task: ${response.status}`);
    }
    const snoozedTask = await response.json();
    console.log('Task snoozed successfully:', snoozedTask);
    return snoozedTask;
  } catch (error) {
    console.error('Error snoozing task:', error);
    throw error;
  }
}

// Attachments
export async function fetchAttachments(taskId: string): Promise<Attachment[]> {
  try {
    return await retryFetch(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      try {
        const response = await fetch(`${BASE_URL}/tasks/${taskId}/attachments`, { 
          headers,
          signal: controller.signal 
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to fetch attachments for task:', taskId, response.status, errorText);
          return [];
        }
        const data = await response.json();
        console.log(`✅ Fetched ${data.attachments?.length || 0} attachments for task ${taskId}`);
        return data.attachments || [];
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          console.error('⏱️ Timeout fetching attachments for task:', taskId);
        }
        throw error;
      }
    }, 2, 1000); // Retry up to 2 times with 1 second initial delay
  } catch (error) {
    console.error('❌ Error fetching attachments for task after retries:', taskId, error);
    return [];
  }
}

export async function uploadAttachment(taskId: string, file: File): Promise<Attachment> {
  try {
    console.log('Uploading attachment for task:', taskId, file.name);
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${BASE_URL}/tasks/${taskId}/attachments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: formData,
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to upload attachment:', response.status, errorText);
      throw new Error(`Failed to upload attachment: ${response.status}`);
    }
    const uploadedAttachment = await response.json();
    console.log('Attachment uploaded successfully:', uploadedAttachment);
    return uploadedAttachment;
  } catch (error) {
    console.error('Error uploading attachment:', error);
    throw error;
  }
}

export async function deleteAttachment(id: string): Promise<void> {
  try {
    console.log('Deleting attachment:', id);
    const response = await fetch(`${BASE_URL}/attachments/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to delete attachment:', response.status, errorText);
      throw new Error(`Failed to delete attachment: ${response.status}`);
    }
    console.log('Attachment deleted successfully:', id);
  } catch (error) {
    console.error('Error deleting attachment:', error);
    throw error;
  }
}

// Reorder task
export async function reorderTask(
  taskId: string,
  targetSection: string,
  beforeTaskId: string | null,
  afterTaskId: string | null
): Promise<Task> {
  try {
    // Get client's local "today" date to send to server (avoids timezone issues)
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const clientToday = `${year}-${month}-${day}`;

    console.log('Reordering task:', { taskId, targetSection, beforeTaskId, afterTaskId, clientToday });
    const response = await fetch(`${BASE_URL}/tasks/${taskId}/reorder`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ targetSection, beforeTaskId, afterTaskId, clientToday }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to reorder task:', response.status, errorText);
      throw new Error(`Failed to reorder task: ${response.status}`);
    }
    const reorderedTask = await response.json();
    console.log('Task reordered successfully:', reorderedTask);
    return reorderedTask;
  } catch (error) {
    console.error('Error reordering task:', error);
    throw error;
  }
}

// Meeting Actions
export async function fetchMeetingActions(): Promise<MeetingAction[]> {
  try {
    return await retryFetch(async () => {
      const response = await fetch(`${BASE_URL}/meeting-actions`, { headers });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch meeting actions:', response.status, errorText);
        return [];
      }
      const data = await response.json();
      console.log('Fetched meeting actions:', data.meeting_actions?.length || 0);
      return data.meeting_actions || [];
    });
  } catch (error) {
    console.error('Error fetching meeting actions after retries:', error);
    return [];
  }
}

export async function createMeetingAction(meetingAction: Partial<MeetingAction>): Promise<MeetingAction> {
  try {
    console.log('Creating meeting action:', meetingAction);
    const response = await fetch(`${BASE_URL}/meeting-actions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(meetingAction),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to create meeting action:', response.status, errorText);
      throw new Error(`Failed to create meeting action: ${response.status}`);
    }
    const createdMeetingAction = await response.json();
    console.log('Meeting action created successfully:', createdMeetingAction);
    return createdMeetingAction;
  } catch (error) {
    console.error('Error creating meeting action:', error);
    throw error;
  }
}

export async function updateMeetingAction(id: string, updates: Partial<MeetingAction>): Promise<MeetingAction> {
  try {
    console.log('Updating meeting action:', id, updates);
    const response = await fetch(`${BASE_URL}/meeting-actions/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to update meeting action:', response.status, errorText);
      throw new Error(`Failed to update meeting action: ${response.status}`);
    }
    const updatedMeetingAction = await response.json();
    console.log('Meeting action updated successfully:', updatedMeetingAction);
    return updatedMeetingAction;
  } catch (error) {
    console.error('Error updating meeting action:', error);
    throw error;
  }
}

export async function deleteMeetingAction(id: string): Promise<void> {
  try {
    console.log('Deleting meeting action:', id);
    const response = await fetch(`${BASE_URL}/meeting-actions/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to delete meeting action:', response.status, errorText);
      throw new Error(`Failed to delete meeting action: ${response.status}`);
    }
    console.log('Meeting action deleted successfully:', id);
  } catch (error) {
    console.error('Error deleting meeting action:', error);
    throw error;
  }
}

// Meetings
export async function fetchMeetings(): Promise<Meeting[]> {
  try {
    return await retryFetch(async () => {
      const response = await fetch(`${BASE_URL}/meetings`, { headers });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch meetings:', response.status, errorText);
        return [];
      }
      const data = await response.json();
      console.log('Fetched meetings:', data.meetings?.length || 0);
      return data.meetings || [];
    });
  } catch (error) {
    console.error('Error fetching meetings after retries:', error);
    return [];
  }
}

export async function fetchMeeting(id: string): Promise<Meeting | null> {
  try {
    return await retryFetch(async () => {
      const response = await fetch(`${BASE_URL}/meetings/${id}`, { headers });
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        const errorText = await response.text();
        console.error('Failed to fetch meeting:', response.status, errorText);
        return null;
      }
      const meeting = await response.json();
      console.log('Fetched meeting:', meeting.id);
      return meeting;
    });
  } catch (error) {
    console.error('Error fetching meeting after retries:', error);
    return null;
  }
}

// Sync Runs
export async function fetchSyncRuns(): Promise<SyncRun[]> {
  try {
    return await retryFetch(async () => {
      const response = await fetch(`${BASE_URL}/sync-runs`, { headers });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch sync runs:', response.status, errorText);
        return [];
      }
      const data = await response.json();
      console.log('Fetched sync runs:', data.sync_runs?.length || 0);
      return data.sync_runs || [];
    });
  } catch (error) {
    console.error('Error fetching sync runs after retries:', error);
    return [];
  }
}
