'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLifeOS } from '@/app/contexts/LifeOSProvider';
import { LocalTask } from '@/lib/contextArchitecture';
import {
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Flag,
  Calendar,
  MoreHorizontal,
  ChevronDown,
  X,
} from 'lucide-react';

interface LocalTaskManagerProps {
  parentType: LocalTask['parentType'];
  parentId: string;
  className?: string;
}

interface NewTaskForm {
  title: string;
  priority: LocalTask['priority'];
  dueDate?: string;
  description?: string;
}

export function LocalTaskManager({
  parentType,
  parentId,
  className = '',
}: LocalTaskManagerProps) {
  const { localTasks, createLocalTask, updateLocalTask, deleteLocalTask, getTasksForParent } = useLifeOS();
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState<NewTaskForm>({
    title: '',
    priority: 'medium',
  });

  const parentTasks = getTasksForParent(parentType, parentId);

  const priorityColors: Record<LocalTask['priority'], string> = {
    critical: 'text-red-600 bg-red-50 border-red-200',
    high: 'text-orange-600 bg-orange-50 border-orange-200',
    medium: 'text-blue-600 bg-blue-50 border-blue-200',
    low: 'text-gray-600 bg-gray-50 border-gray-200',
  };

  const priorityIcons: Record<LocalTask['priority'], React.ReactNode> = {
    critical: <Flag className="w-4 h-4 fill-current" />,
    high: <Flag className="w-4 h-4 fill-current" />,
    medium: <Flag className="w-4 h-4" />,
    low: <Flag className="w-4 h-4" />,
  };

  const handleCreateTask = () => {
    if (newTaskForm.title.trim()) {
      createLocalTask({
        title: newTaskForm.title,
        description: newTaskForm.description,
        parentType,
        parentId,
        priority: newTaskForm.priority,
        dueDate: newTaskForm.dueDate,
        status: 'todo',
      });

      setNewTaskForm({ title: '', priority: 'medium' });
      setShowNewTaskForm(false);
    }
  };

  const toggleTaskStatus = (task: LocalTask) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    updateLocalTask(task.id, { status: newStatus });
  };

  const completedCount = parentTasks.filter(t => t.status === 'done').length;
  const totalCount = parentTasks.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Task Progress */}
      {totalCount > 0 && (
        <motion.div
          className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-gray-700">Task Progress</span>
            <span className="text-xs font-bold text-gray-600">{completedCount}/{totalCount}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <motion.div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </motion.div>
      )}

      {/* Task List */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {parentTasks.map((task, idx) => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: idx * 0.05 }}
              className={`p-3 rounded-lg border-2 transition ${
                task.status === 'done'
                  ? 'bg-gray-50 border-gray-200 opacity-60'
                  : priorityColors[task.priority]
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <motion.button
                  className="flex-shrink-0 mt-1 text-current"
                  onClick={() => toggleTaskStatus(task)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {task.status === 'done' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </motion.button>

                {/* Task Content */}
                <div className="flex-1 min-w-0">
                  <h4
                    className={`text-sm font-semibold ${
                      task.status === 'done' ? 'line-through text-gray-500' : 'text-gray-900'
                    }`}
                  >
                    {task.title}
                  </h4>

                  {task.description && (
                    <p className="text-xs text-gray-600 mt-1">{task.description}</p>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
                    {task.dueDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(task.dueDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      {priorityIcons[task.priority]}
                      {task.priority}
                    </span>
                  </div>
                </div>

                {/* Delete Button */}
                <motion.button
                  className="flex-shrink-0 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                  onClick={() => deleteLocalTask(task.id)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* New Task Form */}
      <AnimatePresence>
        {showNewTaskForm ? (
          <motion.div
            className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg space-y-3"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <input
              type="text"
              placeholder="Task title..."
              className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={newTaskForm.title}
              onChange={(e) =>
                setNewTaskForm(prev => ({ ...prev, title: e.target.value }))
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateTask();
              }}
              autoFocus
            />

            <textarea
              placeholder="Description (optional)..."
              className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={2}
              value={newTaskForm.description || ''}
              onChange={(e) =>
                setNewTaskForm(prev => ({ ...prev, description: e.target.value }))
              }
            />

            <div className="grid grid-cols-2 gap-3">
              <select
                className="px-3 py-2 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newTaskForm.priority}
                onChange={(e) =>
                  setNewTaskForm(prev => ({
                    ...prev,
                    priority: e.target.value as LocalTask['priority'],
                  }))
                }
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="critical">Critical</option>
              </select>

              <input
                type="date"
                className="px-3 py-2 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newTaskForm.dueDate || ''}
                onChange={(e) =>
                  setNewTaskForm(prev => ({ ...prev, dueDate: e.target.value }))
                }
              />
            </div>

            <div className="flex gap-2">
              <motion.button
                className="flex-1 px-3 py-2 text-sm font-semibold bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                onClick={handleCreateTask}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Create Task
              </motion.button>
              <motion.button
                className="px-3 py-2 text-sm font-semibold bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                onClick={() => setShowNewTaskForm(false)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <motion.button
            className="px-3 py-2 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg border-2 border-blue-200 flex items-center gap-2 transition"
            onClick={() => setShowNewTaskForm(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus className="w-4 h-4" />
            Add Task
          </motion.button>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {totalCount === 0 && !showNewTaskForm && (
        <motion.div
          className="text-center py-8 text-gray-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p className="text-sm">No tasks yet. Create one to get started!</p>
        </motion.div>
      )}
    </div>
  );
}
