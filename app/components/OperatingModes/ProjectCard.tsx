/**
 * ProjectCard Component
 * Displays a project with status, momentum, and linked tasks
 */

import { motion } from 'framer-motion';
import { ChevronRight, Flame, AlertCircle, Clock } from 'lucide-react';
import type { Project } from '@/lib/contextArchitecture';

export type ProjectCardProps = {
  project: Project;
  momentum?: 'High' | 'Medium' | 'Dormant' | 'Blocked';
  linkedTaskCount?: number;
  nextMilestone?: { title: string; dueDate: string } | null;
  lastUpdated?: string;
  onClick?: () => void;
  onTitleClick?: () => void;
};

export function ProjectCard({
  project,
  momentum = 'Medium',
  linkedTaskCount = 0,
  nextMilestone = null,
  lastUpdated,
  onClick,
  onTitleClick,
}: ProjectCardProps) {
  const getMomentumIcon = (m: string) => {
    switch (m) {
      case 'High':
        return <Flame size={14} className="momentum-high" />;
      case 'Dormant':
        return <Clock size={14} className="momentum-dormant" />;
      case 'Blocked':
        return <AlertCircle size={14} className="momentum-blocked" />;
      default:
        return null;
    }
  };

  const getMomentumColor = (m: string) => {
    switch (m) {
      case 'High':
        return '#ff3b30';
      case 'Medium':
        return '#ff9500';
      case 'Dormant':
        return '#8e8e93';
      case 'Blocked':
        return '#ff3b30';
      default:
        return '#8e8e93';
    }
  };

  return (
    <motion.div
      className="project-card"
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      whileHover={{ y: -2 }}
    >
      <div className="project-header">
        <div className="project-title-section">
          <button
            className="project-title-btn"
            onClick={(e) => {
              e.stopPropagation();
              onTitleClick?.();
            }}
          >
            <h4 className="project-title">{project.name}</h4>
            <span className="title-action"><ChevronRight size={14} /></span>
          </button>
          {project.description && (
            <p className="project-description">{project.description}</p>
          )}
        </div>
        <div className="project-momentum">
          <span
            className={`momentum-badge momentum-${momentum.toLowerCase()}`}
            style={{ color: getMomentumColor(momentum) }}
            title={`Momentum: ${momentum}`}
          >
            {getMomentumIcon(momentum)}
            <span className="momentum-label">{momentum}</span>
          </span>
        </div>
      </div>

      <div className="project-meta">
        {linkedTaskCount > 0 && (
          <div className="meta-item">
            <span className="meta-label">{linkedTaskCount}</span>
            <span className="meta-text">
              {linkedTaskCount === 1 ? 'task' : 'tasks'}
            </span>
          </div>
        )}

        {nextMilestone && (
          <div className="meta-item">
            <span className="meta-label">{nextMilestone.title}</span>
            <span className="meta-text">{nextMilestone.dueDate}</span>
          </div>
        )}

        {lastUpdated && (
          <div className="meta-item">
            <span className="meta-text">Updated {lastUpdated}</span>
          </div>
        )}
      </div>

      <style jsx>{`
        .project-card {
          padding: 16px;
          background: var(--bg-secondary);
          border: 1px solid rgba(0, 0, 0, 0.04);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .project-card:hover {
          background: rgba(98, 90, 246, 0.02);
          border-color: rgba(98, 90, 246, 0.15);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
        }

        .project-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .project-title-section {
          flex: 1;
          min-width: 0;
        }

        .project-title-btn {
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          text-align: left;
          display: flex;
          align-items: center;
          gap: 6px;
          width: 100%;
        }

        .project-title {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          transition: color 0.2s;
        }

        .project-title-btn:hover .project-title {
          color: #625af6;
        }

        .title-action {
          color: var(--text-secondary);
          transition: all 0.2s;
          flex-shrink: 0;
          opacity: 0;
        }

        .project-title-btn:hover .title-action {
          opacity: 1;
          color: #625af6;
        }

        .project-description {
          margin: 4px 0 0 0;
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .project-momentum {
          flex-shrink: 0;
        }

        .momentum-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 4px 8px;
          background: rgba(0, 0, 0, 0.02);
          border-radius: 4px;
          white-space: nowrap;
        }

        .momentum-badge svg {
          width: 12px;
          height: 12px;
        }

        .momentum-label {
          display: none;
        }

        .project-meta {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding-top: 8px;
          border-top: 1px solid rgba(0, 0, 0, 0.02);
        }

        .meta-item {
          display: flex;
          gap: 8px;
          font-size: 12px;
          align-items: baseline;
        }

        .meta-label {
          font-weight: 600;
          color: var(--text-primary);
          min-width: fit-content;
        }

        .meta-text {
          color: var(--text-secondary);
          font-size: 11px;
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        @media (max-width: 768px) {
          .project-card {
            padding: 12px;
          }

          .project-header {
            gap: 8px;
          }

          .momentum-label {
            display: inline;
          }

          .project-momentum {
            display: none;
          }
        }
      `}</style>
    </motion.div>
  );
}
