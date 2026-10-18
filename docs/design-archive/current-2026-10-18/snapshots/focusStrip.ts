/**
 * Now page Focus strip: Home → enabled hubs → Calendar → Tasks
 * (Library replaces the trailing slot when no hubs are enabled).
 */

export type FocusStripHubId =
  | "work"
  | "career"
  | "school"
  | "study-abroad"
  | "treasury"
  | "mastery";

export type FocusStripTileKey =
  | "home"
  | FocusStripHubId
  | "calendar"
  | "tasks"
  | "library";

export type FocusStripFlags = {
  enableWorkOS?: boolean;
  enableCareerOS?: boolean;
  enableSchoolOS?: boolean;
  enableStudyAbroad?: boolean;
  enableTreasuryOS?: boolean;
  enableMasterOS?: boolean;
};

/** Matches sidebar ENVIRONMENTS order (excluding Home). */
const HUB_ORDER: { id: FocusStripHubId; flag: keyof FocusStripFlags }[] = [
  { id: "work", flag: "enableWorkOS" },
  { id: "career", flag: "enableCareerOS" },
  { id: "school", flag: "enableSchoolOS" },
  { id: "study-abroad", flag: "enableStudyAbroad" },
  { id: "treasury", flag: "enableTreasuryOS" },
  { id: "mastery", flag: "enableMasterOS" },
];

export function enabledFocusStripHubs(flags: FocusStripFlags): FocusStripHubId[] {
  return HUB_ORDER.filter(({ flag }) => Boolean(flags[flag])).map(({ id }) => id);
}

export function buildFocusStripKeys(flags: FocusStripFlags): FocusStripTileKey[] {
  const hubs = enabledFocusStripHubs(flags);
  if (hubs.length === 0) return ["home", "calendar", "tasks", "library"];
  return ["home", ...hubs, "calendar", "tasks"];
}
