/**
 * Career / Job Seeker OS — shared Firebase blob with web (`users/{uid}/career`).
 * Re-exports pure helpers from the monorepo `lib/` (Metro watches ../lib).
 */

export {
  CAREER_STAGES,
  emptyCareerHub,
  type ApplicationPriority,
  type CareerApplication,
  type CareerHub,
  type CareerStageId,
  type CareerView,
} from "../../../lib/careerTypes";

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
} from "../../../lib/careerHelpers";
