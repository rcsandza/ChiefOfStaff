import React from 'react';
import { MeetingAction } from '@/utils/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, CheckCircle2, X } from 'lucide-react';

interface MeetingActionCardProps {
  action: MeetingAction;
  onKeep?: (action: MeetingAction) => void;
  onPromote: (action: MeetingAction) => void;
  onDismiss: (action: MeetingAction) => void;
}

export function MeetingActionCard({ action, onKeep, onPromote, onDismiss }: MeetingActionCardProps) {
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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="p-4 border border-border rounded-lg bg-card">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="font-medium flex-1">{action.title}</h4>
        {getStatusBadge()}
      </div>

      {action.context && (
        <p className="text-sm text-muted-foreground mb-3">{action.context}</p>
      )}

      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
        <div>
          <span className="font-medium">Assignee:</span> {action.assignee_name}
        </div>
        {action.due_date && (
          <div>
            <span className="font-medium">Due:</span> {formatDate(action.due_date)}
          </div>
        )}
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
