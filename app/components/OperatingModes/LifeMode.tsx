/**
 * LifeMode Component
 * Dashboard for Life operating context
 */

import { motion } from 'framer-motion';
import { Heart, Sparkles, Target } from 'lucide-react';
import type { Project } from '@/lib/contextArchitecture';
import { ProjectCard } from './ProjectCard';

export function LifeMode({
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
      className="life-mode"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Active Projects Section */}
      <motion.section className="mode-section" variants={itemVariants}>
        <div className="section-header">
          <h2 className="section-title">
            <Target size={18} />
            Personal Projects
          </h2>
          {activeProjects.length > 0 && (
            <span className="count-badge">{activeProjects.length}</span>
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
            <Heart size={40} className="empty-icon" />
            <p className="empty-message">Create a personal project to get started</p>
            <button className="empty-action" onClick={onNewProject}>
              + New Project
            </button>
          </div>
        )}
      </motion.section>

      {/* Completed Section */}
      {completedProjects.length > 0 && (
        <motion.section className="mode-section" variants={itemVariants}>
          <div className="section-header">
            <h2 className="section-title">
              <Sparkles size={18} />
              Achievements
            </h2>
            <span className="count-badge">{completedProjects.length}</span>
          </div>

          <motion.div
            className="project-grid compact"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {completedProjects.slice(0, 4).map((project) => (
              <motion.div key={project.id} variants={itemVariants}>
                <ProjectCard
                  project={project}
                  momentum={momentumMap[project.id] || 'Dormant'}
                  onClick={() => onProjectClick(project)}
                />
              </motion.div>
            ))}
          </motion.div>
        </motion.section>
      )}

      <style jsx>{`
        .life-mode {
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
          .project-grid {
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          }
        }

        @media (max-width: 768px) {
          .project-grid {
            grid-template-columns: 1fr;
          }

          .empty-state {
            padding: 32px 16px;
          }

          .mode-section {
            gap: 12px;
          }
        }
      `}</style>
    </motion.div>
  );
}
