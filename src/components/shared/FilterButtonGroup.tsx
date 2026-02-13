import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/utils';

interface FilterOption {
  value: string;
  label: string | React.ReactNode;
  icon?: React.ReactNode;
}

interface FilterButtonGroupProps {
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function FilterButtonGroup({ options, value, onChange, className }: FilterButtonGroupProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {options.map((option) => (
        <Button
          key={option.value}
          variant={value === option.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(option.value)}
          className={cn('gap-2', option.icon ? '' : '')}
         
        >
          {option.icon}
          {option.label}
        </Button>
      ))}
    </div>
  );
}
