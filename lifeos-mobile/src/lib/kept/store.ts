import { get, onValue, ref, set, type Unsubscribe } from "firebase/database";
import { database } from "../firebase";
import { emptyKeptHub, normalizeKeptHub, type KeptHub } from "./shared";

const rootPath = (userId: string) => `users/${userId}/kept`;

function serialize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function loadKeptHub(userId: string): Promise<KeptHub> {
  const snapshot = await get(ref(database, rootPath(userId)));
  if (!snapshot.exists()) return emptyKeptHub();
  return normalizeKeptHub(snapshot.val());
}

export async function saveKeptHub(userId: string, hub: KeptHub): Promise<void> {
  const cleaned = normalizeKeptHub(hub);
  // Never persist a client-forged ownerId.
  const items = cleaned.items.map((item) => {
    const { ...rest } = item as typeof item & { ownerId?: string };
    delete (rest as { ownerId?: string }).ownerId;
    return rest;
  });
  await set(ref(database, rootPath(userId)), serialize({ ...cleaned, items }));
}

export function subscribeKeptHub(userId: string, onData: (hub: KeptHub) => void): Unsubscribe {
  return onValue(ref(database, rootPath(userId)), (snapshot) => {
    if (!snapshot.exists()) {
      onData(emptyKeptHub());
      return;
    }
    onData(normalizeKeptHub(snapshot.val()));
  });
}
