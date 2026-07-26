import { logger } from './logger';
import { getClientStorage } from './firebase';
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';

const DB_NAME = 'lifeos-files';
const STORE_NAME = 'resources';
const DB_VERSION = 1;

export interface StoredFile {
  id: string;
  data: Blob;
  mimeType: string;
  uploadedAt: number;
}

export interface UploadedFile {
  id: string;
  url: string;
  storage: 'cloud' | 'local';
  storagePath?: string;
}

class FileStorageManager {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  private async uploadToCloud(fileRef: any, file: File): Promise<void> {
    await Promise.race([
      uploadBytes(fileRef, file, { contentType: file.type || 'application/octet-stream' }).then(() => undefined),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Cloud upload timed out')), 15_000)),
    ]);
  }

  private async getCloudUrl(fileRef: any): Promise<string> {
    return Promise.race([
      getDownloadURL(fileRef),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Cloud download URL timed out')), 10_000)),
    ]);
  }

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

  private async storeLocalFile(id: string, file: File): Promise<UploadedFile> {
    const db = await this.init();
    const storedFile: StoredFile = { id, data: file, mimeType: file.type, uploadedAt: Date.now() };
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(storedFile);
      request.onerror = () => reject(new Error('Failed to store file'));
      request.onsuccess = () => resolve();
    });
    logger.info('File stored on this device', { id, size: file.size });
    return { id, url: URL.createObjectURL(file), storage: 'local' };
  }

  async uploadFile(file: File, userId?: string, folder = 'resources'): Promise<UploadedFile> {
    const id = `file-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const storage = getClientStorage();
    if (storage && userId) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
      const storagePath = `users/${userId}/${folder}/${id}-${safeName}`;
      try {
        const fileRef = storageRef(storage, storagePath);
        await this.uploadToCloud(fileRef, file);
        const url = await this.getCloudUrl(fileRef);
        logger.info('File uploaded to cloud storage', { id, size: file.size });
        return { id, url, storage: 'cloud', storagePath };
      } catch (error) {
        logger.warn('Cloud file upload unavailable; using on-device storage', { error: String(error) });
      }
    }
    return this.storeLocalFile(id, file);
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

  async deleteFile(id: string, storagePath?: string): Promise<void> {
    if (storagePath) {
      try {
        const storage = getClientStorage();
        if (storage) await deleteObject(storageRef(storage, storagePath));
      } catch (error) {
        logger.warn('Could not delete cloud file', { id, error: String(error) });
      }
    }
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

  async replaceFile(id: string, newFile: File, storagePath?: string): Promise<UploadedFile> {
    if (storagePath) {
      try {
        const storage = getClientStorage();
        if (storage) {
          const fileRef = storageRef(storage, storagePath);
          await this.uploadToCloud(fileRef, newFile);
          return { id, url: await this.getCloudUrl(fileRef), storage: 'cloud', storagePath };
        }
      } catch (error) {
        logger.warn('Cloud file replacement unavailable; keeping a local copy', { id, error: String(error) });
      }
    }
    return this.storeLocalFile(id, newFile);
  }
}

let fileStorageInstance: FileStorageManager | null = null;

export const getFileStorage = () => {
  if (!fileStorageInstance) {
    fileStorageInstance = new FileStorageManager();
  }
  return fileStorageInstance;
};
