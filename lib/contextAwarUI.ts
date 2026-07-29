import type { OperatingContext } from '@/lib/contextArchitecture';

export type QuickCaptureOption = {
  icon: string;
  label: string;
  action: string;
  description?: string;
};

export type ContextAwareConfig = {
  quickCaptureOptions: QuickCaptureOption[];
  heroGreeting: string;
  statusSectionLabel: string;
  projectsLabel: string;
  emptyStateMessage: string;
  aiPersonality: string;
  defaultFocusGoal: string;
};

export function getContextAwareConfig(context: OperatingContext): ContextAwareConfig {
  const configs: Record<OperatingContext, ContextAwareConfig> = {
    Work: {
      quickCaptureOptions: [
        { icon: '✓', label: 'Task', action: 'task', description: 'New career task' },
        { icon: '📞', label: 'Meeting', action: 'meeting', description: 'Schedule & follow-up' },
        { icon: '🐛', label: 'Bug', action: 'bug', description: 'Technical issue' },
        { icon: '💡', label: 'Idea', action: 'idea', description: 'Job lead or project' },
        { icon: '📝', label: 'Note', action: 'note', description: 'Research or prep' },
      ],
      heroGreeting: 'Stay focused on what moves work forward.',
      statusSectionLabel: 'What needs your attention',
      projectsLabel: 'Active projects',
      emptyStateMessage: 'Create a project to organize your work.',
      aiPersonality: 'work-assistant',
      defaultFocusGoal: 'Make progress on my top priority',
    },

    School: {
      quickCaptureOptions: [
        { icon: '✓', label: 'Assignment', action: 'task', description: 'New homework' },
        { icon: '📚', label: 'Lecture', action: 'lecture', description: 'Exam or reading' },
        { icon: '🔍', label: 'Research', action: 'research', description: 'Project research' },
        { icon: '❓', label: 'Question', action: 'question', description: 'Ask instructor' },
        { icon: '📝', label: 'Note', action: 'note', description: 'Class notes' },
      ],
      heroGreeting: 'Make progress on your coursework.',
      statusSectionLabel: 'This week's assignments',
      projectsLabel: 'Active courses',
      emptyStateMessage: 'Create a course to organize your studies.',
      aiPersonality: 'study-partner',
      defaultFocusGoal: 'Complete my assignment',
    },

    Life: {
      quickCaptureOptions: [
        { icon: '✓', label: 'Task', action: 'task', description: 'Personal goal' },
        { icon: '❤️', label: 'Workout', action: 'workout', description: 'Log exercise' },
        { icon: '🍽️', label: 'Meal', action: 'meal', description: 'Plan meal' },
        { icon: '😊', label: 'Mood', action: 'mood', description: 'Log how you feel' },
        { icon: '📝', label: 'Note', action: 'note', description: 'Life reflection' },
      ],
      heroGreeting: 'Keep life moving without turning it into admin.',
      statusSectionLabel: 'Today's wellness',
      projectsLabel: 'Personal projects',
      emptyStateMessage: 'Create a personal project to organize your life.',
      aiPersonality: 'life-coach',
      defaultFocusGoal: 'Take care of myself',
    },

    Photography: {
      quickCaptureOptions: [
        { icon: '📸', label: 'Shoot', action: 'shoot', description: 'Log shoot' },
        { icon: '📍', label: 'Location', action: 'location', description: 'Scout location' },
        { icon: '✏️', label: 'Editing', action: 'editing', description: 'Editing note' },
        { icon: '⚙️', label: 'Gear', action: 'gear', description: 'Equipment note' },
        { icon: '💫', label: 'Inspiration', action: 'inspiration', description: 'Visual ref' },
      ],
      heroGreeting: 'Create work you are proud of.',
      statusSectionLabel: 'Upcoming shoots',
      projectsLabel: 'Active projects',
      emptyStateMessage: 'Create a project to organize your shoots.',
      aiPersonality: 'creative-director',
      defaultFocusGoal: 'Create powerful images',
    },

    Travel: {
      quickCaptureOptions: [
        { icon: '✓', label: 'Task', action: 'task', description: 'Trip to-do' },
        { icon: '📍', label: 'Place', action: 'place', description: 'Interesting spot' },
        { icon: '🍽️', label: 'Restaurant', action: 'restaurant', description: 'Place to eat' },
        { icon: '💫', label: 'Experience', action: 'experience', description: 'Activity' },
        { icon: '📝', label: 'Note', action: 'note', description: 'Trip memory' },
      ],
      heroGreeting: 'Make the most of your journey.',
      statusSectionLabel: 'Trip details',
      projectsLabel: 'Active trips',
      emptyStateMessage: 'Create a trip to plan your journey.',
      aiPersonality: 'travel-guide',
      defaultFocusGoal: 'Explore with intention',
    },

    Health: {
      quickCaptureOptions: [
        { icon: '❤️', label: 'Workout', action: 'workout', description: 'Log exercise' },
        { icon: '🥗', label: 'Meal', action: 'meal', description: 'Track nutrition' },
        { icon: '😴', label: 'Sleep', action: 'sleep', description: 'Log sleep' },
        { icon: '😊', label: 'Mood', action: 'mood', description: 'Mental health' },
        { icon: '💊', label: 'Medication', action: 'medication', description: 'Log intake' },
      ],
      heroGreeting: 'Keep your health a priority.',
      statusSectionLabel: 'Today's health',
      projectsLabel: 'Health goals',
      emptyStateMessage: 'Create a health goal to track your progress.',
      aiPersonality: 'wellness-coach',
      defaultFocusGoal: 'Improve my health',
    },

    'Study Abroad': {
      quickCaptureOptions: [
        { icon: '🏫', label: 'Program', action: 'program', description: 'Research program' },
        { icon: '📋', label: 'Application', action: 'application', description: 'App task' },
        { icon: '💰', label: 'Scholarship', action: 'scholarship', description: 'Funding lead' },
        { icon: '📄', label: 'Document', action: 'document', description: 'Required doc' },
        { icon: '📝', label: 'Note', action: 'note', description: 'Research note' },
      ],
      heroGreeting: 'Make your study abroad journey real.',
      statusSectionLabel: 'Application status',
      projectsLabel: 'Universities',
      emptyStateMessage: 'Add a university to start exploring.',
      aiPersonality: 'study-advisor',
      defaultFocusGoal: 'Advance my applications',
    },
  };

  return configs[context];
}

export function searchContextAware(
  query: string,
  context: OperatingContext,
  allResults: Array<{ type: string; label: string; value: any }>,
): typeof allResults {
  if (!query) return allResults;

  // Prioritize current context results
  const contextResults = allResults.filter(r => r.type.toLowerCase().includes(context.toLowerCase()));
  const otherResults = allResults.filter(r => !r.type.toLowerCase().includes(context.toLowerCase()));

  const matchQuery = (result: typeof allResults[0]) =>
    `${result.label} ${JSON.stringify(result.value)}`.toLowerCase().includes(query.toLowerCase());

  return [
    ...contextResults.filter(matchQuery),
    ...otherResults.filter(matchQuery),
  ];
}
