import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, remove, onValue } from 'firebase/database';
import { getAuth, GoogleAuthProvider, signInWithRedirect, signOut as firebaseSignOut, onAuthStateChanged, getRedirectResult } from 'firebase/auth';

let app: any;
let database: any;
let auth: any;
let initialized = false;

function initializeFirebase() {
  if (initialized || typeof window === 'undefined') return;
  try {
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DB_URL,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    };
    app = initializeApp(firebaseConfig);
    database = getDatabase(app);
    auth = getAuth(app);
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

export async function signInWithGoogle() {
  const auth = getClientAuth();
  const provider = new GoogleAuthProvider();
  return signInWithRedirect(auth, provider);
}

export async function signOut() {
  const auth = getClientAuth();
  return firebaseSignOut(auth);
}

export { ref, set, get, remove, onValue, onAuthStateChanged, getRedirectResult };
