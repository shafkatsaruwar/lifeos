/**
 * WorkOS Helper Functions
 * Transform existing LifeOS data into WorkOS-specific views
 * Uses: Projects, Tasks, Calendar, Focus Sessions, Notes, Brain
 */

export interface SkillObject {
  name: string;
  proficiency: "Beginner" | "Intermediate" | "Advanced" | "Expert";
  projectCount: number;
  certifications?: string[];
  lastUsed?: string;
  nextStep?: string;
}

export interface GoalObject {
  id: string;
  name: string;
  progress: number;
  linkedProjectName?: string;
  linkedTaskCount: number;
  targetDate?: string;
  status: "active" | "paused" | "achieved";
}

export interface ApplicationStage {
  name: string;
  projects: Array<{ name: string; color: string; progress: number }>;
  count: number;
}

export type MomentumLevel = "high" | "medium" | "dormant" | "blocked";

// ===== PROJECT HELPERS =====

/**
 * Get momentum status for a project based on recent activity
 */
export function getProjectMomentum(
  projectName: string,
  tasks: Array<{ project: string; done?: boolean; canceled?: boolean; completedAt?: string }>,
  ambientActivities?: Array<{ spaceName?: string; startedAt: string }>,
  recentFocusSessions?: Array<{ linkedTasks?: number[]; startTime: Date }>,
): MomentumLevel {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Check for recent completions
  const recentCompletions = tasks
    .filter(t => t.project === projectName && t.done && t.completedAt)
    .filter(t => new Date(t.completedAt!) > oneWeekAgo).length;

  // Check for recent ambient activity
  const recentActivity = ambientActivities?.filter(
    a => a.spaceName === projectName && new Date(a.startedAt) > oneWeekAgo
  ).length ?? 0;

  // Check for recent focus sessions
  const recentSessions = recentFocusSessions?.filter(
    s => s.startTime > oneWeekAgo
  ).length ?? 0;

  // Calculate activity score
  const activityScore = recentCompletions + recentActivity + (recentSessions * 2);

  if (activityScore > 5) return "high";
  if (activityScore > 2) return "medium";

  // Check if project has many incomplete tasks
  const incompleteTasks = tasks.filter(
    t => t.project === projectName && !t.done && !t.canceled
  ).length;

  if (incompleteTasks > 0 && new Date(tasks.find(t => t.project === projectName)?.completedAt ?? twoWeeksAgo) < twoWeeksAgo) {
    return "blocked";
  }

  return "dormant";
}

/**
 * Get last activity date for a project
 */
export function getProjectLastActivity(
  projectName: string,
  tasks: Array<{ project: string; completedAt?: string; done?: boolean }>,
  notes?: Array<{ projectName?: string; updatedAt: string }>,
): Date | null {
  const dates: Date[] = [];

  // Recent task completion
  const lastTaskCompletion = tasks
    .filter(t => t.project === projectName && t.done)
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
    [0];
  if (lastTaskCompletion?.completedAt) {
    dates.push(new Date(lastTaskCompletion.completedAt));
  }

  // Recent note update
  const lastNote = notes
    ?.filter(n => n.projectName === projectName)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    [0];
  if (lastNote?.updatedAt) {
    dates.push(new Date(lastNote.updatedAt));
  }

  return dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null;
}

/**
 * Extract project count of linked tasks
 */
export function getProjectTaskCount(
  projectName: string,
  tasks: Array<{ project: string; done?: boolean; canceled?: boolean }>,
): number {
  return tasks.filter(t => t.project === projectName && !t.done && !t.canceled).length;
}

/**
 * Calculate project progress from task completion
 */
export function getProjectProgress(
  projectName: string,
  tasks: Array<{ project: string; done?: boolean; canceled?: boolean }>,
): number {
  const projectTasks = tasks.filter(t => t.project === projectName);
  if (projectTasks.length === 0) return 0;
  const completed = projectTasks.filter(t => t.done).length;
  return Math.round((completed / projectTasks.length) * 100);
}

// ===== INTERVIEW & APPLICATION HELPERS =====

/**
 * Get applications grouped by pipeline stage
 * Stages: "Prospect", "Applied", "Phone Screen", "Technical", "Final Round", "Offer", "Rejected"
 */
export function getApplicationsByStage(
  projects: Array<{ name: string; desc?: string; kind?: string; tasks?: number }>,
): Record<string, Array<{ name: string; color?: string; progress?: number }>> {
  const stages = {
    "Prospect": [] as Array<{ name: string; color?: string; progress?: number }>,
    "Applied": [] as Array<{ name: string; color?: string; progress?: number }>,
    "Phone Screen": [] as Array<{ name: string; color?: string; progress?: number }>,
    "Technical": [] as Array<{ name: string; color?: string; progress?: number }>,
    "Final Round": [] as Array<{ name: string; color?: string; progress?: number }>,
    "Offer": [] as Array<{ name: string; color?: string; progress?: number }>,
    "Rejected": [] as Array<{ name: string; color?: string; progress?: number }>,
  };

  // This would parse project descriptions or tags to infer stage
  // For now, return empty stages structure
  return stages;
}

/**
 * Get upcoming interviews from projects (based on Calendar events)
 * Should be wired to actual calendar data in real implementation
 */
