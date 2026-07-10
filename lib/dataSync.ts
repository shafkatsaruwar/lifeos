import { ref, set, get, onValue, Unsubscribe } from 'firebase/database';
import { getClientDatabase } from './firebase';

const USER_ID = 'default-user'; // In future, use actual user ID from auth
const listeners: Map<string, Unsubscribe> = new Map();

function cleanUndefined(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item));
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => [key, cleanUndefined(value)])
    );
  }
  return obj;
}

export async function syncDataToFirebase(key: string, data: any) {
  if (!process.env.NEXT_PUBLIC_FIREBASE_DB_URL) return;
  if (typeof window === 'undefined') return; // Don't sync on server
  try {
    const database = getClientDatabase();
    if (!database) {
      console.warn(`Database not initialized for sync ${key}`);
      return;
    }
    const cleanedData = cleanUndefined(data);
    console.log(`Syncing ${key} to Firebase:`, cleanedData);
    await set(ref(database, `users/${USER_ID}/${key}`), cleanedData);
    console.log(`Successfully synced ${key}`);
  } catch (error) {
    console.error(`Failed to sync ${key} to Firebase:`, error);
  }
}

export async function loadDataFromFirebase(key: string) {
  if (!process.env.NEXT_PUBLIC_FIREBASE_DB_URL) return null;
  if (typeof window === 'undefined') return null; // Don't load on server
  try {
    const database = getClientDatabase();
    if (!database) return null;
    const snapshot = await get(ref(database, `users/${USER_ID}/${key}`));
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    console.error(`Failed to load ${key} from Firebase:`, error);
    return null;
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
    const unsubscribe = onValue(
      ref(database, `users/${USER_ID}/${key}`),
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

export async function syncAllData(tasks: any, projects: any, events: any, brainItems: any, settings: any, dark: boolean) {
  await Promise.all([
    syncDataToFirebase('tasks', tasks),
    syncDataToFirebase('projects', projects),
    syncDataToFirebase('calendar', events),
    syncDataToFirebase('brain', brainItems),
    syncDataToFirebase('settings', settings),
    syncDataToFirebase('dark', dark),
  ]);
}

export async function pullAllDataFromFirebase() {
  if (!process.env.NEXT_PUBLIC_FIREBASE_DB_URL) return null;
  if (typeof window === 'undefined') return null;

  try {
    const [tasks, projects, calendar, brain, settings, dark] = await Promise.all([
      loadDataFromFirebase('tasks'),
      loadDataFromFirebase('projects'),
      loadDataFromFirebase('calendar'),
      loadDataFromFirebase('brain'),
      loadDataFromFirebase('settings'),
      loadDataFromFirebase('dark'),
    ]);

    return { tasks, projects, calendar, brain, settings, dark };
  } catch (error) {
    console.error('Failed to pull data from Firebase:', error);
    return null;
  }
}
