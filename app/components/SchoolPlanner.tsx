"use client";

import { useMemo, useState } from "react";
import {
  BookOpen, CalendarDays, CheckSquare, ChevronLeft, ChevronRight, Clock3, Gem,
  GraduationCap, Grid2X2, Heart, Home, LayoutGrid, MoreHorizontal, PieChart,
  Plus, Search, Snowflake, Sparkles, Sun, Target, UserRound, X,
} from "lucide-react";
import "./SchoolPlanner.css";

export type SchoolView = "home" | "timetable" | "assignments" | "due" | "more";
export type SchoolHubKey = "topics" | "professors" | "goals";
export type SchoolHubState = {
  profile: { major?: string; minor?: string; classOf?: string };
  topics: { id: string; title: string; subtitle?: string; createdAt: string }[];
  professors: { id: string; title: string; subtitle?: string; createdAt: string }[];
  goals: { id: string; title: string; subtitle?: string; createdAt: string }[];
};

type DashboardTask = {
  id: number;
  title: string;
  project: string;
  color: string;
  due?: string;
  priority: string;
  classId?: string;
  academicType?: string;
  gradeWeight?: number;
  done?: boolean;
  canceled?: boolean;
  status?: string;
};
type DashboardClass = { id: string; code: string; name: string; term: string; instructor: string; color: string; archived?: boolean };
type DashboardNote = { id: string; title: string; body: string; classId?: string; updatedAt: string };
type DashboardEvent = { id: string; title: string; start: string; end?: string; color: string; notes?: string };

export type QuickCapturePayload = {
  title: string;
  kind: "Task" | "Deadline" | "Note";
  classId?: string;
  when: "today" | "tomorrow" | "custom";
  customDate?: string;
};

export type SchoolCalendarPayload = {
  title: string;
  label?: string;
  type: string;
  color: string;
  date: string;
  startTime?: string;
  endTime?: string;
};

const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const openTask = (task: DashboardTask) => !task.done && !task.canceled;
const weekWindow = () => {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + 7);
  return { today: dateKey(now), end: dateKey(end) };
};

const greetingFor = (date = new Date()) => {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

const firstName = (name: string) => name.trim().split(/\s+/)[0] || "there";

const startOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(12, 0, 0, 0);
  return d;
};

const formatWeekRange = (anchor: Date) => {
  const start = startOfWeek(anchor);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const left = start.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  const right = end.toLocaleDateString(undefined, sameMonth ? { day: "numeric" } : { day: "numeric", month: "short" });
  return `${left} to ${right}`;
};

