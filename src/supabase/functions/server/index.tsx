import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

app.use('*', logger(console.log));
app.use('*', cors());

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Retry utility with exponential backoff for handling transient errors
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 100
): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const errorString = String(error);
      
      // Check if it's a retryable error (502, 500, timeouts, etc.)
      const isRetryable = 
        errorString.includes('502') || 
        errorString.includes('500') ||
        errorString.includes('timeout') ||
        errorString.includes('ECONNREFUSED') ||
        errorString.includes('Bad Gateway') ||
        errorString.includes('Internal Server Error');
      
      if (!isRetryable || attempt === maxRetries - 1) {
        throw error;
      }
      
      // Exponential backoff with jitter
      const delay = initialDelay * Math.pow(2, attempt) + Math.random() * 100;
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms due to error:`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

// Storage bucket name
const BUCKET_NAME = 'make-5053ecf8-attachments';

// Initialize storage bucket
let bucketInitialized = false;
async function initBucket() {
  try {
    await retryWithBackoff(async () => {
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);
      if (!bucketExists) {
        const { error } = await supabase.storage.createBucket(BUCKET_NAME, { public: false });
        if (error && error.statusCode !== '409') {
          // Only log if it's not a "resource already exists" error
          console.error('Error creating bucket:', error);
        } else {
          console.log(`Created bucket: ${BUCKET_NAME}`);
        }
      } else {
        console.log(`Bucket ${BUCKET_NAME} already exists`);
      }
    });
    bucketInitialized = true;
  } catch (error) {
    console.error('Error initializing bucket after retries:', error);
    bucketInitialized = false;
  }
}

// Initialize bucket on startup
initBucket();

// Health check endpoint
app.get('/make-server-5053ecf8/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    bucketInitialized 
  });
});

// Get all projects
app.get('/make-server-5053ecf8/projects', async (c) => {
  try {
    const projects = await retryWithBackoff(() => kv.getByPrefix('project:'));
    const filteredProjects = projects.filter(p => p);
    console.log(`Returning ${filteredProjects.length} projects from server`);
    return c.json({ projects: filteredProjects });
  } catch (error) {
    console.error('Error fetching projects after retries:', error);
    // Return empty array instead of 500 to prevent UI from breaking
    return c.json({ projects: [] }, 200);
  }
});

// Create project
app.post('/make-server-5053ecf8/projects', async (c) => {
  try {
    const body = await c.req.json();
    const { name, color } = body;
    
    const id = crypto.randomUUID();
    const project = {
      id,
      name,
      color: color || '#7E3DD4',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    await kv.set(`project:${id}`, project);
    return c.json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    return c.json({ error: 'Failed to create project' }, 500);
  }
});

// Update project
app.put('/make-server-5053ecf8/projects/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    
    const existingProject = await retryWithBackoff(() => kv.get(`project:${id}`));
    if (!existingProject) {
      return c.json({ error: 'Project not found' }, 404);
    }
    
    const updatedProject = {
      ...existingProject,
      ...body,
      updated_at: new Date().toISOString(),
    };
    
    console.log('Updating project:', id, 'with data:', updatedProject);
    await kv.set(`project:${id}`, updatedProject);
    return c.json(updatedProject);
  } catch (error) {
    console.error('Error updating project:', error);
    return c.json({ error: 'Failed to update project' }, 500);
  }
});

// Delete project
app.delete('/make-server-5053ecf8/projects/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    const existingProject = await retryWithBackoff(() => kv.get(`project:${id}`));
    if (!existingProject) {
      return c.json({ error: 'Project not found' }, 404);
    }
    
    console.log('Deleting project:', id);
    await kv.del(`project:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return c.json({ error: 'Failed to delete project' }, 500);
  }
});

