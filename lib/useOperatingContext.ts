import { useState, useCallback, useEffect } from 'react';
import { OperatingContext, OperatingContextState, FocusSession, LocalTask } from './contextArchitecture';

// Initialize context state
const initialContextState: OperatingContextState = {
  current: 'Life',
  previousContext: null,
  switchedAt: new Date(),
  focusSessionActive: false,
  focusSessionId: null,
};

// Store key for localStorage persistence
const CONTEXT_STATE_KEY = 'lifeos-operating-context-state';
const FOCUS_SESSIONS_KEY = 'lifeos-focus-sessions';
const LOCAL_TASKS_KEY = 'lifeos-local-tasks';

export function useOperatingContext() {
  const [contextState, setContextState] = useState<OperatingContextState>(initialContextState);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [localTasks, setLocalTasks] = useState<LocalTask[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load persisted state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CONTEXT_STATE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setContextState({
          ...parsed,
          switchedAt: new Date(parsed.switchedAt),
        });
      }

      const savedSessions = localStorage.getItem(FOCUS_SESSIONS_KEY);
      if (savedSessions) {
        const sessions = JSON.parse(savedSessions).map((s: any) => ({
          ...s,
          startTime: new Date(s.startTime),
          endTime: new Date(s.endTime),
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt),
        }));
        setFocusSessions(sessions);
      }

      const savedTasks = localStorage.getItem(LOCAL_TASKS_KEY);
      if (savedTasks) {
        const tasks = JSON.parse(savedTasks).map((t: any) => ({
          ...t,
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt),
        }));
        setLocalTasks(tasks);
      }

      setIsLoaded(true);
    } catch (err) {
      console.error('Failed to load context state:', err);
      setIsLoaded(true);
    }
  }, []);

  // Persist context state
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(CONTEXT_STATE_KEY, JSON.stringify(contextState));
    }
  }, [contextState, isLoaded]);

  // Persist focus sessions
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(FOCUS_SESSIONS_KEY, JSON.stringify(focusSessions));
    }
  }, [focusSessions, isLoaded]);

  // Persist local tasks
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(localTasks));
    }
  }, [localTasks, isLoaded]);

  // Switch operating context
  const switchContext = useCallback((newContext: OperatingContext) => {
    setContextState(prev => ({
      current: newContext,
      previousContext: prev.current,
      switchedAt: new Date(),
      focusSessionActive: prev.focusSessionActive,
      focusSessionId: prev.focusSessionId,
    }));
  }, []);

  // Activate focus session
  const activateFocusSession = useCallback((sessionId: string) => {
    setContextState(prev => ({
      ...prev,
      focusSessionActive: true,
      focusSessionId: sessionId,
    }));

    // Update focus session status
    setFocusSessions(prev =>
      prev.map(s =>
        s.id === sessionId
          ? { ...s, status: 'active' as const, updatedAt: new Date() }
          : s
      )
    );
  }, []);

  // Deactivate focus session
  const deactivateFocusSession = useCallback(() => {
    setContextState(prev => ({
      ...prev,
      focusSessionActive: false,
      focusSessionId: null,
    }));
  }, []);

  // Create new focus session
  const createFocusSession = useCallback((session: Omit<FocusSession, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newSession: FocusSession = {
      ...session,
      id: `session-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setFocusSessions(prev => [...prev, newSession]);
    return newSession;
  }, []);

  // Update focus session
  const updateFocusSession = useCallback((sessionId: string, updates: Partial<FocusSession>) => {
    setFocusSessions(prev =>
      prev.map(s =>
        s.id === sessionId
          ? { ...s, ...updates, updatedAt: new Date() }
          : s
      )
    );
  }, []);

  // Create new local task
  const createLocalTask = useCallback((task: Omit<LocalTask, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTask: LocalTask = {
      ...task,
      id: Math.max(...localTasks.map(t => t.id), 0) + 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setLocalTasks(prev => [...prev, newTask]);
    return newTask;
  }, [localTasks]);

  // Update local task
  const updateLocalTask = useCallback((taskId: number, updates: Partial<LocalTask>) => {
    setLocalTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? { ...t, ...updates, updatedAt: new Date() }
          : t
      )
    );
  }, []);

  // Delete local task
  const deleteLocalTask = useCallback((taskId: number) => {
    setLocalTasks(prev => prev.filter(t => t.id !== taskId));
  }, []);

  // Get tasks for a parent object
  const getTasksForParent = useCallback((parentType: LocalTask['parentType'], parentId: string) => {
    return localTasks.filter(t => t.parentType === parentType && t.parentId === parentId);
  }, [localTasks]);

  // Get active focus session
  const getActiveFocusSession = useCallback(() => {
    if (!contextState.focusSessionId) return null;
    return focusSessions.find(s => s.id === contextState.focusSessionId) || null;
  }, [contextState, focusSessions]);

  return {
    // State
    contextState,
    focusSessions,
    localTasks,
    isLoaded,

    // Context operations
    switchContext,
    activateFocusSession,
    deactivateFocusSession,
    getActiveFocusSession,

    // Focus session operations
    createFocusSession,
    updateFocusSession,

    // Local task operations
    createLocalTask,
    updateLocalTask,
    deleteLocalTask,
    getTasksForParent,
  };
}
