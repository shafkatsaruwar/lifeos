/**
 * Read-only Careers page (step 1). Independent of the Career hub kill-switch
 * in careerFlag.ts so the old module stays untouched.
 */
export const CAREER_PAGE_ENABLED = true;

export const CAREER_PAGE_ACCENT = "#0f766e";

type ApplicationLike = {
  id?: string;
  companyId?: string;
  jobTitle?: string;
  stageId?: string;
  outcome?: string;
  appliedAt?: string;
  nextAction?: string;
  nextActionDueAt?: string;
};

type CompanyLike = { id?: string; name?: string };

/** Stages that are closed: nothing left to do on these applications. */
const CLOSED_STAGES = ["rejected", "withdrawn", "accepted"];

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

function asList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") return Object.values(value) as T[];
  return [];
}

function asApplications(value: unknown): ApplicationLike[] {
  return asList<ApplicationLike>(value);
}

function isRejected(a: ApplicationLike): boolean {
  return a.stageId === "rejected" || a.outcome === "rejected";
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
    rejected: applications.filter(isRejected).length,
    firstStep: applications.filter((a) => FIRST_STEP_STAGES.includes(a.stageId ?? "")).length,
    awaiting: applications.filter((a) => a.stageId === "applied" && isRecent(a.appliedAt, now)).length,
  };
}

export type CareerPipelineRow = { key: string; label: string; count: number; ratio: number };

/** Four pipeline rows for the bars. Bar length is the share of all applications. */
export function careerPipeline(career: unknown): CareerPipelineRow[] {
  const applications = asApplications((career as { applications?: unknown } | undefined)?.applications);
  const total = applications.length;
  const count = (test: (a: ApplicationLike) => boolean) => applications.filter(test).length;
  const rows = [
    { key: "saved", label: "Saved", count: count((a) => a.stageId === "saved") },
    { key: "applied", label: "Applied", count: count((a) => a.stageId === "applied") },
    { key: "screening", label: "Recruiter screening", count: count((a) => a.stageId === "recruiter_screening") },
    { key: "rejected", label: "Rejected", count: count(isRejected) },
  ];
  return rows.map((row) => ({ ...row, ratio: total > 0 ? row.count / total : 0 }));
}

export type CareerAttention = { id: string; title: string; subtitle: string; dueLabel: string };

/** The most urgent open application whose next action is due today or overdue. */
export function careerAttention(career: unknown, now: number = Date.now()): CareerAttention | null {
  const data = career as { applications?: unknown; companies?: unknown } | undefined;
  const applications = asApplications(data?.applications);
  const companies = asList<CompanyLike>(data?.companies);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const due = applications
    .filter((a) => !CLOSED_STAGES.includes(a.stageId ?? ""))
    .filter((a) => {
      if (!a.nextActionDueAt) return false;
      const time = Date.parse(a.nextActionDueAt);
      return !Number.isNaN(time) && time <= endOfToday.getTime();
    })
    .sort((a, b) => Date.parse(a.nextActionDueAt ?? "") - Date.parse(b.nextActionDueAt ?? ""));

  const top = due[0];
  if (!top) return null;
  const company = companies.find((c) => c.id === top.companyId)?.name ?? "";
  const dueTime = Date.parse(top.nextActionDueAt ?? "");
  return {
    id: top.id ?? "",
    title: top.nextAction?.trim() || "Follow-up due",
    subtitle: [top.jobTitle, company].filter(Boolean).join(" · "),
    dueLabel: dueTime < now ? "Overdue" : "Due today",
  };
}

export type CareerRecentRow = { id: string; title: string; company: string; appliedAt?: string };

/** Newest applications first. Undated ones sink to the bottom. */
export function careerRecent(career: unknown, limit = 5): CareerRecentRow[] {
  const data = career as { applications?: unknown; companies?: unknown } | undefined;
  const applications = asApplications(data?.applications);
  const companies = asList<CompanyLike>(data?.companies);
  return applications
    .slice()
    .sort((a, b) => (Date.parse(b.appliedAt ?? "") || 0) - (Date.parse(a.appliedAt ?? "") || 0))
    .slice(0, limit)
    .map((a) => ({
      id: a.id ?? "",
      title: a.jobTitle?.trim() || "Untitled role",
      company: companies.find((c) => c.id === a.companyId)?.name ?? "",
      appliedAt: a.appliedAt,
    }));
}
