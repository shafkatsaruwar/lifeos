/** COPPA: LifeOS accounts are for users 13+. Gate signup before auth providers run. */

export const MINIMUM_SIGNUP_AGE = 13;

export const AGE_GATE_STORAGE_KEY = "lifeos_age_gate_confirmed_v1";

export const AGE_GATE_LABEL = `I confirm I am ${MINIMUM_SIGNUP_AGE} years of age or older.`;

export const AGE_GATE_BLOCKED_MESSAGE = `LifeOS is not available to users under ${MINIMUM_SIGNUP_AGE}.`;

export function isAgeConfirmed(value: unknown): boolean {
  return value === true;
}

export function readStoredAgeConfirmation(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(AGE_GATE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function persistAgeConfirmation(confirmed: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (confirmed) window.localStorage.setItem(AGE_GATE_STORAGE_KEY, "1");
    else window.localStorage.removeItem(AGE_GATE_STORAGE_KEY);
  } catch {
    // ignore quota / private mode
  }
}