// Get all tasks
app.get('/make-server-5053ecf8/tasks', async (c) => {
  try {
    const tasks = await retryWithBackoff(() => kv.getByPrefix('task:'));
    // Add backward compatibility: default task_type to 'regular' if missing
    const filteredTasks = tasks.filter(t => t).map(t => ({
      ...t,
      task_type: t.task_type || 'regular',
    }));
    console.log(`Returning ${filteredTasks.length} tasks from server`);
    return c.json({ tasks: filteredTasks });
  } catch (error) {
    console.error('Error fetching tasks after retries:', error);
    // Return empty array instead of 500 to prevent UI from breaking
    return c.json({ tasks: [] }, 200);
  }
});

// Get archived tasks
app.get('/make-server-5053ecf8/tasks/archived', async (c) => {
  try {
    const tasks = await retryWithBackoff(() => kv.getByPrefix('task:'));
    // Add backward compatibility: default task_type to 'regular' if missing
    const archivedTasks = tasks.filter(t => t && t.archived_at).map(t => ({
      ...t,
      task_type: t.task_type || 'regular',
    }));
    console.log(`Returning ${archivedTasks.length} archived tasks from server`);
    return c.json({ tasks: archivedTasks });
  } catch (error) {
    console.error('Error fetching archived tasks after retries:', error);
    // Return empty array instead of 500 to prevent UI from breaking
    return c.json({ tasks: [] }, 200);
  }
});

// Create task
app.post('/make-server-5053ecf8/tasks', async (c) => {
  try {
    const body = await c.req.json();
    const { title, description, group, project_id, due_date, priority, task_type } = body;
    
    const id = crypto.randomUUID();
    // Normalize due_date: convert empty string to null
    const normalizedDueDate = due_date || null;
    
    const task = {
      id,
      title,
      description: description || '',
      status: 'open',
      group: group || 'personal',
      task_type: task_type || 'regular',
      project_id: project_id || null,
      due_date: normalizedDueDate,
      is_longer_term: !normalizedDueDate,
      priority: priority || null,
      order_rank: Date.now(),
      completed_at: null,
      archived_at: null,
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    console.log('Creating task with data:', task);
    
    await kv.set(`task:${id}`, task);
    return c.json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    return c.json({ error: 'Failed to create task' }, 500);
  }
});

// Update task
app.put('/make-server-5053ecf8/tasks/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    
    const existingTask = await retryWithBackoff(() => kv.get(`task:${id}`));
    if (!existingTask) {
      return c.json({ error: 'Task not found' }, 404);
    }
    
    const updatedTask = {
      ...existingTask,
      task_type: existingTask.task_type || 'regular', // Add backward compatibility
      ...body,
      updated_at: new Date().toISOString(),
    };
    
    // Only update is_longer_term if due_date is being modified
    if (body.due_date !== undefined) {
      // Normalize due_date
      updatedTask.due_date = body.due_date || null;
      updatedTask.is_longer_term = !updatedTask.due_date;
    }
    
    // Handle completed_at when status changes
    if (body.status !== undefined) {
      if (body.status === 'done') {
        // Set completed_at to current timestamp when marking as done
        updatedTask.completed_at = new Date().toISOString();
      } else if (body.status === 'open') {
        // Clear completed_at when unchecking
        updatedTask.completed_at = null;
      }
    }
    
    console.log('Updating task:', id, 'with data:', updatedTask);
    await kv.set(`task:${id}`, updatedTask);
    return c.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    return c.json({ error: 'Failed to update task' }, 500);
  }
});

// Delete task
app.delete('/make-server-5053ecf8/tasks/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    // Soft delete by setting deleted_at
    const existingTask = await retryWithBackoff(() => kv.get(`task:${id}`));
    if (!existingTask) {
      return c.json({ error: 'Task not found' }, 404);
    }
    
    const deletedTask = {
      ...existingTask,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    await kv.set(`task:${id}`, deletedTask);
    
    // Delete associated attachments
    const attachments = await retryWithBackoff(() => kv.getByPrefix(`attachment:${id}:`));
    for (const att of attachments) {
      if (!att || !att.id) {
        console.warn('Skipping invalid attachment:', att);
        continue;
      }
      
      // Delete the attachment key from KV store
      await kv.del(`attachment:${id}:${att.id}`);
      
      // Delete from storage
      if (att.file_path) {
        try {
          await supabase.storage.from(BUCKET_NAME).remove([att.file_path]);
        } catch (err) {
          console.error('Error deleting file from storage:', err);
        }
      }
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    return c.json({ error: 'Failed to delete task' }, 500);
  }
});

