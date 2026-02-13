import React, { useState } from 'react';
import { MeetingAction } from '@/utils/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ExternalLink, CheckCircle2, X, CalendarIcon, AlertCircle } from 'lucide-react';
import { getDaysOverdue, formatDate as formatDateUtil } from '@/utils/dateUtils';

interface MeetingActionCardProps {
  action: MeetingAction;
  onKeep?: (action: MeetingAction) => void;
  onPromote: (action: MeetingAction) => void;
  onDismiss: (action: MeetingAction) => void;
  onUpdateDueDate?: (action: MeetingAction, date: string | null) => void;
  showMeetingSource?: boolean;
}

export function MeetingActionCard({ action, onKeep, onPromote, onDismiss, onUpdateDueDate, showMeetingSource }: MeetingActionCardProps) {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const getStatusBadge = () => {
    switch (action.status) {
      case 'new':
        return <Badge variant="default" className="bg-blue-500">New</Badge>;
      case 'pending':
        return <Badge variant="default" className="bg-amber-500">Pending</Badge>;
      case 'promoted':
        return <Badge variant="default" className="bg-green-500">Promoted</Badge>;
      case 'dismissed':
        return <Badge variant="secondary">Dismissed</Badge>;
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date && onUpdateDueDate) {
      const formattedDate = date.toISOString().split('T')[0];
      onUpdateDueDate(action, formattedDate);
      setIsDatePickerOpen(false);
    }
  };

  const handleClearDate = () => {
    if (onUpdateDueDate) {
      onUpdateDueDate(action, null);
      setIsDatePickerOpen(false);
    }
  };

  const isOverdue = action.due_date ? getDaysOverdue(action.due_date) > 0 : false;
  const isEditable = action.status === 'new' || action.status === 'pending';

  return (
    <div className="p-4 border border-border rounded-lg bg-card">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="font-medium flex-1">{action.title}</h4>
        {getStatusBadge()}
      </div>

      {action.context && (
        <p className="text-sm text-muted-foreground mb-3">{action.context}</p>
      )}

      {showMeetingSource && (
        <p className="text-xs text-muted-foreground mb-2">
          From: {action.source_meeting_title}
        </p>
      )}

      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
        <div>
          <span className="font-medium">Assignee:</span> {action.assignee_name}
        </div>
        {isEditable && onUpdateDueDate ? (
          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`gap-2 h-auto py-0 px-2 ${isOverdue ? 'text-red-500 hover:text-red-600' : ''}`}
              >
                {isOverdue && <AlertCircle className="w-4 h-4" />}
                <CalendarIcon className="w-4 h-4" />
                <span className={isOverdue ? 'text-red-500' : ''}>
                  {action.due_date ? formatDateUtil(action.due_date) : 'Set date'}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={action.due_date ? new Date(action.due_date + 'T00:00:00') : undefined}
                onSelect={handleDateSelect}
                initialFocus
              />
              {action.due_date && (
                <div className="p-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearDate}
                    className="w-full"
                  >
                    Clear Date
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        ) : action.due_date ? (
          <div className={isOverdue ? 'text-red-500' : ''}>
            {isOverdue && <AlertCircle className="inline w-4 h-4 mr-1" />}
            <span className="font-medium">Due:</span> {formatDateUtil(action.due_date)}
          </div>
        ) : null}
      </div>

      {action.status === 'new' && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onKeep?.(action)}
            className="gap-2"
          >
            Keep
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={() => onPromote(action)}
            className="gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Promote to Task
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDismiss(action)}
            className="gap-2"
          >
            <X className="w-4 h-4" />
            Dismiss
          </Button>
        </div>
      )}

      {action.status === 'pending' && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={() => onPromote(action)}
            className="gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Promote to Task
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDismiss(action)}
            className="gap-2"
          >
            <X className="w-4 h-4" />
            Dismiss
          </Button>
        </div>
      )}

      {action.status === 'promoted' && action.promoted_task_id && (
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">Promoted to task ID:</span> {action.promoted_task_id}
        </div>
      )}
    </div>
  );
}
