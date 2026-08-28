import AsyncStorage from "@react-native-async-storage/async-storage";

/** Local PencilKit payload cache — survives sync races when Firebase is briefly behind. */
const prefix = "lifeos.pageInk.v1:";

function key(pageId: string) {
  return `${prefix}${pageId}`;
}

export async function cachePageInk(pageId: string, data: string): Promise<void> {
  if (!pageId || !data) return;
  try {
    await AsyncStorage.setItem(key(pageId), data);
  } catch {
    /* storage full / unavailable — Firebase path still attempts */
  }
}

export async function readCachedPageInk(pageId: string): Promise<string | null> {
  if (!pageId) return null;
  try {
    return await AsyncStorage.getItem(key(pageId));
  } catch {
    return null;
  }
}

export async function clearCachedPageInk(pageId: string): Promise<void> {
  if (!pageId) return;
  try {
    await AsyncStorage.removeItem(key(pageId));
  } catch {
    /* ignore */
  }
}
