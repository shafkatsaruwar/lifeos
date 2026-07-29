'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLifeOS } from '@/app/contexts/LifeOSProvider';
import { DashboardCard, OperatingContext } from '@/lib/contextArchitecture';
import {
  Zap,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Flame,
  Trophy,
  BookOpen,
} from 'lucide-react';

interface ContextDashboardProps {
  className?: string;
}

// Generate context-specific dashboard cards
function generateDashboardCards(context: OperatingContext, taskCount: number, urgentCount: number): DashboardCard[] {
  const cards: DashboardCard[] = [];
  const now = new Date();

  switch (context) {
    case 'Work':
      cards.push({
        id: 'work-focus',
        context: 'Work',
        type: 'progress',
        title: 'Focus Session Active',
        description: 'You have 2 hours 34 minutes remaining',
        priority: 'high',
        metadata: { progress: 65, timeRemaining: '2h 34m' },
      });
      cards.push({
        id: 'work-tasks',
        context: 'Work',
        type: 'action',
        title: 'Today\'s Tasks',
        description: `${taskCount} tasks remaining, ${urgentCount} urgent`,
        priority: 'high',
      });
      cards.push({
        id: 'work-meetings',
        context: 'Work',
        type: 'upcoming',
        title: 'Next Meeting',
        description: 'Client sync in 45 minutes',
        priority: 'normal',
      });
      break;

    case 'School':
      cards.push({
        id: 'school-assignments',
        context: 'School',
        type: 'action',
        title: 'Assignments Due',
        description: `${urgentCount} due this week`,
        priority: 'critical',
      });
      cards.push({
        id: 'school-study',
        context: 'School',
        type: 'progress',
        title: 'Study Time Today',
        description: 'Target: 4 hours, Completed: 1.5 hours',
        priority: 'high',
        metadata: { progress: 38, target: 4, completed: 1.5 },
      });
      cards.push({
        id: 'school-exams',
        context: 'School',
        type: 'upcoming',
        title: 'Upcoming Exams',
        description: '3 exams scheduled this month',
        priority: 'normal',
      });
      break;

    case 'Life':
      cards.push({
        id: 'life-today',
        context: 'Life',
        type: 'action',
        title: 'Today\'s Focus',
        description: 'Balance personal goals with commitments',
        priority: 'high',
      });
      cards.push({
        id: 'life-wellness',
        context: 'Life',
        type: 'progress',
        title: 'Wellness Check',
        description: 'How are you feeling today?',
        priority: 'normal',
      });
      cards.push({
        id: 'life-habits',
        context: 'Life',
        type: 'insight',
        title: 'Habit Streak',
        description: '12 days of morning meditation',
        priority: 'normal',
      });
      break;

    case 'Photography':
      cards.push({
        id: 'photo-editing',
        context: 'Photography',
        type: 'action',
        title: 'Editing Queue',
        description: '24 photos pending delivery',
        priority: 'high',
      });
      cards.push({
        id: 'photo-clients',
        context: 'Photography',
        type: 'upcoming',
        title: 'Client Deliverables',
        description: '2 galleries ready for review',
        priority: 'normal',
      });
      cards.push({
        id: 'photo-portfolio',
        context: 'Photography',
        type: 'progress',
        title: 'Portfolio Growth',
        description: '+15 new images this week',
        priority: 'normal',
      });
      break;

    case 'Study Abroad':
      cards.push({
        id: 'abroad-applications',
        context: 'Study Abroad',
        type: 'action',
        title: 'Active Applications',
        description: '3 applications in progress',
        priority: 'critical',
      });
      cards.push({
        id: 'abroad-deadlines',
        context: 'Study Abroad',
        type: 'upcoming',
        title: 'Next Deadline',
        description: 'Germany program due in 12 days',
        priority: 'critical',
      });
      cards.push({
        id: 'abroad-documents',
        context: 'Study Abroad',
        type: 'progress',
        title: 'Document Checklist',
        description: '8 of 12 documents collected',
        priority: 'high',
        metadata: { progress: 67, total: 12, completed: 8 },
      });
      break;

    case 'Travel':
      cards.push({
        id: 'travel-trips',
        context: 'Travel',
        type: 'upcoming',
        title: 'Upcoming Trips',
        description: 'Japan trip in 3 weeks',
        priority: 'high',
      });
      cards.push({
        id: 'travel-packing',
        context: 'Travel',
        type: 'action',
        title: 'Pre-Trip Checklist',
        description: 'Start packing in 10 days',
        priority: 'normal',
      });
      break;

    case 'Health':
      cards.push({
        id: 'health-appointments',
        context: 'Health',
        type: 'upcoming',
        title: 'Appointments',
        description: 'Orthodontist tomorrow at 2 PM',
        priority: 'high',
      });
      cards.push({
        id: 'health-vitals',
        context: 'Health',
        type: 'progress',
        title: 'Daily Vitals',
        description: 'All readings normal',
        priority: 'normal',
      });
      break;
  }

  return cards;
}

// Card component
function DashboardCardComponent({ card }: { card: DashboardCard }) {
  const iconMap: Record<DashboardCard['type'], React.ReactNode> = {
    action: <Zap className="w-5 h-5" />,
    progress: <TrendingUp className="w-5 h-5" />,
    upcoming: <Clock className="w-5 h-5" />,
    insight: <Trophy className="w-5 h-5" />,
    'quick-action': <CheckCircle2 className="w-5 h-5" />,
  };

  const priorityColors: Record<DashboardCard['priority'], string> = {
    critical: 'border-red-300 bg-red-50',
    high: 'border-orange-300 bg-orange-50',
    normal: 'border-blue-300 bg-blue-50',
    low: 'border-gray-300 bg-gray-50',
  };

  return (
    <motion.div
      className={`p-4 rounded-lg border-2 ${priorityColors[card.priority]} cursor-pointer`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          {iconMap[card.type]}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-gray-900">{card.title}</h3>
          <p className="text-xs text-gray-600 mt-1">{card.description}</p>

          {/* Progress bar if applicable */}
          {card.metadata?.progress !== undefined && (
            <div className="mt-3 bg-gray-200 rounded-full h-2 overflow-hidden">
              <motion.div
                className="bg-blue-500 h-full"
                initial={{ width: 0 }}
                animate={{ width: `${card.metadata.progress}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          )}
        </div>
      </div>

      {card.action && (
        <motion.button
          className="mt-3 w-full text-xs font-semibold text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-100 rounded transition"
          whileHover={{ x: 2 }}
        >
          {card.action.label}
        </motion.button>
      )}
    </motion.div>
  );
}

export function ContextDashboard({ className = '' }: ContextDashboardProps) {
  const { contextState, localTasks } = useLifeOS();

  const cards = useMemo(() => {
    const urgentTasks = localTasks.filter(
      t => t.priority === 'critical' || t.priority === 'high'
    ).length;
    return generateDashboardCards(contextState.current, localTasks.length, urgentTasks);
  }, [contextState.current, localTasks]);

  return (
    <motion.div
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <AnimatePresence mode="popLayout">
        {cards.map((card, idx) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ delay: idx * 0.05 }}
          >
            <DashboardCardComponent card={card} />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
