import React from 'react';
import { MeetingAction, Meeting } from '@/utils/types';
import { MeetingActionCard } from './MeetingActionCard';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDateDisplay } from '@/utils/dateUtils';

interface MeetingGroupProps {
  meeting: Meeting | null;
  actions: MeetingAction[];
  onKeep: (action: MeetingAction) => void;
  onPromote: (action: MeetingAction) => void;
  onDismiss: (action: MeetingAction) => void;
  onUpdateDueDate?: (action: MeetingAction, date: string | null) => void;
}

export function MeetingGroup({ meeting, actions, onKeep, onPromote, onDismiss, onUpdateDueDate }: MeetingGroupProps) {
  const [isOpen, setIsOpen] = React.useState(() => {
    // Default to open if there are new or pending actions
    return actions.some(a => a.status === 'new' || a.status === 'pending');
  });

  // Use first action's metadata if meeting is not available
  const meetingTitle = meeting?.title || actions[0]?.source_meeting_title || 'Unknown Meeting';
  const meetingDate = meeting?.date || actions[0]?.source_meeting_date || '';
  const meetingUrl = meeting?.url || actions[0]?.source_meeting_url || null;

  const newCount = actions.filter(a => a.status === 'new').length;
  const pendingCount = actions.filter(a => a.status === 'pending').length;
  const promotedCount = actions.filter(a => a.status === 'promoted').length;
  const dismissedCount = actions.filter(a => a.status === 'dismissed').length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border border-border rounded-lg bg-card">
      <CollapsibleTrigger className="w-full p-4 flex items-start justify-between hover:bg-accent/50 transition-colors">
        <div className="flex items-start gap-3 flex-1">
          <div className="pt-1">
            {isOpen ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          <div className="text-left flex-1">
            <h3 className="font-semibold">{meetingTitle}</h3>
            {meetingDate && (
              <p className="text-sm text-muted-foreground mt-1">
                {formatDateDisplay(meetingDate)}
              </p>
            )}
            <div className="flex gap-3 mt-2 text-xs">
              {newCount > 0 && (
                <span className="text-blue-600 font-medium">
                  {newCount} new
                </span>
              )}
              {pendingCount > 0 && (
                <span className="text-amber-600 font-medium">
                  {pendingCount} pending
                </span>
              )}
              {promotedCount > 0 && (
                <span className="text-green-600 font-medium">
                  {promotedCount} promoted
                </span>
              )}
              {dismissedCount > 0 && (
                <span className="text-muted-foreground">
                  {dismissedCount} dismissed
                </span>
              )}
            </div>
          </div>
          {meetingUrl && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={(e) => {
                e.stopPropagation();
                window.open(meetingUrl, '_blank');
              }}
            >
              <ExternalLink className="w-4 h-4" />
              View Notes
            </Button>
          )}
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="px-4 pb-4 space-y-3">
          {actions.map(action => (
            <MeetingActionCard
              key={action.id}
              action={action}
              onKeep={onKeep}
              onPromote={onPromote}
              onDismiss={onDismiss}
              onUpdateDueDate={onUpdateDueDate}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
