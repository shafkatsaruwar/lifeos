/**
 * WorkModeAdapter Component
 * Bridges existing WorkDashboard data to new OperatingModeView
 */

'use client';

import { useMemo } from 'react';
import { OperatingModeView } from './OperatingModeView';
import type { Project, Task, CalendarEvent } from '@/app/page';
import type { WorkHubState, WorkHubKey } from '@/app/components/OSDashboards';

export interface WorkModeAdapterProps {
  tasks: Task[];
  projects: Project[];
  work: WorkHubState;
  onComplete: (id: number) => void;
  onOpenTask: (id: number) => void;
  onOpenProject: (name: string) => void;
  onNewTask: () => void;
  onNewProject: () => void;
  onOpenCollection: (key: WorkHubKey) => void;
  onOpenNow: () => void;
}

export function WorkModeAdapter({
  tasks,
  projects,
  work,
  onComplete,
  onOpenTask,
  onOpenProject,
  onNewTask,
  onNewProject,
  onOpenCollection,
  onOpenNow,
}: WorkModeAdapterProps) {
  // Build status alerts from urgent tasks
  const alerts = useMemo(() => {
    const urgentTasks = tasks
      .filter(t => t.priority === 'High' && !t.done && !t.canceled)
      .slice(0, 3)
      .map(t => ({
        id: `task-${t.id}`,
        level: 'urgent' as const,
        title: t.title,
        meta: t.project || 'Inbox',
        icon: '🔴',
        action: 'open',
      }));

    const upcomingTasks = tasks
      .filter(t => (t.due === 'Tomorrow' || t.due === 'This week') && !t.done && !t.canceled)
      .slice(0, 3)
      .map(t => ({
        id: `task-upcoming-${t.id}`,
        level: 'upcoming' as const,
        title: t.title,
        meta: t.due,
        icon: '🟡',
        action: 'open',
      }));

    return [...urgentTasks, ...upcomingTasks];
  }, [tasks]);

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

  // Convert projects to ContextProject format
  const contextProjects = useMemo(() => {
    return projects.map(p => ({
      id: p.name,
      name: p.name,
      description: p.desc || '',
      status: 'active' as const,
      scope: 'work' as const,
      milestone: '',
      progress: p.progress,
      color: p.color,
    }));
  }, [projects]);

  // Get suggestions from work hub
  const suggestions = useMemo(() => {
    return work.journalEntries?.slice(0, 3).map(e => e.reflection ?? 'Keep making progress') ?? [
      'Focus on your top priority today',
      'Break large projects into smaller tasks',
      'Take a break every 90 minutes',
    ];
  }, [work]);

  return (
    <OperatingModeView
      context="Work"
      greeting={`Stay focused on what moves work forward. You've got ${projects.length} active projects.`}
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
      }}
      onContextSwitch={() => {}}
      onProjectClick={(project) => onOpenProject(project.name)}
      onNewProject={onNewProject}
    />
  );
}
