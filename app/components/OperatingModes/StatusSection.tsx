/**
 * StatusSection Component
 * Shows urgent, this week, and in-progress alerts
 */

import { motion } from 'framer-motion';
import { AlertCircle, Clock, Flame } from 'lucide-react';

export type StatusAlert = {
  id: string;
  level: 'urgent' | 'upcoming' | 'active';
  title: string;
  meta?: string;
  icon?: string;
  color?: string;
  action?: string;
};

export function StatusSection({
  alerts,
  onAlert,
}: {
  alerts: StatusAlert[];
  onAlert: (alert: StatusAlert) => void;
}) {
  if (alerts.length === 0) return null;

  const urgentAlerts = alerts.filter(a => a.level === 'urgent');
  const upcomingAlerts = alerts.filter(a => a.level === 'upcoming');
  const activeAlerts = alerts.filter(a => a.level === 'active');

  const renderAlertGroup = (
    level: 'urgent' | 'upcoming' | 'active',
    items: StatusAlert[],
  ) => {
    if (items.length === 0) return null;

    const levelConfig = {
      urgent: {
        icon: AlertCircle,
        label: '🔴 URGENT (Today)',
        color: '#ff3b30',
      },
      upcoming: {
        icon: Clock,
        label: '🟡 THIS WEEK',
        color: '#ff9500',
      },
      active: {
        icon: Flame,
        label: '🟢 IN PROGRESS',
        color: '#34c759',
      },
    };

    const config = levelConfig[level];
    const Icon = config.icon;

    return (
      <motion.div
        key={level}
        className="status-group"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="status-group-header">
          <h3>{config.label}</h3>
        </div>
        <div className="status-group-items">
          {items.map((alert) => (
            <motion.button
              key={alert.id}
              className="status-alert"
              onClick={() => onAlert(alert)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {alert.icon && <span className="alert-icon">{alert.icon}</span>}
              <div className="alert-content">
                <strong>{alert.title}</strong>
                {alert.meta && <p>{alert.meta}</p>}
              </div>
              {alert.action && <span className="alert-action">→</span>}
            </motion.button>
          ))}
        </div>
      </motion.div>
    );
  };

  return (
    <motion.div
      className="status-section"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.15 }}
    >
      {renderAlertGroup('urgent', urgentAlerts)}
      {renderAlertGroup('upcoming', upcomingAlerts)}
      {renderAlertGroup('active', activeAlerts)}
    </motion.div>
  );
}

export const StatusSectionStyles = `
  .status-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 0 24px;
  }

  .status-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .status-group-header {
    padding: 0 0 4px 0;
  }

  .status-group-header h3 {
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-secondary);
  }

  .status-group-items {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .status-alert {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px;
    background: rgba(0, 0, 0, 0.02);
    border: 1px solid rgba(0, 0, 0, 0.04);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
    border-left: 3px solid transparent;
  }

  .status-alert:hover {
    background: rgba(0, 0, 0, 0.04);
    border-color: rgba(0, 0, 0, 0.08);
  }

  .status-alert .alert-icon {
    font-size: 16px;
    flex-shrink: 0;
  }

  .status-alert .alert-content {
    flex: 1;
    min-width: 0;
  }

  .status-alert strong {
    display: block;
    font-size: 13px;
    color: var(--text-primary);
    margin-bottom: 2px;
  }

  .status-alert p {
    margin: 0;
    font-size: 12px;
    color: var(--text-secondary);
  }

  .status-alert .alert-action {
    color: var(--text-secondary);
    font-size: 12px;
    flex-shrink: 0;
  }

  @media (max-width: 768px) {
    .status-section {
      padding: 0 16px;
    }
  }
`;
