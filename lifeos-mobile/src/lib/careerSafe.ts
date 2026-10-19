/**
 * Launch-safe Career hub bootstrap — never throws.
 * Used by firebase emptyWorkspace / loadWorkspace so a bad Career module
 * cannot crash app start. No static imports of career helpers/types.
 */

const FALLBACK_HUB = {
  version: 1 as const,
  companies: [] as [],
  applications: [] as [],
  stageHistory: [] as [],
  contacts: [] as [],
  interactions: [] as [],
  interviews: [] as [],
  tasks: [] as [],
  documents: [] as [],
  activity: [] as [],
  observations: [] as [],
  settings: { defaultCurrency: "USD", defaultTimezone: "UTC" },
};

export function safeEmptyCareerHub() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("./career/careerTypes") as typeof import("./career/careerTypes");
    return mod.emptyCareerHub();
  } catch (error) {
    console.warn("[LifeOS] emptyCareerHub failed; using fallback", error);
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
}

export function safeNormalizeCareerHub(raw: unknown) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("./career/careerHelpers") as typeof import("./career/careerHelpers");
    return mod.normalizeCareerHub(raw);
  } catch (error) {
    console.warn("[LifeOS] normalizeCareerHub failed; using empty hub", error);
    return safeEmptyCareerHub();
  }
}