// Archive task
app.post('/make-server-5053ecf8/tasks/:id/archive', async (c) => {
  try {
    const id = c.req.param('id');
    
    const existingTask = await retryWithBackoff(() => kv.get(`task:${id}`));
    if (!existingTask) {
      return c.json({ error: 'Task not found' }, 404);
    }
    
    const archivedTask = {
      ...existingTask,
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    console.log('Archiving task:', id);
    await kv.set(`task:${id}`, archivedTask);
    return c.json(archivedTask);
  } catch (error) {
    console.error('Error archiving task:', error);
    return c.json({ error: 'Failed to archive task' }, 500);
  }
});

// Snooze task (move due date forward by 1 day)
app.post('/make-server-5053ecf8/tasks/:id/snooze', async (c) => {
  try {
    const id = c.req.param('id');
    
    // Try to parse the body, but handle empty body gracefully
    let clientToday: string | undefined;
    try {
      const body = await c.req.json();
      clientToday = body.clientToday;
    } catch (jsonError) {
      console.log('No JSON body provided for snooze, will use server time');
    }
    
    const existingTask = await retryWithBackoff(() => kv.get(`task:${id}`));
    if (!existingTask) {
      return c.json({ error: 'Task not found' }, 404);
    }
    
    // Validate clientToday parameter
    if (!clientToday) {
      console.error('Missing clientToday parameter in snooze request');
      return c.json({ error: 'Missing clientToday parameter' }, 400);
    }
    
    // Format date in local timezone as YYYY-MM-DD (avoids timezone offset issues)
    const formatDateLocal = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    // Use client's local "today" date to avoid timezone issues
    const [year, month, day] = clientToday.split('-').map(Number);
    const today = new Date(year, month - 1, day);
    today.setHours(0, 0, 0, 0);
    
    // Parse the existing due date in local timezone (not UTC) to avoid timezone issues
    let currentDueDate = today;
    if (existingTask.due_date) {
      const [dueYear, dueMonth, dueDay] = existingTask.due_date.split('-').map(Number);
      currentDueDate = new Date(dueYear, dueMonth - 1, dueDay);
      currentDueDate.setHours(0, 0, 0, 0);
    }
    
    const newDueDate = new Date(Math.max(today.getTime(), currentDueDate.getTime()));
    newDueDate.setDate(newDueDate.getDate() + 1);
    
    const updatedTask = {
      ...existingTask,
      due_date: formatDateLocal(newDueDate),
      is_longer_term: false,
      updated_at: new Date().toISOString(),
    };
    
    await kv.set(`task:${id}`, updatedTask);
    return c.json(updatedTask);
  } catch (error) {
    console.error('Error snoozing task:', error);
    return c.json({ error: 'Failed to snooze task' }, 500);
  }
});

// Reorder task
app.post('/make-server-5053ecf8/tasks/:id/reorder', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { targetSection, beforeTaskId, afterTaskId, clientToday } = body;
    
    const existingTask = await retryWithBackoff(() => kv.get(`task:${id}`));
    if (!existingTask) {
      return c.json({ error: 'Task not found' }, 404);
    }
    
    // Validate clientToday parameter
    if (!clientToday) {
      console.error('Missing clientToday parameter in reorder request');
      return c.json({ error: 'Missing clientToday parameter' }, 400);
    }
    
    // Use client's local "today" date to avoid timezone issues
    // Parse the clientToday string (YYYY-MM-DD) into a Date object
    const [year, month, day] = clientToday.split('-').map(Number);
    const today = new Date(year, month - 1, day);
    today.setHours(0, 0, 0, 0);
    
    // ========== HELPER FUNCTIONS FOR DATE CALCULATION ==========
    
    // Format date in local timezone as YYYY-MM-DD (avoids timezone offset issues)
    const formatDateLocal = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    // Returns today's date as YYYY-MM-DD string
    const getTodayDate = (): string => {
      return formatDateLocal(today);
    };
    
    // Returns tomorrow's date as YYYY-MM-DD string
    const getTomorrowDate = (): string => {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return formatDateLocal(tomorrow);
    };
    
    // Returns the next upcoming Sunday (if today is Sunday, returns 7 days from now)
    const getNextUpcomingSunday = (): Date => {
      const sunday = new Date(today);
      const daysUntilSunday = today.getDay() === 0 ? 7 : (7 - today.getDay());
      sunday.setDate(today.getDate() + daysUntilSunday);
      return sunday;
    };
    
    // Returns next upcoming Sunday as a string (default for "Next Week" section)
    const getNextUpcomingSundayString = (): string => {
      return formatDateLocal(getNextUpcomingSunday());
    };
    
    // Returns the day after Saturday after next Sunday (default for "After Next Week" section)
    const getDayAfterSaturdayAfterNextSunday = (): string => {
      const nextSunday = getNextUpcomingSunday();
      const saturdayAfter = new Date(nextSunday);
      saturdayAfter.setDate(nextSunday.getDate() + 6); // Saturday after next Sunday
      const dayAfter = new Date(saturdayAfter);
      dayAfter.setDate(saturdayAfter.getDate() + 1); // Day after that Saturday (Sunday)
      return formatDateLocal(dayAfter);
    };
    
    // Validates if a date belongs in a specific section (using same logic as dateUtils.ts)
    const validateDateInSection = (dateStr: string, section: string): boolean => {
      // Parse date in local timezone to avoid timezone offset issues
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      date.setHours(0, 0, 0, 0);
      
      // Calculate next upcoming Saturday (not including today)
      const daysUntilSaturday = today.getDay() === 6 ? 7 : (6 - today.getDay());
      const nextSaturday = new Date(today);
      nextSaturday.setDate(today.getDate() + daysUntilSaturday);
      
      // Calculate next upcoming Sunday (not including today)
      const daysUntilSunday = today.getDay() === 0 ? 7 : (7 - today.getDay());
      const nextSunday = new Date(today);
      nextSunday.setDate(today.getDate() + daysUntilSunday);
      
      // Calculate Saturday after next Sunday
      const saturdayAfterNextSunday = new Date(nextSunday);
      saturdayAfterNextSunday.setDate(nextSunday.getDate() + 6);
      
      switch (section) {
        case 'today':
          return date <= today;
        case 'this-week':
          return date > today && date <= nextSaturday;
        case 'next-week':
          return date > nextSaturday && date <= saturdayAfterNextSunday;
        case 'after-next-week':
          return date > saturdayAfterNextSunday;
        default:
          return false;
      }
    };
    
    // ========== DATE ASSIGNMENT LOGIC ==========
    
    let newDueDate: string | null = null;
    let inheritedDate: string | null = null;
    
    // Special handling for personal-focus section
    if (targetSection === 'personal-focus') {
      // For personal-focus, preserve the existing due_date and only update order_rank
      newDueDate = existingTask.due_date;
    } else {
      // Try to inherit date from the task we're dropping after
      if (beforeTaskId && targetSection !== 'today' && targetSection !== 'longer-term') {
        const beforeTask = await retryWithBackoff(() => kv.get(`task:${beforeTaskId}`));
        if (beforeTask && beforeTask.due_date) {
          // Validate that the inherited date actually belongs in the target section
          if (validateDateInSection(beforeTask.due_date, targetSection)) {
            inheritedDate = beforeTask.due_date;
            newDueDate = inheritedDate;
          }
        }
      }
      
      // If we didn't inherit a date, use section-specific defaults
      if (!newDueDate) {
        switch (targetSection) {
          case 'today':
            newDueDate = getTodayDate();
            break;
          case 'this-week':
            newDueDate = getTomorrowDate();
            break;
          case 'next-week':
            newDueDate = getNextUpcomingSundayString();
            break;
          case 'after-next-week':
            newDueDate = getDayAfterSaturdayAfterNextSunday();
            break;
          case 'longer-term':
            newDueDate = null;
            break;
        }
      }
    }
    
    // ========== ORDER RANK CALCULATION ==========
    
    let newOrderRank: number;
    
    if (beforeTaskId && afterTaskId) {
      // Dropped between two tasks
      const beforeTask = await kv.get(`task:${beforeTaskId}`);
      const afterTask = await kv.get(`task:${afterTaskId}`);
      
      if (beforeTask && afterTask) {
        newOrderRank = (beforeTask.order_rank + afterTask.order_rank) / 2;
      } else if (beforeTask) {
        newOrderRank = beforeTask.order_rank + 1;
      } else if (afterTask) {
        newOrderRank = afterTask.order_rank - 1;
      } else {
        newOrderRank = Date.now();
      }
    } else if (beforeTaskId) {
      // Dropped at the end (after the last task)
      const beforeTask = await kv.get(`task:${beforeTaskId}`);
      newOrderRank = beforeTask ? beforeTask.order_rank + 1 : Date.now();
    } else if (afterTaskId) {
      // Dropped at the beginning (before the first task)
      const afterTask = await kv.get(`task:${afterTaskId}`);
      newOrderRank = afterTask ? afterTask.order_rank - 1 : Date.now();
    } else {
      // Dropped into an empty section
      newOrderRank = Date.now();
    }
    
    // ========== UPDATE TASK ==========
    
    const updatedTask = {
      ...existingTask,
      due_date: newDueDate,
      is_longer_term: newDueDate === null,
      order_rank: newOrderRank,
      updated_at: new Date().toISOString(),
    };
    
    // ========== LOGGING FOR DEBUGGING ==========
    
    console.log('========== REORDER TASK ==========');
    console.log('Task ID:', id);
    console.log('Task Title:', existingTask.title);
    console.log('Target Section:', targetSection);
    console.log('Before Task ID:', beforeTaskId);
    console.log('After Task ID:', afterTaskId);
    console.log('---');
    console.log('Old Due Date:', existingTask.due_date);
    console.log('New Due Date:', newDueDate);
    console.log('Inherited Date:', inheritedDate || 'N/A');
    console.log('---');
    console.log('Today:', getTodayDate());
    console.log('Tomorrow:', getTomorrowDate());
    console.log('Next Sunday (Next Week default):', getNextUpcomingSundayString());
    console.log('Day After Saturday After Next Sunday (After Next Week default):', getDayAfterSaturdayAfterNextSunday());
    console.log('---');
    console.log('New Order Rank:', newOrderRank);
    console.log('==================================');
    
    await kv.set(`task:${id}`, updatedTask);
    return c.json(updatedTask);
  } catch (error) {
    console.error('Error reordering task:', error);
    return c.json({ error: 'Failed to reorder task' }, 500);
  }
});

