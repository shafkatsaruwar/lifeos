/**
 * Islamic prayer time calculation (Adhan-style astronomical formulas).
 * Deterministic — no network. Requires user lat/lng + method.
 */
import type { AsrMethod, SalahId, SalahMethod, SalahSettings } from "./types";

export type PrayerTimes = Record<SalahId, Date> & { date: string };

const METHOD_PARAMS: Record<SalahMethod, { fajr: number; isha: number | "90min" }> = {
  MWL: { fajr: 18, isha: 17 },
  ISNA: { fajr: 15, isha: 15 },
  Egypt: { fajr: 19.5, isha: 17.5 },
  Makkah: { fajr: 18.5, isha: "90min" },
  Karachi: { fajr: 18, isha: 18 },
  Tehran: { fajr: 17.7, isha: 14 },
  Jafari: { fajr: 16, isha: 14 },
};

function dtr(d: number) {
  return (d * Math.PI) / 180;
}
function rtd(r: number) {
  return (r * 180) / Math.PI;
}

function fixHour(h: number) {
  let x = h;
  while (x < 0) x += 24;
  while (x >= 24) x -= 24;
  return x;
}

function julian(date: Date) {
  let y = date.getFullYear();
  let m = date.getMonth() + 1;
  const d = date.getDate() + 0.5;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
}

function sunPosition(jd: number) {
  const D = jd - 2451545.0;
  const g = fixAngle(357.529 + 0.98560028 * D);
  const q = fixAngle(280.459 + 0.98564736 * D);
  const L = fixAngle(q + 1.915 * Math.sin(dtr(g)) + 0.02 * Math.sin(dtr(2 * g)));
  const e = 23.439 - 0.00000036 * D;
  const RA = rtd(Math.atan2(Math.cos(dtr(e)) * Math.sin(dtr(L)), Math.cos(dtr(L)))) / 15;
  const eqt = q / 15 - fixHour(RA);
  const decl = rtd(Math.asin(Math.sin(dtr(e)) * Math.sin(dtr(L))));
  return { decl, eqt: fixHour(eqt) };
}

function fixAngle(a: number) {
  let x = a;
  while (x < 0) x += 360;
  while (x >= 360) x -= 360;
  return x;
}

function midDay(jd: number, timezone: number) {
  const { eqt } = sunPosition(jd);
  return fixHour(12 - eqt + timezone);
}

function sunAngleTime(jd: number, angle: number, lat: number, timezone: number, ccw: boolean) {
  const { decl, eqt } = sunPosition(jd);
  const noon = fixHour(12 - eqt + timezone);
  const t =
    (1 / 15) *
    rtd(
      Math.acos(
        (-Math.sin(dtr(angle)) - Math.sin(dtr(decl)) * Math.sin(dtr(lat))) /
          (Math.cos(dtr(decl)) * Math.cos(dtr(lat))),
      ),
    );
  return noon + (ccw ? -t : t);
}

function asrTime(jd: number, factor: number, lat: number, timezone: number) {
  const { decl, eqt } = sunPosition(jd);
  const noon = fixHour(12 - eqt + timezone);
  const abs = Math.abs(lat - decl);
  const angle = -rtd(Math.atan(1 / (factor + Math.tan(dtr(abs)))));
  const t =
    (1 / 15) *
    rtd(
      Math.acos(
        (-Math.sin(dtr(angle)) - Math.sin(dtr(decl)) * Math.sin(dtr(lat))) /
          (Math.cos(dtr(decl)) * Math.cos(dtr(lat))),
      ),
    );
  return noon + t;
}

function hoursToDate(base: Date, hours: number): Date {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  const ms = hours * 60 * 60 * 1000;
  return new Date(d.getTime() + ms);
}

/** Local timezone offset hours for a date (DST-aware). */
export function localTimezoneOffsetHours(date: Date = new Date()): number {
  return -date.getTimezoneOffset() / 60;
}

export function computePrayerTimes(
  date: Date,
  latitude: number,
  longitude: number,
  method: SalahMethod = "ISNA",
  asr: AsrMethod = "Standard",
  timezone?: number,
): PrayerTimes {
  const tz = timezone ?? localTimezoneOffsetHours(date);
  const jd = julian(date) - longitude / (15 * 24);
  const params = METHOD_PARAMS[method];
  const fajr = sunAngleTime(jd, params.fajr, latitude, tz, true);
  const sunrise = sunAngleTime(jd, 0.833, latitude, tz, true);
  const dhuhr = midDay(jd, tz);
  const asrFactor = asr === "Hanafi" ? 2 : 1;
  const asrH = asrTime(jd, asrFactor, latitude, tz);
  const maghrib = sunAngleTime(jd, 0.833, latitude, tz, false);
  let isha: number;
  if (params.isha === "90min") {
    isha = maghrib + 1.5;
  } else {
    isha = sunAngleTime(jd, params.isha, latitude, tz, false);
  }
  // sunrise unused in SalahId set but validates curve
  void sunrise;
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return {
    date: key,
    fajr: hoursToDate(date, fajr),
    dhuhr: hoursToDate(date, dhuhr),
    asr: hoursToDate(date, asrH),
    maghrib: hoursToDate(date, maghrib),
    isha: hoursToDate(date, isha),
  };
}

export function salahLabel(id: SalahId): string {
  const map: Record<SalahId, string> = {
    fajr: "Fajr",
    dhuhr: "Dhuhr",
    asr: "Asr",
    maghrib: "Maghrib",
    isha: "Isha",
  };
  return map[id];
}

export function nextPrayer(
  settings: SalahSettings,
  now: Date = new Date(),
): { id: SalahId; at: Date; endsAt: Date } | null {
  if (!settings.enabled || settings.latitude == null || settings.longitude == null) return null;
  const prayers = settings.prayers.length
    ? settings.prayers
    : (["fajr", "dhuhr", "asr", "maghrib", "isha"] as SalahId[]);
  const today = computePrayerTimes(now, settings.latitude, settings.longitude, settings.method, settings.asr);
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = computePrayerTimes(
    tomorrowDate,
    settings.latitude,
    settings.longitude,
    settings.method,
    settings.asr,
  );

  const sequence: SalahId[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
  const enabled = sequence.filter((id) => prayers.includes(id));

  for (let i = 0; i < enabled.length; i++) {
    const id = enabled[i];
    const at = today[id];
    const nextId = enabled[i + 1];
    const endsAt = nextId ? today[nextId] : tomorrow.fajr;
    if (now < endsAt && now >= new Date(at.getTime() - 15 * 60 * 1000)) {
      // Within 15m before start through end of window
      if (now < endsAt) return { id, at, endsAt };
    }
  }
  // Next upcoming today
  for (const id of enabled) {
    if (today[id] > now) {
      const idx = enabled.indexOf(id);
      const endsAt = enabled[idx + 1] ? today[enabled[idx + 1]] : tomorrow.fajr;
      return { id, at: today[id], endsAt };
    }
  }
  // Tomorrow fajr
  const first = enabled[0];
  const second = enabled[1] ?? first;
  return { id: first, at: tomorrow[first], endsAt: tomorrow[second] };
}

export function formatPrayerClock(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
