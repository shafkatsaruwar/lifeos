import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, remove, onValue } from 'firebase/database';

let app: any;
let database: any;
let initialized = false;

function initializeFirebase() {
  if (initialized || typeof window === 'undefined') return;
  try {
    const firebaseConfig = {
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DB_URL,
    };
    app = initializeApp(firebaseConfig);
    database = getDatabase(app);
    initialized = true;
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
  }
}

export function getClientDatabase() {
  initializeFirebase();
  return database;
}

export { ref, set, get, remove, onValue };