// Get attachments for a task
app.get('/make-server-5053ecf8/tasks/:id/attachments', async (c) => {
  try {
    const taskId = c.req.param('id');
    console.log(`[Attachments] Fetching attachments for task: ${taskId}`);
    
    // Wrap KV call in try-catch to handle potential KV errors with retry logic
    let attachments = [];
    try {
      attachments = await retryWithBackoff(
        () => kv.getByPrefix(`attachment:${taskId}:`),
        3,
        200
      );
      console.log(`[Attachments] Found ${attachments.length} raw attachments for task ${taskId}`);
    } catch (kvError) {
      console.error(`[Attachments] KV error fetching attachments for task ${taskId} after retries:`, kvError);
      // Return empty array if KV fails after retries
      return c.json({ attachments: [] }, 200);
    }
    
    // If no attachments, return empty array immediately
    if (!attachments || attachments.length === 0) {
      console.log(`[Attachments] No attachments found for task ${taskId}, returning empty array`);
      return c.json({ attachments: [] }, 200);
    }
    
    // Filter out any null/undefined attachments
    const validAttachments = attachments.filter(att => att && att.file_path);
    console.log(`[Attachments] Valid attachments after filtering: ${validAttachments.length}`);
    
    if (validAttachments.length === 0) {
      console.log(`[Attachments] No valid attachments after filtering, returning empty array`);
      return c.json({ attachments: [] }, 200);
    }
    
    // Get signed URLs for each attachment
    // Only try to get signed URLs if bucket is initialized
    let attachmentsWithUrls = [];
    
    if (!bucketInitialized) {
      console.warn(`[Attachments] Bucket not initialized, returning attachments without signed URLs`);
      attachmentsWithUrls = validAttachments.map(att => ({ ...att, signed_url: null }));
    } else {
      console.log(`[Attachments] Creating signed URLs for ${validAttachments.length} attachments`);
      attachmentsWithUrls = await Promise.all(
        validAttachments.map(async (att) => {
          try {
            const { data, error } = await supabase.storage
              .from(BUCKET_NAME)
              .createSignedUrl(att.file_path, 3600); // 1 hour expiry
            
            if (error) {
              console.error(`[Attachments] Error creating signed URL for attachment ${att.id}:`, error);
              return {
                ...att,
                signed_url: null,
              };
            }
            
            return {
              ...att,
              signed_url: data?.signedUrl || null,
            };
          } catch (err) {
            console.error(`[Attachments] Exception creating signed URL for attachment ${att.id}:`, err);
            return {
              ...att,
              signed_url: null,
            };
          }
        })
      );
    }
    
    console.log(`[Attachments] Successfully returning ${attachmentsWithUrls.length} attachments with URLs for task ${taskId}`);
    return c.json({ attachments: attachmentsWithUrls }, 200);
  } catch (error) {
    console.error(`[Attachments] Critical error fetching attachments for task ${c.req.param('id')}:`, error);
    // Return empty array with 200 status instead of error to prevent UI from breaking
    return c.json({ attachments: [] }, 200);
  }
});

