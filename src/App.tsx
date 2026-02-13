import React, { useState } from 'react';
import { PasswordProtection } from './components/shared/PasswordProtection';
import { Favicon } from './components/shared/Favicon';
import { TasksTab } from './components/tasks/TasksTab';
import { MeetingActionsTab } from './components/meeting-actions/MeetingActionsTab';

function App() {
  const [activeTab, setActiveTab] = useState<'tasks' | 'meeting-actions'>('tasks');

  return (
    <PasswordProtection correctPassword="liming">
      <Favicon />
      {activeTab === 'tasks' ? (
        <TasksTab activeTab={activeTab} onTabChange={setActiveTab} />
      ) : (
        <MeetingActionsTab activeTab={activeTab} onTabChange={setActiveTab} />
      )}
    </PasswordProtection>
  );
}

export default App;
