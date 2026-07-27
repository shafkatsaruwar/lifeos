'use client';

import React, { useMemo } from 'react';
import {
  StudyAbroadHub,
  Application,
  Scholarship,
  Program,
  DecisionRecord,
} from '@/lib/studyAbroadTypes';

interface TimelineEvent {
  id: string;
  date: string;
  timestamp: number;
  title: string;
  description: string;
  type: 'application' | 'scholarship' | 'program' | 'decision' | 'followup';
  status: string;
  daysUntil?: number;
  daysUntilLabel?: string;
  category: 'past' | 'upcoming' | 'future';
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getDaysUntil = (dateStr: string): number | undefined => {
  if (!dateStr) return undefined;
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diff = date.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const formatDaysUntil = (days: number): string => {
  if (days < 0) return 'Overdue';
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  if (days <= 7) return `${days} days`;
  if (days <= 30) return `${Math.ceil(days / 7)} weeks`;
  return `${Math.ceil(days / 30)} months`;
};

const getEventColor = (type: string): string => {
  switch (type) {
    case 'application':
      return '#625af6';
    case 'scholarship':
      return '#31926a';
    case 'program':
      return '#d38232';
    case 'decision':
      return '#3f7ed7';
    case 'followup':
      return '#cc8a25';
    default:
      return '#777b84';
  }
};

interface Props {
  studyAbroadHub: StudyAbroadHub;
  onClose: () => void;
}

export default function StudyAbroadTimeline({
  studyAbroadHub,
  onClose,
}: Props) {
  const events = useMemo(() => {
    const allEvents: TimelineEvent[] = [];

    // Programs with application deadlines
    studyAbroadHub.programs.forEach((program: Program) => {
      if (program.applicationDeadline) {
        const daysUntil = getDaysUntil(program.applicationDeadline);
        allEvents.push({
          id: `prog-app-${program.id}`,
          date: program.applicationDeadline,
          timestamp: new Date(program.applicationDeadline).getTime(),
          title: `${program.name} Application Deadline`,
          description: `Application for ${program.name} at a university`,
          type: 'application',
          status: program.applicationStatus,
          daysUntil,
          daysUntilLabel: daysUntil !== undefined ? formatDaysUntil(daysUntil) : '',
          category: !daysUntil || daysUntil < 0 ? 'past' : daysUntil <= 30 ? 'upcoming' : 'future',
        });
      }

      if (program.scholarshipDeadline) {
        const daysUntil = getDaysUntil(program.scholarshipDeadline);
        allEvents.push({
          id: `prog-schol-${program.id}`,
          date: program.scholarshipDeadline,
          timestamp: new Date(program.scholarshipDeadline).getTime(),
          title: `${program.name} Scholarship Deadline`,
          description: `Scholarship application for ${program.name}`,
          type: 'scholarship',
          status: 'researching',
          daysUntil,
          daysUntilLabel: daysUntil !== undefined ? formatDaysUntil(daysUntil) : '',
          category: !daysUntil || daysUntil < 0 ? 'past' : daysUntil <= 30 ? 'upcoming' : 'future',
        });
      }
    });

    // Applications with deadlines
    studyAbroadHub.applications.forEach((app: Application) => {
      if (app.applicationDeadline) {
        const daysUntil = getDaysUntil(app.applicationDeadline);
        allEvents.push({
          id: `app-${app.id}`,
          date: app.applicationDeadline,
          timestamp: new Date(app.applicationDeadline).getTime(),
          title: 'Application Deadline',
          description: app.notes || 'Submit your application',
          type: 'application',
          status: app.status,
          daysUntil,
          daysUntilLabel: daysUntil !== undefined ? formatDaysUntil(daysUntil) : '',
          category: !daysUntil || daysUntil < 0 ? 'past' : daysUntil <= 30 ? 'upcoming' : 'future',
        });
      }

      if (app.scholarshipDeadline) {
        const daysUntil = getDaysUntil(app.scholarshipDeadline);
        allEvents.push({
          id: `app-schol-${app.id}`,
          date: app.scholarshipDeadline,
          timestamp: new Date(app.scholarshipDeadline).getTime(),
          title: 'Scholarship Deadline',
          description: 'Submit scholarship application',
          type: 'scholarship',
          status: app.status,
          daysUntil,
          daysUntilLabel: daysUntil !== undefined ? formatDaysUntil(daysUntil) : '',
          category: !daysUntil || daysUntil < 0 ? 'past' : daysUntil <= 30 ? 'upcoming' : 'future',
        });
      }

      if (app.followUpDate) {
        const daysUntil = getDaysUntil(app.followUpDate);
        allEvents.push({
          id: `followup-${app.id}`,
          date: app.followUpDate,
          timestamp: new Date(app.followUpDate).getTime(),
          title: 'Follow-up Date',
          description: 'Check application status',
          type: 'followup',
          status: app.status,
          daysUntil,
          daysUntilLabel: daysUntil !== undefined ? formatDaysUntil(daysUntil) : '',
          category: !daysUntil || daysUntil < 0 ? 'past' : daysUntil <= 30 ? 'upcoming' : 'future',
        });
      }
    });

    // Scholarships with deadlines
    studyAbroadHub.scholarships.forEach((scholarship: Scholarship) => {
      if (scholarship.deadline) {
        const daysUntil = getDaysUntil(scholarship.deadline);
        allEvents.push({
          id: `scholarship-${scholarship.id}`,
          date: scholarship.deadline,
          timestamp: new Date(scholarship.deadline).getTime(),
          title: `${scholarship.name} Deadline`,
          description: `Apply for ${scholarship.name}`,
          type: 'scholarship',
          status: scholarship.status,
          daysUntil,
          daysUntilLabel: daysUntil !== undefined ? formatDaysUntil(daysUntil) : '',
          category: !daysUntil || daysUntil < 0 ? 'past' : daysUntil <= 30 ? 'upcoming' : 'future',
        });
      }
    });

    // Decisions with dates
    studyAbroadHub.decisions.forEach((decision: DecisionRecord) => {
      if (decision.decisionDate) {
        const daysUntil = getDaysUntil(decision.decisionDate);
        allEvents.push({
          id: `decision-${decision.id}`,
          date: decision.decisionDate,
          timestamp: new Date(decision.decisionDate).getTime(),
          title: `Decision: ${decision.outcome}`,
          description: decision.officialReason || 'Application decision received',
          type: 'decision',
          status: decision.outcome,
          daysUntil,
          daysUntilLabel: daysUntil !== undefined ? formatDaysUntil(daysUntil) : '',
          category: !daysUntil || daysUntil < 0 ? 'past' : daysUntil <= 30 ? 'upcoming' : 'future',
        });
      }

      if (decision.appealDeadline) {
        const daysUntil = getDaysUntil(decision.appealDeadline);
        allEvents.push({
          id: `appeal-${decision.id}`,
          date: decision.appealDeadline,
          timestamp: new Date(decision.appealDeadline).getTime(),
          title: 'Appeal Deadline',
          description: 'Submit appeal if desired',
          type: 'decision',
          status: 'appeal_available',
          daysUntil,
          daysUntilLabel: daysUntil !== undefined ? formatDaysUntil(daysUntil) : '',
          category: !daysUntil || daysUntil < 0 ? 'past' : daysUntil <= 30 ? 'upcoming' : 'future',
        });
      }
    });

    // Sort by date
    return allEvents.sort((a, b) => a.timestamp - b.timestamp);
  }, [studyAbroadHub]);

  const eventsByCategory = useMemo(() => {
    return {
      past: events.filter((e) => e.category === 'past'),
      upcoming: events.filter((e) => e.category === 'upcoming'),
      future: events.filter((e) => e.category === 'future'),
    };
  }, [events]);

  return (
    <div className="study-abroad-timeline">
      <div className="timeline-header">
        <h2>Study Abroad Timeline</h2>
        <button onClick={onClose} className="timeline-close">
          ✕
        </button>
      </div>

      <div className="timeline-content">
        {/* Upcoming (most important) */}
        {eventsByCategory.upcoming.length > 0 && (
          <section className="timeline-section upcoming-section">
            <h3 className="section-title">
              🔴 Upcoming ({eventsByCategory.upcoming.length})
            </h3>
            <div className="timeline-events">
              {eventsByCategory.upcoming.map((event) => (
                <div key={event.id} className="timeline-event upcoming-event">
                  <div
                    className="event-marker"
                    style={{ backgroundColor: getEventColor(event.type) }}
                  />
                  <div className="event-content">
                    <div className="event-header">
                      <strong>{event.title}</strong>
                      <span className="days-until" style={{ color: getEventColor(event.type) }}>
                        {event.daysUntilLabel}
                      </span>
                    </div>
                    <p className="event-description">{event.description}</p>
                    <span className="event-date">{formatDate(event.date)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Future */}
        {eventsByCategory.future.length > 0 && (
          <section className="timeline-section future-section">
            <h3 className="section-title">📅 Future ({eventsByCategory.future.length})</h3>
            <div className="timeline-events">
              {eventsByCategory.future.map((event) => (
                <div key={event.id} className="timeline-event">
                  <div
                    className="event-marker"
                    style={{ backgroundColor: getEventColor(event.type) }}
                  />
                  <div className="event-content">
                    <div className="event-header">
                      <strong>{event.title}</strong>
                    </div>
                    <p className="event-description">{event.description}</p>
                    <span className="event-date">{formatDate(event.date)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Past */}
        {eventsByCategory.past.length > 0 && (
          <section className="timeline-section past-section">
            <h3 className="section-title">✓ Past ({eventsByCategory.past.length})</h3>
            <div className="timeline-events past-events">
              {eventsByCategory.past.map((event) => (
                <div key={event.id} className="timeline-event past-event">
                  <div
                    className="event-marker"
                    style={{ backgroundColor: getEventColor(event.type) }}
                  />
                  <div className="event-content">
                    <div className="event-header">
                      <strong>{event.title}</strong>
                    </div>
                    <p className="event-description">{event.description}</p>
                    <span className="event-date">{formatDate(event.date)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {events.length === 0 && (
          <div className="timeline-empty">
            <p>No events yet. Add universities, programs, or applications to see your timeline.</p>
          </div>
        )}
      </div>
    </div>
  );
}
