import { logger } from './logger';

export type QueuedOperation = {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'task' | 'project' | 'calendar' | 'brain';
  data: any;
  timestamp: number;
  retries: number;
  maxRetries: number;
};

export class OfflineQueue {
  private queue: QueuedOperation[] = [];
  private isProcessing = false;
  private isOnline = navigator.onLine;
  private processCallback: ((operation: QueuedOperation) => Promise<void>) | null = null;

  constructor() {
    this.loadQueue();
    this.setupNetworkListeners();
    logger.info('Offline queue initialized');
  }

  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      logger.info('Back online, processing queue');
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      logger.warn('Offline mode, queueing operations');
    });
  }

  private loadQueue() {
    try {
      const stored = localStorage.getItem('lifeos-offline-queue');
      if (stored) {
        this.queue = JSON.parse(stored);
        logger.info('Loaded queued operations', { count: this.queue.length });
      }
    } catch (error) {
      logger.error('Failed to load offline queue', error as Error);
      this.queue = [];
    }
  }

  private saveQueue() {
    try {
      localStorage.setItem('lifeos-offline-queue', JSON.stringify(this.queue));
    } catch (error) {
      logger.error('Failed to save offline queue', error as Error);
    }
  }

  add(operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retries'>) {
    const queuedOp: QueuedOperation = {
      ...operation,
      id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: operation.maxRetries || 3,
    };

    this.queue.push(queuedOp);
    this.saveQueue();
    logger.info('Operation queued', { opId: queuedOp.id, type: operation.type });

    if (this.isOnline) {
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.isProcessing || !this.isOnline || !this.processCallback) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const operation = this.queue[0];

      try {
        logger.debug('Processing queued operation', { opId: operation.id });
        await this.processCallback(operation);
        this.queue.shift();
        this.saveQueue();
        logger.info('Operation processed', { opId: operation.id });
      } catch {
        operation.retries++;

        if (operation.retries >= operation.maxRetries) {
          logger.error('Operation failed after max retries', {
            opId: operation.id,
            retries: operation.retries,
          });
          this.queue.shift();
          this.saveQueue();
        } else {
          logger.warn('Operation failed, will retry', {
            opId: operation.id,
            retries: operation.retries,
          });
          this.saveQueue();
          break; // Wait before retrying
        }
      }
    }

    this.isProcessing = false;
  }

  setProcessCallback(callback: (operation: QueuedOperation) => Promise<void>) {
    this.processCallback = callback;
  }

  getQueue() {
    return [...this.queue];
  }

  clear() {
    this.queue = [];
    this.saveQueue();
    logger.info('Offline queue cleared');
  }

  isOnlineMode() {
    return this.isOnline;
  }

  getPendingCount() {
    return this.queue.length;
  }
}

// Singleton instance
let queueInstance: OfflineQueue | null = null;

export const initializeOfflineQueue = () => {
  if (!queueInstance) {
    queueInstance = new OfflineQueue();
  }
  return queueInstance;
};

export const getOfflineQueue = () => queueInstance || initializeOfflineQueue();
