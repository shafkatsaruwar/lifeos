/**
 * SchoolMode Component
 * Dashboard for School operating context
 */

import { motion } from 'framer-motion';
import { BookOpen, CheckCircle, Calendar } from 'lucide-react';
import type { Project } from '@/lib/contextArchitecture';
import { ProjectCard } from './ProjectCard';

export function SchoolMode({
  courses,
  momentumMap,
  upcomingAssignments,
  onCourseClick,
  onNewCourse,
}: {
  courses: Project[];
  momentumMap: Record<string, 'High' | 'Medium' | 'Dormant' | 'Blocked'>;
  upcomingAssignments: Array<{ id: string; title: string; courseName: string; dueDate: string }>;
  onCourseClick: (course: Project) => void;
  onNewCourse: () => void;
}) {
  const activeCourses = courses.filter(c => c.status === 'active');
  const completedCourses = courses.filter(c => c.status === 'completed');

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
      className="school-mode"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Upcoming Assignments Section */}
      {upcomingAssignments.length > 0 && (
        <motion.section className="mode-section" variants={itemVariants}>
          <div className="section-header">
            <h2 className="section-title">
              <Calendar size={18} />
              Due Soon
            </h2>
            <span className="count-badge">{upcomingAssignments.length}</span>
          </div>

          <motion.div
            className="assignments-list"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {upcomingAssignments.map((assignment) => (
              <motion.div
                key={assignment.id}
                className="assignment-item"
                variants={itemVariants}
              >
                <div className="assignment-info">
                  <h3 className="assignment-title">{assignment.title}</h3>
                  <p className="assignment-course">{assignment.courseName}</p>
                </div>
                <div className="assignment-due">
                  <span className="due-date">{assignment.dueDate}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>
      )}

      {/* Active Courses Section */}
      <motion.section className="mode-section" variants={itemVariants}>
        <div className="section-header">
          <h2 className="section-title">
            <BookOpen size={18} />
            Active Courses
          </h2>
          {activeCourses.length > 0 && (
            <span className="count-badge">{activeCourses.length}</span>
          )}
        </div>

        {activeCourses.length > 0 ? (
          <motion.div
            className="course-grid"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {activeCourses.map((course) => (
              <motion.div key={course.id} variants={itemVariants}>
                <ProjectCard
                  project={course}
                  momentum={momentumMap[course.id] || 'Medium'}
                  onClick={() => onCourseClick(course)}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="empty-state">
            <p className="empty-message">No active courses</p>
            <button className="empty-action" onClick={onNewCourse}>
              + Enroll in a Course
            </button>
          </div>
        )}
      </motion.section>

      {/* Completed Courses Section */}
      {completedCourses.length > 0 && (
        <motion.section className="mode-section" variants={itemVariants}>
          <div className="section-header">
            <h2 className="section-title">
              <CheckCircle size={18} />
              Completed
            </h2>
            <span className="count-badge">{completedCourses.length}</span>
          </div>

          <motion.div
            className="course-grid compact"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {completedCourses.slice(0, 4).map((course) => (
              <motion.div key={course.id} variants={itemVariants}>
                <ProjectCard
                  project={course}
                  momentum={momentumMap[course.id] || 'Dormant'}
                  onClick={() => onCourseClick(course)}
                />
              </motion.div>
            ))}
          </motion.div>
        </motion.section>
      )}

      <style jsx>{`
        .school-mode {
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

        .assignments-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .assignment-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 16px;
          background: var(--bg-secondary);
          border: 1px solid rgba(0, 0, 0, 0.04);
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .assignment-item:hover {
          background: rgba(98, 90, 246, 0.02);
          border-color: rgba(98, 90, 246, 0.15);
        }

        .assignment-info {
          flex: 1;
          min-width: 0;
        }

        .assignment-title {
          margin: 0 0 4px 0;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .assignment-course {
          margin: 0;
          font-size: 11px;
          color: var(--text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .assignment-due {
          flex-shrink: 0;
        }

        .due-date {
          font-size: 12px;
          font-weight: 600;
          color: #ff3b30;
          white-space: nowrap;
        }

        .course-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 16px;
        }

        .course-grid.compact {
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
          .course-grid {
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          }
        }

        @media (max-width: 768px) {
          .course-grid {
            grid-template-columns: 1fr;
          }

          .assignment-item {
            flex-direction: column;
            align-items: flex-start;
          }

          .mode-section {
            gap: 12px;
          }
        }
      `}</style>
    </motion.div>
  );
}
