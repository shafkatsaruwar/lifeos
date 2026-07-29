'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLifeOS } from '@/app/contexts/LifeOSProvider';
import {
  ChevronDown,
  Home,
  BookOpen,
  BriefcaseBusiness,
  Camera,
  Globe,
  HeartPulse,
  Zap,
  Plus,
  Settings,
  LogOut,
  Clock,
  Focus,
  Search,
  MoreHorizontal,
} from 'lucide-react';
import type { OperatingContext } from '@/lib/contextArchitecture';

type NavItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
  contexts: OperatingContext[];
  action?: () => void;
};

const contextColors: Record<OperatingContext, string> = {
  'Work': 'bg-blue-100 text-blue-900 border-blue-300',
  'School': 'bg-purple-100 text-purple-900 border-purple-300',
  'Life': 'bg-green-100 text-green-900 border-green-300',
  'Photography': 'bg-orange-100 text-orange-900 border-orange-300',
  'Study Abroad': 'bg-cyan-100 text-cyan-900 border-cyan-300',
  'Travel': 'bg-rose-100 text-rose-900 border-rose-300',
  'Health': 'bg-red-100 text-red-900 border-red-300',
};

const contextIcons: Record<OperatingContext, React.ReactNode> = {
  'Work': <BriefcaseBusiness className="w-5 h-5" />,
  'School': <BookOpen className="w-5 h-5" />,
  'Life': <Home className="w-5 h-5" />,
  'Photography': <Camera className="w-5 h-5" />,
  'Study Abroad': <Globe className="w-5 h-5" />,
  'Travel': <Globe className="w-5 h-5" />,
  'Health': <HeartPulse className="w-5 h-5" />,
};

interface ContextAwareSidebarProps {
  onNavigate?: (view: string) => void;
  isCollapsed?: boolean;
}

