"use client";

import { useState } from "react";
import {
  Activity, Archive, BookOpen, CalendarDays, Check, CheckCircle2, ChevronRight,
  Clock3, Code2, Database, ExternalLink, FileText, FolderKanban, GraduationCap, Image,
  Library, Link2, ListTodo, Map, NotebookPen, Plus, Search,
  Target, Trash2, UserRound, Users, Utensils, X,
} from "lucide-react";
import { getCountdownText, getUrgencyColor } from "@/lib/helpers";

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

export type WorkHubState = {
  portfolio: HubRecord[];
  clients: HubRecord[];
  skills: HubRecord[];
  goals: HubRecord[];
};

export type LifeHubKey = keyof LifeHubState;
export type SchoolHubKey = Exclude<keyof SchoolHubState, "profile">;
export type WorkHubKey = keyof WorkHubState;
export type HubCollectionTarget = { scope: "life"; key: LifeHubKey; startAdd?: boolean } | { scope: "school"; key: SchoolHubKey; startAdd?: boolean } | { scope: "work"; key: WorkHubKey; startAdd?: boolean };

export const emptyLifeHub: LifeHubState = {
  habits: [], recipes: [], food: [], exercises: [], trainings: [], trips: [], media: [],
  tools: [], contacts: [], documents: [], vault: [], gallery: [], vision: [], archive: [],
};
export const emptySchoolHub: SchoolHubState = { profile: {}, topics: [], professors: [], goals: [] };
export const emptyWorkHub: WorkHubState = { portfolio: [], clients: [], skills: [], goals: [] };

type DashboardTask = { id: number; title: string; project: string; color: string; due?: string; priority: string; classId?: string; academicType?: string; gradeWeight?: number; done?: boolean; canceled?: boolean };
type DashboardProject = { name: string; desc: string; progress: number; color: string; kind: "maintenance" | "finishable"; tasks: number };
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

function periodProgress(now = new Date()) {
  const day = (now.getHours() * 60 + now.getMinutes()) / 1440;
  const week = (((now.getDay() + 6) % 7) + day) / 7;
  const month = (now.getDate() - 1 + day) / new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const start = new Date(now.getFullYear(), 0, 1), end = new Date(now.getFullYear() + 1, 0, 1);
  return { Day: day, Week: week, Month: month, Year: (now.getTime() - start.getTime()) / (end.getTime() - start.getTime()) };
}

