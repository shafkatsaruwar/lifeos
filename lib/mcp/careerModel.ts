import {
  companyName,
  createApplication,
  ensureCompany,
  moveApplicationStage,
  normalizeCareerHub,
  updateApplication,
} from "../careerHelpers";
import {
  CAREER_STAGES,
  emptyCareerHub,
  type ApplicationPriority,
  type CareerApplication,
  type CareerHub,
  type CareerStageId,
  type EmploymentType,
  type SalaryPeriod,
  type WorkArrangement,
} from "../careerTypes";
import { coerceFirebaseList } from "../validation";
import { WriteRejected, cleanUndefined, stripSensitive } from "./firebaseWrite";

const CAREER_LIST_KEYS = [
  "companies",
  "applications",
  "stageHistory",
  "contacts",
  "interactions",
  "interviews",
  "tasks",
  "documents",
  "activity",
  "observations",
] as const;

const ENTRY_KEYS = new Set([
  "id",
  "company",
  "companyName",
  "company_name",
  "role",
  "title",
  "jobTitle",
  "job_title",
  "status",
  "stage",
  "stageId",
  "appliedAt",
  "applied_at",
  "dateApplied",
  "date_applied",
  "applied",
  "link",
  "url",
  "jobUrl",
  "job_url",
  "location",
  "salary",
  "salaryMin",
  "salary_min",
  "salaryMax",
  "salary_max",
  "salaryCurrency",
  "salary_currency",
  "salaryPeriod",
  "salary_period",
  "notes",
  "description",
  "source",
  "priority",
  "workArrangement",
  "work_arrangement",
  "arrangement",
  "employmentType",
  "employment_type",
  "nextAction",
  "next_action",
  "nextActionDueAt",
  "next_action_due_at",
  "rejectionReason",
  "offerDetails",
]);

const STAGE_ALIASES: Record<string, CareerStageId> = {
  wishlist: "saved",
  interested: "saved",
  submitted: "applied",
  oa: "assessment",
  "online assessment": "assessment",
  "take home": "assessment",
  "take-home": "assessment",
  recruiter: "recruiter_screening",
  "recruiter screen": "recruiter_screening",
  "phone screen": "recruiter_screening",
  screening: "recruiter_screening",
  "hiring manager": "hiring_manager",
  interview: "hiring_manager",
  interviewing: "hiring_manager",
  "technical interview": "technical",
  "tech screen": "technical",
  coding: "technical",
  onsite: "final",
  "on-site": "final",
  "on site": "final",
  "final round": "final",
  "final interview": "final",
  "offer received": "offer",
  "offer accepted": "accepted",
  rejection: "rejected",
  declined: "rejected",
  withdrew: "withdrawn",
};

const PRIORITIES = new Set<ApplicationPriority>(["high", "medium", "low"]);
const ARRANGEMENTS = new Set<WorkArrangement>(["remote", "hybrid", "onsite", "unknown"]);
const EMPLOYMENT = new Set<EmploymentType>(["full_time", "part_time", "contract", "internship", "other"]);
const SALARY_PERIODS = new Set<SalaryPeriod>(["year", "month", "hour", "total"]);

export type CareerEntryFields = {
  id?: string;
  jobTitle?: string;
  companyName?: string;
  jobUrl?: string;
  location?: string;
  workArrangement?: WorkArrangement;
  employmentType?: EmploymentType;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: SalaryPeriod;
  source?: string;
  appliedAt?: string;
  stageId?: CareerStageId;
  priority?: ApplicationPriority;
  description?: string;
  notes?: string;
  nextAction?: string;
  nextActionDueAt?: string;
  rejectionReason?: string;
  offerDetails?: string;
};

export function careerStageIds(): string {
  return CAREER_STAGES.map((stage) => stage.id).join(", ");
}

/** Map a tracker status onto the app's stageId. Names, ids, and a few common aliases. */
export function parseCareerStage(value: string): CareerStageId | null {
  const raw = value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  if (!raw) return null;
  const underscored = raw.replace(/ /g, "_");
  const byId = CAREER_STAGES.find((stage) => stage.id === underscored);
  if (byId) return byId.id;
  const byName = CAREER_STAGES.find((stage) => stage.name.toLowerCase() === raw);
  if (byName) return byName.id;
  return STAGE_ALIASES[raw] ?? STAGE_ALIASES[underscored] ?? null;
}

