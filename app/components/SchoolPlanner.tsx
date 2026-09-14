"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  BookOpen, CalendarDays, CheckSquare, ChevronLeft, ChevronRight, Clock3,
  Database, FileText, FolderKanban, Gem, GraduationCap, Heart, LayoutGrid, ListTodo,
  MoreHorizontal, PieChart, Plus, Snowflake, Sparkles, Sun, Target, Upload, UserRound, X, Zap,
} from "lucide-react";
import { extractTextFromFile, parseSyllabusText, type SyllabusItem } from "../../lib/syllabusImport";
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
type DashboardClass = {
  id: string;
  code: string;
  name: string;
  term: string;
  instructor: string;
  color: string;
  archived?: boolean;
  meetingDays?: number[];
  meetingStart?: string;
  meetingEnd?: string;
  location?: string;
};
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

export type SyllabusImportPayload = {
  classId: string;
  items: SyllabusItem[];
  fileName?: string;
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

const meetsOn = (course: DashboardClass, date: Date) => {
  if (!course.meetingDays?.length) return false;
  return course.meetingDays.includes(date.getDay());
};

const EVENT_TYPES = ["Club", "Appointment", "Study", "To-do", "Personal", "Deadline", "Shift", "Exam"] as const;
const EVENT_COLORS = ["#8B5CF6", "#3aa8c5", "#2bb8a4", "#5b9ad8", "#6db58a", "#4f8f9e", "#7ec4b8"] as const;

const SEGMENTS: { key: Exclude<SchoolView, "due">; label: string }[] = [
  { key: "home", label: "Home" },
  { key: "timetable", label: "Timetable" },
  { key: "assignments", label: "Assignments" },
  { key: "more", label: "More" },
];

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

function Section({ icon: Icon, title, action, onAction, children }: {
  icon: typeof Database;
  title: string;
  action?: string;
  onAction?: () => void;
  children: ReactNode;
}) {
  return (
    <section className="os-module">
      <header>
        <div><Icon size={17} /><h2>{title}</h2></div>
        {action && <button type="button" onClick={onAction}>{action}<ChevronRight size={14} /></button>}
      </header>
      <div className="os-module-body">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="os-empty"><Database size={19} /><p>{children}</p></div>;
}

function QuickAction({ icon: Icon, label, onClick, testId }: {
  icon: typeof Database;
  label: string;
  onClick: () => void;
  testId?: string;
}) {
  return (
    <button type="button" className="os-quick-action" onClick={onClick} data-testid={testId}>
      <Icon size={17} /><span>{label}</span>
    </button>
  );
}

function Sheet({ title, onClose, children, testId }: { title: string; onClose: () => void; children: ReactNode; testId?: string }) {
  return (
    <div className="school-sheet-backdrop" onMouseDown={onClose} data-testid={testId ?? "school-sheet"}>
      <div className="school-sheet" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-label={title}>
        <div className="school-sheet-handle" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative", marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <button type="button" aria-label="Close" onClick={onClose} style={{ position: "absolute", right: 0, border: 0, background: "transparent", color: "var(--sp-muted)", cursor: "pointer" }}>
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
        data-testid="school-capture-input"
        autoFocus
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Type anything — a task, deadline, note…"
      />
      <div className="school-filters" style={{ marginTop: 4 }}>
        {(["Task", "Deadline", "Note"] as const).map((item) => (
          <button key={item} type="button" className={`school-filter ${kind === item ? "is-active" : ""}`} onClick={() => setKind(item)}>
            {item}
          </button>
        ))}
      </div>

      {kind !== "Note" && (
        <>
          <p className="school-card-title" style={{ marginTop: 12 }}>Subject</p>
          <button type="button" className="school-btn school-btn-ghost school-btn-block" onClick={() => setPickingSubject((value) => !value)} data-testid="school-capture-subject">
            {selected ? selected.name : "Pick a subject"}
          </button>
          {pickingSubject && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
              {courses.length ? courses.map((course) => (
                <button
                  key={course.id}
                  type="button"
                  className="school-btn school-btn-ghost school-btn-block school-btn-sm"
                  onClick={() => { setClassId(course.id); setPickingSubject(false); }}
                >
                  <span className="school-dot" style={{ background: course.color, marginTop: 0 }} />
                  {course.name}
                </button>
              )) : <p className="school-sheet-lede">Add a class from Timetable first.</p>}
            </div>
          )}

          <p className="school-card-title" style={{ marginTop: 12 }}>When</p>
          <div className="school-filters">
            <button type="button" className={`school-filter ${when === "today" ? "is-active" : ""}`} onClick={() => setWhen("today")}>Today</button>
            <button type="button" className={`school-filter ${when === "tomorrow" ? "is-active" : ""}`} onClick={() => setWhen("tomorrow")}>Tomorrow</button>
            <button type="button" className={`school-filter ${when === "custom" ? "is-active" : ""}`} onClick={() => setWhen("custom")}>
              {customDate || "Pick day"}
            </button>
          </div>
          {when === "custom" && (
            <input style={{ marginTop: 8, width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--sp-line)", background: "var(--sp-bg)", color: "var(--sp-ink)", font: "inherit" }} type="date" value={customDate} onChange={(event) => setCustomDate(event.target.value)} />
          )}
        </>
      )}

      <div className="school-sheet-actions">
        <button type="button" className="school-btn school-btn-primary school-btn-block" data-testid="school-capture-submit" disabled={!title.trim()} onClick={submit}>
          Capture it
        </button>
      </div>
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

  const field = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--sp-line)", background: "var(--sp-bg)", color: "var(--sp-ink)", font: "inherit", marginBottom: 10 } as const;

  return (
    <Sheet title="Add to Calendar" onClose={onClose}>
      <input style={field} data-testid="school-event-title" autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Event title" />
      <input style={field} value={label} onChange={(event) => setLabel(event.target.value)} placeholder="e.g. Club, Appointment, Gym" />
      <p className="school-sheet-lede">Your own category name, shown instead of the type.</p>

      <p className="school-card-title">Type</p>
      <div className="school-filters">
        {EVENT_TYPES.map((item) => (
          <button key={item} type="button" className={`school-filter ${type === item ? "is-active" : ""}`} onClick={() => setType(item)}>
            {item}
          </button>
        ))}
      </div>

      <p className="school-card-title" style={{ marginTop: 12 }}>Colour</p>
      <div className="school-filters">
        <button type="button" className={`school-filter ${color === "auto" ? "is-active" : ""}`} onClick={() => setColor("auto")}>Auto</button>
        {EVENT_COLORS.map((swatch) => (
          <button key={swatch} type="button" className={`school-filter ${color === swatch ? "is-active" : ""}`} style={{ background: swatch, color: "#fff", borderColor: swatch }} onClick={() => setColor(swatch)} aria-label={swatch} />
        ))}
      </div>

      <p className="school-card-title" style={{ marginTop: 12 }}>Date</p>
      <input style={field} type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div>
          <p className="school-card-title">Starts</p>
          <input style={field} type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
        </div>
        <div>
          <p className="school-card-title">Ends</p>
          <input style={field} type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
        </div>
      </div>

      <div className="school-sheet-actions">
        <button type="button" className="school-btn school-btn-primary school-btn-block" data-testid="school-event-submit" disabled={!title.trim()} onClick={submit}>
          Add to calendar
        </button>
      </div>
    </Sheet>
  );
}

function ImportSyllabusSheet({
  courses,
  onClose,
  onImport,
}: {
  courses: DashboardClass[];
  onClose: () => void;
  onImport: (payload: SyllabusImportPayload) => void;
}) {
  const [text, setText] = useState("");
  const [classId, setClassId] = useState(courses[0]?.id);
  const [fileName, setFileName] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<SyllabusItem[]>([]);

  const applyText = (next: string, name?: string) => {
    setText(next);
    setFileName(name);
    setError(null);
    setPreview(parseSyllabusText(next));
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const extracted = await extractTextFromFile(file);
      applyText(extracted, file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that file.");
      setPreview([]);
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    if (!classId) {
      setError("Pick a class for these assignments.");
      return;
    }
    const items = preview.length ? preview : parseSyllabusText(text);
    if (!items.length) {
      setError("No dated or assignment-like lines found. Paste a syllabus with due dates.");
      return;
    }
    onImport({ classId, items, fileName });
    onClose();
  };

  return (
    <Sheet title="Import syllabus" onClose={onClose} testId="school-syllabus-sheet">
      <p className="school-sheet-lede">
        Import a PDF, Word (.docx), or Markdown file — or paste text. We detect due dates and add them to Assignments and Calendar.
      </p>

      <label className="school-btn school-btn-ghost school-btn-block school-file-btn" data-testid="school-syllabus-import-file">
        <Upload size={16} />
        {busy ? "Reading…" : fileName ? "Choose another file" : "Import PDF / Word / Markdown"}
        <input
          type="file"
          accept=".pdf,.docx,.md,.markdown,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
          disabled={busy}
          onChange={(event) => {
            void onFile(event.target.files?.[0]);
            event.currentTarget.value = "";
          }}
        />
      </label>
      {fileName ? <p className="school-sheet-lede" style={{ marginTop: 8 }}>Loaded: {fileName}</p> : null}

      <p className="school-card-title" style={{ marginTop: 14 }}>Class</p>
      <div className="school-filters">
        {courses.map((course) => (
          <button
            key={course.id}
            type="button"
            className={`school-filter ${classId === course.id ? "is-active" : ""}`}
            onClick={() => setClassId(course.id)}
          >
            {course.code || course.name}
          </button>
        ))}
      </div>
      {!courses.length ? <p className="school-sheet-lede">Add a class from Timetable before importing.</p> : null}

      <p className="school-card-title" style={{ marginTop: 14 }}>Or paste text</p>
      <textarea
        data-testid="school-syllabus-text"
        value={text}
        onChange={(event) => applyText(event.target.value, fileName)}
        placeholder={"Assignment 1 — due Sep 20\nMidterm exam October 15\nFinal project due 12/5/2026"}
      />

      {error ? <p className="school-sheet-error">{error}</p> : null}

      {preview.length ? (
        <div className="school-sheet-preview" data-testid="school-syllabus-preview">
          <p className="school-card-title" style={{ marginBottom: 8 }}>
            Preview · {preview.length} item{preview.length === 1 ? "" : "s"} · {preview.filter((item) => item.due).length} with dates
          </p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {preview.slice(0, 12).map((item, index) => (
              <li key={`${item.title}-${index}`}>
                {item.title}
                {item.due ? <span> · {item.due}</span> : null}
                <span> · {item.academicType}</span>
              </li>
            ))}
          </ul>
          {preview.length > 12 ? <p className="school-sheet-lede">+{preview.length - 12} more…</p> : null}
        </div>
      ) : null}

      <div className="school-sheet-actions">
        <button
          type="button"
          className="school-btn school-btn-primary school-btn-block"
          data-testid="school-syllabus-submit"
          disabled={!preview.length || busy || !classId}
          onClick={submit}
        >
          {preview.length
            ? `Add ${preview.length} task${preview.length === 1 ? "" : "s"}` +
              (preview.some((item) => item.due)
                ? ` · ${preview.filter((item) => item.due).length} to calendar`
                : "")
            : "Add tasks"}
        </button>
      </div>
    </Sheet>
  );
}

export function SchoolDashboard({
  tasks,
  classes,
  notes: _notes,
  events: _events = [],
  school: _school,
  schoolView: controlledView,
  onChangeView,
  appearanceLabel = "Light",
  onComplete,
  onOpenTask,
  onOpenClass,
  onNewCourse,
  onNewAcademic,
  onNewLecture,
  onOpenCollection,
  onOpenProfile,
  onFocus,
  onOpenSettings,
  onImportTimetable,
  onQuickCapture,
  onAddCalendarEvent,
  onImportSyllabus,
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
  appearanceLabel?: string;
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
  onImportSyllabus?: (payload: SyllabusImportPayload) => void;
  onUpdateTaskStatus?: (id: number, status: "Not started" | "In progress" | "Blocked" | "Done") => void;
  enableMasterOS?: boolean;
}) {
  const normalizeView = (value?: string): SchoolView => {
    if (value === "timetable" || value === "assignments" || value === "due" || value === "more" || value === "home") return value;
    if (value === "courses" || value === "board" || value === "activity" || value === "notes" || value === "tasks" || value === "dashboard") return "home";
    return "home";
  };

  const [internalView, setInternalView] = useState<SchoolView>("home");
  const [sheet, setSheet] = useState<"capture" | "calendar" | "syllabus" | null>(null);
  const [timetableMode, setTimetableMode] = useState<"day" | "week">("day");
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => new Date());
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
  const allSchoolTasks = tasks.filter((task) => task.classId);
  const dueThisWeek = schoolTasks.filter((task) => task.due && task.due >= today && task.due <= end);
  const overdue = schoolTasks.filter((task) => task.due && task.due < today);
  const assignments = schoolTasks
    .filter((task) => task.academicType && !["Reading", "Discussion"].includes(task.academicType))
    .sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));
  const activeAssignments = assignments.length ? assignments : schoolTasks.sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));
  const completedSchool = allSchoolTasks.filter((task) => task.done).length;
  const blockedSchool = schoolTasks.filter((task) => task.status === "Blocked").length;
  const inProgressSchool = schoolTasks.filter((task) => task.status === "In progress").length;
  const openSchool = schoolTasks.filter((task) => !task.status || task.status === "Not started").length;
  const courseFor = (id?: string) => courses.find((course) => course.id === id);
  const focusTask = schoolTasks.find((task) => task.priority === "High" || task.priority === "high") ?? schoolTasks[0];

  const weekDays = useMemo(() => {
    const start = startOfWeek(weekAnchor);
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [weekAnchor]);

  const hasMeetingData = termCourses.some((course) => course.meetingDays?.length);
  const todayClasses = termCourses
    .filter((course) => (hasMeetingData ? meetsOn(course, now) : false))
    .sort((a, b) => (a.meetingStart ?? "99").localeCompare(b.meetingStart ?? "99"));

  const shiftWeek = (delta: number) => {
    setWeekAnchor((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + delta * 7);
      return next;
    });
  };

  const openSyllabus = () => {
    if (!courses.length) {
      onNewCourse();
      return;
    }
    setSheet("syllabus");
  };

  const navView: Exclude<SchoolView, "due"> = schoolView === "due" ? "home" : schoolView;

  const body = (() => {
    if (schoolView === "timetable") {
      const dayCourses = termCourses
        .filter((course) => (hasMeetingData ? meetsOn(course, selectedDay) : true))
        .sort((a, b) => (a.meetingStart ?? "99").localeCompare(b.meetingStart ?? "99"));
      const visible = timetableMode === "day" ? dayCourses : termCourses;

      return (
        <div className="school-tab-panel" data-testid="school-timetable">
          <div className="school-section-head">
            <div>
              <p className="school-card-title" style={{ marginBottom: 4 }}>Your classes</p>
              <h2 className="school-section-title">Timetable</h2>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="school-btn school-btn-ghost school-btn-sm" onClick={onNewCourse}><Plus size={14} /> Class</button>
              <button type="button" className="school-btn school-btn-ghost school-btn-sm" onClick={() => onImportTimetable?.()}>Import</button>
            </div>
          </div>

          <div className="school-filters">
            <button type="button" className={`school-filter ${timetableMode === "day" ? "is-active" : ""}`} onClick={() => setTimetableMode("day")}>Day</button>
            <button type="button" className={`school-filter ${timetableMode === "week" ? "is-active" : ""}`} onClick={() => setTimetableMode("week")}>Week</button>
            {terms.map((item) => (
              <button key={item} type="button" className={`school-filter ${term === item ? "is-active" : ""}`} onClick={() => setTerm(item)}>{item}</button>
            ))}
          </div>

          <div className="school-section-head" style={{ marginTop: 4 }}>
            <button type="button" className="school-btn school-btn-ghost school-btn-sm" aria-label="Previous week" onClick={() => shiftWeek(-1)}><ChevronLeft size={16} /></button>
            <span style={{ fontSize: 13, color: "var(--sp-muted)", fontWeight: 600 }}>This week {formatWeekRange(weekAnchor)}</span>
            <button type="button" className="school-btn school-btn-ghost school-btn-sm" aria-label="Next week" onClick={() => shiftWeek(1)}><ChevronRight size={16} /></button>
          </div>

          {timetableMode === "day" && hasMeetingData ? (
            <div className="school-day-strip">
              {weekDays.map((day) => {
                const key = dateKey(day);
                const active = dateKey(selectedDay) === key;
                const isToday = key === today;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`school-day-pill ${active ? "is-active" : ""} ${isToday ? "is-today" : ""}`}
                    onClick={() => setSelectedDay(day)}
                  >
                    <div className="school-day-dow">{day.toLocaleDateString(undefined, { weekday: "short" })}</div>
                    <div className="school-day-num">{day.getDate()}</div>
                  </button>
                );
              })}
            </div>
          ) : null}

          {termCourses.length === 0 ? (
            <div className="school-card school-empty">
              <h3>Nothing in your {term} term yet.</h3>
              <p>Import an .ics from Moodle, Canvas, TimeEdit, or Outlook — or add a class by hand.</p>
              <button type="button" className="school-btn school-btn-primary" onClick={() => onImportTimetable?.()}>Import my timetable</button>
              <div style={{ height: 8 }} />
              <button type="button" className="school-btn school-btn-ghost" onClick={onNewCourse}>Or add a class by hand</button>
            </div>
          ) : (
            <div>
              {visible.map((course) => (
                <button key={course.id} type="button" className="school-block" onClick={() => onOpenClass(course.id)}>
                  <span className="school-block-bar" style={{ background: course.color }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="school-block-title">
                      {course.code}
                      {course.meetingStart ? ` · ${course.meetingStart}${course.meetingEnd ? `–${course.meetingEnd}` : ""}` : ""}
                    </p>
                    <p className="school-block-meta">{course.name}{course.instructor ? ` · ${course.instructor}` : ""}</p>
                  </div>
                </button>
              ))}
              {timetableMode === "day" && hasMeetingData && !dayCourses.length ? (
                <div className="school-empty-inline">
                  <p>No class meetings on this day.</p>
                </div>
              ) : null}
            </div>
          )}

          <button type="button" className="school-more-item" onClick={() => setSheet("calendar")}>
            <span className="school-more-icon"><CalendarDays size={16} /></span>
            <span className="school-more-text"><strong>Clubs, appointments and everything else</strong><span>Add to calendar</span></span>
            <ChevronRight size={16} className="school-more-chevron" />
          </button>
        </div>
      );
    }

    if (schoolView === "assignments") {
      return (
        <div className="school-tab-panel" data-testid="school-assignments">
          <div className="school-desktop-toolbar">
            <div>
              <h2>Assignments</h2>
              <p>Soonest due first · {assignments.length} to do</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="school-btn school-btn-ghost school-btn-sm" onClick={openSyllabus} data-testid="school-import-syllabus">Import syllabus</button>
              <button type="button" className="school-btn school-btn-primary school-btn-sm" onClick={onNewAcademic} data-testid="school-new-assignment"><Plus size={14} /> New</button>
            </div>
          </div>
          {assignments.length ? (
            <section className="school-module">
              <div className="school-module-body">
                {assignments.map((task) => (
                  <button key={task.id} type="button" className="school-row" style={{ padding: "12px 15px" }} onClick={() => onOpenTask(task.id)}>
                    <span className="school-dot" style={{ background: courseFor(task.classId)?.color ?? "var(--sp-accent)" }} />
                    <span className="school-row-body">
                      <p className="school-row-title">{task.title}</p>
                      <p className="school-row-meta">{courseFor(task.classId)?.code ?? "School"} · {task.academicType ?? "Assignment"} · {friendlyDue(task.due, today)}</p>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <div className="school-empty-inline">
              <p>No assignments yet. Import a syllabus or add your first.</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="school-btn school-btn-primary school-btn-sm" onClick={openSyllabus}>Import syllabus</button>
                <button type="button" className="school-btn school-btn-ghost school-btn-sm" onClick={onNewAcademic}>Add assignment</button>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (schoolView === "due") {
      return (
        <div className="school-tab-panel" data-testid="school-due">
          <button type="button" className="school-link-btn" onClick={() => setSchoolView("home")} style={{ marginBottom: 8 }}><ChevronLeft size={14} /> Home</button>
          <h2 className="school-section-title">What&apos;s due</h2>
          <p style={{ margin: "4px 0 14px", fontSize: 13, color: "var(--sp-muted)" }}>{dueThisWeek.length} due this week</p>
          {dueThisWeek.length ? (
            <div className="school-card" style={{ paddingTop: 8, paddingBottom: 8 }}>
              {dueThisWeek.map((task) => (
                <button key={task.id} type="button" className="school-row" onClick={() => onOpenTask(task.id)}>
                  <span className="school-dot" style={{ background: courseFor(task.classId)?.color ?? "var(--sp-accent)" }} />
                  <span className="school-row-body">
                    <p className="school-row-title">{task.title}</p>
                    <p className="school-row-meta">{courseFor(task.classId)?.code ?? "School"} · {friendlyDue(task.due, today)}</p>
                  </span>
                  <button
                    type="button"
                    aria-label={`Complete ${task.title}`}
                    onClick={(event) => { event.stopPropagation(); onComplete(task.id); }}
                    style={{ border: 0, background: "transparent", color: "var(--sp-muted)", cursor: "pointer" }}
                  >
                    <CheckSquare size={18} />
                  </button>
                </button>
              ))}
            </div>
          ) : (
            <div className="school-empty-inline">
              <p>Nothing due. Enjoy it <Heart size={14} style={{ display: "inline", verticalAlign: "-2px" }} /></p>
            </div>
          )}
        </div>
      );
    }

    if (schoolView === "more") {
      return (
        <div className="school-tab-panel" data-testid="school-more">
          <div className="school-more-group">
            {MORE_LINKS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  className="school-more-item"
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
                  <span className="school-more-icon"><Icon size={16} /></span>
                  <span className="school-more-text"><strong>{item.label}</strong></span>
                  <ChevronRight size={16} className="school-more-chevron" />
                </button>
              );
            })}
            {enableMasterOS && (
              <a href="/masteros" className="school-more-item" style={{ textDecoration: "none" }}>
                <span className="school-more-icon"><GraduationCap size={16} /></span>
                <span className="school-more-text"><strong>MasterOS</strong></span>
                <ChevronRight size={16} className="school-more-chevron" />
              </a>
            )}
          </div>

          <div className="school-more-group">
            <p className="school-more-label">Workspace</p>
            <button type="button" className="school-more-item" onClick={() => onOpenSettings?.()}>
              <span className="school-more-icon"><Sun size={16} /></span>
              <span className="school-more-text"><strong>Appearance</strong><span>{appearanceLabel}</span></span>
              <MoreHorizontal size={16} className="school-more-chevron" />
            </button>
            <button type="button" className="school-more-item" onClick={onOpenProfile}>
              <span className="school-more-icon"><UserRound size={16} /></span>
              <span className="school-more-text"><strong>Academic profile</strong></span>
              <ChevronRight size={16} className="school-more-chevron" />
            </button>
            <button type="button" className="school-more-item" onClick={onNewLecture}>
              <span className="school-more-icon"><BookOpen size={16} /></span>
              <span className="school-more-text"><strong>Lecture notes</strong></span>
              <ChevronRight size={16} className="school-more-chevron" />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="work-layout" data-testid="school-home">
        <div className="work-main">
          <Section icon={LayoutGrid} title="Overview">
            <div className="work-stat-grid">
              {[
                { label: "Due this week", count: dueThisWeek.length, onClick: () => setSchoolView("due"), testId: "school-due-stat" },
                { label: "Classes", count: termCourses.length, onClick: () => setSchoolView("timetable"), testId: "school-stat-classes" },
                { label: "Open work", count: activeAssignments.length, onClick: () => setSchoolView("assignments") },
                { label: "Blocked", count: blockedSchool + overdue.length, onClick: () => setSchoolView("assignments") },
              ].map((stat) => (
                <button key={stat.label} type="button" className="work-stat-card" onClick={stat.onClick} data-testid={stat.testId}>
                  <strong>{stat.count}</strong>
                  <span>{stat.label}</span>
                </button>
              ))}
            </div>
          </Section>

          <div className="os-two-up">
            <Section
              icon={Zap}
              title="Active assignments"
              action={activeAssignments.length ? "View all" : undefined}
              onAction={() => setSchoolView("assignments")}
            >
              {activeAssignments.length ? activeAssignments.slice(0, 5).map((task) => (
                <div key={task.id} className="work-task-row">
                  <button type="button" className="work-task-check" aria-label={`Complete ${task.title}`} onClick={() => onComplete(task.id)}>
                    <span />
                  </button>
                  <div className="work-task-copy">
                    <button type="button" onClick={() => onOpenTask(task.id)}>
                      <strong>{task.title}</strong>
                      <small>{courseFor(task.classId)?.code ?? "School"} · {friendlyDue(task.due, today)}</small>
                    </button>
                  </div>
                  <span className="work-priority-tag" style={{ background: `${courseFor(task.classId)?.color ?? "var(--accent)"}18`, color: courseFor(task.classId)?.color ?? "var(--accent)" }}>
                    {task.academicType ?? task.priority}
                  </span>
                  <span className="work-due">{friendlyDue(task.due, today)}</span>
                </div>
              )) : <Empty>No active assignments yet. Import a syllabus or add one to get moving.</Empty>}
            </Section>

            <Section
              icon={FolderKanban}
              title="Classes"
              action={termCourses.length ? "View all" : undefined}
              onAction={() => setSchoolView("timetable")}
            >
              {termCourses.length ? termCourses.slice(0, 3).map((course) => {
                const courseTasks = schoolTasks.filter((task) => task.classId === course.id);
                const done = allSchoolTasks.filter((task) => task.classId === course.id && task.done).length;
                const total = courseTasks.length + done;
                return (
                  <article key={course.id} className="work-project-card">
                    <button type="button" className="work-project-card-main" onClick={() => onOpenClass(course.id)}>
                      <div className="work-project-head">
                        <span className="work-project-icon" style={{ color: course.color, background: `${course.color}18` }}>
                          <GraduationCap size={14} />
                        </span>
                        <div>
                          <strong>{course.code || course.name}</strong>
                          <p>{course.name}{course.instructor ? ` · ${course.instructor}` : ""}</p>
                        </div>
                      </div>
                      {total > 0 && (
                        <>
                          <div className="work-project-progress"><i style={{ width: `${(done / total) * 100}%`, background: course.color }} /></div>
                          <small>{done}/{total} tasks</small>
                        </>
                      )}
                    </button>
                  </article>
                );
              }) : <Empty>Add your first class to organize assignments and meetings.</Empty>}
            </Section>
          </div>

          <div className="os-two-up">
            <Section
              icon={FileText}
              title="Due this week"
              action={dueThisWeek.length ? "View all" : undefined}
              onAction={() => setSchoolView("due")}
            >
              {dueThisWeek.length ? dueThisWeek.slice(0, 4).map((task) => (
                <button key={task.id} type="button" className="work-deliverable-row" onClick={() => onOpenTask(task.id)}>
                  <span className="work-deliverable-icon"><FileText size={15} /></span>
                  <div>
                    <strong>{task.title}</strong>
                    <small>{courseFor(task.classId)?.code ?? "School"} · {friendlyDue(task.due, today)}</small>
                  </div>
                </button>
              )) : <Empty>Nothing due this week. Import a syllabus or capture your next deadline.</Empty>}
            </Section>

            <Section icon={LayoutGrid} title="Assignment board" action="Open assignments" onAction={() => setSchoolView("assignments")}>
              <div className="work-kanban-grid">
                {[
                  { label: "Open", count: openSchool },
                  { label: "In progress", count: inProgressSchool },
                  { label: "Blocked", count: blockedSchool },
                ].map((item) => (
                  <button key={item.label} type="button" className="work-kanban-card" onClick={() => setSchoolView("assignments")}>
                    <strong>{item.count}</strong>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </Section>
          </div>
        </div>

        <aside className="work-sidebar">
          {focusTask ? (
            <div className="work-focus-card">
              <div className="work-focus-head">
                <span>Focus today</span>
                <button type="button" onClick={() => onOpenTask(focusTask.id)}>Edit</button>
              </div>
              <strong>{focusTask.title}</strong>
              <small>{courseFor(focusTask.classId)?.code ?? "School"}</small>
              <p>{completedSchool} of {allSchoolTasks.length || completedSchool} school tasks completed</p>
              <button type="button" className="work-focus-start" onClick={() => onFocus(focusTask.id)}>Start focus</button>
            </div>
          ) : (
            <div className="work-focus-card">
              <div className="work-focus-head"><span>Focus today</span></div>
              <strong>Nothing to focus on yet</strong>
              <small>Capture an assignment or import a syllabus</small>
              <p>0 of 0 school tasks completed</p>
              <button type="button" className="work-focus-start" onClick={() => setSheet("capture")}>Quick capture</button>
            </div>
          )}

          <Section icon={ListTodo} title="All tasks" action="View all" onAction={() => setSchoolView("assignments")}>
            <div className="work-priority-list">
              {[
                { label: "High priority", count: schoolTasks.filter((t) => /high/i.test(t.priority)).length, color: "#e25555" },
                { label: "Medium priority", count: schoolTasks.filter((t) => /medium/i.test(t.priority)).length, color: "#e89b3a" },
                { label: "Low priority", count: schoolTasks.filter((t) => /low/i.test(t.priority)).length, color: "#6b8fd4" },
                { label: "Completed", count: completedSchool, color: "#47a47b" },
                { label: "Blocked / overdue", count: blockedSchool + overdue.length, color: "#cf625a" },
              ].map((item) => (
                <button key={item.label} type="button" className="work-priority-row" onClick={() => setSchoolView("assignments")}>
                  <span><i style={{ background: item.color }} />{item.label}</span>
                  <strong>{item.count}</strong>
                </button>
              ))}
            </div>
          </Section>

          <Section icon={Clock3} title="Calendar & classes" action="Timetable" onAction={() => setSchoolView("timetable")}>
            {todayClasses.length ? todayClasses.map((course) => (
              <button key={course.id} type="button" className="work-meeting-row" onClick={() => onOpenClass(course.id)} data-testid={`school-today-class-${course.id}`}>
                <strong>{course.code}{course.meetingStart ? ` · ${course.meetingStart}` : ""}</strong>
                <small>{course.name}{course.location ? ` · ${course.location}` : ""}</small>
              </button>
            )) : (
              <Empty>
                {termCourses.length
                  ? "No class meetings today — good day to catch up."
                  : "Add a class to see today’s schedule here."}
              </Empty>
            )}
          </Section>

          <Section icon={GraduationCap} title="Academic" action="More" onAction={() => setSchoolView("more")}>
            {MORE_LINKS.slice(0, 4).map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  className="work-activity-row"
                  onClick={() => {
                    if (item.key === "topics" || item.key === "goals" || item.key === "professors") onOpenCollection(item.key);
                    else if (item.key === "study") {
                      if (schoolTasks[0]) onFocus(schoolTasks[0].id);
                      else setSheet("capture");
                    }
                    else if (item.key === "exams") setSchoolView("assignments");
                    else setSchoolView("more");
                  }}
                >
                  <strong><Icon size={12} style={{ marginRight: 6, verticalAlign: "-1px" }} />{item.label}</strong>
                  <small>Open</small>
                </button>
              );
            })}
          </Section>
        </aside>
      </div>
    );
  })();

  return (
    <div className="os-dashboard work-dashboard school-dashboard school-planner" data-testid="school-planner">
      <div className="os-hero" data-testid="school-top-nav">
        <div>
          <p className="eyebrow">Your school, in focus</p>
          <h1>SchoolOS</h1>
          <p>
            {termCourses.length} class{termCourses.length === 1 ? "" : "es"} · {activeAssignments.length} open assignment{activeAssignments.length === 1 ? "" : "s"} · {dueThisWeek.length} due soon
          </p>
        </div>
        <button
          type="button"
          className="os-profile-button"
          onClick={() => focusTask && onFocus(focusTask.id)}
          disabled={!focusTask}
        >
          <Zap size={18} />
          <span>Focus on school</span>
        </button>
      </div>

      <div className="os-quick-row work-quick-row">
        <QuickAction icon={FolderKanban} label="New class" onClick={onNewCourse} />
        <QuickAction icon={FileText} label="New assignment" onClick={onNewAcademic} />
        <QuickAction icon={ListTodo} label="Quick capture" onClick={() => setSheet("capture")} testId="school-open-capture" />
        <QuickAction icon={Upload} label="Import syllabus" onClick={openSyllabus} testId="school-home-import-syllabus" />
        <QuickAction icon={CalendarDays} label="Add to calendar" onClick={() => setSheet("calendar")} />
      </div>

      {schoolView !== "home" && (
        <div className="work-view-nav" role="tablist" aria-label="SchoolOS">
          {SEGMENTS.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={navView === item.key}
              className={navView === item.key ? "selected" : ""}
              onClick={() => setSchoolView(item.key)}
              data-testid={`school-nav-${item.key}`}
            >
              {item.label}
            </button>
          ))}
          {schoolView === "due" && (
            <button type="button" role="tab" aria-selected className="selected" onClick={() => setSchoolView("due")}>
              Due
            </button>
          )}
        </div>
      )}

      <div className="school-planner-scroll">{body}</div>

      <button type="button" className="school-fab" onClick={() => setSheet("calendar")} data-testid="school-fab-calendar" aria-label="Add to calendar">
        <Plus size={22} strokeWidth={2.2} />
      </button>

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
      {sheet === "syllabus" && (
        <ImportSyllabusSheet
          courses={courses}
          onClose={() => setSheet(null)}
          onImport={(payload) => onImportSyllabus?.(payload)}
        />
      )}
    </div>
  );
}
