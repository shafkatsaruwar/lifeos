"use client";

import { useEffect, useMemo, useState } from "react";
import { Bookmark, Clock3, Download, ListTodo, Plus, Trash2 } from "lucide-react";
import type { WorkProject } from "@/app/components/OSDashboards";
import {
  addDaysToDateKey,
  addManualEntry,
  clockIn,
  clockOut,
  deleteTimeEntry,
  entriesForWeek,
  entryDurationMinutes,
  formatClockDate,
  formatClockTime,
  formatDurationMinutes,
  fromDatetimeLocalValue,
  getActiveEntry,
  toDatetimeLocalValue,
  updateTimeEntry,
  weekStartKey,
  weekTotalMinutes,
  exportTimesheetCsv,
  saveContractor,
  type TimeTrackingState,
} from "@/lib/timeTracking";

type Props = {
  timeTracking: TimeTrackingState;
  projects: WorkProject[];
  weekStartsMonday?: boolean;
  onChange: (next: TimeTrackingState) => void;
  onFlash?: (message: string) => void;
};

export function TimesheetPanel({ timeTracking, projects, weekStartsMonday = false, onChange, onFlash }: Props) {
  const [weekKey, setWeekKey] = useState(() => weekStartKey(new Date(), weekStartsMonday));
  const [draftTitle, setDraftTitle] = useState("");
  const [draftClient, setDraftClient] = useState(() => timeTracking.defaultClientName ?? "");
  const [draftProjectId, setDraftProjectId] = useState("");
  const savedClients = timeTracking.savedClients ?? [];
  const active = getActiveEntry(timeTracking);
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active?.id]);

  useEffect(() => {
    if (!active) return;
    setDraftClient(active.clientName ?? timeTracking.defaultClientName ?? "");
    setDraftTitle(active.title ?? "");
    setDraftProjectId(active.projectId ?? "");
  }, [active?.id, active?.clientName, active?.title, active?.projectId, timeTracking.defaultClientName]);
  const weekEntries = useMemo(() => entriesForWeek(timeTracking, weekKey), [timeTracking, weekKey]);
  const weekTotal = weekTotalMinutes(weekEntries);
  const projectName = (projectId?: string) => projects.find((item) => item.id === projectId)?.name ?? "";

  const handleClockToggle = () => {
    if (active) {
      onChange(clockOut(timeTracking));
      onFlash?.("Clocked out");
      return;
    }
    onChange(clockIn(timeTracking, {
      projectId: draftProjectId || undefined,
      clientName: draftClient,
      title: draftTitle || "Work session",
    }));
    onFlash?.("Clocked in");
  };

  const handleAddManual = () => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(9, 0, 0, 0);
    const end = new Date(now);
    end.setHours(10, 0, 0, 0);
    onChange(addManualEntry(timeTracking, {
      clockInAt: start.toISOString(),
      clockOutAt: end.toISOString(),
      projectId: draftProjectId || undefined,
      clientName: draftClient,
      title: draftTitle || "Manual entry",
    }));
    onFlash?.("Manual time entry added");
  };

  const handleExport = () => {
    const csv = exportTimesheetCsv(weekEntries, projectName);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lifeos-timesheet-${weekKey}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onFlash?.("Timesheet exported for contractor");
  };

  const handleSaveContractor = () => {
    const trimmed = draftClient.trim();
    if (!trimmed) {
      onFlash?.("Enter a contractor name to save");
      return;
    }
    onChange(saveContractor(timeTracking, trimmed));
    onFlash?.(`Saved contractor: ${trimmed}`);
  };

  return (
    <div className="timesheet-panel">
      <div className="timesheet-clock-card">
        <div>
          <p className="eyebrow">TIME TRACKING</p>
          <strong>{active ? "Clocked in" : "Ready to clock in"}</strong>
          <p className="timesheet-sub">
            {active
              ? `${formatClockDate(active.clockInAt)} · ${formatClockTime(active.clockInAt)} · ${formatDurationMinutes(entryDurationMinutes(active, tick))} so far`
              : "Track billable hours for your contractor timesheet."}
          </p>
        </div>
        <div className="timesheet-clock-fields">
          <div className="timesheet-client-field">
            <input
              value={draftClient}
              onChange={(event) => setDraftClient(event.target.value)}
              list="timesheet-saved-contractors"
              placeholder="Client / contractor"
            />
            <datalist id="timesheet-saved-contractors">
              {savedClients.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            <button type="button" className="timesheet-save-contractor" onClick={handleSaveContractor} title="Save contractor">
              <Bookmark size={14} /> Save
            </button>
          </div>
          <select value={draftProjectId} onChange={(event) => setDraftProjectId(event.target.value)}>
            <option value="">Project (optional)</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
          <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} placeholder="What are you working on?" />
        </div>
        <div className="timesheet-clock-actions">
          <button type="button" className={active ? "danger" : "primary"} onClick={handleClockToggle}>
            <Clock3 size={16} /> {active ? "Clock out" : "Clock in"}
          </button>
          <button type="button" onClick={handleAddManual}><Plus size={15} /> Add manual entry</button>
          <button type="button" onClick={handleExport}><Download size={15} /> Export CSV</button>
        </div>
      </div>

      <div className="timesheet-week-bar">
        <button type="button" onClick={() => setWeekKey(addDaysToDateKey(weekKey, -7))}>← Previous week</button>
        <div>
          <strong>Week of {formatClockDate(`${weekKey}T12:00:00`)}</strong>
          <span>{formatDurationMinutes(weekTotal)} logged</span>
        </div>
        <button type="button" onClick={() => setWeekKey(addDaysToDateKey(weekKey, 7))}>Next week →</button>
      </div>

      <div className="timesheet-table-wrap">
        <table className="timesheet-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Client</th>
              <th>Project</th>
              <th>Title</th>
              <th>Clock in</th>
              <th>Clock out</th>
              <th>Hours</th>
              <th>Note</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {weekEntries.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.clockInAt.slice(0, 10)}</td>
                <td>
                  <input
                    value={entry.clientName ?? ""}
                    onChange={(event) => onChange(updateTimeEntry(timeTracking, entry.id, { clientName: event.target.value }))}
                    placeholder="Client"
                  />
                </td>
                <td>
                  <select
                    value={entry.projectId ?? ""}
                    onChange={(event) => onChange(updateTimeEntry(timeTracking, entry.id, { projectId: event.target.value || undefined }))}
                  >
                    <option value="">—</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    value={entry.title ?? ""}
                    onChange={(event) => onChange(updateTimeEntry(timeTracking, entry.id, { title: event.target.value }))}
                    placeholder="Work description"
                  />
                </td>
                <td>
                  <input
                    type="datetime-local"
                    value={toDatetimeLocalValue(entry.clockInAt)}
                    onChange={(event) => {
                      const iso = fromDatetimeLocalValue(event.target.value);
                      if (iso) onChange(updateTimeEntry(timeTracking, entry.id, { clockInAt: iso }));
                    }}
                  />
                </td>
                <td>
                  <input
                    type="datetime-local"
                    value={entry.clockOutAt ? toDatetimeLocalValue(entry.clockOutAt) : ""}
                    onChange={(event) => {
                      const iso = fromDatetimeLocalValue(event.target.value);
                      onChange(updateTimeEntry(timeTracking, entry.id, { clockOutAt: iso ?? undefined }));
                    }}
                  />
                </td>
                <td>{(entryDurationMinutes(entry) / 60).toFixed(2)}</td>
                <td>
                  <input
                    value={entry.note ?? ""}
                    onChange={(event) => onChange(updateTimeEntry(timeTracking, entry.id, { note: event.target.value }))}
                    placeholder="Notes"
                  />
                </td>
                <td>
                  <button type="button" aria-label="Delete entry" onClick={() => onChange(deleteTimeEntry(timeTracking, entry.id))}>
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!weekEntries.length && (
          <div className="timesheet-empty">
            <ListTodo size={18} />
            <strong>No time entries this week.</strong>
            <p>Clock in when you start work, or add a manual row for past hours.</p>
          </div>
        )}
      </div>
    </div>
  );
}
