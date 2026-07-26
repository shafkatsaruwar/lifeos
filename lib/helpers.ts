import { Task } from './validation';
import { logger } from './logger';

// Convert time string (HH:MM) to minutes since midnight
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Check if two time ranges overlap
const timesOverlap = (
  start1: number,
  end1: number,
  start2: number,
  end2: number
): boolean => {
  return start1 < end2 && start2 < end1;
};

// Check for time-based conflicts (same day, overlapping times)
export const checkDoubleBooking = (
  tasks: Task[],
  taskId: number,
  newDate: string,
  newStartTime?: string,
  newFocusMinutes: number = 45
): Task[] => {
  // If no start time provided, can't check time conflicts
  if (!newStartTime) {
    logger.debug('No start time provided, allowing any task on this date');
    return [];
  }

  const newStart = timeToMinutes(newStartTime);
  const newEnd = newStart + newFocusMinutes;

  return tasks.filter(task => {
    // Skip: same task, completed, or canceled
    if (task.id === taskId || task.done || task.canceled) {
      return false;
    }

    // Only check tasks on the same date
    if (task.due !== newDate) {
      return false;
    }

    // If existing task has no start time, assume no conflict
    if (!task.startTime) {
      return false;
    }

    const taskStart = timeToMinutes(task.startTime);
    const taskEnd = taskStart + task.focusMinutes;

    // Check if time ranges overlap
    return timesOverlap(newStart, newEnd, taskStart, taskEnd);
  });
};

// Format date string to user-friendly format
export const formatDueDate = (dateStr: string): string => {
  const today = new Date();
  const todayKey = toDateKey(today);

  if (dateStr === todayKey) {
    return 'Today';
  }

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = toDateKey(tomorrow);

  if (dateStr === tomorrowKey) {
    return 'Tomorrow';
  }

  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Convert Date object to ISO date string (YYYY-MM-DD)
export const toDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Format time from minutes since midnight to HH:MM
export const formatTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

// Check if a time string is valid (HH:MM format)
export const isValidTimeFormat = (time: string): boolean => {
  const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return regex.test(time);
};

// Calculate days until a date and return formatted countdown text
export const getCountdownText = (dueDate: string): { days: number; text: string; urgency: 'overdue' | 'critical' | 'soon' | 'upcoming' | 'future' } => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T00:00`);
  const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diff < 0) return { days: diff, text: `${Math.abs(diff)}d overdue`, urgency: 'overdue' };
  if (diff === 0) return { days: diff, text: 'Due today', urgency: 'critical' };
  if (diff === 1) return { days: diff, text: 'Due tomorrow', urgency: 'critical' };
  if (diff <= 3) return { days: diff, text: `${diff}d left`, urgency: 'critical' };
  if (diff <= 7) return { days: diff, text: `${diff}d left`, urgency: 'soon' };
  if (diff <= 14) return { days: diff, text: `${diff}d left`, urgency: 'upcoming' };
  return { days: diff, text: `${diff}d away`, urgency: 'future' };
};

// Get urgency color for countdown display
export const getUrgencyColor = (urgency: 'overdue' | 'critical' | 'soon' | 'upcoming' | 'future'): string => {
  switch (urgency) {
    case 'overdue': return '#ff6b6b';
    case 'critical': return '#ff8c42';
    case 'soon': return '#ffd93d';
    case 'upcoming': return '#6bcf7f';
    case 'future': return '#4b8bdc';
    default: return '#999';
  }
};

// Get urgency percentage (0-100) for visual bars
export const getUrgencyPercentage = (daysLeft: number, totalDays: number = 30): number => {
  if (daysLeft < 0) return 100;
  return Math.min(100, Math.round((1 - daysLeft / totalDays) * 100));
};
