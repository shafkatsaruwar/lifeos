"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  Briefcase,
  CalendarDays,
  Check,
  Command,
  Focus,
  GraduationCap,
  Home,
  Sparkles,
  Target,
} from "lucide-react";

export const PREAUTH_ONBOARDING_KEY = "lifeos-preauth-onboarding-v1";

type StepId = "welcome" | "spaces" | "rhythm";

const STEPS: Array<{
  id: StepId;
  eyebrow: string;
  title: string;
  body: string;
}> = [
  {
    id: "welcome",
    eyebrow: "Welcome",
    title: "Set your focus for the week!",
    body: "LifeOS keeps priorities, school, and deep work in one calm place — so you decide what gets attention.",
  },
  {
    id: "spaces",
    eyebrow: "Start simple",
    title: "What are you building this month?",
    body: "New accounts begin with Life and School. Turn on Work and more later when you need them.",
  },
  {
    id: "rhythm",
    eyebrow: "Daily rhythm",
    title: "What are you working on this week?",
    body: "Capture with /t, run focus sessions, and keep classes linked to today — without juggling five apps.",
  },
];

const SPACE_CHIPS = [
  { id: "life", label: "Life", icon: Home },
  { id: "school", label: "School", icon: GraduationCap },
  { id: "work", label: "Work", icon: Briefcase },
  { id: "career", label: "Career", icon: Target },
  { id: "focus", label: "Focus", icon: Focus },
] as const;

const RHYTHM_CHIPS = [
  { id: "task", label: "Add a task", icon: Check },
  { id: "focus", label: "Start focus", icon: Focus },
  { id: "plan", label: "Plan today", icon: CalendarDays },
  { id: "cmd", label: "Capture /t", icon: Command },
  { id: "ai", label: "Ask Copilot", icon: Sparkles },
  { id: "class", label: "Link a class", icon: BookOpen },
] as const;

type Props = {
  onFinished: () => void;
};

export function hasCompletedPreAuthOnboarding(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(PREAUTH_ONBOARDING_KEY) === "1";
  } catch {
    return false;
  }
}

export function markPreAuthOnboardingComplete(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREAUTH_ONBOARDING_KEY, "1");
  } catch {
    // ignore
  }
}

