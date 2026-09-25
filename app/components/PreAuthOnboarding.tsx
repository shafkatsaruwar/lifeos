"use client";

import { useEffect, useState } from "react";

export const PREAUTH_ONBOARDING_KEY = "lifeos-preauth-onboarding-v1";

const STEPS = [
  {
    eyebrow: "Welcome",
    title: "Your life, in focus.",
    body: "LifeOS is a calm personal operating system — priorities, school, notes, and deep work in one place.",
  },
  {
    eyebrow: "Start simple",
    title: "Life + School first.",
    body: "New accounts begin with LifeOS and SchoolOS. Turn on Work, Treasury, and more later when you need them.",
  },
  {
    eyebrow: "Daily rhythm",
    title: "Now is your cockpit.",
    body: "Capture with /t, run focus sessions, and keep classes linked to what matters today — without juggling five apps.",
  },
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

/** Intro shown once before the Google sign-in screen. */
export function PreAuthOnboarding({ onFinished }: Props) {
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
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

  if (!ready) {
    return (
      <div className="preauth-shell" aria-busy="true">
        <div className="preauth-card">
          <div className="preauth-brand">LifeOS</div>
        </div>
      </div>
    );
  }

  return (
    <div className="preauth-shell">
      <div className="preauth-card" data-testid="preauth-onboarding">
        <div className="preauth-brand">LifeOS</div>
        <p className="preauth-eyebrow">{current.eyebrow}</p>
        <h1 className="preauth-title">{current.title}</h1>
        <p className="preauth-body">{current.body}</p>

        <div className="preauth-dots" role="tablist" aria-label="Onboarding progress">
          {STEPS.map((item, index) => (
            <button
              key={item.eyebrow}
              type="button"
              role="tab"
              aria-selected={index === step}
              aria-label={`Step ${index + 1}: ${item.eyebrow}`}
              className={index === step ? "selected" : ""}
              onClick={() => setStep(index)}
            />
          ))}
        </div>

        <div className="preauth-actions">
          <button type="button" className="preauth-primary" onClick={next}>
            {isLast ? "Continue to sign in" : "Continue"}
          </button>
          {!isLast ? (
            <button type="button" className="preauth-skip" onClick={finish}>
              I already have an account
            </button>
          ) : (
            <p className="preauth-footnote">Next: create an account or sign in with Google.</p>
          )}
        </div>
      </div>
    </div>
  );
}
