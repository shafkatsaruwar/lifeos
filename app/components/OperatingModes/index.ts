/**
 * Operating Modes Components
 * Central export point for all operating mode components
 */

export { OperatingModeLayout } from './OperatingModeLayout';
export { OperatingModeView, type OperatingModeViewProps } from './OperatingModeView';
export { ModeHero } from './ModeHero';
export { QuickActionsBar } from './QuickActionsBar';
export { StatusSection, type StatusAlert } from './StatusSection';
export { AssistantPanel } from './AssistantPanel';
export { ProjectCard, type ProjectCardProps } from './ProjectCard';
export { WorkMode } from './WorkMode';
export { SchoolMode } from './SchoolMode';
export { LifeMode } from './LifeMode';
export { StudyAbroadMode, type University } from './StudyAbroadMode';
export { FocusMode } from './FocusMode';

// Adapters for integrating with existing dashboards
export { WorkModeAdapter, type WorkModeAdapterProps } from './WorkModeAdapter';
export { SchoolModeAdapter, type SchoolModeAdapterProps } from './SchoolModeAdapter';
export { LifeModeAdapter, type LifeModeAdapterProps } from './LifeModeAdapter';
export { StudyAbroadModeAdapter, type StudyAbroadModeAdapterProps } from './StudyAbroadModeAdapter';
