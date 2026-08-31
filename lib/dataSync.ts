import { ref, set, get, onValue, Unsubscribe } from 'firebase/database';
import { getClientDatabase } from './firebase';
import { logger } from './logger';
import { withErrorHandling, retryOperation } from './firebaseErrors';
import { FIREBASE_PATHS } from './constants';
import { parseTasksFromCloud, validateProjects, validateCalendarEvents, validateSettings } from './validation';
import { writeTaskBackup } from './taskBackup';

const listeners: Map<string, Unsubscribe> = new Map();

export function setUserId(userId: string) {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('lifeos-user-id', userId);
  }
}

export function clearUserId() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('lifeos-user-id');
  }
}

export function getUserId(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('lifeos-user-id');
}

function cleanUndefined(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item));
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [key, cleanUndefined(value)])
    );
  }
  return obj;
}

export async function syncDataToFirebase(key: string, data: any) {
  if (!process.env.NEXT_PUBLIC_FIREBASE_DB_URL) return;
  if (typeof window === 'undefined') return; // Don't sync on server

  return withErrorHandling(async () => {
    const database = getClientDatabase();
    if (!database) {
      throw new Error('Database not initialized');
    }

    const userId = getUserId();
    if (!userId) {
      throw new Error('No user ID available');
    }

    const cleanedData = cleanUndefined(data);
    const path = FIREBASE_PATHS[key as keyof typeof FIREBASE_PATHS]?.(userId) || `users/${userId}/${key}`;

    // Retry on network errors
    await retryOperation(
      () => set(ref(database, path), cleanedData),
      3,
      1000
    );

    // Mirror tasks locally so a future bad cloud read can be recovered.
    if (key === 'tasks' && Array.isArray(cleanedData)) {
      writeTaskBackup(userId, cleanedData);
    }

    logger.info(`Synced ${key} to Firebase`);
  }, `syncDataToFirebase[${key}]`);
}

export async function loadDataFromFirebase(key: string) {
  if (!process.env.NEXT_PUBLIC_FIREBASE_DB_URL) return null;
  if (typeof window === 'undefined') return null; // Don't load on server

  return withErrorHandling(async () => {
    const database = getClientDatabase();
    if (!database) throw new Error('Database not initialized');

    const userId = getUserId();
    if (!userId) throw new Error('No user ID available');

    const path = FIREBASE_PATHS[key as keyof typeof FIREBASE_PATHS]?.(userId) || `users/${userId}/${key}`;
    const snapshot = await retryOperation(
      () => get(ref(database, path)),
      3,
      1000
    );

    if (!snapshot.exists()) {
      logger.info(`No data found for ${key}`);
      return null;
    }

    const data = snapshot.val();

    // Validate data based on key
    switch (key) {
      case 'tasks': {
        // Soft-parse + coerce object maps. Never all-or-nothing reject — that
        // used to return null, which the UI treated as "empty" and then wrote
        // [] back to Firebase, wiping the user's list.
        const parsed = parseTasksFromCloud(data);
        if (parsed.invalidShape) {
          logger.warn('Invalid tasks shape from Firebase', { type: typeof data });
          throw new Error('Invalid tasks payload shape');
        }
        if (parsed.dropped > 0) {
          logger.warn(`Dropped ${parsed.dropped} unreadable task(s) from Firebase`);
        }
        logger.info(`Loaded tasks from Firebase (${parsed.data.length})`);
        return parsed.data;
      }
      case 'projects': {
        const validation = validateProjects(data);
        if (!validation.success) {
          logger.warn('Invalid projects data from Firebase', { errors: validation.error.errors });
          return null;
        }
        logger.info('Loaded projects from Firebase');
        return validation.data;
      }
      case 'calendar': {
        const validation = validateCalendarEvents(data);
        if (!validation.success) {
          logger.warn('Invalid calendar data from Firebase', { errors: validation.error.errors });
          return null;
        }
        logger.info('Loaded calendar from Firebase');
        return validation.data;
      }
      case 'settings': {
        const validation = validateSettings(data);
        if (!validation.success) {
          logger.warn('Invalid settings data from Firebase', { errors: validation.error.errors });
          return null;
        }
        logger.info('Loaded settings from Firebase');
        return validation.data;
      }
      default:
        logger.info(`Loaded ${key} from Firebase`);
        return data;
    }
  }, `loadDataFromFirebase[${key}]`);
}

/** Discriminated task load so the UI never confuses "error" with "empty workspace". */
export type TaskCloudLoad =
  | { status: 'ok'; tasks: unknown[] }
  | { status: 'missing' }
  | { status: 'error'; message: string };

