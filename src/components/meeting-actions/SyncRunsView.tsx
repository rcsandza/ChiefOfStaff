import React, { useState, useEffect } from 'react';
import { SyncRun } from '@/utils/types';
import { fetchSyncRuns } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, RefreshCw } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { PageLayout } from '@/components/shared/PageLayout';

interface SyncRunsViewProps {
  onClose: () => void;
}

export function SyncRunsView({ onClose }: SyncRunsViewProps) {
  const [syncRuns, setSyncRuns] = useState<SyncRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSyncRuns();
  }, []);

  const loadSyncRuns = async () => {
    setIsLoading(true);
    const { data, error } = await fetchSyncRuns();
    if (data) {
      setSyncRuns(data);
    } else if (error) {
      console.error('Failed to load sync runs:', error);
      toast.error('Failed to load sync logs');
    }
    setIsLoading(false);
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateStr;
    }
  };

  const getDuration = (startStr: string, endStr: string | null) => {
    if (!endStr) return '—';
    try {
      const start = new Date(startStr).getTime();
      const end = new Date(endStr).getTime();
      const seconds = Math.round((end - start) / 1000);
      if (seconds < 60) return `${seconds}s`;
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    } catch {
      return '—';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="!bg-purple-500 !text-white">Success</Badge>;
      case 'partial':
        return <Badge variant="default" className="!bg-red-500 !text-white">Partial</Badge>;
      case 'failed':
        return <Badge variant="default" className="!bg-red-500 !text-white">Failed</Badge>;
      default:
        return <Badge variant="default" className="!bg-red-500 !text-white">{status}</Badge>;
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <PageLayout>
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Sync Logs</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadSyncRuns}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {syncRuns.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No sync runs recorded yet.</p>
            <p className="text-sm mt-2">Sync runs will appear here after the automated sync runs.</p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-sm font-medium">Date/Time</th>
                <th className="text-center py-2 px-3 text-sm font-medium">Duration</th>
                <th className="text-center py-2 px-3 text-sm font-medium">Status</th>
                <th className="text-center py-2 px-3 text-sm font-medium">Found</th>
                <th className="text-center py-2 px-3 text-sm font-medium">Processed</th>
                <th className="text-center py-2 px-3 text-sm font-medium">Actions</th>
                <th className="text-center py-2 px-3 text-sm font-medium">Errors</th>
              </tr>
            </thead>
            <tbody>
              {syncRuns.map((run) => (
                <tr key={run.id} className="border-b border-border hover:bg-muted/50">
                  <td className="py-2 px-3 text-sm">{formatDateTime(run.started_at)}</td>
                  <td className="py-2 px-3 text-sm text-center">{getDuration(run.started_at, run.completed_at)}</td>
                  <td className="py-2 px-3 text-sm text-center">{getStatusBadge(run.status)}</td>
                  <td className="py-2 px-3 text-sm text-center">{run.meetings_fetched}</td>
                  <td className="py-2 px-3 text-sm text-center">{run.meetings_processed}</td>
                  <td className="py-2 px-3 text-sm text-center">{run.actions_created}</td>
                  <td
                    className="py-2 px-3 text-sm text-center"
                    title={run.errors && run.errors.length > 0 ? run.errors.join('\n') : undefined}
                  >
                    {run.errors && run.errors.length > 0 ? (
                      <span className="text-destructive cursor-help">{run.errors.length}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </PageLayout>
  );
}
