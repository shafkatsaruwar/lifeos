import { useState, useEffect, useCallback } from 'react';
import type { OperatingContext } from '@/lib/contextArchitecture';

export type WorkspaceMemory = {
  context: OperatingContext;
  lastVisited: string;
  activeSection?: string;
  selectedItem?: {
    type: 'project' | 'class' | 'note' | 'task';
    id: string | number;
  };
  scrollPosition?: number;
  expandedSections?: Record<string, boolean>;
  filterState?: Record<string, string | boolean>;
};

type ContextWorkspaceState = Record<OperatingContext, WorkspaceMemory>;

const STORAGE_KEY = 'lifeos-workspace-memory';

export function useWorkspaceMemory(currentContext: OperatingContext) {
  const [workspaces, setWorkspaces] = useState<ContextWorkspaceState>(() => {
    if (typeof window === 'undefined') return {} as ContextWorkspaceState;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Save to localStorage whenever workspaces change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces));
  }, [workspaces]);

  const currentMemory = workspaces[currentContext] || {
    context: currentContext,
    lastVisited: new Date().toISOString(),
  };

  const updateMemory = useCallback((updates: Partial<WorkspaceMemory>) => {
    setWorkspaces(prev => ({
      ...prev,
      [currentContext]: {
        context: currentContext,
        lastVisited: new Date().toISOString(),
        ...prev[currentContext],
        ...updates,
      },
    }));
  }, [currentContext]);

  const saveActiveSection = useCallback((section: string) => {
    updateMemory({ activeSection: section });
  }, [updateMemory]);

  const saveSelectedItem = useCallback((type: 'project' | 'class' | 'note' | 'task', id: string | number) => {
    updateMemory({ selectedItem: { type, id } });
  }, [updateMemory]);

  const clearSelection = useCallback(() => {
    updateMemory({ selectedItem: undefined });
  }, [updateMemory]);

  const saveScrollPosition = useCallback((position: number) => {
    updateMemory({ scrollPosition: position });
  }, [updateMemory]);

  const toggleExpandedSection = useCallback((sectionKey: string) => {
    updateMemory({
      expandedSections: {
        ...currentMemory.expandedSections,
        [sectionKey]: !currentMemory.expandedSections?.[sectionKey],
      },
    });
  }, [updateMemory, currentMemory.expandedSections]);

  const setFilterState = useCallback((key: string, value: string | boolean) => {
    updateMemory({
      filterState: {
        ...currentMemory.filterState,
        [key]: value,
      },
    });
  }, [updateMemory, currentMemory.filterState]);

  return {
    memory: currentMemory,
    updateMemory,
    saveActiveSection,
    saveSelectedItem,
    clearSelection,
    saveScrollPosition,
    toggleExpandedSection,
    setFilterState,
  };
}
