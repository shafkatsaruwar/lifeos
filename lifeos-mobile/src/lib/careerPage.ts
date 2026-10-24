/**
 * Read-only Careers page (step 1). Independent of the Career hub kill-switch
 * in careerFlag.ts so the old module stays untouched.
 */
export const CAREER_PAGE_ENABLED = true;

export const CAREER_PAGE_ACCENT = "#0f766e";

type ApplicationLike = { stageId?: string; outcome?: string };

export type CareerPageStats = {
  total: number;
  rejected: number;
  firstStep: number;
  awaiting: number;
};

function asApplications(value: unknown): ApplicationLike[] {
  if (Array.isArray(value)) return value as ApplicationLike[];
  if (value && typeof value === "object") return Object.values(value) as ApplicationLike[];
  return [];
}

/** Counts for the four Careers blocks. Missing or malformed data counts as zero. */
export function careerPageStats(career: unknown): CareerPageStats {
  const applications = asApplications((career as { applications?: unknown } | undefined)?.applications);
  return {
    total: applications.length,
    rejected: applications.filter((a) => a.stageId === "rejected" || a.outcome === "rejected").length,
    firstStep: applications.filter((a) => a.stageId === "recruiter_screening").length,
    awaiting: applications.filter((a) => a.stageId === "applied").length,
  };
}
