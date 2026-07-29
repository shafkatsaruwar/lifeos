'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLifeOS } from '@/app/contexts/LifeOSProvider';
import { FocusSession, OperatingContext } from '@/lib/contextArchitecture';
import {
  Play,
  Pause,
  StopCircle,
  Plus,
  Trash2,
  Clock,
  Zap,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface FocusSessionManagerProps {
  className?: string;
}

interface NewSessionForm {
  name: string;
  goal: string;
  duration: number;
  context: OperatingContext;
  aiMode: FocusSession['aiMode'];
}

export function FocusSessionManager({ className = '' }: FocusSessionManagerProps) {
  const {
    contextState,
    focusSessions,
    createFocusSession,
    activateFocusSession,
    deactivateFocusSession,
    updateFocusSession,
    getActiveFocusSession,
  } = useLifeOS();

  const [showNewSessionForm, setShowNewSessionForm] = useState(false);
  const [newSessionForm, setNewSessionForm] = useState<NewSessionForm>({
    name: '',
    goal: '',
    duration: 60,
    context: contextState.current,
    aiMode: 'general',
  });
  const [timeRemaining, setTimeRemaining] = useState<Record<string, number>>({});

  const activeFocusSession = getActiveFocusSession();
  const contextSessions = focusSessions.filter(s => s.context === contextState.current);

  // Timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        const updated = { ...prev };
        for (const [sessionId, remaining] of Object.entries(updated)) {
          if (remaining > 0) {
            updated[sessionId] = remaining - 1;
          }
        }
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Initialize time remaining for active sessions
  useEffect(() => {
    const newTimeRemaining: Record<string, number> = {};
    for (const session of focusSessions) {
      if (session.status === 'active' && !timeRemaining[session.id]) {
        const elapsed = new Date().getTime() - session.startTime.getTime();
        const remaining = session.duration * 60 * 1000 - elapsed;
        newTimeRemaining[session.id] = Math.max(0, Math.floor(remaining / 1000));
      }
    }
    if (Object.keys(newTimeRemaining).length > 0) {
      setTimeRemaining(prev => ({ ...prev, ...newTimeRemaining }));
    }
  }, [focusSessions, timeRemaining]);

  const handleCreateSession = () => {
    if (newSessionForm.name.trim() && newSessionForm.goal.trim()) {
      const now = new Date();
      const endTime = new Date(now.getTime() + newSessionForm.duration * 60 * 1000);

      const session = createFocusSession({
        name: newSessionForm.name,
        goal: newSessionForm.goal,
        context: newSessionForm.context,
        startTime: now,
        endTime,
        duration: newSessionForm.duration,
        projects: [],
        linkedTasks: [],
        interruptionPolicy: 'moderate',
        aiMode: newSessionForm.aiMode,
        status: 'scheduled',
        completionPercentage: 0,
      });

      // Activate immediately
      activateFocusSession(session.id);
      setTimeRemaining(prev => ({
        ...prev,
        [session.id]: newSessionForm.duration * 60,
      }));

      setNewSessionForm({
        name: '',
        goal: '',
        duration: 60,
        context: contextState.current,
        aiMode: 'general',
      });
      setShowNewSessionForm(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${secs}s`;
  };

  const aiModeColors: Record<FocusSession['aiMode'], string> = {
    'work-assistant': 'bg-blue-100 text-blue-700 border-blue-300',
    'study-partner': 'bg-purple-100 text-purple-700 border-purple-300',
    'creative-director': 'bg-orange-100 text-orange-700 border-orange-300',
    'general': 'bg-gray-100 text-gray-700 border-gray-300',
  };

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Active Session Card */}
      <AnimatePresence>
        {activeFocusSession && (
          <motion.div
            className="p-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg shadow-lg"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-bold">{activeFocusSession.name}</h3>
                <p className="text-blue-100 text-sm mt-1">{activeFocusSession.goal}</p>
              </div>
              <motion.div
                className="text-4xl font-bold font-mono"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {formatTime(timeRemaining[activeFocusSession.id] || 0)}
              </motion.div>
            </div>

            {/* Progress Bar */}
            <div className="mb-3 bg-white/30 rounded-full h-2 overflow-hidden">
              <motion.div
                className="bg-white h-full"
                initial={{ width: 0 }}
                animate={{
                  width: `${
                    ((activeFocusSession.duration * 60 -
                      (timeRemaining[activeFocusSession.id] || 0)) /
                      (activeFocusSession.duration * 60)) *
                    100
                  }%`,
                }}
                transition={{ duration: 1 }}
              />
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              <motion.button
                className="flex-1 flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg font-semibold transition"
                onClick={() => updateFocusSession(activeFocusSession.id, { status: 'paused' })}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Pause className="w-4 h-4" />
                Pause
              </motion.button>
              <motion.button
                className="flex-1 flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg font-semibold transition"
                onClick={() => {
                  updateFocusSession(activeFocusSession.id, { status: 'completed' });
                  deactivateFocusSession();
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <StopCircle className="w-4 h-4" />
                End Session
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session List */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900 text-sm">Focus Sessions</h3>
        <AnimatePresence mode="popLayout">
          {contextSessions.map((session, idx) => (
            <motion.div
              key={session.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: idx * 0.05 }}
              className={`p-3 rounded-lg border-2 ${
                session.id === activeFocusSession?.id
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm text-gray-900">{session.name}</h4>
                    <motion.span
                      className={`inline-block px-2 py-0.5 text-xs font-semibold rounded border-2 ${aiModeColors[session.aiMode]}`}
                    >
                      {session.aiMode}
                    </motion.span>
                  </div>

                  <p className="text-xs text-gray-600 mt-1">{session.goal}</p>

                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
                    <Clock className="w-3 h-3" />
                    <span>{session.duration} minutes</span>
                    <Zap className="w-3 h-3 ml-1" />
                    <span className="capitalize">{session.status}</span>
                  </div>
                </div>

                {/* Status Icon */}
                {session.status === 'active' && (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Zap className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  </motion.div>
                )}

                {session.status === 'completed' && (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* New Session Form */}
      <AnimatePresence>
        {showNewSessionForm ? (
          <motion.div
            className="p-4 bg-purple-50 border-2 border-purple-200 rounded-lg space-y-3"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <input
              type="text"
              placeholder="Session name..."
              className="w-full px-3 py-2 text-sm border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={newSessionForm.name}
              onChange={(e) =>
                setNewSessionForm(prev => ({ ...prev, name: e.target.value }))
              }
              autoFocus
            />

            <textarea
              placeholder="What's your goal for this session?"
              className="w-full px-3 py-2 text-sm border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              rows={2}
              value={newSessionForm.goal}
              onChange={(e) =>
                setNewSessionForm(prev => ({ ...prev, goal: e.target.value }))
              }
            />

            <div className="grid grid-cols-3 gap-3">
              <input
                type="number"
                placeholder="Minutes"
                className="px-3 py-2 text-sm border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={newSessionForm.duration}
                onChange={(e) =>
                  setNewSessionForm(prev => ({
                    ...prev,
                    duration: Math.max(1, parseInt(e.target.value) || 60),
                  }))
                }
                min={1}
                max={480}
              />

              <select
                className="px-3 py-2 text-sm border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={newSessionForm.aiMode}
                onChange={(e) =>
                  setNewSessionForm(prev => ({
                    ...prev,
                    aiMode: e.target.value as FocusSession['aiMode'],
                  }))
                }
              >
                <option value="general">General</option>
                <option value="work-assistant">Work Mode</option>
                <option value="study-partner">Study Mode</option>
                <option value="creative-director">Creative</option>
              </select>

              <select
                className="px-3 py-2 text-sm border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={newSessionForm.context}
                onChange={(e) =>
                  setNewSessionForm(prev => ({
                    ...prev,
                    context: e.target.value as OperatingContext,
                  }))
                }
              >
                <option value="Work">Work</option>
                <option value="School">School</option>
                <option value="Life">Life</option>
                <option value="Photography">Photography</option>
                <option value="Study Abroad">Study Abroad</option>
              </select>
            </div>

            <div className="flex gap-2">
              <motion.button
                className="flex-1 px-3 py-2 text-sm font-semibold bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
                onClick={handleCreateSession}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Start Session
              </motion.button>
              <motion.button
                className="px-3 py-2 text-sm font-semibold bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                onClick={() => setShowNewSessionForm(false)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <motion.button
            className="px-3 py-2 text-sm font-semibold text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg border-2 border-purple-200 flex items-center gap-2 transition w-full justify-center"
            onClick={() => setShowNewSessionForm(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus className="w-4 h-4" />
            New Focus Session
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