export function LifeDashboard({ tasks, projects, notes, events, life, workspaceName, onComplete, onOpenTask, onOpenProject, onOpenNote, onOpenTasks, onOpenProjects, onOpenNotes, onNewTask, onNewProject, onNewNote, onOpenCalendar, onOpenNow, onOpenCollection, onToggleHabit }: {
  tasks: DashboardTask[]; projects: DashboardProject[]; notes: DashboardNote[]; events: DashboardEvent[]; life: LifeHubState; workspaceName: string;
  onComplete: (id: number) => void; onOpenTask: (id: number) => void; onOpenProject: (name: string) => void; onOpenNote: (id: string) => void;
  onOpenTasks: () => void; onOpenProjects: () => void; onOpenNotes: () => void;
  onNewTask: () => void; onNewProject: () => void; onNewNote: () => void; onOpenCalendar: () => void; onOpenNow: () => void;
  onOpenCollection: (key: LifeHubKey, startAdd?: boolean) => void; onToggleHabit: (id: string) => void;
}) {
  const now = new Date(), { today, end } = weekWindow();
  const weekTasks = tasks.filter(task => !task.classId && openTask(task) && (!task.due || (task.due >= today && task.due <= end))).sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));
  const recentNotes = notes.filter(note => !note.classId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4);
  const upcoming = events.filter(event => event.start.slice(0, 10) >= today).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 4);
  const media = (category: string) => life.media.filter(item => item.category === category).slice(0, 3);
  const habitsDone = life.habits.filter(item => item.completedDates?.includes(today)).length;
  const progress = periodProgress(now);
  const databaseLinks: { key: LifeHubKey; label: string; icon: typeof Database }[] = [
    { key: "recipes", label: "Recipes", icon: Utensils }, { key: "exercises", label: "Exercise", icon: Activity },
    { key: "trips", label: "Trips", icon: Map }, { key: "contacts", label: "Contacts", icon: Users },
    { key: "documents", label: "Documents", icon: FileText }, { key: "tools", label: "Tools", icon: Link2 },
    { key: "gallery", label: "Gallery", icon: Image }, { key: "archive", label: "Archive", icon: Archive },
  ];
  return <div className="os-dashboard life-dashboard">
    <div className="os-hero"><div><p className="eyebrow">{now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p><h1>LifeOS</h1><p>Hey {workspaceName.split(" ")[0]}. Keep life moving without turning it into admin.</p></div><button className="os-now-button" onClick={onOpenNow}><Target size={18} /> Open Now</button></div>
    <div className="os-quick-row"><QuickAction icon={NotebookPen} label="New note" onClick={onNewNote} /><QuickAction icon={ListTodo} label="New task" onClick={onNewTask} /><QuickAction icon={FolderKanban} label="New project" onClick={onNewProject} /><QuickAction icon={Map} label="Trip idea" onClick={() => onOpenCollection("trips", true)} /><QuickAction icon={Utensils} label="New recipe" onClick={() => onOpenCollection("recipes", true)} /><QuickAction icon={Activity} label="Training" onClick={() => onOpenCollection("trainings", true)} /></div>
    <div className="os-dashboard-grid">
      <div className="os-dashboard-main">
        <Section icon={CheckCircle2} title="Tasks this week" action="All tasks" onAction={onOpenTasks}>{weekTasks.length ? weekTasks.slice(0, 5).map(task => <Row key={task.id} icon={ListTodo} color={task.color} title={task.title} meta={`${task.project || "Inbox"} · ${friendlyDate(task.due)} · ${task.priority}`} onClick={() => onOpenTask(task.id)} onComplete={() => onComplete(task.id)} />) : <Empty>No personal tasks are due in the next seven days.</Empty>}</Section>
        <Section icon={FolderKanban} title="Active projects" action="All projects" onAction={onOpenProjects}>{projects.length ? <div className="os-project-strip">{projects.slice(0, 4).map(project => <button key={project.name} onClick={() => onOpenProject(project.name)}><i style={{ background: project.color }} /><strong>{project.name}</strong><span>{project.desc}</span><div><b style={{ width: `${project.progress}%`, background: project.color }} /></div></button>)}</div> : <Empty>Create a project and it will live here.</Empty>}</Section>
        <div className="os-two-up">
          <Section icon={NotebookPen} title="Recent notes" action="All notes" onAction={onOpenNotes}>{recentNotes.length ? recentNotes.map(note => <Row key={note.id} icon={NotebookPen} title={note.title || "Untitled note"} meta={`${stripHtml(note.body).slice(0, 48) || "Empty note"} · ${friendlyDate(note.updatedAt)}`} onClick={() => onOpenNote(note.id)} />) : <Empty>Your newest personal notes will show here.</Empty>}</Section>
          <Section icon={CalendarDays} title="Coming up" action="Calendar" onAction={onOpenCalendar}>{upcoming.length ? upcoming.map(event => <Row key={event.id} icon={CalendarDays} color={event.color} title={event.title} meta={new Date(event.start).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} onClick={onOpenCalendar} />) : <Empty>Your next calendar events will show here.</Empty>}</Section>
        </div>
        <div className="os-media-grid">{["Watching", "Reading", "Listening"].map(category => <Section key={category} icon={category === "Reading" ? BookOpen : Library} title={`${category} now`} action="Add" onAction={() => onOpenCollection("media", true)}>{media(category).length ? media(category).map(item => <Row key={item.id} icon={Library} title={item.title} meta={item.subtitle || category} onClick={() => item.url && window.open(item.url, "_blank", "noopener,noreferrer")} />) : <Empty>Add something you are {category.toLowerCase()}.</Empty>}</Section>)}</div>
      </div>
      <aside className="os-dashboard-side">
        <Section icon={Activity} title="Habits today" action="Manage" onAction={() => onOpenCollection("habits")}><div className="os-habit-summary"><strong>{habitsDone}<span>/{life.habits.length}</span></strong><p>completed today</p></div>{life.habits.length ? life.habits.slice(0, 6).map(habit => <button className="os-habit" key={habit.id} onClick={() => onToggleHabit(habit.id)}><span className={habit.completedDates?.includes(today) ? "done" : ""}>{habit.completedDates?.includes(today) && <Check size={12} />}</span><strong>{habit.title}</strong></button>) : <Empty>Add a few habits worth repeating.</Empty>}</Section>
        <Section icon={Clock3} title="Time progress"><div className="os-progress-list">{Object.entries(progress).map(([label, value]) => <div key={label}><span>{label}</span><div><i style={{ width: `${Math.round(value * 100)}%` }} /></div><strong>{Math.round(value * 100)}%</strong></div>)}</div></Section>
        <Section icon={Database} title="Life databases"><div className="os-database-grid">{databaseLinks.map(({ key, label, icon: Icon }) => <button key={key} onClick={() => onOpenCollection(key)}><Icon size={15} /><span>{label}</span><small>{life[key].length}</small></button>)}</div></Section>
      </aside>
    </div>
    <Section icon={Image} title="Vision board" action="Open board" onAction={() => onOpenCollection("vision")} className="os-vision-section">{life.vision.length ? <div className="os-vision-grid">{life.vision.slice(0, 6).map(item => <button key={item.id} onClick={() => onOpenCollection("vision")} style={item.imageUrl ? { backgroundImage: `url(${item.imageUrl})` } : undefined}><span>{item.title}</span></button>)}</div> : <Empty>Add images and goals you want to keep visible.</Empty>}</Section>
  </div>;
}

