/**
 * FocusMode Component
 * Full-screen immersive focus interface
 */

'use client';

import { motion } from 'framer-motion';
import { Pause, Play, X, AlertCircle } from 'lucide-react';
import type { FocusSession } from '@/lib/contextArchitecture';

export function FocusMode({
  focusSession,
  timeRemaining,
  onPause,
  onResume,
  onEnd,
}: {
  focusSession: FocusSession;
  timeRemaining: number;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
}) {
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = (timeRemaining / (focusSession.duration * 60)) * 100;
  const isPaused = focusSession.status === 'paused';

  return (
    <motion.div
      className="focus-mode"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Background gradient animation */}
      <div className="focus-bg">
        <motion.div
          className="focus-gradient"
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* Main content */}
      <div className="focus-content">
        {/* Header */}
        <div className="focus-header">
          <motion.button
            className="close-btn"
            onClick={onEnd}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            title="End focus session"
          >
            <X size={24} />
          </motion.button>
        </div>

        {/* Session info */}
        <div className="focus-info">
          <motion.h2
            className="focus-name"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            {focusSession.name}
          </motion.h2>

          <motion.p
            className="focus-goal"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            {focusSession.goal}
          </motion.p>
        </div>

        {/* Timer display */}
        <motion.div
          className="timer-section"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="timer-circle">
            <svg className="progress-ring" viewBox="0 0 200 200">
              <circle
                className="progress-ring-background"
                cx="100"
                cy="100"
                r="90"
              />
              <motion.circle
                className="progress-ring-foreground"
                cx="100"
                cy="100"
                r="90"
                strokeDasharray={565.5}
                strokeDashoffset={565.5 * (1 - progressPercent / 100)}
                initial={{ strokeDashoffset: 565.5 }}
                animate={{ strokeDashoffset: 565.5 * (1 - progressPercent / 100) }}
                transition={{ duration: 1, ease: 'linear' }}
              />
            </svg>
            <div className="timer-display">
              <time className="timer-text">{formatTime(timeRemaining)}</time>
            </div>
          </div>
        </motion.div>

        {/* Controls */}
        <motion.div
          className="focus-controls"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          {isPaused ? (
            <button className="control-btn primary" onClick={onResume}>
              <Play size={20} />
              Resume
            </button>
          ) : (
            <button className="control-btn secondary" onClick={onPause}>
              <Pause size={20} />
              Pause
            </button>
          )}

          <button className="control-btn danger" onClick={onEnd}>
            <X size={20} />
            End Session
          </button>
        </motion.div>

        {/* AI Tips or ambient audio */}
        {focusSession.aiMode && (
          <motion.div
            className="focus-ambient"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="ambient-indicator">
              <AlertCircle size={16} />
              <span className="ai-mode">{focusSession.aiMode} focus mode active</span>
            </div>
          </motion.div>
        )}
      </div>

      <style jsx>{`
        .focus-mode {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          overflow: hidden;
        }

        .focus-bg {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          height: 100%;
        }

        .focus-gradient {
          width: 100%;
          height: 100%;
          background: linear-gradient(
            135deg,
            #625af6 0%,
            #a78bfa 25%,
            #625af6 50%,
            #5a56e0 75%,
            #625af6 100%
          );
          background-size: 200% 200%;
          animation: gradient-shift 15s ease infinite;
        }

        @keyframes gradient-shift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        .focus-content {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 48px;
          padding: 40px;
          text-align: center;
          max-width: 600px;
        }

        .focus-header {
          position: absolute;
          top: 24px;
          right: 24px;
        }

        .close-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.25);
          border-radius: 12px;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
          backdrop-filter: blur(8px);
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.25);
          border-color: rgba(255, 255, 255, 0.4);
        }

        .focus-info {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .focus-name {
          margin: 0;
          font-size: 48px;
          font-weight: 700;
          color: white;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .focus-goal {
          margin: 0;
          font-size: 20px;
          color: rgba(255, 255, 255, 0.9);
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
        }

        .timer-section {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .timer-circle {
          position: relative;
          width: 280px;
          height: 280px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .progress-ring {
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
          filter: drop-shadow(0 4px 16px rgba(0, 0, 0, 0.2));
        }

        .progress-ring-background {
          fill: none;
          stroke: rgba(255, 255, 255, 0.1);
          stroke-width: 8;
        }

        .progress-ring-foreground {
          fill: none;
          stroke: white;
          stroke-width: 8;
          stroke-linecap: round;
        }

        .timer-display {
          position: absolute;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .timer-text {
          font-size: 64px;
          font-weight: 700;
          color: white;
          font-family: 'Courier New', monospace;
          letter-spacing: 2px;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .focus-controls {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .control-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 10px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          backdrop-filter: blur(8px);
        }

        .control-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
        }

        .control-btn.primary {
          background: rgba(255, 255, 255, 0.25);
          border-color: rgba(255, 255, 255, 0.4);
        }

        .control-btn.primary:hover {
          background: rgba(255, 255, 255, 0.35);
        }

        .control-btn.danger {
          background: rgba(255, 59, 48, 0.3);
          border-color: rgba(255, 59, 48, 0.5);
        }

        .control-btn.danger:hover {
          background: rgba(255, 59, 48, 0.4);
        }

        .focus-ambient {
          margin-top: 24px;
        }

        .ambient-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.9);
          font-size: 13px;
          font-weight: 500;
          backdrop-filter: blur(8px);
        }

        .ai-mode {
          text-transform: capitalize;
        }

        @media (max-width: 768px) {
          .focus-content {
            gap: 32px;
            padding: 24px;
          }

          .focus-name {
            font-size: 32px;
          }

          .focus-goal {
            font-size: 16px;
          }

          .timer-circle {
            width: 200px;
            height: 200px;
          }

          .timer-text {
            font-size: 48px;
          }

          .control-btn {
            padding: 10px 16px;
            font-size: 12px;
          }
        }
      `}</style>
    </motion.div>
  );
}
