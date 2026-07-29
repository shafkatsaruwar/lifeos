/**
 * UrgentAlerts Component
 * Display urgent items: interviews, deadlines, follow-ups
 */

import { AlertCircle, Calendar } from "lucide-react";
import type { UrgentAlertProps } from "./types";
import { getUrgencyColor, getTimeUntil } from "@/lib/workosHelpers";

export function UrgentAlert({
  type,
  title,
  daysUntil,
  project,
  onOpen,
}: UrgentAlertProps) {
  const typeLabel = {
    interview: "🎤 Interview",
    deadline: "📋 Deadline",
    followup: "📞 Follow-up",
  }[type];

  const urgencyColor = getUrgencyColor(daysUntil);
  const daysText =
    daysUntil < 0
      ? "Overdue"
      : daysUntil === 0
        ? "Today"
        : daysUntil === 1
          ? "Tomorrow"
          : `${daysUntil} day${daysUntil !== 1 ? "s" : ""} left`;

  return (
    <div
      className="workos-urgent-alert"
      style={{ borderLeftColor: urgencyColor }}
      onClick={onOpen}
    >
      <div className="alert-header">
        <div className="alert-type">
          <AlertCircle size={14} style={{ color: urgencyColor }} />
          <span className="type-label">{typeLabel}</span>
        </div>
        <div className="alert-days" style={{ color: urgencyColor }}>
          {daysText}
        </div>
      </div>

      <div className="alert-title">
        <strong>{title}</strong>
      </div>

      {project && <div className="alert-project">📌 {project}</div>}

      <button className="alert-action" onClick={(e) => {
        e.stopPropagation();
        onOpen?.();
      }}>
        View Details →
      </button>

      <style jsx>{`
        .workos-urgent-alert {
          background: linear-gradient(
            135deg,
            rgba(255, 59, 48, 0.04) 0%,
            rgba(255, 59, 48, 0.02) 100%
          );
          border: 1px solid rgba(255, 59, 48, 0.1);
          border-left: 3px solid;
          border-radius: 8px;
          padding: 12px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .workos-urgent-alert:hover {
          border-color: rgba(255, 59, 48, 0.2);
          box-shadow: 0 4px 12px rgba(255, 59, 48, 0.12);
          transform: translateY(-1px);
        }

        .alert-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .alert-type {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .type-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .alert-days {
          font-size: 12px;
          font-weight: 600;
        }

        .alert-title strong {
          font-size: 13px;
          color: var(--text-primary);
        }

        .alert-project {
          font-size: 11px;
          color: var(--text-secondary);
        }

        .alert-action {
          background: none;
          border: none;
          font-size: 11px;
          font-weight: 600;
          color: #ff3b30;
          cursor: pointer;
          padding: 0;
          text-align: left;
          transition: all 0.2s;
        }

        .alert-action:hover {
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
}

export function UrgentAlerts({
  alerts,
  onOpen,
}: {
  alerts: UrgentAlertProps[];
  onOpen?: (type: string, index: number) => void;
}) {
  if (alerts.length === 0) return null;

  return (
    <div className="workos-urgent-section">
      <div className="urgent-header">
        <AlertCircle size={18} />
        <h3>Urgent {alerts.length > 1 ? `(${alerts.length})` : ""}</h3>
      </div>
      <div className="urgent-alerts-grid">
        {alerts.map((alert, index) => (
          <UrgentAlert
            key={index}
            {...alert}
            onOpen={() => onOpen?.(alert.type, index)}
          />
        ))}
      </div>

      <style jsx>{`
        .workos-urgent-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .urgent-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 2px;
        }

        .urgent-header h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .urgent-header svg {
          color: #ff3b30;
        }

        .urgent-alerts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 10px;
        }

        @media (max-width: 768px) {
          .urgent-alerts-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
