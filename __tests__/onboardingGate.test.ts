import {
  shouldPersistOnboardingComplete,
  shouldShowOnboarding,
  workspaceLooksLikeReturningUser,
} from '@/lib/onboardingGate';
import { validateSettings } from '@/lib/validation';

const emptyWorkspace = {
  tasks: [] as unknown[],
  projects: [] as unknown[],
  calendar: [] as unknown[],
  classes: [] as unknown[],
  notes: [] as unknown[],
  brain: [] as unknown[],
  notebookHub: { notebooks: [] as unknown[] },
  notebookPages: {},
};

describe('onboarding cold start', () => {
  it('skips onboarding when a persisted auth session has onboardingCompletedAt', () => {
    // Cold start: Firebase Auth restored the user; workspace settings came
    // back from users/{uid}/settings with the completion flag.
    const show = shouldShowOnboarding({
      signedIn: true,
      replay: false,
      settings: { onboardingCompletedAt: '2026-08-01T12:00:00.000Z', onboardingVersion: 1 },
      workspace: emptyWorkspace,
    });
    expect(show).toBe(false);
  });

  it('skips onboarding when the device cache still has the completion flag', () => {
    const show = shouldShowOnboarding({
      signedIn: true,
      replay: false,
      settings: { onboardingVersion: 1 },
      workspace: emptyWorkspace,
      deviceCompletedAt: '2026-08-01T12:00:00.000Z',
    });
    expect(show).toBe(false);
  });

  it('skips onboarding for a returning workspace even if the flag was stripped', () => {
    const workspace = {
      ...emptyWorkspace,
      tasks: [{ id: 1, title: 'Read syllabus' }, { id: 2, title: 'Office hours' }],
      projects: [{ name: 'School' }],
      calendar: [{ title: 'UML first day', start: '2026-09-03T09:00' }],
    };
    expect(workspaceLooksLikeReturningUser(workspace)).toBe(true);
    expect(
      shouldShowOnboarding({
        signedIn: true,
        replay: false,
        settings: { onboardingVersion: 1 },
        workspace,
      }),
    ).toBe(false);
  });

  it('shows onboarding only for a signed-in user with an empty new workspace', () => {
    expect(
      shouldShowOnboarding({
        signedIn: true,
        replay: false,
        settings: {},
        workspace: emptyWorkspace,
      }),
    ).toBe(true);
  });

  it('does not show onboarding when the user is signed out', () => {
    expect(
      shouldShowOnboarding({
        signedIn: false,
        settings: {},
        workspace: emptyWorkspace,
      }),
    ).toBe(false);
  });

  it('shows onboarding when the user explicitly replays the intro', () => {
    expect(
      shouldShowOnboarding({
        signedIn: true,
        replay: true,
        settings: { onboardingCompletedAt: '2026-08-01T12:00:00.000Z' },
        workspace: emptyWorkspace,
      }),
    ).toBe(true);
  });

  it('does not auto-complete mid-flow from a name save alone', () => {
    // OnboardingFlow writes onboardingStartedAt (and historically
    // onboardingVersion) on mount so typing a name cannot flip the account to “done”.
    expect(
      shouldShowOnboarding({
        signedIn: true,
        settings: { preferredName: 'Sam', onboardingVersion: 1 },
        workspace: emptyWorkspace,
      }),
    ).toBe(true);
    expect(
      shouldShowOnboarding({
        signedIn: true,
        settings: { preferredName: 'Sam', onboardingStartedAt: '2026-08-29T12:00:00.000Z' },
        workspace: emptyWorkspace,
      }),
    ).toBe(true);
  });

  it('skips for a legacy named account that never had the mobile flow', () => {
    expect(
      shouldShowOnboarding({
        signedIn: true,
        settings: { preferredName: 'Sam' },
        workspace: emptyWorkspace,
      }),
    ).toBe(false);
  });

  it('persists a missing completion flag for a returning workspace', () => {
    expect(
      shouldPersistOnboardingComplete({
        settings: {},
        workspace: {
          ...emptyWorkspace,
          calendar: [{ title: 'UML first day' }],
        },
      }),
    ).toBe(true);
  });
});

describe('validateSettings onboarding fields', () => {
  it('keeps onboardingCompletedAt so a web settings write cannot wipe it', () => {
    const result = validateSettings({
      accent: '#625af6',
      preferredName: 'Sam',
      onboardingCompletedAt: '2026-08-01T12:00:00.000Z',
      onboardingVersion: 1,
      themeMode: 'dark',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.onboardingCompletedAt).toBe('2026-08-01T12:00:00.000Z');
      expect(result.data.onboardingVersion).toBe(1);
      expect((result.data as { themeMode?: string }).themeMode).toBe('dark');
    }
  });
});
