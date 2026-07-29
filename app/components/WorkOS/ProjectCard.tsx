/**
 * ProjectCard Component
 * Beautiful project display showing progress, momentum, and quick actions
 */

import { ChevronRight, Zap, Flame, Clock3, AlertCircle } from "lucide-react";
import type { ProjectCardProps } from "./types";
import { getTimeUntil } from "@/lib/workosHelpers";

export function ProjectCard({
  project,
  momentum,
  lastActivity,
  linkedTasksCount,
  onOpen,
  onComplete,
}: ProjectCardProps) {
  const momentumIcon = {
    high: <Flame size={14} className="momentum-high" />,
    medium: <Zap size={14} className="momentum-medium" />,
    dormant: <Clock3 size={14} className="momentum-dormant" />,
    blocked: <AlertCircle size={14} className="momentum-blocked" />,
  }[momentum || "medium"];

  const taskCountText = linkedTasksCount === 1 ? "1 task" : `${linkedTasksCount} tasks`;

  return (
    <div className="workos-project-card" style={{ borderLeftColor: project.color }}>
      <div className="card-header">
        <div className="card-title">
          <button className="project-name-button" onClick={onOpen}>
            <strong>{project.name}</strong>
            <ChevronRight size={14} />
          </button>
        </div>
        {momentum && <span className="momentum-badge">{momentumIcon}</span>}
      </div>

      <div className="card-progress">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${project.progress}%`,
              backgroundColor: project.color,
            }}
          />
        </div>
        <span className="progress-text">{project.progress}%</span>
      </div>

      <div className="card-meta">
        <div className="meta-item">
          <span className="meta-label">Tasks</span>
          <span className="meta-value">{taskCountText}</span>
        </div>
        {lastActivity && (
          <div className="meta-item">
            <span className="meta-label">Last active</span>
            <span className="meta-value">
              {getTimeUntil(lastActivity)}
            </span>
          </div>
        )}
      </div>

      <div className="card-actions">
        <button className="action-button" onClick={onOpen}>
          View Project
        </button>
        {onComplete && (
          <button className="action-button secondary" onClick={onComplete}>
            Mark Done
          </button>
        )}
      </div>

      <style jsx>{`
        .workos-project-card {
          background: white;
          border: 1px solid rgba(0, 0, 0, 0.06);
          border-left: 4px solid;
          border-radius: 8px;
          padding: 16px;
          transition: all 0.2s;
        }

        .workos-project-card:hover {
          border-color: rgba(0, 0, 0, 0.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .card-title {
          flex: 1;
        }

        .project-name-button {
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .project-name-button:hover {
          color: var(--accent);
        }

        .project-name-button svg {
          opacity: 0;
          transition: opacity 0.2s;
        }

        .project-name-button:hover svg {
          opacity: 1;
        }

        .momentum-badge {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .momentum-high {
          color: #e67e22;
        }

        .momentum-medium {
          color: #f39c12;
        }

        .momentum-dormant {
          color: #95a5a6;
        }

        .momentum-blocked {
          color: #e74c3c;
        }

        .card-progress {
          margin-bottom: 12px;
        }

        .progress-bar {
          height: 6px;
          background: rgba(0, 0, 0, 0.04);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 4px;
        }

        .progress-fill {
          height: 100%;
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 12px;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .card-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 12px;
          padding: 8px 0;
          border-top: 1px solid rgba(0, 0, 0, 0.04);
          border-bottom: 1px solid rgba(0, 0, 0, 0.04);
        }

        .meta-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .meta-label {
          font-size: 11px;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .meta-value {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .card-actions {
          display: flex;
          gap: 8px;
        }

        .action-button {
          flex: 1;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 500;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 4px;
          background: white;
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-button:hover {
          background: rgba(0, 0, 0, 0.02);
          border-color: rgba(0, 0, 0, 0.2);
        }

        .action-button.secondary {
          opacity: 0.6;
        }

        .action-button.secondary:hover {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}
