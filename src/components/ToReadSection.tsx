import React, { useState } from 'react';
import { Task, Project } from '../utils/types';
import { Checkbox } from './ui/checkbox';
import { Archive, Trash2, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import ReactMarkdown from 'react-markdown';

interface ToReadSectionProps {
  tasks: Task[];
  projects: Project[];
  onToggleStatus: (id: string, status: 'open' | 'done') => void;
  onTaskClick: (task: Task) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  defaultCollapsed?: boolean;
}

export function ToReadSection({
  tasks,
  projects,
  onToggleStatus,
  onTaskClick,
  onArchive,
  onDelete,
  defaultCollapsed = false,
}: ToReadSectionProps) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  
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
    if (onDelete && confirm('Are you sure you want to delete this To Read item?')) {
      onDelete(taskId);
    }
  };
  
  if (tasks.length === 0) {
    return (
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-auto p-0 hover:bg-transparent flex items-center gap-2"
          >
            <ChevronDown 
              className={`w-4 h-4 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
            />
            <h2 className="flex items-center gap-2">
              To Read
              <span className="text-muted-foreground caption">(0)</span>
            </h2>
          </Button>
        </div>
        {!isCollapsed && (
          <div className="text-center py-8 text-muted-foreground">
            No reading items yet
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className="mb-8">
      <div className="mb-4 flex items-center gap-2">
        <Button
          variant="ghost"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-auto p-0 hover:bg-transparent flex items-center gap-2"
        >
          <ChevronDown 
            className={`w-4 h-4 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
          />
          <h2 className="flex items-center gap-2">
            To Read
            <span className="text-muted-foreground caption">({tasks.length})</span>
          </h2>
        </Button>
      </div>
      
      {!isCollapsed && (
        <div className="border border-border" style={{ borderRadius: 'var(--radius-card)' }}>
        {tasks.map((task, index) => {
          const project = task.project_id 
            ? projects.find(p => p.id === task.project_id)
            : null;
          const isExpanded = expandedTasks.has(task.id);
          
          return (
            <div
              key={task.id}
              className={`bg-card p-3 cursor-pointer hover:bg-accent/5 transition-all ${
                index !== tasks.length - 1 ? 'border-b border-border' : ''
              }`}
              onClick={() => onTaskClick(task)}
            >
              <div className="flex items-start gap-2">
                {/* Checkbox */}
                <div 
                  className="mt-0.5 flex-shrink-0"
                  onClick={(e) => handleCheckboxClick(e, task)}
                >
                  <Checkbox 
                    checked={task.status === 'done'}
                    className="w-4 h-4"
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  {/* Title and Project */}
                  <div className="flex items-center gap-2 mb-1">
                    <h3 
                      className={`flex-1 ${task.status === 'done' ? 'line-through opacity-60' : ''}`}
                      style={{
                        fontSize: 'var(--text-sm)',
                        fontWeight: 'var(--font-weight-medium)',
                      }}
                    >
                      {task.title}
                    </h3>
                    
                    {project && (
                      <div 
                        className="flex items-center gap-1 px-1.5 py-0.5 border border-border"
                        style={{ 
                          borderRadius: 'var(--radius)',
                          fontSize: 'var(--text-xs)',
                        }}
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: project.color }}
                        />
                        <span>{project.name}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Description - Always visible for To Read */}
                  {task.description && (
                    <div 
                      className="text-muted-foreground prose prose-sm mt-1"
                      style={{
                        fontSize: 'var(--text-xs)',
                      }}
                    >
                      <ReactMarkdown>
                        {task.description}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  {onArchive && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleArchive(e, task.id)}
                      className="h-6 w-6 p-0"
                      style={{ borderRadius: 'var(--radius-button)' }}
                      title="Archive"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDelete(e, task.id)}
                      className="h-6 w-6 p-0"
                      style={{ borderRadius: 'var(--radius-button)' }}
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        </div>
      )}
    </div>
  );
}
