import { ref, set, get } from 'firebase/database';
import { getClientDatabase } from './firebase';

const USER_ID = 'default-user'; // In future, use actual user ID from auth

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
