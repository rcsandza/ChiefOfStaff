import React from 'react';
import { PasswordProtection } from './components/shared/PasswordProtection';
import { Favicon } from './components/shared/Favicon';
import { TasksTab } from './components/tasks/TasksTab';
import { MeetingActionsTab } from './components/meeting-actions/MeetingActionsTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';

function App() {
  return (
    <PasswordProtection correctPassword="liming">
      <Favicon />
      <Tabs defaultValue="tasks" className="w-full">
        <div className="bg-card border-b border-border sticky top-0 z-20">
          <div className="max-w-4xl mx-auto px-4">
            <TabsList className="w-full justify-start border-b-0">
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="meeting-actions">Meeting Actions</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="tasks" className="m-0">
          <TasksTab />
        </TabsContent>

        <TabsContent value="meeting-actions" className="m-0">
          <MeetingActionsTab />
        </TabsContent>
      </Tabs>
    </PasswordProtection>
  );
}

export default App;
