import React from 'react';
import { Project } from '@/utils/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FilterButtonGroup } from '@/components/shared/FilterButtonGroup';
import { User, Briefcase, X } from 'lucide-react';

interface FilterPanelProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterGroup: 'all' | 'personal' | 'work';
  setFilterGroup: (group: 'all' | 'personal' | 'work') => void;
  filterStatus: 'all' | 'open' | 'done';
  setFilterStatus: (status: 'all' | 'open' | 'done') => void;
  filterProject: string;
  setFilterProject: (projectId: string) => void;
  projects: Project[];
  onResetFilters: () => void;
}

export function FilterPanel({
  searchQuery,
  setSearchQuery,
  filterGroup,
  setFilterGroup,
  filterStatus,
  setFilterStatus,
  filterProject,
  setFilterProject,
  projects,
  onResetFilters,
}: FilterPanelProps) {
  const groupOptions = [
    { value: 'all', label: 'All' },
    { value: 'personal', label: 'Personal', icon: <User className="w-4 h-4" /> },
    { value: 'work', label: 'Work', icon: <Briefcase className="w-4 h-4" /> },
  ];

  const statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'open', label: 'Open' },
    { value: 'done', label: 'Done' },
  ];

  const projectOptions = [
    { value: 'all', label: 'All' },
    ...projects.map(project => ({
      value: project.id,
      label: (
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          {project.name}
        </div>
      ),
    })),
  ];

  return (
    <div className="mt-4 pt-4 border-t border-border space-y-4">
      {/* Search */}
      <div>
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tasks..."
        />
      </div>

      {/* Group Filter */}
      <div>
        <Label className="mb-2 block">Filter by Group</Label>
        <FilterButtonGroup
          options={groupOptions}
          value={filterGroup}
          onChange={(value) => setFilterGroup(value as 'all' | 'personal' | 'work')}
        />
      </div>

      {/* Status Filter */}
      <div>
        <Label className="mb-2 block">Filter by Status</Label>
        <FilterButtonGroup
          options={statusOptions}
          value={filterStatus}
          onChange={(value) => setFilterStatus(value as 'all' | 'open' | 'done')}
        />
      </div>

      {/* Project Filter */}
      <div>
        <Label className="mb-2 block">Filter by Project</Label>
        <FilterButtonGroup
          options={projectOptions}
          value={filterProject}
          onChange={setFilterProject}
        />
      </div>

      {/* Reset Filters */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={onResetFilters}
          className="gap-2"
        >
          <X className="w-4 h-4" />
          Reset Filters
        </Button>
      </div>
    </div>
  );
}
