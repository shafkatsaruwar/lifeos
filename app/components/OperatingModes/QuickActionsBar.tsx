/**
 * QuickActionsBar Component
 * Context-aware quick capture buttons
 */

import { motion } from 'framer-motion';
import type { QuickCaptureOption } from '@/lib/contextAwarUI';

export function QuickActionsBar({
  actions,
  onAction,
}: {
  actions: QuickCaptureOption[];
  onAction: (action: string) => void;
}) {
  return (
    <motion.div
      className="quick-actions-bar"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      {actions.map((action, index) => (
        <motion.button
          key={action.action}
          className="quick-action-btn"
          onClick={() => onAction(action.action)}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: index * 0.05 }}
          title={action.description}
        >
          <span className="action-icon">{action.icon}</span>
          <span className="action-label">{action.label}</span>
        </motion.button>
      ))}
    </motion.div>
  );
}

// Export styled component CSS
export const QuickActionsBarStyles = `
  .quick-actions-bar {
    display: flex;
    gap: 8px;
    padding: 0 24px 16px;
    overflow-x: auto;
    scroll-behavior: smooth;
    scrollbar-width: none;
  }

  .quick-actions-bar::-webkit-scrollbar {
    display: none;
  }

  .quick-action-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.02);
    border: 1px solid rgba(0, 0, 0, 0.04);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
    font-size: 11px;
    font-weight: 500;
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  .quick-action-btn:hover {
    background: rgba(0, 0, 0, 0.04);
    border-color: rgba(0, 0, 0, 0.08);
    color: var(--text-primary);
  }

  .quick-action-btn:active {
    background: rgba(0, 0, 0, 0.06);
  }

  .action-icon {
    font-size: 14px;
  }

  .action-label {
    display: block;
  }

  @media (max-width: 768px) {
    .quick-actions-bar {
      padding: 0 16px 12px;
    }
  }
`;
