import React, { useState } from 'react';
import { Project } from '@/utils/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { Plus, Edit, Trash2, Check, X } from 'lucide-react';

interface ProjectManagerSheetProps {
  projects: Project[];
  onCreateProject: (name: string, color: string) => Promise<void>;
  onUpdateProject: (id: string, name: string, color: string) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
}

export function ProjectManagerSheet({
  projects,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
}: ProjectManagerSheetProps) {
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#7E3DD4');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState('');
  const [editingProjectColor, setEditingProjectColor] = useState('');

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    await onCreateProject(newProjectName, newProjectColor);
    setNewProjectName('');
    setNewProjectColor('#7E3DD4');
  };

  const handleUpdateProject = async (id: string) => {
    if (!editingProjectName.trim()) return;
    await onUpdateProject(id, editingProjectName, editingProjectColor);
    setEditingProjectId(null);
    setEditingProjectName('');
    setEditingProjectColor('');
  };

  const handleStartEditProject = (project: Project) => {
    setEditingProjectId(project.id);
    setEditingProjectName(project.name);
    setEditingProjectColor(project.color);
  };

  const handleCancelEditProject = () => {
    setEditingProjectId(null);
    setEditingProjectName('');
    setEditingProjectColor('');
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Plus className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader className="px-6">
          <SheetTitle>Manage Projects</SheetTitle>
          <SheetDescription>
            Create and organize projects to categorize your tasks
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 mt-6 px-6">
          <div>
            <Label>Create New Project</Label>
            <div className="flex gap-2 mt-2">
              <div className="relative">
                <input
                  type="color"
                  value={newProjectColor}
                  onChange={(e) => setNewProjectColor(e.target.value)}
                  className="w-10 h-10 cursor-pointer border border-border"
                  title="Choose color"
                />
              </div>
              <Input
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Project name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateProject();
                  }
                }}
                className="flex-1"
              />
              <Button onClick={handleCreateProject}>
                Add
              </Button>
            </div>
          </div>

          <div>
            <Label>Existing Projects</Label>
            <div className="space-y-2 mt-2">
              {projects.map(project => (
                <div
                  key={project.id}
                  className="p-3 border border-border rounded-lg"
                >
                  {editingProjectId === project.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editingProjectColor}
                        onChange={(e) => setEditingProjectColor(e.target.value)}
                        className="w-8 h-8 cursor-pointer border border-border flex-shrink-0"
                      />
                      <Input
                        value={editingProjectName}
                        onChange={(e) => setEditingProjectName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleUpdateProject(project.id);
                          } else if (e.key === 'Escape') {
                            handleCancelEditProject();
                          }
                        }}
                        className="flex-1"
                        autoFocus
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUpdateProject(project.id)}
                        className="h-8 w-8 p-0 flex-shrink-0"
                      >
                        <Check className="w-4 h-4 text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEditProject}
                        className="h-8 w-8 p-0 flex-shrink-0"
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: project.color }}
                      />
                      <span className="flex-1">{project.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStartEditProject(project)}
                        className="h-8 w-8 p-0 flex-shrink-0"
                      >
                        <Edit className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteProject(project.id)}
                        className="h-8 w-8 p-0 flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
