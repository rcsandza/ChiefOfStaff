import React, { useState } from 'react';
import { Plus, Calendar, Briefcase, User, AlignLeft, Target, BookOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Project } from '@/utils/types';
import { formatDateISO, getToday } from '@/utils/dateUtils';

interface QuickAddBarProps {
  onAdd: (data: {
    title: string;
    description?: string;
    due_date?: string | null;
    group?: 'personal' | 'work';
    project_id?: string | null;
    task_type?: 'regular' | 'work-focus' | 'to-read';
  }) => void;
  projects: Project[];
}

export function QuickAddBar({ onAdd, projects }: QuickAddBarProps) {
  // Default date to "This Week" (tomorrow)
  const getDefaultDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  };

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showDescription, setShowDescription] = useState(false);
  const [dueDate, setDueDate] = useState<Date | undefined>(getDefaultDate());
  const [group, setGroup] = useState<'personal' | 'work'>('work');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [taskType, setTaskType] = useState<'regular' | 'work-focus' | 'to-read'>('regular');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onAdd({
        title: title.trim(),
        description: description.trim(),
        due_date: (taskType === 'work-focus' || taskType === 'to-read') ? null : (dueDate ? formatDateISO(dueDate) : null),
        group: taskType === 'work-focus' ? 'work' : group,
        project_id: projectId,
        task_type: taskType,
      });
      
      // Reset form
      setTitle('');
      setDescription('');
      setShowDescription(false);
      setDueDate(getDefaultDate());
      setGroup('work');
      setProjectId(null);
      setTaskType('regular');
    }
  };
  
  const getDateButtonText = () => {
    if (!dueDate) return 'Backlog';

    const today = getToday();
    const selected = new Date(dueDate);
    selected.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (selected.getTime() === today.getTime()) return 'Today';
    if (selected.getTime() === tomorrow.getTime()) return 'This Week';

    return dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  const setQuickDate = (days: number | null) => {
    if (days === null) {
      setDueDate(undefined);
    } else {
      const date = new Date();
      date.setDate(date.getDate() + days);
      setDueDate(date);
    }
    setIsCalendarOpen(false);
  };
  
  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <div className="bg-card border border-border p-4" style={{ borderRadius: 'var(--radius-card)' }}>
        <div className="flex gap-2 mb-3">
          <div className="flex-1">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add a task..."
              className="w-full border-0 shadow-none px-0 focus-visible:ring-0"
              style={{ background: 'transparent' }}
            />
          </div>
        </div>
        
        {/* Description Field (conditionally shown) */}
        {showDescription && (
          <div className="mb-3 flex-1">
            <RichTextEditor
              content={description}
              onChange={setDescription}
              placeholder="Add a description..."
              minHeight="200px"
            />
          </div>
        )}
        
        <div className="flex items-center gap-2 flex-wrap">
          {/* Task Type Selector */}
          <Select value={taskType} onValueChange={(value: 'regular' | 'work-focus' | 'to-read') => {
            setTaskType(value);
            // Auto-show description field for work-focus and to-read
            if (value === 'work-focus' || value === 'to-read') {
              setShowDescription(true);
            }
          }}>
            <SelectTrigger
              className="w-auto gap-2"
                          >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="regular">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Regular Task
                </div>
              </SelectItem>
              <SelectItem value="work-focus">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Work Focus
                </div>
              </SelectItem>
              <SelectItem value="to-read">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  To Read
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          
          {/* Description Toggle Button */}
          <Button
            type="button"
            variant={showDescription ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowDescription(!showDescription)}
            className="gap-2"
                      >
            <AlignLeft className="w-4 h-4" />
          </Button>
          
          {/* Due Date Selector - Only show for regular tasks */}
          {taskType === 'regular' && (
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                              >
                <Calendar className="w-4 h-4" />
                {getDateButtonText()}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-3 border-b border-border">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuickDate(0)}
                                      >
                    Today
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuickDate(1)}
                                      >
                    This Week
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuickDate(7)}
                                      >
                    Next Week
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuickDate(14)}
                                      >
                    After Next Week
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuickDate(null)}
                                      >
                    Backlog
                  </Button>
                </div>
              </div>
              <CalendarComponent
                mode="single"
                selected={dueDate}
                onSelect={(date) => {
                  setDueDate(date);
                  setIsCalendarOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          )}
          
          {/* Group Selector - Only show for regular tasks */}
          {taskType === 'regular' && (
            <Select value={group} onValueChange={(value: 'personal' | 'work') => setGroup(value)}>
            <SelectTrigger
              className="w-auto gap-2"
                          >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="personal">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Personal
                </div>
              </SelectItem>
              <SelectItem value="work">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Work
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          )}
          
          {/* Project Selector */}
          {projects.length > 0 && (
            <Select value={projectId || 'none'} onValueChange={(value) => setProjectId(value === 'none' ? null : value)}>
              <SelectTrigger
                className="w-auto"
                              >
                <SelectValue placeholder="No project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: project.color }}
                      />
                      {project.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          <div className="flex-1" />
          
          {/* Add Button */}
          <Button
            type="submit"
            className="gap-2"
                      >
            <Plus className="w-4 h-4" />
            Add Task
          </Button>
        </div>
      </div>
    </form>
  );
}
