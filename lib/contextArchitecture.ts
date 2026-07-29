// LifeOS 3.0: Three-Layer Context Architecture
// ============================================

// LAYER 1: Operating Context - The current active workspace
export type OperatingContext = "Work" | "School" | "Life" | "Photography" | "Study Abroad" | "Travel" | "Health";

export interface OperatingContextState {
  current: OperatingContext;
  previousContext: OperatingContext | null;
  switchedAt: Date;
  focusSessionActive: boolean;
  focusSessionId: string | null;
}

// LAYER 2: Personal Context Layer - Global reasoning engine
export interface Observation {
  type: "deadline" | "interview" | "event" | "health" | "relationship" | "learning" | "project" | "goal";
  module: OperatingContext;
  description: string;
  urgency: "critical" | "high" | "medium" | "low";
  dueDate?: string;
  timestamp: Date;
}

export interface ContextualMetadata {
  taskCount: number;
  projectCount: number;
  urgentItemsCount: number;
  nextDeadline?: string;
  currentMood?: "focused" | "interrupted" | "overwhelmed" | "relaxed";
  energyLevel?: "low" | "medium" | "high";
  interruptionTolerance: "minimal" | "moderate" | "flexible";
}

export interface PersonalContextLayer {
  observations: Observation[];
  metadata: Record<OperatingContext, ContextualMetadata>;
  priorityScore: (context: OperatingContext) => number;
  recommendedContext: OperatingContext;
  criticalAlerts: Observation[];
  lastUpdated: Date;
}

// LAYER 3: Focus Sessions - First-class orchestration entities
export interface FocusSession {
  id: string;
  name: string;
  description?: string;
  context: OperatingContext;
  startTime: Date;
  endTime: Date;
  duration: number; // minutes
  goal: string;
  projects: string[]; // project IDs
  linkedTasks: number[]; // task IDs
  interruptionPolicy: "minimal" | "moderate" | "flexible";
  aiMode: "work-assistant" | "study-partner" | "creative-director" | "general";
  status: "scheduled" | "active" | "paused" | "completed" | "cancelled";
  completionPercentage: number;
  notes?: string;
  energyBefore?: "low" | "medium" | "high";
  energyAfter?: "low" | "medium" | "high";
  createdAt: Date;
  updatedAt: Date;
}

// Local Task System - Tasks belong to their parent objects
export interface LocalTask {
  id: number;
  title: string;
  description?: string;
  parentType: "project" | "class" | "client" | "application" | "focus-session";
  parentId: string;
  status: "todo" | "in-progress" | "blocked" | "done" | "cancelled";
  priority: "low" | "medium" | "high" | "critical";
  dueDate?: string;
  createdAt: Date;
  updatedAt: Date;
  relatedTasks?: number[]; // Other task IDs this depends on
}

// Context Transition Rules
export interface ContextTransition {
  from: OperatingContext;
  to: OperatingContext;
  transitionTime: number; // minutes
  prepTime: number; // minutes before transition to prepare
  recoveryTime: number; // minutes after to recover
  automatedActions: string[]; // What LifeOS does during transition
}

// Dashboard Card Structure - Context-aware
export interface DashboardCard {
  id: string;
  context: OperatingContext;
  type: "progress" | "upcoming" | "action" | "insight" | "quick-action";
  title: string;
  description?: string;
  priority: "critical" | "high" | "normal" | "low";
  action?: {
    label: string;
    onClick: () => void;
  };
  metadata?: Record<string, any>;
}

// Interrupt Alert - Cross-context notification
export interface InterruptionAlert {
  id: string;
  priority: "critical" | "high";
  message: string;
  context: OperatingContext;
  action?: string;
  dismissAt?: Date;
  timestamp: Date;
}

// Context-aware Quick Capture
export interface QuickCaptureTemplate {
  context: OperatingContext;
  types: {
    work: string[];
    school: string[];
    life: string[];
    photography: string[];
  };
}

export const contextTransitionDefaults: Record<OperatingContext, ContextTransition> = {
  Work: { from: "Life", to: "Work", transitionTime: 15, prepTime: 5, recoveryTime: 5, automatedActions: [] },
  School: { from: "Life", to: "School", transitionTime: 10, prepTime: 3, recoveryTime: 3, automatedActions: [] },
  Life: { from: "Work", to: "Life", transitionTime: 20, prepTime: 10, recoveryTime: 10, automatedActions: [] },
  Photography: { from: "Work", to: "Photography", transitionTime: 30, prepTime: 15, recoveryTime: 15, automatedActions: [] },
  "Study Abroad": { from: "School", to: "Study Abroad", transitionTime: 20, prepTime: 5, recoveryTime: 5, automatedActions: [] },
  Travel: { from: "Life", to: "Travel", transitionTime: 45, prepTime: 30, recoveryTime: 30, automatedActions: [] },
  Health: { from: "Life", to: "Health", transitionTime: 10, prepTime: 2, recoveryTime: 2, automatedActions: [] },
};
