"use client";

import { useState } from "react";
import {
  Activity, Archive, ArrowLeft, Bell, BookOpen, CalendarDays, Check, CheckCircle2, ChevronRight,
  Clock3, Database, ExternalLink, FileText, FolderKanban, GraduationCap, Image,
  Library, Link2, ListTodo, Map, MapPin, NotebookPen, Plus, Search,
  Target, Trash2, UserRound, Users, Utensils, Video, X, BriefcaseBusiness, Zap, LayoutGrid,
} from "lucide-react";
import { getCountdownText, getUrgencyColor } from "@/lib/helpers";
import { TimesheetPanel } from "@/app/components/TimesheetPanel";
import type { TimeTrackingState } from "@/lib/timeTracking";

export type HubRecord = {
  id: string;
  title: string;
  subtitle?: string;
  category?: string;
  date?: string;
  url?: string;
  imageUrl?: string;
  classId?: string;
  completedDates?: string[];
  createdAt: string;
  location?: string;
  duration?: string;
  notes?: string;
  companions?: string;
  ingredients?: string;
  instructions?: string;
  prepTime?: string;
  cookTime?: string;
  servings?: string;
  difficulty?: string;
  cuisine?: string;
  dietary?: string[];
};

export type LifeHubState = {
  habits: HubRecord[];
  recipes: HubRecord[];
  food: HubRecord[];
  exercises: HubRecord[];
  trainings: HubRecord[];
  trips: HubRecord[];
  media: HubRecord[];
  tools: HubRecord[];
  contacts: HubRecord[];
  documents: HubRecord[];
  vault: HubRecord[];
  gallery: HubRecord[];
  vision: HubRecord[];
  archive: HubRecord[];
};

export type SchoolHubState = {
  profile: { major?: string; minor?: string; classOf?: string };
  topics: HubRecord[];
  professors: HubRecord[];
  goals: HubRecord[];
};

export type LifeHubKey = keyof LifeHubState;
export type SchoolHubKey = Exclude<keyof SchoolHubState, "profile">;
export type HubCollectionTarget = { scope: "life"; key: LifeHubKey; startAdd?: boolean } | { scope: "school"; key: SchoolHubKey; startAdd?: boolean };

export const emptyLifeHub: LifeHubState = {
  habits: [], recipes: [], food: [], exercises: [], trainings: [], trips: [], media: [],
  tools: [], contacts: [], documents: [], vault: [], gallery: [], vision: [], archive: [],
};
export const emptySchoolHub: SchoolHubState = { profile: {}, topics: [], professors: [], goals: [] };

type DashboardTask = { id: number; title: string; project: string; color: string; due?: string; priority: string; classId?: string; academicType?: string; gradeWeight?: number; done?: boolean; canceled?: boolean; status?: string };
type DashboardProject = { name: string; desc: string; progress: number; color: string; kind: "maintenance" | "finishable" };
type DashboardClass = { id: string; code: string; name: string; term: string; instructor: string; color: string; archived?: boolean };
type DashboardNote = { id: string; title: string; body: string; classId?: string; updatedAt: string };
type DashboardEvent = { id: string; title: string; start: string; color: string };

const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const friendlyDate = (value?: string) => value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "No date";
const stripHtml = (value: string) => value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const openTask = (task: DashboardTask) => !task.done && !task.canceled;
const weekWindow = () => { const now = new Date(); const end = new Date(now); end.setDate(end.getDate() + 7); return { today: dateKey(now), end: dateKey(end) }; };

function Section({ icon: Icon, title, action, onAction, children, className = "" }: { icon: typeof Database; title: string; action?: string; onAction?: () => void; children: React.ReactNode; className?: string }) {
  return <section className={`os-module ${className}`}><header><div><Icon size={17} /><h2>{title}</h2></div>{action && <button onClick={onAction}>{action}<ChevronRight size={14} /></button>}</header><div className="os-module-body">{children}</div></section>;
}

function Empty({ children }: { children: React.ReactNode }) { return <div className="os-empty"><Database size={19} /><p>{children}</p></div>; }

function Row({ color, icon: Icon, title, meta, onClick, onComplete }: { color?: string; icon: typeof Database; title: string; meta: string; onClick?: () => void; onComplete?: () => void }) {
  return <div className="os-row"><button className="os-row-main" onClick={onClick}><span className="os-row-icon" style={{ color: color ?? "var(--accent)", background: `${color ?? "#625af6"}14` }}><Icon size={15} /></span><span><strong>{title}</strong><small>{meta}</small></span></button>{onComplete && <button className="os-row-check" aria-label={`Complete ${title}`} onClick={onComplete}><CheckCircle2 size={18} /></button>}</div>;
}

function QuickAction({ icon: Icon, label, onClick }: { icon: typeof Database; label: string; onClick: () => void }) {
  return <button className="os-quick-action" onClick={onClick}><Icon size={17} /><span>{label}</span></button>;
}

function WorkSubviewHeader({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack?: () => void }) {
  return (
    <div className={`work-subview-header${onBack ? "" : " no-back"}`}>
      {onBack ? (
        <button type="button" onClick={onBack}><ArrowLeft size={16} /> Dashboard</button>
      ) : null}
      <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
    </div>
  );
}

function periodProgress(now = new Date()) {
  const day = (now.getHours() * 60 + now.getMinutes()) / 1440;
  const week = (((now.getDay() + 6) % 7) + day) / 7;
  const month = (now.getDate() - 1 + day) / new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const start = new Date(now.getFullYear(), 0, 1), end = new Date(now.getFullYear() + 1, 0, 1);
  return { Day: day, Week: week, Month: month, Year: (now.getTime() - start.getTime()) / (end.getTime() - start.getTime()) };
}

export function LifeDashboard({ tasks, projects, notes, events, workspaceName, onComplete, onOpenTask, onOpenProject, onOpenNote, onOpenTasks, onOpenProjects, onOpenNotes, onNewTask, onNewProject, onNewNote, onOpenCalendar, onOpenNow, enableMasterOS = true }: {
  tasks: DashboardTask[]; projects: DashboardProject[]; notes: DashboardNote[]; events: DashboardEvent[]; workspaceName: string;
  onComplete: (id: number) => void; onOpenTask: (id: number) => void; onOpenProject: (name: string) => void; onOpenNote: (id: string) => void;
  onOpenTasks: () => void; onOpenProjects: () => void; onOpenNotes: () => void;
  onNewTask: () => void; onNewProject: () => void; onNewNote: () => void; onOpenCalendar: () => void; onOpenNow: () => void;
  enableMasterOS?: boolean;
}) {
  const now = new Date(), { today, end } = weekWindow();
  const weekTasks = tasks.filter(task => !task.classId && openTask(task) && (!task.due || (task.due >= today && task.due <= end))).sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));
  const activeProjects = projects;
  const recentNotes = notes.filter(note => !note.classId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4);
  const upcoming = events.filter(event => event.start.slice(0, 10) >= today).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 4);
  const progress = periodProgress(now);
  return <div className="os-dashboard life-dashboard">
    <div className="os-hero"><div><p className="eyebrow">{now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p><h1>LifeOS</h1><p>Hey {workspaceName.split(" ")[0]}. Keep life moving without turning it into admin.</p></div><button className="os-now-button" onClick={onOpenNow}><Target size={18} /> Open Now</button></div>
    <div className="os-quick-row"><QuickAction icon={NotebookPen} label="New note" onClick={onNewNote} /><QuickAction icon={ListTodo} label="New task" onClick={onNewTask} /><QuickAction icon={FolderKanban} label="New project" onClick={onNewProject} />{enableMasterOS && <a className="os-quick-action" href="/masteros"><GraduationCap size={16} /> MasterOS</a>}</div>
    <div className="os-dashboard-grid life-dashboard-grid">
      <div className="os-two-up life-dashboard-priority">
        <Section icon={CheckCircle2} title="Tasks this week" action="All tasks" onAction={onOpenTasks}>{weekTasks.length ? weekTasks.slice(0, 6).map(task => <Row key={task.id} icon={ListTodo} color={task.color} title={task.title} meta={`${task.project || "Inbox"} · ${friendlyDate(task.due)} · ${task.priority}`} onClick={() => onOpenTask(task.id)} onComplete={() => onComplete(task.id)} />) : <Empty>No personal tasks are due in the next seven days.</Empty>}</Section>
        <Section icon={FolderKanban} title="Active projects" action="All projects" onAction={onOpenProjects}>{activeProjects.length ? <div className="os-project-strip life-project-strip">{activeProjects.slice(0, 4).map(project => <button key={project.name} onClick={() => onOpenProject(project.name)}><i style={{ background: project.color }} /><strong>{project.name}</strong><span>{project.kind === "maintenance" ? `Maintenance · ${project.desc}` : project.desc}</span><div><b style={{ width: `${project.progress}%`, background: project.color }} /></div></button>)}</div> : <Empty>Create a project and it will show up here.</Empty>}</Section>
      </div>
      <div className="os-dashboard-main">
        <div className="os-two-up">
          <Section icon={NotebookPen} title="Recent notes" action="All notes" onAction={onOpenNotes}>{recentNotes.length ? recentNotes.map(note => <Row key={note.id} icon={NotebookPen} title={note.title || "Untitled note"} meta={`${stripHtml(note.body).slice(0, 48) || "Empty note"} · ${friendlyDate(note.updatedAt)}`} onClick={() => onOpenNote(note.id)} />) : <Empty>Your newest personal notes will show here.</Empty>}</Section>
          <Section icon={CalendarDays} title="Coming up" action="Calendar" onAction={onOpenCalendar}>{upcoming.length ? upcoming.map(event => <Row key={event.id} icon={CalendarDays} color={event.color} title={event.title} meta={new Date(event.start).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} onClick={onOpenCalendar} />) : <Empty>Your next calendar events will show here.</Empty>}</Section>
        </div>
      </div>
      <aside className="os-dashboard-side">
        <Section icon={Clock3} title="Time progress"><div className="os-progress-list">{Object.entries(progress).map(([label, value]) => <div key={label}><span>{label}</span><div><i style={{ width: `${Math.round(value * 100)}%` }} /></div><strong>{Math.round(value * 100)}%</strong></div>)}</div></Section>
      </aside>
    </div>
  </div>;
}

export type SchoolView = "dashboard" | "tasks" | "courses" | "assignments" | "notes" | "board" | "activity";

const schoolPriorityTone = (priority: string) => priority.toLowerCase() === "high" ? "#e25555" : priority.toLowerCase() === "medium" ? "#e89b3a" : "#6b8fd4";
const schoolBoardStatus = (task: DashboardTask): "Not started" | "In progress" | "Blocked" | "Done" => {
  if (task.done || task.status === "Done") return "Done";
  if (task.status === "Blocked") return "Blocked";
  if (task.status === "In progress") return "In progress";
  return "Not started";
};

