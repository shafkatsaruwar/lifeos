"use client";

import { Clock3 } from "lucide-react";
import {
  clockIn,
  clockOut,
  entryDurationMinutes,
  formatClockTime,
  formatDurationMinutes,
  getActiveEntry,
  type TimeTrackingState,
} from "@/lib/timeTracking";

type Props = {
  timeTracking: TimeTrackingState;
  onChange: (next: TimeTrackingState) => void;
  onOpenTimesheet: () => void;
  nowMs?: number;
  workTitle?: string;
  onFlash?: (message: string) => void;
};

export function TimesheetNowStrip({ timeTracking, onChange, onOpenTimesheet, nowMs = Date.now(), workTitle, onFlash }: Props) {
  const active = getActiveEntry(timeTracking);
  const client = timeTracking.defaultClientName;

  if (active) {
    const label = active.clientName || client || "Contractor";
    return (
      <section className="timesheet-active-strip">
        <div>
          <strong>{active.title || "Work session"}</strong>
          <small>
            {label} · started {formatClockTime(active.clockInAt)} · {formatDurationMinutes(entryDurationMinutes(active, nowMs))} so far
          </small>
        </div>
        <div>
          <button
            type="button"
            onClick={() => {
              onChange(clockOut(timeTracking));
              onFlash?.("Clocked out");
            }}
          >
            Clock out
          </button>
          <button type="button" onClick={onOpenTimesheet}>Timesheet</button>
        </div>
      </section>
    );
  }

  return (
    <section className="timesheet-active-strip timesheet-now-idle">
      <div>
        <strong>Timesheet</strong>
        <small>{client ? `${client} · ready to clock in` : "Track billable hours for your contractor"}</small>
      </div>
      <div>
        <button
          type="button"
          onClick={() => {
            onChange(clockIn(timeTracking, {
              clientName: client,
              title: workTitle?.trim() || "Work session",
            }));
            onFlash?.("Clocked in");
          }}
        >
          <Clock3 size={14} /> Clock in
        </button>
        <button type="button" onClick={onOpenTimesheet}>Open timesheet</button>
      </div>
    </section>
  );
}
