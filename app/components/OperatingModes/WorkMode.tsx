/**
 * WorkMode Component
 * Dashboard for Work operating context
 */

import { motion } from 'framer-motion';
import { Briefcase, TrendingUp } from 'lucide-react';
import type { Project } from '@/lib/contextArchitecture';
import { ProjectCard } from './ProjectCard';

export function WorkMode({
  projects,
  momentumMap,
  onProjectClick,
  onNewProject,
}: {
  projects: Project[];
  momentumMap: Record<string, 'High' | 'Medium' | 'Dormant' | 'Blocked'>;
  onProjectClick: (project: Project) => void;
  onNewProject: () => void;
}) {
  const activeProjects = projects.filter(p => p.status === 'active');
  const completedProjects = projects.filter(p => p.status === 'completed');
  const onHoldProjects = projects.filter(p => p.status === 'on-hold');

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

  return (
    <motion.div
      className="work-mode"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Active Projects Section */}
      <motion.section className="mode-section" variants={itemVariants}>
        <div className="section-header">
          <h2 className="section-title">
            <Briefcase size={18} />
            Active Projects
          </h2>
          {activeProjects.length > 0 && (
            <span className="project-count">{activeProjects.length}</span>
          )}
        </div>

        {activeProjects.length > 0 ? (
          <motion.div
            className="project-grid"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {activeProjects.map((project) => (
              <motion.div key={project.id} variants={itemVariants}>
                <ProjectCard
                  project={project}
                  momentum={momentumMap[project.id] || 'Medium'}
                  onClick={() => onProjectClick(project)}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="empty-state">
            <p className="empty-message">No active projects</p>
            <button className="empty-action" onClick={onNewProject}>
              + Start a Project
            </button>
          </div>
        )}
      </motion.section>

      {/* Completed Projects Section */}
      {completedProjects.length > 0 && (
        <motion.section className="mode-section" variants={itemVariants}>
          <div className="section-header">
            <h2 className="section-title">
              <TrendingUp size={18} />
              Completed This Month
            </h2>
            <span className="project-count">{completedProjects.length}</span>
          </div>

          <motion.div
            className="project-grid compact"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {completedProjects.slice(0, 6).map((project) => (
              <motion.div key={project.id} variants={itemVariants}>
                <ProjectCard
                  project={project}
                  momentum={momentumMap[project.id] || 'Medium'}
                  onClick={() => onProjectClick(project)}
                />
              </motion.div>
            ))}
          </motion.div>
        </motion.section>
      )}

      {/* On Hold Projects Section */}
      {onHoldProjects.length > 0 && (
        <motion.section className="mode-section" variants={itemVariants}>
          <div className="section-header collapsed">
            <h2 className="section-title">
              On Hold ({onHoldProjects.length})
            </h2>
          </div>
        </motion.section>
      )}

      <style jsx>{`
        .work-mode {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .mode-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .section-header.collapsed {
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.04);
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

        .project-count {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          background: rgba(0, 0, 0, 0.02);
          padding: 4px 8px;
          border-radius: 4px;
        }

        .project-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 16px;
        }

        .project-grid.compact {
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          opacity: 0.8;
        }

        .empty-state {
          padding: 32px 24px;
          text-align: center;
          background: rgba(0, 0, 0, 0.01);
          border: 1px dashed rgba(0, 0, 0, 0.08);
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .empty-message {
          margin: 0;
          font-size: 14px;
          color: var(--text-secondary);
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
          .project-grid {
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          }
        }

        @media (max-width: 768px) {
          .project-grid {
            grid-template-columns: 1fr;
          }

          .mode-section {
            gap: 12px;
          }
        }
      `}</style>
    </motion.div>
  );
}
