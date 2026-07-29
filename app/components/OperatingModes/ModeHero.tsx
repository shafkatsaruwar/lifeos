/**
 * ModeHero Component
 * Displays greeting, current focus session, and key context
 */

import { motion } from 'framer-motion';
import { Play, Pause, Clock, Target } from 'lucide-react';
import type { OperatingContext, FocusSession } from '@/lib/contextArchitecture';
import type { AmbientActivity } from '@/app/page';

export function ModeHero({
  context: _context,
  greeting,
  focusSession,
  ambientActivity: _ambientActivity,
  nextEvent,
  onStartFocus,
}: {
  context: OperatingContext;
  greeting: string;
  focusSession?: FocusSession | null;
  ambientActivity?: AmbientActivity | null;
  nextEvent?: { time: string; title: string } | null;
  onStartFocus: () => void;
}) {
  const now = new Date();
  const dayName = now.toLocaleDateString(undefined, { weekday: 'long' });
  const monthDay = now.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });

  return (
    <motion.div
      className="mode-hero"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="hero-greeting">
        <p className="eyebrow">{dayName}, {monthDay}</p>
        <h1>{greeting}</h1>
      </div>

      {focusSession && focusSession.status === 'active' ? (
        <motion.div
          className="hero-focus-active"
          animate={{ borderColor: ['rgba(98, 90, 246, 0.5)', 'rgba(98, 90, 246, 1)', 'rgba(98, 90, 246, 0.5)'] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="focus-info">
            <div className="focus-time">
              <Clock size={16} />
              <span>{formatDuration(focusSession.duration)}</span>
            </div>
            <div className="focus-details">
              <strong>{focusSession.name}</strong>
              <p>{focusSession.goal}</p>
            </div>
          </div>
          <button className="focus-action primary">
            <Pause size={14} /> Pause
          </button>
        </motion.div>
      ) : nextEvent ? (
        <div className="hero-next-event">
          <Target size={16} />
          <div>
            <strong>{nextEvent.time}</strong>
            <p>{nextEvent.title}</p>
          </div>
          <button className="focus-action secondary" onClick={onStartFocus}>
            <Play size={14} /> Focus
          </button>
        </div>
      ) : (
        <button className="hero-start-focus" onClick={onStartFocus}>
          <Play size={16} />
          Start Focus Session
        </button>
      )}

      <style jsx>{`
        .mode-hero {
          padding: 24px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.04);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .hero-greeting {
          flex: 1;
        }

        .hero-greeting .eyebrow {
          margin: 0 0 4px 0;
          font-size: 12px;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .hero-greeting h1 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .hero-focus-active,
        .hero-next-event {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: linear-gradient(135deg, rgba(98, 90, 246, 0.08) 0%, rgba(98, 90, 246, 0.04) 100%);
          border: 1px solid rgba(98, 90, 246, 0.2);
          border-radius: 8px;
          font-size: 13px;
        }

        .focus-info {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          min-width: 0;
        }

        .focus-time {
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 600;
          color: #625af6;
          white-space: nowrap;
        }

        .focus-details {
          flex: 1;
          min-width: 0;
        }

        .focus-details strong {
          display: block;
          font-size: 13px;
          margin-bottom: 2px;
        }

        .focus-details p {
          margin: 0;
          font-size: 12px;
          color: var(--text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .focus-action {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: #625af6;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .focus-action:hover {
          background: #4f4de0;
          box-shadow: 0 2px 8px rgba(98, 90, 246, 0.2);
        }

        .focus-action.secondary {
          background: transparent;
          color: #625af6;
          border: 1px solid #625af6;
        }

        .focus-action.secondary:hover {
          background: rgba(98, 90, 246, 0.05);
        }

        .hero-start-focus {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: #625af6;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .hero-start-focus:hover {
          background: #4f4de0;
          box-shadow: 0 4px 12px rgba(98, 90, 246, 0.2);
        }

        @media (max-width: 768px) {
          .mode-hero {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .hero-focus-active,
          .hero-next-event {
            width: 100%;
          }
        }
      `}</style>
    </motion.div>
  );
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
