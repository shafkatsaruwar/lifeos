/**
 * StudyAbroadMode Component
 * Dashboard for Study Abroad operating context
 */

import { motion } from 'framer-motion';
import { Globe, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import type { Project } from '@/lib/contextArchitecture';
import { ProjectCard } from './ProjectCard';

export type University = Project & {
  applicationDeadline?: string;
  applicationStatus?: 'not-started' | 'in-progress' | 'submitted' | 'accepted' | 'rejected' | 'waitlisted';
};

export function StudyAbroadMode({
  universities,
  momentumMap,
  applicationsByStatus,
  onUniversityClick,
  onNewUniversity,
}: {
  universities: University[];
  momentumMap: Record<string, 'High' | 'Medium' | 'Dormant' | 'Blocked'>;
  applicationsByStatus: Record<string, number>;
  onUniversityClick: (university: University) => void;
  onNewUniversity: () => void;
}) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle size={14} className="status-accepted" />;
      case 'submitted':
        return <Clock size={14} className="status-submitted" />;
      case 'rejected':
        return <AlertCircle size={14} className="status-rejected" />;
      case 'waitlisted':
        return <Clock size={14} className="status-waitlisted" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'accepted':
        return '#34c759';
      case 'rejected':
        return '#ff3b30';
      case 'waitlisted':
        return '#ff9500';
      case 'submitted':
        return '#625af6';
      default:
        return '#8e8e93';
    }
  };

  const statusOrder = ['accepted', 'submitted', 'in-progress', 'waitlisted', 'rejected', 'not-started'];
  const sortedUniversities = [...universities].sort((a, b) => {
    const aStatus = a.applicationStatus || 'not-started';
    const bStatus = b.applicationStatus || 'not-started';
    return statusOrder.indexOf(aStatus) - statusOrder.indexOf(bStatus);
  });

  return (
    <motion.div
      className="study-abroad-mode"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Application Pipeline Overview */}
      {Object.keys(applicationsByStatus).length > 0 && (
        <motion.section className="mode-section" variants={itemVariants}>
          <h3 className="section-subtitle">Application Pipeline</h3>
          <div className="pipeline-overview">
            {statusOrder.map((status) => {
              const count = applicationsByStatus[status] || 0;
              if (count === 0) return null;

              return (
                <div key={status} className="pipeline-item">
                  <span className="pipeline-label">{status.replace('-', ' ')}</span>
                  <span
                    className="pipeline-count"
                    style={{ color: getStatusColor(status) }}
                  >
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.section>
      )}

      {/* Universities Grid */}
      <motion.section className="mode-section" variants={itemVariants}>
        <div className="section-header">
          <h2 className="section-title">
            <Globe size={18} />
            Universities
          </h2>
          {universities.length > 0 && (
            <span className="count-badge">{universities.length}</span>
          )}
        </div>

        {sortedUniversities.length > 0 ? (
          <motion.div
            className="university-grid"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {sortedUniversities.map((university) => (
              <motion.div
                key={university.id}
                className="university-card-wrapper"
                variants={itemVariants}
              >
                <div className="university-card" onClick={() => onUniversityClick(university)}>
                  <div className="card-header">
                    <ProjectCard
                      project={university}
                      momentum={momentumMap[university.id] || 'Medium'}
                      onClick={() => onUniversityClick(university)}
                    />
                  </div>

                  {university.applicationStatus && (
                    <div className="status-badge">
                      {getStatusIcon(university.applicationStatus)}
                      <span>{university.applicationStatus.replace('-', ' ')}</span>
                    </div>
                  )}

                  {university.applicationDeadline && (
                    <p className="deadline-text">Deadline: {university.applicationDeadline}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="empty-state">
            <Globe size={40} className="empty-icon" />
            <p className="empty-message">Start by adding universities you want to explore</p>
            <button className="empty-action" onClick={onNewUniversity}>
              + Add University
            </button>
          </div>
        )}
      </motion.section>

      <style jsx>{`
        .study-abroad-mode {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .mode-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .section-subtitle {
          margin: 0;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-secondary);
        }

        .pipeline-overview {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .pipeline-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: var(--bg-secondary);
          border: 1px solid rgba(0, 0, 0, 0.04);
          border-radius: 6px;
          font-size: 11px;
        }

        .pipeline-label {
          text-transform: capitalize;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .pipeline-count {
          font-weight: 700;
          font-size: 12px;
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .section-title {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .section-title svg {
          color: #625af6;
        }

        .count-badge {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          background: rgba(0, 0, 0, 0.02);
          padding: 4px 8px;
          border-radius: 4px;
        }

        .university-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 16px;
        }

        .university-card-wrapper {
          position: relative;
        }

        .university-card {
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }

        .university-card:hover {
          transform: translateY(-2px);
        }

        .card-header {
          margin-bottom: 8px;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 4px 8px;
          background: rgba(0, 0, 0, 0.02);
          border-radius: 4px;
          margin-bottom: 8px;
        }

        .status-badge svg {
          width: 12px;
          height: 12px;
        }

        .deadline-text {
          margin: 0;
          font-size: 11px;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .empty-state {
          padding: 48px 24px;
          text-align: center;
          background: rgba(98, 90, 246, 0.02);
          border: 1px dashed rgba(98, 90, 246, 0.15);
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .empty-icon {
          color: #625af6;
          opacity: 0.4;
        }

        .empty-message {
          margin: 0;
          font-size: 14px;
          color: var(--text-secondary);
          max-width: 300px;
        }

        .empty-action {
          padding: 8px 16px;
          background: #625af6;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .empty-action:hover {
          background: #4f4de0;
          box-shadow: 0 2px 8px rgba(98, 90, 246, 0.2);
        }

        @media (max-width: 1024px) {
          .university-grid {
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          }
        }

        @media (max-width: 768px) {
          .university-grid {
            grid-template-columns: 1fr;
          }

          .pipeline-overview {
            flex-direction: column;
          }

          .mode-section {
            gap: 12px;
          }
        }
      `}</style>
    </motion.div>
  );
}
