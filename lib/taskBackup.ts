import { STORAGE_KEYS } from './constants';
import { coerceFirebaseList } from './validation';
import { logger } from './logger';

const backupKey = (userId: string) => `${STORAGE_KEYS.TASKS}.backup.${userId}`;

function parseStoredList(raw: string | null): unknown[] | null {
  if (!raw) return null;
  try {
    return coerceFirebaseList(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * Local last-known-good tasks mirror so a bad cloud load cannot erase everything.
 * Also checks the pre-Firebase localStorage key in case an older build left data behind.
 */
export function readTaskBackup(userId: string): unknown[] | null {
  if (typeof window === 'undefined') return null;
  try {
    if (userId) {
      const keyed = parseStoredList(window.localStorage.getItem(backupKey(userId)));
      if (keyed?.length) return keyed;
    }
    const legacy = parseStoredList(window.localStorage.getItem(STORAGE_KEYS.TASKS));
    if (legacy?.length) return legacy;
    return null;
  } catch (error) {
    logger.warn('Failed to read task backup', { error });
    return null;
  }
}

export function writeTaskBackup(userId: string, tasks: unknown[]) {
  if (typeof window === 'undefined' || !userId) return;
  try {
    window.localStorage.setItem(backupKey(userId), JSON.stringify(tasks));
  } catch (error) {
    logger.warn('Failed to write task backup', { error });
  }
}

export function clearTaskBackup(userId: string) {
  if (typeof window === 'undefined' || !userId) return;
  try {
    window.localStorage.removeItem(backupKey(userId));
  } catch {
    // ignore
  }
}
