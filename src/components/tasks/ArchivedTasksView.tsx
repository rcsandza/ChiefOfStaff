import React, { useState, useEffect } from 'react';
import { Task, Project } from '@/utils/types';
import { fetchArchivedTasks, updateTask } from '@/utils/api';
import { formatDate, formatTimestamp } from '@/utils/dateUtils';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Briefcase, Calendar } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { MarkdownContent } from '@/components/shared/MarkdownContent';
import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { PageLayout } from '@/components/shared/PageLayout';
import { ProjectBadge } from '@/components/shared/ProjectBadge';

interface ArchivedTasksViewProps {
  onBack: () => void;
  projects: Project[];
}

export function ArchivedTasksView({ onBack, projects }: ArchivedTasksViewProps) {
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    loadArchivedTasks();
  }, []);
  
  const loadArchivedTasks = async () => {
    try {
      setIsLoading(true);
      const tasks = await fetchArchivedTasks();
      // Sort by completion date (most recent first)
      tasks.sort((a, b) => {
        if (!a.completed_at) return 1;
        if (!b.completed_at) return -1;
        return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime();
      });
      setArchivedTasks(tasks);
    } catch (error) {
      toast.error('Failed to load archived tasks');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleUnarchive = async (task: Task) => {
    try {
      const updated = await updateTask(task.id, { 
        archived_at: null,
        status: 'open'
      });
      setArchivedTasks(archivedTasks.filter(t => t.id !== task.id));
      toast.success('Task unarchived');
    } catch (error) {
      toast.error('Failed to unarchive task');
    }
  };
  
  const getProject = (projectId: string | null) => {
    if (!projectId) return null;
    return projects.find(p => p.id === projectId);
  };
  
  if (isLoading) {
    return <LoadingScreen message="Loading archived tasks..." />;
  }
  
  return (
    <PageLayout>
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
             
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1>Archived Tasks</h1>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {archivedTasks.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No archived tasks yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {archivedTasks.map((task) => {
              const project = getProject(task.project_id);
              
              return (
                <div
                  key={task.id}
                  className="bg-card border border-border p-4"
                  style={{ boxShadow: 'var(--elevation-sm)' }}
                >
                  <div className="flex items-start gap-3">
                    {/* Group icon */}
                    <div
                      className="inline-flex items-center justify-center w-5 h-5 rounded flex-shrink-0 mt-0.5"
                      style={{
                        backgroundColor: task.group === 'work' ? 'var(--color-accent)' : 'var(--color-primary)',
                        color: 'white',
                        borderRadius: 'var(--radius)',
                      }}
                    >
                      {task.group === 'work' ? <Briefcase className="w-3 h-3" /> : <User className="w-3 h-3" />}
                    </div>
                    
                    {/* Checkbox (checked and disabled) */}
                    <div className="mt-0.5">
                      <Checkbox checked={true} disabled />
                    </div>
                    
                    {/* Task Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="line-through opacity-70">{task.title}</span>

                        {/* Project tag */}
                        {project && <ProjectBadge project={project} />}
                      </div>
                      
                      {/* Metadata */}
                      <div className="flex items-center gap-4 text-muted-foreground caption flex-wrap">
                        {task.completed_at && (
                          <div className="flex items-center gap-1">
                            <span>Completed:</span>
                            <span>{formatTimestamp(task.completed_at)}</span>
                          </div>
                        )}
                        
                        {task.due_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>Due: {formatDate(task.due_date)}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Description preview */}
                      {task.description && (
                        <div className="mt-2 text-muted-foreground caption line-clamp-2">
                          <MarkdownContent content={task.description} />
                        </div>
                      )}
                    </div>
                    
                    {/* Unarchive Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnarchive(task)}
                     
                      className="flex-shrink-0"
                    >
                      Restore
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </PageLayout>
  );
}
