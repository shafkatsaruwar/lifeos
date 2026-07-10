import { ref, set, get, onValue, Unsubscribe } from 'firebase/database';
import { getClientDatabase } from './firebase';

const USER_ID = 'default-user'; // In future, use actual user ID from auth
const listeners: Map<string, Unsubscribe> = new Map();

export async function syncDataToFirebase(key: string, data: any) {
  if (!process.env.NEXT_PUBLIC_FIREBASE_DB_URL) return;
  if (typeof window === 'undefined') return; // Don't sync on server
  try {
    const database = getClientDatabase();
    if (!database) return;
    await set(ref(database, `users/${USER_ID}/${key}`), data);
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
    if (!database) return () => {};

    // Unsubscribe from previous listener if exists
    if (listeners.has(key)) {
      const unsubscribe = listeners.get(key);
      unsubscribe?.();
    }

    // Set up real-time listener
    const unsubscribe = onValue(
      ref(database, `users/${USER_ID}/${key}`),
      (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.val());
        }
      },
      (error) => {
        console.error(`Failed to listen to ${key} changes:`, error);
      }
    );

    listeners.set(key, unsubscribe);
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
