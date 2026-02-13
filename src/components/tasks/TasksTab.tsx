import React, { useState, useEffect, useRef } from 'react';
import { Task, DateSection } from '@/utils/types';
import { getDateSection } from '@/utils/dateUtils';
import { QuickAddBar } from '@/components/tasks/QuickAddBar';
import { TaskSection } from '@/components/tasks/TaskSection';
import { SpecialTaskSection } from '@/components/tasks/SpecialTaskSection';
import { TaskDetailDrawer } from '@/components/tasks/TaskDetailDrawer';
import { ArchivedTasksView } from '@/components/tasks/ArchivedTasksView';
import { ProjectManagerSheet } from '@/components/tasks/ProjectManagerSheet';
import { FilterPanel } from '@/components/tasks/FilterPanel';
import { useTaskData } from '@/components/tasks/hooks/useTaskData';
import { Button } from '@/components/ui/button';
import { Search, Archive, ListTodo, MessageSquare } from 'lucide-react';
import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { PageLayout } from '@/components/shared/PageLayout';

interface TasksTabProps {
  activeTab: 'tasks' | 'meeting-actions';
  onTabChange: (tab: 'tasks' | 'meeting-actions') => void;
}

const DATE_SECTIONS: DateSection[] = ['today', 'this-week', 'next-week', 'after-next-week', 'longer-term'];

export function TasksTab({ activeTab, onTabChange }: TasksTabProps) {
  const [currentView, setCurrentView] = useState<'main' | 'archive'>('main');
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGroup, setFilterGroup] = useState<'all' | 'personal' | 'work'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'done'>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const filterPanelRef = useRef<HTMLDivElement>(null);

  const { state, handlers } = useTaskData();
  const { tasks, projects, attachmentCounts, selectedTask, loading } = state;
  const { setSelectedTask } = handlers;

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

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
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
    tasksBySection[section].push(task);
  });

  // Sort tasks within each date section
  DATE_SECTIONS.forEach((section) => {
    tasksBySection[section].sort((a, b) => a.order_rank - b.order_rank);
  });

  if (loading) {
    return <LoadingScreen />;
  }

  // Show archived tasks view
  if (currentView === 'archive') {
    return (
      <ArchivedTasksView
        onBack={() => setCurrentView('main')}
        projects={projects}
      />
    );
  }

  return (
    <PageLayout>
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-4" ref={filterPanelRef}>
          <div className="flex items-center justify-between">
            <h1>Chief of Staff</h1>
            <div className="flex items-center gap-2">
              {/* Tab toggle icons */}
              <Button
                variant={activeTab === 'tasks' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => onTabChange('tasks')}
                title="Tasks"
              >
                <ListTodo className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onTabChange('meeting-actions')}
                title="Meeting Actions"
              >
                <MessageSquare className="w-5 h-5" />
              </Button>

              {/* Separator */}
              <div className="w-px h-6 bg-border mx-1" />

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

              <ProjectManagerSheet
                projects={projects}
                onCreateProject={handlers.handleCreateProject}
                onUpdateProject={handlers.handleUpdateProject}
                onDeleteProject={handlers.handleDeleteProject}
              />
            </div>
          </div>

          {/* Expandable Filter Panel */}
          {isFilterPanelOpen && (
            <FilterPanel
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filterGroup={filterGroup}
              setFilterGroup={setFilterGroup}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              filterProject={filterProject}
              setFilterProject={setFilterProject}
              projects={projects}
              onResetFilters={handleResetFilters}
            />
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <QuickAddBar onAdd={handlers.handleQuickAdd} projects={projects} />

        <div className="space-y-8">
          {/* Personal Focus Section */}
          <TaskSection
            section="personal-focus"
            tasks={tasksBySection['personal-focus']}
            projects={projects}
            attachmentCounts={attachmentCounts}
            onToggleStatus={handlers.handleToggleStatus}
            onTaskClick={handleTaskClick}
            onSnooze={handlers.handleSnooze}
            onArchive={handlers.handleArchiveTask}
            onDragStart={handlers.handleDragStart}
            onDragOver={handlers.handleDragOver}
            onDrop={handlers.handleDrop}
            onUpdateTitle={handlers.handleUpdateTitle}
            isCollapsible={true}
            defaultCollapsed={false}
          />

          {/* To Read Section */}
          <SpecialTaskSection
            variant="to-read"
            tasks={toReadTasks}
            projects={projects}
            onToggleStatus={handlers.handleToggleStatus}
            onTaskClick={handleTaskClick}
            onArchive={handlers.handleArchiveTask}
            onDelete={handlers.handleDeleteTask}
            defaultCollapsed={false}
          />

          {/* Work Focus Section */}
          <SpecialTaskSection
            variant="work-focus"
            tasks={workFocusTasks}
            projects={projects}
            onToggleStatus={handlers.handleToggleStatus}
            onTaskClick={handleTaskClick}
            onArchive={handlers.handleArchiveTask}
            onDelete={handlers.handleDeleteTask}
          />

          {/* Date-based sections */}
          {DATE_SECTIONS.map((section) => (
            <TaskSection
              key={section}
              section={section}
              tasks={tasksBySection[section]}
              projects={projects}
              attachmentCounts={attachmentCounts}
              onToggleStatus={handlers.handleToggleStatus}
              onTaskClick={handleTaskClick}
              onSnooze={handlers.handleSnooze}
              onArchive={handlers.handleArchiveTask}
              onDragStart={handlers.handleDragStart}
              onDragOver={handlers.handleDragOver}
              onDrop={handlers.handleDrop}
              onUpdateTitle={handlers.handleUpdateTitle}
            />
          ))}
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
        onUpdate={handlers.handleTaskUpdate}
        onDelete={handlers.handleDeleteTask}
      />
    </PageLayout>
  );
}
