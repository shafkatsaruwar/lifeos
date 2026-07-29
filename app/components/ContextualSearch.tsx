'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLifeOS } from '@/app/contexts/LifeOSProvider';
import { LocalTask, FocusSession } from '@/lib/contextArchitecture';
import {
  Search,
  Sparkles,
  Zap,
  FileText,
  CheckCircle2,
  Clock,
  X,
} from 'lucide-react';

interface SearchResult {
  type: 'task' | 'session' | 'suggestion';
  id: string;
  title: string;
  description?: string;
  context?: string;
  icon: React.ReactNode;
}

interface ContextualSearchProps {
  className?: string;
}

export function ContextualSearch({ className = '' }: ContextualSearchProps) {
  const { contextState, localTasks, focusSessions } = useLifeOS();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // AI-powered search suggestions
  const aiSuggestions: SearchResult[] = [
    {
      type: 'suggestion',
      id: 'ai-1',
      title: 'Create a focus session for your most urgent task',
      description: 'Start a focused work block to tackle high-priority items',
      icon: <Sparkles className="w-4 h-4" />,
    },
    {
      type: 'suggestion',
      id: 'ai-2',
      title: 'Review tasks due this week',
      description: 'Get an overview of upcoming deadlines',
      icon: <Clock className="w-4 h-4" />,
    },
    {
      type: 'suggestion',
      id: 'ai-3',
      title: 'Suggest break time',
      description: 'You\'ve been focused for 2 hours. Take a 15-minute break?',
      icon: <Zap className="w-4 h-4" />,
    },
  ];

  // Search logic
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    const queryLower = query.toLowerCase();
    const taskResults: SearchResult[] = localTasks
      .filter(t =>
        t.title.toLowerCase().includes(queryLower) ||
        t.description?.toLowerCase().includes(queryLower)
      )
      .slice(0, 5)
      .map(task => ({
        type: 'task' as const,
        id: task.id.toString(),
        title: task.title,
        description: task.description,
        context: task.parentType,
        icon: task.status === 'done' ? <CheckCircle2 className="w-4 h-4" /> : <Zap className="w-4 h-4" />,
      }));

    const sessionResults: SearchResult[] = focusSessions
      .filter(s =>
        s.name.toLowerCase().includes(queryLower) ||
        s.goal.toLowerCase().includes(queryLower)
      )
      .slice(0, 3)
      .map(session => ({
        type: 'session' as const,
        id: session.id,
        title: session.name,
        description: session.goal,
        context: session.context,
        icon: <Zap className="w-4 h-4" />,
      }));

    const matchedSuggestions = aiSuggestions.filter(s =>
      s.title.toLowerCase().includes(queryLower) ||
      s.description?.toLowerCase().includes(queryLower)
    );

    setResults([...taskResults, ...sessionResults, ...matchedSuggestions]);
    setSelectedIndex(0);
  }, [query, localTasks, focusSessions]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === '/' || (e.ctrlKey && e.key === 'k') || (e.metaKey && e.key === 'k')) {
          e.preventDefault();
          setIsOpen(true);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % results.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleSelectResult(results[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  const handleSelectResult = (result: SearchResult) => {
    // Here you would typically navigate or perform an action based on the result
    console.log('Selected:', result);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div className={`${className}`}>
      {/* Search Trigger Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-200 transition"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Search className="w-4 h-4" />
        <span className="hidden md:inline">Search tasks, sessions...</span>
        <kbd className="hidden md:inline ml-auto text-xs bg-gray-200 px-2 py-0.5 rounded">
          ⌘K
        </kbd>
      </motion.button>

      {/* Search Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-start justify-center pt-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              className="w-full max-w-xl mx-auto px-4"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
                  <Search className="w-5 h-5 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder={`Search in ${contextState.current}...`}
                    className="flex-1 bg-transparent text-lg outline-none placeholder-gray-400"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                  />
                  <motion.button
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-gray-200 rounded transition"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>

                {/* Results */}
                <div className="max-h-96 overflow-y-auto">
                  <AnimatePresence mode="popLayout">
                    {results.length === 0 && query ? (
                      <motion.div
                        className="p-8 text-center text-gray-500"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <p className="text-sm">No results found for "{query}"</p>
                        <p className="text-xs mt-1">Try a different search term</p>
                      </motion.div>
                    ) : (
                      results.map((result, idx) => (
                        <motion.button
                          key={result.id}
                          className={`w-full text-left px-4 py-3 border-b border-gray-100 transition ${
                            idx === selectedIndex
                              ? 'bg-blue-50'
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => handleSelectResult(result)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: idx * 0.05 }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="text-gray-400 mt-0.5">{result.icon}</div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm text-gray-900">
                                {result.title}
                              </h4>
                              {result.description && (
                                <p className="text-xs text-gray-600 mt-0.5">
                                  {result.description}
                                </p>
                              )}
                              {result.context && (
                                <p className="text-xs text-gray-500 mt-1">
                                  in {result.context}
                                </p>
                              )}
                            </div>
                            {result.type === 'suggestion' && (
                              <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0" />
                            )}
                          </div>
                        </motion.button>
                      ))
                    )}
                  </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {results.length > 0 ? `${selectedIndex + 1} of ${results.length}` : 'No results'}
                  </span>
                  <div className="flex gap-2">
                    <kbd className="bg-white px-2 py-0.5 rounded border border-gray-300">
                      ↑↓
                    </kbd>
                    <kbd className="bg-white px-2 py-0.5 rounded border border-gray-300">
                      Enter
                    </kbd>
                    <kbd className="bg-white px-2 py-0.5 rounded border border-gray-300">
                      Esc
                    </kbd>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
