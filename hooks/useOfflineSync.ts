'use client';

import { useEffect, useCallback, useState } from 'react';
import { getOfflineQueue, initializeOfflineQueue } from '@/lib/offlineQueue';
import { initializeCrossTabSync } from '@/lib/crossTabSync';
import { logger } from '@/lib/logger';
import { syncDataToFirebase } from '@/lib/dataSync';

interface UseOfflineSyncReturn {
  isOnline: boolean;
  pendingCount: number;
  processPendingOperations: () => Promise<void>;
}

export const useOfflineSync = (): UseOfflineSyncReturn => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Initialize offline queue and cross-tab sync
    const offlineQueue = initializeOfflineQueue();
    initializeCrossTabSync();

    // Set up offline queue processor
    offlineQueue.setProcessCallback(async (operation) => {
      logger.info('Processing offline operation', {
        type: operation.type,
        entity: operation.entity,
      });

      // Simulate operation processing
      await new Promise(resolve => setTimeout(resolve, 500));

      // In a real app, this would sync to Firebase
      await syncDataToFirebase(operation.entity, operation.data);
    });

    // Handle offline events
    const handleOnline = () => {
      setIsOnline(true);
      logger.info('Application is online');
      setPendingCount(offlineQueue.getPendingCount());
      offlineQueue.processQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      logger.warn('Application is offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update pending count
    setPendingCount(offlineQueue.getPendingCount());

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const processPendingOperations = useCallback(async () => {
    const offlineQueue = getOfflineQueue();
    if (offlineQueue) {
      await offlineQueue.processQueue();
      setPendingCount(offlineQueue.getPendingCount());
    }
  }, []);

  return { isOnline, pendingCount, processPendingOperations };
};
