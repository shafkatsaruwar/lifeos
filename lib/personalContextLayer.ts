import {
  OperatingContext,
  PersonalContextLayer,
  Observation,
  ContextualMetadata,
} from './contextArchitecture';
import { LocalTask, FocusSession } from './contextArchitecture';

/**
 * PersonalContextLayer: Global reasoning engine that continuously evaluates
 * what the user should be working on based on observations and metadata.
 */

export interface PersonalContextLayerEngine {
  observations: Observation[];
  metadata: Record<OperatingContext, ContextualMetadata>;
  priorityScore: (context: OperatingContext) => number;
  recommendedContext: OperatingContext;
  criticalAlerts: Observation[];
  lastUpdated: Date;
}

// Calculate priority score for a context based on observations and metadata
export function calculatePriorityScore(
  context: OperatingContext,
  observations: Observation[],
  metadata: ContextualMetadata
): number {
  let score = 0;

  // Weight urgent observations more heavily
  const contextObservations = observations.filter(o => o.module === context);
  const criticalCount = contextObservations.filter(o => o.urgency === 'critical').length;
  const highCount = contextObservations.filter(o => o.urgency === 'high').length;

  score += criticalCount * 100;
  score += highCount * 50;

  // Factor in task counts (more tasks = higher priority if urgent)
  if (metadata.urgentItemsCount > 0) {
    score += metadata.urgentItemsCount * 25;
  }

  // Consider deadline proximity (lower daysUntilDeadline = higher score)
  if (metadata.nextDeadline) {
    const deadline = new Date(metadata.nextDeadline);
    const now = new Date();
    const daysUntil = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    if (daysUntil < 1) score += 200; // Critical deadline
    else if (daysUntil < 3) score += 100;
    else if (daysUntil < 7) score += 50;
  }

  // Energy level affects ability to engage
  if (metadata.energyLevel === 'high') score += 10;
  if (metadata.energyLevel === 'low') score -= 10;

  // Mood affects recommendation
  if (metadata.currentMood === 'focused') score += 15;
  if (metadata.currentMood === 'overwhelmed') score -= 20;

  return Math.max(0, score);
}

// Identify critical alerts across all observations
export function extractCriticalAlerts(observations: Observation[]): Observation[] {
  return observations.filter(o => o.urgency === 'critical');
}

// Determine recommended context based on observations and metadata
export function determineRecommendedContext(
  observations: Observation[],
  metadata: Record<OperatingContext, ContextualMetadata>,
  currentContext: OperatingContext
): OperatingContext {
  const contexts: OperatingContext[] = [
    'Work',
    'School',
    'Life',
    'Photography',
    'Study Abroad',
    'Travel',
    'Health',
  ];

  // Calculate scores for each context
  const scores = contexts.map(context => ({
    context,
    score: calculatePriorityScore(context, observations, metadata[context]),
  }));

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  // Check for critical alerts in any context
  const criticalAlerts = extractCriticalAlerts(observations);
  if (criticalAlerts.length > 0) {
    const alertContexts = new Set(criticalAlerts.map(a => a.module));
    for (const { context } of scores) {
      if (alertContexts.has(context)) {
        return context;
      }
    }
  }

  // Otherwise return highest scored context
  return scores[0]?.context || currentContext;
}

// Build comprehensive PersonalContextLayer state
export function buildPersonalContextLayer(
  observations: Observation[],
  contextMetadata: Record<OperatingContext, ContextualMetadata>,
  currentContext: OperatingContext
): PersonalContextLayerEngine {
  const criticalAlerts = extractCriticalAlerts(observations);
  const recommendedContext = determineRecommendedContext(observations, contextMetadata, currentContext);

  return {
    observations,
    metadata: contextMetadata,
    priorityScore: (context: OperatingContext) =>
      calculatePriorityScore(context, observations, contextMetadata[context]),
    recommendedContext,
    criticalAlerts,
    lastUpdated: new Date(),
  };
}

// Calculate contextual metadata from tasks, projects, and observations
export function calculateContextualMetadata(
  context: OperatingContext,
  tasks: LocalTask[],
  focusSessions: FocusSession[],
  observations: Observation[]
): ContextualMetadata {
  // Filter to this context
  const contextTasks = tasks.filter(t => {
    if (t.parentType === 'focus-session') {
      const session = focusSessions.find(s => s.id === t.parentId);
      return session?.context === context;
    }
    return false;
  });

  const urgentTasks = contextTasks.filter(t => t.priority === 'critical' || t.priority === 'high');

  // Find nearest deadline
  const taskWithDeadline = contextTasks
    .filter(t => t.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())[0];

  const contextObservations = observations.filter(o => o.module === context);

  return {
    taskCount: contextTasks.length,
    projectCount: focusSessions.filter(s => s.context === context).length,
    urgentItemsCount: urgentTasks.length,
    nextDeadline: taskWithDeadline?.dueDate,
    currentMood: 'focused',
    energyLevel: 'medium',
    interruptionTolerance: 'moderate',
  };
}

// Generate all context metadata efficiently
export function generateAllContextMetadata(
  tasks: LocalTask[],
  focusSessions: FocusSession[],
  observations: Observation[]
): Record<OperatingContext, ContextualMetadata> {
  const contexts: OperatingContext[] = [
    'Work',
    'School',
    'Life',
    'Photography',
    'Study Abroad',
    'Travel',
    'Health',
  ];

  const metadata: Record<OperatingContext, ContextualMetadata> = {} as any;

  for (const context of contexts) {
    metadata[context] = calculateContextualMetadata(context, tasks, focusSessions, observations);
  }

  return metadata;
}
