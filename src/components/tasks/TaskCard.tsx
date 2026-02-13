import React, { useState, useEffect, useRef } from 'react';
import { Task, Project, Attachment } from '@/utils/types';
import { formatDate, getDaysOverdue } from '@/utils/dateUtils';
import { Checkbox } from '@/components/ui/checkbox';
import { Paperclip, User, Briefcase, Clock, Check, ChevronDown, Edit, Download, FileText, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { fetchAttachments } from '@/utils/api';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';

interface TaskCardProps {
  task: Task;
  projects: Project[];
  attachmentCount: number;
  onToggleStatus: (id: string, status: 'open' | 'done') => void;
  onClick: () => void;
  isDragging?: boolean;
  showSnooze?: boolean;
  onSnooze?: (id: string) => void;
  onArchive?: (id: string) => void;
  onUpdateTitle?: (id: string, title: string) => void;
}

export function TaskCard({ task, projects, attachmentCount, onToggleStatus, onClick, isDragging, showSnooze, onSnooze, onArchive, onUpdateTitle }: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
  const editContainerRef = useRef<HTMLDivElement>(null);
  const project = task.project_id ? projects.find(p => p.id === task.project_id) : null;
  const daysOverdue = getDaysOverdue(task.due_date);
  const isOverdue = daysOverdue > 0;
  
  // Fetch attachments when expanded
  useEffect(() => {
    if (isExpanded && attachmentCount > 0 && attachments.length === 0 && !isLoadingAttachments) {
      setIsLoadingAttachments(true);
      fetchAttachments(task.id).then((data) => {
        setAttachments(data);
        setIsLoadingAttachments(false);
      }).catch((error) => {
        console.error('Error loading attachments:', error);
        setIsLoadingAttachments(false);
      });
    }
  }, [isExpanded, task.id, attachmentCount, attachments.length, isLoadingAttachments]);
  
  // Handle click outside to discard changes
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isEditingTitle && editContainerRef.current && !editContainerRef.current.contains(event.target as Node)) {
        handleCancelEdit();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditingTitle]);
  
  const handleSaveTitle = () => {
    if (editedTitle.trim() && editedTitle !== task.title && onUpdateTitle) {
      onUpdateTitle(task.id, editedTitle.trim());
    }
    setIsEditingTitle(false);
  };
  
  const handleCancelEdit = () => {
    setEditedTitle(task.title);
    setIsEditingTitle(false);
  };
  
  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div
        className={`bg-card border border-border transition-all ${isDragging ? 'opacity-50' : ''}`}
        style={{ borderRadius: 'var(--radius-card)', boxShadow: 'var(--elevation-sm)' }}
      >
        <div className="p-3">
          <div className="flex items-center gap-2">
        {/* Group icon on the left */}
        <div
          className="inline-flex items-center justify-center w-5 h-5 rounded flex-shrink-0"
          style={{
            backgroundColor: task.group === 'work' ? 'var(--color-accent)' : 'var(--color-primary)',
            color: 'white',
            borderRadius: 'var(--radius)',
          }}
        >
          {task.group === 'work' ? <Briefcase className="w-3 h-3" /> : <User className="w-3 h-3" />}
        </div>
        
        <div
          onClick={(e) => {
            e.stopPropagation();
            onToggleStatus(task.id, task.status === 'open' ? 'done' : 'open');
          }}
        >
          <Checkbox checked={task.status === 'done'} />
        </div>
        
        <div 
          className="flex-1 min-w-0 flex items-center justify-between gap-2 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Task title */}
            {isEditingTitle ? (
              <div 
                ref={editContainerRef}
                className="flex items-center gap-2 min-w-0 flex-1" 
                onClick={(e) => e.stopPropagation()}
              >
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveTitle();
                    } else if (e.key === 'Escape') {
                      handleCancelEdit();
                    }
                  }}
                  className="h-8 flex-1"
                  style={{ borderRadius: 'var(--radius-input)' }}
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSaveTitle}
                  className="h-8 w-8 p-0 flex-shrink-0"
                  style={{ borderRadius: 'var(--radius-button)' }}
                >
                  <Check className="w-4 h-4 text-primary" />
                </Button>
              </div>
            ) : (
              <div 
                className={`flex-shrink min-w-0 cursor-text ${task.status === 'done' ? 'opacity-50 line-through' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingTitle(true);
                }}
              >
                {task.title}
              </div>
            )}
            
            {/* Project tag */}
            {project && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded caption flex-shrink-0"
                style={{
                  backgroundColor: project.color + '20',
                  color: project.color,
                  borderRadius: 'var(--radius)',
                }}
              >
                {project.name}
              </span>
            )}
            
            {/* Overdue badge */}
            {isOverdue && task.status === 'open' && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded caption flex-shrink-0"
                style={{
                  backgroundColor: 'var(--color-destructive)',
                  color: 'var(--color-destructive-foreground)',
                  borderRadius: 'var(--radius)',
                }}
              >
                {daysOverdue} {daysOverdue === 1 ? 'day' : 'days'} overdue
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Description indicator */}
            {task.description && (
              <FileText className="w-4 h-4 text-muted-foreground" />
            )}
            
            {/* Attachment indicator */}
            {attachmentCount > 0 && (
              <Paperclip className="w-4 h-4 text-muted-foreground" />
            )}
            {/* Snooze button */}
            {showSnooze && task.status === 'open' && onSnooze && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onSnooze(task.id);
                }}
                className="h-auto p-1"
              >
                <Clock className="w-4 h-4 text-muted-foreground" />
              </Button>
            )}
            
            {/* Archive button - only show when task is done */}
            {task.status === 'done' && onArchive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onArchive(task.id);
                }}
                className="h-auto p-1"
                title="Archive task"
              >
                <Archive className="w-4 h-4 text-muted-foreground" />
              </Button>
            )}
            
            {/* Expand/Collapse chevron */}
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-1"
                onClick={(e) => e.stopPropagation()}
              >
                <ChevronDown 
                  className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                />
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>
      </div>
    </div>
    
    {/* Expanded Details */}
    <CollapsibleContent>
      <div className="px-3 pb-3 pt-2 border-t border-border">
        {/* Header with Due Date and Edit Icon */}
        <div className="flex items-center justify-between mb-3">
          {/* Due Date */}
          {task.due_date && (
            <div className="flex items-center gap-2">
              <span className="caption text-muted-foreground">Due:</span>
              <span className="caption">{formatDate(task.due_date)}</span>
            </div>
          )}
          
          {/* Edit Icon Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="h-auto p-1 ml-auto"
          >
            <Edit className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
        
        {/* Description */}
        {task.description && (
          <div className="mb-3">
            <span className="caption text-muted-foreground block mb-1">Description:</span>
            <div className="text-foreground prose prose-sm max-w-none" style={{ fontSize: 'var(--text-sm)' }}>
              <ReactMarkdown
                remarkPlugins={[remarkBreaks]}
                components={{
                  a: ({ node, ...props }) => (
                    <a
                      {...props}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ),
                }}
              >
                {task.description}
              </ReactMarkdown>
            </div>
          </div>
        )}
        
        {/* Attachments */}
        {attachmentCount > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-muted-foreground" />
              <span className="caption text-muted-foreground">
                {attachmentCount} {attachmentCount === 1 ? 'attachment' : 'attachments'}
              </span>
            </div>
            
            {/* Attachment Links */}
            {isLoadingAttachments ? (
              <div className="caption text-muted-foreground pl-6">Loading attachments...</div>
            ) : (
              <div className="space-y-1 pl-6">
                {attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center gap-2">
                    <a
                      href={attachment.signed_url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="caption text-primary hover:underline flex-1 truncate"
                      onClick={(e) => {
                        if (!attachment.signed_url) {
                          e.preventDefault();
                          console.error('No signed URL available for attachment');
                        }
                      }}
                    >
                      {attachment.file_name}
                    </a>
                    <a
                      href={attachment.signed_url || '#'}
                      download={attachment.file_name}
                      className="flex-shrink-0"
                      onClick={(e) => {
                        if (!attachment.signed_url) {
                          e.preventDefault();
                          console.error('No signed URL available for attachment');
                        }
                      }}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-1"
                      >
                        <Download className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </CollapsibleContent>
  </div>
</Collapsible>
  );
}
