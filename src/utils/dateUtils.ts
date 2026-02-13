import { DateSection } from './types';

/**
 * Returns today's date at midnight in local timezone
 */
export function getToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Formats a Date object as YYYY-MM-DD in local timezone
 */
export function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a YYYY-MM-DD string to a Date at midnight local timezone
 */
export function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Formats a date string for display (e.g., "Jan 15, 2024" or "Today")
 */
export function formatDateDisplay(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

export function getDateSection(dueDate: string | null): DateSection {
  if (!dueDate) return 'longer-term';

  const today = getToday();
  const due = parseDateString(dueDate);
  
  // Today: today's date and any overdue dates
  if (due <= today) return 'today';
  
  // Calculate next upcoming Saturday (not including today)
  const daysUntilSaturday = today.getDay() === 6 ? 7 : (6 - today.getDay());
  const nextSaturday = new Date(today);
  nextSaturday.setDate(today.getDate() + daysUntilSaturday);
  
  // Calculate next upcoming Sunday (not including today)  
  const daysUntilSunday = today.getDay() === 0 ? 7 : (7 - today.getDay());
  const nextSunday = new Date(today);
  nextSunday.setDate(today.getDate() + daysUntilSunday);
  
  // Calculate Saturday after next Sunday
  const saturdayAfterNextSunday = new Date(nextSunday);
  saturdayAfterNextSunday.setDate(nextSunday.getDate() + 6);
  
  // This Week: tomorrow through next upcoming Saturday
  if (due > today && due <= nextSaturday) return 'this-week';
  
  // Next Week: next upcoming Sunday through Saturday after next Sunday
  if (due > nextSaturday && due <= saturdayAfterNextSunday) return 'next-week';
  
  // After Next Week: any date after Saturday after next Sunday
  return 'after-next-week';
}

export function getDaysOverdue(dueDate: string | null): number {
  if (!dueDate) return 0;

  const today = getToday();
  const due = parseDateString(dueDate);
  
  const diffTime = today.getTime() - due.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

export function formatDate(dateString: string): string {
  const date = parseDateString(dateString);
  const today = getToday();

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (date.getTime() === today.getTime()) return 'Today';
  if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';

  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

export function getSectionTitle(section: DateSection): string {
  switch (section) {
    case 'personal-focus': return 'Personal Focus';
    case 'to-read': return 'To Read';
    case 'today': return 'Due Today';
    case 'this-week': return 'This Week';
    case 'next-week': return 'Next Week';
    case 'after-next-week': return 'After Next Week';
    case 'longer-term': return 'Backlog';
  }
}

export function getSectionEmptyMessage(section: DateSection): string {
  switch (section) {
    case 'personal-focus': return 'No personal tasks to focus on';
    case 'to-read': return 'No reading items yet';
    case 'today': return 'No tasks due today 🎯';
    case 'this-week': return 'Nothing coming up this week';
    case 'next-week': return 'Next week is clear';
    case 'after-next-week': return 'All caught up ahead';
    case 'longer-term': return 'No unscheduled tasks';
  }
}

export function formatTimestamp(isoTimestamp: string): string {
  // Parse the ISO timestamp and convert to local timezone
  const date = new Date(isoTimestamp);
  const today = getToday();

  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (dateOnly.getTime() === today.getTime()) return 'Today';
  if (dateOnly.getTime() === yesterday.getTime()) return 'Yesterday';

  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}
