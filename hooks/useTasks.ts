'use client';

import { useState, useCallback, useEffect } from 'react';
import { Task } from '@/lib/validation';
import { syncDataToFirebase, loadDataFromFirebase } from '@/lib/dataSync';
import { logger } from '@/lib/logger';

interface UseTasksReturn {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  addTask: (task: Task) => void;
  updateTask: (id: number, updates: Partial<Task>) => void;
  deleteTask: (id: number) => void;
  completeTask: (id: number) => void;
  syncTasks: () => Promise<void>;
}

export const useTasks = (userId: string | null, initialTasks: Task[]): UseTasksReturn => {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load tasks from Firebase on mount or when userId changes
  useEffect(() => {
    if (!userId) return;

    const loadTasks = async () => {
      setLoading(true);
      const data = await loadDataFromFirebase('tasks');
      if (data) {
        setTasks(data);
        logger.info('Tasks loaded from Firebase');
      }
      setLoading(false);
    };

    loadTasks();
  }, [userId]);

  // Sync tasks to Firebase when they change
  useEffect(() => {
    if (!userId || tasks.length === 0) return;

    const syncTimeout = setTimeout(() => {
      syncDataToFirebase('tasks', tasks);
    }, 500); // Debounce syncs

    return () => clearTimeout(syncTimeout);
  }, [tasks, userId]);

  const addTask = useCallback((task: Task) => {
    setTasks(prev => [...prev, task]);
    logger.info('Task added', { taskId: task.id, title: task.title });
  }, []);

  const updateTask = useCallback((id: number, updates: Partial<Task>) => {
    setTasks(prev =>
      prev.map(task => (task.id === id ? { ...task, ...updates } : task))
    );
    logger.info('Task updated', { taskId: id });
  }, []);

  const deleteTask = useCallback((id: number) => {
    setTasks(prev => prev.filter(task => task.id !== id));
    logger.info('Task deleted', { taskId: id });
  }, []);

  const completeTask = useCallback((id: number) => {
    updateTask(id, { done: true });
  }, [updateTask]);

  const syncTasks = useCallback(async () => {
    if (!userId) {
      setError('No user logged in');
      return;
    }
    setLoading(true);
    try {
      await syncDataToFirebase('tasks', tasks);
      logger.info('Tasks synced successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sync tasks';
      setError(message);
      logger.error('Task sync failed', err as Error);
    } finally {
      setLoading(false);
    }
  }, [tasks, userId]);

  return { tasks, loading, error, addTask, updateTask, deleteTask, completeTask, syncTasks };
};
