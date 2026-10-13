import type { CalendarEvent } from "../types";

export type IcsImportBatch = {
  id: string;
  sourceLabel: string;
  events: CalendarEvent[];
  /** Event ids selected for approval (subset of events). */
  selectedIds: string[];
  createdAt: string;
};

type Listener = (batch: IcsImportBatch | null) => void;

let pending: IcsImportBatch | null = null;
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener(pending);
}

export function subscribeIcsImportQueue(listener: Listener) {
  listeners.add(listener);
  listener(pending);
  return () => {
    listeners.delete(listener);
  };
}

export function getPendingIcsImport() {
  return pending;
}

export function clearPendingIcsImport() {
  pending = null;
  emit();
}

export function stageIcsImport(
  events: CalendarEvent[],
  options?: { sourceLabel?: string; existingIds?: Set<string> | string[] },
): IcsImportBatch | null {
  const cleaned = events.filter((event) => event?.id && event.title && event.start);
  if (!cleaned.length) return null;

  const existing = options?.existingIds
    ? options.existingIds instanceof Set
      ? options.existingIds
      : new Set(options.existingIds)
    : new Set<string>();

  // Prefer newly seen events; duplicates stay visible but unchecked.
  const selectedIds = cleaned.filter((event) => !existing.has(event.id)).map((event) => event.id);
  pending = {
    id: `ics-batch-${Date.now()}`,
    sourceLabel: options?.sourceLabel?.trim() || "ICS import",
    events: cleaned,
    selectedIds: selectedIds.length ? selectedIds : cleaned.map((event) => event.id),
    createdAt: new Date().toISOString(),
  };
  emit();
  return pending;
}

export function setIcsImportSelection(selectedIds: string[]) {
  if (!pending) return;
  const allowed = new Set(pending.events.map((event) => event.id));
  pending = {
    ...pending,
    selectedIds: selectedIds.filter((id) => allowed.has(id)),
  };
  emit();
}

export function toggleIcsImportSelection(eventId: string) {
  if (!pending) return;
  const selected = new Set(pending.selectedIds);
  if (selected.has(eventId)) selected.delete(eventId);
  else selected.add(eventId);
  setIcsImportSelection(Array.from(selected));
}

export function selectedIcsImportEvents(batch: IcsImportBatch | null = pending): CalendarEvent[] {
  if (!batch) return [];
  const selected = new Set(batch.selectedIds);
  return batch.events.filter((event) => selected.has(event.id));
}
