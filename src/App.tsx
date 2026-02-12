import React, { useState, useEffect, useRef } from 'react';
import { Task, Project, DateSection } from './utils/types';
import { fetchTasks, createTask, updateTask, deleteTask, snoozeTask, archiveTask, fetchProjects, createProject, updateProject, deleteProject, fetchAttachments, reorderTask } from './utils/api';
import { getDateSection, getSectionTitle } from './utils/dateUtils';
import { QuickAddBar } from './components/QuickAddBar';
import { TaskSection } from './components/TaskSection';
import { WorkFocusSection } from './components/WorkFocusSection';
import { ToReadSection } from './components/ToReadSection';
import { TaskDetailDrawer } from './components/TaskDetailDrawer';
import { ArchivedTasksView } from './components/ArchivedTasksView';
import { PasswordProtection } from './components/PasswordProtection';
import { Favicon } from './components/Favicon';
import { Button } from './components/ui/button';
import { Search, Plus, User, Briefcase, X, Edit, Trash2, Check, Archive } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from './components/ui/sheet';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { toast } from 'sonner@2.0.3';
import { Toaster } from './components/ui/sonner';

function TaskApp() {
  const [currentView, setCurrentView] = useState<'main' | 'archive'>('main');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [attachmentCounts, setAttachmentCounts] = useState<Record<string, number>>({});
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGroup, setFilterGroup] = useState<'all' | 'personal' | 'work'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'done'>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverInfo, setDragOverInfo] = useState<{ section: DateSection; taskId: string | null } | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#7E3DD4');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState('');
  const [editingProjectColor, setEditingProjectColor] = useState('');
  const filterPanelRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    loadData();
    
    // Poll for updates every 5 seconds for cross-device sync
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);
  
  // Handle click outside filter panel to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isFilterPanelOpen && filterPanelRef.current && !filterPanelRef.current.contains(event.target as Node)) {
        setIsFilterPanelOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilterPanelOpen]);
  
  const loadData = async () => {
    try {
      console.log('============ LOADING DATA ============');
      console.log('Loading data from server...');
      const [tasksData, projectsData] = await Promise.all([
        fetchTasks(),
        fetchProjects(),
      ]);
      
      console.log(`✅ Loaded ${tasksData.length} tasks and ${projectsData.length} projects`);
      console.log('📋 Raw tasks data:', tasksData);
      
      // Filter out archived tasks
      const nonArchivedTasks = tasksData.filter(task => !task.archived_at);
      console.log(`📦 After filtering archived: ${nonArchivedTasks.length} tasks`);
      
      if (nonArchivedTasks.length === 0 && tasksData.length === 0) {
        console.warn('⚠️ NO TASKS RETURNED FROM SERVER - Check if tasks are being stored correctly');
      }
      
      setTasks(nonArchivedTasks);
      setProjects(projectsData);
      
      // Load attachment counts (with error handling)
      // Only load attachments for non-archived tasks to reduce server load
      const counts: Record<string, number> = {};
      await Promise.all(
        nonArchivedTasks.map(async (task) => {
          try {
            const attachments = await fetchAttachments(task.id);
            counts[task.id] = attachments.length;
          } catch (error) {
            console.error(`Failed to fetch attachments for task ${task.id}:`, error);
            counts[task.id] = 0; // Default to 0 on error
          }
        })
      );
      setAttachmentCounts(counts);
      
      setIsLoading(false);
      console.log('============ DATA LOADING COMPLETE ============');
    } catch (error) {
      console.error('❌ Critical error loading data from server:', error);
      setIsLoading(false);
    }
  };
  
  const handleQuickAdd = async (data: {
    title: string;
    description?: string;
    due_date?: string | null;
    group?: 'personal' | 'work';
    project_id?: string | null;
    task_type?: 'regular' | 'work-focus';
  }) => {
    try {
      console.log('Quick adding task:', data);
      const newTask = await createTask(data);
      
      console.log('Task created, updating local state');
      setTasks([...tasks, newTask]);
      
      // Determine which section the task was added to and show toast
      const section = getDateSection(newTask.due_date);
      const sectionName = getSectionTitle(section);
      toast.success(`Task Added to ${sectionName}`, {
        duration: 3000,
      });
    } catch (error) {
      console.error('Failed to create task in handleQuickAdd:', error);
      alert('Failed to create task. Please check the console for details.');
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
      console.error('Error updating task status:', error);
    }
  };
  
  const handleArchiveTask = async (id: string) => {
    try {
      const archived = await archiveTask(id);
      setTasks(tasks.map(t => t.id === id ? archived : t));
      toast.success('Task archived');
    } catch (error) {
      console.error('Error archiving task:', error);
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
      console.error('Error updating task:', error);
    }
  };
  
  const handleUpdateTitle = async (id: string, title: string) => {
    await handleTaskUpdate(id, { title });
  };
  
  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTask(id);
      setTasks(tasks.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };
  
  const handleSnooze = async (id: string) => {
    try {
      const updated = await snoozeTask(id);
      setTasks(tasks.map(t => t.id === id ? updated : t));
    } catch (error) {
      console.error('Error snoozing task:', error);
    }
  };
  
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
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
      console.error('Error reordering task:', error);
    } finally {
      setDraggedTask(null);
      setDragOverInfo(null);
    }
  };
  
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    
    try {
      const project = await createProject(newProjectName, newProjectColor);
      setProjects([...projects, project]);
      setNewProjectName('');
      setNewProjectColor('#7E3DD4');
      toast.success('Project created successfully');
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    }
  };
  
  const handleUpdateProject = async (id: string) => {
    if (!editingProjectName.trim()) return;
    
    try {
      const updatedProject = await updateProject(id, {
        name: editingProjectName,
        color: editingProjectColor,
      });
      setProjects(projects.map(p => p.id === id ? updatedProject : p));
      setEditingProjectId(null);
      setEditingProjectName('');
      setEditingProjectColor('');
      toast.success('Project updated successfully');
    } catch (error) {
      console.error('Error updating project:', error);
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
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    }
  };
  
  const handleStartEditProject = (project: Project) => {
    setEditingProjectId(project.id);
    setEditingProjectName(project.name);
    setEditingProjectColor(project.color);
  };
  
  const handleCancelEditProject = () => {
    setEditingProjectId(null);
    setEditingProjectName('');
    setEditingProjectColor('');
  };
  
  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterGroup('all');
    setFilterStatus('all');
    setFilterProject('all');
  };
  
  // Check if any filters are active
  const hasActiveFilters = searchQuery !== '' || filterGroup !== 'all' || filterStatus !== 'all' || filterProject !== 'all';
  
  // Filter tasks - separate regular tasks, work focus tasks, and to-read tasks
  const allFilteredTasks = tasks.filter(task => {
    if (filterGroup !== 'all' && task.group !== filterGroup) return false;
    if (filterStatus !== 'all' && task.status !== filterStatus) return false;
    if (filterProject !== 'all' && task.project_id !== filterProject) return false;
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });
  
  // Separate special task types from regular tasks
  const workFocusTasks = allFilteredTasks.filter(task => task.task_type === 'work-focus');
  const toReadTasks = allFilteredTasks.filter(task => task.task_type === 'to-read');
  const filteredTasks = allFilteredTasks.filter(task => !task.task_type || task.task_type === 'regular');
  
  console.log('Total tasks:', tasks.length, 'Filtered tasks:', filteredTasks.length);
  
  // Group tasks by section
  const tasksBySection: Record<DateSection, Task[]> = {
    'personal-focus': [],
    'to-read': [],
    'today': [],
    'this-week': [],
    'next-week': [],
    'after-next-week': [],
    'longer-term': [],
  };
  
  // Populate personal focus section with all personal tasks, sorted by due date
  const personalTasks = filteredTasks.filter(task => task.group === 'personal');
  personalTasks.sort((a, b) => {
    // Tasks with no due date go to the end
    if (!a.due_date && !b.due_date) return a.order_rank - b.order_rank;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    // Sort by due date, then by order_rank
    const dateCompare = a.due_date.localeCompare(b.due_date);
    if (dateCompare !== 0) return dateCompare;
    return a.order_rank - b.order_rank;
  });
  tasksBySection['personal-focus'] = personalTasks;
  
  // Only work tasks go into the date-based sections
  const workTasks = filteredTasks.filter(task => task.group === 'work');
  workTasks.forEach(task => {
    const section = getDateSection(task.due_date);
    console.log(`Task "${task.title}" categorized to section: ${section}`, { due_date: task.due_date, is_longer_term: task.is_longer_term });
    tasksBySection[section].push(task);
  });
  
  // Sort tasks within each section (except personal-focus which is already sorted)
  Object.keys(tasksBySection).forEach((section) => {
    if (section !== 'personal-focus') {
      tasksBySection[section as DateSection].sort((a, b) => a.order_rank - b.order_rank);
    }
  });
  
  console.log('Tasks by section:', Object.entries(tasksBySection).map(([section, tasks]) => `${section}: ${tasks.length}`).join(', '));
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div>Loading...</div>
      </div>
    );
  }
  
  // Show archived tasks view
  if (currentView === 'archive') {
    return (
      <>
        <ArchivedTasksView 
          onBack={() => setCurrentView('main')} 
          projects={projects}
        />
        <Toaster position="top-center" />
      </>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      <Favicon />
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4" ref={filterPanelRef}>
          <div className="flex items-center justify-between">
            <h1>TaskBase</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentView('archive')}
                title="View archived tasks"
              >
                <Archive className="w-5 h-5" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                className={hasActiveFilters ? 'relative' : ''}
                style={hasActiveFilters ? {
                  backgroundColor: 'var(--primary)',
                  color: 'var(--primary-foreground)',
                } : {}}
              >
                <Search className="w-5 h-5" />
              </Button>
              
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Plus className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right">
                  <SheetHeader className="px-6">
                    <SheetTitle>Manage Projects</SheetTitle>
                    <SheetDescription>
                      Create and organize projects to categorize your tasks
                    </SheetDescription>
                  </SheetHeader>
                  <div className="space-y-4 mt-6 px-6">
                    <div>
                      <Label>Create New Project</Label>
                      <div className="flex gap-2 mt-2">
                        <div className="relative">
                          <input
                            type="color"
                            value={newProjectColor}
                            onChange={(e) => setNewProjectColor(e.target.value)}
                            className="w-10 h-10 cursor-pointer border border-border"
                            style={{ borderRadius: 'var(--radius-input)' }}
                            title="Choose color"
                          />
                        </div>
                        <Input
                          value={newProjectName}
                          onChange={(e) => setNewProjectName(e.target.value)}
                          placeholder="Project name"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleCreateProject();
                            }
                          }}
                          style={{ borderRadius: 'var(--radius-input)' }}
                          className="flex-1"
                        />
                        <Button
                          onClick={handleCreateProject}
                          style={{ borderRadius: 'var(--radius-button)' }}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <Label>Existing Projects</Label>
                      <div className="space-y-2 mt-2">
                        {projects.map(project => (
                          <div
                            key={project.id}
                            className="p-3 border border-border"
                            style={{ borderRadius: 'var(--radius)' }}
                          >
                            {editingProjectId === project.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={editingProjectColor}
                                  onChange={(e) => setEditingProjectColor(e.target.value)}
                                  className="w-8 h-8 cursor-pointer border border-border flex-shrink-0"
                                  style={{ borderRadius: 'var(--radius-input)' }}
                                />
                                <Input
                                  value={editingProjectName}
                                  onChange={(e) => setEditingProjectName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleUpdateProject(project.id);
                                    } else if (e.key === 'Escape') {
                                      handleCancelEditProject();
                                    }
                                  }}
                                  className="flex-1"
                                  style={{ borderRadius: 'var(--radius-input)' }}
                                  autoFocus
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUpdateProject(project.id)}
                                  className="h-8 w-8 p-0 flex-shrink-0"
                                  style={{ borderRadius: 'var(--radius-button)' }}
                                >
                                  <Check className="w-4 h-4 text-primary" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleCancelEditProject}
                                  className="h-8 w-8 p-0 flex-shrink-0"
                                  style={{ borderRadius: 'var(--radius-button)' }}
                                >
                                  <X className="w-4 h-4 text-muted-foreground" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-4 h-4 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: project.color }}
                                />
                                <span className="flex-1">{project.name}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleStartEditProject(project)}
                                  className="h-8 w-8 p-0 flex-shrink-0"
                                  style={{ borderRadius: 'var(--radius-button)' }}
                                >
                                  <Edit className="w-4 h-4 text-muted-foreground" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteProject(project.id)}
                                  className="h-8 w-8 p-0 flex-shrink-0"
                                  style={{ borderRadius: 'var(--radius-button)' }}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
          
          {/* Expandable Filter Panel */}
          {isFilterPanelOpen && (
            <div className="mt-4 pt-4 border-t border-border space-y-4">
              {/* Search */}
              <div>
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks..."
                  style={{ borderRadius: 'var(--radius-input)' }}
                />
              </div>
              
              {/* Group Filter */}
              <div>
                <Label className="mb-2 block">Filter by Group</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={filterGroup === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterGroup('all')}
                    style={{ borderRadius: 'var(--radius-button)' }}
                  >
                    All
                  </Button>
                  <Button
                    variant={filterGroup === 'personal' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterGroup('personal')}
                    className="gap-2"
                    style={{ borderRadius: 'var(--radius-button)' }}
                  >
                    <User className="w-4 h-4" />
                    Personal
                  </Button>
                  <Button
                    variant={filterGroup === 'work' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterGroup('work')}
                    className="gap-2"
                    style={{ borderRadius: 'var(--radius-button)' }}
                  >
                    <Briefcase className="w-4 h-4" />
                    Work
                  </Button>
                </div>
              </div>
              
              {/* Status Filter */}
              <div>
                <Label className="mb-2 block">Filter by Status</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={filterStatus === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('all')}
                    style={{ borderRadius: 'var(--radius-button)' }}
                  >
                    All
                  </Button>
                  <Button
                    variant={filterStatus === 'open' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('open')}
                    style={{ borderRadius: 'var(--radius-button)' }}
                  >
                    Open
                  </Button>
                  <Button
                    variant={filterStatus === 'done' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('done')}
                    style={{ borderRadius: 'var(--radius-button)' }}
                  >
                    Done
                  </Button>
                </div>
              </div>
              
              {/* Project Filter */}
              <div>
                <Label className="mb-2 block">Filter by Project</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={filterProject === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterProject('all')}
                    style={{ borderRadius: 'var(--radius-button)' }}
                  >
                    All
                  </Button>
                  {projects.map((project) => (
                    <Button
                      key={project.id}
                      variant={filterProject === project.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterProject(project.id)}
                      className="gap-2"
                      style={{ borderRadius: 'var(--radius-button)' }}
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: project.color }}
                      />
                      {project.name}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Reset Filters */}
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="gap-2"
                  style={{ borderRadius: 'var(--radius-button)' }}
                >
                  <X className="w-4 h-4" />
                  Reset Filters
                </Button>
              </div>
            </div>
          )}
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <QuickAddBar onAdd={handleQuickAdd} projects={projects} />
        
        <div className="space-y-8">
          {/* Personal Focus Section */}
          <TaskSection
            section="personal-focus"
            tasks={tasksBySection['personal-focus']}
            projects={projects}
            attachmentCounts={attachmentCounts}
            onToggleStatus={handleToggleStatus}
            onTaskClick={handleTaskClick}
            onSnooze={handleSnooze}
            onArchive={handleArchiveTask}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onUpdateTitle={handleUpdateTitle}
            isCollapsible={true}
            defaultCollapsed={false}
          />
          
          {/* To Read Section */}
          <ToReadSection
            tasks={toReadTasks}
            projects={projects}
            onToggleStatus={handleToggleStatus}
            onTaskClick={handleTaskClick}
            onArchive={handleArchiveTask}
            onDelete={handleDeleteTask}
            defaultCollapsed={false}
          />
          
          {/* Work Focus Section */}
          <WorkFocusSection
            tasks={workFocusTasks}
            projects={projects}
            onToggleStatus={handleToggleStatus}
            onTaskClick={handleTaskClick}
            onArchive={handleArchiveTask}
            onDelete={handleDeleteTask}
          />
          
          <TaskSection
            section="today"
            tasks={tasksBySection['today']}
            projects={projects}
            attachmentCounts={attachmentCounts}
            onToggleStatus={handleToggleStatus}
            onTaskClick={handleTaskClick}
            onSnooze={handleSnooze}
            onArchive={handleArchiveTask}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onUpdateTitle={handleUpdateTitle}
          />
          
          <TaskSection
            section="this-week"
            tasks={tasksBySection['this-week']}
            projects={projects}
            attachmentCounts={attachmentCounts}
            onToggleStatus={handleToggleStatus}
            onTaskClick={handleTaskClick}
            onSnooze={handleSnooze}
            onArchive={handleArchiveTask}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onUpdateTitle={handleUpdateTitle}
          />
          
          <TaskSection
            section="next-week"
            tasks={tasksBySection['next-week']}
            projects={projects}
            attachmentCounts={attachmentCounts}
            onToggleStatus={handleToggleStatus}
            onTaskClick={handleTaskClick}
            onSnooze={handleSnooze}
            onArchive={handleArchiveTask}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onUpdateTitle={handleUpdateTitle}
          />
          
          <TaskSection
            section="after-next-week"
            tasks={tasksBySection['after-next-week']}
            projects={projects}
            attachmentCounts={attachmentCounts}
            onToggleStatus={handleToggleStatus}
            onTaskClick={handleTaskClick}
            onSnooze={handleSnooze}
            onArchive={handleArchiveTask}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onUpdateTitle={handleUpdateTitle}
          />
          
          <TaskSection
            section="longer-term"
            tasks={tasksBySection['longer-term']}
            projects={projects}
            attachmentCounts={attachmentCounts}
            onToggleStatus={handleToggleStatus}
            onTaskClick={handleTaskClick}
            onSnooze={handleSnooze}
            onArchive={handleArchiveTask}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onUpdateTitle={handleUpdateTitle}
          />
        </div>
      </main>
      
      {/* Task Detail Drawer */}
      <TaskDetailDrawer
        task={selectedTask}
        projects={projects}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedTask(null);
        }}
        onUpdate={handleTaskUpdate}
        onDelete={handleDeleteTask}
      />
      
      {/* Toast Notifications */}
      <Toaster position="top-center" />
    </div>
  );
}

export default function App() {
  return (
    <PasswordProtection correctPassword="liming">
      <TaskApp />
    </PasswordProtection>
  );
}