export async function loadTasksFromFirebase(): Promise<TaskCloudLoad> {
  if (!process.env.NEXT_PUBLIC_FIREBASE_DB_URL) return { status: 'missing' };
  if (typeof window === 'undefined') return { status: 'missing' };

  try {
    const database = getClientDatabase();
    if (!database) return { status: 'error', message: 'Database not initialized' };

    const userId = getUserId();
    if (!userId) return { status: 'error', message: 'No user ID available' };

    const path = FIREBASE_PATHS.tasks(userId);
    const snapshot = await retryOperation(() => get(ref(database, path)), 3, 1000);

    if (!snapshot.exists()) {
      logger.info('No data found for tasks');
      return { status: 'missing' };
    }

    const parsed = parseTasksFromCloud(snapshot.val());
    if (parsed.invalidShape) {
      return { status: 'error', message: 'Invalid tasks payload shape' };
    }
    if (parsed.dropped > 0) {
      logger.warn(`Dropped ${parsed.dropped} unreadable task(s) from Firebase`);
    }
    return { status: 'ok', tasks: parsed.data };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('loadTasksFromFirebase failed', error instanceof Error ? error : new Error(message));
    return { status: 'error', message };
  }
}

export function listenToFirebaseChanges(key: string, callback: (data: any) => void) {
  if (!process.env.NEXT_PUBLIC_FIREBASE_DB_URL) return () => {};
  if (typeof window === 'undefined') return () => {};

  try {
    const database = getClientDatabase();
    if (!database) {
      console.warn('Firebase database not initialized for listener');
      return () => {};
    }

    console.log(`Setting up listener for ${key}`);

    // Unsubscribe from previous listener if exists
    if (listeners.has(key)) {
      const unsubscribe = listeners.get(key);
      if (unsubscribe) {
        console.log(`Unsubscribing from previous ${key} listener`);
        unsubscribe();
      }
    }

    // Set up real-time listener
    const userId = getUserId();
    if (!userId) return () => {};
    const unsubscribe = onValue(
      ref(database, `users/${userId}/${key}`),
      (snapshot) => {
        try {
          console.log(`Listener fired for ${key}`, snapshot.exists());
          if (snapshot.exists()) {
            const data = snapshot.val();
            console.log(`Received ${key} update:`, data);
            callback(data);
          }
        } catch (err) {
          console.error(`Error processing ${key} update:`, err);
        }
      },
      (error) => {
        console.error(`Firebase listener error for ${key}:`, error);
      }
    );

    listeners.set(key, unsubscribe);
    console.log(`Listener for ${key} set up successfully`);
    return unsubscribe;
  } catch (error) {
    console.error(`Failed to set up listener for ${key}:`, error);
    return () => {};
  }
}

export function stopListeningToFirebaseChanges(key: string) {
  const unsubscribe = listeners.get(key);
  if (unsubscribe) {
    unsubscribe();
    listeners.delete(key);
  }
}

export async function syncAllData(tasks: any, projects: any, events: any, brainItems: any, settings: any, dark: boolean, classes: any[] = [], notes: any[] = [], resources: any[] = [], life: any = null, school: any = null, work: any = null, studyAbroad: any = null) {
  await Promise.all([
    syncDataToFirebase('tasks', tasks),
    syncDataToFirebase('projects', projects),
    syncDataToFirebase('calendar', events),
    syncDataToFirebase('brain', brainItems),
    syncDataToFirebase('settings', settings),
    syncDataToFirebase('dark', dark),
    syncDataToFirebase('classes', classes),
    syncDataToFirebase('notes', notes),
    syncDataToFirebase('resources', resources),
    ...(life ? [syncDataToFirebase('life', life)] : []),
    ...(school ? [syncDataToFirebase('school', school)] : []),
    ...(work ? [syncDataToFirebase('work', work)] : []),
    ...(studyAbroad ? [syncDataToFirebase('studyAbroad', studyAbroad)] : []),
  ]);
}

export async function pullAllDataFromFirebase() {
  if (!process.env.NEXT_PUBLIC_FIREBASE_DB_URL) return null;
  if (typeof window === 'undefined') return null;

  try {
    const [tasks, projects, calendar, brain, settings, dark, classes, notes, resources, life, school, work, timeTracking, studyAbroad] = await Promise.all([
      loadDataFromFirebase('tasks'),
      loadDataFromFirebase('projects'),
      loadDataFromFirebase('calendar'),
      loadDataFromFirebase('brain'),
      loadDataFromFirebase('settings'),
      loadDataFromFirebase('dark'),
      loadDataFromFirebase('classes'),
      loadDataFromFirebase('notes'),
      loadDataFromFirebase('resources'),
      loadDataFromFirebase('life'),
      loadDataFromFirebase('school'),
      loadDataFromFirebase('work'),
      loadDataFromFirebase('timeTracking'),
      loadDataFromFirebase('studyAbroad'),
    ]);

    return { tasks, projects, calendar, brain, settings, dark, classes, notes, resources, life, school, work, timeTracking, studyAbroad };
  } catch (error) {
    console.error('Failed to pull data from Firebase:', error);
    return null;
  }
}
