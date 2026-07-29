import { OperatingContext, ContextTransition, contextTransitionDefaults } from './contextArchitecture';

/**
 * Context transition management: handles switching between operating contexts
 * with preparation time, transition time, and recovery time.
 */

export interface TransitionPhase {
  phase: 'preparation' | 'transition' | 'recovery' | 'complete';
  duration: number; // milliseconds
  message: string;
  startTime: Date;
  endTime: Date;
}

export interface TransitionPlan {
  from: OperatingContext;
  to: OperatingContext;
  phases: TransitionPhase[];
  totalDuration: number; // milliseconds
  startTime: Date;
}

// Get transition config for context pair
export function getTransitionConfig(
  from: OperatingContext,
  to: OperatingContext
): ContextTransition {
  // Check if there's a specific config for this pair
  const key = `${from}->${to}` as any;
  const defaults = contextTransitionDefaults;

  // Use defaults for target context
  return defaults[to];
}

// Build a transition plan
export function buildTransitionPlan(
  from: OperatingContext,
  to: OperatingContext
): TransitionPlan {
  const config = getTransitionConfig(from, to);
  const startTime = new Date();

  const prepMs = config.prepTime * 60 * 1000;
  const transitionMs = config.transitionTime * 60 * 1000;
  const recoveryMs = config.recoveryTime * 60 * 1000;

  const preparationEnd = new Date(startTime.getTime() + prepMs);
  const transitionEnd = new Date(preparationEnd.getTime() + transitionMs);
  const recoveryEnd = new Date(transitionEnd.getTime() + recoveryMs);

  const phases: TransitionPhase[] = [
    {
      phase: 'preparation',
      duration: prepMs,
      message: `Preparing to switch to ${to} (${config.prepTime} min)`,
      startTime,
      endTime: preparationEnd,
    },
    {
      phase: 'transition',
      duration: transitionMs,
      message: `Switching to ${to} (${config.transitionTime} min)`,
      startTime: preparationEnd,
      endTime: transitionEnd,
    },
    {
      phase: 'recovery',
      duration: recoveryMs,
      message: `Settling into ${to} (${config.recoveryTime} min)`,
      startTime: transitionEnd,
      endTime: recoveryEnd,
    },
    {
      phase: 'complete',
      duration: 0,
      message: `Now in ${to} context`,
      startTime: recoveryEnd,
      endTime: recoveryEnd,
    },
  ];

  return {
    from,
    to,
    phases,
    totalDuration: prepMs + transitionMs + recoveryMs,
    startTime,
  };
}

// Get current phase of a transition
export function getCurrentPhase(plan: TransitionPlan): TransitionPhase | null {
  const now = new Date();

  for (const phase of plan.phases) {
    if (now >= phase.startTime && now < phase.endTime) {
      return phase;
    }
  }

  // If we're past all phases
  if (now >= plan.phases[plan.phases.length - 1].endTime) {
    return plan.phases[plan.phases.length - 1];
  }

  return null;
}

// Calculate time remaining in transition
export function getTimeRemaining(plan: TransitionPlan): number {
  const now = new Date();
  const endTime = plan.phases[plan.phases.length - 1].endTime;

  if (now >= endTime) {
    return 0;
  }

  return endTime.getTime() - now.getTime();
}

// Get progress percentage (0-100)
export function getTransitionProgress(plan: TransitionPlan): number {
  const now = new Date();
  const start = plan.startTime;
  const end = plan.phases[plan.phases.length - 1].endTime;

  if (now >= end) {
    return 100;
  }

  if (now <= start) {
    return 0;
  }

  const total = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();

  return Math.round((elapsed / total) * 100);
}

// Automated actions during transition
export function getAutomatedActionsForPhase(phase: TransitionPhase): string[] {
  const actions: string[] = [];

  if (phase.phase === 'preparation') {
    actions.push('Close current context notifications');
    actions.push('Save current work');
    actions.push('Load context templates');
  } else if (phase.phase === 'transition') {
    actions.push('Update operating context');
    actions.push('Switch UI theme if needed');
    actions.push('Update AI mode');
  } else if (phase.phase === 'recovery') {
    actions.push('Enable new context notifications');
    actions.push('Load context-specific data');
    actions.push('Activate relevant focus sessions');
  } else if (phase.phase === 'complete') {
    actions.push('Transition complete');
  }

  return actions;
}

// Configuration override for specific transitions
export function setTransitionConfig(
  from: OperatingContext,
  to: OperatingContext,
  config: Partial<ContextTransition>
): ContextTransition {
  // This would persist to localStorage or backend
  return {
    from,
    to,
    transitionTime: config.transitionTime ?? 15,
    prepTime: config.prepTime ?? 5,
    recoveryTime: config.recoveryTime ?? 5,
    automatedActions: config.automatedActions ?? [],
  };
}