function SchoolTaskRow({ task, course, today, onComplete, onOpen }: {
  task: DashboardTask;
  course?: DashboardClass;
  today: string;
  onComplete: (id: number) => void;
  onOpen?: (id: number) => void;
}) {
  return (
    <div className="work-task-row">
      <button type="button" className="work-task-check" aria-label={`Complete ${task.title}`} onClick={() => onComplete(task.id)}><span /></button>
      <button type="button" className="work-task-copy" onClick={() => onOpen?.(task.id)}>
        <strong>{task.title}</strong>
        <small>{course?.code ?? "School"}{task.academicType ? ` · ${task.academicType}` : ""}</small>
      </button>
      <span className="work-priority-tag" style={{ color: schoolPriorityTone(task.priority), background: `${schoolPriorityTone(task.priority)}18` }}>{task.priority}</span>
      <span className="work-due">{dueLabel(task.due, today)}</span>
    </div>
  );
}

export function SchoolDashboard({ tasks, classes, notes, school, schoolView: controlledView, onChangeView, schoolFocusTaskId, onSelectFocusTask, onComplete, onOpenTask, onOpenClass, onOpenNote, onNewCourse, onNewAcademic, onNewLecture, onOpenCollection, onOpenProfile, onFocus, onOpenCalendar, onUpdateTaskStatus, enableMasterOS = true }: {
  tasks: DashboardTask[];
  classes: DashboardClass[];
  notes: DashboardNote[];
  school: SchoolHubState;
  schoolView?: SchoolView;
  onChangeView?: (view: SchoolView) => void;
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
  onUpdateTaskStatus?: (id: number, status: "Not started" | "In progress" | "Blocked" | "Done") => void;
  enableMasterOS?: boolean;
}) {
  const [internalView, setInternalView] = useState<SchoolView>("dashboard");
  const [taskFilter, setTaskFilter] = useState<"all" | "high" | "medium" | "low" | "blocked" | "completed">("all");
  const schoolView = controlledView ?? internalView;
  const setSchoolView = (view: SchoolView) => {
    onChangeView?.(view);
    if (controlledView === undefined) setInternalView(view);
  };
  const { today, end } = weekWindow();
  const courses = classes.filter(item => !item.archived);
  const courseFor = (id?: string) => courses.find(course => course.id === id);
  const schoolTasks = tasks.filter(task => task.classId && openTask(task));
  const dueThisWeek = schoolTasks.filter(task => !task.due || (task.due >= today && task.due <= end));
  const assignments = schoolTasks.filter(task => task.academicType && !["Reading", "Discussion"].includes(task.academicType));
  const assignmentsDue = assignments.filter(task => !task.due || (task.due >= today && task.due <= end)).sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));
  const exams = schoolTasks.filter(task => task.academicType === "Exam");
  const blockedTasks = schoolTasks.filter(task => task.status === "Blocked");
  const completedTasks = tasks.filter(task => task.classId && (task.done || task.status === "Done")).length;
  const lectureNotes = notes.filter(note => note.classId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const recentNotes = lectureNotes.slice(0, 4);
  const focusTask = schoolTasks.find(task => task.id === schoolFocusTaskId)
    ?? schoolTasks.find(task => task.priority.toLowerCase() === "high")
    ?? dueThisWeek[0]
    ?? schoolTasks[0];
  const cycleFocusTask = () => {
    if (!schoolTasks.length) return;
    const currentIndex = focusTask ? schoolTasks.findIndex(item => item.id === focusTask.id) : -1;
    const next = schoolTasks[(currentIndex + 1) % schoolTasks.length];
    if (next) onSelectFocusTask?.(next.id);
  };
  const openTasksView = (filter: typeof taskFilter = "all") => {
    setTaskFilter(filter);
    setSchoolView("tasks");
  };
  const filteredTasks = taskFilter === "all" ? schoolTasks
    : taskFilter === "completed" ? tasks.filter(task => task.classId && (task.done || task.status === "Done"))
    : taskFilter === "blocked" ? blockedTasks
    : schoolTasks.filter(task => task.priority.toLowerCase() === taskFilter);
  const boardColumns: { key: ReturnType<typeof schoolBoardStatus>; label: string }[] = [
    { key: "Not started", label: "Not started" },
    { key: "In progress", label: "In progress" },
    { key: "Blocked", label: "Blocked" },
    { key: "Done", label: "Done" },
  ];
  const setBoardStatus = (taskId: number, status: ReturnType<typeof schoolBoardStatus>) => onUpdateTaskStatus?.(taskId, status);
  const notStartedCount = schoolTasks.filter(task => schoolBoardStatus(task) === "Not started").length;
  const inProgressCount = schoolTasks.filter(task => schoolBoardStatus(task) === "In progress").length;

  const dashboard = (
    <div className="work-layout">
      <div className="work-main">
        <Section icon={LayoutGrid} title="Overview">
          <div className="work-stat-grid">
            {[
              { label: "Active tasks", count: schoolTasks.length, view: "tasks" as SchoolView },
              { label: "Due this week", count: dueThisWeek.length, view: "assignments" as SchoolView },
              { label: "Exams", count: exams.length, view: "assignments" as SchoolView },
              { label: "Courses", count: courses.length, view: "courses" as SchoolView },
            ].map(stat => (
              <button key={stat.label} type="button" className="work-stat-card" onClick={() => setSchoolView(stat.view)}>
                <strong>{stat.count}</strong>
                <span>{stat.label}</span>
              </button>
            ))}
          </div>
        </Section>

        <div className="os-two-up">
          <Section icon={Zap} title="Active tasks" action={schoolTasks.length ? "View all" : undefined} onAction={() => openTasksView("all")}>
            {schoolTasks.length ? schoolTasks.slice(0, 5).map(task => (
              <SchoolTaskRow key={task.id} task={task} course={courseFor(task.classId)} today={today} onComplete={onComplete} onOpen={onOpenTask} />
            )) : <Empty>No school tasks yet. Add coursework to get started.</Empty>}
          </Section>

          <Section icon={BookOpen} title="Courses" action={courses.length ? "View all" : undefined} onAction={() => setSchoolView("courses")}>
            {courses.length ? courses.slice(0, 2).map(course => {
              const courseTasks = schoolTasks.filter(task => task.classId === course.id);
              const done = tasks.filter(task => task.classId === course.id && (task.done || task.status === "Done")).length;
              const total = tasks.filter(task => task.classId === course.id).length;
              return (
                <button key={course.id} type="button" className="work-project-card" onClick={() => onOpenClass(course.id)}>
                  <div className="work-project-head">
                    <span className="work-project-icon" style={{ color: course.color, background: `${course.color}18` }}><BookOpen size={14} /></span>
                    <div><strong>{course.code}</strong><p>{course.name}</p></div>
                  </div>
                  {total > 0 && <>
                    <div className="work-project-progress"><i style={{ width: `${total ? (done / total) * 100 : 0}%`, background: course.color }} /></div>
                    <small>{done}/{total} tasks complete</small>
                  </>}
                </button>
              );
            }) : <Empty>Add your first course to organize coursework and notes.</Empty>}
          </Section>
        </div>

        <div className="os-two-up">
          <Section icon={FileText} title="Assignments due" action={assignmentsDue.length ? "View all" : undefined} onAction={() => setSchoolView("assignments")}>
            {assignmentsDue.length ? assignmentsDue.slice(0, 4).map(task => (
              <button key={task.id} type="button" className="work-deliverable-row" onClick={() => onOpenTask(task.id)}>
                <span className="work-deliverable-icon"><FileText size={15} /></span>
                <div><strong>{task.title}</strong><small>{courseFor(task.classId)?.code ?? "School"} · {task.academicType ?? "Assignment"} · {dueLabel(task.due, today)}</small></div>
              </button>
            )) : <Empty>Nothing due this week. You are in good shape.</Empty>}
          </Section>

          <Section icon={LayoutGrid} title="Progress board" action="Open board" onAction={() => setSchoolView("board")}>
            <div className="work-kanban-grid">
              {[
                { label: "Not started", count: notStartedCount },
                { label: "In progress", count: inProgressCount },
                { label: "Blocked", count: blockedTasks.length },
              ].map(item => (
                <button key={item.label} type="button" className="work-kanban-card" onClick={() => setSchoolView("board")}><strong>{item.count}</strong><span>{item.label}</span></button>
              ))}
            </div>
          </Section>
        </div>
      </div>

      <aside className="work-sidebar">
        {focusTask && (
          <div className="work-focus-card">
            <div className="work-focus-head"><span>Focus today</span><button type="button" onClick={() => onOpenTask(focusTask.id)}>Edit</button></div>
            <strong>{focusTask.title}</strong>
            <small>{courseFor(focusTask.classId)?.code ?? "School"}</small>
            <p>{completedTasks} school task{completedTasks === 1 ? "" : "s"} completed</p>
            <button type="button" className="work-focus-start" onClick={() => onFocus(focusTask.id)}>Start focus</button>
          </div>
        )}

        <Section icon={ListTodo} title="All tasks" action="View all" onAction={() => openTasksView("all")}>
          <div className="work-priority-list">
            {[
              { label: "High priority", count: schoolTasks.filter(item => item.priority.toLowerCase() === "high").length, color: "#e25555", filter: "high" as const },
              { label: "Medium priority", count: schoolTasks.filter(item => item.priority.toLowerCase() === "medium").length, color: "#e89b3a", filter: "medium" as const },
              { label: "Low priority", count: schoolTasks.filter(item => item.priority.toLowerCase() === "low").length, color: "#6b8fd4", filter: "low" as const },
              { label: "Completed", count: completedTasks, color: "#47a47b", filter: "completed" as const },
              { label: "Blocked", count: blockedTasks.length, color: "#cf625a", filter: "blocked" as const },
            ].map(item => (
              <button key={item.label} type="button" className="work-priority-row" onClick={() => openTasksView(item.filter)}>
                <span><i style={{ background: item.color }} />{item.label}</span><strong>{item.count}</strong>
              </button>
            ))}
          </div>
        </Section>

        <Section icon={NotebookPen} title="Lecture notes" action="View all" onAction={() => setSchoolView("notes")}>
          {recentNotes.length ? recentNotes.map(note => (
            <button key={note.id} type="button" className="work-meeting-row" onClick={() => onOpenNote(note.id)}>
              <strong>{note.title || "Untitled note"}</strong>
              <small>{courseFor(note.classId)?.code ?? "School"} · {friendlyDate(note.updatedAt)}</small>
            </button>
          )) : <Empty>Course-linked notes will show up here.</Empty>}
        </Section>

        <Section icon={UserRound} title="Academic profile" action="Edit" onAction={onOpenProfile}>
          <dl className="os-profile-list">
            <div><dt>Major</dt><dd>{school.profile.major || "Not set"}</dd></div>
            <div><dt>Class of</dt><dd>{school.profile.classOf || "Not set"}</dd></div>
          </dl>
        </Section>
      </aside>
    </div>
  );

  const subview = (() => {
    if (schoolView === "tasks") {
      return <>
        <WorkSubviewHeader title="All tasks" subtitle={`${filteredTasks.length} task${filteredTasks.length === 1 ? "" : "s"} shown`} onBack={() => setSchoolView("dashboard")} />
        <div className="work-view-tabs">
          {(["all", "high", "medium", "low", "blocked", "completed"] as const).map(filter => (
            <button key={filter} type="button" className={taskFilter === filter ? "selected" : ""} onClick={() => setTaskFilter(filter)}>{filter === "all" ? "All" : filter.charAt(0).toUpperCase() + filter.slice(1)}</button>
          ))}
        </div>
        <Section icon={ListTodo} title="Task list">
          {filteredTasks.length ? filteredTasks.map(task => (
            <SchoolTaskRow key={task.id} task={task} course={courseFor(task.classId)} today={today} onComplete={onComplete} onOpen={onOpenTask} />
          )) : <Empty>No tasks match this filter.</Empty>}
        </Section>
      </>;
    }
    if (schoolView === "courses") {
      return <>
        <WorkSubviewHeader title="Courses" subtitle={`${courses.length} active course${courses.length === 1 ? "" : "s"}`} onBack={() => setSchoolView("dashboard")} />
        <div className="work-projects-grid">
          {courses.length ? courses.map(course => {
            const courseTasks = tasks.filter(task => task.classId === course.id);
            const done = courseTasks.filter(task => task.done || task.status === "Done").length;
            const total = courseTasks.length;
            const dueCount = courseTasks.filter(task => openTask(task)).length;
            return (
              <button key={course.id} type="button" className="work-project-detail-card" onClick={() => onOpenClass(course.id)}>
                <div className="work-project-head">
                  <span className="work-project-icon" style={{ color: course.color, background: `${course.color}18` }}><BookOpen size={16} /></span>
                  <div><strong>{course.code}</strong><p>{course.name}</p></div>
                </div>
                {total > 0 && <>
                  <div className="work-project-progress"><i style={{ width: `${(done / total) * 100}%`, background: course.color }} /></div>
                  <small>{done}/{total} tasks complete</small>
                </>}
                <div className="work-project-meta"><span>{course.instructor || "Instructor TBD"}</span><span>{dueCount} active task{dueCount === 1 ? "" : "s"}</span></div>
              </button>
            );
          }) : <Empty>Add your first course to start the academic dashboard.</Empty>}
        </div>
      </>;
    }
    if (schoolView === "assignments") {
      return <>
        <WorkSubviewHeader title="Assignments" subtitle={`${assignments.length} open assignment${assignments.length === 1 ? "" : "s"}`} onBack={() => setSchoolView("dashboard")} />
        <Section icon={FileText} title="All assignments">
          {assignments.length ? assignments.map(task => (
            <button key={task.id} type="button" className="work-deliverable-row" onClick={() => onOpenTask(task.id)}>
              <span className="work-deliverable-icon"><FileText size={15} /></span>
              <div><strong>{task.title}</strong><small>{courseFor(task.classId)?.code ?? "School"} · {task.academicType ?? "Assignment"} · {dueLabel(task.due, today)}{task.gradeWeight !== undefined ? ` · ${task.gradeWeight}%` : ""}</small></div>
            </button>
          )) : <Empty>Assignments, exams, labs, and projects collect here.</Empty>}
        </Section>
      </>;
    }
    if (schoolView === "notes") {
      return <>
        <WorkSubviewHeader title="Lecture notes" subtitle={`${lectureNotes.length} course note${lectureNotes.length === 1 ? "" : "s"}`} onBack={() => setSchoolView("dashboard")} />
        <div className="work-calendar-actions"><button type="button" onClick={onNewLecture}>New lecture note</button></div>
        <Section icon={NotebookPen} title="All notes">
          {lectureNotes.length ? lectureNotes.map(note => (
            <button key={note.id} type="button" className="work-deliverable-row" onClick={() => onOpenNote(note.id)}>
              <span className="work-deliverable-icon"><NotebookPen size={15} /></span>
              <div><strong>{note.title || "Untitled note"}</strong><small>{courseFor(note.classId)?.code ?? "School"} · {friendlyDate(note.updatedAt)} · {stripHtml(note.body).slice(0, 48) || "Empty note"}</small></div>
            </button>
          )) : <Empty>Course-linked notes will show up here.</Empty>}
        </Section>
      </>;
    }
    if (schoolView === "board") {
      return <>
        <WorkSubviewHeader title="Progress board" subtitle="Move coursework across columns as you work" onBack={() => setSchoolView("dashboard")} />
        <div className="work-kanban-board">
          {boardColumns.map(column => {
            const columnTasks = column.key === "Done"
              ? tasks.filter(task => task.classId && (task.done || task.status === "Done"))
              : schoolTasks.filter(task => schoolBoardStatus(task) === column.key);
            return (
            <div key={column.key} className="work-kanban-column">
              <header><strong>{column.label}</strong><span>{columnTasks.length}</span></header>
              <div className="work-kanban-column-body">
                {columnTasks.map(task => (
                  <article key={task.id} className="work-kanban-task">
                    <strong>{task.title}</strong>
                    <small>{courseFor(task.classId)?.code ?? "School"}</small>
                    {onUpdateTaskStatus && column.key !== "Done" && (
                      <div className="work-kanban-task-actions">
                        {column.key !== "Not started" && <button type="button" onClick={() => setBoardStatus(task.id, "Not started")}>Not started</button>}
                        {column.key !== "In progress" && <button type="button" onClick={() => setBoardStatus(task.id, "In progress")}>Progress</button>}
                        {column.key !== "Blocked" && <button type="button" onClick={() => setBoardStatus(task.id, "Blocked")}>Block</button>}
                        <button type="button" onClick={() => setBoardStatus(task.id, "Done")}>Done</button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </div>
            );
          })}
        </div>
      </>;
    }
    if (schoolView === "activity") {
      const activity = [...schoolTasks, ...tasks.filter(task => task.classId && (task.done || task.status === "Done"))].slice(0, 20);
      return <>
        <WorkSubviewHeader title="Recent activity" subtitle="Latest coursework across SchoolOS" onBack={() => setSchoolView("dashboard")} />
        <Section icon={Clock3} title="Activity feed">
          {activity.length ? activity.map(task => (
            <button key={task.id} type="button" className="work-activity-row" onClick={() => onOpenTask(task.id)}>
              <strong>{task.title}</strong>
              <small>{courseFor(task.classId)?.code ?? "School"} · {task.done || task.status === "Done" ? "completed" : task.status ?? "active"} · {dueLabel(task.due, today)}</small>
            </button>
          )) : <Empty>Activity from coursework will show up here.</Empty>}
        </Section>
      </>;
    }
    return null;
  })();

  return <div className="os-dashboard school-dashboard work-dashboard">
    <div className="os-hero">
      <div>
        <p className="eyebrow">Your academics, in focus</p>
        <h1>SchoolOS</h1>
        <p>{courses.length} course{courses.length === 1 ? "" : "s"} · {schoolTasks.length} active task{schoolTasks.length === 1 ? "" : "s"} · {dueThisWeek.length} due this week</p>
      </div>
      <button type="button" className="os-profile-button" onClick={() => focusTask ? onFocus(focusTask.id) : onOpenProfile()} disabled={!focusTask && !courses.length}><Target size={18} /><span>{focusTask ? "Focus on school" : "Set up profile"}</span></button>
    </div>

    <div className="os-quick-row work-quick-row">
      <QuickAction icon={BookOpen} label="New course" onClick={onNewCourse} />
      <QuickAction icon={ListTodo} label="School task" onClick={onNewAcademic} />
      <QuickAction icon={NotebookPen} label="Lecture note" onClick={onNewLecture} />
      <QuickAction icon={Database} label="New topic" onClick={() => onOpenCollection("topics", true)} />
      {enableMasterOS && <a className="os-quick-action" href="/masteros"><GraduationCap size={16} /> MasterOS</a>}
    </div>

    {schoolView !== "dashboard" && (
      <div className="work-view-nav">
        {([
          { id: "dashboard", label: "Dashboard" },
          { id: "tasks", label: "Tasks" },
          { id: "courses", label: "Courses" },
          { id: "assignments", label: "Assignments" },
          { id: "notes", label: "Notes" },
          { id: "board", label: "Board" },
          { id: "activity", label: "Activity" },
        ] as const).map(item => (
          <button key={item.id} type="button" className={schoolView === item.id ? "selected" : ""} onClick={() => setSchoolView(item.id)}>{item.label}</button>
        ))}
      </div>
    )}

    {schoolView === "dashboard" ? dashboard : subview}
  </div>;
}

export type WorkProject = { id: string; name: string; description?: string; color: string; icon?: string; status: "active" | "completed" | "paused"; createdAt: string; completedAt?: string };
export type WorkDeliverable = { id: string; projectId: string; title: string; description?: string; type: "document" | "code" | "design" | "presentation" | "analysis" | "other"; status: "planned" | "in_progress" | "review" | "approved" | "delivered" | "canceled"; priority: "high" | "medium" | "low"; dueDate: string; createdAt: string; completedAt?: string; notes?: string };
export type WorkTask = { id: string; deliverableId: string; title: string; description?: string; status: "open" | "in_progress" | "blocked" | "done"; priority: "high" | "medium" | "low"; dueDate?: string; tags?: string[]; dependsOn?: string[]; notes?: string; checklist?: string[]; checklistProgress?: boolean[]; createdAt: string; completedAt?: string; updatedAt?: string };
export type WorkMeetingFormat = "in_person" | "virtual" | "hybrid";
/** Minutes before start — mirrors iOS Calendar alert presets. */
export type WorkMeetingAlertMinutes = 0 | 5 | 10 | 15 | 30 | 60 | 120 | 1440 | 2880 | 10080;
export type WorkMeeting = {
  id: string;
  title: string;
  description?: string;
  start: string;
  end?: string;
  allDay?: boolean;
  type: "standup" | "review" | "planning" | "retrospective" | "other";
  format?: WorkMeetingFormat;
  location?: string;
  virtualUrl?: string;
  url?: string;
  projectId?: string;
  attendees?: string[];
  notes?: string;
  /** One or more alert offsets in minutes before the meeting starts. */
  alerts?: WorkMeetingAlertMinutes[];
  actionItems?: { text: string; done: boolean }[];
  recurring?: "daily" | "weekly" | "biweekly" | "monthly";
  createdAt: string;
};
export type WorkHubState = { projects: WorkProject[]; deliverables: WorkDeliverable[]; tasks: WorkTask[]; meetings: WorkMeeting[] };

/** Remove a Work OS project and cascade its deliverables, tasks, and meetings. */
export function removeWorkProject(hub: WorkHubState, projectId: string): WorkHubState {
  const deliverableIds = new Set(
    hub.deliverables.filter(item => item.projectId === projectId).map(item => item.id),
  );
  return {
    ...hub,
    projects: hub.projects.filter(item => item.id !== projectId),
    deliverables: hub.deliverables.filter(item => item.projectId !== projectId),
    tasks: hub.tasks.filter(item => !deliverableIds.has(item.deliverableId)),
    meetings: hub.meetings.filter(item => item.projectId !== projectId),
  };
}

/** Add a Work OS task from the Now capture bar — bootstraps project/deliverable when missing. */
export function captureAddWorkTask(hub: WorkHubState, title: string, now = new Date()): WorkHubState {
  const stamp = now.toISOString();
  const dueDate = dateKey(now);
  const cleanTitle = title.trim() || "New task";
  let next = hub;
  let deliverable = next.deliverables.find(item => item.status !== "delivered" && item.status !== "canceled") ?? next.deliverables[0];

  if (!deliverable) {
    let project = next.projects.find(item => item.status === "active") ?? next.projects[0];
    if (!project) {
      const projectId = `proj-${Date.now()}`;
      project = {
        id: projectId,
        name: "Work",
        description: "Captured from Now",
        color: workColors[0],
        status: "active",
        createdAt: stamp,
      };
      next = { ...next, projects: [...next.projects, project] };
    }
    const deliverableId = `del-${Date.now()}`;
    deliverable = {
      id: deliverableId,
      projectId: project.id,
      title: "Inbox",
      type: "document",
      status: "in_progress",
      priority: "medium",
      dueDate,
      createdAt: stamp,
    };
    next = { ...next, deliverables: [...next.deliverables, deliverable] };
  }

  const task: WorkTask = {
    id: `task-${Date.now()}`,
    deliverableId: deliverable.id,
    title: cleanTitle,
    status: "open",
    priority: "medium",
    dueDate,
    createdAt: stamp,
    updatedAt: stamp,
  };
  return { ...next, tasks: [...next.tasks, task] };
}

export const WORK_MEETING_ALERT_OPTIONS: { value: WorkMeetingAlertMinutes | "none"; label: string }[] = [
  { value: "none", label: "None" },
  { value: 0, label: "At time of event" },
  { value: 5, label: "5 minutes before" },
  { value: 10, label: "10 minutes before" },
  { value: 15, label: "15 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" },
  { value: 120, label: "2 hours before" },
  { value: 1440, label: "1 day before" },
  { value: 2880, label: "2 days before" },
  { value: 10080, label: "1 week before" },
];

export function formatWorkMeetingWhere(meeting: Pick<WorkMeeting, "format" | "location" | "virtualUrl">) {
  const formatLabel = meeting.format === "virtual" ? "Virtual" : meeting.format === "hybrid" ? "Hybrid" : meeting.format === "in_person" ? "In person" : null;
  return [formatLabel, meeting.location, meeting.virtualUrl].filter(Boolean).join(" · ");
}

export const emptyWorkHub: WorkHubState = { projects: [], deliverables: [], tasks: [], meetings: [] };
export type WorkView = "dashboard" | "tasks" | "projects" | "deliverables" | "kanban" | "calendar" | "activity" | "timesheet";

const workColors = ["#625af6", "#4b8bdc", "#47a47b", "#d99b38", "#e48b6b"];

export function createSampleWorkHub(now = new Date()): WorkHubState {
  const today = dateKey(now);
  const addDays = (days: number) => { const d = new Date(now); d.setDate(d.getDate() + days); return dateKey(d); };
  const atTime = (date: string, hour: number, minute = 0) => `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
  const projA = "proj-workos-redesign";
  const projB = "proj-partner-audit";
  const delA = "del-marketing-brief";
  const delB = "del-audit-checklist";
  const stamp = now.toISOString();
  return {
    projects: [
      { id: projA, name: "WorkOS Redesign", description: "Dashboard, flows, and polish", color: workColors[0], status: "active", createdAt: stamp },
      { id: projB, name: "Partner Audit", description: "Q2 compliance review", color: workColors[1], status: "active", createdAt: stamp },
    ],
    deliverables: [
      { id: delA, projectId: projA, title: "Marketing brief", type: "document", status: "in_progress", priority: "high", dueDate: addDays(2), createdAt: stamp },
      { id: delB, projectId: projB, title: "Audit checklist", type: "document", status: "planned", priority: "medium", dueDate: addDays(4), createdAt: stamp },
    ],
    tasks: [
      { id: "task-1", deliverableId: delA, title: "Design landing page", status: "in_progress", priority: "high", dueDate: today, createdAt: stamp, updatedAt: stamp },
      { id: "task-2", deliverableId: delA, title: "Write blog draft", status: "open", priority: "medium", dueDate: addDays(3), createdAt: stamp, updatedAt: stamp },
      { id: "task-3", deliverableId: delA, title: "Review brand guide", status: "open", priority: "low", dueDate: addDays(1), createdAt: stamp, updatedAt: stamp },
      { id: "task-4", deliverableId: delB, title: "Audit data contracts", status: "in_progress", priority: "high", dueDate: today, createdAt: stamp, updatedAt: stamp },
      { id: "task-5", deliverableId: delB, title: "Update client dashboard", status: "open", priority: "medium", dueDate: addDays(5), createdAt: stamp, updatedAt: stamp },
    ],
    meetings: [
      { id: "meet-1", title: "Team standup", start: atTime(today, 10), type: "standup", projectId: projA, createdAt: stamp },
      { id: "meet-2", title: "Client sync", start: atTime(today, 15), type: "other", projectId: projB, createdAt: stamp },
    ],
  };
}

/** Detect the auto-seeded demo WorkOS hub so we can stop surfacing fake notifications. */
export function isSampleWorkHub(hub: WorkHubState): boolean {
  if (!hub?.projects?.length) return false;
  const projectIds = new Set(hub.projects.map(item => item.id));
  const taskIds = new Set(hub.tasks.map(item => item.id));
  return projectIds.has("proj-workos-redesign")
    && projectIds.has("proj-partner-audit")
    && taskIds.has("task-1")
    && taskIds.has("task-4")
    && hub.tasks.some(item => item.id === "task-1" && item.title === "Design landing page");
}

const priorityTone = (priority: WorkTask["priority"]) => priority === "high" ? "#e25555" : priority === "medium" ? "#e89b3a" : "#6b8fd4";
const dueLabel = (value: string | undefined, today: string) => {
  if (!value) return "No date";
  const key = value.slice(0, 10);
  if (key === today) return "Today";
  return friendlyDate(value);
};
const relativeTime = (value?: string) => {
  if (!value) return "Recently";
  const diff = Date.now() - new Date(value).getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.max(1, Math.round(diff / 60_000))}m ago`;
  if (diff < 86_400_000) return `${Math.max(1, Math.round(diff / 3_600_000))}h ago`;
  return friendlyDate(value);
};
const projectForTask = (hub: WorkHubState, task: WorkTask) => {
  const deliverable = hub.deliverables.find(item => item.id === task.deliverableId);
  return hub.projects.find(item => item.id === deliverable?.projectId);
};

type WorkCreateKind = "project" | "deliverable" | "task" | "meeting";

const toLocalInputValue = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

function WorkMeetingModal({ hub, close, save }: { hub: WorkHubState; close: () => void; save: (hub: WorkHubState) => void }) {
  const activeProjects = hub.projects.filter(item => item.status === "active");
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(activeProjects[0]?.id ?? "");
  const [type, setType] = useState<WorkMeeting["type"]>("other");
  const [format, setFormat] = useState<WorkMeetingFormat>("in_person");
  const [location, setLocation] = useState("");
  const [virtualUrl, setVirtualUrl] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [attendees, setAttendees] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [alertPrimary, setAlertPrimary] = useState<WorkMeetingAlertMinutes | "none">(15);
  const [alertSecondary, setAlertSecondary] = useState<WorkMeetingAlertMinutes | "none">("none");
  const [start, setStart] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30 - (now.getMinutes() % 30), 0, 0);
    return toLocalInputValue(now);
  });
  const [end, setEnd] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30 - (now.getMinutes() % 30) + 30, 0, 0);
    return toLocalInputValue(now);
  });

  const rangeValid = allDay || !end || new Date(end).getTime() > new Date(start).getTime();
  const needsLocation = format === "in_person" || format === "hybrid";
  const needsLink = format === "virtual" || format === "hybrid";

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !rangeValid) return;
    const stamp = new Date().toISOString();
    const alerts = [alertPrimary, alertSecondary]
      .filter((value): value is WorkMeetingAlertMinutes => value !== "none")
      .filter((value, index, list) => list.indexOf(value) === index);
    const startIso = allDay ? `${start.slice(0, 10)}T09:00:00` : new Date(start).toISOString();
    const endIso = allDay
      ? `${(end || start).slice(0, 10)}T17:00:00`
      : end ? new Date(end).toISOString() : undefined;
    const meeting: WorkMeeting = {
      id: `meet-${Date.now()}`,
      title: title.trim(),
      start: startIso,
      end: endIso,
      allDay,
      type,
      format,
      location: needsLocation && location.trim() ? location.trim() : undefined,
      virtualUrl: needsLink && virtualUrl.trim() ? virtualUrl.trim() : undefined,
      url: url.trim() || undefined,
      projectId: projectId || undefined,
      attendees: attendees.split(",").map(item => item.trim()).filter(Boolean),
      notes: notes.trim() || undefined,
      alerts: alerts.length ? alerts : undefined,
      createdAt: stamp,
    };
    save({ ...hub, meetings: [meeting, ...hub.meetings] });
    close();
  };

  return (
    <div className="modal-layer hub-modal-layer" onMouseDown={close}>
      <form className="hub-profile-modal work-create-modal work-meeting-modal" onMouseDown={event => event.stopPropagation()} onSubmit={submit}>
        <header>
          <span><CalendarDays size={18} /></span>
          <div>
            <h2>New meeting</h2>
            <p>Like an iOS Calendar event — time, place, and alerts.</p>
          </div>
          <button type="button" onClick={close} aria-label="Close"><X size={18} /></button>
        </header>

        <label>Title<input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="Q3 planning" /></label>

        {activeProjects.length > 0 && (
          <label>Project
            <select value={projectId} onChange={event => setProjectId(event.target.value)}>
              <option value="">No project</option>
              {activeProjects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
        )}

        <label className="work-meeting-toggle">
          <input type="checkbox" checked={allDay} onChange={event => setAllDay(event.target.checked)} />
          <span>All-day</span>
        </label>

        <div className="work-meeting-grid">
          <label>Starts
            <input
              type={allDay ? "date" : "datetime-local"}
              value={allDay ? start.slice(0, 10) : start}
              onChange={event => {
                const value = event.target.value;
                setStart(allDay ? `${value}T09:00` : value);
                if (!allDay && end <= value) {
                  const next = new Date(value);
                  next.setMinutes(next.getMinutes() + 30);
                  setEnd(toLocalInputValue(next));
                }
              }}
            />
          </label>
          <label>Ends
            <input
              type={allDay ? "date" : "datetime-local"}
              value={allDay ? (end || start).slice(0, 10) : end}
              min={allDay ? start.slice(0, 10) : start}
              onChange={event => {
                const value = event.target.value;
                setEnd(allDay ? `${value}T17:00` : value);
              }}
            />
          </label>
        </div>
        {!rangeValid && <p className="work-create-hint">End needs to be after the start.</p>}

        <label>Meeting type
          <select value={type} onChange={event => setType(event.target.value as WorkMeeting["type"])}>
            <option value="other">Meeting</option>
            <option value="standup">Standup</option>
            <option value="planning">Planning</option>
            <option value="review">Review</option>
            <option value="retrospective">Retrospective</option>
          </select>
        </label>

        <div className="work-meeting-format" role="group" aria-label="How you meet">
          {([
            { value: "in_person" as const, label: "In person", icon: MapPin },
            { value: "virtual" as const, label: "Virtual", icon: Video },
            { value: "hybrid" as const, label: "Hybrid", icon: Users },
          ]).map(option => (
            <button
              key={option.value}
              type="button"
              className={format === option.value ? "selected" : ""}
              onClick={() => setFormat(option.value)}
            >
              <option.icon size={15} />
              <span>{option.label}</span>
            </button>
          ))}
        </div>

        {needsLocation && (
          <label>Location
            <input value={location} onChange={event => setLocation(event.target.value)} placeholder="Office 4B, 123 Market St…" />
          </label>
        )}
        {needsLink && (
          <label>Video call URL
            <input type="url" value={virtualUrl} onChange={event => setVirtualUrl(event.target.value)} placeholder="https://meet.google.com/…" />
          </label>
        )}

        <div className="work-meeting-grid">
          <label><span className="work-meeting-label-with-icon"><Bell size={12} /> Alert</span>
            <select value={String(alertPrimary)} onChange={event => {
              const value = event.target.value;
              setAlertPrimary(value === "none" ? "none" : Number(value) as WorkMeetingAlertMinutes);
            }}>
              {WORK_MEETING_ALERT_OPTIONS.map(option => (
                <option key={String(option.value)} value={String(option.value)}>{option.label}</option>
              ))}
            </select>
          </label>
          <label>Second alert
            <select value={String(alertSecondary)} onChange={event => {
              const value = event.target.value;
              setAlertSecondary(value === "none" ? "none" : Number(value) as WorkMeetingAlertMinutes);
            }}>
              {WORK_MEETING_ALERT_OPTIONS.map(option => (
                <option key={`second-${String(option.value)}`} value={String(option.value)}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>

        <label>Invitees
          <input value={attendees} onChange={event => setAttendees(event.target.value)} placeholder="Alex, Sam, Jordan" />
        </label>
        <label>URL
          <input type="url" value={url} onChange={event => setUrl(event.target.value)} placeholder="Optional agenda or doc link" />
        </label>
        <label>Notes
          <textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="Agenda, dial-in details, what to bring…" />
        </label>

        <div>
          <button type="button" onClick={close}>Cancel</button>
          <button className="primary" disabled={!title.trim() || !rangeValid}>Add to Calendar</button>
        </div>
      </form>
    </div>
  );
}

function WorkCreateModal({ kind, hub, close, save }: { kind: Exclude<WorkCreateKind, "meeting">; hub: WorkHubState; close: () => void; save: (hub: WorkHubState) => void }) {
  const activeProjects = hub.projects.filter(item => item.status === "active");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState(activeProjects[0]?.id ?? "");
  const [deliverableId, setDeliverableId] = useState(hub.deliverables.find(item => item.projectId === activeProjects[0]?.id)?.id ?? "");
  const [priority, setPriority] = useState<WorkTask["priority"]>("medium");
  const [dueDate, setDueDate] = useState(dateKey(new Date()));
  const titles: Record<Exclude<WorkCreateKind, "meeting">, string> = { project: "New project", deliverable: "New deliverable", task: "New task" };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    const stamp = new Date().toISOString();
    if (kind === "project") {
      save({ ...hub, projects: [{ id: `proj-${Date.now()}`, name: name.trim(), description: description.trim() || undefined, color: workColors[hub.projects.length % workColors.length], status: "active", createdAt: stamp }, ...hub.projects] });
    } else if (kind === "deliverable" && projectId) {
      save({ ...hub, deliverables: [{ id: `del-${Date.now()}`, projectId, title: name.trim(), type: "document", status: "planned", priority, dueDate, createdAt: stamp }, ...hub.deliverables] });
    } else if (kind === "task" && deliverableId) {
      save({ ...hub, tasks: [{ id: `task-${Date.now()}`, deliverableId, title: name.trim(), status: "open", priority, dueDate, createdAt: stamp, updatedAt: stamp }, ...hub.tasks] });
    }
    close();
  };
  return <div className="modal-layer hub-modal-layer" onMouseDown={close}><form className="hub-profile-modal work-create-modal" onMouseDown={event => event.stopPropagation()} onSubmit={submit}><header><span><BriefcaseBusiness size={18} /></span><div><h2>{titles[kind]}</h2><p>Add it to WorkOS without leaving the dashboard.</p></div><button type="button" onClick={close}><X size={18} /></button></header><label>Title<input autoFocus value={name} onChange={event => setName(event.target.value)} placeholder={kind === "project" ? "WorkOS Redesign" : "Design landing page"} /></label>{kind === "project" && <label>Description<input value={description} onChange={event => setDescription(event.target.value)} placeholder="What is this project about?" /></label>}{kind === "deliverable" && activeProjects.length > 0 && <label>Project<select value={projectId} onChange={event => setProjectId(event.target.value)}>{activeProjects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}{kind === "task" && hub.deliverables.length > 0 && <label>Deliverable<select value={deliverableId} onChange={event => setDeliverableId(event.target.value)}>{hub.deliverables.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>}{(kind === "deliverable" || kind === "task") && <><label>Priority<select value={priority} onChange={event => setPriority(event.target.value as WorkTask["priority"])}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label><label>Due date<input type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} /></label></>}{kind !== "project" && activeProjects.length === 0 && <p className="work-create-hint">Create a project first.</p>}{kind === "task" && hub.deliverables.length === 0 && <p className="work-create-hint">Create a deliverable first.</p>}<div><button type="button" onClick={close}>Cancel</button><button className="primary" disabled={!name.trim() || (kind === "deliverable" && !projectId) || (kind === "task" && !deliverableId)}>Save</button></div></form></div>;
}

function WorkTaskRow({ task, hub, today, onComplete, onOpen }: { task: WorkTask; hub: WorkHubState; today: string; onComplete: (id: string) => void; onOpen?: (id: string) => void }) {
  const project = projectForTask(hub, task);
  return (
    <div className="work-task-row">
      <button type="button" className="work-task-check" aria-label={`Complete ${task.title}`} onClick={() => onComplete(task.id)}><span /></button>
      <button type="button" className="work-task-copy" onClick={() => onOpen?.(task.id)}>
        <strong>{task.title}</strong>
        <small>{project?.name || "Project"}</small>
      </button>
      <span className="work-priority-tag" style={{ color: priorityTone(task.priority), background: `${priorityTone(task.priority)}18` }}>{task.priority}</span>
      <span className="work-due">{dueLabel(task.dueDate, today)}</span>
    </div>
  );
}

export function WorkDashboard({ workHub, timeTracking, onTimeTrackingChange, onTimesheetFlash, weekStartsMonday, focusTaskId, workView: controlledView, onChangeView, onChange, onFocusWork, onOpenWorkTask, onOpenCalendar, onOpenProject, onBrowseProjects, onProjectDeleted }: {
  workHub: WorkHubState;
  timeTracking: TimeTrackingState;
  onTimeTrackingChange: (next: TimeTrackingState) => void;
  onTimesheetFlash?: (message: string) => void;
  weekStartsMonday?: boolean;
  focusTaskId?: string | null;
  workView?: WorkView;
  onChangeView?: (view: WorkView) => void;
  onChange: (hub: WorkHubState) => void;
  onFocusWork?: (taskId: string) => void;
  onOpenWorkTask?: (taskId: string) => void;
  onOpenCalendar?: () => void;
  onOpenProject?: (projectId: string) => void;
  onBrowseProjects?: () => void;
  /** Called after a Work OS project is deleted (so Life Spaces can drop the mirror). */
  onProjectDeleted?: (projectName: string) => void;
}) {
  const [internalView, setInternalView] = useState<WorkView>("dashboard");
  const [taskFilter, setTaskFilter] = useState<WorkTask["priority"] | "completed" | "blocked" | "all">("all");
  const [createKind, setCreateKind] = useState<WorkCreateKind | null>(null);
  const workView = controlledView ?? internalView;
  const setWorkView = (view: WorkView) => {
    onChangeView?.(view);
    if (controlledView === undefined) setInternalView(view);
  };
  const openWorkTask = onOpenWorkTask ?? onFocusWork;
  const openProjects = onBrowseProjects ?? (() => setWorkView("projects"));
  const openProject = (projectId: string) => {
    if (onOpenProject) onOpenProject(projectId);
    else setWorkView("projects");
  };
  const deleteProject = (projectId: string) => {
    const project = workHub.projects.find(item => item.id === projectId);
    if (!project) return;
    if (!window.confirm(`Delete “${project.name}”? Its deliverables, tasks, and meetings will be removed from Work OS.`)) return;
    onChange(removeWorkProject(workHub, projectId));
    onProjectDeleted?.(project.name);
  };
  const { today, end } = weekWindow();
  const activeProjects = workHub.projects.filter(item => item.status === "active");
  const activeTasks = workHub.tasks.filter(item => item.status !== "done");
  const blockedTasks = activeTasks.filter(item => item.status === "blocked");
  const openTasks = activeTasks.filter(item => item.status === "open").length;
  const inProgressTasks = activeTasks.filter(item => item.status === "in_progress").length;
  const deliverablesDue = workHub.deliverables.filter(item => item.status !== "delivered" && item.status !== "canceled" && item.dueDate >= today && item.dueDate <= end).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const todayMeetings = workHub.meetings.filter(item => item.start.slice(0, 10) === today).sort((a, b) => a.start.localeCompare(b.start));
  const completedTasks = workHub.tasks.filter(item => item.status === "done").length;
  const focusTask = workHub.tasks.find(item => item.id === focusTaskId) ?? activeTasks.find(item => item.priority === "high") ?? activeTasks[0];
  const recentActivity = [...workHub.tasks].sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt)).slice(0, 4);
  const completeTask = (taskId: string) => onChange({
    ...workHub,
    tasks: workHub.tasks.map(item => item.id === taskId ? { ...item, status: "done" as const, completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : item),
  });
  const cycleFocusTask = () => {
    if (!activeTasks.length) return;
    const currentIndex = focusTask ? activeTasks.findIndex(item => item.id === focusTask.id) : -1;
    const next = activeTasks[(currentIndex + 1) % activeTasks.length];
    if (next) onFocusWork?.(next.id);
  };
  const setTaskStatus = (taskId: string, status: WorkTask["status"]) => onChange({
    ...workHub,
    tasks: workHub.tasks.map(item => item.id === taskId ? { ...item, status, completedAt: status === "done" ? new Date().toISOString() : item.completedAt, updatedAt: new Date().toISOString() } : item),
  });
  const openTasksView = (filter: typeof taskFilter = "all") => {
    setTaskFilter(filter);
    setWorkView("tasks");
  };
  const allDeliverables = workHub.deliverables.filter(item => item.status !== "delivered" && item.status !== "canceled").sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const upcomingMeetings = [...workHub.meetings].filter(item => item.start.slice(0, 10) >= today).sort((a, b) => a.start.localeCompare(b.start));
  const allActivity = [...workHub.tasks].sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt));
  const filteredTasks = taskFilter === "all" ? activeTasks
    : taskFilter === "completed" ? workHub.tasks.filter(item => item.status === "done")
    : taskFilter === "blocked" ? blockedTasks
    : activeTasks.filter(item => item.priority === taskFilter);
  const kanbanColumns: { key: WorkTask["status"]; label: string }[] = [
    { key: "open", label: "Open" },
    { key: "in_progress", label: "In Progress" },
    { key: "blocked", label: "Blocked" },
    { key: "done", label: "Done" },
  ];

  const dashboard = (
    <div className="work-layout">
      <div className="work-main">
        <Section icon={LayoutGrid} title="Overview">
          <div className="work-stat-grid">
            {[
              { label: "Active tasks", count: activeTasks.length, view: "tasks" as WorkView },
              { label: "Due soon", count: deliverablesDue.length, view: "deliverables" as WorkView },
              { label: "Blocked", count: blockedTasks.length, view: "kanban" as WorkView },
              { label: "Projects", count: activeProjects.length, action: openProjects },
            ].map(stat => (
              <button key={stat.label} type="button" className="work-stat-card" onClick={() => {
                if ("action" in stat && stat.action) stat.action();
                else if ("view" in stat) setWorkView(stat.view);
              }}>
                <strong>{stat.count}</strong>
                <span>{stat.label}</span>
              </button>
            ))}
          </div>
        </Section>

        <div className="os-two-up">
          <Section icon={Zap} title="Active tasks" action={activeTasks.length ? "View all" : undefined} onAction={() => openTasksView("all")}>
            {activeTasks.length ? activeTasks.slice(0, 5).map(task => <WorkTaskRow key={task.id} task={task} hub={workHub} today={today} onComplete={completeTask} onOpen={openWorkTask} />) : <Empty>No active tasks yet. Add one to get moving.</Empty>}
          </Section>

          <Section icon={FolderKanban} title="Projects" action={activeProjects.length ? "View all" : undefined} onAction={openProjects}>
            {activeProjects.length ? activeProjects.slice(0, 2).map(project => {
              const projectTasks = workHub.tasks.filter(task => projectForTask(workHub, task)?.id === project.id);
              const done = projectTasks.filter(task => task.status === "done").length;
              const total = projectTasks.length;
              return (
                <article key={project.id} className="work-project-card">
                  <button type="button" className="work-project-card-main" onClick={() => openProject(project.id)}>
                    <div className="work-project-head">
                      <span className="work-project-icon" style={{ color: project.color, background: `${project.color}18` }}><Database size={14} /></span>
                      <div><strong>{project.name}</strong><p>{project.description || "Active project"}</p></div>
                    </div>
                    {total > 0 && <>
                      <div className="work-project-progress"><i style={{ width: `${(done / total) * 100}%`, background: project.color }} /></div>
                      <small>{done}/{total} tasks</small>
                    </>}
                  </button>
                  <button
                    type="button"
                    className="work-project-delete"
                    aria-label={`Delete ${project.name}`}
                    title="Delete project"
                    onClick={() => deleteProject(project.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </article>
              );
            }) : <Empty>Create your first project to organize deliverables and tasks.</Empty>}
          </Section>
        </div>

        <div className="os-two-up">
          <Section icon={FileText} title="Deliverables due" action={deliverablesDue.length ? "View all" : undefined} onAction={() => setWorkView("deliverables")}>
            {deliverablesDue.length ? deliverablesDue.slice(0, 4).map(item => (
              <button key={item.id} type="button" className="work-deliverable-row" onClick={() => setWorkView("deliverables")}>
                <span className="work-deliverable-icon"><FileText size={15} /></span>
                <div><strong>{item.title}</strong><small>{workHub.projects.find(project => project.id === item.projectId)?.name || "Project"} · {dueLabel(item.dueDate, today)}</small></div>
              </button>
            )) : <Empty>No deliverables due this week.</Empty>}
          </Section>

          <Section icon={LayoutGrid} title="Kanban board" action="Open board" onAction={() => setWorkView("kanban")}>
            <div className="work-kanban-grid">
              {[
                { label: "Open", count: openTasks, view: "kanban" as const },
                { label: "In Progress", count: inProgressTasks, view: "kanban" as const },
                { label: "Blocked", count: blockedTasks.length, view: "kanban" as const },
              ].map(item => (
                <button key={item.label} type="button" className="work-kanban-card" onClick={() => setWorkView(item.view)}><strong>{item.count}</strong><span>{item.label}</span></button>
              ))}
            </div>
          </Section>
        </div>
      </div>

      <aside className="work-sidebar">
        {focusTask && (
          <div className="work-focus-card">
            <div className="work-focus-head"><span>Focus today</span><button type="button" onClick={() => openWorkTask?.(focusTask.id)}>Edit</button></div>
            <strong>{focusTask.title}</strong>
            <small>{projectForTask(workHub, focusTask)?.name || "Project"}</small>
            <p>{completedTasks} of {workHub.tasks.length} tasks completed</p>
            <button type="button" className="work-focus-start" onClick={() => onFocusWork?.(focusTask.id)}>Start focus</button>
          </div>
        )}

        <Section icon={ListTodo} title="All tasks" action="View all" onAction={() => openTasksView("all")}>
          <div className="work-priority-list">
            {[
              { label: "High priority", count: activeTasks.filter(item => item.priority === "high").length, color: "#e25555", filter: "high" as const },
              { label: "Medium priority", count: activeTasks.filter(item => item.priority === "medium").length, color: "#e89b3a", filter: "medium" as const },
              { label: "Low priority", count: activeTasks.filter(item => item.priority === "low").length, color: "#6b8fd4", filter: "low" as const },
              { label: "Completed", count: completedTasks, color: "#47a47b", filter: "completed" as const },
              { label: "Blocked", count: blockedTasks.length, color: "#cf625a", filter: "blocked" as const },
            ].map(item => (
              <button key={item.label} type="button" className="work-priority-row" onClick={() => openTasksView(item.filter)}>
                <span><i style={{ background: item.color }} />{item.label}</span><strong>{item.count}</strong>
              </button>
            ))}
          </div>
        </Section>

        <Section icon={Clock3} title="Calendar & meetings" action="View calendar" onAction={() => setWorkView("calendar")}>
          {todayMeetings.length ? todayMeetings.map(item => {
            const where = formatWorkMeetingWhere(item);
            return (
              <button key={item.id} type="button" className="work-meeting-row" onClick={() => setWorkView("calendar")}>
                <strong>{item.title}</strong>
                <small>Today, {new Date(item.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}{where ? ` · ${where}` : ""}</small>
              </button>
            );
          }) : <Empty>No meetings scheduled today.</Empty>}
        </Section>

        <Section icon={Clock3} title="Recent activity" action="View all" onAction={() => setWorkView("activity")}>
          {recentActivity.length ? recentActivity.map(item => (
            <button key={item.id} type="button" className="work-activity-row" onClick={() => openWorkTask?.(item.id)}>
              <strong>{item.title}</strong>
              <small>{item.status === "done" ? "completed" : "updated"} · {relativeTime(item.updatedAt ?? item.createdAt)}</small>
            </button>
          )) : <Empty>Activity from tasks and deliverables will show here.</Empty>}
        </Section>
      </aside>
    </div>
  );

  const subview = (() => {
    if (workView === "tasks") {
      return <>
        <WorkSubviewHeader title="All tasks" subtitle={`${filteredTasks.length} task${filteredTasks.length === 1 ? "" : "s"} shown`} />
        <div className="work-view-tabs">
          {(["all", "high", "medium", "low", "blocked", "completed"] as const).map(filter => (
            <button key={filter} type="button" className={taskFilter === filter ? "selected" : ""} onClick={() => setTaskFilter(filter)}>{filter === "all" ? "All" : filter.charAt(0).toUpperCase() + filter.slice(1)}</button>
          ))}
        </div>
        <Section icon={ListTodo} title="Task list">
          {filteredTasks.length ? filteredTasks.map(task => <WorkTaskRow key={task.id} task={task} hub={workHub} today={today} onComplete={completeTask} onOpen={openWorkTask} />) : <Empty>No tasks match this filter.</Empty>}
        </Section>
      </>;
    }
    if (workView === "projects") {
      return <>
        <WorkSubviewHeader title="Projects" subtitle={`${activeProjects.length} active project${activeProjects.length === 1 ? "" : "s"}`} />
        <div className="work-projects-grid">
          {activeProjects.length ? activeProjects.map(project => {
            const projectTasks = workHub.tasks.filter(task => projectForTask(workHub, task)?.id === project.id);
            const done = projectTasks.filter(task => task.status === "done").length;
            const total = projectTasks.length;
            const projectDeliverables = workHub.deliverables.filter(item => item.projectId === project.id);
            return (
              <article key={project.id} className="work-project-detail-card">
                <button type="button" className="work-project-card-main" onClick={() => openProject(project.id)}>
                  <div className="work-project-head">
                    <span className="work-project-icon" style={{ color: project.color, background: `${project.color}18` }}><Database size={16} /></span>
                    <div><strong>{project.name}</strong><p>{project.description || "Active project"}</p></div>
                  </div>
                  {total > 0 && <>
                    <div className="work-project-progress"><i style={{ width: `${(done / total) * 100}%`, background: project.color }} /></div>
                    <small>{done}/{total} tasks complete</small>
                  </>}
                  <div className="work-project-meta"><span>{projectDeliverables.length} deliverable{projectDeliverables.length === 1 ? "" : "s"}</span><span>{projectTasks.filter(task => task.status !== "done").length} active tasks</span></div>
                </button>
                <button
                  type="button"
                  className="work-project-delete"
                  aria-label={`Delete ${project.name}`}
                  title="Delete project"
                  onClick={() => deleteProject(project.id)}
                >
                  <Trash2 size={15} />
                </button>
              </article>
            );
          }) : <Empty>Create your first project to organize deliverables and tasks.</Empty>}
        </div>
      </>;
    }
    if (workView === "deliverables") {
      return <>
        <WorkSubviewHeader title="Deliverables" subtitle={`${allDeliverables.length} open deliverable${allDeliverables.length === 1 ? "" : "s"}`} />
        <Section icon={FileText} title="All deliverables">
          {allDeliverables.length ? allDeliverables.map(item => (
            <div key={item.id} className="work-deliverable-row">
              <span className="work-deliverable-icon"><FileText size={15} /></span>
              <div><strong>{item.title}</strong><small>{workHub.projects.find(project => project.id === item.projectId)?.name || "Project"} · {dueLabel(item.dueDate, today)} · {item.status.replace("_", " ")}</small></div>
            </div>
          )) : <Empty>No open deliverables yet.</Empty>}
        </Section>
      </>;
    }
    if (workView === "kanban") {
      return <>
        <WorkSubviewHeader title="Kanban board" subtitle="Move tasks across columns as work progresses" />
        <div className="work-kanban-board">
          {kanbanColumns.map(column => (
            <div key={column.key} className="work-kanban-column">
              <header><strong>{column.label}</strong><span>{workHub.tasks.filter(task => task.status === column.key).length}</span></header>
              <div className="work-kanban-column-body">
                {workHub.tasks.filter(task => task.status === column.key).map(task => {
                  const project = projectForTask(workHub, task);
                  return (
                    <article key={task.id} className="work-kanban-task">
                      <button type="button" className="work-kanban-task-main" onClick={() => openWorkTask?.(task.id)}>
                        <strong>{task.title}</strong>
                        <small>{project?.name || "Project"}</small>
                      </button>
                      <div className="work-kanban-task-actions">
                        {column.key !== "open" && <button type="button" onClick={() => setTaskStatus(task.id, "open")}>Open</button>}
                        {column.key !== "in_progress" && <button type="button" onClick={() => setTaskStatus(task.id, "in_progress")}>Progress</button>}
                        {column.key !== "blocked" && <button type="button" onClick={() => setTaskStatus(task.id, "blocked")}>Block</button>}
                        {column.key !== "done" && <button type="button" onClick={() => setTaskStatus(task.id, "done")}>Done</button>}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </>;
    }
    if (workView === "calendar") {
      return <>
        <WorkSubviewHeader title="Calendar & meetings" subtitle={`${upcomingMeetings.length} upcoming meeting${upcomingMeetings.length === 1 ? "" : "s"}`} />
        <div className="work-calendar-actions">{onOpenCalendar && <button type="button" onClick={onOpenCalendar}>Open full calendar</button>}</div>
        <Section icon={Clock3} title="Upcoming meetings">
          {upcomingMeetings.length ? upcomingMeetings.map(item => {
            const where = formatWorkMeetingWhere(item);
            const project = workHub.projects.find(projectItem => projectItem.id === item.projectId);
            return (
              <div key={item.id} className="work-meeting-row">
                <strong>{item.title}</strong>
                <small>
                  {new Date(item.start).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  {item.start.slice(0, 10) === today ? " · Today" : ""}
                  {where ? ` · ${where}` : ""}
                  {project ? ` · ${project.name}` : ""}
                </small>
              </div>
            );
          }) : <Empty>Schedule a meeting to keep work visible here.</Empty>}
        </Section>
      </>;
    }
    if (workView === "activity") {
      return <>
        <WorkSubviewHeader title="Recent activity" subtitle="Latest updates across work tasks" />
        <Section icon={Clock3} title="Activity feed">
          {allActivity.length ? allActivity.map(item => (
            <button key={item.id} type="button" className="work-activity-row" onClick={() => openWorkTask?.(item.id)}>
              <strong>{item.title}</strong>
              <small>{item.status === "done" ? "completed" : item.status.replace("_", " ")} · {projectForTask(workHub, item)?.name || "Project"} · {relativeTime(item.updatedAt ?? item.createdAt)}</small>
            </button>
          )) : <Empty>Activity from tasks will show up here.</Empty>}
        </Section>
      </>;
    }
    if (workView === "timesheet") {
      return <>
        <WorkSubviewHeader title="Timesheet" subtitle="Clock in/out, edit hours, export for your contractor" />
        <TimesheetPanel
          timeTracking={timeTracking}
          projects={workHub.projects}
          weekStartsMonday={weekStartsMonday}
          onChange={onTimeTrackingChange}
          onFlash={onTimesheetFlash}
        />
      </>;
    }
    return null;
  })();

  return <div className="os-dashboard work-dashboard">
    <div className="os-hero">
      <div>
        <p className="eyebrow">Your work, in focus</p>
        <h1>WorkOS</h1>
        <p>{activeProjects.length} project{activeProjects.length === 1 ? "" : "s"} · {activeTasks.length} active task{activeTasks.length === 1 ? "" : "s"} · {deliverablesDue.length} due soon</p>
      </div>
      <button className="os-profile-button" onClick={() => focusTask && onFocusWork?.(focusTask.id)} disabled={!focusTask}><Zap size={18} /><span>Focus on work</span></button>
    </div>

    <div className="os-quick-row work-quick-row">
      <QuickAction icon={FolderKanban} label="New project" onClick={() => setCreateKind("project")} />
      <QuickAction icon={FileText} label="New deliverable" onClick={() => setCreateKind("deliverable")} />
      <QuickAction icon={ListTodo} label="New task" onClick={() => setCreateKind("task")} />
      <QuickAction icon={Clock3} label="Timesheet" onClick={() => setWorkView("timesheet")} />
      <QuickAction icon={Clock3} label="Schedule meeting" onClick={() => setCreateKind("meeting")} />
    </div>

    {workView !== "dashboard" && (
      <div className="work-view-nav">
        {([
          { id: "dashboard", label: "Dashboard" },
          { id: "tasks", label: "Tasks" },
          { id: "projects", label: "Projects" },
          { id: "deliverables", label: "Deliverables" },
          { id: "kanban", label: "Kanban" },
          { id: "calendar", label: "Calendar" },
          { id: "timesheet", label: "Timesheet" },
          { id: "activity", label: "Activity" },
        ] as const).map(item => (
          <button key={item.id} type="button" className={workView === item.id ? "selected" : ""} onClick={() => setWorkView(item.id)}>{item.label}</button>
        ))}
      </div>
    )}

    {workView === "dashboard" ? dashboard : subview}

    {createKind === "meeting" && <WorkMeetingModal hub={workHub} close={() => setCreateKind(null)} save={onChange} />}
    {createKind && createKind !== "meeting" && <WorkCreateModal kind={createKind} hub={workHub} close={() => setCreateKind(null)} save={onChange} />}
  </div>;
}

const collectionMeta: Record<LifeHubKey | SchoolHubKey, { title: string; subtitle: string; link?: boolean; visual?: boolean; category?: boolean }> = {
  habits: { title: "Habits", subtitle: "Small actions worth repeating." }, recipes: { title: "Recipes", subtitle: "Meals you want to make again." }, food: { title: "Food storage", subtitle: "What is stocked and what is running low." }, exercises: { title: "Exercises", subtitle: "Your reusable movement library." }, trainings: { title: "Trainings", subtitle: "Workouts and practice sessions." }, trips: { title: "Trips", subtitle: "Places, plans, and travel ideas." }, media: { title: "Books & watchlist", subtitle: "What you are reading, watching, and listening to.", link: true, category: true }, tools: { title: "Useful tools", subtitle: "Links you want close by.", link: true }, contacts: { title: "Contacts", subtitle: "People and context worth remembering." }, documents: { title: "Documents", subtitle: "Important references and links.", link: true }, vault: { title: "Vault links", subtitle: "Secure portal links only. Keep passwords in a password manager.", link: true }, gallery: { title: "Gallery", subtitle: "Images and albums from your life.", visual: true }, vision: { title: "Vision board", subtitle: "A visual home for what you are building toward.", visual: true }, archive: { title: "Archive", subtitle: "Things you want to keep without seeing every day." }, topics: { title: "Topics", subtitle: "Concepts you are learning across courses." }, professors: { title: "Professors", subtitle: "Office hours and contact context." }, goals: { title: "Academic goals", subtitle: "Outcomes you are working toward." },
};

export function HubCollectionModal({ target, records, close, change }: { target: HubCollectionTarget; records: HubRecord[]; close: () => void; change: (records: HubRecord[]) => void }) {
  const meta = collectionMeta[target.key];
  const [adding, setAdding] = useState(Boolean(target.startAdd));
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState(""), [subtitle, setSubtitle] = useState(""), [category, setCategory] = useState("Reading"), [date, setDate] = useState(""), [url, setUrl] = useState("");
  const [location, setLocation] = useState(""), [duration, setDuration] = useState(""), [companions, setCompanions] = useState(""), [notes, setNotes] = useState("");
  const [ingredients, setIngredients] = useState(""), [instructions, setInstructions] = useState(""), [prepTime, setPrepTime] = useState(""), [cookTime, setCookTime] = useState(""), [servings, setServings] = useState(""), [difficulty, setDifficulty] = useState("Medium"), [cuisine, setCuisine] = useState(""), [dietary, setDietary] = useState<string[]>([]);
  const add = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    const newRecord: typeof records[0] = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      category: meta.category ? category : undefined,
      date: date || undefined,
      url: meta.link ? url.trim() || undefined : undefined,
      imageUrl: meta.visual ? url.trim() || undefined : undefined,
      ...(target.key === "trips" ? { location: location.trim() || undefined, duration: duration.trim() || undefined, companions: companions.trim() || undefined, notes: notes.trim() || undefined } : {}),
      ...(target.key === "recipes" ? { ingredients: ingredients.trim() || undefined, instructions: instructions.trim() || undefined, prepTime: prepTime.trim() || undefined, cookTime: cookTime.trim() || undefined, servings: servings.trim() || undefined, difficulty: difficulty || undefined, cuisine: cuisine.trim() || undefined, dietary: dietary.length > 0 ? dietary : undefined } : {}),
      completedDates: target.key === "habits" ? [] : undefined,
      createdAt: new Date().toISOString()
    };
    change([newRecord, ...records]);
    setTitle("");
    setSubtitle("");
    setDate("");
    setUrl("");
    setLocation("");
    setDuration("");
    setCompanions("");
    setNotes("");
    setIngredients("");
    setInstructions("");
    setPrepTime("");
    setCookTime("");
    setServings("");
    setDifficulty("Medium");
    setCuisine("");
    setDietary([]);
    setAdding(false);
  };
  const remove = (record: HubRecord) => { if (window.confirm(`Delete “${record.title}”?`)) change(records.filter(item => item.id !== record.id)); };
  const toggleHabit = (record: HubRecord) => { const today = dateKey(new Date()), dates = record.completedDates ?? []; change(records.map(item => item.id === record.id ? { ...item, completedDates: dates.includes(today) ? dates.filter(value => value !== today) : [...dates, today] } : item)); };
  const visibleRecords = records.filter(record => `${record.title} ${record.subtitle ?? ""} ${record.category ?? ""}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="modal-layer hub-modal-layer" onMouseDown={close}><div className="hub-collection-modal" onMouseDown={event => event.stopPropagation()}><header><div><p className="eyebrow">{target.scope === "life" ? "LifeOS" : "SchoolOS"}</p><h2>{meta.title}</h2><p>{meta.subtitle}</p></div><button aria-label="Close" onClick={close}><X size={19} /></button></header><div className="hub-modal-toolbar"><label><Search size={15} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={"Search " + meta.title.toLowerCase()} /></label><button className="primary" onClick={() => setAdding(value => !value)}><Plus size={15} /> Add</button></div>{adding && <form className="hub-add-form" onSubmit={add}><label>Title<input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder={`New ${meta.title.toLowerCase()}`} /></label><label>Details<input value={subtitle} onChange={event => setSubtitle(event.target.value)} placeholder={target.key === "professors" ? "Email, office hours, or course" : "Optional details"} /></label>{meta.category && <label>Type<select value={category} onChange={event => setCategory(event.target.value)}><option>Reading</option><option>Watching</option><option>Listening</option></select></label>}<label>Date<input type="date" value={date} onChange={event => setDate(event.target.value)} /></label>{target.key === "trips" && <><label>Location<input value={location} onChange={event => setLocation(event.target.value)} placeholder="Destination or starting point" /></label><label>Duration<input value={duration} onChange={event => setDuration(event.target.value)} placeholder="e.g., 3 days, April 5-8" /></label><label>Companions<input value={companions} onChange={event => setCompanions(event.target.value)} placeholder="Travel companions" /></label><label>Notes<textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="Itinerary, budget, or other details" style={{ minHeight: "80px" }} /></label></> }{target.key === "recipes" && <><label>Ingredients<textarea value={ingredients} onChange={event => setIngredients(event.target.value)} placeholder="One ingredient per line" style={{ minHeight: "100px" }} /></label><label>Instructions<textarea value={instructions} onChange={event => setInstructions(event.target.value)} placeholder="Step-by-step instructions" style={{ minHeight: "120px" }} /></label><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}><label>Prep Time<input value={prepTime} onChange={event => setPrepTime(event.target.value)} placeholder="e.g., 15 mins" /></label><label>Cook Time<input value={cookTime} onChange={event => setCookTime(event.target.value)} placeholder="e.g., 30 mins" /></label></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}><label>Servings<input value={servings} onChange={event => setServings(event.target.value)} placeholder="e.g., 4 servings" /></label><label>Cuisine<input value={cuisine} onChange={event => setCuisine(event.target.value)} placeholder="e.g., Italian" /></label></div><label>Difficulty<select value={difficulty} onChange={event => setDifficulty(event.target.value)}><option>Easy</option><option>Medium</option><option>Hard</option></select></label><label>Dietary<div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>{["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free"].map(tag => <button key={tag} type="button" onClick={() => setDietary(dietary.includes(tag) ? dietary.filter(t => t !== tag) : [...dietary, tag])} style={{ padding: "4px 10px", background: dietary.includes(tag) ? "#625af6" : "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid #625af6", borderRadius: "4px", cursor: "pointer", fontSize: "11px" }}>{tag}</button>)}</div></label></> }{(meta.link || meta.visual) && <label>{meta.visual ? "Image URL" : "Link"}<input type="url" value={url} onChange={event => setUrl(event.target.value)} placeholder="https://" /></label>}<div><button type="button" onClick={() => setAdding(false)}>Cancel</button><button className="primary" disabled={!title.trim()}>Save</button></div></form>}<div className={meta.visual ? "hub-visual-list" : "hub-record-list"}>{visibleRecords.length ? visibleRecords.map(record => {
        const countdown = record.date ? getCountdownText(record.date) : null;
        return meta.visual ? <article key={record.id} style={record.imageUrl ? { backgroundImage: `url(${record.imageUrl})` } : undefined}><span>{record.title}</span><button aria-label={`Delete ${record.title}`} onClick={() => remove(record)}><Trash2 size={15} /></button></article> : <article key={record.id}><button className="hub-record-main" onClick={() => target.key === "habits" ? toggleHabit(record) : record.url && window.open(record.url, "_blank", "noopener,noreferrer")}><span className={target.key === "habits" && record.completedDates?.includes(dateKey(new Date())) ? "checked" : ""}>{target.key === "habits" ? <Check size={14} /> : record.url ? <ExternalLink size={14} /> : <Database size={14} />}</span><span><strong>{record.title}</strong><small>{target.key === "trips" && record.date ? <span style={{ color: countdown ? getUrgencyColor(countdown.urgency) : undefined, fontWeight: "500" }}>{countdown?.text}</span> : null}{target.key === "trips" && record.location ? <span> · {record.location}</span> : null}{target.key === "trips" && record.duration ? <span> · {record.duration}</span> : null}{!target.key.startsWith("trip") ? [record.subtitle, record.category, friendlyDate(record.date)].filter(value => value && value !== "No date").join(" · ") : null}{record.subtitle && !target.key.startsWith("trip") && <></>}</small>{target.key === "trips" && (record.companions || record.notes) && <small style={{ display: "block", marginTop: "4px", fontSize: "12px" }}>{record.companions ? `👥 ${record.companions}` : ""}{record.companions && record.notes ? " · " : ""}{record.notes ? `📝 ${record.notes}` : ""}</small>}{target.key === "recipes" && (record.prepTime || record.cookTime || record.servings || record.difficulty) && <small style={{ display: "block", marginTop: "4px", fontSize: "12px" }}>{record.prepTime ? `⏱ ${record.prepTime}` : ""}{record.prepTime && record.cookTime ? " · " : ""}{record.cookTime ? `🔥 ${record.cookTime}` : ""}{(record.prepTime || record.cookTime) && (record.servings || record.difficulty) ? " · " : ""}{record.servings ? `🍽 ${record.servings}` : ""}{record.servings && record.difficulty ? " · " : ""}{record.difficulty ? `${record.difficulty}` : ""}{record.dietary && record.dietary.length > 0 ? ` · ${record.dietary.join(", ")}` : ""}</small>}{target.key === "recipes" && record.cuisine && <small style={{ display: "block", marginTop: "2px", fontSize: "11px", opacity: "0.7" }}>🌍 {record.cuisine}</small>}</span></button><button className="hub-record-delete" aria-label={`Delete ${record.title}`} onClick={() => remove(record)}><Trash2 size={15} /></button></article>;
      }) : <Empty>Nothing here yet. Add the first item when it is useful.</Empty>}</div></div></div>;
}

export function SchoolProfileModal({ profile, close, save }: { profile: SchoolHubState["profile"]; close: () => void; save: (profile: SchoolHubState["profile"]) => void }) {
  const [major, setMajor] = useState(profile.major ?? ""), [minor, setMinor] = useState(profile.minor ?? ""), [classOf, setClassOf] = useState(profile.classOf ?? "");
  return <div className="modal-layer hub-modal-layer" onMouseDown={close}><form className="hub-profile-modal" onMouseDown={event => event.stopPropagation()} onSubmit={event => { event.preventDefault(); save({ major: major.trim() || undefined, minor: minor.trim() || undefined, classOf: classOf.trim() || undefined }); close(); }}><header><span><GraduationCap size={18} /></span><div><h2>Academic profile</h2><p>Keep the context you want visible on SchoolOS.</p></div><button type="button" onClick={close}><X size={18} /></button></header><label>Major<input autoFocus value={major} onChange={event => setMajor(event.target.value)} placeholder="Information systems" /></label><label>Minor<input value={minor} onChange={event => setMinor(event.target.value)} placeholder="Optional" /></label><label>Class of<input value={classOf} onChange={event => setClassOf(event.target.value)} placeholder="2027" /></label><div><button type="button" onClick={close}>Cancel</button><button className="primary">Save profile</button></div></form></div>;
}

export function SchoolClassPickerModal({ classes, title, close, pick }: { classes: DashboardClass[]; title: string; close: () => void; pick: (id: string) => void }) {
  return <div className="modal-layer hub-modal-layer" onMouseDown={close}><div className="hub-class-picker" onMouseDown={event => event.stopPropagation()}><header><div><p className="eyebrow">SchoolOS</p><h2>{title}</h2><p>Choose the course this belongs to.</p></div><button onClick={close}><X size={18} /></button></header><div>{classes.filter(item => !item.archived).map(item => <button key={item.id} onClick={() => pick(item.id)}><i style={{ background: item.color }} /><span><strong>{item.code}</strong><small>{item.name}</small></span><ChevronRight size={16} /></button>)}</div></div></div>;
}
