// Storage & Firebase keys
export const STORAGE_KEYS = {
  USER_ID: 'lifeos-user-id',
  TASKS: 'lifeos.priorities.v1',
  PROJECTS: 'lifeos.projects.v1',
  CALENDAR: 'lifeos.calendar.v1',
  BRAIN: 'lifeos.brain.v1',
  CLASSES: 'lifeos.classes.v1',
  NOTES: 'lifeos.notes.v1',
  RESOURCES: 'lifeos.resources.v1',
  SETTINGS: 'lifeos.settings.v1',
  DARK_MODE: 'lifeos.dark.v1',
} as const;

export const FIREBASE_PATHS = {
  user: (userId: string) => `users/${userId}`,
  tasks: (userId: string) => `users/${userId}/tasks`,
  projects: (userId: string) => `users/${userId}/projects`,
  calendar: (userId: string) => `users/${userId}/calendar`,
  brain: (userId: string) => `users/${userId}/brain`,
  classes: (userId: string) => `users/${userId}/classes`,
  notes: (userId: string) => `users/${userId}/notes`,
  resources: (userId: string) => `users/${userId}/resources`,
  life: (userId: string) => `users/${userId}/life`,
  work: (userId: string) => `users/${userId}/work`,
  settings: (userId: string) => `users/${userId}/settings`,
  dark: (userId: string) => `users/${userId}/dark`,
} as const;

// UI Constants
export const MODAL_DELAY = 200;
export const MIN_FOCUS_MINUTES = 5;
export const MAX_FOCUS_MINUTES = 240;
export const DEFAULT_FOCUS_MINUTES = 45;

// Priority rank map
export const PRIORITY_RANK = {
  High: 0,
  Medium: 1,
  Low: 2,
} as const;

// Energy levels
export const ENERGY_LEVELS = ['Low', 'Medium', 'High'] as const;

// Project icons
export const PROJECT_ICONS = ['Zap', 'Aperture', 'Sparkles', 'FileText', 'UserRound', 'FolderKanban', 'BriefcaseBusiness', 'Camera', 'Code2', 'HeartPulse', 'Utensils', 'BookOpen'] as const;

// Accent colors
export const ACCENT_COLORS = ['#625af6', '#4b8bdc', '#47a47b', '#d99b38', '#e48b6b', '#cf625a'] as const;

// Error messages
export const ERROR_MESSAGES = {
  SYNC_FAILED: 'Failed to sync data. Changes will be saved when you go back online.',
  LOAD_FAILED: 'Failed to load data from the cloud.',
  AUTH_FAILED: 'Authentication failed. Please try again.',
  INVALID_DATA: 'Received invalid data from server.',
  NETWORK_ERROR: 'Network error. Check your connection.',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  SYNCED: 'Data synced successfully',
  SAVED: 'Changes saved',
  DELETED: 'Deleted successfully',
  CREATED: 'Created successfully',
} as const;

// Test user config
export const TEST_USER = {
  ID: 'test-user-dev',
  EMAIL: 'test@localhost',
  DISPLAY_NAME: 'Test User',
} as const;
