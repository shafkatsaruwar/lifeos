/**
 * AssistantPanel Component
 * Right sidebar showing timeline, current focus, and AI suggestions
 */

import { motion } from 'framer-motion';
import { Clock, Zap, AlertCircle, Play } from 'lucide-react';
import type { FocusSession, CalendarEvent } from '@/lib/contextArchitecture';

export function AssistantPanel({
  timeline,
  focusSession,
  suggestions,
  onAction,
}: {
  timeline: CalendarEvent[];
  focusSession?: FocusSession | null;
  suggestions: string[];
  onAction: (action: string, context?: any) => void;
}) {
  const nextEvents = timeline.slice(0, 3);

  return (
    <motion.aside
      className="assistant-panel"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      {/* Today's Timeline */}
      <div className="panel-section">
        <h3 className="panel-title">
          <Clock size={14} />
          Today&apos;s Timeline
        </h3>
        {nextEvents.length > 0 ? (
          <div className="timeline-list">
            {nextEvents.map((event) => (
              <div key={event.id} className="timeline-item">
                <div className="event-time">
                  {formatEventTime(event.start)}
                </div>
                <div className="event-info">
                  <strong>{event.title}</strong>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-text">No events today</p>
        )}
      </div>

      {/* Current Focus */}
      <div className="panel-section">
        <h3 className="panel-title">
          <Zap size={14} />
          Current Focus
        </h3>
        {focusSession && focusSession.status === 'active' ? (
          <div className="focus-status active">
            <p className="focus-name">{focusSession.name}</p>
            <p className="focus-goal">{focusSession.goal}</p>
            <button
              className="action-btn secondary"
              onClick={() => onAction('pause-focus')}
            >
              Pause
            </button>
          </div>
        ) : (
          <div className="focus-status">
            <p className="empty-text">No active session</p>
            <button
              className="action-btn primary"
              onClick={() => onAction('start-focus')}
            >
              <Play size={12} />
              Start Focus
            </button>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="panel-section">
        <h3 className="panel-title">
          <AlertCircle size={14} />
          Quick Actions
        </h3>
        <div className="actions-list">
          <button
            className="action-btn"
            onClick={() => onAction('new-task')}
          >
            + Task
          </button>
          <button
            className="action-btn"
            onClick={() => onAction('new-project')}
          >
            + Project
          </button>
          <button
            className="action-btn"
            onClick={() => onAction('capture')}
          >
            + Capture
          </button>
        </div>
      </div>

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <div className="panel-section">
          <h3 className="panel-title">💡 AI Tips</h3>
          <div className="suggestions-list">
            {suggestions.map((suggestion, index) => (
              <div key={index} className="suggestion-item">
                <p>{suggestion}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.aside>
  );
}

function formatEventTime(start: string): string {
  const date = new Date(start);
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export const AssistantPanelStyles = `
  .assistant-panel {
    width: 280px;
    padding: 20px;
    background: rgba(0, 0, 0, 0.01);
    border-left: 1px solid rgba(0, 0, 0, 0.04);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .panel-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .panel-title {
    margin: 0;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .timeline-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .timeline-item {
    display: flex;
    gap: 8px;
    font-size: 12px;
  }

  .event-time {
    font-weight: 600;
    color: #625af6;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .event-info strong {
    display: block;
    font-size: 12px;
    color: var(--text-primary);
  }

  .focus-status {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 10px;
    background: rgba(0, 0, 0, 0.02);
    border-radius: 6px;
  }

  .focus-status.active {
    background: linear-gradient(135deg, rgba(98, 90, 246, 0.08) 0%, rgba(98, 90, 246, 0.04) 100%);
    border: 1px solid rgba(98, 90, 246, 0.2);
  }

  .focus-name {
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .focus-goal {
    margin: 0;
    font-size: 11px;
    color: var(--text-secondary);
  }

  .empty-text {
    margin: 0;
    font-size: 12px;
    color: var(--text-secondary);
  }

  .actions-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .action-btn {
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.02);
    border: 1px solid rgba(0, 0, 0, 0.04);
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .action-btn:hover {
    background: rgba(0, 0, 0, 0.04);
    color: var(--text-primary);
  }

  .action-btn.primary {
    background: #625af6;
    border-color: #625af6;
    color: white;
    justify-content: center;
  }

  .action-btn.primary:hover {
    background: #4f4de0;
  }

  .action-btn.secondary {
    background: transparent;
    border-color: #625af6;
    color: #625af6;
  }

  .action-btn.secondary:hover {
    background: rgba(98, 90, 246, 0.05);
  }

  .suggestions-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .suggestion-item {
    padding: 8px 10px;
    background: rgba(98, 90, 246, 0.04);
    border-radius: 4px;
  }

  .suggestion-item p {
    margin: 0;
    font-size: 12px;
    color: var(--text-primary);
    line-height: 1.4;
  }

  @media (max-width: 1024px) {
    .assistant-panel {
      display: none;
    }
  }
`;
