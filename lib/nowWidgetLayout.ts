/**
 * LifeOS 3.0 Phase 4 — Now dashboard widget layout (show/hide + order).
 * Current Atelier composition is the default; customization is additive on settings.
 */

export const NOW_WIDGET_IDS = [
  "weather",
  "quote",
  "today",
  "copilot",
  "focus",
  "rings",
  "hubs",
] as const;

export type NowWidgetId = (typeof NOW_WIDGET_IDS)[number];

export type NowWidgetLayout = {
  /** Visible widget order (may omit hidden ids). */
  order: NowWidgetId[];
  /** Explicitly hidden widgets. */
  hidden: NowWidgetId[];
};

export const DEFAULT_NOW_WIDGET_LAYOUT: NowWidgetLayout = {
  order: [...NOW_WIDGET_IDS],
  hidden: [],
};

export const NOW_WIDGET_LABELS: Record<NowWidgetId, string> = {
  weather: "Weather",
  quote: "Quote",
  today: "Today",
  focus: "Focus",
  rings: "Activity rings",
  hubs: "Hubs",
  copilot: "Copilot",
};

export function isNowWidgetId(value: unknown): value is NowWidgetId {
  return typeof value === "string" && (NOW_WIDGET_IDS as readonly string[]).includes(value);
}

/** Normalize persisted layout — fills missing ids, drops unknowns. */
export function normalizeNowWidgetLayout(raw?: Partial<NowWidgetLayout> | null): NowWidgetLayout {
  const hiddenRaw = Array.isArray(raw?.hidden) ? raw!.hidden.filter(isNowWidgetId) : [];
  const hidden = Array.from(new Set(hiddenRaw));
  const orderRaw = Array.isArray(raw?.order) ? raw!.order.filter(isNowWidgetId) : [];
  const seen = new Set<NowWidgetId>();
  const order: NowWidgetId[] = [];
  for (const id of orderRaw) {
    if (seen.has(id)) continue;
    seen.add(id);
    order.push(id);
  }
  for (const id of NOW_WIDGET_IDS) {
    if (!seen.has(id)) order.push(id);
  }
  return { order, hidden };
}

export function visibleNowWidgets(layout?: Partial<NowWidgetLayout> | null): NowWidgetId[] {
  const normalized = normalizeNowWidgetLayout(layout);
  return normalized.order.filter((id) => !normalized.hidden.includes(id));
}

export function isDefaultNowWidgetLayout(layout?: Partial<NowWidgetLayout> | null): boolean {
  const normalized = normalizeNowWidgetLayout(layout);
  if (normalized.hidden.length > 0) return false;
  return normalized.order.every((id, i) => id === DEFAULT_NOW_WIDGET_LAYOUT.order[i]);
}

export function moveNowWidget(
  layout: NowWidgetLayout,
  id: NowWidgetId,
  direction: "up" | "down",
): NowWidgetLayout {
  const normalized = normalizeNowWidgetLayout(layout);
  const index = normalized.order.indexOf(id);
  if (index < 0) return normalized;
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= normalized.order.length) return normalized;
  const order = [...normalized.order];
  [order[index], order[swapWith]] = [order[swapWith], order[index]];
  return { ...normalized, order };
}

export function toggleNowWidgetHidden(layout: NowWidgetLayout, id: NowWidgetId): NowWidgetLayout {
  const normalized = normalizeNowWidgetLayout(layout);
  const hidden = normalized.hidden.includes(id)
    ? normalized.hidden.filter((h) => h !== id)
    : [...normalized.hidden, id];
  return { ...normalized, hidden };
}
