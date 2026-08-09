import type { NotificationLead } from "../../types";

export type NotifCategory = "task" | "deadline" | "event" | "focus" | "important";

/** Payload embedded in scheduled notifications for tap routing. */
export type NotifPayload = {
  category: NotifCategory;
  /** task id, event id, or "focus" */
  targetId: string;
  path?: string;
};

export type PlannedNotification = {
  /** Stable id used as expo identifier (cancel/reschedule). */
  id: string;
  title: string;
  body: string;
  /** When to fire (must be in the future). */
  fireAt: Date;
  payload: NotifPayload;
};

export type InboxItem = {
  id: string;
  title: string;
  subtitle: string;
  whenLabel: string;
  sortAt: number;
  bucket: "today" | "upcoming";
  payload: NotifPayload;
};

export const LEAD_MS: Record<NotificationLead, number> = {
  exact: 0,
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "30m": 30 * 60_000,
  "1h": 60 * 60_000,
  "1d": 24 * 60 * 60_000,
};

export const LEAD_LABELS: Record<NotificationLead, string> = {
  exact: "At the time",
  "5m": "5 minutes before",
  "15m": "15 minutes before",
  "30m": "30 minutes before",
  "1h": "1 hour before",
  "1d": "1 day before",
};

export const DEFAULT_LEADS: NotificationLead[] = ["1d", "1h", "exact"];