export function SchoolDashboard({ tasks, classes, notes, school, onComplete, onOpenTask, onOpenClass, onOpenNote, onNewCourse, onNewAcademic, onNewLecture, onOpenCollection, onOpenProfile, onFocus, enableStudyAbroad, onToggleStudyAbroad }: {
  tasks: DashboardTask[]; classes: DashboardClass[]; notes: DashboardNote[]; school: SchoolHubState;
  onComplete: (id: number) => void; onOpenTask: (id: number) => void; onOpenClass: (id: string) => void; onOpenNote: (id: string) => void;
  onNewCourse: () => void; onNewAcademic: () => void; onNewLecture: () => void; onOpenCollection: (key: SchoolHubKey, startAdd?: boolean) => void; onOpenProfile: () => void; onFocus: (id: number) => void;
  enableStudyAbroad?: boolean; onToggleStudyAbroad?: (enabled: boolean) => void;
}) {
  const { today, end } = weekWindow();
  const courses = classes.filter(item => !item.archived);
  const academic = tasks.filter(task => task.classId && openTask(task) && (!task.due || (task.due >= today && task.due <= end))).sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));
  const assignments = academic.filter(task => task.academicType && !["Reading", "Discussion"].includes(task.academicType));
  const lectureNotes = notes.filter(note => note.classId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);
  const courseFor = (id?: string) => courses.find(course => course.id === id);
  return <div className="os-dashboard school-dashboard">
    <div className="os-hero"><div><p className="eyebrow">Current term</p><h1>SchoolOS</h1><p>{courses.length} course{courses.length === 1 ? "" : "s"} · {academic.length} item{academic.length === 1 ? "" : "s"} due this week</p></div><div style={{ display: "flex", gap: "8px" }}>{onToggleStudyAbroad && <button className="os-profile-button" onClick={() => onToggleStudyAbroad(!enableStudyAbroad)} style={{ background: enableStudyAbroad ? "rgba(98, 90, 246, 0.1)" : "", color: enableStudyAbroad ? "#625af6" : "inherit" }} title={enableStudyAbroad ? "Disable Study Abroad" : "Enable Study Abroad"}><GraduationCap size={18} /><span>{enableStudyAbroad ? "Study Abroad" : "Add Study Abroad"}</span></button>}<button className="os-profile-button" onClick={onOpenProfile}><UserRound size={18} /><span>{school.profile.major || "Academic profile"}</span></button></div></div>
    <div className="os-quick-row"><QuickAction icon={BookOpen} label="New course" onClick={onNewCourse} /><QuickAction icon={ListTodo} label="School task" onClick={onNewAcademic} /><QuickAction icon={FileText} label="Assignment" onClick={onNewAcademic} /><QuickAction icon={NotebookPen} label="Lecture note" onClick={onNewLecture} /><QuickAction icon={Database} label="New topic" onClick={() => onOpenCollection("topics", true)} /></div>
    <div className="os-school-layout"><div className="os-school-main">
      <Section icon={BookOpen} title="Courses right now" action="New course" onAction={onNewCourse}>{courses.length ? <div className="os-course-strip">{courses.map(course => <button key={course.id} onClick={() => onOpenClass(course.id)} style={{ borderTopColor: course.color }}><span style={{ background: course.color }}><BookOpen size={16} /></span><strong>{course.code}</strong><p>{course.name}</p><small>{academic.filter(task => task.classId === course.id).length} due this week</small></button>)}</div> : <Empty>Add your current courses to start the academic dashboard.</Empty>}</Section>
      <div className="os-two-up"><Section icon={ListTodo} title="Tasks this week" action="Add" onAction={onNewAcademic}>{academic.length ? academic.slice(0, 5).map(task => <Row key={task.id} icon={ListTodo} color={courseFor(task.classId)?.color} title={task.title} meta={`${courseFor(task.classId)?.code ?? "School"} · ${friendlyDate(task.due)} · ${task.priority}`} onClick={() => onOpenTask(task.id)} onComplete={() => onComplete(task.id)} />) : <Empty>No school tasks are due in the next seven days.</Empty>}</Section><Section icon={FileText} title="Assignments this week" action="Add" onAction={onNewAcademic}>{assignments.length ? assignments.slice(0, 5).map(task => <Row key={task.id} icon={FileText} color={courseFor(task.classId)?.color} title={task.title} meta={`${task.academicType} · ${friendlyDate(task.due)}${task.gradeWeight !== undefined ? ` · ${task.gradeWeight}%` : ""}`} onClick={() => onOpenTask(task.id)} />) : <Empty>Assignments, exams, labs, and projects collect here.</Empty>}</Section></div>
      <Section icon={NotebookPen} title="Lecture notes this week" action="New note" onAction={onNewLecture}>{lectureNotes.length ? lectureNotes.map(note => <Row key={note.id} icon={NotebookPen} color={courseFor(note.classId)?.color} title={note.title || "Untitled note"} meta={`${courseFor(note.classId)?.code ?? "School"} · ${friendlyDate(note.updatedAt)}`} onClick={() => onOpenNote(note.id)} />) : <Empty>Course-linked notes will show up here.</Empty>}</Section>
    </div><aside>
      <button className="os-focus-callout" onClick={academic[0] ? () => onFocus(academic[0].id) : courses.length ? onNewAcademic : onNewCourse}><Target size={22} /><span><small>{academic[0] ? "Start focus" : courses.length ? "Next step" : "Set up SchoolOS"}</small><strong>{academic[0]?.title || (courses.length ? "Add a school task" : "Add your first course")}</strong><p>{academic[0] ? `${courseFor(academic[0].classId)?.code ?? "School"} · ${friendlyDate(academic[0].due)}` : courses.length ? "Create coursework before starting focus" : "Courses hold tasks, assignments, and notes"}</p></span><ChevronRight size={18} /></button>
      <Section icon={UserRound} title="Personal" action="Edit" onAction={onOpenProfile}><dl className="os-profile-list"><div><dt>Major</dt><dd>{school.profile.major || "Not set"}</dd></div><div><dt>Minor</dt><dd>{school.profile.minor || "Not set"}</dd></div><div><dt>Class of</dt><dd>{school.profile.classOf || "Not set"}</dd></div></dl></Section>
      <Section icon={Database} title="Academic databases"><div className="os-database-grid single">{([{ key: "topics", label: "Topics", icon: Database }, { key: "professors", label: "Professors", icon: Users }, { key: "goals", label: "Goals", icon: Target }] as const).map(({ key, label, icon: Icon }) => <button key={key} onClick={() => onOpenCollection(key)}><Icon size={15} /><span>{label}</span><small>{school[key].length}</small></button>)}</div></Section>
    </aside></div>
  </div>;
}

