'use client';

import { useState, useCallback, useEffect } from 'react';
import { Project } from '@/lib/validation';
import { syncDataToFirebase, loadDataFromFirebase } from '@/lib/dataSync';
import { logger } from '@/lib/logger';

interface UseProjectsReturn {
  projects: Project[];
  loading: boolean;
  error: string | null;
  addProject: (project: Project) => void;
  updateProject: (name: string, updates: Partial<Project>) => void;
  deleteProject: (name: string) => void;
  syncProjects: () => Promise<void>;
}

export const useProjects = (userId: string | null, initialProjects: Project[]): UseProjectsReturn => {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const loadProjects = async () => {
      setLoading(true);
      const data = await loadDataFromFirebase('projects');
      if (data) {
        setProjects(data);
        logger.info('Projects loaded from Firebase');
      }
      setLoading(false);
    };

    loadProjects();
  }, [userId]);

  useEffect(() => {
    if (!userId || projects.length === 0) return;

    const syncTimeout = setTimeout(() => {
      syncDataToFirebase('projects', projects);
    }, 500);

    return () => clearTimeout(syncTimeout);
  }, [projects, userId]);

  const addProject = useCallback((project: Project) => {
    setProjects(prev => [...prev, project]);
    logger.info('Project added', { projectName: project.name });
  }, []);

  const updateProject = useCallback((name: string, updates: Partial<Project>) => {
    setProjects(prev =>
      prev.map(p => (p.name === name ? { ...p, ...updates } : p))
    );
    logger.info('Project updated', { projectName: name });
  }, []);

  const deleteProject = useCallback((name: string) => {
    setProjects(prev => prev.filter(p => p.name !== name));
    logger.info('Project deleted', { projectName: name });
  }, []);

  const syncProjects = useCallback(async () => {
    if (!userId) {
      setError('No user logged in');
      return;
    }
    setLoading(true);
    try {
      await syncDataToFirebase('projects', projects);
      logger.info('Projects synced successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sync projects';
      setError(message);
      logger.error('Project sync failed', err as Error);
    } finally {
      setLoading(false);
    }
  }, [projects, userId]);

  return { projects, loading, error, addProject, updateProject, deleteProject, syncProjects };
};