export function normalizeJobLink(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  try {
    const url = new URL(trimmed);
    url.hash = "";
    const path = url.pathname.replace(/\/+$/, "");
    return `${url.protocol}//${url.host.toLowerCase()}${path}${url.search}`;
  } catch {
    return trimmed.replace(/\/+$/, "").toLowerCase();
  }
}

function parseDateKey(value: string, field: string): string {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const iso = trimmed.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (iso) return iso[1];
  const us = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) {
    const month = Number(us[1]);
    const day = Number(us[2]);
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      throw new WriteRejected(`${field} is not a real date.`);
    }
    return `${us[3]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  throw new WriteRejected(`${field} must be YYYY-MM-DD.`);
}

function parseMoneyToken(token: string): number | undefined {
  const cleaned = token.trim().toLowerCase().replace(/[$,\s]/g, "");
  if (!cleaned) return undefined;
  const thousands = cleaned.match(/^(\d+(?:\.\d+)?)k$/);
  if (thousands) return Math.round(Number(thousands[1]) * 1000);
  const amount = Number(cleaned);
  if (!Number.isFinite(amount) || amount < 0) return undefined;
  return amount;
}

function parseSalary(value: unknown): { salaryMin?: number; salaryMax?: number } {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return { salaryMin: value };
  if (typeof value !== "string" || !value.trim()) {
    throw new WriteRejected("salary must be a number, like 120000, 120k, or 100000-140000.");
  }
  const parts = value.split(/\s*(?:-|–|—|\bto\b)\s*/i).filter(Boolean);
  if (parts.length === 2) {
    const low = parseMoneyToken(parts[0]);
    const high = parseMoneyToken(parts[1]);
    if (low == null || high == null) {
      throw new WriteRejected("salary must be a number, like 120000, 120k, or 100000-140000.");
    }
    return { salaryMin: Math.min(low, high), salaryMax: Math.max(low, high) };
  }
  const one = parseMoneyToken(value);
  if (one == null) throw new WriteRejected("salary must be a number, like 120000, 120k, or 100000-140000.");
  return { salaryMin: one };
}

function optionalText(value: unknown, field: string): string | undefined {
  if (value == null) return undefined;
  if (typeof value !== "string") throw new WriteRejected(`${field} must be a string.`);
  const trimmed = value.trim();
  return trimmed || undefined;
}

function firstString(raw: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (raw[key] != null && raw[key] !== "") return raw[key];
  }
  for (const key of keys) {
    if (key in raw) return raw[key];
  }
  return undefined;
}

function mentioned(raw: Record<string, unknown>, keys: string[]): boolean {
  return keys.some((key) => key in raw);
}

export function parseCareerEntry(raw: unknown): CareerEntryFields {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new WriteRejected("A career entry must be an object.");
  }
  const input = raw as Record<string, unknown>;
  const unknown = Object.keys(input).filter((key) => !ENTRY_KEYS.has(key));
  if (unknown.length) {
    throw new WriteRejected(`Unknown career field${unknown.length === 1 ? "" : "s"}: ${unknown.join(", ")}.`);
  }

  const fields: CareerEntryFields = {};
  if (typeof input.id === "string" && input.id.trim()) fields.id = input.id.trim();
  else if (input.id != null) throw new WriteRejected("Career entry id must be a string.");

  const title = firstString(input, ["jobTitle", "job_title", "role", "title"]);
  if (mentioned(input, ["jobTitle", "job_title", "role", "title"])) {
    if (typeof title !== "string" || !title.trim()) throw new WriteRejected("role / jobTitle must be a non-empty string.");
    fields.jobTitle = title.trim();
  }

  const company = firstString(input, ["companyName", "company_name", "company"]);
  if (mentioned(input, ["companyName", "company_name", "company"])) {
    if (typeof company !== "string" || !company.trim()) throw new WriteRejected("company must be a non-empty string.");
    fields.companyName = company.trim();
  }

  if (mentioned(input, ["jobUrl", "job_url", "link", "url"])) {
    fields.jobUrl = optionalText(firstString(input, ["jobUrl", "job_url", "link", "url"]), "link");
  }
  if ("location" in input) fields.location = optionalText(input.location, "location");
  if ("notes" in input) fields.notes = optionalText(input.notes, "notes");
  if ("description" in input) fields.description = optionalText(input.description, "description");
  if ("source" in input) fields.source = optionalText(input.source, "source");
  if ("rejectionReason" in input) fields.rejectionReason = optionalText(input.rejectionReason, "rejectionReason");
  if ("offerDetails" in input) fields.offerDetails = optionalText(input.offerDetails, "offerDetails");
  if (mentioned(input, ["nextAction", "next_action"])) {
    fields.nextAction = optionalText(firstString(input, ["nextAction", "next_action"]), "nextAction");
  }

  const applied = firstString(input, ["appliedAt", "applied_at", "dateApplied", "date_applied", "applied"]);
  if (mentioned(input, ["appliedAt", "applied_at", "dateApplied", "date_applied", "applied"])) {
    if (applied == null || applied === "") fields.appliedAt = undefined;
    else if (typeof applied !== "string") throw new WriteRejected("date applied must be YYYY-MM-DD.");
    else fields.appliedAt = parseDateKey(applied, "date applied");
  }

  const due = firstString(input, ["nextActionDueAt", "next_action_due_at"]);
  if (mentioned(input, ["nextActionDueAt", "next_action_due_at"])) {
    if (due == null || due === "") fields.nextActionDueAt = undefined;
    else if (typeof due !== "string") throw new WriteRejected("nextActionDueAt must be YYYY-MM-DD.");
    else fields.nextActionDueAt = parseDateKey(due, "nextActionDueAt");
  }

  const status = firstString(input, ["stageId", "stage", "status"]);
  if (mentioned(input, ["stageId", "stage", "status"])) {
    if (typeof status !== "string" || !status.trim()) throw new WriteRejected("status must be a career stage.");
    const stageId = parseCareerStage(status);
    if (!stageId) {
      throw new WriteRejected(`Unknown status "${status}". Use one of: ${careerStageIds()}.`);
    }
    fields.stageId = stageId;
  }

  if ("priority" in input && input.priority != null && input.priority !== "") {
    if (typeof input.priority !== "string") throw new WriteRejected("priority must be high, medium, or low.");
    const priority = input.priority.trim().toLowerCase() as ApplicationPriority;
    if (!PRIORITIES.has(priority)) throw new WriteRejected("priority must be high, medium, or low.");
    fields.priority = priority;
  }

  const arrangement = firstString(input, ["workArrangement", "work_arrangement", "arrangement"]);
  if (mentioned(input, ["workArrangement", "work_arrangement", "arrangement"])) {
    if (arrangement == null || arrangement === "" || arrangement === "unknown") {
      fields.workArrangement = undefined;
    } else if (typeof arrangement !== "string") {
      throw new WriteRejected("workArrangement must be remote, hybrid, or onsite.");
    } else {
      const key = arrangement.trim().toLowerCase().replace(/[\s-]+/g, "_").replace("in_office", "onsite");
      const normalized = (key === "on_site" ? "onsite" : key) as WorkArrangement;
      if (!ARRANGEMENTS.has(normalized) || normalized === "unknown") {
        throw new WriteRejected("workArrangement must be remote, hybrid, or onsite.");
      }
      fields.workArrangement = normalized;
    }
  }

  const employment = firstString(input, ["employmentType", "employment_type"]);
  if (mentioned(input, ["employmentType", "employment_type"])) {
    if (employment == null || employment === "") fields.employmentType = undefined;
    else if (typeof employment !== "string") throw new WriteRejected("employmentType is invalid.");
    else {
      const key = employment.trim().toLowerCase().replace(/[\s-]+/g, "_").replace(/^intern$/, "internship") as EmploymentType;
      if (!EMPLOYMENT.has(key)) {
        throw new WriteRejected("employmentType must be full_time, part_time, contract, internship, or other.");
      }
      fields.employmentType = key;
    }
  }

  const period = firstString(input, ["salaryPeriod", "salary_period"]);
  if (mentioned(input, ["salaryPeriod", "salary_period"])) {
    if (period == null || period === "") fields.salaryPeriod = undefined;
    else if (typeof period !== "string") throw new WriteRejected("salaryPeriod is invalid.");
    else {
      const key = period.trim().toLowerCase().replace(/[\s-]+/g, "_");
      const mapped = (key === "yearly" || key === "annual" ? "year" : key === "hourly" ? "hour" : key === "monthly" ? "month" : key) as SalaryPeriod;
      if (!SALARY_PERIODS.has(mapped)) throw new WriteRejected("salaryPeriod must be year, month, hour, or total.");
      fields.salaryPeriod = mapped;
    }
  }

  if ("salaryCurrency" in input || "salary_currency" in input) {
    fields.salaryCurrency = optionalText(firstString(input, ["salaryCurrency", "salary_currency"]), "salaryCurrency");
  }

  const explicitMin = "salaryMin" in input || "salary_min" in input;
  const explicitMax = "salaryMax" in input || "salary_max" in input;
  if (explicitMin || explicitMax) {
    if (explicitMin) fields.salaryMin = optionalNumber(firstString(input, ["salaryMin", "salary_min"]), "salaryMin");
    if (explicitMax) fields.salaryMax = optionalNumber(firstString(input, ["salaryMax", "salary_max"]), "salaryMax");
  } else if ("salary" in input && input.salary != null && input.salary !== "") {
    const parsed = parseSalary(input.salary);
    fields.salaryMin = parsed.salaryMin;
    if (parsed.salaryMax != null) fields.salaryMax = parsed.salaryMax;
  }

  return fields;
}

function optionalNumber(value: unknown, field: string): number | undefined {
  if (value == null || value === "") return undefined;
  const amount = typeof value === "number" ? value : typeof value === "string" ? parseMoneyToken(value) : undefined;
  if (amount == null || !Number.isFinite(amount) || amount < 0) throw new WriteRejected(`${field} must be a non-negative number.`);
  return amount;
}

export function findCareerMatch(
  hub: CareerHub,
  fields: Pick<CareerEntryFields, "companyName" | "jobTitle" | "jobUrl">,
): { application: CareerApplication; matchedBy: "link" | "company_role" } | undefined {
  const link = normalizeJobLink(fields.jobUrl);
  if (link) {
    const byLink = hub.applications.find((app) => normalizeJobLink(app.jobUrl) === link);
    if (byLink) return { application: byLink, matchedBy: "link" };
  }
  if (fields.companyName && fields.jobTitle) {
    const company = fields.companyName.trim().toLowerCase();
    const role = fields.jobTitle.trim().toLowerCase();
    const byRole = hub.applications.find(
      (app) =>
        app.jobTitle.trim().toLowerCase() === role &&
        companyName(hub, app.companyId).trim().toLowerCase() === company,
    );
    if (byRole) return { application: byRole, matchedBy: "company_role" };
  }
  return undefined;
}

function hasMutableCareerField(fields: CareerEntryFields): boolean {
  return Object.keys(fields).some((key) => key !== "id");
}

function blankToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function sameText(current: string | undefined, next: string | undefined): boolean {
  return (current?.trim() || undefined) === (next?.trim() || undefined);
}

export type CareerWriteResult = {
  hub: CareerHub;
  changed: boolean;
  action: "created" | "updated" | "unchanged";
  matchedBy?: "id" | "link" | "company_role";
  application: CareerApplication;
};

function failHub(message: string): { error: string } {
  return { error: message };
}

function isHub(value: CareerHub | { error: string }): value is CareerHub {
  return !("error" in value);
}

/**
 * Create or update one application using the same helpers the Career UI uses
 * (`createApplication`, `updateApplication`, `moveApplicationStage`).
 */
export function applyCareerEntry(
  hub: CareerHub,
  fields: CareerEntryFields,
  mode: "create" | "update" | "import",
): CareerWriteResult | { error: string } {
  const match = fields.id
    ? hub.applications.find((app) => app.id === fields.id)
    : undefined;
  if (fields.id && !match && mode !== "create") return failHub(`No career application with id ${fields.id}.`);

  const found = match
    ? { application: match, matchedBy: "id" as const }
    : findCareerMatch(hub, fields);

  if (mode === "create") {
    if (found) {
      return failHub(
        `An application already exists for this ${found.matchedBy === "link" ? "link" : "company and role"} (${found.application.id}). Use update_career_entry or bulk_import_career.`,
      );
    }
    if (!fields.jobTitle) return failHub("role / jobTitle is required.");
    if (!fields.companyName) return failHub("company is required.");
    return createFromFields(hub, fields);
  }

  if (mode === "update" && !hasMutableCareerField(fields)) {
    return failHub("update_career_entry requires at least one field to change.");
  }

  if (!found) {
    if (mode === "import") {
      if (!fields.jobTitle) return failHub("role / jobTitle is required.");
      if (!fields.companyName) return failHub("company is required.");
      return createFromFields(hub, fields);
    }
    return failHub("No matching career application. Pass id, or company + role, or link.");
  }

  return updateFromFields(hub, found.application, fields, found.matchedBy);
}

function createFromFields(hub: CareerHub, fields: CareerEntryFields): CareerWriteResult | { error: string } {
  const before = new Set(hub.applications.map((app) => app.id));
  const stageId = fields.stageId ?? (fields.appliedAt ? "applied" : "saved");
  const created = createApplication(hub, {
    jobTitle: fields.jobTitle!,
    companyName: fields.companyName!,
    jobUrl: fields.jobUrl,
    location: fields.location,
    workArrangement: fields.workArrangement,
    employmentType: fields.employmentType,
    salaryMin: fields.salaryMin,
    salaryMax: fields.salaryMax,
    salaryCurrency: fields.salaryCurrency,
    salaryPeriod: fields.salaryPeriod,
    source: fields.source,
    appliedAt: fields.appliedAt,
    stageId,
    priority: fields.priority,
    description: fields.description,
    notes: fields.notes,
    nextAction: fields.nextAction,
    nextActionDueAt: fields.nextActionDueAt,
  });
  if (!isHub(created)) return created;
  let next = created;
  const application = next.applications.find((app) => !before.has(app.id));
  if (!application) return failHub("Career application was not created.");
  if (fields.rejectionReason || fields.offerDetails) {
    const patched = updateApplication(next, application.id, {
      rejectionReason: fields.rejectionReason,
      offerDetails: fields.offerDetails,
    });
    if (!isHub(patched)) return patched;
    next = patched;
  }
  const stored = next.applications.find((app) => app.id === application.id)!;
  return { hub: next, changed: true, action: "created", application: stored };
}

function updateFromFields(
  hub: CareerHub,
  current: CareerApplication,
  fields: CareerEntryFields,
  matchedBy: "id" | "link" | "company_role",
): CareerWriteResult | { error: string } {
  let next = hub;
  const patch: Partial<CareerApplication> = {};

  if (fields.companyName && fields.companyName.trim().toLowerCase() !== companyName(hub, current.companyId).trim().toLowerCase()) {
    const ensured = ensureCompany(next, fields.companyName);
    next = ensured.hub;
    if (ensured.company.id !== current.companyId) patch.companyId = ensured.company.id;
  }
  if (fields.jobTitle && fields.jobTitle.trim() !== current.jobTitle.trim()) patch.jobTitle = fields.jobTitle.trim();
  if ("jobUrl" in fields && !sameText(current.jobUrl, fields.jobUrl)) patch.jobUrl = blankToUndefined(fields.jobUrl);
  if ("location" in fields && !sameText(current.location, fields.location)) patch.location = blankToUndefined(fields.location);
  if ("workArrangement" in fields && current.workArrangement !== fields.workArrangement) patch.workArrangement = fields.workArrangement;
  if ("employmentType" in fields && current.employmentType !== fields.employmentType) patch.employmentType = fields.employmentType;
  if ("salaryMin" in fields && current.salaryMin !== fields.salaryMin) patch.salaryMin = fields.salaryMin;
  if ("salaryMax" in fields && current.salaryMax !== fields.salaryMax) patch.salaryMax = fields.salaryMax;
  if ("salaryCurrency" in fields && !sameText(current.salaryCurrency, fields.salaryCurrency)) {
    patch.salaryCurrency = blankToUndefined(fields.salaryCurrency);
  }
  if ("salaryPeriod" in fields && current.salaryPeriod !== fields.salaryPeriod) patch.salaryPeriod = fields.salaryPeriod;
  if ("source" in fields && !sameText(current.source, fields.source)) patch.source = blankToUndefined(fields.source);
  if ("appliedAt" in fields && !sameText(current.appliedAt, fields.appliedAt)) patch.appliedAt = blankToUndefined(fields.appliedAt);
  if ("priority" in fields && (current.priority || "medium") !== fields.priority) patch.priority = fields.priority;
  if ("description" in fields && !sameText(current.description, fields.description)) patch.description = blankToUndefined(fields.description);
  if ("notes" in fields && !sameText(current.notes, fields.notes)) patch.notes = blankToUndefined(fields.notes);
  if ("nextAction" in fields && !sameText(current.nextAction, fields.nextAction)) patch.nextAction = blankToUndefined(fields.nextAction);
  if ("nextActionDueAt" in fields && !sameText(current.nextActionDueAt, fields.nextActionDueAt)) {
    patch.nextActionDueAt = blankToUndefined(fields.nextActionDueAt);
  }
  if ("rejectionReason" in fields && !sameText(current.rejectionReason, fields.rejectionReason)) {
    patch.rejectionReason = blankToUndefined(fields.rejectionReason);
  }
  if ("offerDetails" in fields && !sameText(current.offerDetails, fields.offerDetails)) {
    patch.offerDetails = blankToUndefined(fields.offerDetails);
  }

  const stageChanges = Boolean(fields.stageId && fields.stageId !== current.stageId);
  if (Object.keys(patch).length === 0 && !stageChanges) {
    return { hub, changed: false, action: "unchanged", matchedBy, application: current };
  }

  if (Object.keys(patch).length) {
    const updated = updateApplication(next, current.id, patch);
    if (!isHub(updated)) return updated;
    next = updated;
  }
  if (stageChanges && fields.stageId) {
    const moved = moveApplicationStage(next, current.id, fields.stageId);
    if (!isHub(moved)) return moved;
    next = moved;
  }
  const application = next.applications.find((app) => app.id === current.id);
  if (!application) return failHub("Career application disappeared during update.");
  return { hub: next, changed: true, action: "updated", matchedBy, application };
}

export type CareerBulkSummary = {
  hub: CareerHub;
  changed: boolean;
  created: number;
  updated: number;
  unchanged: number;
  failed: Array<{ index: number; message: string }>;
  entries: Array<{
    index: number;
    action: "created" | "updated" | "unchanged";
    matchedBy?: "id" | "link" | "company_role";
    id: string;
    company: string;
    jobTitle: string;
    stageId: CareerStageId;
    appliedAt?: string;
    jobUrl?: string;
  }>;
};

export function bulkUpsertCareer(hub: CareerHub, rows: unknown[]): CareerBulkSummary {
  if (!Array.isArray(rows)) throw new WriteRejected("bulk_import_career requires entries to be an array.");
  if (rows.length === 0) throw new WriteRejected("bulk_import_career entries is empty.");
  if (rows.length > 500) {
    throw new WriteRejected("bulk_import_career accepts at most 500 entries per call. Split the tracker into batches.");
  }
  let next = hub;
  let changed = false;
  let created = 0;
  let updated = 0;
  let unchanged = 0;
  const failed: CareerBulkSummary["failed"] = [];
  const entries: CareerBulkSummary["entries"] = [];
  rows.forEach((row, index) => {
    try {
      const fields = parseCareerEntry(row);
      const result = applyCareerEntry(next, fields, "import");
      if ("error" in result) {
        failed.push({ index, message: result.error });
        return;
      }
      next = result.hub;
      if (result.changed) changed = true;
      if (result.action === "created") created += 1;
      else if (result.action === "updated") updated += 1;
      else unchanged += 1;
      entries.push({
        index,
        action: result.action,
        matchedBy: result.matchedBy,
        id: result.application.id,
        company: companyName(result.hub, result.application.companyId),
        jobTitle: result.application.jobTitle,
        stageId: result.application.stageId,
        appliedAt: result.application.appliedAt,
        jobUrl: result.application.jobUrl,
      });
    } catch (error) {
      failed.push({ index, message: error instanceof Error ? error.message : String(error) });
    }
  });
  return { hub: next, changed, created, updated, unchanged, failed, entries };
}

export function loadCareerForWrite(raw: unknown): { hub: CareerHub; rawObject: Record<string, unknown> } {
  if (raw == null) return { hub: normalizeEmpty(), rawObject: {} };
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new WriteRejected("Refusing to write career: the existing Firebase value is not a career hub object.");
  }
  const record = { ...(raw as Record<string, unknown>) };
  for (const key of CAREER_LIST_KEYS) {
    if (record[key] == null) continue;
    const list = coerceFirebaseList(record[key]);
    if (!list) throw new WriteRejected(`Refusing to write career: "${key}" is not a list.`);
    record[key] = list;
  }
  return { hub: normalizeCareerHub(record), rawObject: raw as Record<string, unknown> };
}

function normalizeEmpty(): CareerHub {
  return emptyCareerHub();
}

export function careerHubToWrite(rawObject: Record<string, unknown>, hub: CareerHub): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...rawObject, ...hub };
  for (const key of ["gmail", "outlook", "icloud", "encrypted"]) delete merged[key];
  return cleanUndefined(stripSensitive(merged)) as Record<string, unknown>;
}
