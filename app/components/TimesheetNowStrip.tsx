"use client";

import { useEffect, useState } from "react";
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

export function TimesheetNowStrip({ timeTracking, onChange, onOpenTimesheet, nowMs, workTitle, onFlash }: Props) {
  const [tick, setTick] = useState(() => nowMs ?? Date.now());
  const active = getActiveEntry(timeTracking);
  const client = timeTracking.defaultClientName;

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active?.id]);

  const now = active ? tick : (nowMs ?? Date.now());

  const handleToggle = () => {
    if (active) {
      onChange(clockOut(timeTracking));
      onFlash?.("Clocked out");
      return;
    }
    onChange(clockIn(timeTracking, {
      clientName: client,
      title: workTitle?.trim() || "Work session",
    }));
    onFlash?.("Clocked in");
  };

  return (
    <section className={`timesheet-active-strip ${active ? "timesheet-active-running" : "timesheet-now-idle"}`}>
      <div>
        <strong>{active ? (active.title || "Work session") : "Timesheet"}</strong>
        <small>
          {active
            ? `${active.clientName || client || "Contractor"} · started ${formatClockTime(active.clockInAt)} · ${formatDurationMinutes(entryDurationMinutes(active, now))} so far`
            : client
              ? `${client} · ready to clock in`
              : "Track billable hours for your contractor"}
        </small>
      </div>
      <div>
        <button type="button" className={active ? "danger" : "primary"} onClick={handleToggle}>
          <Clock3 size={14} /> {active ? "Clock out" : "Clock in"}
        </button>
        <button type="button" onClick={onOpenTimesheet}>{active ? "Timesheet" : "Open timesheet"}</button>
      </div>
    </section>
  );
}