const friendlyDue = (value: string | undefined, today: string) => {
  if (!value) return "No date";
  const key = value.slice(0, 10);
  if (key === today) return "Today";
  const tomorrow = new Date(`${today}T12:00:00`);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (key === dateKey(tomorrow)) return "Tomorrow";
  return new Date(`${key}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const EVENT_TYPES = ["Club", "Appointment", "Study", "To-do", "Personal", "Deadline", "Shift", "Exam"] as const;
const EVENT_COLORS = ["#3aa8c5", "#2bb8a4", "#5b9ad8", "#6db58a", "#4f8f9e", "#7ec4b8", "#4a7ea8"] as const;

const MORE_LINKS: { key: SchoolHubKey | "grades" | "exams" | "wellness" | "reminders" | "reading" | "progress" | "study"; label: string; icon: typeof Clock3 }[] = [
  { key: "study", label: "Study", icon: Clock3 },
  { key: "grades", label: "Grades & what-if", icon: PieChart },
  { key: "exams", label: "Exam tracker", icon: LayoutGrid },
  { key: "goals", label: "Goals", icon: Gem },
  { key: "wellness", label: "Wellness check-in", icon: Snowflake },
  { key: "reminders", label: "Reminders", icon: Target },
  { key: "reading", label: "Reading tracker", icon: BookOpen },
  { key: "topics", label: "Subjects", icon: Sparkles },
  { key: "progress", label: "Weekly progress", icon: CheckSquare },
];

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="sp-sheet-layer" onMouseDown={onClose} data-testid="school-sheet">
      <div className="sp-sheet" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-label={title}>
        <div className="sp-grabber" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <p className="sp-sheet-title" style={{ margin: 0 }}>{title}</p>
          <button type="button" aria-label="Close" onClick={onClose} style={{ position: "absolute", right: 0, border: 0, background: "transparent", color: "var(--sp-muted)" }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function QuickCaptureSheet({
  courses,
  onClose,
  onCapture,
}: {
  courses: DashboardClass[];
  onClose: () => void;
  onCapture: (payload: QuickCapturePayload) => void;
}) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<QuickCapturePayload["kind"]>("Task");
  const [classId, setClassId] = useState(courses[0]?.id);
  const [when, setWhen] = useState<QuickCapturePayload["when"]>("today");
  const [customDate, setCustomDate] = useState("");
  const [pickingSubject, setPickingSubject] = useState(false);
  const selected = courses.find((course) => course.id === classId);

  const submit = () => {
    if (!title.trim()) return;
    onCapture({ title: title.trim(), kind, classId, when, customDate: customDate || undefined });
    onClose();
  };

  return (
    <Sheet title="Quick Capture" onClose={onClose}>
      <textarea
        className="sp-textarea"
        data-testid="school-capture-input"
        autoFocus
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Type anything, a task, deadline, note..."
      />
      <div className="sp-pill-row" style={{ marginTop: 12 }}>
        {(["Task", "Deadline", "Note"] as const).map((item) => (
          <button key={item} type="button" className={`sp-pill ${kind === item ? "selected" : ""}`} onClick={() => setKind(item)}>
            {item}
          </button>
        ))}
      </div>

      {kind !== "Note" && (
        <>
          <span className="sp-label">Subject</span>
          <button
            type="button"
            className={`sp-subject-pill ${selected ? "" : "idle"}`}
            onClick={() => setPickingSubject((value) => !value)}
            data-testid="school-capture-subject"
          >
            {selected ? <><i style={{ background: selected.color }} />{selected.name}</> : "Pick a subject"}
          </button>
          {pickingSubject && (
            <div className="sp-subject-list">
              {courses.length ? courses.map((course) => (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => { setClassId(course.id); setPickingSubject(false); }}
                >
                  <i style={{ background: course.color }} />
                  {course.name}
                </button>
              )) : <p className="sp-helper">Add a class from Timetable first.</p>}
            </div>
          )}

          <span className="sp-label">When</span>
          <div className="sp-pill-row">
            <button type="button" className={`sp-pill ${when === "today" ? "selected" : ""}`} onClick={() => setWhen("today")}>Today</button>
            <button type="button" className={`sp-pill ${when === "tomorrow" ? "selected" : ""}`} onClick={() => setWhen("tomorrow")}>Tomorrow</button>
            <button type="button" className={`sp-pill outline ${when === "custom" ? "selected" : ""}`} onClick={() => setWhen("custom")}>
              {customDate || "Pick day"}
            </button>
          </div>
          {when === "custom" && (
            <input className="sp-input" style={{ marginTop: 8 }} type="date" value={customDate} onChange={(event) => setCustomDate(event.target.value)} />
          )}
          <p className="sp-helper">A to-do for today, or pick a day ahead.</p>
        </>
      )}

      <button type="button" className="sp-primary" data-testid="school-capture-submit" disabled={!title.trim()} onClick={submit}>
        Capture it
      </button>
    </Sheet>
  );
}

function AddCalendarSheet({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (payload: SchoolCalendarPayload) => void;
}) {
  const today = dateKey(new Date());
  const [title, setTitle] = useState("");
  const [label, setLabel] = useState("");
  const [type, setType] = useState<string>("Club");
  const [color, setColor] = useState<string>("auto");
  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const submit = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      label: label.trim() || undefined,
      type,
      color: color === "auto" ? EVENT_COLORS[EVENT_TYPES.indexOf(type as typeof EVENT_TYPES[number])] || EVENT_COLORS[0] : color,
      date,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
    });
    onClose();
  };

  return (
    <Sheet title="Add to Calendar" onClose={onClose}>
      <input className="sp-input" data-testid="school-event-title" autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Event title" />
      <input className="sp-input" style={{ marginTop: 10 }} value={label} onChange={(event) => setLabel(event.target.value)} placeholder="e.g. Club, Appointment, Gym" />
      <p className="sp-helper">Your own category name, shown instead of the type.</p>

      <span className="sp-label muted">Type</span>
      <div className="sp-type-grid">
        {EVENT_TYPES.map((item) => (
          <button key={item} type="button" className={`sp-type-chip ${type === item ? "selected" : ""}`} onClick={() => setType(item)}>
            {item}
          </button>
        ))}
      </div>

      <span className="sp-label muted">Colour</span>
      <div className="sp-color-row">
        <button type="button" className={`sp-swatch auto ${color === "auto" ? "selected" : ""}`} onClick={() => setColor("auto")}>Auto</button>
        {EVENT_COLORS.map((swatch) => (
          <button key={swatch} type="button" className={`sp-swatch ${color === swatch ? "selected" : ""}`} style={{ background: swatch }} onClick={() => setColor(swatch)} aria-label={swatch} />
        ))}
      </div>

      <span className="sp-label muted">Date</span>
      <input className="sp-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      <div className="sp-time-row" style={{ marginTop: 10 }}>
        <div>
          <span className="sp-label muted" style={{ marginTop: 0 }}>Starts (optional)</span>
          <input className="sp-input" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
        </div>
        <div>
          <span className="sp-label muted" style={{ marginTop: 0 }}>Ends (optional)</span>
          <input className="sp-input" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
        </div>
      </div>

      <button type="button" className="sp-primary" data-testid="school-event-submit" disabled={!title.trim()} onClick={submit}>
        Add to calendar
      </button>
    </Sheet>
  );
}

export function SchoolDashboard({
  tasks,
  classes,
  notes,
  events: _events = [],
  school: _school,
  schoolView: controlledView,
  onChangeView,
  workspaceName = "there",
  workspaceEmail,
  onComplete,
  onOpenTask,
  onOpenClass,
  onOpenNote,
  onNewCourse,
  onNewAcademic,
  onNewLecture,
  onOpenCollection,
  onOpenProfile,
  onFocus,
  onOpenCalendar,
  onOpenSettings,
  onImportTimetable,
  onQuickCapture,
  onAddCalendarEvent,
  enableMasterOS = true,
}: {
  tasks: DashboardTask[];
  classes: DashboardClass[];
  notes: DashboardNote[];
  events?: DashboardEvent[];
  school: SchoolHubState;
  schoolView?: SchoolView | string;
  onChangeView?: (view: SchoolView) => void;
  workspaceName?: string;
  workspaceEmail?: string;
  schoolFocusTaskId?: number | null;
  onSelectFocusTask?: (id: number) => void;
  onComplete: (id: number) => void;
  onOpenTask: (id: number) => void;
  onOpenClass: (id: string) => void;
  onOpenNote: (id: string) => void;
  onNewCourse: () => void;
  onNewAcademic: () => void;
  onNewLecture: () => void;
  onOpenCollection: (key: SchoolHubKey, startAdd?: boolean) => void;
  onOpenProfile: () => void;
  onFocus: (id: number) => void;
  onOpenCalendar?: () => void;
  onOpenSettings?: () => void;
  onImportTimetable?: () => void;
  onQuickCapture?: (payload: QuickCapturePayload) => void;
  onAddCalendarEvent?: (payload: SchoolCalendarPayload) => void;
  onUpdateTaskStatus?: (id: number, status: "Not started" | "In progress" | "Blocked" | "Done") => void;
  enableMasterOS?: boolean;
}) {
  const normalizeView = (value?: string): SchoolView => {
    if (value === "timetable" || value === "assignments" || value === "due" || value === "more" || value === "home") return value;
    if (value === "courses" || value === "board" || value === "activity" || value === "notes" || value === "tasks" || value === "dashboard") return "home";
    return "home";
  };

  const [internalView, setInternalView] = useState<SchoolView>("home");
  const [sheet, setSheet] = useState<"capture" | "calendar" | null>(null);
  const [timetableMode, setTimetableMode] = useState<"day" | "week">("day");
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const schoolView = normalizeView(controlledView ?? internalView);
  const setSchoolView = (view: SchoolView) => {
    onChangeView?.(view);
    if (controlledView === undefined) setInternalView(view);
  };

  const now = new Date();
  const { today, end } = weekWindow();
  const courses = classes.filter((item) => !item.archived);
  const terms = useMemo(() => {
    const unique = Array.from(new Set(courses.map((course) => course.term).filter(Boolean)));
    return unique.length ? unique : ["Fall"];
  }, [courses]);
  const [term, setTerm] = useState(terms[0] ?? "Fall");
  const termCourses = courses.filter((course) => !course.term || course.term === term || terms.length === 1);

  const schoolTasks = tasks.filter((task) => task.classId && openTask(task));
  const dueThisWeek = schoolTasks.filter((task) => task.due && task.due >= today && task.due <= end);
  const assignments = schoolTasks
    .filter((task) => task.academicType && !["Reading", "Discussion"].includes(task.academicType))
    .sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));
  const classesThisWeek = termCourses.length;
  const courseFor = (id?: string) => courses.find((course) => course.id === id);
  const initials = workspaceName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "U";

  const shiftWeek = (delta: number) => {
    setWeekAnchor((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + delta * 7);
      return next;
    });
  };

  const openFab = () => setSheet("calendar");

  const body = (() => {
    if (schoolView === "timetable") {
      return (
        <div className="sp-stack" data-testid="school-timetable">
          <div className="sp-page-head">
            <div>
              <p className="sp-section-kicker">Your classes</p>
              <h1 className="sp-section-title">Timetable</h1>
            </div>
            <div className="sp-page-actions">
              <button type="button" className="sp-outline" onClick={onNewCourse}><Plus size={14} /> Class</button>
              <button type="button" className="sp-outline" onClick={() => onImportTimetable?.()}>Import</button>
            </div>
          </div>

          <div className="sp-toolbar-row">
            <div className="sp-toggle" role="tablist" aria-label="Timetable mode">
              <button type="button" className={timetableMode === "day" ? "selected" : ""} onClick={() => setTimetableMode("day")}>Day</button>
              <button type="button" className={timetableMode === "week" ? "selected" : ""} onClick={() => setTimetableMode("week")}>Week</button>
            </div>
            <select className="sp-term-select" value={term} onChange={(event) => setTerm(event.target.value)} aria-label="Term">
              {terms.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>

          <div className="sp-week-nav">
            <button type="button" aria-label="Previous week" onClick={() => shiftWeek(-1)}><ChevronLeft size={16} /></button>
            <span>This week {formatWeekRange(weekAnchor)}</span>
            <button type="button" aria-label="Next week" onClick={() => shiftWeek(1)}><ChevronRight size={16} /></button>
          </div>

          {termCourses.length === 0 ? (
            <div className="sp-card sp-stack" style={{ textAlign: "center", padding: "36px 22px" }}>
              <p style={{ margin: 0, fontSize: 15, color: "var(--sp-muted)" }}>Nothing in your {term} term yet.</p>
              <button type="button" className="sp-primary" onClick={() => onImportTimetable?.()}>Import my timetable</button>
              <p className="sp-hint">Most universities export an .ics from Moodle, Canvas, TimeEdit or Outlook.</p>
              <button type="button" className="sp-outline" style={{ justifySelf: "center" }} onClick={onNewCourse}>Or add a class by hand</button>
            </div>
          ) : (
            <div className="sp-class-list">
              {termCourses.map((course) => (
                <button key={course.id} type="button" className="sp-class-item" onClick={() => onOpenClass(course.id)}>
                  <i style={{ background: course.color }} />
                  <span>
                    <strong>{course.code}</strong>
                    <small>{course.name}{course.instructor ? ` · ${course.instructor}` : ""}</small>
                  </span>
                </button>
              ))}
            </div>
          )}

          <button type="button" className="sp-link-row" onClick={() => setSheet("capture")}>
            <span className="sp-dot" />
            <span style={{ flex: 1 }}>Free blocks this week, drop a study session?</span>
          </button>
          <button type="button" className="sp-link-row muted" onClick={onOpenProfile}>
            <span style={{ flex: 1 }}>Semester overview</span>
            <ChevronRight size={16} className="sp-chevron" />
          </button>
          <button type="button" className="sp-link-row" onClick={() => setSheet("calendar")}>
            <span style={{ flex: 1 }}>Clubs, appointments and everything else</span>
            <span>Calendar <ChevronRight size={14} /></span>
          </button>
        </div>
      );
    }

    if (schoolView === "assignments") {
      return (
        <div className="sp-stack" data-testid="school-assignments">
          <div className="sp-page-head">
            <div>
              <h1 className="sp-section-title">Assignments</h1>
              <p className="sp-section-sub">Soonest due first · {assignments.length} to do</p>
            </div>
            <div className="sp-page-actions">
              <button type="button" className="sp-outline" onClick={onNewAcademic}>Paste syllabus</button>
              <button type="button" className="sp-outline" onClick={onNewAcademic} data-testid="school-new-assignment"><Plus size={14} /> New</button>
            </div>
          </div>
          {assignments.length ? (
            <div className="sp-task-list">
              {assignments.map((task) => (
                <button key={task.id} type="button" className="sp-task" onClick={() => onOpenTask(task.id)}>
                  <span className="sp-task-dot" style={{ background: courseFor(task.classId)?.color ?? "var(--sp-pink)" }} />
                  <span>
                    <strong>{task.title}</strong>
                    <small>{courseFor(task.classId)?.code ?? "School"} · {task.academicType ?? "Assignment"} · {friendlyDue(task.due, today)}</small>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="sp-empty-card">No assignments yet. Tap &apos;+ New&apos; to add your first.</div>
          )}
        </div>
      );
    }

    if (schoolView === "due") {
      return (
        <div className="sp-stack" data-testid="school-due">
          <button type="button" className="sp-back" onClick={() => setSchoolView("home")}><ChevronLeft size={14} /> Home</button>
          <h1 className="sp-section-title">What&apos;s due</h1>
          <p className="sp-section-sub">{dueThisWeek.length} due this week</p>
          {dueThisWeek.length ? (
            <div className="sp-task-list">
              {dueThisWeek.map((task) => (
                <button key={task.id} type="button" className="sp-task" onClick={() => onOpenTask(task.id)}>
                  <span className="sp-task-dot" style={{ background: courseFor(task.classId)?.color ?? "var(--sp-pink)" }} />
                  <span>
                    <strong>{task.title}</strong>
                    <small>{courseFor(task.classId)?.code ?? "School"} · {friendlyDue(task.due, today)}</small>
                  </span>
                  <button
                    type="button"
                    aria-label={`Complete ${task.title}`}
                    onClick={(event) => { event.stopPropagation(); onComplete(task.id); }}
                    style={{ border: 0, background: "transparent", color: "var(--sp-muted)" }}
                  >
                    <CheckSquare size={18} />
                  </button>
                </button>
              ))}
            </div>
          ) : (
            <div className="sp-empty-card">
              <span>Nothing due. Enjoy it <Heart size={14} className="sp-heart" fill="currentColor" style={{ display: "inline", verticalAlign: "-2px" }} /></span>
            </div>
          )}
        </div>
      );
    }

    if (schoolView === "more") {
      return (
        <div className="sp-stack" data-testid="school-more">
          <div className="sp-more-profile">
            <div className="sp-avatar">{initials}</div>
            <div>
              <strong>{workspaceName}</strong>
              <small>{workspaceEmail || "Personal workspace"} · synced <Heart size={11} className="sp-heart" fill="currentColor" style={{ display: "inline", verticalAlign: "-1px" }} /></small>
            </div>
          </div>

          <div className="sp-menu-card">
            {MORE_LINKS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    if (item.key === "topics" || item.key === "goals" || item.key === "professors") onOpenCollection(item.key);
                    else if (item.key === "study") {
                      if (schoolTasks[0]) onFocus(schoolTasks[0].id);
                      else setSheet("capture");
                    }
                    else if (item.key === "exams") setSchoolView("assignments");
                    else if (item.key === "grades" || item.key === "progress") setSchoolView("due");
                    else onOpenProfile();
                  }}
                >
                  <span className="sp-menu-icon"><Icon size={16} /></span>
                  {item.label}
                  <ChevronRight size={16} />
                </button>
              );
            })}
            {enableMasterOS && (
              <a href="/masteros" style={{ display: "flex", alignItems: "center", gap: 12, padding: "15px 16px", textDecoration: "none", color: "var(--sp-ink)", fontSize: 14, fontWeight: 550, borderTop: "1px solid var(--sp-line)" }}>
                <span className="sp-menu-icon"><GraduationCap size={16} /></span>
                MasterOS
                <ChevronRight size={16} style={{ marginLeft: "auto", color: "var(--sp-muted)" }} />
              </a>
            )}
          </div>

          <div className="sp-menu-card">
            <button type="button" onClick={() => onOpenSettings?.()}>
              <span className="sp-menu-icon"><Sun size={16} /></span>
              Appearance
              <span className="sp-menu-meta">Mist</span>
            </button>
            <button type="button" onClick={onOpenProfile}>
              <span className="sp-menu-icon"><UserRound size={16} /></span>
              Academic profile
              <ChevronRight size={16} />
            </button>
            <button type="button" onClick={onNewLecture}>
              <span className="sp-menu-icon"><BookOpen size={16} /></span>
              Lecture notes
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="sp-stack" data-testid="school-home">
        <div className="sp-home-header">
          <div>
            <p className="sp-date">{now.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" }).toUpperCase()}</p>
            <h1>{greetingFor(now)}, {firstName(workspaceName)}</h1>
          </div>
          <div className="sp-home-actions">
            <button type="button" className="sp-ghost-btn" onClick={onOpenProfile}>Customize</button>
            <button type="button" className="sp-icon-btn" aria-label="Search" onClick={() => setSheet("capture")}><Search size={16} /></button>
            <button type="button" className="sp-avatar" aria-label="Profile" onClick={() => setSchoolView("more")}>{initials.slice(0, 1)}</button>
          </div>
        </div>

        {courses.length === 0 && (
          <button type="button" className="sp-alert" onClick={() => setSchoolView("timetable")} data-testid="school-empty-timetable-alert">
            <span className="sp-alert-dot" />
            <span>No classes on your timetable yet. <strong>Add one from the Timetable tab.</strong></span>
          </button>
        )}

        <div className="sp-stat-row">
          <button type="button" className="sp-stat-card" onClick={() => setSchoolView("due")} data-testid="school-due-stat">
            <span>Due this week</span>
            <strong>{dueThisWeek.length}</strong>
          </button>
          <button type="button" className="sp-stat-card" onClick={() => setSchoolView("timetable")}>
            <span>Class this week</span>
            <strong>{classesThisWeek}</strong>
          </button>
        </div>

        <button type="button" className="sp-card" style={{ textAlign: "left", border: 0, cursor: "pointer", width: "100%" }} onClick={() => setSheet("capture")} data-testid="school-open-capture">
          <p className="sp-section-kicker" style={{ color: "var(--sp-pink)" }}>Quick capture</p>
          <p style={{ margin: "6px 0 0", color: "var(--sp-muted)", fontSize: 14 }}>Type anything, a task, deadline, note...</p>
        </button>

        {dueThisWeek.length > 0 && (
          <div className="sp-stack">
            <p className="sp-section-kicker">Coming up</p>
            <div className="sp-task-list">
              {dueThisWeek.slice(0, 4).map((task) => (
                <button key={task.id} type="button" className="sp-task" onClick={() => onOpenTask(task.id)}>
                  <span className="sp-task-dot" style={{ background: courseFor(task.classId)?.color ?? "var(--sp-pink)" }} />
                  <span>
                    <strong>{task.title}</strong>
                    <small>{courseFor(task.classId)?.code ?? "School"} · {friendlyDue(task.due, today)}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {notes.filter((note) => note.classId).slice(0, 1).length > 0 && null}
      </div>
    );
  })();

  return (
    <div className="school-planner" data-testid="school-planner">
      <div className="sp-shell">{body}</div>

      <nav className="sp-bottom-nav" aria-label="SchoolOS">
        <button type="button" className={schoolView === "home" || schoolView === "due" ? "selected" : ""} onClick={() => setSchoolView("home")} data-testid="school-nav-home">
          <Home size={20} strokeWidth={1.7} />
          Home
        </button>
        <button type="button" className={schoolView === "timetable" ? "selected" : ""} onClick={() => setSchoolView("timetable")} data-testid="school-nav-timetable">
          <Grid2X2 size={20} strokeWidth={1.7} />
          Timetable
        </button>
        <button type="button" onClick={openFab} data-testid="school-nav-calendar" aria-label="Add to calendar">
          <span className="sp-fab"><Plus size={26} strokeWidth={2.2} /></span>
          <span className="sp-fab-label">Calendar</span>
        </button>
        <button type="button" className={schoolView === "assignments" ? "selected" : ""} onClick={() => setSchoolView("assignments")} data-testid="school-nav-assignments">
          <CalendarDays size={20} strokeWidth={1.7} />
          Assignments
        </button>
        <button type="button" className={schoolView === "more" ? "selected" : ""} onClick={() => setSchoolView("more")} data-testid="school-nav-more">
          <MoreHorizontal size={20} strokeWidth={1.7} />
          More
        </button>
      </nav>

      {sheet === "capture" && (
        <QuickCaptureSheet
          courses={courses}
          onClose={() => setSheet(null)}
          onCapture={(payload) => onQuickCapture?.(payload)}
        />
      )}
      {sheet === "calendar" && (
        <AddCalendarSheet
          onClose={() => setSheet(null)}
          onSave={(payload) => onAddCalendarEvent?.(payload)}
        />
      )}
    </div>
  );
}
