/**
 * LifeModeAdapter Component
 * Bridges existing LifeDashboard data to new OperatingModeView
 */

'use client';

import { useMemo } from 'react';
import { OperatingModeView } from './OperatingModeView';
import type { Project, Task, Note } from '@/app/page';
import type { LifeHubState, LifeHubKey } from '@/app/components/OSDashboards';

export interface LifeModeAdapterProps {
  tasks: Task[];
  projects: Project[];
  notes: Note[];
  life: LifeHubState;
  onComplete: (id: number) => void;
  onOpenTask: (id: number) => void;
  onOpenProject: (name: string) => void;
  onNewTask: () => void;
  onNewProject: () => void;
  onNewNote: () => void;
  onOpenCollection: (key: LifeHubKey, startAdd?: boolean) => void;
}

export function LifeModeAdapter({
  tasks,
  projects,
  notes,
  life,
  onComplete,
  onOpenTask,
  onOpenProject,
  onNewTask,
  onNewProject,
  onNewNote,
  onOpenCollection,
}: LifeModeAdapterProps) {
  // Build momentum map from project progress
  const momentumMap = useMemo(() => {
    const map: Record<string, 'High' | 'Medium' | 'Dormant' | 'Blocked'> = {};
    projects.forEach(p => {
      if (p.progress >= 75) map[p.name] = 'High';
      else if (p.progress >= 40) map[p.name] = 'Medium';
      else if (p.progress > 0) map[p.name] = 'Dormant';
      else map[p.name] = 'Blocked';
    });
    return map;
  }, [projects]);

  // Build alerts from personal goals
  const alerts = useMemo(() => {
    const importantTasks = tasks
      .filter(t => !t.classId && !t.done && !t.canceled && t.priority === 'High')
      .slice(0, 3)
      .map(t => ({
        id: `task-${t.id}`,
        level: 'urgent' as const,
        title: t.title,
        meta: t.project || 'Personal',
        icon: '❤️',
        action: 'open',
      }));

    return importantTasks;
  }, [tasks]);

  // Convert projects to ContextProject format
  const contextProjects = useMemo(() => {
    return projects.map(p => ({
      id: p.name,
      name: p.name,
      description: p.desc || '',
      status: 'active' as const,
      scope: 'life' as const,
      milestone: '',
      progress: p.progress,
      color: p.color,
    }));
  }, [projects]);

  // Get suggestions from life hub
  const suggestions = useMemo(() => {
    return life.reflections?.slice(0, 3).map(r => r) ?? [
      'Take time for what matters most',
      'Balance work and personal growth',
      'Celebrate small wins',
    ];
  }, [life]);

  return (
    <OperatingModeView
      context="Life"
      greeting={`Keep life moving without turning it into admin. Balance is the real productivity.`}
      focusSession={null}
      ambientActivity={null}
      nextEvent={null}
      timeline={[]}
      alerts={alerts}
      suggestions={suggestions}
      projects={contextProjects as any}
      momentumMap={momentumMap}
      onStartFocus={() => {}}
      onAlert={(alert) => {
        if (alert.id.startsWith('task-')) {
          const taskId = parseInt(alert.id.replace('task-', ''));
          onOpenTask(taskId);
        }
      }}
      onAction={(action) => {
        if (action === 'task') onNewTask();
        if (action === 'project') onNewProject();
        if (action === 'note') onNewNote();
      }}
      onContextSwitch={() => {}}
      onProjectClick={(project) => onOpenProject(project.name)}
      onNewProject={onNewProject}
    />
  );
}
