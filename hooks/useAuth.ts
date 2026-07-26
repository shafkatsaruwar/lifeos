'use client';

import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, getClientAuth, signOut as firebaseSignOut, signInWithGoogle } from '@/lib/firebase';
import { setUserId } from '@/lib/dataSync';
import { logger } from '@/lib/logger';
import { STORAGE_KEYS, TEST_USER } from '@/lib/constants';

interface UseAuthReturn {
  user: any | null;
  userId: string | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  signInTest: () => void;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<any | null>(null);
  const [userId, setUserIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth on mount
  useEffect(() => {
    const auth = getClientAuth();

    // Check for test user in dev mode
    const testUserId = typeof window !== 'undefined'
      ? sessionStorage.getItem(STORAGE_KEYS.USER_ID)
      : null;

    if (testUserId === TEST_USER.ID) {
      logger.debug('Using test user for development');
      setUser({ displayName: TEST_USER.DISPLAY_NAME, email: TEST_USER.EMAIL });
      setUserIdState(testUserId);
      setUserId(testUserId);
      setLoading(false);
      return;
    }

    if (!auth) {
      logger.warn('Firebase auth not initialized');
      setLoading(false);
      return;
    }

    // Listen to auth state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        logger.info('User authenticated', { uid: currentUser.uid });
        setUser(currentUser);
        setUserIdState(currentUser.uid);
        setUserId(currentUser.uid);
        sessionStorage.setItem(STORAGE_KEYS.USER_ID, currentUser.uid);
      } else {
        logger.info('User not authenticated');
        setUser(null);
        setUserIdState(null);
        sessionStorage.removeItem(STORAGE_KEYS.USER_ID);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      logger.info('Sign in initiated');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      setError(message);
      logger.error('Sign in error', err as Error);
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await firebaseSignOut();
      setUser(null);
      setUserIdState(null);
      sessionStorage.removeItem(STORAGE_KEYS.USER_ID);
      logger.info('User signed out');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign out failed';
      setError(message);
      logger.error('Sign out error', err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  const signInTest = useCallback(() => {
    sessionStorage.setItem(STORAGE_KEYS.USER_ID, TEST_USER.ID);
    setUser({ displayName: TEST_USER.DISPLAY_NAME, email: TEST_USER.EMAIL });
    setUserIdState(TEST_USER.ID);
    setUserId(TEST_USER.ID);
    logger.debug('Test login initiated');
  }, []);

  return { user, userId, loading, error, signIn, signOut, signInTest };
};
