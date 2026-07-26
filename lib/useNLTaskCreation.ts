import { useState } from 'react';
import { checkDoubleBooking, toDateKey } from '@/lib/helpers';

export interface ParsedTask {
  title: string;
  project: string;
  due: string;
  startTime?: string;
  priority: 'High' | 'Medium' | 'Low';
  focusMinutes: number;
  energy: 'Low' | 'Medium' | 'High';
  notes?: string;
}

export interface NLTaskResult {
  task: ParsedTask;
  conflicts: any[] | null;
  conflictCount: number;
}

export function useNLTaskCreation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseNaturalLanguage = async (
    input: string,
    existingTasks: any[] = [],
    existingProjects: any[] = []
  ): Promise<NLTaskResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'parse-task',
          input,
          spaces: existingProjects.map(project => typeof project === 'string' ? project : project.name).filter(Boolean),
          today: toDateKey(new Date()),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to parse task');
      }

      const data = await response.json();
      const task = data.task;
      const conflicts = checkDoubleBooking(
        existingTasks,
        Number.MIN_SAFE_INTEGER,
        task.due,
        task.startTime,
        task.focusMinutes,
      );
      return {
        task: {
          title: task.title,
          project: task.space,
          due: task.due,
          startTime: task.startTime,
          priority: task.priority,
          focusMinutes: task.focusMinutes,
          energy: task.energy,
          notes: task.notes,
        },
        conflicts,
        conflictCount: conflicts.length,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { parseNaturalLanguage, loading, error };
}
