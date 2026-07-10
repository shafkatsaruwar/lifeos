import { logger } from './logger';

export type SyncMessage = {
  type: 'TASKS_UPDATED' | 'PROJECTS_UPDATED' | 'CALENDAR_UPDATED' | 'SETTINGS_UPDATED' | 'BRAIN_UPDATED';
  data: any;
  timestamp: number;
  tabId: string;
};

interface CrossTabSyncCallbacks {
  onTasksUpdate?: (data: any) => void;
  onProjectsUpdate?: (data: any) => void;
  onCalendarUpdate?: (data: any) => void;
  onSettingsUpdate?: (data: any) => void;
  onBrainUpdate?: (data: any) => void;
}

export class CrossTabSync {
  private channel: BroadcastChannel | null = null;
  private tabId: string;
  private callbacks: CrossTabSyncCallbacks = {};
  private isSupported: boolean;

  constructor(callbacks?: CrossTabSyncCallbacks) {
    this.tabId = this.generateTabId();
    this.callbacks = callbacks || {};
    this.isSupported = typeof BroadcastChannel !== 'undefined';

    if (this.isSupported) {
      this.initialize();
    } else {
      logger.warn('BroadcastChannel not supported, cross-tab sync disabled');
    }
  }

  private initialize() {
    try {
      this.channel = new BroadcastChannel('lifeos-sync');
      this.channel.onmessage = (event) => this.handleMessage(event.data);
      logger.info('Cross-tab sync initialized', { tabId: this.tabId });
    } catch (error) {
      logger.error('Failed to initialize BroadcastChannel', error as Error);
      this.isSupported = false;
    }
  }

  private generateTabId(): string {
    return `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private handleMessage(message: SyncMessage) {
    // Ignore messages from own tab
    if (message.tabId === this.tabId) return;

    logger.debug('Received sync message from another tab', {
      type: message.type,
      tabId: message.tabId,
    });

    switch (message.type) {
      case 'TASKS_UPDATED':
        this.callbacks.onTasksUpdate?.(message.data);
        break;
      case 'PROJECTS_UPDATED':
        this.callbacks.onProjectsUpdate?.(message.data);
        break;
      case 'CALENDAR_UPDATED':
        this.callbacks.onCalendarUpdate?.(message.data);
        break;
      case 'SETTINGS_UPDATED':
        this.callbacks.onSettingsUpdate?.(message.data);
        break;
      case 'BRAIN_UPDATED':
        this.callbacks.onBrainUpdate?.(message.data);
        break;
    }
  }

  broadcast(message: Omit<SyncMessage, 'tabId' | 'timestamp'>) {
    if (!this.isSupported || !this.channel) return;

    const fullMessage: SyncMessage = {
      ...message,
      tabId: this.tabId,
      timestamp: Date.now(),
    };

    try {
      this.channel.postMessage(fullMessage);
      logger.debug('Broadcast sync message', { type: message.type });
    } catch (error) {
      logger.error('Failed to broadcast sync message', error as Error);
    }
  }

  broadcastTasksUpdate(tasks: any) {
    this.broadcast({ type: 'TASKS_UPDATED', data: tasks });
  }

  broadcastProjectsUpdate(projects: any) {
    this.broadcast({ type: 'PROJECTS_UPDATED', data: projects });
  }

  broadcastCalendarUpdate(calendar: any) {
    this.broadcast({ type: 'CALENDAR_UPDATED', data: calendar });
  }

  broadcastSettingsUpdate(settings: any) {
    this.broadcast({ type: 'SETTINGS_UPDATED', data: settings });
  }

  broadcastBrainUpdate(brain: any) {
    this.broadcast({ type: 'BRAIN_UPDATED', data: brain });
  }

  updateCallbacks(callbacks: CrossTabSyncCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  destroy() {
    if (this.channel) {
      this.channel.close();
      logger.info('Cross-tab sync destroyed');
    }
  }
}

// Singleton instance
let syncInstance: CrossTabSync | null = null;

export const initializeCrossTabSync = (callbacks?: CrossTabSyncCallbacks) => {
  if (!syncInstance) {
    syncInstance = new CrossTabSync(callbacks);
  }
  return syncInstance;
};

export const getCrossTabSync = () => syncInstance;
