import React, { useState } from 'react';
import { Task, Project } from '@/utils/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Archive, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';

interface WorkFocusSectionProps {
  tasks: Task[];
  projects: Project[];
  onToggleStatus: (id: string, status: 'open' | 'done') => void;
  onTaskClick: (task: Task) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function WorkFocusSection({
  tasks,
  projects,
  onToggleStatus,
  onTaskClick,
  onArchive,
  onDelete,
}: WorkFocusSectionProps) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  
  const toggleExpanded = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };
  
  const handleCheckboxClick = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    onToggleStatus(task.id, task.status === 'open' ? 'done' : 'open');
  };
  
  const handleArchive = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    if (onArchive) {
      onArchive(taskId);
    }
  };
  
  const handleDelete = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    if (onDelete && confirm('Are you sure you want to delete this Work Focus item?')) {
      onDelete(taskId);
    }
  };
  
  if (tasks.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="mb-4 flex items-center gap-2">
          Work Focus
          <span className="text-muted-foreground caption">(0)</span>
        </h2>
        <div className="text-center py-8 text-muted-foreground">
          No work focus items yet
        </div>
      </div>
    );
  }
  
  return (
    <div className="mb-8">
      <h2 className="mb-4 flex items-center gap-2">
        Work Focus
        <span className="text-muted-foreground caption">({tasks.length})</span>
      </h2>
      
      <div className="space-y-3">
        {tasks.map((task) => {
          const project = task.project_id 
            ? projects.find(p => p.id === task.project_id)
            : null;
          const isExpanded = expandedTasks.has(task.id);
          
          return (
            <div
              key={task.id}
              className="bg-card border border-border p-4 cursor-pointer hover:shadow-sm transition-all"
              style={{ borderRadius: 'var(--radius-card)' }}
              onClick={() => onTaskClick(task)}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <div 
                  className="mt-1 flex-shrink-0"
                  onClick={(e) => handleCheckboxClick(e, task)}
                >
                  <Checkbox 
                    checked={task.status === 'done'}
                    className="w-5 h-5"
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  {/* Title and Project */}
                  <div className="flex items-center gap-2 mb-2">
                    <h3 
                      className={`flex-1 ${task.status === 'done' ? 'line-through opacity-60' : ''}`}
                      style={{
                        fontSize: 'var(--text-base)',
                        fontWeight: 'var(--font-weight-bold)',
                      }}
                    >
                      {task.title}
                    </h3>
                    
                    {project && (
                      <div 
                        className="flex items-center gap-1.5 px-2 py-1 border border-border"
                        style={{ 
                          borderRadius: 'var(--radius)',
                          fontSize: 'var(--text-xs)',
                        }}
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: project.color }}
                        />
                        <span>{project.name}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Description - Always visible for Work Focus */}
                  {task.description && (
                    <div 
                      className="text-muted-foreground prose prose-sm mt-2"
                      style={{
                        fontSize: 'var(--text-sm)',
                      }}
                    >
                      <ReactMarkdown>
                        {task.description}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {onArchive && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleArchive(e, task.id)}
                      className="h-8 w-8 p-0"
                      style={{ borderRadius: 'var(--radius-button)' }}
                      title="Archive"
                    >
                      <Archive className="w-4 h-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDelete(e, task.id)}
                      className="h-8 w-8 p-0"
                      style={{ borderRadius: 'var(--radius-button)' }}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
