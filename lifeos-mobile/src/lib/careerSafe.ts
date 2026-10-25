/**
 * Launch-safe Career hub bootstrap — never throws.
 * Used by firebase emptyWorkspace / loadWorkspace so a bad Career module
 * cannot crash app start. No static imports of career helpers/types.
 *
 * When CAREER_IOS_ENABLED is false, never require Career modules at all.
 */
import { CAREER_IOS_ENABLED } from "./careerFlag";
import { CAREER_PAGE_ENABLED } from "./careerPage";

const FALLBACK_HUB = {
  version: 1 as const,
  companies: [] as unknown[],
  applications: [] as unknown[],
  stageHistory: [] as unknown[],
  contacts: [] as unknown[],
  interactions: [] as unknown[],
  interviews: [] as unknown[],
  tasks: [] as unknown[],
  documents: [] as unknown[],
  activity: [] as unknown[],
  observations: [] as unknown[],
  settings: { defaultCurrency: "USD", defaultTimezone: "UTC" },
};

function fallbackHub() {
  return {
    ...FALLBACK_HUB,
    companies: [],
    applications: [],
    stageHistory: [],
    contacts: [],
    interactions: [],
    interviews: [],
    tasks: [],
    documents: [],
    activity: [],
    observations: [],
    settings: { ...FALLBACK_HUB.settings },
  };
}

export function safeEmptyCareerHub() {
  if (!CAREER_IOS_ENABLED) return fallbackHub();
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("./career/careerTypes") as typeof import("./career/careerTypes");
    return mod.emptyCareerHub();
  } catch (error) {
    console.warn("[LifeOS] emptyCareerHub failed; using fallback", error);
    return fallbackHub();
  }
}

/**
 * Real hub data is kept for the read-only Careers page even while the full
 * Career hub is off. The require stays inside try/catch, so a bad module
 * falls back to an empty hub instead of crashing launch.
 */
export function safeNormalizeCareerHub(raw: unknown) {
  if (!CAREER_IOS_ENABLED && !CAREER_PAGE_ENABLED) return fallbackHub();
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("./career/careerHelpers") as typeof import("./career/careerHelpers");
    return mod.normalizeCareerHub(raw);
  } catch (error) {
    console.warn("[LifeOS] normalizeCareerHub failed; using empty hub", error);
    return safeEmptyCareerHub();
  }
}
