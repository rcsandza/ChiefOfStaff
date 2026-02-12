import React, { useState } from 'react';
import { Task, Project, DateSection } from '../utils/types';
import { getSectionTitle, getSectionEmptyMessage } from '../utils/dateUtils';
import { TaskCard } from './TaskCard';
import { ChevronDown } from 'lucide-react';
import { Button } from './ui/button';

interface TaskSectionProps {
  section: DateSection;
  tasks: Task[];
  projects: Project[];
  attachmentCounts: Record<string, number>;
  onToggleStatus: (id: string, status: 'open' | 'done') => void;
  onTaskClick: (task: Task) => void;
  onSnooze: (id: string) => void;
  onArchive?: (id: string) => void;
  onDragStart: (e: React.DragEvent, task: Task) => void;
  onDragOver: (e: React.DragEvent, section: DateSection, taskId?: string | null) => void;
  onDrop: (e: React.DragEvent, section: DateSection, dropPosition: { beforeTaskId: string | null; afterTaskId: string | null }) => void;
  onUpdateTitle?: (id: string, title: string) => void;
  isCollapsible?: boolean;
  defaultCollapsed?: boolean;
}

export function TaskSection({
  section,
  tasks,
  projects,
  attachmentCounts,
  onToggleStatus,
  onTaskClick,
  onSnooze,
  onArchive,
  onDragStart,
  onDragOver,
  onDrop,
  onUpdateTitle,
  isCollapsible = false,
  defaultCollapsed = false,
}: TaskSectionProps) {
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<'before' | 'after' | null>(null);
  const [isDragOverSection, setIsDragOverSection] = useState(false);
  const [snoozedTasks, setSnoozedTasks] = useState<Set<string>>(new Set());
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  
  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggingTaskId(task.id);
    onDragStart(e, task);
  };
  
  const handleDragEnd = () => {
    setDraggingTaskId(null);
    setDragOverTaskId(null);
    setDragPosition(null);
    setIsDragOverSection(false);
  };
  
  const handleDragOverTask = (e: React.DragEvent, taskId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    
    if (taskId === draggingTaskId) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const position = e.clientY < midpoint ? 'before' : 'after';
    
    setDragOverTaskId(taskId);
    setDragPosition(position);
    onDragOver(e, section, taskId);
  };
  
  const handleDropOnTask = (e: React.DragEvent, taskId: string, taskIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const position = e.clientY < midpoint ? 'before' : 'after';
    
    let beforeTaskId: string | null = null;
    let afterTaskId: string | null = null;
    
    if (position === 'before') {
      afterTaskId = taskId;
      beforeTaskId = taskIndex > 0 ? visibleTasks[taskIndex - 1].id : null;
    } else {
      beforeTaskId = taskId;
      afterTaskId = taskIndex < visibleTasks.length - 1 ? visibleTasks[taskIndex + 1].id : null;
    }
    
    handleDragEnd();
    onDrop(e, section, { beforeTaskId, afterTaskId });
  };
  
  const handleSnooze = async (taskId: string) => {
    setSnoozedTasks(prev => new Set(prev).add(taskId));
    await onSnooze(taskId);
    
    // Show undo option for 3 seconds
    setTimeout(() => {
      setSnoozedTasks(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }, 3000);
  };
  
  const visibleTasks = tasks.filter(t => !snoozedTasks.has(t.id));
  
  const handleDropOnSection = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Drop at the end of the section
    const beforeTaskId = visibleTasks.length > 0 ? visibleTasks[visibleTasks.length - 1].id : null;
    const afterTaskId = null;
    
    setIsDragOverSection(false);
    handleDragEnd();
    onDrop(e, section, { beforeTaskId, afterTaskId });
  };
  
  const handleSectionDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOverSection(true);
    setDragOverTaskId(null);
    onDragOver(e, section, null);
  };
  
  const handleSectionDragLeave = (e: React.DragEvent) => {
    // Only set to false if we're leaving the section container entirely
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOverSection(false);
    }
  };
  
  return (
    <div className="mb-8">
      <div className="mb-4 flex items-center gap-2">
        {isCollapsible ? (
          <Button
            variant="ghost"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-auto p-0 hover:bg-transparent flex items-center gap-2"
          >
            <ChevronDown 
              className={`w-4 h-4 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
            />
            <h2 className="flex items-center gap-2">
              {getSectionTitle(section)}
              <span className="text-muted-foreground caption">
                ({visibleTasks.length})
              </span>
            </h2>
          </Button>
        ) : (
          <h2 className="flex items-center gap-2">
            {getSectionTitle(section)}
            <span className="text-muted-foreground caption">
              ({visibleTasks.length})
            </span>
          </h2>
        )}
      </div>
      
      {!isCollapsed && (
        <div
          className={`space-y-0 min-h-[60px] rounded-lg transition-colors ${
            isDragOverSection && !dragOverTaskId ? 'bg-accent/10 border-2 border-dashed border-accent' : ''
          }`}
          onDragOver={handleSectionDragOver}
          onDragLeave={handleSectionDragLeave}
          onDrop={handleDropOnSection}
        >
        {visibleTasks.length === 0 ? (
          <div 
            className="text-center py-8 text-muted-foreground"
            onDragOver={handleSectionDragOver}
            onDrop={handleDropOnSection}
          >
            {getSectionEmptyMessage(section)}
          </div>
        ) : (
          visibleTasks.map((task, index) => (
            <div
              key={task.id}
              draggable
              onDragStart={(e) => handleDragStart(e, task)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOverTask(e, task.id)}
              onDrop={(e) => handleDropOnTask(e, task.id, index)}
              className="relative"
            >
              {/* Drop indicator */}
              {dragOverTaskId === task.id && dragPosition === 'before' && draggingTaskId !== task.id && (
                <div className="absolute -top-1.5 left-0 right-0 h-0.5 bg-primary z-10" />
              )}
              
              <TaskCard
                task={task}
                projects={projects}
                attachmentCount={attachmentCounts[task.id] || 0}
                onToggleStatus={onToggleStatus}
                onClick={() => onTaskClick(task)}
                isDragging={draggingTaskId === task.id}
                showSnooze={section === 'today'}
                onSnooze={handleSnooze}
                onArchive={onArchive}
                onUpdateTitle={onUpdateTitle}
              />
              
              {/* Drop indicator */}
              {dragOverTaskId === task.id && dragPosition === 'after' && draggingTaskId !== task.id && (
                <div className="absolute -bottom-1.5 left-0 right-0 h-0.5 bg-primary z-10" />
              )}
            </div>
          ))
        )}
        </div>
      )}
    </div>
  );
}
