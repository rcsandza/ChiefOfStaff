import React from 'react';
import { Project } from '@/utils/types';
import { cn } from '@/components/ui/utils';

interface ProjectBadgeProps {
  project: Project;
  size?: 'sm' | 'md';
  className?: string;
  showDot?: boolean;
}

export function ProjectBadge({ project, size = 'md', className, showDot = false }: ProjectBadgeProps) {
  const dotSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded caption flex-shrink-0',
        showDot ? 'gap-1.5' : '',
        className
      )}
      style={{
        backgroundColor: project.color + '20',
        color: project.color,
        borderRadius: 'var(--radius)',
      }}
    >
      {showDot && (
        <div
          className={cn('rounded-full flex-shrink-0', dotSize)}
          style={{ backgroundColor: project.color }}
        />
      )}
      {project.name}
    </span>
  );
}
