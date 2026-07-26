import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, remove, onValue } from 'firebase/database';
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { getStorage } from 'firebase/storage';

let app: any;
let database: any;
let auth: any;
let storage: any;
let initialized = false;
let persistenceReady: Promise<void> | null = null;

function initializeFirebase() {
  if (initialized || typeof window === 'undefined') return;
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      // When enabled, this keeps Firebase's OAuth helper under the LifeOS
      // domain via the Next.js proxy above. Safari then retains its sign-in
      // state instead of sending the user to firebaseapp.com.
      authDomain: process.env.NEXT_PUBLIC_LIFEOS_AUTH_DOMAIN || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DB_URL,
      projectId,
      ...(storageBucket ? { storageBucket } : {}),
    };
    app = initializeApp(firebaseConfig);
    database = getDatabase(app);
    auth = getAuth(app);
    // Never guess a bucket name. Firebase can retry a missing bucket for a long
    // time, which leaves the UI stuck on "Uploading…". Until a real bucket is
    // configured, fileStorage immediately uses the on-device fallback.
    storage = storageBucket ? getStorage(app) : null;
    persistenceReady = setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error('Failed to enable persistent Firebase auth:', error);
      throw error;
    });
    initialized = true;
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
  }
}

export function getClientDatabase() {
  initializeFirebase();
  return database;
}

export function getClientAuth() {
  initializeFirebase();
  return auth;
}

export function getClientStorage() {
  initializeFirebase();
  return storage;
}

export async function signInWithGoogle() {
  const auth = getClientAuth();
  if (!auth) throw new Error('Firebase authentication is not configured.');

  await persistenceReady;
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  // Popup auth keeps the Firebase helper and LifeOS on the same page. This is
  // reliable on Vercel even when browsers partition cross-site redirect state.
  return signInWithPopup(auth, provider);
}

export async function signOut() {
  const auth = getClientAuth();
  return firebaseSignOut(auth);
}

export { ref, set, get, remove, onValue, onAuthStateChanged };
