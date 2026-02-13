import React, { useState, useEffect } from 'react';
import { MeetingAction, Meeting } from '@/utils/types';
import { fetchMeetingActions, fetchMeetings, updateMeetingAction } from '@/utils/api';
import { MeetingGroup } from './MeetingGroup';
import { PromoteDialog } from './PromoteDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Toaster } from '@/components/ui/sonner';

export function MeetingActionsTab() {
  const [meetingActions, setMeetingActions] = useState<MeetingAction[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'pending' | 'promoted' | 'dismissed'>('new');
  const [assigneeFilter, setAssigneeFilter] = useState<'all' | 'me' | 'others'>('all');
  const [promoteTarget, setPromoteTarget] = useState<MeetingAction | null>(null);
  const [isPromoteDialogOpen, setIsPromoteDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [actionsData, meetingsData] = await Promise.all([
        fetchMeetingActions(),
        fetchMeetings(),
      ]);

      setMeetingActions(actionsData);
      setMeetings(meetingsData);
    } catch (error) {
      console.error('Failed to load meeting actions:', error);
      toast.error('Failed to load meeting actions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    toast.info('Refreshing meeting actions...');
    loadData();
  };

  const handlePromote = (action: MeetingAction) => {
    setPromoteTarget(action);
    setIsPromoteDialogOpen(true);
  };

  const handleKeep = async (action: MeetingAction) => {
    try {
      await updateMeetingAction(action.id, { status: 'pending' });
      setMeetingActions(meetingActions.map(a =>
        a.id === action.id ? { ...a, status: 'pending' } : a
      ));
      toast.success('Action kept');
    } catch (error) {
      console.error('Failed to keep action:', error);
      toast.error('Failed to keep action');
    }
  };

  const handleDismiss = async (action: MeetingAction) => {
    try {
      await updateMeetingAction(action.id, { status: 'dismissed' });
      setMeetingActions(meetingActions.map(a =>
        a.id === action.id ? { ...a, status: 'dismissed' } : a
      ));
      toast.success('Action dismissed', {
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              await updateMeetingAction(action.id, { status: 'pending' });
              setMeetingActions(meetingActions.map(a =>
                a.id === action.id ? { ...a, status: 'pending' } : a
              ));
              toast.success('Action restored');
            } catch (error) {
              console.error('Failed to undo dismiss:', error);
              toast.error('Failed to undo');
            }
          },
        },
      });
    } catch (error) {
      console.error('Failed to dismiss action:', error);
      toast.error('Failed to dismiss action');
    }
  };

  const handlePromoteSuccess = () => {
    loadData();
  };

  // Identity matching logic for "me"
  const isAssignedToMe = (action: MeetingAction): boolean => {
    const nameMatch = action.assignee_name.toLowerCase().includes('ray');
    const emailMatch =
      action.assignee_email === 'raymond.sandza@gmail.com' ||
      action.assignee_email === 'ray@joinhomebase.com';
    return nameMatch || emailMatch;
  };

  // Filter actions by status and assignee
  const filteredActions = meetingActions.filter(action => {
    // Status filter
    if (statusFilter !== 'all' && action.status !== statusFilter) {
      return false;
    }

    // Assignee filter
    if (assigneeFilter === 'me') {
      return isAssignedToMe(action);
    } else if (assigneeFilter === 'others') {
      return !isAssignedToMe(action);
    }

    return true;
  });

  // Group actions by meeting
  const actionsByMeeting = filteredActions.reduce((acc, action) => {
    const meetingId = action.source_meeting_id;
    if (!acc[meetingId]) {
      acc[meetingId] = [];
    }
    acc[meetingId].push(action);
    return acc;
  }, {} as Record<string, MeetingAction[]>);

  // Sort meetings by date (most recent first)
  const sortedMeetingIds = Object.keys(actionsByMeeting).sort((a, b) => {
    const meetingA = meetings.find(m => m.id === a);
    const meetingB = meetings.find(m => m.id === b);
    const dateA = meetingA?.date || actionsByMeeting[a][0]?.source_meeting_date || '';
    const dateB = meetingB?.date || actionsByMeeting[b][0]?.source_meeting_date || '';
    return dateB.localeCompare(dateA);
  });

  // Count actions by status
  const newCount = meetingActions.filter(a => a.status === 'new').length;
  const pendingCount = meetingActions.filter(a => a.status === 'pending').length;
  const promotedCount = meetingActions.filter(a => a.status === 'promoted').length;
  const dismissedCount = meetingActions.filter(a => a.status === 'dismissed').length;

  // Count actions by assignee
  const forMeCount = meetingActions.filter(a => isAssignedToMe(a)).length;
  const forOthersCount = meetingActions.filter(a => !isAssignedToMe(a)).length;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold">Meeting Actions</h1>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>

          {/* Status Filter Bar */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
              className="gap-2"
            >
              All
              <Badge variant="secondary" className="ml-1">
                {meetingActions.length}
              </Badge>
            </Button>
            <Button
              variant={statusFilter === 'new' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('new')}
              className="gap-2"
            >
              New
              <Badge variant="secondary" className="ml-1 bg-blue-500 text-white">
                {newCount}
              </Badge>
            </Button>
            <Button
              variant={statusFilter === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('pending')}
              className="gap-2"
            >
              Pending
              <Badge variant="secondary" className="ml-1 bg-amber-500 text-white">
                {pendingCount}
              </Badge>
            </Button>
            <Button
              variant={statusFilter === 'promoted' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('promoted')}
              className="gap-2"
            >
              Promoted
              <Badge variant="secondary" className="ml-1 bg-green-500 text-white">
                {promotedCount}
              </Badge>
            </Button>
            <Button
              variant={statusFilter === 'dismissed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('dismissed')}
              className="gap-2"
            >
              Dismissed
              <Badge variant="secondary" className="ml-1">
                {dismissedCount}
              </Badge>
            </Button>
          </div>

          {/* Assignee Filter Bar */}
          <div className="flex flex-wrap gap-2 mt-3">
            <Button
              variant={assigneeFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAssigneeFilter('all')}
              className="gap-2"
            >
              All
              <Badge variant="secondary" className="ml-1">
                {meetingActions.length}
              </Badge>
            </Button>
            <Button
              variant={assigneeFilter === 'me' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAssigneeFilter('me')}
              className="gap-2"
            >
              For Me
              <Badge variant="secondary" className="ml-1">
                {forMeCount}
              </Badge>
            </Button>
            <Button
              variant={assigneeFilter === 'others' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAssigneeFilter('others')}
              className="gap-2"
            >
              For Others
              <Badge variant="secondary" className="ml-1">
                {forOthersCount}
              </Badge>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {sortedMeetingIds.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No meeting actions found.</p>
            {(statusFilter !== 'all' || assigneeFilter !== 'all') && (
              <Button
                variant="link"
                onClick={() => {
                  setStatusFilter('all');
                  setAssigneeFilter('all');
                }}
                className="mt-2"
              >
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {sortedMeetingIds.map(meetingId => {
              const meeting = meetings.find(m => m.id === meetingId) || null;
              const actions = actionsByMeeting[meetingId];
              return (
                <MeetingGroup
                  key={meetingId}
                  meeting={meeting}
                  actions={actions}
                  onKeep={handleKeep}
                  onPromote={handlePromote}
                  onDismiss={handleDismiss}
                />
              );
            })}
          </div>
        )}
      </main>

      {/* Promote Dialog */}
      <PromoteDialog
        action={promoteTarget}
        isOpen={isPromoteDialogOpen}
        onClose={() => {
          setIsPromoteDialogOpen(false);
          setPromoteTarget(null);
        }}
        onSuccess={handlePromoteSuccess}
      />

      {/* Toast Notifications */}
      <Toaster position="top-center" />
    </div>
  );
}