function IllusWelcome() {
  return (
    <svg className="ob-illus" viewBox="0 0 280 280" fill="none" aria-hidden>
      <circle cx="140" cy="150" r="78" stroke="currentColor" strokeWidth="3" />
      <path
        d="M96 168c12-28 28-42 44-42s32 14 44 42"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="140" cy="112" r="22" stroke="currentColor" strokeWidth="3" />
      <path d="M70 214h140" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <rect x="88" y="190" width="104" height="14" rx="4" stroke="currentColor" strokeWidth="3" />
      <path d="M118 78c8-18 22-28 36-28" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="160" cy="48" r="8" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

function IllusSpaces() {
  return (
    <svg className="ob-illus" viewBox="0 0 280 280" fill="none" aria-hidden>
      <rect x="48" y="72" width="72" height="96" rx="10" stroke="currentColor" strokeWidth="3" />
      <rect x="104" y="56" width="72" height="112" rx="10" stroke="currentColor" strokeWidth="3" />
      <rect x="160" y="88" width="72" height="80" rx="10" stroke="currentColor" strokeWidth="3" />
      <path d="M72 200h136" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="96" cy="112" r="10" stroke="currentColor" strokeWidth="3" />
      <circle cx="140" cy="100" r="10" stroke="currentColor" strokeWidth="3" />
      <circle cx="196" cy="124" r="10" stroke="currentColor" strokeWidth="3" />
      <path d="M86 140h36M130 128h36M186 152h36" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function IllusRhythm() {
  return (
    <svg className="ob-illus" viewBox="0 0 280 280" fill="none" aria-hidden>
      <circle cx="110" cy="150" r="46" stroke="currentColor" strokeWidth="3" />
      <circle cx="178" cy="150" r="46" stroke="currentColor" strokeWidth="3" />
      <circle cx="110" cy="128" r="14" stroke="currentColor" strokeWidth="3" />
      <circle cx="178" cy="128" r="14" stroke="currentColor" strokeWidth="3" />
      <path
        d="M86 176c10-16 22-24 34-24s24 8 34 24M154 176c10-16 22-24 34-24s24 8 34 24"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M92 210c18 18 78 18 96 0" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M140 78v28M140 64l-10 10M140 64l10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function StepVisual({ id }: { id: StepId }) {
  if (id === "spaces") return <IllusSpaces />;
  if (id === "rhythm") return <IllusRhythm />;
  return <IllusWelcome />;
}

/** Intro shown once before the Google sign-in screen. */
export function PreAuthOnboarding({ onFinished }: Props) {
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [selectedSpaces, setSelectedSpaces] = useState<string[]>(["life", "school"]);
  const [selectedRhythm, setSelectedRhythm] = useState<string[]>(["task", "focus"]);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  useEffect(() => {
    setReady(true);
  }, []);

  const finish = () => {
    markPreAuthOnboardingComplete();
    onFinished();
  };

  const next = () => {
    if (isLast) finish();
    else setStep((value) => value + 1);
  };

  const toggleChip = (list: string[], id: string, setList: (next: string[]) => void) => {
    setList(list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);
  };

  if (!ready) {
    return (
      <div className="ob-shell" aria-busy="true">
        <div className="ob-card">
          <div className="ob-brand">LifeOS</div>
        </div>
      </div>
    );
  }

  return (
    <div className="ob-shell">
      <div className="ob-card" data-testid="preauth-onboarding">
        <div className="ob-visual" aria-hidden>
          <StepVisual id={current.id} />
        </div>

        <div className="ob-panel">
          <div className="ob-brand">LifeOS</div>
          <p className="ob-eyebrow">
            Step {step + 1} of {STEPS.length} · {current.eyebrow}
          </p>
          <h1 className="ob-title">{current.title}</h1>
          <p className="ob-body">{current.body}</p>

          {current.id === "spaces" ? (
            <div className="ob-chips" role="group" aria-label="Starting spaces">
              {SPACE_CHIPS.map(({ id, label, icon: Icon }) => {
                const selected = selectedSpaces.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    className={selected ? "ob-chip selected" : "ob-chip"}
                    aria-pressed={selected}
                    onClick={() => toggleChip(selectedSpaces, id, setSelectedSpaces)}
                  >
                    <Icon size={16} aria-hidden />
                    {label}
                  </button>
                );
              })}
            </div>
          ) : null}

          {current.id === "rhythm" ? (
            <div className="ob-chips" role="group" aria-label="Weekly habits">
              {RHYTHM_CHIPS.map(({ id, label, icon: Icon }) => {
                const selected = selectedRhythm.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    className={selected ? "ob-chip selected" : "ob-chip"}
                    aria-pressed={selected}
                    onClick={() => toggleChip(selectedRhythm, id, setSelectedRhythm)}
                  >
                    <Icon size={16} aria-hidden />
                    {label}
                  </button>
                );
              })}
            </div>
          ) : null}

          {current.id === "welcome" ? (
            <ul className="ob-checklist">
              <li>
                <span className="ob-check" aria-hidden>
                  <Check size={14} />
                </span>
                Priorities and focus in one Now screen
              </li>
              <li>
                <span className="ob-check" aria-hidden>
                  <Check size={14} />
                </span>
                School and Life stay front and center
              </li>
              <li>
                <span className="ob-check" aria-hidden>
                  <Check size={14} />
                </span>
                Capture fast with /commands
              </li>
            </ul>
          ) : null}

          <div className="ob-dots" role="tablist" aria-label="Onboarding progress">
            {STEPS.map((item, index) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={index === step}
                aria-label={`Step ${index + 1}: ${item.eyebrow}`}
                className={index === step ? "selected" : ""}
                onClick={() => setStep(index)}
              />
            ))}
          </div>

          <div className="ob-actions">
            <button type="button" className="ob-primary" onClick={next}>
              {isLast ? "Continue to sign in" : "Continue"}
            </button>
            <button type="button" className="ob-skip" onClick={finish}>
              {isLast ? "Skip for now" : "I already have an account"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