export function getUpcomingInterviews(
  events: Array<{ title: string; start: string; source?: string; notes?: string }>,
): Array<{ title: string; date: string; daysUntil: number }> {
  const now = new Date();
  const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  return events
    .filter(e => {
      const eventDate = new Date(e.start);
      return e.title.toLowerCase().includes("interview") &&
        eventDate > now &&
        eventDate < oneMonthFromNow;
    })
    .map(e => ({
      title: e.title,
      date: new Date(e.start).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      daysUntil: Math.ceil((new Date(e.start).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
    }))
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

/**
 * Get application deadlines from projects
 */
export function getApplicationDeadlines(
  tasks: Array<{ title: string; project: string; due?: string; priority?: string; done?: boolean }>,
): Array<{ title: string; project: string; date: string; daysUntil: number; priority?: string }> {
  const now = new Date();
  const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  return tasks
    .filter(t => {
      if (!t.due || t.done) return false;
      const dueDate = new Date(t.due);
      return dueDate > now && dueDate < oneMonthFromNow;
    })
    .map(t => ({
      title: t.title,
      project: t.project,
      date: new Date(t.due!).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      daysUntil: Math.ceil((new Date(t.due!).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
      priority: t.priority,
    }))
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 5);
}

// ===== SKILL HELPERS =====

/**
 * Parse skills from brain items or project tags
 * This is a simplified version; full implementation would parse structured data
 */
export function getSkills(
  projects: Array<{ name: string; desc?: string }>,
  tags?: string[],
): SkillObject[] {
  // Common tech skills to look for
  const techSkills = [
    "React", "TypeScript", "Firebase", "Node.js", "Python",
    "AWS", "Docker", "PostgreSQL", "Next.js", "GraphQL",
  ];

  const skillsMap = new Map<string, SkillObject>();

  // Extract skills from project descriptions
  projects.forEach(p => {
    const desc = (p.desc || "").toLowerCase();
    techSkills.forEach(skill => {
      if (desc.includes(skill.toLowerCase())) {
        if (!skillsMap.has(skill)) {
          skillsMap.set(skill, {
            name: skill,
            proficiency: "Advanced",
            projectCount: 0,
            certifications: [],
          });
        }
        const existing = skillsMap.get(skill)!;
        existing.projectCount += 1;
      }
    });
  });

  return Array.from(skillsMap.values())
    .sort((a, b) => b.projectCount - a.projectCount)
    .slice(0, 8);
}

// ===== GOAL HELPERS =====

/**
 * Extract professional goals from projects
 * Goals are projects marked as goals (e.g., name starts with specific pattern)
 */
export function getProfessionalGoals(
  projects: Array<{ name: string; progress: number; kind?: string }>,
): GoalObject[] {
  // Simple heuristic: projects that sound like goals
  const goalKeywords = ["launch", "complete", "achieve", "get", "build", "earn"];

  return projects
    .filter(p => goalKeywords.some(k => p.name.toLowerCase().includes(k)))
    .map((p, i) => {
      const status: "active" | "paused" | "achieved" = p.progress === 100 ? "achieved" : "active";
      return {
        id: `goal-${i}`,
        name: p.name,
        progress: p.progress,
        linkedProjectName: p.name,
        linkedTaskCount: Math.floor(p.progress / 20), // Placeholder
        targetDate: undefined,
        status,
      };
    })
    .slice(0, 5);
}

// ===== PORTFOLIO HELPERS =====

/**
 * Extract portfolio projects from all projects
 * Marked as portfolio items in metadata
 */
export function getPortfolioProjects(
  projects: Array<{ name: string; desc?: string; progress: number; color: string }>,
  portfolioNames?: string[],
): Array<{ name: string; desc?: string; progress: number; color: string }> {
  if (portfolioNames?.length) {
    return projects.filter(p => portfolioNames.includes(p.name));
  }

  // Fallback: use projects with high progress and interesting descriptions
  return projects
    .filter(p => p.progress > 50 && p.desc && p.desc.length > 20)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 3);
}

// ===== TIME HELPERS =====

/**
 * Format time difference for display
 */
export function getTimeUntil(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.ceil(diff / (24 * 60 * 60 * 1000));

  if (days < 0) return "Overdue";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `${days} days`;
  return `${Math.ceil(days / 7)} weeks`;
}

/**
 * Get urgency color based on days until deadline
 */
export function getUrgencyColor(daysUntil: number): string {
  if (daysUntil < 1) return "#cf625a"; // Red
  if (daysUntil < 3) return "#d99b38"; // Orange
  if (daysUntil < 7) return "#4b8bdc"; // Blue
  return "#47a47b"; // Green
}

// ===== OPPORTUNITY HELPERS =====

/**
 * Get upcoming events from calendar (networking, conferences, etc.)
 */
export function getUpcomingOpportunities(
  events: Array<{ title: string; start: string; notes?: string }>,
): Array<{ title: string; date: string; daysUntil: number; type: string }> {
  const now = new Date();
  const threeMonthsFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const opportunityKeywords = {
    networking: ["networking", "meetup", "coffee", "call"],
    conference: ["conference", "summit", "expo", "convention"],
    fair: ["career fair", "job fair", "fair"],
    workshop: ["workshop", "training", "bootcamp"],
  };

  return events
    .filter(e => {
      const eventDate = new Date(e.start);
      return eventDate > now && eventDate < threeMonthsFromNow;
    })
    .map(e => {
      let type = "event";
      const title = e.title.toLowerCase();
      for (const [key, keywords] of Object.entries(opportunityKeywords)) {
        if (keywords.some(k => title.includes(k))) {
          type = key;
          break;
        }
      }
      return {
        title: e.title,
        date: new Date(e.start).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        daysUntil: Math.ceil((new Date(e.start).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
        type,
      };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil);
}
