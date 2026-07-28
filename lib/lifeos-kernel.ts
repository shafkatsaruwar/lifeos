// LifeOS Kernel: Four-layer architecture

// ============================================
// LAYER 2: MEMORY (Persistent Identity)
// ============================================

export interface PersonalMemory {
  identity: {
    name: string;
    values: string[];                    // "impact", "autonomy", "learning"
    description: string;
  };
  longTermGoals: Array<{
    goal: string;
    timeframe: string;                   // "1-2 years", "ongoing", etc.
    why: string;
  }>;
  roles: Array<{
    role: string;
    description: string;
    importance: "core" | "significant" | "background";
  }>;
  relationships: Array<{
    person: string;
    role: string;                        // "mother", "mentor", etc.
    constraints?: string[];              // "requires care", "weekly check-in"
  }>;
  recurringConstraints: Array<{
    constraint: string;
    frequency: string;                   // "daily", "weekly", etc.
    duration: number;                    // hours per occurrence
  }>;
  skills: Array<{
    domain: string;
    skills: string[];
  }>;
  pastPatterns: Array<{
    pattern: string;
    example?: string;
  }>;
  lessons: Array<{
    lesson: string;
    learned: string;                     // date or context
  }>;
  wins: string[];                        // Recent successes
  failures: string[];                    // Learning opportunities
}

// ============================================
// LAYER 1: OBSERVATIONS (Module Facts)
// ============================================

export type ObservationType =
  | "milestone"
  | "activity"
  | "deadline"
  | "queue"
  | "message"
  | "metric"
  | "completion"
  | "status";

export interface Observation {
  id: string;
  module: string;                        // "Synapse", "Photography", etc.
  type: ObservationType;
  fact: string;                          // Human-readable fact
  timestamp: Date;
  metadata: Record<string, any>;         // Raw data for reasoning
  importance?: "critical" | "high" | "normal" | "low";
}

// ============================================
// LAYER 3: PERSONAL CONTEXT (Daily Situation)
// ============================================

export interface PersonalContext {
  date: Date;
  inferredSeasons: Array<{
    season: string;                      // "Founder Season", "Masters Season"
    confidence: number;                  // 0-1
    reason: string;
    activeSince: Date;
  }>;
  inferredRoles: Array<{
    role: string;
    focus: "primary" | "secondary" | "background";
    reason: string;
  }>;
  today: {
    availableHours: number;
    energyLevel: "high" | "moderate" | "low";
    scheduledCommitments: Array<{
      name: string;
      duration: number;                  // hours
      importance: "fixed" | "flexible";
    }>;
  };
  momentum: Record<string, {
    status: "accelerating" | "stable" | "decelerating" | "stalled";
    lastActivity: Date;
    percentComplete?: number;
    daysInactive: number;
  }>;
  waitingOn: Array<{
    description: string;
    from: string;
    since: Date;
    importance: "critical" | "high" | "normal" | "low";
  }>;
  concerns: Array<{
    description: string;
    relatedModules: string[];
    severity: "critical" | "high" | "normal";
    deadline?: Date;
  }>;
  opportunities: Array<{
    description: string;
    module: string;
    window: string;                      // "next 24 hours", "this week"
  }>;
}

// ============================================
// LAYER 4: REASONING & RECOMMENDATION
// ============================================

export interface Recommendation {
  module: string;
  action: string;                        // "Complete Caregiver Linking onboarding"
  why: string;                           // Explanation in plain English
  confidence: number;                    // 0-1
  reasoning: {
    seasonAlignment: string;
    momentumFactor: string;
    timeAvailable: string;
    constraints: string[];
    opportunityCost: string;
  };
}

export interface DailyBriefing {
  date: Date;
  greeting: string;                      // "Good morning, Shafkat"
  mood: "focused" | "balanced" | "exploration" | "recovery";
  primaryRecommendation: Recommendation | null;
  secondaryItems: Array<{
    type: "waiting" | "deadline" | "pattern" | "opportunity";
    message: string;
  }>;
  explanation: string;                   // The "why" in plain English
  firstStep: string;                     // Actionable next step
}

// ============================================
// MOCK DATA & UTILITIES
// ============================================