export function WorkDashboard({ tasks, projects, work, onComplete, onOpenTask, onOpenProject, onNewTask, onNewProject, onOpenCollection, onOpenNow }: {
  tasks: DashboardTask[]; projects: DashboardProject[]; work: WorkHubState;
  onComplete: (id: number) => void; onOpenTask: (id: number) => void; onOpenProject: (name: string) => void;
  onNewTask: () => void; onNewProject: () => void; onOpenCollection: (key: WorkHubKey, startAdd?: boolean) => void; onOpenNow: () => void;
}) {
  const now = new Date(), { today, end } = weekWindow();
  const workTasks = tasks.filter(task => !task.classId && openTask(task) && (!task.due || (task.due >= today && task.due <= end))).sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));
  const workProjects = projects.filter(p => p.name).slice(0, 8);
  const databaseLinks: { key: WorkHubKey; label: string; icon: typeof Database }[] = [
    { key: "portfolio", label: "Portfolio", icon: FileText }, { key: "clients", label: "Clients", icon: Users },
    { key: "skills", label: "Skills", icon: Code2 }, { key: "goals", label: "Goals", icon: Target },
  ];
  return <div className="os-dashboard work-dashboard">
    <div className="os-hero"><div><p className="eyebrow">{now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p><h1>WorkOS</h1><p>Stay focused on what moves work forward. Progress over perfection.</p></div><button className="os-now-button" onClick={onOpenNow}><Target size={18} /> Open Now</button></div>
    <div className="os-quick-row"><QuickAction icon={ListTodo} label="New task" onClick={onNewTask} /><QuickAction icon={FolderKanban} label="New project" onClick={onNewProject} /><QuickAction icon={Database} label="Portfolio item" onClick={() => onOpenCollection("portfolio", true)} /></div>
    <div className="os-work-layout"><div className="os-work-main">
      <Section icon={ListTodo} title="This week's work" action="Add" onAction={onNewTask}>{workTasks.length ? workTasks.slice(0, 8).map(task => <Row key={task.id} icon={ListTodo} color={workProjects.find(p => p.name === task.project)?.color} title={task.title} meta={`${task.project} · ${friendlyDate(task.due)} · ${task.priority}`} onClick={() => onOpenTask(task.id)} onComplete={() => onComplete(task.id)} />) : <Empty>No work tasks due this week. Plan your next steps.</Empty>}</Section>
      <Section icon={FolderKanban} title="Active projects" action="New project" onAction={onNewProject}>{workProjects.length ? <div className="os-project-grid">{workProjects.map(project => <button key={project.name} onClick={() => onOpenProject(project.name)} style={{ borderLeftColor: project.color }}><span style={{ color: project.color }}><FolderKanban size={14} /></span><strong>{project.name}</strong><small>{project.tasks} task{project.tasks === 1 ? "" : "s"}</small></button>)}</div> : <Empty>Create a project to organize your work.</Empty>}</Section>
    </div><aside>
      <Section icon={Database} title="Work databases"><div className="os-database-grid single">{databaseLinks.map(({ key, label, icon: Icon }) => <button key={key} onClick={() => onOpenCollection(key)}><Icon size={15} /><span>{label}</span><small>{work[key].length}</small></button>)}</div></Section>
    </aside></div>
  </div>;
}

