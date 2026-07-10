import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, remove } from 'firebase/database';

const firebaseConfig = {
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DB_URL,
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database, ref, set, get, remove };
