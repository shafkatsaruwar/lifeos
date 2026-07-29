/**
 * SchoolModeAdapter Component
 * Bridges existing SchoolDashboard data to new OperatingModeView
 */

'use client';

import { useMemo } from 'react';
import { OperatingModeView } from './OperatingModeView';
import type { Task, ClassRecord } from '@/app/page';
import type { SchoolHubState, SchoolHubKey } from '@/app/components/OSDashboards';

export interface SchoolModeAdapterProps {
  tasks: Task[];
  classes: ClassRecord[];
  school: SchoolHubState;
  onComplete: (id: number) => void;
  onOpenTask: (id: number) => void;
  onOpenClass: (id: string) => void;
  onNewCourse: () => void;
  onNewAcademic: () => void;
  onNewLecture: () => void;
  onOpenCollection: (key: SchoolHubKey, startAdd?: boolean) => void;
  onOpenProfile: () => void;
  onFocus: () => void;
  enableStudyAbroad: boolean;
  onToggleStudyAbroad: (enabled: boolean) => void;
}

export function SchoolModeAdapter({
  tasks,
  classes,
  school,
  onComplete,
  onOpenTask,
  onOpenClass,
  onNewCourse,
  onNewAcademic,
  onNewLecture,
  onOpenCollection,
  onOpenProfile,
  onFocus,
  enableStudyAbroad,
  onToggleStudyAbroad,
}: SchoolModeAdapterProps) {
  // Build upcoming assignments alerts
  const upcomingAssignments = useMemo(() => {
    return tasks
      .filter(t => t.classId && !t.done && !t.canceled)
      .sort((a, b) => {
        const aDate = new Date(a.due).getTime();
        const bDate = new Date(b.due).getTime();
        return aDate - bDate;
      })
      .slice(0, 5)
      .map(t => ({
        id: `assignment-${t.id}`,
        title: t.title,
        courseName: classes.find(c => c.id === t.classId)?.name || 'Unknown Course',
        dueDate: t.due,
      }));
  }, [tasks, classes]);

  // Build alerts from urgent assignments
  const alerts = useMemo(() => {
    return upcomingAssignments.slice(0, 3).map(a => ({
      id: `task-${a.id}`,
      level: 'urgent' as const,
      title: a.title,
      meta: `${a.courseName} • ${a.dueDate}`,
      icon: '📋',
      action: 'open',
    }));
  }, [upcomingAssignments]);

  // Build momentum map from class status
  const momentumMap = useMemo(() => {
    const map: Record<string, 'High' | 'Medium' | 'Dormant' | 'Blocked'> = {};
    classes.forEach(c => {
      const classTaskCount = tasks.filter(t => t.classId === c.id && !t.done).length;
      if (classTaskCount === 0) map[c.id] = 'Dormant';
      else if (classTaskCount <= 2) map[c.id] = 'Medium';
      else map[c.id] = 'High';
    });
    return map;
  }, [classes, tasks]);

  // Convert classes to ContextProject format
  const contextProjects = useMemo(() => {
    return classes.map(c => ({
      id: c.id,
      name: c.name,
      description: c.code || '',
      status: 'active' as const,
      scope: 'school' as const,
      milestone: c.semesterEnd || '',
      progress: 0,
      color: c.color,
    }));
  }, [classes]);

  // Get suggestions from school hub
  const suggestions = useMemo(() => {
    return school.studyTips?.slice(0, 3) ?? [
      'Review notes from today\'s classes',
      'Start assignments early to avoid cramming',
      'Form study groups with classmates',
    ];
  }, [school]);

  return (
    <OperatingModeView
      context="School"
      greeting={`Make progress on your coursework. You have ${classes.length} active courses.`}
      focusSession={null}
      ambientActivity={null}
      nextEvent={null}
      timeline={[]}
      alerts={alerts}
      suggestions={suggestions}
      projects={contextProjects as any}
      momentumMap={momentumMap}
      upcomingAssignments={upcomingAssignments}
      onStartFocus={onFocus}
      onAlert={(alert) => {
        if (alert.id.startsWith('task-')) {
          const assignmentId = alert.id.replace('task-assignment-', '');
          const taskId = parseInt(assignmentId);
          onOpenTask(taskId);
        }
      }}
      onAction={(action) => {
        if (action === 'task') onNewAcademic();
        if (action === 'lecture') onNewLecture();
      }}
      onContextSwitch={() => {}}
      onProjectClick={(project) => onOpenClass(project.id)}
      onNewProject={onNewCourse}
    />
  );
}