export function ContextAwareSidebar({ onNavigate, isCollapsed = false }: ContextAwareSidebarProps) {
  const { contextState, switchContext, focusSessions, getActiveFocusSession } = useLifeOS();
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('contexts');

  const activeFocusSession = getActiveFocusSession();

  // Navigation items for each context
  const navigationItems: Record<OperatingContext, NavItem[]> = {
    'Work': [
      { id: 'dashboard', label: 'Dashboard', icon: <Home className="w-4 h-4" />, contexts: ['Work'] },
      { id: 'projects', label: 'Projects', icon: <Zap className="w-4 h-4" />, contexts: ['Work'] },
      { id: 'tasks', label: 'Tasks', icon: <Focus className="w-4 h-4" />, contexts: ['Work'] },
      { id: 'calendar', label: 'Calendar', icon: <Clock className="w-4 h-4" />, contexts: ['Work'] },
    ],
    'School': [
      { id: 'dashboard', label: 'Dashboard', icon: <Home className="w-4 h-4" />, contexts: ['School'] },
      { id: 'classes', label: 'Classes', icon: <BookOpen className="w-4 h-4" />, contexts: ['School'] },
      { id: 'assignments', label: 'Assignments', icon: <Focus className="w-4 h-4" />, contexts: ['School'] },
      { id: 'calendar', label: 'Calendar', icon: <Clock className="w-4 h-4" />, contexts: ['School'] },
    ],
    'Life': [
      { id: 'dashboard', label: 'Dashboard', icon: <Home className="w-4 h-4" />, contexts: ['Life'] },
      { id: 'tasks', label: 'Tasks', icon: <Focus className="w-4 h-4" />, contexts: ['Life'] },
      { id: 'calendar', label: 'Calendar', icon: <Clock className="w-4 h-4" />, contexts: ['Life'] },
      { id: 'notes', label: 'Notes', icon: <Search className="w-4 h-4" />, contexts: ['Life'] },
    ],
    'Photography': [
      { id: 'portfolio', label: 'Portfolio', icon: <Camera className="w-4 h-4" />, contexts: ['Photography'] },
      { id: 'projects', label: 'Projects', icon: <Zap className="w-4 h-4" />, contexts: ['Photography'] },
      { id: 'clients', label: 'Clients', icon: <Home className="w-4 h-4" />, contexts: ['Photography'] },
      { id: 'calendar', label: 'Calendar', icon: <Clock className="w-4 h-4" />, contexts: ['Photography'] },
    ],
    'Study Abroad': [
      { id: 'universities', label: 'Universities', icon: <BookOpen className="w-4 h-4" />, contexts: ['Study Abroad'] },
      { id: 'programs', label: 'Programs', icon: <Globe className="w-4 h-4" />, contexts: ['Study Abroad'] },
      { id: 'applications', label: 'Applications', icon: <Focus className="w-4 h-4" />, contexts: ['Study Abroad'] },
      { id: 'timeline', label: 'Timeline', icon: <Clock className="w-4 h-4" />, contexts: ['Study Abroad'] },
    ],
    'Travel': [
      { id: 'trips', label: 'Trips', icon: <Globe className="w-4 h-4" />, contexts: ['Travel'] },
      { id: 'itinerary', label: 'Itinerary', icon: <Clock className="w-4 h-4" />, contexts: ['Travel'] },
      { id: 'packing', label: 'Packing', icon: <Zap className="w-4 h-4" />, contexts: ['Travel'] },
    ],
    'Health': [
      { id: 'dashboard', label: 'Dashboard', icon: <HeartPulse className="w-4 h-4" />, contexts: ['Health'] },
      { id: 'appointments', label: 'Appointments', icon: <Clock className="w-4 h-4" />, contexts: ['Health'] },
      { id: 'medications', label: 'Medications', icon: <Focus className="w-4 h-4" />, contexts: ['Health'] },
    ],
  };

  const currentContextItems = navigationItems[contextState.current];

  return (
    <motion.aside
      className="flex flex-col h-screen bg-gradient-to-b from-white to-gray-50 border-r border-gray-200 shadow-sm"
      animate={{ width: isCollapsed ? 80 : 280 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <motion.div
          className="flex items-center justify-between"
          animate={{ opacity: isCollapsed ? 0.5 : 1 }}
        >
          {!isCollapsed && <h1 className="text-lg font-bold text-gray-900">LifeOS</h1>}
          <button className="p-1 hover:bg-gray-200 rounded transition">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </motion.div>
      </div>

      {/* Current Context Badge */}
      <motion.div
        className={`mx-3 mt-4 p-3 rounded-lg border-2 flex items-center gap-2 ${contextColors[contextState.current]}`}
        whileHover={{ scale: 1.02 }}
      >
        {contextIcons[contextState.current]}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.span
              className="font-semibold text-sm flex-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {contextState.current}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Active Focus Session */}
      <AnimatePresence>
        {activeFocusSession && !isCollapsed && (
          <motion.div
            className="mx-3 mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="flex items-start gap-2">
              <Focus className="w-4 h-4 mt-1 text-yellow-700 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-yellow-900">{activeFocusSession.name}</p>
                <p className="text-xs text-yellow-800 mt-1">{activeFocusSession.goal}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
        {currentContextItems.map((item, idx) => (
          <motion.button
            key={item.id}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded-lg transition"
            onClick={() => onNavigate?.(item.id)}
            whileHover={{ x: isCollapsed ? 0 : 4 }}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            {item.icon}
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  className="flex-1 text-left"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        ))}
      </nav>

      {/* Context Switcher */}
      <motion.div className="border-t border-gray-200 p-3">
        <button
          onClick={() => setIsContextMenuOpen(!isContextMenuOpen)}
          className="w-full flex items-center justify-between text-xs font-semibold text-gray-600 uppercase tracking-wider px-2 py-2 hover:bg-gray-200 rounded transition"
        >
          <span className={isCollapsed ? 'hidden' : ''}>Contexts</span>
          <ChevronDown
            className={`w-4 h-4 transition ${isContextMenuOpen ? 'rotate-180' : ''}`}
          />
        </button>

        <AnimatePresence>
          {isContextMenuOpen && (
            <motion.div
              className="mt-2 space-y-1"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              {Object.keys(contextColors).map((context) => (
                <button
                  key={context}
                  onClick={() => {
                    switchContext(context as OperatingContext);
                    setIsContextMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs rounded transition ${
                    contextState.current === context
                      ? `${contextColors[context as OperatingContext]} font-semibold`
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <span className={isCollapsed ? 'hidden' : ''}>{context}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Footer */}
      <motion.div className="border-t border-gray-200 p-3 space-y-1">
        <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded-lg transition">
          <Settings className="w-4 h-4" />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                className="flex-1 text-left"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Settings
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </motion.div>
    </motion.aside>
  );
}
