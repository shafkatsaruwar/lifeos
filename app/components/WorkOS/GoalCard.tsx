/**
 * GoalCard Component
 * Display professional goals with progress and linked project
 */

import { Target, Calendar } from "lucide-react";
import type { GoalCardProps } from "./types";
import { getTimeUntil } from "@/lib/workosHelpers";

export function GoalCard({
  name,
  progress,
  linkedProjectName,
  linkedTaskCount,
  targetDate,
  status,
  onOpen,
}: GoalCardProps) {
  const statusColors = {
    active: "#625af6",
    paused: "#95a5a6",
    achieved: "#47a47b",
  };

  const statusLabels = {
    active: "In progress",
    paused: "Paused",
    achieved: "Achieved",
  };

  return (
    <div className="workos-goal-card">
      <div className="card-header">
        <div className="goal-title">
          <strong>{name}</strong>
        </div>
        <span className="status-badge" style={{ color: statusColors[status] }}>
          {statusLabels[status]}
        </span>
      </div>

      <div className="progress-section">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${progress}%`,
              backgroundColor: statusColors[status],
            }}
          />
        </div>
        <span className="progress-text">{progress}%</span>
      </div>

      <div className="goal-meta">
        {linkedProjectName && (
          <div className="meta-item">
            <Target size={14} />
            <span>{linkedProjectName}</span>
          </div>
        )}
        {linkedTaskCount !== undefined && linkedTaskCount > 0 && (
          <div className="meta-item">
            <span className="meta-label">{linkedTaskCount} task{linkedTaskCount !== 1 ? "s" : ""}</span>
          </div>
        )}
        {targetDate && (
          <div className="meta-item">
            <Calendar size={14} />
            <span>{getTimeUntil(new Date(targetDate))}</span>
          </div>
        )}
      </div>

      {status !== "achieved" && (
        <button className="view-goal-button" onClick={onOpen}>
          View Goal
        </button>
      )}

      <style jsx>{`
        .workos-goal-card {
          background: white;
          border: 1px solid rgba(0, 0, 0, 0.06);
          border-radius: 8px;
          padding: 14px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .workos-goal-card:hover {
          border-color: rgba(0, 0, 0, 0.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .goal-title strong {
          font-size: 14px;
          color: var(--text-primary);
        }

        .status-badge {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .progress-section {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .progress-bar {
          flex: 1;
          height: 6px;
          background: rgba(0, 0, 0, 0.04);
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          transition: width 0.3s ease, background-color 0.2s ease;
        }

        .progress-text {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          min-width: 28px;
          text-align: right;
        }

        .goal-meta {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 12px;
          color: var(--text-secondary);
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .meta-item svg {
          flex-shrink: 0;
          opacity: 0.6;
        }

        .meta-label {
          font-weight: 500;
        }

        .view-goal-button {
          background: rgba(98, 90, 246, 0.1);
          border: 1px solid rgba(98, 90, 246, 0.2);
          border-radius: 4px;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 500;
          color: #625af6;
          cursor: pointer;
          transition: all 0.2s;
        }

        .view-goal-button:hover {
          background: rgba(98, 90, 246, 0.2);
          border-color: #625af6;
        }
      `}</style>
    </div>
  );
}
