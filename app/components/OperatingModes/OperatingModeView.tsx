/**
 * OperatingModeView Component
 * Main orchestrator for operating mode views
 */

'use client';

import type { OperatingContext, FocusSession, Project as ContextProject, CalendarEvent } from '@/lib/contextArchitecture';
import type { AmbientActivity } from '@/app/hooks/useOperatingContext';
import { OperatingModeLayout } from './OperatingModeLayout';
import { WorkMode } from './WorkMode';
import { SchoolMode } from './SchoolMode';
import { LifeMode } from './LifeMode';
import { StudyAbroadMode, type University } from './StudyAbroadMode';
import { StatusSection, type StatusAlert } from './StatusSection';

export interface OperatingModeViewProps {
  context: OperatingContext;
  greeting: string;
  focusSession?: FocusSession | null;
  ambientActivity?: AmbientActivity | null;
  nextEvent?: { time: string; title: string } | null;
  timeline: CalendarEvent[];
  alerts: StatusAlert[];
  suggestions: string[];
  projects: ContextProject[];
  momentumMap: Record<string, 'High' | 'Medium' | 'Dormant' | 'Blocked'>;
  upcomingAssignments?: Array<{ id: string; title: string; courseName: string; dueDate: string }>;
  applicationsByStatus?: Record<string, number>;
  onStartFocus: () => void;
  onAlert: (alert: StatusAlert) => void;
  onAction: (action: string, context?: any) => void;
  onContextSwitch: (context: OperatingContext) => void;
  onProjectClick: (project: ContextProject) => void;
  onNewProject: () => void;
}

export function OperatingModeView({
  context,
  greeting,
  focusSession,
  ambientActivity,
  nextEvent,
  timeline,
  alerts,
  suggestions,
  projects,
  momentumMap,
  upcomingAssignments = [],
  applicationsByStatus = {},
  onStartFocus,
  onAlert,
  onAction,
  onContextSwitch,
  onProjectClick,
  onNewProject,
}: OperatingModeViewProps) {
  const renderModeContent = () => {
    switch (context) {
      case 'Work':
        return (
          <WorkMode
            projects={projects}
            momentumMap={momentumMap}
            onProjectClick={onProjectClick}
            onNewProject={onNewProject}
          />
        );

      case 'School':
        return (
          <SchoolMode
            courses={projects}
            momentumMap={momentumMap}
            upcomingAssignments={upcomingAssignments}
            onCourseClick={onProjectClick}
            onNewCourse={onNewProject}
          />
        );

      case 'Life':
        return (
          <LifeMode
            projects={projects}
            momentumMap={momentumMap}
            onProjectClick={onProjectClick}
            onNewProject={onNewProject}
          />
        );

      case 'Study Abroad':
        return (
          <StudyAbroadMode
            universities={projects as University[]}
            momentumMap={momentumMap}
            applicationsByStatus={applicationsByStatus}
            onUniversityClick={onProjectClick}
            onNewUniversity={onNewProject}
          />
        );

      default:
        return (
          <WorkMode
            projects={projects}
            momentumMap={momentumMap}
            onProjectClick={onProjectClick}
            onNewProject={onNewProject}
          />
        );
    }
  };

  return (
    <OperatingModeLayout
      context={context}
      greeting={greeting}
      focusSession={focusSession}
      ambientActivity={ambientActivity}
      nextEvent={nextEvent}
      timeline={timeline}
      alerts={alerts}
      suggestions={suggestions}
      onStartFocus={onStartFocus}
      onAlert={onAlert}
      onAction={onAction}
      onContextSwitch={onContextSwitch}
    >
      {renderModeContent()}
    </OperatingModeLayout>
  );
}
