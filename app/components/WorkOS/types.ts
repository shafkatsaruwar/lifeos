/**
 * WorkOS Component Types
 * Shared type definitions for WorkOS components
 */

export interface DashboardProject {
  name: string;
  desc: string;
  progress: number;
  color: string;
  icon: string;
  tasks: number;
  kind: "maintenance" | "finishable";
}

export interface DashboardTask {
  id: number;
  title: string;
  project: string;
  color: string;
  due?: string;
  priority: "High" | "Medium" | "Low";
  done?: boolean;
  canceled?: boolean;
}

export interface DashboardNote {
  id: string;
  title: string;
  body: string;
  projectName?: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  source: "LifeOS" | "iCal" | "Google" | "Outlook";
  color: string;
  notes?: string;
}

export interface ProjectCardProps {
  project: DashboardProject;
  momentum?: "high" | "medium" | "dormant" | "blocked";
  lastActivity?: Date | null;
  linkedTasksCount?: number;
  onOpen?: () => void;
  onComplete?: () => void;
}

export interface PortfolioCardProps {
  project: DashboardProject;
  metadata?: {
    description?: string;
    techStack?: string[];
    featured?: boolean;
    image?: string;
    github?: string;
    website?: string;
  };
  onOpen?: () => void;
}

export interface SkillCardProps {
  name: string;
  proficiency: "Beginner" | "Intermediate" | "Advanced" | "Expert";
  projectCount: number;
  certifications?: string[];
  lastUsed?: string;
  nextStep?: string;
  onOpen?: () => void;
}

export interface GoalCardProps {
  name: string;
  progress: number;
  linkedProjectName?: string;
  linkedTaskCount?: number;
  targetDate?: string;
  status: "active" | "paused" | "achieved";
  onOpen?: () => void;
}

export interface UrgentAlertProps {
  type: "interview" | "deadline" | "followup";
  title: string;
  daysUntil: number;
  project?: string;
  onOpen?: () => void;
}

export interface ApplicationStage {
  name: string;
  projects: Array<{ name: string; color: string; progress: number }>;
  count: number;
}

export interface InterviewPipelineProps {
  applications: DashboardProject[];
  stages?: string[];
  onOpen?: (projectName: string) => void;
}

export interface MomentumSectionProps {
  projects: DashboardProject[];
  momentum?: "high" | "medium" | "dormant" | "blocked";
  onOpen?: (projectName: string) => void;
}
