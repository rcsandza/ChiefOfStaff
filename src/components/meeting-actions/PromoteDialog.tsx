import React, { useState, useEffect } from 'react';
import { MeetingAction, Project } from '@/utils/types';
import { createTask, updateMeetingAction, fetchProjects } from '@/utils/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { formatDateISO } from '@/utils/dateUtils';

interface PromoteDialogProps {
  action: MeetingAction | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PromoteDialog({ action, isOpen, onClose, onSuccess }: PromoteDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [group, setGroup] = useState<'personal' | 'work'>('work');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (action && isOpen) {
      // Pre-fill form with action data
      setTitle(action.title);

      // Build rich description with all action item metadata
      const descriptionParts = [action.context];

      // Add separator
      descriptionParts.push('\n---');

      // Add assignee info
      if (action.assignee_name) {
        const assigneeInfo = action.assignee_email
          ? `Assignee: ${action.assignee_name} (${action.assignee_email})`
          : `Assignee: ${action.assignee_name}`;
        descriptionParts.push(assigneeInfo);
      }

      // Add due date if available
      if (action.due_date) {
        descriptionParts.push(`Due date: ${action.due_date}`);
      }

      // Add meeting info
      descriptionParts.push(`From meeting: ${action.source_meeting_title}`);
      descriptionParts.push(`Meeting date: ${action.source_meeting_date}`);

      // Add meeting URL if available
      if (action.source_meeting_url) {
        descriptionParts.push(`Meeting URL: ${action.source_meeting_url}`);
      }

      setDescription(descriptionParts.join('\n'));

      // Set due date if available
      if (action.due_date) {
        try {
          setDueDate(new Date(action.due_date));
        } catch {
          setDueDate(undefined);
        }
      } else {
        setDueDate(undefined);
      }

      // Default to work group
      setGroup('work');
      setProjectId(null);

      // Load projects
      loadProjects();
    }
  }, [action, isOpen]);

  const loadProjects = async () => {
    const { data, error } = await fetchProjects();
    if (data) {
      setProjects(data);
    } else if (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const handlePromote = async () => {
    if (!action || !title.trim()) return;

    setIsLoading(true);
    try {
      // Create task
      const task = await createTask({
        title,
        description,
        group,
        project_id: projectId,
        due_date: dueDate ? formatDateISO(dueDate) : null,
        task_type: 'regular',
      });

      // Update meeting action status
      await updateMeetingAction(action.id, {
        status: 'promoted',
        promoted_task_id: task.id,
      });

      toast.success('Action promoted to task');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error('Failed to promote action');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateDisplay = (date: Date | undefined): string => {
    if (!date) return 'Pick a date';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Promote to Task</DialogTitle>
          <DialogDescription>
            Create a task from this meeting action item
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Task description"
              rows={6}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="group">Group</Label>
              <Select value={group} onValueChange={(value) => setGroup(value as 'personal' | 'work')}>
                <SelectTrigger id="group">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="work">Work</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="project">Project (optional)</Label>
              <Select value={projectId || 'none'} onValueChange={(value) => setProjectId(value === 'none' ? null : value)}>
                <SelectTrigger id="project">
                  <SelectValue placeholder="Select project" />
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
            </div>
          </div>

          <div>
            <Label htmlFor="due-date">Due Date (optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="due-date"
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formatDateDisplay(dueDate)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handlePromote} disabled={isLoading || !title.trim()}>
            {isLoading ? 'Promoting...' : 'Promote to Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
