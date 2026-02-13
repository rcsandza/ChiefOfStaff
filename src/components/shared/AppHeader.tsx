import React from 'react';
import { Button } from '@/components/ui/button';
import { ListTodo, MessageSquare } from 'lucide-react';

interface AppHeaderProps {
  activeTab: 'tasks' | 'meeting-actions';
  onTabChange: (tab: 'tasks' | 'meeting-actions') => void;
  rightContent?: React.ReactNode;
}

export function AppHeader({ activeTab, onTabChange, rightContent }: AppHeaderProps) {
  return (
    <header className="bg-card border-b border-border sticky top-0 z-20">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Chief of Staff</h1>
          <div className="flex items-center gap-2">
            {/* Tab toggle icons */}
            <Button
              variant={activeTab === 'tasks' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => onTabChange('tasks')}
              title="Tasks"
            >
              <ListTodo className="w-5 h-5" />
            </Button>
            <Button
              variant={activeTab === 'meeting-actions' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => onTabChange('meeting-actions')}
              title="Meeting Actions"
            >
              <MessageSquare className="w-5 h-5" />
            </Button>

            {/* Right content (additional buttons/actions) */}
            {rightContent && (
              <>
                <div className="w-px h-6 bg-border mx-1" />
                {rightContent}
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
