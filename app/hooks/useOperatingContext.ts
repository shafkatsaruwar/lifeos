/**
 * useOperatingContext Hook
 * Orchestrates operating mode context, workspace memory, and focus sessions
 */

'use client';

import { useState, useCallback } from 'react';
import type { OperatingContext, FocusSession, CalendarEvent } from '@/lib/contextArchitecture';
import { useWorkspaceMemory } from '@/lib/useWorkspaceMemory';

export type AmbientActivity = {
  type: 'coffee' | 'music' | 'focus' | 'break' | 'deep-work' | 'learning';
  timestamp: number;
};

export function useOperatingContext(initialContext: OperatingContext = 'Work') {
  const [currentContext, setCurrentContext] = useState<OperatingContext>(initialContext);
  const [focusSession, setFocusSession] = useState<FocusSession | null>(null);
  const [ambientActivity, setAmbientActivity] = useState<AmbientActivity | null>(null);
  const [timeline, setTimeline] = useState<CalendarEvent[]>([]);

  const { workspace, updateMemory, saveActiveSection, saveScrollPosition } = useWorkspaceMemory(currentContext);

  // Switch operating context
  const switchContext = useCallback((context: OperatingContext) => {
    setCurrentContext(context);
    updateMemory({ context });
  }, [updateMemory]);

  // Start focus session
  const startFocus = useCallback((session: FocusSession) => {
    setFocusSession(session);
    // Record ambient activity of starting focused work
    setAmbientActivity({
      type: 'focus',
      timestamp: Date.now(),
    });
  }, []);

  // Pause focus session
  const pauseFocus = useCallback(() => {
    if (focusSession) {
      setFocusSession({
        ...focusSession,
        status: 'paused',
      });
    }
  }, [focusSession]);

  // Resume focus session
  const resumeFocus = useCallback(() => {
    if (focusSession) {
      setFocusSession({
        ...focusSession,
        status: 'active',
      });
    }
  }, [focusSession]);

  // End focus session
  const endFocus = useCallback(() => {
    setFocusSession(null);
    setAmbientActivity(null);
  }, []);

  // Log ambient activity
  const logAmbientActivity = useCallback((activity: AmbientActivity) => {
    setAmbientActivity(activity);
  }, []);

  // Update timeline (from calendar events)
  const updateTimeline = useCallback((events: CalendarEvent[]) => {
    setTimeline(events);
  }, []);

  // Update selected item (persists to workspace memory)
  const selectItem = useCallback((itemId: string) => {
    saveActiveSection(itemId);
  }, [saveActiveSection]);

  // Handle scroll position
  const handleScroll = useCallback((position: number) => {
    saveScrollPosition(position);
  }, [saveScrollPosition]);

  // Get greeting based on time of day and context
  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    let timeGreeting = '';

    if (hour < 12) {
      timeGreeting = 'Good morning';
    } else if (hour < 18) {
      timeGreeting = 'Good afternoon';
    } else {
      timeGreeting = 'Good evening';
    }

    const contextGreetings: Record<OperatingContext, string> = {
      Work: 'Stay focused on what moves work forward.',
      School: 'Make progress on your coursework.',
      Life: 'Keep life moving without turning it into admin.',
      Photography: 'Create work you are proud of.',
      Travel: 'Make the most of your journey.',
      Health: 'Keep your health a priority.',
      'Study Abroad': 'Make your study abroad journey real.',
    };

    return `${timeGreeting}. ${contextGreetings[currentContext]}`;
  }, [currentContext]);

  // Get next event from timeline
  const getNextEvent = useCallback(() => {
    if (timeline.length === 0) return null;
    const now = new Date();
    const upcomingEvent = timeline.find(event => new Date(event.start) > now);
    if (!upcomingEvent) return null;

    const eventTime = new Date(upcomingEvent.start).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });

    return {
      time: eventTime,
      title: upcomingEvent.title,
    };
  }, [timeline]);

  return {
    // Current state
    currentContext,
    focusSession,
    ambientActivity,
    timeline,
    workspace,

    // Context switching
    switchContext,

    // Focus session management
    startFocus,
    pauseFocus,
    resumeFocus,
    endFocus,

    // Activity logging
    logAmbientActivity,

    // Data updates
    updateTimeline,
    selectItem,
    handleScroll,

    // UI helpers
    getGreeting,
    getNextEvent,
  };
}
