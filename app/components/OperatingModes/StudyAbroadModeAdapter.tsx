/**
 * StudyAbroadModeAdapter Component
 * Bridges existing StudyAbroadDashboard data to new OperatingModeView
 */

'use client';

import { useMemo } from 'react';
import { OperatingModeView } from './OperatingModeView';
import type { StudyAbroadHub } from '@/lib/studyAbroadTypes';

export interface StudyAbroadModeAdapterProps {
  hub: StudyAbroadHub;
  onOpenUniversities: () => void;
  onOpenPrograms: () => void;
  onOpenApplications: () => void;
  onOpenScholarships: () => void;
  onOpenDocuments: () => void;
}

export function StudyAbroadModeAdapter({
  hub,
  onOpenUniversities,
  onOpenPrograms,
  onOpenApplications,
  onOpenScholarships,
  onOpenDocuments,
}: StudyAbroadModeAdapterProps) {
  // Build application status counts
  const applicationsByStatus = useMemo(() => {
    const counts: Record<string, number> = {
      'not-started': 0,
      'in-progress': 0,
      submitted: 0,
      accepted: 0,
      rejected: 0,
      waitlisted: 0,
    };

    hub.universities?.forEach(uni => {
      const status = uni.applicationStatus || 'not-started';
      counts[status] = (counts[status] || 0) + 1;
    });

    return counts;
  }, [hub]);

  // Build momentum map for universities
  const momentumMap = useMemo(() => {
    const map: Record<string, 'High' | 'Medium' | 'Dormant' | 'Blocked'> = {};
    hub.universities?.forEach(uni => {
      const status = uni.applicationStatus || 'not-started';
      if (status === 'accepted') map[uni.id] = 'High';
      else if (status === 'submitted' || status === 'in-progress') map[uni.id] = 'Medium';
      else if (status === 'rejected' || status === 'waitlisted') map[uni.id] = 'Blocked';
      else map[uni.id] = 'Dormant';
    });
    return map;
  }, [hub]);

  // Convert universities to ContextProject format
  const contextProjects = useMemo(() => {
    return (hub.universities || []).map(uni => ({
      id: uni.id,
      name: uni.name,
      description: `${uni.location || 'Location TBD'} • ${uni.country || 'Country TBD'}`,
      status: 'active' as const,
      scope: 'study-abroad' as const,
      milestone: '',
      progress: 0,
      color: '#625af6',
      applicationStatus: uni.applicationStatus,
      applicationDeadline: uni.applicationDeadline,
    }));
  }, [hub]);

  // Get suggestions based on hub state
  const suggestions = useMemo(() => {
    const completed = Object.values(applicationsByStatus).reduce((a, b) => a + b, 0) > 0;
    return [
      'Research programs that align with your goals',
      'Start gathering required documents early',
      'Reach out to alumni for insights',
    ];
  }, [applicationsByStatus]);

  // Build alerts from pending applications
  const alerts = useMemo(() => {
    const pendingApps = (hub.universities || [])
      .filter(uni => uni.applicationStatus === 'in-progress' || !uni.applicationStatus)
      .slice(0, 3)
      .map(uni => ({
        id: `uni-${uni.id}`,
        level: 'urgent' as const,
        title: uni.name,
        meta: uni.applicationDeadline || 'No deadline set',
        icon: '🌍',
        action: 'open',
      }));

    return pendingApps;
  }, [hub]);

  return (
    <OperatingModeView
      context="Study Abroad"
      greeting={`Make your study abroad journey real. You're exploring ${hub.universities?.length || 0} universities.`}
      focusSession={null}
      ambientActivity={null}
      nextEvent={null}
      timeline={[]}
      alerts={alerts}
      suggestions={suggestions}
      projects={contextProjects as any}
      momentumMap={momentumMap}
      applicationsByStatus={applicationsByStatus}
      onStartFocus={() => {}}
      onAlert={(alert) => {
        if (alert.id.startsWith('uni-')) {
          onOpenUniversities();
        }
      }}
      onAction={(action) => {
        if (action === 'program') onOpenPrograms();
        if (action === 'application') onOpenApplications();
        if (action === 'scholarship') onOpenScholarships();
        if (action === 'document') onOpenDocuments();
      }}
      onContextSwitch={() => {}}
      onProjectClick={(project) => onOpenUniversities()}
      onNewProject={onOpenUniversities}
    />
  );
}
