/**
 * Career / Job Seeker OS — shared Firebase blob with web (`users/{uid}/career`).
 *
 * Uses Metro-safe copies under `src/lib/career/` (not `../../../lib/...`) so
 * EAS Update / production bundles never depend on resolving outside projectRoot.
 * Keep those copies in sync with repo-root `lib/career*.ts`.
 *
 * For launch-critical paths, prefer `careerSafe.ts` (never throws on import).
 */

export {
  CAREER_STAGES,
  emptyCareerHub,
  type ApplicationPriority,
  type CareerApplication,
  type CareerHub,
  type CareerStageId,
  type CareerView,
} from "./career/careerTypes";

export {
  companyName,
  createApplication,
  dashboardMetrics,
  deleteApplication,
  filterApplications,
  moveApplicationStage,
  normalizeCareerHub,
  stageLabel,
  type CreateApplicationInput,
} from "./career/careerHelpers";

export { safeEmptyCareerHub, safeNormalizeCareerHub } from "./careerSafe";
