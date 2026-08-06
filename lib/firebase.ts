import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, remove, onValue } from 'firebase/database';
import {
  browserLocalPersistence,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type UserCredential,
} from 'firebase/auth';
import { getStorage } from 'firebase/storage';

let app: any;
let database: any;
let auth: any;
let storage: any;
let initialized = false;
let persistenceReady: Promise<void> | null = null;
let shellSignInWaiter: {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
} | null = null;

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

/** True inside the Expo iPhone web shell (WebView). Popup/redirect Google auth breaks there. */
export function isLifeOSIosShell() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get('app') === 'ios') return true;
  return /LifeOS-iOS-Shell/i.test(window.navigator.userAgent);
}

function postToLifeOSShell(payload: Record<string, unknown>) {
  if (typeof window === 'undefined') return false;
  const data = JSON.stringify(payload);
  const bridge = (window as any).ReactNativeWebView;
  if (bridge?.postMessage) {
    bridge.postMessage(data);
    return true;
  }
  // Some WKWebView builds expose the handler before ReactNativeWebView is patched in.
  try {
    (window as any).webkit?.messageHandlers?.ReactNativeWebView?.postMessage(data);
    return true;
  } catch {
    return false;
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

export async function signInWithGoogleIdToken(idToken: string) {
  const auth = getClientAuth();
  if (!auth) throw new Error('Firebase authentication is not configured.');
  if (!idToken) throw new Error('Missing Google ID token.');

  await persistenceReady;
  return signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
}

export async function completeShellGoogleSignIn(idToken: string) {
  try {
    const result = await signInWithGoogleIdToken(idToken);
    if (shellSignInWaiter) {
      clearTimeout(shellSignInWaiter.timer);
      shellSignInWaiter.resolve(result);
      shellSignInWaiter = null;
    }
    return result;
  } catch (error) {
    if (shellSignInWaiter) {
      clearTimeout(shellSignInWaiter.timer);
      shellSignInWaiter.reject(error);
      shellSignInWaiter = null;
    }
    throw error;
  }
}

/** Google blocks Expo Go's exp:// redirect URIs. Shell auth runs on HTTPS first. */
export async function consumeShellBridgeGoogleRedirect() {
  const auth = getClientAuth();
  if (!auth) throw new Error('Firebase authentication is not configured.');
  await persistenceReady;
  return getRedirectResult(auth);
}

/**
 * The WebView must sign in with a Google ID token (iss=accounts.google.com).
 * user.getIdToken() is a Firebase token and will fail with auth/invalid-credential.
 */
export function googleIdTokenFromAuthResult(result: UserCredential | null) {
  if (!result) return null;
  const credential = GoogleAuthProvider.credentialFromResult(result);
  return credential?.idToken || null;
}

export async function beginShellBridgeGoogleSignIn() {
  const auth = getClientAuth();
  if (!auth) throw new Error('Firebase authentication is not configured.');
  await persistenceReady;
  const provider = new GoogleAuthProvider();
  // Ask Google for an ID token the WebView can pass to signInWithCredential.
  provider.addScope('openid');
  provider.setCustomParameters({ prompt: 'select_account' });
  return signInWithRedirect(auth, provider);
}

export async function signInWithGoogle() {
  const auth = getClientAuth();
  if (!auth) throw new Error('Firebase authentication is not configured.');

  await persistenceReady;

  // iOS WebView cannot keep Google redirect/popup sessionStorage. Ask the
  // native shell to run Expo Google auth, then finish with an ID token.
  if (isLifeOSIosShell()) {
    if (shellSignInWaiter) {
      clearTimeout(shellSignInWaiter.timer);
      shellSignInWaiter.reject(new Error('Another Google sign-in is already in progress.'));
      shellSignInWaiter = null;
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        shellSignInWaiter = null;
        reject(new Error('Google sign-in timed out. Tap Sign in on the top bar, or try again.'));
      }, 120000);
      shellSignInWaiter = { resolve, reject, timer };
      const sent = postToLifeOSShell({ type: 'LIFEOS_REQUEST_GOOGLE_SIGNIN' });
      if (!sent) {
        clearTimeout(timer);
        shellSignInWaiter = null;
        reject(new Error('Tap “Sign in” in the LifeOS top bar to continue with Google.'));
      }
    });
  }

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

if (typeof window !== 'undefined') {
  (window as any).__lifeosCompleteGoogleSignIn = (idToken: string) => completeShellGoogleSignIn(idToken);
  (window as any).__lifeosRejectGoogleSignIn = (message: string) => {
    if (!shellSignInWaiter) return;
    clearTimeout(shellSignInWaiter.timer);
    shellSignInWaiter.reject(new Error(message || 'Google sign-in was cancelled.'));
    shellSignInWaiter = null;
  };
}
