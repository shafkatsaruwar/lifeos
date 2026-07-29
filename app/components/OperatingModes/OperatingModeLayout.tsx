/**
 * OperatingModeLayout Component
 * Wrapper providing consistent structure for all operating modes
 */

import { motion } from 'framer-motion';
import type { OperatingContext, FocusSession, CalendarEvent } from '@/lib/contextArchitecture';
import type { AmbientActivity } from '@/app/page';
import { ModeHero } from './ModeHero';
import { QuickActionsBar } from './QuickActionsBar';
import { StatusSection, type StatusAlert } from './StatusSection';
import { AssistantPanel } from './AssistantPanel';
import { getContextAwareConfig } from '@/lib/contextAwarUI';

export function OperatingModeLayout({
  context,
  greeting,
  focusSession,
  ambientActivity,
  nextEvent,
  timeline,
  alerts,
  suggestions,
  children,
  onStartFocus,
  onAlert,
  onAction,
  onContextSwitch,
}: {
  context: OperatingContext;
  greeting: string;
  focusSession?: FocusSession | null;
  ambientActivity?: AmbientActivity | null;
  nextEvent?: { time: string; title: string } | null;
  timeline: CalendarEvent[];
  alerts: StatusAlert[];
  suggestions: string[];
  children: React.ReactNode;
  onStartFocus: () => void;
  onAlert: (alert: StatusAlert) => void;
  onAction: (action: string, context?: any) => void;
  onContextSwitch: (context: OperatingContext) => void;
}) {
  const config = getContextAwareConfig(context);

  return (
    <motion.div
      className="operating-mode-layout"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Navigation Tabs */}
      <nav className="mode-nav">
        <div className="mode-nav-container">
          {(['Work', 'School', 'Life', 'Photography', 'Travel', 'Health', 'Study Abroad'] as OperatingContext[]).map((ctx) => (
            <button
              key={ctx}
              className={`mode-nav-item ${context === ctx ? 'active' : ''}`}
              onClick={() => onContextSwitch(ctx)}
              title={`Switch to ${ctx}`}
            >
              <span className="mode-name">{ctx}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="mode-container">
        {/* Sidebar */}
        <aside className="mode-sidebar">
          <div className="sidebar-section">
            <h4 className="sidebar-title">Focus</h4>
            {focusSession && focusSession.status === 'active' ? (
              <div className="focus-widget active">
                <div className="focus-pulse"></div>
                <p className="focus-name">{focusSession.name}</p>
              </div>
            ) : (
              <button className="sidebar-btn primary" onClick={onStartFocus}>
                Start Focus
              </button>
            )}
          </div>

          <div className="sidebar-section">
            <h4 className="sidebar-title">Operating Mode</h4>
            <p className="sidebar-value">{context}</p>
          </div>

          {nextEvent && (
            <div className="sidebar-section">
              <h4 className="sidebar-title">Next Event</h4>
              <div className="next-event-card">
                <p className="event-time">{nextEvent.time}</p>
                <p className="event-title">{nextEvent.title}</p>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="mode-content">
          <ModeHero
            context={context}
            greeting={greeting}
            focusSession={focusSession}
            ambientActivity={ambientActivity}
            nextEvent={nextEvent}
            onStartFocus={onStartFocus}
          />

          <QuickActionsBar
            actions={config.quickCaptureOptions}
            onAction={onAction}
          />

          {alerts.length > 0 && (
            <StatusSection
              alerts={alerts}
              onAlert={onAlert}
            />
          )}

          <div className="mode-main-content">
            {children}
          </div>
        </main>

        {/* Assistant Panel (Right Sidebar) */}
        <AssistantPanel
          timeline={timeline}
          focusSession={focusSession}
          suggestions={suggestions}
          onAction={onAction}
        />
      </div>

      <style jsx>{`
        .operating-mode-layout {
          display: flex;
          flex-direction: column;
          height: 100vh;
          width: 100%;
          background: var(--bg-primary);
          overflow: hidden;
        }

        .mode-nav {
          border-bottom: 1px solid rgba(0, 0, 0, 0.04);
          background: var(--bg-secondary);
          padding: 0;
          height: 48px;
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }

        .mode-nav-container {
          display: flex;
          gap: 1px;
          padding: 0 16px;
          width: 100%;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .mode-nav-container::-webkit-scrollbar {
          display: none;
        }

        .mode-nav-item {
          padding: 12px 16px;
          background: none;
          border: none;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          position: relative;
          border-bottom: 2px solid transparent;
        }

        .mode-nav-item:hover {
          color: var(--text-primary);
        }

        .mode-nav-item.active {
          color: #625af6;
          border-bottom-color: #625af6;
        }

        .mode-container {
          display: flex;
          flex: 1;
          overflow: hidden;
          gap: 0;
        }

        .mode-sidebar {
          width: 180px;
          padding: 20px 16px;
          background: var(--bg-secondary);
          border-right: 1px solid rgba(0, 0, 0, 0.04);
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
          flex-shrink: 0;
        }

        .sidebar-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .sidebar-title {
          margin: 0;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-secondary);
        }

        .sidebar-value {
          margin: 0;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .focus-widget {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.02);
          border-radius: 6px;
          position: relative;
        }

        .focus-widget.active {
          background: rgba(98, 90, 246, 0.08);
          border: 1px solid rgba(98, 90, 246, 0.2);
        }

        .focus-pulse {
          width: 8px;
          height: 8px;
          background: #625af6;
          border-radius: 50%;
          animation: pulse 2s infinite;
          flex-shrink: 0;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.2);
          }
        }

        .focus-name {
          margin: 0;
          font-size: 12px;
          font-weight: 500;
          color: #625af6;
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .sidebar-btn {
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.02);
          border: 1px solid rgba(0, 0, 0, 0.04);
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
          width: 100%;
        }

        .sidebar-btn:hover {
          background: rgba(0, 0, 0, 0.04);
          color: var(--text-primary);
        }

        .sidebar-btn.primary {
          background: #625af6;
          border-color: #625af6;
          color: white;
        }

        .sidebar-btn.primary:hover {
          background: #4f4de0;
          box-shadow: 0 2px 8px rgba(98, 90, 246, 0.2);
        }

        .next-event-card {
          padding: 8px 10px;
          background: rgba(98, 90, 246, 0.04);
          border-radius: 4px;
        }

        .event-time {
          margin: 0 0 4px 0;
          font-size: 12px;
          font-weight: 600;
          color: #625af6;
        }

        .event-title {
          margin: 0;
          font-size: 12px;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .mode-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          overflow-x: hidden;
        }

        .mode-main-content {
          flex: 1;
          padding: 24px;
          overflow-y: auto;
        }

        @media (max-width: 1024px) {
          .mode-sidebar {
            display: none;
          }
        }

        @media (max-width: 768px) {
          .mode-nav-container {
            padding: 0 12px;
          }

          .mode-nav-item {
            padding: 12px 12px;
            font-size: 12px;
          }

          .mode-main-content {
            padding: 16px;
          }
        }
      `}</style>
    </motion.div>
  );
}
