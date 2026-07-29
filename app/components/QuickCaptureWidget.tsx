'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLifeOS } from '@/app/contexts/LifeOSProvider';
import { OperatingContext } from '@/lib/contextArchitecture';
import {
  Plus,
  Mic,
  Type,
  CheckCircle2,
  Send,
  X,
  Sparkles,
} from 'lucide-react';

interface QuickCaptureWidgetProps {
  className?: string;
}

type CaptureType = 'task' | 'note' | 'idea';

const captureTypeDescriptions: Record<CaptureType, string> = {
  task: 'Add a quick task to your current context',
  note: 'Capture a thought or note',
  idea: 'Record an idea for later',
};

const contextSpecificPrompts: Record<OperatingContext, Record<CaptureType, string>> = {
  'Work': {
    task: 'Add a work task...',
    note: 'Capture a work insight...',
    idea: 'Record a work idea...',
  },
  'School': {
    task: 'Add an assignment or study task...',
    note: 'Capture class notes...',
    idea: 'Record a learning insight...',
  },
  'Life': {
    task: 'Add a personal task...',
    note: 'Capture a life thought...',
    idea: 'Record a personal idea...',
  },
  'Photography': {
    task: 'Add a photography task...',
    note: 'Capture photo ideas...',
    idea: 'Record editing notes...',
  },
  'Study Abroad': {
    task: 'Add an application task...',
    note: 'Capture program notes...',
    idea: 'Record research findings...',
  },
  'Travel': {
    task: 'Add a travel prep task...',
    note: 'Capture travel notes...',
    idea: 'Record travel ideas...',
  },
  'Health': {
    task: 'Add a health task...',
    note: 'Capture health notes...',
    idea: 'Record wellness ideas...',
  },
};

export function QuickCaptureWidget({ className = '' }: QuickCaptureWidgetProps) {
  const { contextState, createLocalTask } = useLifeOS();
  const [isOpen, setIsOpen] = useState(false);
  const [captureType, setCaptureType] = useState<CaptureType>('task');
  const [content, setContent] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [useVoice, setUseVoice] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && captureType === 'task') {
      inputRef.current?.focus();
    } else if (isOpen) {
      textareaRef.current?.focus();
    }
  }, [isOpen, captureType]);

  // Handle voice input (simplified)
  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser');
      return;
    }

    setIsListening(!isListening);
    // Implementation would require actual Web Speech API integration
  };

  const handleCapture = () => {
    if (!content.trim()) return;

    if (captureType === 'task') {
      createLocalTask({
        title: content,
        parentType: 'focus-session',
        parentId: 'quick-capture',
        priority: 'medium',
        status: 'todo',
      });
    }

    setContent('');
    setIsOpen(false);
  };

  return (
    <div className={`${className}`}>
      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 90 }}
            >
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ opacity: 0, rotate: 90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: -90 }}
            >
              <Plus className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Capture Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-32px)] bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 space-y-4"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          >
            {/* Header */}
            <div>
              <h2 className="text-xl font-bold text-gray-900">Quick Capture</h2>
              <p className="text-xs text-gray-600 mt-1">
                Capturing to <span className="font-semibold">{contextState.current}</span>
              </p>
            </div>

            {/* Capture Type Tabs */}
            <div className="flex gap-2">
              {(['task', 'note', 'idea'] as CaptureType[]).map(type => (
                <motion.button
                  key={type}
                  onClick={() => {
                    setCaptureType(type);
                    setContent('');
                  }}
                  className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg transition ${
                    captureType === type
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </motion.button>
              ))}
            </div>

            {/* Description */}
            <p className="text-xs text-gray-600">
              {captureTypeDescriptions[captureType]}
            </p>

            {/* Input */}
            {captureType === 'task' ? (
              <input
                ref={inputRef}
                type="text"
                placeholder={contextSpecificPrompts[contextState.current][captureType]}
                className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && content.trim()) handleCapture();
                }}
              />
            ) : (
              <textarea
                ref={textareaRef}
                placeholder={contextSpecificPrompts[contextState.current][captureType]}
                className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <motion.button
                onClick={handleVoiceInput}
                className={`px-3 py-2 rounded-lg transition flex items-center gap-2 text-sm font-semibold ${
                  isListening
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Mic className="w-4 h-4" />
                {isListening ? 'Listening...' : 'Voice'}
              </motion.button>

              <motion.button
                onClick={handleCapture}
                disabled={!content.trim()}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: content.trim() ? 1.05 : 1 }}
                whileTap={{ scale: content.trim() ? 0.95 : 1 }}
              >
                <Send className="w-4 h-4" />
                Capture
              </motion.button>
            </div>

            {/* Quick Suggestions */}
            {captureType === 'idea' && (
              <motion.div
                className="p-3 bg-purple-50 border border-purple-200 rounded-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-purple-700">
                    Ideas are stored for later refinement. They won't interrupt your current focus.
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0"
            onClick={() => setIsOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
