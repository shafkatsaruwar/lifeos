import { get, onValue, ref, set, type Unsubscribe } from "firebase/database";
import { database } from "../firebase";
import { emptyExecutiveHub, normalizeExecutiveHub } from "./hub";
import type { ExecutiveHub } from "./types";

const rootPath = (userId: string) => `users/${userId}/guided`;

function serialize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function loadExecutiveHub(userId: string): Promise<ExecutiveHub> {
  const snapshot = await get(ref(database, rootPath(userId)));
  if (!snapshot.exists()) return emptyExecutiveHub();
  return normalizeExecutiveHub(snapshot.val());
}

export async function saveExecutiveHub(userId: string, hub: ExecutiveHub): Promise<void> {
  await set(ref(database, rootPath(userId)), serialize(hub));
}

export function subscribeExecutiveHub(
  userId: string,
  onData: (hub: ExecutiveHub) => void,
): Unsubscribe {
  return onValue(ref(database, rootPath(userId)), (snapshot) => {
    if (!snapshot.exists()) {
      onData(emptyExecutiveHub());
      return;
    }
    onData(normalizeExecutiveHub(snapshot.val()));
  });
}