export const mockMemory: PersonalMemory = {
  identity: {
    name: "Shafkat",
    values: ["impact", "autonomy", "learning", "family", "quality"],
    description: "Founder, developer, photographer, caregiver"
  },
  longTermGoals: [
    {
      goal: "Build Synapse into a platform that helps caregivers",
      timeframe: "2-3 years",
      why: "Personal mission - Mom's needs + broader impact"
    },
    {
      goal: "Complete Master's degree",
      timeframe: "2 years",
      why: "Career optionality + credential"
    },
    {
      goal: "Establish photography as secondary income",
      timeframe: "1-2 years",
      why: "Creative outlet + financial diversification"
    }
  ],
  roles: [
    { role: "Founder", description: "Building Synapse", importance: "core" },
    { role: "Caregiver", description: "Supporting Mom", importance: "core" },
    { role: "Student", description: "Masters applications", importance: "significant" },
    { role: "Photographer", description: "Editing, shoots, clients", importance: "significant" },
    { role: "Job Seeker", description: "Exploring career options", importance: "background" }
  ],
  relationships: [
    {
      person: "Mom",
      role: "mother",
      constraints: ["requires caregiver coordination", "health management", "weekly check-ins"]
    }
  ],
  recurringConstraints: [
    { constraint: "Caregiver coordination hours", frequency: "daily", duration: 1 },
    { constraint: "Health maintenance", frequency: "daily", duration: 0.5 }
  ],
  skills: [
    {
      domain: "Synapse",
      skills: ["health platform architecture", "caregiver workflows", "product thinking"]
    },
    {
      domain: "Photography",
      skills: ["post-processing", "client management", "composition", "lighting"]
    },
    {
      domain: "Development",
      skills: ["React", "TypeScript", "full-stack", "deployment"]
    }
  ],
  pastPatterns: [
    {
      pattern: "Focus cycles last 6 weeks when in Career Season",
      example: "Job applications tend to cluster into intensive periods"
    },
    {
      pattern: "Photography has natural 2-week pauses between shoots",
      example: "Editing happens in bursts, not steady work"
    },
    {
      pattern: "Procrastinate on administrative tasks",
      example: "Applications, forms, documents"
    },
    {
      pattern: "Most productive in morning hours",
      example: "Best creative work happens before 2 PM"
    }
  ],
  lessons: [
    {
      lesson: "Ignoring health leads to burnout",
      learned: "2023 - Recovery took months"
    },
    {
      lesson: "Cannot maintain multiple founder seasons simultaneously",
      learned: "2024 - Synapse required full focus"
    },
    {
      lesson: "Photography clients need consistent communication",
      learned: "2023 - Unmanaged expectations caused issues"
    }
  ],
  wins: [
    "Launched Synapse MVP",
    "Completed Germany Master's interview",
    "Built photography portfolio from 50 to 300+ client images"
  ],
  failures: [
    "Missed Photography deadlines during Synapse crunch",
    "Ignored Masters deadlines trying to do everything",
    "Burnout from not respecting health constraints"
  ]
};

// ============================================
// MOCK MODULES (Observations)
// ============================================

export function generateMockObservations(): Observation[] {
  const today = new Date();

  return [
    // Synapse observations
    {
      id: "synapse-1",
      module: "Synapse",
      type: "milestone",
      fact: "Caregiver Linking is 90% complete",
      timestamp: today,
      metadata: { progress: 90, nextMilestone: "Onboarding screens" },
      importance: "critical"
    },
    {
      id: "synapse-2",
      module: "Synapse",
      type: "completion",
      fact: "Medications logged for today",
      timestamp: today,
      metadata: { adherence: 100 },
      importance: "normal"
    },
    {
      id: "synapse-3",
      module: "Synapse",
      type: "status",
      fact: "Orthodontist appointment tomorrow at 2 PM",
      timestamp: today,
      metadata: { type: "appointment", daysBefore: 1 },
      importance: "high"
    },

    // Photography observations
    {
      id: "photo-1",
      module: "Photography",
      type: "queue",
      fact: "Editing queue has 24 photos pending",
      timestamp: today,
      metadata: { count: 24, lastActivity: new Date(today.getTime() - 8 * 24 * 60 * 60 * 1000) },
      importance: "high"
    },
    {
      id: "photo-2",
      module: "Photography",
      type: "activity",
      fact: "No editing activity in 8 days",
      timestamp: today,
      metadata: { daysSinceActivity: 8 },
      importance: "normal"
    },

    // Career observations
    {
      id: "career-1",
      module: "Career",
      type: "message",
      fact: "Recruiter replied yesterday with follow-up questions",
      timestamp: today,
      metadata: { daysAgo: 1, status: "awaiting_response" },
      importance: "high"
    },

    // Masters observations
    {
      id: "masters-1",
      module: "Masters",
      type: "deadline",
      fact: "Germany program deadline in 12 days",
      timestamp: today,
      metadata: { daysRemaining: 12, status: "application_in_progress" },
      importance: "high"
    },
    {
      id: "masters-2",
      module: "Masters",
      type: "status",
      fact: "Statement of Purpose first draft complete",
      timestamp: today,
      metadata: { progress: 50, needsReview: true },
      importance: "high"
    },

    // Finance observations
    {
      id: "finance-1",
      module: "Finance",
      type: "metric",
      fact: "Emergency fund is $2k below target",
      timestamp: today,
      metadata: { current: 8000, target: 10000 },
      importance: "low"
    }
  ];
}

