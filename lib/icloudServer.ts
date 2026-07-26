import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

export type ICloudCalendar = { url: string; name: string; color?: string };
type Credentials = { appleId: string; appPassword: string };
export type StoredICloudConnection = { encrypted: string; connectedAt: string; calendars: ICloudCalendar[]; selectedCalendarUrls: string[] };

const base64url = (value: Buffer) => value.toString("base64url");
const fromBase64url = (value: string) => Buffer.from(value, "base64url");
const secret = () => {
  const value = process.env.ICLOUD_CONNECTION_SECRET;
  if (!value) throw new Error("iCloud sync is not configured yet. Add ICLOUD_CONNECTION_SECRET in Vercel, then redeploy.");
  return createHash("sha256").update(value).digest();
};
const decodeXml = (value: string) => value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&#13;/g, "\r").replace(/&#10;/g, "\n");

export function encryptICloudCredentials(credentials: Credentials) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secret(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(credentials), "utf8"), cipher.final()]);
  return [base64url(iv), base64url(cipher.getAuthTag()), base64url(ciphertext)].join(".");
}

export function decryptICloudCredentials(value: string): Credentials {
  const [ivValue, tagValue, ciphertextValue] = value.split(".");
  if (!ivValue || !tagValue || !ciphertextValue) throw new Error("Your saved iCloud connection is invalid. Reconnect it.");
  const decipher = createDecipheriv("aes-256-gcm", secret(), fromBase64url(ivValue));
  decipher.setAuthTag(fromBase64url(tagValue));
  return JSON.parse(Buffer.concat([decipher.update(fromBase64url(ciphertextValue)), decipher.final()]).toString("utf8")) as Credentials;
}

export const iCloudConfigured = () => Boolean(process.env.ICLOUD_CONNECTION_SECRET);
const databaseUrl = () => (process.env.NEXT_PUBLIC_FIREBASE_DB_URL || "").replace(/\/$/, "");
const connectionUrl = (uid: string, idToken: string) => {
  const base = databaseUrl();
  if (!base) throw new Error("Firebase database is not configured.");
  return base + "/users/" + encodeURIComponent(uid) + "/icloud.json?auth=" + encodeURIComponent(idToken);
};
export async function getICloudConnection(uid: string, idToken: string) {
  const response = await fetch(connectionUrl(uid, idToken), { cache: "no-store" });
  if (!response.ok) throw new Error("Could not read your iCloud connection.");
  const value = await response.json() as Partial<StoredICloudConnection> | null;
  if (!value?.encrypted) return null;
  return {
    encrypted: value.encrypted,
    connectedAt: typeof value.connectedAt === "string" ? value.connectedAt : new Date().toISOString(),
    calendars: Array.isArray(value.calendars) ? value.calendars.filter((calendar): calendar is ICloudCalendar => Boolean(calendar && typeof calendar.url === "string" && typeof calendar.name === "string")) : [],
    selectedCalendarUrls: Array.isArray(value.selectedCalendarUrls) ? value.selectedCalendarUrls.filter((url): url is string => typeof url === "string") : [],
  };
}
export async function saveICloudConnection(uid: string, idToken: string, connection: StoredICloudConnection | null) {
  const response = await fetch(connectionUrl(uid, idToken), { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(connection), cache: "no-store" });
  if (!response.ok) throw new Error("Could not save your iCloud connection. Check Firebase Database rules, then try again.");
}

async function dav(url: string, credentials: Credentials, method: "PROPFIND" | "REPORT", body: string, depth: "0" | "1") {
  const response = await fetch(url, { method, redirect: "follow", headers: { authorization: "Basic " + Buffer.from(credentials.appleId + ":" + credentials.appPassword).toString("base64"), depth, "content-type": "application/xml; charset=utf-8" }, body, cache: "no-store" });
  const text = await response.text();
  if (!response.ok && response.status !== 207) throw new Error(response.status === 401 ? "Apple rejected that Apple ID or app-specific password." : "iCloud Calendar could not be reached. Try again in a moment.");
  return { url: response.url, text };
}
const hrefInProperty = (xml: string, propertyName: string) => {
  const match = xml.match(new RegExp("<[^>]*" + propertyName + "[^>]*>[\\s\\S]*?<[^>]*href[^>]*>([^<]+)<", "i"));
  return match?.[1]?.trim() || null;
};
const absoluteUrl = (href: string, base: string) => new URL(decodeXml(href), base).toString();

