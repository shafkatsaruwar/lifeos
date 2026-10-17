/** Detect Zoom / Teams / Webex links and produce short join labels. */

export type MeetingProvider = "zoom" | "teams" | "webex";

const URL_IN_TEXT =
  /https?:\/\/[^\s<>"'{}|\\^`\[\]]+/gi;

const PROVIDERS: { key: MeetingProvider; match: RegExp; label: string }[] = [
  {
    key: "zoom",
    match: /(?:^|[/.])zoom\.us\b|zoom\.com\/(?:j|s|wc)\//i,
    label: "Join with Zoom",
  },
  {
    key: "teams",
    match: /teams\.microsoft\.com|teams\.live\.com|microsoft\.com\/.*teams/i,
    label: "Join with Teams",
  },
  {
    key: "webex",
    match: /(?:^|[/.])webex\.com\b/i,
    label: "Join with Webex",
  },
];

function stripTrailingPunctuation(url: string) {
  return url.replace(/[),.;!?]+$/g, "");
}

export function detectMeetingProvider(value?: string | null): MeetingProvider | null {
  if (!value?.trim()) return null;
  const haystack = value.trim();
  for (const provider of PROVIDERS) {
    if (provider.match.test(haystack)) return provider.key;
  }
  return null;
}

export function meetingJoinLabel(provider: MeetingProvider): string {
  return PROVIDERS.find((item) => item.key === provider)?.label ?? "Join meeting";
}

/** First Zoom/Teams/Webex URL found in free text (or the string itself if it is one). */
export function extractMeetingUrl(value?: string | null): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed) && detectMeetingProvider(trimmed)) {
    return stripTrailingPunctuation(trimmed);
  }
  const matches = trimmed.match(URL_IN_TEXT) ?? [];
  for (const match of matches) {
    const cleaned = stripTrailingPunctuation(match);
    if (detectMeetingProvider(cleaned)) return cleaned;
  }
  return null;
}

/** True when the whole location string is really a meeting URL (don't show as place). */
export function locationLooksLikeMeetingUrl(value?: string | null): boolean {
  if (!value?.trim()) return false;
  const trimmed = value.trim();
  if (extractMeetingUrl(trimmed)) {
    // If it's mostly just the URL (maybe with "Zoom:" prefix), treat as link not place.
    const withoutUrl = trimmed.replace(URL_IN_TEXT, "").replace(/https?:\/\/\S+/gi, "").trim();
    return withoutUrl.length < 12;
  }
  return Boolean(detectMeetingProvider(trimmed) && /^https?:\/\//i.test(trimmed));
}

export type ResolvedMeetingLink = {
  url: string;
  provider: MeetingProvider;
  label: string;
};

export function resolveEventMeeting(input: {
  url?: string | null;
  location?: string | null;
  notes?: string | null;
}): ResolvedMeetingLink | null {
  const candidates = [input.url, input.location, input.notes];
  for (const candidate of candidates) {
    const url = extractMeetingUrl(candidate) || (
      candidate && detectMeetingProvider(candidate) && /^https?:\/\//i.test(candidate.trim())
        ? stripTrailingPunctuation(candidate.trim())
        : null
    );
    if (!url) continue;
    const provider = detectMeetingProvider(url);
    if (!provider) continue;
    return { url, provider, label: meetingJoinLabel(provider) };
  }
  return null;
}

/** Physical place to show (skips values that are just meeting URLs). */
export function eventPlaceLabel(location?: string | null): string | null {
  if (!location?.trim()) return null;
  if (locationLooksLikeMeetingUrl(location)) return null;
  return location.trim();
}

/** Notes for display — strips Zoom/Teams/Webex URLs so only the join label shows. */
export function eventNotesLabel(notes?: string | null): string | null {
  if (!notes?.trim()) return null;
  const stripped = notes
    .replace(URL_IN_TEXT, (url) => (detectMeetingProvider(url) ? "" : url))
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .trim();
  return stripped || null;
}

/** Prefer an explicit link field; otherwise pull a meeting URL out of location/notes. */
export function coalesceEventMeetingUrl(input: {
  url?: string | null;
  location?: string | null;
  notes?: string | null;
}): string | undefined {
  const explicit = input.url?.trim();
  if (explicit) {
    return extractMeetingUrl(explicit) || explicit;
  }
  return (
    extractMeetingUrl(input.location) ||
    extractMeetingUrl(input.notes) ||
    undefined
  );
}