// ============================================
// REASONING ENGINE
// ============================================

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function buildContext(observations: Observation[], _memory: PersonalMemory): PersonalContext {
  const today = new Date();

  // Infer seasons from observations
  const inferredSeasons = [];

  if (observations.some(o => o.module === "Masters" && o.type === "deadline")) {
    inferredSeasons.push({
      season: "Masters Season",
      confidence: 0.9,
      reason: "Active deadline approaching (12 days)",
      activeSince: new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)
    });
  }

  if (observations.some(o => o.module === "Synapse" && o.type === "milestone")) {
    inferredSeasons.push({
      season: "Founder Season",
      confidence: 0.95,
      reason: "Synapse milestone approaching completion",
      activeSince: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    });
  }

  // Infer roles
  const inferredRoles = [
    { role: "Founder", focus: "primary" as const, reason: "Synapse at critical milestone" },
    { role: "Student", focus: "secondary" as const, reason: "Germany deadline active" },
    { role: "Caregiver", focus: "secondary" as const, reason: "Ongoing responsibility" }
  ];

  // Calculate momentum
  const momentum: Record<string, any> = {};

  const synapseObs = observations.find(o => o.module === "Synapse" && o.type === "milestone");
  if (synapseObs) {
    momentum["Synapse"] = {
      status: "accelerating",
      lastActivity: today,
      percentComplete: 90,
      daysInactive: 0
    };
  }

  const photoObs = observations.find(o => o.module === "Photography" && o.type === "activity");
  if (photoObs) {
    momentum["Photography"] = {
      status: "stalled",
      lastActivity: new Date(today.getTime() - 8 * 24 * 60 * 60 * 1000),
      daysInactive: 8
    };
  }

  // Extract waiting items
  const waitingOn = observations
    .filter(o => o.type === "message")
    .map(o => ({
      description: o.fact,
      from: o.module,
      since: o.timestamp,
      importance: o.importance || "normal"
    }));

  // Extract concerns
  const concerns = observations
    .filter(o => o.type === "deadline" || o.type === "status")
    .map(o => {
      const severity: "critical" | "high" | "normal" =
        o.importance === "critical" || o.importance === "high" ? o.importance : "normal";
      return {
        description: o.fact,
        relatedModules: [o.module],
        severity,
        deadline: o.metadata.daysRemaining ? new Date(today.getTime() + o.metadata.daysRemaining * 24 * 60 * 60 * 1000) : undefined
      };
    });

  return {
    date: today,
    inferredSeasons,
    inferredRoles,
    today: {
      availableHours: 8,
      energyLevel: "high",
      scheduledCommitments: [
        { name: "Orthodontist appointment", duration: 1, importance: "fixed" }
      ]
    },
    momentum,
    waitingOn,
    concerns,
    opportunities: [
      {
        description: "Photography editing session",
        module: "Photography",
        window: "this afternoon"
      }
    ]
  };
}

export function reasonAboutRecommendation(
  memory: PersonalMemory,
  context: PersonalContext,
  observations: Observation[]
): DailyBriefing {

  // Find the primary focus
  let primaryModule = "Synapse";
  let primaryReason = "Continue on Synapse; it's your core focus this season.";

  // Rule 1: Synapse milestone completion has highest priority
  const synapseProgress = observations.find(o => o.module === "Synapse" && o.type === "milestone");
  if (synapseProgress?.metadata.progress >= 90) {
    primaryModule = "Synapse";
    primaryReason = "You're one milestone away from completing Caregiver Linking, which unlocks the next phase of development. You have momentum.";
  }

  // Rule 2: If no active founder work, check Masters
  if (primaryModule === "Synapse" && !synapseProgress && context.inferredSeasons.some(s => s.season === "Masters Season")) {
    const mastersDue = observations.find(o => o.module === "Masters" && o.type === "deadline");
    if (mastersDue?.metadata.daysRemaining <= 14) {
      primaryModule = "Masters";
      primaryReason = "Germany deadline is approaching (12 days). Statement of Purpose needs final review.";
    }
  }

  const recommendation: Recommendation = {
    module: primaryModule,
    action: primaryModule === "Synapse"
      ? "Continue onboarding screens for Caregiver Linking"
      : primaryModule === "Masters"
      ? "Review and polish Statement of Purpose"
      : "Check module",
    why: primaryReason,
    confidence: 0.9,
    reasoning: {
      seasonAlignment: "Matches your current Founder Season focus",
      momentumFactor: "You have momentum; finishing unlocks next phase",
      timeAvailable: "6 hours available after appointments",
      constraints: ["Orthodontist appointment at 2 PM (1 hour)"],
      opportunityCost: "Photography can wait another day"
    }
  };

  return {
    date: new Date(),
    greeting: `Good morning, Shafkat.`,
    mood: "focused",
    primaryRecommendation: recommendation,
    secondaryItems: [
      {
        type: "deadline",
        message: "Germany deadline in 12 days — on track, but review needed"
      },
      {
        type: "pattern",
        message: "Photography is stalled (8 days). Consider a short session tomorrow"
      },
      {
        type: "waiting",
        message: "Recruiter waiting for response — could handle in 30 minutes"
      }
    ],
    explanation: recommendation.why,
    firstStep: recommendation.action
  };
}