// Upload attachment
app.post('/make-server-5053ecf8/tasks/:id/attachments', async (c) => {
  try {
    const taskId = c.req.param('id');
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }
    
    const fileId = crypto.randomUUID();
    const fileExt = file.name.split('.').pop();
    const filePath = `${taskId}/${fileId}.${fileExt}`;
    
    // Upload to storage
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, fileBuffer, {
        contentType: file.type,
      });
    
    if (uploadError) {
      console.error('Upload error:', uploadError);
      return c.json({ error: 'Failed to upload file' }, 500);
    }
    
    // Save attachment metadata
    const attachment = {
      id: fileId,
      task_id: taskId,
      file_name: file.name,
      file_path: filePath,
      mime_type: file.type,
      file_size_bytes: file.size,
      uploaded_at: new Date().toISOString(),
    };
    
    await kv.set(`attachment:${taskId}:${fileId}`, attachment);
    
    // Get signed URL
    const { data } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, 3600);
    
    return c.json({
      ...attachment,
      signed_url: data?.signedUrl || null,
    });
  } catch (error) {
    console.error('Error uploading attachment:', error);
    return c.json({ error: 'Failed to upload attachment' }, 500);
  }
});

// Delete attachment
app.delete('/make-server-5053ecf8/attachments/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    // Find the attachment by searching all attachment keys
    const allAttachments = await retryWithBackoff(() => kv.getByPrefix('attachment:'));
    const attachment = allAttachments.find(a => a && a.id === id);
    
    if (!attachment) {
      return c.json({ error: 'Attachment not found' }, 404);
    }
    
    // Delete from storage
    await supabase.storage.from(BUCKET_NAME).remove([attachment.file_path]);
    
    // Construct the key from the attachment data
    const key = `attachment:${attachment.task_id}:${attachment.id}`;
    await kv.del(key);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    return c.json({ error: 'Failed to delete attachment' }, 500);
  }
});

Deno.serve(app.fetch);
