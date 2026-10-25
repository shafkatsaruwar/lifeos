/**
 * Read-only Careers page (step 1). Independent of the Career hub kill-switch
 * in careerFlag.ts so the old module stays untouched.
 */
export const CAREER_PAGE_ENABLED = true;

export const CAREER_PAGE_ACCENT = "#0f766e";

type ApplicationLike = { stageId?: string; outcome?: string; appliedAt?: string };

/** Applications older than this stop counting as "awaiting response". */
export const AWAITING_WINDOW_DAYS = 30;

/** Stages that count as "first step" (screens before the real interviews). */
const FIRST_STEP_STAGES = ["assessment", "recruiter_screening", "hiring_manager"];

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
/** Missing or unreadable dates count as recent, so they don't disappear from the page. */
function isRecent(appliedAt: string | undefined, now: number): boolean {
  if (!appliedAt) return true;
  const time = Date.parse(appliedAt);
  if (Number.isNaN(time)) return true;
  return now - time <= AWAITING_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

export function careerPageStats(career: unknown, now: number = Date.now()): CareerPageStats {
  const applications = asApplications((career as { applications?: unknown } | undefined)?.applications);
  return {
    total: applications.length,
    rejected: applications.filter((a) => a.stageId === "rejected" || a.outcome === "rejected").length,
    firstStep: applications.filter((a) => FIRST_STEP_STAGES.includes(a.stageId ?? "")).length,
    awaiting: applications.filter((a) => a.stageId === "applied" && isRecent(a.appliedAt, now)).length,
  };
}