const collectionMeta: Record<LifeHubKey | SchoolHubKey | WorkHubKey, { title: string; subtitle: string; link?: boolean; visual?: boolean; category?: boolean }> = {
  habits: { title: "Habits", subtitle: "Small actions worth repeating." }, recipes: { title: "Recipes", subtitle: "Meals you want to make again." }, food: { title: "Food storage", subtitle: "What is stocked and what is running low." }, exercises: { title: "Exercises", subtitle: "Your reusable movement library." }, trainings: { title: "Trainings", subtitle: "Workouts and practice sessions." }, trips: { title: "Trips", subtitle: "Places, plans, and travel ideas." }, media: { title: "Books & watchlist", subtitle: "What you are reading, watching, and listening to.", link: true, category: true }, tools: { title: "Useful tools", subtitle: "Links you want close by.", link: true }, contacts: { title: "Contacts", subtitle: "People and context worth remembering." }, documents: { title: "Documents", subtitle: "Important references and links.", link: true }, vault: { title: "Vault links", subtitle: "Secure portal links only. Keep passwords in a password manager.", link: true }, gallery: { title: "Gallery", subtitle: "Images and albums from your life.", visual: true }, vision: { title: "Vision board", subtitle: "A visual home for what you are building toward.", visual: true }, archive: { title: "Archive", subtitle: "Things you want to keep without seeing every day." }, topics: { title: "Topics", subtitle: "Concepts you are learning across courses." }, professors: { title: "Professors", subtitle: "Office hours and contact context." }, goals: { title: "Academic goals", subtitle: "Outcomes you are working toward." }, portfolio: { title: "Portfolio", subtitle: "Projects and work you want to showcase." }, clients: { title: "Clients", subtitle: "People and organizations you work with." }, skills: { title: "Skills", subtitle: "Expertise and capabilities you are building." },
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
