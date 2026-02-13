import { useState, useEffect } from 'react';
import { Task, Project, DateSection } from '@/utils/types';
import {
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
  snoozeTask,
  archiveTask,
  fetchProjects,
  createProject,
  updateProject,
  deleteProject,
  fetchAttachments,
  reorderTask,
} from '@/utils/api';
import { getDateSection, getSectionTitle } from '@/utils/dateUtils';
import { toast } from 'sonner@2.0.3';

export interface TaskDataHandlers {
  handleQuickAdd: (data: {
    title: string;
    description?: string;
    due_date?: string | null;
    group?: 'personal' | 'work';
    project_id?: string | null;
    task_type?: 'regular' | 'work-focus';
  }) => Promise<void>;
  handleToggleStatus: (id: string, status: 'open' | 'done') => Promise<void>;
  handleArchiveTask: (id: string) => Promise<void>;
  handleTaskUpdate: (id: string, updates: Partial<Task>) => Promise<void>;
  handleUpdateTitle: (id: string, title: string) => Promise<void>;
  handleDeleteTask: (id: string) => Promise<void>;
  handleSnooze: (id: string) => Promise<void>;
  handleDragStart: (e: React.DragEvent, task: Task) => void;
  handleDragOver: (e: React.DragEvent, section: DateSection, taskId: string | null) => void;
  handleDrop: (e: React.DragEvent, targetSection: DateSection, dropPosition: { beforeTaskId: string | null; afterTaskId: string | null }) => Promise<void>;
  handleCreateProject: (name: string, color: string) => Promise<void>;
  handleUpdateProject: (id: string, name: string, color: string) => Promise<void>;
  handleDeleteProject: (id: string) => Promise<void>;
  setSelectedTask: (task: Task | null) => void;
}

export interface TaskDataState {
  tasks: Task[];
  projects: Project[];
  attachmentCounts: Record<string, number>;
  selectedTask: Task | null;
  loading: boolean;
  error: string | null;
  draggedTask: Task | null;
  dragOverInfo: { section: DateSection; taskId: string | null } | null;
}

export function useTaskData() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [attachmentCounts, setAttachmentCounts] = useState<Record<string, number>>({});
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverInfo, setDragOverInfo] = useState<{ section: DateSection; taskId: string | null } | null>(null);

  const loadData = async () => {
    try {
      const [tasksResult, projectsResult] = await Promise.all([
        fetchTasks(),
        fetchProjects(),
      ]);

      // Handle tasks
      const tasksData = tasksResult.data || [];
      if (tasksResult.error) {
        console.error('Failed to load tasks:', tasksResult.error);
      }

      // Handle projects
      const projectsData = projectsResult.data || [];
      if (projectsResult.error) {
        console.error('Failed to load projects:', projectsResult.error);
      }

      // Filter out archived tasks
      const nonArchivedTasks = tasksData.filter(task => !task.archived_at);

      setTasks(nonArchivedTasks);
      setProjects(projectsData);

      // Load attachment counts
      const counts: Record<string, number> = {};
      await Promise.all(
        nonArchivedTasks.map(async (task) => {
          const { data, error } = await fetchAttachments(task.id);
          if (data) {
            counts[task.id] = data.length;
          } else {
            counts[task.id] = 0;
            if (error) {
              console.error(`Failed to load attachments for task ${task.id}:`, error);
            }
          }
        })
      );
      setAttachmentCounts(counts);

      setLoading(false);
    } catch (error) {
      setError('Failed to load data');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Poll for updates every 5 seconds for cross-device sync
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleQuickAdd = async (data: {
    title: string;
    description?: string;
    due_date?: string | null;
    group?: 'personal' | 'work';
    project_id?: string | null;
    task_type?: 'regular' | 'work-focus';
  }) => {
    try {
      const newTask = await createTask(data);
      setTasks([...tasks, newTask]);

      const section = getDateSection(newTask.due_date);
      const sectionName = getSectionTitle(section);
      toast.success(`Task Added to ${sectionName}`, {
        duration: 3000,
      });
    } catch (error) {
      toast.error('Failed to create task');
    }
  };

  const handleToggleStatus = async (id: string, status: 'open' | 'done') => {
    try {
      const updated = await updateTask(id, { status });
      setTasks(tasks.map(t => t.id === id ? updated : t));

      if (status === 'done') {
        toast.success('Task completed');
      }
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const handleArchiveTask = async (id: string) => {
    try {
      const archived = await archiveTask(id);
      setTasks(tasks.map(t => t.id === id ? archived : t));
      toast.success('Task archived');
    } catch (error) {
      toast.error('Failed to archive task');
    }
  };

  const handleTaskUpdate = async (id: string, updates: Partial<Task>) => {
    try {
      const updated = await updateTask(id, updates);
      setTasks(tasks.map(t => t.id === id ? updated : t));

      // Update selected task if it's the one being edited
      if (selectedTask?.id === id) {
        setSelectedTask(updated);
      }
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const handleUpdateTitle = async (id: string, title: string) => {
    await handleTaskUpdate(id, { title });
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTask(id);
      setTasks(tasks.filter(t => t.id !== id));
      toast.success('Task deleted');
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const handleSnooze = async (id: string) => {
    try {
      const updated = await snoozeTask(id);
      setTasks(tasks.map(t => t.id === id ? updated : t));
      toast.success('Task snoozed');
    } catch (error) {
      toast.error('Failed to snooze task');
    }
  };

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, section: DateSection, taskId: string | null = null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverInfo({ section, taskId });
  };

  const handleDrop = async (e: React.DragEvent, targetSection: DateSection, dropPosition: { beforeTaskId: string | null; afterTaskId: string | null }) => {
    e.preventDefault();
    if (!draggedTask) return;

    try {
      const updated = await reorderTask(
        draggedTask.id,
        targetSection,
        dropPosition.beforeTaskId,
        dropPosition.afterTaskId
      );

      setTasks(tasks.map(t => t.id === draggedTask.id ? updated : t));
    } catch (error) {
      toast.error('Failed to reorder task');
    } finally {
      setDraggedTask(null);
      setDragOverInfo(null);
    }
  };

  const handleCreateProject = async (name: string, color: string) => {
    if (!name.trim()) return;

    try {
      const project = await createProject(name, color);
      setProjects([...projects, project]);
      toast.success('Project created successfully');
    } catch (error) {
      toast.error('Failed to create project');
    }
  };

  const handleUpdateProject = async (id: string, name: string, color: string) => {
    if (!name.trim()) return;

    try {
      const updatedProject = await updateProject(id, { name, color });
      setProjects(projects.map(p => p.id === id ? updatedProject : p));
      toast.success('Project updated successfully');
    } catch (error) {
      toast.error('Failed to update project');
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project? Tasks using this project will not be deleted.')) {
      return;
    }

    try {
      await deleteProject(id);
      setProjects(projects.filter(p => p.id !== id));
      toast.success('Project deleted successfully');
    } catch (error) {
      toast.error('Failed to delete project');
    }
  };

  const state: TaskDataState = {
    tasks,
    projects,
    attachmentCounts,
    selectedTask,
    loading,
    error,
    draggedTask,
    dragOverInfo,
  };

  const handlers: TaskDataHandlers = {
    handleQuickAdd,
    handleToggleStatus,
    handleArchiveTask,
    handleTaskUpdate,
    handleUpdateTitle,
    handleDeleteTask,
    handleSnooze,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleCreateProject,
    handleUpdateProject,
    handleDeleteProject,
    setSelectedTask,
  };

  return { state, handlers };
}
