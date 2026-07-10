import { logger } from './logger';

const DB_NAME = 'lifeos-files';
const STORE_NAME = 'resources';
const DB_VERSION = 1;

export interface StoredFile {
  id: string;
  data: Blob;
  mimeType: string;
  uploadedAt: number;
}

class FileStorageManager {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        logger.error('Failed to open IndexedDB', new Error('IndexedDB open failed'));
        reject(new Error('Failed to open file storage'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        logger.info('IndexedDB initialized for file storage');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          logger.debug('Created IndexedDB object store for resources');
        }
      };
    });

    return this.initPromise;
  }

  async uploadFile(file: File): Promise<{ id: string; url: string }> {
    try {
      const db = await this.init();
      const id = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const blobUrl = URL.createObjectURL(file);

      // Store in IndexedDB
      const storedFile: StoredFile = {
        id,
        data: file,
        mimeType: file.type,
        uploadedAt: Date.now(),
      };

      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(storedFile);

        request.onerror = () => reject(new Error('Failed to store file'));
        request.onsuccess = () => {
          logger.info('File uploaded successfully', { id, size: file.size });
          resolve();
        };
      });

      return { id, url: blobUrl };
    } catch (error) {
      logger.error('File upload failed', error as Error);
      throw error;
    }
  }

  async getFile(id: string): Promise<Blob | null> {
    try {
      const db = await this.init();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onerror = () => reject(new Error('Failed to retrieve file'));
        request.onsuccess = () => {
          const result = request.result as StoredFile | undefined;
          resolve(result ? result.data : null);
        };
      });
    } catch (error) {
      logger.error('Failed to retrieve file', error as Error);
      return null;
    }
  }

  async deleteFile(id: string): Promise<void> {
    try {
      const db = await this.init();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onerror = () => reject(new Error('Failed to delete file'));
        request.onsuccess = () => {
          logger.info('File deleted', { id });
          resolve();
        };
      });
    } catch (error) {
      logger.error('Failed to delete file', error as Error);
    }
  }

  async getFileUrl(id: string): Promise<string | null> {
    const blob = await this.getFile(id);
    return blob ? URL.createObjectURL(blob) : null;
  }

  async replaceFile(id: string, newFile: File): Promise<string> {
    try {
      await this.deleteFile(id);
      const blob = await this.getFile(id);
      if (blob) {
        URL.revokeObjectURL(URL.createObjectURL(blob));
      }
      const { url } = await this.uploadFile(newFile);
      return url;
    } catch (error) {
      logger.error('File replacement failed', error as Error);
      throw error;
    }
  }
}

let fileStorageInstance: FileStorageManager | null = null;

export const getFileStorage = () => {
  if (!fileStorageInstance) {
    fileStorageInstance = new FileStorageManager();
  }
  return fileStorageInstance;
};
