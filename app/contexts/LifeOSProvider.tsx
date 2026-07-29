'use client';

import React, { createContext, useContext } from 'react';
import { useOperatingContext } from '@/lib/useOperatingContext';
import { buildPersonalContextLayer, generateAllContextMetadata } from '@/lib/personalContextLayer';
import type { OperatingContextState, FocusSession, LocalTask, PersonalContextLayer } from '@/lib/contextArchitecture';

interface LifeOSContextValue {
  // Operating Context
  contextState: OperatingContextState;
  switchContext: (context: string) => void;

  // Focus Sessions
  focusSessions: FocusSession[];
  activateFocusSession: (sessionId: string) => void;
  deactivateFocusSession: () => void;
  createFocusSession: (session: Omit<FocusSession, 'id' | 'createdAt' | 'updatedAt'>) => FocusSession;
  updateFocusSession: (sessionId: string, updates: Partial<FocusSession>) => void;
  getActiveFocusSession: () => FocusSession | null;

  // Local Tasks
  localTasks: LocalTask[];
  createLocalTask: (task: Omit<LocalTask, 'id' | 'createdAt' | 'updatedAt'>) => LocalTask;
  updateLocalTask: (taskId: number, updates: Partial<LocalTask>) => void;
  deleteLocalTask: (taskId: number) => void;
  getTasksForParent: (parentType: LocalTask['parentType'], parentId: string) => LocalTask[];

  // Personal Context Layer
  personalContext: PersonalContextLayer | null;

  // Loading state
  isLoaded: boolean;
}

const LifeOSContext = createContext<LifeOSContextValue | undefined>(undefined);

export function LifeOSProvider({ children }: { children: React.ReactNode }) {
  const {
    contextState,
    focusSessions,
    localTasks,
    isLoaded,
    switchContext,
    activateFocusSession,
    deactivateFocusSession,
    getActiveFocusSession,
    createFocusSession,
    updateFocusSession,
    createLocalTask,
    updateLocalTask,
    deleteLocalTask,
    getTasksForParent,
  } = useOperatingContext();

  // Build PersonalContextLayer from current state
  const personalContext = isLoaded
    ? buildPersonalContextLayer(
        [], // observations - would be populated from backend
        generateAllContextMetadata(localTasks, focusSessions, []),
        contextState.current
      )
    : null;

  const value: LifeOSContextValue = {
    contextState,
    switchContext,
    focusSessions,
    activateFocusSession,
    deactivateFocusSession,
    createFocusSession,
    updateFocusSession,
    getActiveFocusSession,
    localTasks,
    createLocalTask,
    updateLocalTask,
    deleteLocalTask,
    getTasksForParent,
    personalContext,
    isLoaded,
  };

  return <LifeOSContext.Provider value={value}>{children}</LifeOSContext.Provider>;
}

export function useLifeOS() {
  const context = useContext(LifeOSContext);
  if (!context) {
    throw new Error('useLifeOS must be used within a LifeOSProvider');
  }
  return context;
}