export async function discoverICloudCalendars(credentials: Credentials): Promise<ICloudCalendar[]> {
  const root = await dav("https://caldav.icloud.com/", credentials, "PROPFIND", '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:current-user-principal/></d:prop></d:propfind>', "0");
  const principalHref = hrefInProperty(root.text, "current-user-principal");
  if (!principalHref) throw new Error("iCloud did not return a calendar account. Make sure iCloud Calendar is enabled for this Apple Account.");
  const principal = await dav(absoluteUrl(principalHref, root.url), credentials, "PROPFIND", '<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><c:calendar-home-set/></d:prop></d:propfind>', "0");
  const homeHref = hrefInProperty(principal.text, "calendar-home-set");
  if (!homeHref) throw new Error("iCloud did not return a calendar home.");
  const home = await dav(absoluteUrl(homeHref, principal.url), credentials, "PROPFIND", '<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:apple="http://apple.com/ns/ical/"><d:prop><d:displayname/><d:resourcetype/><apple:calendar-color/></d:prop></d:propfind>', "1");
  const responses = home.text.match(/<[^>]*response[^>]*>[\s\S]*?<\/[^>]*response>/gi) || [];
  return responses.reduce<ICloudCalendar[]>((calendars, block) => {
    if (!/calendar\s*\/?\s*>/i.test(block)) return calendars;
    const href = block.match(/<[^>]*href[^>]*>([^<]+)</i)?.[1];
    if (!href) return calendars;
    const name = decodeXml(block.match(/<[^>]*displayname[^>]*>([\s\S]*?)<\//i)?.[1]?.trim() || "iCloud calendar");
    const color = decodeXml(block.match(/<[^>]*calendar-color[^>]*>([^<]+)</i)?.[1]?.trim() || "").replace(/\s+/g, "");
    calendars.push({ url: absoluteUrl(href, home.url), name, ...(color ? { color } : {}) });
    return calendars;
  }, []);
}

const unfoldIcs = (value: string) => value.replace(/\r?\n[ \t]/g, "");
const property = (block: string, name: string) => block.match(new RegExp("^" + name + "(?:;[^:]*)?:(.*)$", "mi"))?.[1]?.trim() || "";
const toIcsDate = (value: string) => {
  if (/^\d{8}$/.test(value)) return value.slice(0, 4) + "-" + value.slice(4, 6) + "-" + value.slice(6, 8) + "T00:00:00";
  const clean = value.replace(/Z$/, "");
  return clean.slice(0, 4) + "-" + clean.slice(4, 6) + "-" + clean.slice(6, 8) + "T" + (clean.slice(9, 11) || "00") + ":" + (clean.slice(11, 13) || "00") + ":" + (clean.slice(13, 15) || "00");
};

export async function readICloudEvents(credentials: Credentials, calendars: ICloudCalendar[]) {
  const start = new Date(); start.setMonth(start.getMonth() - 2);
  const end = new Date(); end.setMonth(end.getMonth() + 12);
  const stamp = (value: Date) => value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const query = '<?xml version="1.0"?><c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><d:getetag/><c:calendar-data/></d:prop><c:filter><c:comp-filter name="VCALENDAR"><c:comp-filter name="VEVENT"><c:time-range start="' + stamp(start) + '" end="' + stamp(end) + '"/></c:comp-filter></c:comp-filter></c:filter></c:calendar-query>';
  const results = await Promise.all(calendars.map(async calendar => {
    const response = await dav(calendar.url, credentials, "REPORT", query, "1");
    const blocks = [...response.text.matchAll(/<[^>]*calendar-data[^>]*>([\s\S]*?)<\//gi)].map(match => decodeXml(match[1]));
    return blocks.flatMap(data => (unfoldIcs(data).match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || []).map(block => {
      const uid = property(block, "UID") || calendar.url + property(block, "SUMMARY") + property(block, "DTSTART");
      const startValue = property(block, "DTSTART"); if (!startValue) return null;
      const endValue = property(block, "DTEND");
      return { id: "icloud-" + createHash("sha1").update(calendar.url + ":" + uid).digest("hex"), title: property(block, "SUMMARY") || "Untitled event", start: toIcsDate(startValue), end: endValue ? toIcsDate(endValue) : undefined, source: "iCal" as const, color: calendar.color || "#8b7cff", notes: property(block, "DESCRIPTION").replace(/\\n/g, "\n") || undefined };
    }).filter(Boolean));
  }));
  return results.flat() as { id: string; title: string; start: string; end?: string; source: "iCal"; color: string; notes?: string }[];
}
