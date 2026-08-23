"use client";

import { useEffect, useState } from "react";
import { fallbackCoachDay } from "@/lib/focusFlow/fallbacks";
import type { CoachDayPlan, CoachRecommendation } from "@/lib/focusFlow/types";

type Task = { id: number; title: string; due?: string; priority?: string; focusMinutes?: number };
type CalendarEvent = { title: string; start: string; end?: string; color: string };

function eventOccursOnDate(event: CalendarEvent, dayKey: string) {
  return event.start.slice(0, 10) === dayKey;
}

export function DailyCoachPanel({
  today,
  tasks,
  events,
  currentTaskId,
  onApply,
  onOpenCalendar,
}: {
  today: string;
  tasks: Task[];
  events: CalendarEvent[];
  currentTaskId: number | null;
  onApply: (rec: CoachRecommendation) => void;
  onOpenCalendar: () => void;
}) {
  const [coach, setCoach] = useState<CoachDayPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const todayEvents = events.filter(event => eventOccursOnDate(event, today)).sort((a, b) => a.start.localeCompare(b.start));

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setBusy(true);
      const dayEvents = events.filter(event => eventOccursOnDate(event, today)).sort((a, b) => a.start.localeCompare(b.start));
      const context = {
        currentTaskId,
        tasks: tasks.slice(0, 12).map(task => ({
          id: task.id,
          title: task.title,
          due: task.due,
          priority: task.priority,
          focusMinutes: task.focusMinutes,
        })),
        events: dayEvents.map(event => ({ title: event.title, start: event.start })),
      };
      try {
        const response = await fetch("/api/ai", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "coach-day", today, context }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (!cancelled) setCoach(data.coach);
      } catch {
        if (!cancelled) {
          setCoach(fallbackCoachDay({ today, tasks, events: dayEvents, currentTaskId }));
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [currentTaskId, events, tasks, today]);

  const dayLabel = new Date(`${today}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric" });

  return (
    <div className="focus-flow-coach">
      <div className="focus-flow-coach-grid">
        <section className="focus-flow-card">
          <div className="focus-flow-coach-head">
            <p className="eyebrow">Today</p>
            <strong>{dayLabel}</strong>
          </div>
          {todayEvents.length ? todayEvents.slice(0, 5).map(event => (
            <div key={`${event.title}-${event.start}`} className="focus-flow-calendar-block" style={{ borderColor: event.color }}>
              <span>{event.title}</span>
              <small>{event.start.slice(11, 16)}{event.end ? ` – ${event.end.slice(11, 16)}` : ""}</small>
            </div>
          )) : (
            <p className="focus-flow-muted">No blocks yet. Protect your best hours.</p>
          )}
          <button type="button" className="linkish" onClick={onOpenCalendar}>Open calendar</button>
        </section>

        <section className="focus-flow-card">
          <div className="focus-flow-coach-head">
            <strong>{busy ? "Reading your day…" : coach?.headline ?? "Daily coach"}</strong>
            {coach?.summary ? <p>{coach.summary}</p> : null}
          </div>
          <p className="eyebrow">Recommended</p>
          {(coach?.recommendations ?? []).map(rec => (
            <div key={rec.id} className="focus-flow-rec-row">
              <span>{rec.text}</span>
              <button type="button" onClick={() => onApply(rec)}>Apply</button>
            </div>
          ))}
          {coach?.looksGood?.length ? (
            <>
              <p className="eyebrow">Looks good</p>
              {coach.looksGood.map(item => <p key={item} className="focus-flow-muted">{item}</p>)}
            </>
          ) : null}
          {coach?.needsWork?.length ? (
            <>
              <p className="eyebrow">Needs work</p>
              {coach.needsWork.map(item => <p key={item} className="focus-flow-muted">{item}</p>)}
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
