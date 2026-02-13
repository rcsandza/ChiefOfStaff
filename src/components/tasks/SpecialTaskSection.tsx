import React, { useState } from 'react';
import { Task, Project } from '@/utils/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Archive, Trash2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarkdownContent } from '@/components/shared/MarkdownContent';
import { ProjectBadge } from '@/components/shared/ProjectBadge';

interface SpecialTaskSectionProps {
  variant: 'work-focus' | 'to-read';
  tasks: Task[];
  projects: Project[];
  onToggleStatus: (id: string, status: 'open' | 'done') => void;
  onTaskClick: (task: Task) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  defaultCollapsed?: boolean;
}

export function SpecialTaskSection({
  variant,
  tasks,
  projects,
  onToggleStatus,
  onTaskClick,
  onArchive,
  onDelete,
  defaultCollapsed = false,
}: SpecialTaskSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const isToRead = variant === 'to-read';
  const title = isToRead ? 'To Read' : 'Work Focus';
  const emptyMessage = isToRead ? 'No reading items yet' : 'No work focus items yet';
  const deleteConfirmMessage = `Are you sure you want to delete this ${title} item?`;

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
    if (onDelete && confirm(deleteConfirmMessage)) {
      onDelete(taskId);
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-2">
          {isToRead ? (
            <Button
              variant="ghost"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-auto p-0 hover:bg-transparent flex items-center gap-2"
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
              />
              <h2 className="flex items-center gap-2">
                {title}
                <span className="text-muted-foreground caption">(0)</span>
              </h2>
            </Button>
          ) : (
            <h2 className="flex items-center gap-2">
              {title}
              <span className="text-muted-foreground caption">(0)</span>
            </h2>
          )}
        </div>
        {(!isToRead || !isCollapsed) && (
          <div className="text-center py-8 text-muted-foreground">
            {emptyMessage}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="mb-4 flex items-center gap-2">
        {isToRead ? (
          <Button
            variant="ghost"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-auto p-0 hover:bg-transparent flex items-center gap-2"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
            />
            <h2 className="flex items-center gap-2">
              {title}
              <span className="text-muted-foreground caption">({tasks.length})</span>
            </h2>
          </Button>
        ) : (
          <h2 className="flex items-center gap-2">
            {title}
            <span className="text-muted-foreground caption">({tasks.length})</span>
          </h2>
        )}
      </div>

      {(!isToRead || !isCollapsed) && (
        <div className={isToRead ? 'border border-border' : 'space-y-3'}>
          {tasks.map((task, index) => {
            const project = task.project_id
              ? projects.find(p => p.id === task.project_id)
              : null;

            return (
              <div
                key={task.id}
                className={
                  isToRead
                    ? `bg-card p-3 cursor-pointer hover:bg-accent/5 transition-all ${
                        index !== tasks.length - 1 ? 'border-b border-border' : ''
                      }`
                    : 'bg-card border border-border p-4 cursor-pointer hover:shadow-sm transition-all'
                }
                onClick={() => onTaskClick(task)}
              >
                <div className={`flex items-start ${isToRead ? 'gap-2' : 'gap-3'}`}>
                  {/* Checkbox */}
                  <div
                    className={isToRead ? 'mt-0.5 flex-shrink-0' : 'mt-1 flex-shrink-0'}
                    onClick={(e) => handleCheckboxClick(e, task)}
                  >
                    <Checkbox
                      checked={task.status === 'done'}
                      className={isToRead ? 'w-4 h-4' : 'w-5 h-5'}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Title and Project */}
                    <div className={`flex items-center gap-2 ${isToRead ? 'mb-1' : 'mb-2'}`}>
                      <h3
                        className={`flex-1 ${task.status === 'done' ? 'line-through opacity-60' : ''}`}
                        style={{
                          fontSize: isToRead ? 'var(--text-sm)' : 'var(--text-base)',
                          fontWeight: isToRead ? 'var(--font-weight-medium)' : 'var(--font-weight-bold)',
                        }}
                      >
                        {task.title}
                      </h3>

                      {project && (
                        <ProjectBadge
                          project={project}
                          size={isToRead ? 'sm' : 'md'}
                          showDot={true}
                        />
                      )}
                    </div>

                    {/* Description - Always visible */}
                    {task.description && (
                      <div
                        className={isToRead ? 'text-muted-foreground mt-1' : 'text-muted-foreground mt-2'}
                        style={{
                          fontSize: isToRead ? 'var(--text-xs)' : 'var(--text-sm)',
                        }}
                      >
                        <MarkdownContent content={task.description} />
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className={`flex items-center flex-shrink-0 ${isToRead ? 'gap-0.5' : 'gap-1'}`}>
                    {onArchive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleArchive(e, task.id)}
                        className={isToRead ? 'h-6 w-6 p-0' : 'h-8 w-8 p-0'}
                        title="Archive"
                      >
                        <Archive className={isToRead ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDelete(e, task.id)}
                        className={isToRead ? 'h-6 w-6 p-0' : 'h-8 w-8 p-0'}
                        title="Delete"
                      >
                        <Trash2 className={`${isToRead ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-destructive`} />
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
