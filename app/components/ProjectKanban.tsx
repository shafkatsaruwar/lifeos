'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Calendar, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import type { Task } from '@/lib/types';

const toDateKey = (date: Date) => date.toISOString().split('T')[0];

interface KanbanColumn {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  tasks: Task[];
}

interface Props {
  project: any;
  projectName: string;
  tasks: Task[];
  onClose: () => void;
  onUpdateTask: (taskId: number, updates: Partial<Task>) => void;
  onNewTask?: () => void;
  isEmbedded?: boolean;
}

export default function ProjectKanban({
  project,
  projectName,
  tasks,
  onClose,
  onUpdateTask,
  isEmbedded,
}: Props) {
  const projectTasks = tasks.filter(t => t.project === projectName && !t.canceled);
  const today = toDateKey(new Date());

  const completedCount = projectTasks.filter(t => t.done).length;
  const progressPercent = projectTasks.length > 0 ? Math.round((completedCount / projectTasks.length) * 100) : 0;

  const projectDue = projectTasks
    .filter(t => t.due)
    .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime())
    [0]?.due;

  const columns: KanbanColumn[] = useMemo(() => {
    const overdue: Task[] = [];
    const todo: Task[] = [];
    const done: Task[] = [];

    projectTasks.forEach((task) => {
      if (task.done) {
        done.push(task);
      } else if (task.due && task.due < today) {
        overdue.push(task);
      } else {
        todo.push(task);
      }
    });

    return [
      {
        id: 'overdue',
        title: 'Overdue',
        icon: <AlertCircle size={16} />,
        color: '#ef4444',
        tasks: overdue.sort((a, b) => new Date(a.due || '').getTime() - new Date(b.due || '').getTime()),
      },
      {
        id: 'todo',
        title: 'To Do',
        icon: <Clock size={16} />,
        color: '#f59e0b',
        tasks: todo.sort((a, b) => {
          const aDue = new Date(a.due || '9999-12-31').getTime();
          const bDue = new Date(b.due || '9999-12-31').getTime();
          return aDue - bDue;
        }),
      },
      {
        id: 'done',
        title: 'Done',
        icon: <CheckCircle2 size={16} />,
        color: '#10b981',
        tasks: done,
      },
    ];
  }, [projectTasks, today]);

  const [draggedTask, setDraggedTask] = useState<number | null>(null);

  const handleDragStart = (taskId: number) => {
    setDraggedTask(taskId);
  };

  const handleDrop = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    if (!draggedTask) return;

    const task = projectTasks.find(t => t.id === draggedTask);
    if (!task) return;

    if (targetColId === 'done') {
      onUpdateTask(draggedTask, { done: true, completedAt: new Date().toISOString() });
    } else if (targetColId === 'todo') {
      onUpdateTask(draggedTask, { done: false });
    } else if (targetColId === 'overdue') {
      return;
    }

    setDraggedTask(null);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDaysUntil = (dateStr: string): number | null => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    const diff = date.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getUrgency = (task: Task): 'critical' | 'soon' | 'normal' => {
    if (!task.due) return 'normal';
    const days = getDaysUntil(task.due);
    if (days === null) return 'normal';
    if (days <= 0) return 'critical';
    if (days <= 3) return 'soon';
    return 'normal';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return '#ef4444';
      case 'Medium':
        return '#f59e0b';
      case 'Low':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  return (
    <div className={`project-kanban-container${isEmbedded ? ' embedded' : ''}`}>
      {!isEmbedded && (
        <div className="kanban-header">
          <button onClick={onClose} className="kanban-back">
            <ChevronLeft size={18} />
          </button>
          <div className="kanban-title-section">
            <h1>{projectName}</h1>
            <div className="kanban-stats">
              <div className="kanban-stat">
                <span className="stat-label">Progress</span>
                <span className="stat-value">{progressPercent}%</span>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${progressPercent}%`,
                      backgroundColor: project.color || '#625af6',
                    }}
                  />
                </div>
              </div>
              {projectDue && (
                <div className="kanban-stat">
                  <span className="stat-label">Due</span>
                  <span className="stat-value">{formatDate(projectDue)}</span>
                </div>
              )}
              <div className="kanban-stat">
                <span className="stat-label">Tasks</span>
                <span className="stat-value">
                  {completedCount}/{projectTasks.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="kanban-board">
        {columns.map((column) => (
          <div
            key={column.id}
            className="kanban-column"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className="column-header" style={{ borderTopColor: column.color }}>
              <div className="column-title-section">
                <div style={{ color: column.color }}>{column.icon}</div>
                <h2>{column.title}</h2>
                <span className="column-count">{column.tasks.length}</span>
              </div>
            </div>

            <div className="column-tasks">
              <AnimatePresence>
                {column.tasks.map((task) => {
                  const urgency = getUrgency(task);
                  const daysUntil = getDaysUntil(task.due);

                  return (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      draggable
                      onDragStart={() => handleDragStart(task.id)}
                      className={`kanban-card urgency-${urgency}`}
                      onClick={() => {
                        if (column.id !== 'done') {
                          onUpdateTask(task.id, { done: true, completedAt: new Date().toISOString() });
                        } else {
                          onUpdateTask(task.id, { done: false });
                        }
                      }}
                    >
                      <div className="card-content">
                        <div className="card-priority-bar" style={{ backgroundColor: getPriorityColor(task.priority) }} />
                        <h3>{task.title}</h3>
                        {task.due && (
                          <div className="card-due">
                            <Calendar size={12} />
                            <span>{formatDate(task.due)}</span>
                            {daysUntil !== null && (
                              <span className={`days-label ${urgency}`}>
                                {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${Math.abs(daysUntil)}d`}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="card-meta">
                          <span className={`priority-badge ${task.priority.toLowerCase()}`}>{task.priority}</span>
                          {task.energy && <span className="energy-badge">{task.energy}</span>}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
