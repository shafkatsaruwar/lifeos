"use client";

// LifeOS Module Architecture
// ==========================
// LifeOS is designed as a pluggable module system where each feature (Tasks, Calendar, Projects, Brain, etc.)
// is an independent module that owns its own:
// - Data structures and state management
// - Logic and business rules
// - Navigation and routing
// - UI components and widgets
//
// The Dashboard is not a monolithic view that hardcodes all sections. Instead:
// 1. Each module registers itself and declares what it contributes
// 2. Modules can contribute: dashboard cards, quick actions, notifications, status summaries
// 3. Dashboard discovers registered modules and renders their contributions
// 4. Modules are sorted by order and rendered dynamically
//
// This architecture makes LifeOS highly extensible:
// - New modules (Synapse, Photography, Finance, Career, AI) can be added without modifying Dashboard
// - Modules can be toggled on/off without breaking the system
// - Modules are independently testable and maintainable
// - Future integrations (calendar sync, task automation, etc.) can be modules
//
// Gradual Implementation Plan:
// Phase 1: TasksModule (priorities, today's tasks)
// Phase 2: FocusModule (next focus, focus sessions)
// Phase 3: CalendarModule (today's schedule, events)
// Phase 4: ProjectsModule (active projects, project cards)
// Phase 5: BrainModule (inbox, capture, notes)
// Phase 6: Third-party modules (Synapse sync, photography workflows, etc.)

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { syncDataToFirebase, loadDataFromFirebase, listenToFirebaseChanges, stopListeningToFirebaseChanges, pullAllDataFromFirebase, setUserId, clearUserId, getUserId } from "@/lib/dataSync";
import { signInWithGoogle, signOut, onAuthStateChanged, getClientAuth } from "@/lib/firebase";
import { logger } from "@/lib/logger";
import { PRIORITY_RANK, TEST_USER, STORAGE_KEYS } from "@/lib/constants";
import { checkDoubleBooking, formatDueDate, toDateKey, getCountdownText, getUrgencyColor, getUrgencyPercentage } from "@/lib/helpers";
import { getFileStorage } from "@/lib/fileStorage";
import { GlobalNotificationShell } from "@/app/components/NotificationCenter";
import {
  generateLifeOSNotifications,
  loadDismissedNotificationIds,
  saveDismissedNotificationIds,
  isBannerCandidate,
  notificationSourceLabel,
  type LifeOSNotification,
  type NotificationAction,
} from "@/lib/notifications";
import { NLTaskCreationModal } from "@/app/components/NLTaskCreationModal";
import {
  HubCollectionModal, LifeDashboard, SchoolClassPickerModal, SchoolDashboard, SchoolProfileModal, WorkDashboard,
  emptyLifeHub, emptySchoolHub, emptyWorkHub, createSampleWorkHub,
  type HubCollectionTarget, type LifeHubKey, type LifeHubState, type SchoolHubKey, type SchoolHubState,
  type WorkHubState, type WorkProject, type WorkDeliverable, type WorkTask, type WorkMeeting, type WorkView, type SchoolView,
} from "@/app/components/OSDashboards";
import type { ParsedTask } from "@/lib/useNLTaskCreation";
import { useTaskBreakdown } from "@/lib/useTaskBreakdown";
import {
  Aperture, Archive, ArrowRight, Brain, CalendarDays, Check, CheckCircle2,
  ChevronDown, Circle, Clock3, Command, FileText, Flame, Focus, FolderKanban,
  Home, Inbox, LayoutGrid, Library, Link2, ListTodo, Menu, Moon, MoreHorizontal,
  Mail, Music2, Plus, Search, Settings, Sparkles, Sun, TimerReset, UserRound, X, Zap,
  Ban, Pencil, Trash2, Bell, Download, Palette, Shield, SlidersHorizontal, Coffee, Maximize, Mic,
  GraduationCap, NotebookPen, BookOpen, ExternalLink, Upload, RefreshCw, Bold, Italic, List, Heading1, Highlighter,
  BriefcaseBusiness, Camera, Code2, HeartPulse, Utensils,
} from "lucide-react";

type View = "Life" | "School" | "Work" | "Now" | "Today" | "Spaces" | "Library" | "Settings" | "Dashboard" | "Focus" | "Tasks" | "Calendar" | "Notes" | "Brain" | "Knowledge" | "Resources";
type EnergyLevel = "Low" | "Medium" | "High";
type TaskStatus = "Not started" | "In progress" | "Waiting" | "Blocked" | "Done" | "Canceled";
type AcademicItemType = "Assignment" | "Project" | "Exam" | "Quiz" | "Lab" | "Reading" | "Discussion";
type TaskProperty = { id: string; name: string; value: string };
type Task = { id: number; title: string; project: string; color: string; due: string; startTime?: string; priority: "High" | "Medium" | "Low"; focusMinutes: number; energy: EnergyLevel; status?: TaskStatus; notes?: string; handoffNote?: string; nextAction?: string; followUpDate?: string; recurringDays?: number; completedAt?: string; customProperties?: TaskProperty[]; checklist?: string[]; checklistProgress?: boolean[]; focusRemainingSeconds?: number; focusSessionStarted?: boolean; focusSessionRunning?: boolean; focusHalfwayPrompted?: boolean; classId?: string; academicType?: AcademicItemType; gradeWeight?: number; pointsEarned?: number; pointsPossible?: number; submission?: string; calendarEventId?: string; done?: boolean; canceled?: boolean };
type FocusSessionUpdate = { remainingSeconds: number; hasStarted: boolean; isRunning: boolean; halfwayPrompted: boolean };
type ProjectKind = "maintenance" | "finishable";
type SpaceKind = "class" | "project" | "maintenance";
type ProjectIcon = "Zap" | "Aperture" | "Sparkles" | "FileText" | "UserRound" | "FolderKanban" | "BriefcaseBusiness" | "Camera" | "Code2" | "HeartPulse" | "Utensils" | "BookOpen";
type Resource = { id: string; name: string; type: string; size: number; url: string; uploadedAt: string; classId?: string; projectName?: string; storagePath?: string; storage?: "cloud" | "local" };
type Project = { name: string; desc: string; progress: number; color: string; icon: typeof Home; iconName: ProjectIcon; tasks: number; kind: ProjectKind };
type CalendarEvent = { id: string; title: string; start: string; end?: string; source: "LifeOS" | "iCal" | "Google" | "Outlook"; color: string; notes?: string };
type ClassRecord = { id: string; code: string; name: string; term: string; instructor: string; color: string; location?: string; credits?: number; semesterEnd?: string; archived?: boolean };
type Note = { id: string; title: string; body: string; classId?: string; projectName?: string; template?: "blank" | "lined" | "dotted" | "cornell" | "meeting"; updatedAt: string };
type AmbientActivity = { title: string; startedAt: string; note?: string; spaceName?: string; spaceColor?: string };
type AmbientDraft = { title: string; spaceName?: string; sourceLabel?: string } | null;
type WeeklyPlanItem = { id: string; text: string };
type WeeklyPlan = { [dayOfWeek: number]: WeeklyPlanItem[] }; // 0=Sunday through 6=Saturday

// Work OS types imported from OSDashboards

const routedViews: Record<string, View> = {
  life: "Life", school: "School", work: "Work",
  now: "Now", dashboard: "Life", today: "Calendar", calendar: "Calendar", spaces: "Spaces",
  library: "Library", notes: "Library", resources: "Library", brain: "Library", knowledge: "Library",
  settings: "Settings", tasks: "Tasks",
};
const viewFromLocation = (): View => {
  if (typeof window === "undefined") return "Now";
  return routedViews[new URLSearchParams(window.location.search).get("view")?.toLowerCase() ?? ""] ?? "Now";
};
type SettingsState = {
  accent: string;
  dailyDigest: boolean;
  focusReminders: boolean;
  calendarAlerts: boolean;
  soundEffects: boolean;
  defaultFocusMinutes: number;
  defaultEnergy: EnergyLevel;
  weekStartsMonday: boolean;
  compactMode: boolean;
  reduceMotion: boolean;
  nowTaskId?: number | null;
  spaceContext?: Record<string, { lastTaskId?: number; lastFilter?: string; updatedAt?: string }>;
  ambientActivity?: AmbientActivity | null;
  currentEnergy?: EnergyLevel;
  dailyReviewDate?: string;
  weeklyReviewDate?: string;
  momentumLog?: { id: string; at: string; type: "done" | "focus" | "capture"; title: string }[];
  preferredName?: string;
  enableLifeOS?: boolean;
  enableSchoolOS?: boolean;
  enableWorkOS?: boolean;
};

const projectIcons: Record<ProjectIcon, typeof Home> = { Zap, Aperture, Sparkles, FileText, UserRound, FolderKanban, BriefcaseBusiness, Camera, Code2, HeartPulse, Utensils, BookOpen };

const nav: { category?: string; name: View; icon: typeof Home }[] = [
  { name: "Now", icon: TimerReset },
  { category: "ENVIRONMENTS", name: "Life", icon: Home },
  { name: "Work", icon: BriefcaseBusiness },
  { name: "School", icon: GraduationCap },
  { category: "NAVIGATION", name: "Tasks", icon: CheckCircle2 },
  { name: "Calendar", icon: CalendarDays },
  { name: "Library", icon: Library },
];

const initialTasks: Task[] = [
  { id: 1, title: "Finalize onboarding flow", project: "Synapse", color: "#635bff", due: "2026-07-10", priority: "High", focusMinutes: 45, energy: "High" },
  { id: 2, title: "Edit Brooklyn portrait set", project: "Photography", color: "#e48b6b", due: "2026-07-10", priority: "Medium", focusMinutes: 60, energy: "Medium" },
  { id: 3, title: "Review personal statement draft", project: "Master's Applications", color: "#47a47b", due: "2026-07-10", priority: "High", focusMinutes: 30, energy: "High" },
  { id: 4, title: "Update catering menu pricing", project: "Mom's Catering", color: "#d99b38", due: "2026-07-11", priority: "Medium", focusMinutes: 25, energy: "Medium" },
  { id: 5, title: "Prepare portfolio case study", project: "Career", color: "#4e8bd7", due: "2026-07-12", priority: "Low", focusMinutes: 45, energy: "Low" },
];

const initialSettings: SettingsState = {
  accent: "#625af6",
  dailyDigest: true,
  focusReminders: true,
  calendarAlerts: true,
  soundEffects: false,
  defaultFocusMinutes: 45,
  defaultEnergy: "Medium",
  weekStartsMonday: false,
  compactMode: false,
  reduceMotion: false,
  nowTaskId: null,
  spaceContext: {},
  ambientActivity: null,
  currentEnergy: "Medium",
  momentumLog: [],
  enableLifeOS: true,
  enableSchoolOS: true,
  enableWorkOS: true,
};

// New users start with three empty project templates to explore the product
const initialProjects: Project[] = [
  { name: "Project 1", desc: "A focused project with a finish line.", progress: 0, color: "#625af6", icon: FolderKanban, iconName: "FolderKanban", tasks: 0, kind: "finishable" },
  { name: "Project 2", desc: "A focused project with a finish line.", progress: 0, color: "#4b8bdc", icon: FolderKanban, iconName: "FolderKanban", tasks: 0, kind: "finishable" },
  { name: "Project 3", desc: "A focused project with a finish line.", progress: 0, color: "#47a47b", icon: FolderKanban, iconName: "FolderKanban", tasks: 0, kind: "finishable" },
];

const starterTaskSignature = initialTasks.map(task => `${task.id}:${task.title}`).join("|");
const isStarterTaskSet = (items: Task[]) => items.length === initialTasks.length && items.map(task => `${task.id}:${task.title}`).join("|") === starterTaskSignature;
const recoverSpacesFromTasks = (items: Task[]): Project[] => {
  const spaces = new Map<string, Project>();
  for (const task of items) {
    if (!task.project || task.project === "Inbox" || task.classId || spaces.has(task.project)) continue;
    spaces.set(task.project, {
      name: task.project,
      desc: "Recovered from tasks already linked to this space.",
      progress: 0,
      color: task.color || "#625af6",
      iconName: "FolderKanban",
      icon: projectIcons.FolderKanban,
      tasks: 0,
      kind: "finishable",
    });
  }
  return [...spaces.values()];
};

const initialBrainItems: string[] = [];

const initialCalendarEvents: CalendarEvent[] = [];

const defaultFocusChecklist = ["Choose the next visible step", "Make one meaningful pass", "Leave a clear handoff note"];
const focusChecklistTemplates = [
  { name: "Default", items: defaultFocusChecklist },
  { name: "Admin", items: ["Open the right portal or email", "Find the exact required info", "Send / save / confirm it is done"] },
  { name: "Writing", items: ["Write the messy first pass", "Tighten the strongest points", "Leave one clear next edit note"] },
  { name: "Deep work", items: ["Define the tiny outcome", "Block distractions", "Make one meaningful pass"] },
  { name: "Errands", items: ["Check what is needed", "Do the physical / outside step", "Confirm and reset your space"] },
  { name: "Study", items: ["Pick the exact section", "Active recall before notes", "Write the confusing question"] },
];

const formatEventTime = (value: string) => new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const getTaskFocusSeconds = (task: Task) => {
  const totalSeconds = Math.max(1, task.focusMinutes) * 60;
  if (typeof task.focusRemainingSeconds !== "number" || !Number.isFinite(task.focusRemainingSeconds)) return totalSeconds;
  return Math.max(0, Math.min(totalSeconds, Math.round(task.focusRemainingSeconds)));
};
const formatFocusTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
const getEventDateRange = (event: CalendarEvent) => {
  const startKey = event.start.slice(0, 10);
  const candidateEnd = event.end?.slice(0, 10) ?? startKey;
  return { startKey, endKey: candidateEnd < startKey ? startKey : candidateEnd };
};
const eventOccursOnDate = (event: CalendarEvent, dateKey: string) => {
  const { startKey, endKey } = getEventDateRange(event);
  return dateKey >= startKey && dateKey <= endKey;
};
const formatEventRange = (event: CalendarEvent) => {
  const { startKey, endKey } = getEventDateRange(event);
  if (startKey === endKey) return `${formatEventTime(event.start)}${event.end ? ` – ${formatEventTime(event.end)}` : ""}`;
  const start = new Date(event.start);
  const end = new Date(event.end ?? `${endKey}T23:59`);
  const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endLabel = end.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${startLabel}, ${formatEventTime(event.start)} → ${endLabel}, ${formatEventTime(event.end ?? `${endKey}T23:59`)}`;
};
const formatAmbientDuration = (milliseconds: number) => {
  const minutes = Math.max(0, Math.floor(milliseconds / 60_000));
  if (minutes < 1) return "just started";
  if (minutes < 60) return String(minutes) + " min";
  return String(Math.floor(minutes / 60)) + "h " + String(minutes % 60) + "m";
};
type MonthEventSegment = { event: CalendarEvent; week: number; startColumn: number; endColumn: number; lane: number; startsEvent: boolean; endsEvent: boolean };
const buildMonthEventSegments = (events: CalendarEvent[], days: Date[]): MonthEventSegment[] => {
  const keys = days.map(toDateKey);
  if (!keys.length) return [];
  const drafts: Omit<MonthEventSegment, "lane">[] = [];
  events.forEach(event => {
    const range = getEventDateRange(event);
    if (range.endKey < keys[0] || range.startKey > keys[keys.length - 1]) return;
    const clippedStart = range.startKey < keys[0] ? keys[0] : range.startKey;
    const clippedEnd = range.endKey > keys[keys.length - 1] ? keys[keys.length - 1] : range.endKey;
    let cursor = keys.indexOf(clippedStart);
    const finalIndex = keys.indexOf(clippedEnd);
    while (cursor >= 0 && cursor <= finalIndex) {
      const week = Math.floor(cursor / 7);
      const segmentEnd = Math.min(finalIndex, week * 7 + 6);
      drafts.push({
        event,
        week,
        startColumn: cursor % 7 + 1,
        endColumn: segmentEnd % 7 + 1,
        startsEvent: keys[cursor] === range.startKey,
        endsEvent: keys[segmentEnd] === range.endKey,
      });
      cursor = segmentEnd + 1;
    }
  });
  drafts.sort((a, b) => a.week - b.week || a.startColumn - b.startColumn || b.endColumn - a.endColumn);
  const occupied = new Map<number, Array<{ lane: number; start: number; end: number }>>();
  return drafts.map(segment => {
    const weekItems = occupied.get(segment.week) ?? [];
    let lane = 0;
    while (weekItems.some(item => item.lane === lane && item.start <= segment.endColumn && item.end >= segment.startColumn)) lane += 1;
    weekItems.push({ lane, start: segment.startColumn, end: segment.endColumn });
    occupied.set(segment.week, weekItems);
    return { ...segment, lane };
  });
};
const getGreeting = (date: Date, name = "there") => {
  const hour = date.getHours();
  if (hour < 5) return `Still up, ${name}?`;
  if (hour < 12) return `Good morning, ${name}.`;
  if (hour < 17) return `Good afternoon, ${name}.`;
  if (hour < 22) return `Good evening, ${name}.`;
  return `Good night, ${name}.`;
};
// Use centralized priority ranking from constants
const priorityRank = PRIORITY_RANK;
const normalizeTask = (task: Partial<Task>): Task => ({
  id: task.id ?? Date.now(),
  title: task.title ?? "Untitled task",
  project: task.project ?? "Inbox",
  color: task.color ?? "#625af6",
  due: task.due ?? "Today",
  priority: task.priority ?? "Medium",
  focusMinutes: task.focusMinutes ?? 45,
  energy: task.energy ?? "Medium",
  status: task.status ?? (task.canceled ? "Canceled" : task.done ? "Done" : "Not started"),
  notes: typeof task.notes === "string" ? task.notes : "",
  handoffNote: typeof task.handoffNote === "string" ? task.handoffNote : "",
  nextAction: typeof task.nextAction === "string" ? task.nextAction : "",
  followUpDate: /^\d{4}-\d{2}-\d{2}$/.test(task.followUpDate ?? "") ? task.followUpDate : undefined,
  recurringDays: typeof task.recurringDays === "number" && task.recurringDays > 0 ? Math.min(365, Math.round(task.recurringDays)) : undefined,
  completedAt: typeof task.completedAt === "string" ? task.completedAt : undefined,
  customProperties: Array.isArray(task.customProperties)
    ? task.customProperties.filter(property => property && typeof property.name === "string").map(property => ({
        id: property.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: property.name,
        value: property.value ?? "",
      }))
    : [],
  classId: typeof task.classId === "string" ? task.classId : undefined,
  academicType: task.academicType,
  gradeWeight: typeof task.gradeWeight === "number" ? task.gradeWeight : undefined,
  pointsEarned: typeof task.pointsEarned === "number" && Number.isFinite(task.pointsEarned) ? Math.max(0, task.pointsEarned) : undefined,
  pointsPossible: typeof task.pointsPossible === "number" && Number.isFinite(task.pointsPossible) ? Math.max(0, task.pointsPossible) : undefined,
  submission: typeof task.submission === "string" ? task.submission : "",
  calendarEventId: typeof task.calendarEventId === "string" ? task.calendarEventId : undefined,
  checklist: Array.isArray(task.checklist) ? task.checklist : [],
  checklistProgress: Array.isArray(task.checklistProgress) ? task.checklistProgress : [],
  focusRemainingSeconds: typeof task.focusRemainingSeconds === "number" && Number.isFinite(task.focusRemainingSeconds)
    ? Math.max(0, Math.min((task.focusMinutes ?? 45) * 60, Math.round(task.focusRemainingSeconds)))
    : undefined,
  focusSessionStarted: Boolean(task.focusSessionStarted),
  focusSessionRunning: Boolean(task.focusSessionRunning),
  focusHalfwayPrompted: Boolean(task.focusHalfwayPrompted),
  done: task.done,
  canceled: task.canceled,
});
const normalizeClass = (record: Partial<ClassRecord>): ClassRecord => ({
  id: record.id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  code: record.code?.trim().toUpperCase() || "UNTITLED",
  name: record.name?.trim() || "Untitled class",
  term: record.term?.trim() || "",
  instructor: record.instructor?.trim() || "",
  location: record.location?.trim() || "",
  credits: typeof record.credits === "number" ? record.credits : undefined,
  color: record.color || "#625af6",
  semesterEnd: /^\d{4}-\d{2}-\d{2}$/.test(record.semesterEnd ?? "") ? record.semesterEnd : undefined,
  archived: Boolean(record.archived),
});
const isClassArchived = (record: ClassRecord, today = toDateKey(new Date())) => Boolean(record.archived || (record.semesterEnd && record.semesterEnd < today));
const getTaskStatus = (task: Task): TaskStatus => task.status ?? (task.canceled ? "Canceled" : task.done ? "Done" : "Not started");
const dueRank = (due: string) => {
  const value = due.toLowerCase();
  if (value === "today") return 0;
  if (value === "tomorrow") return 1;
  const parsed = Date.parse(`${due} ${new Date().getFullYear()}`);
  return Number.isNaN(parsed) ? 999 : parsed;
};

const unfoldIcs = (text: string) => text.replace(/\r?\n[ \t]/g, "");
const cleanIcsText = (value = "") => value.replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").trim();
const getIcsValue = (block: string, field: string) => {
  const match = block.match(new RegExp(`^${field}(?:;[^:]*)?:(.*)$`, "m"));
  return match ? cleanIcsText(match[1]) : "";
};
const parseIcsDate = (value: string) => {
  if (!value) return "";
  const raw = value.trim();
  if (/^\d{8}$/.test(raw)) return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T09:00`;
  const match = raw.match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})?(\d{2})?/);
  if (!match) return "";
  const [, year, month, day, hour = "09", minute = "00"] = match;
  const suffix = raw.endsWith("Z") ? "Z" : "";
  const parsed = new Date(`${year}-${month}-${day}T${hour}:${minute}:00${suffix}`);
  if (Number.isNaN(parsed.getTime())) return `${year}-${month}-${day}T${hour}:${minute}`;
  return toDateKey(parsed) + `T${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}`;
};
const parseIcsEvents = (ics: string): CalendarEvent[] => {
  const text = unfoldIcs(ics);
  const blocks = text.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) ?? [];
  return blocks.map((block, index) => {
    const start = parseIcsDate(getIcsValue(block, "DTSTART"));
    if (!start) return null;
    const uid = getIcsValue(block, "UID") || `${getIcsValue(block, "SUMMARY")}-${start}-${index}`;
    return {
      id: `ical-${uid}`,
      title: getIcsValue(block, "SUMMARY") || "Untitled calendar event",
      start,
      end: parseIcsDate(getIcsValue(block, "DTEND")) || undefined,
      source: "iCal" as const,
      color: "#47a47b",
      notes: getIcsValue(block, "LOCATION") || getIcsValue(block, "DESCRIPTION"),
    };
  }).filter(Boolean) as CalendarEvent[];
};

function IconButton({ children, onClick, label }: { children: React.ReactNode; onClick?: () => void; label: string }) {
  return <button onClick={onClick} aria-label={label} className="icon-button">{children}</button>;
}

export default function LifeOS() {
  logger.debug('LifeOS component rendered');
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cloudUserId, setCloudUserId] = useState<string | null>(null);
  const [view, setView] = useState<View>(() => viewFromLocation());
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [tasksHydrated, setTasksHydrated] = useState(false);
  const [palette, setPalette] = useState(false);
  const [capture, setCapture] = useState(false);
  const [focus, setFocus] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState(initialTasks[0].id);
  const [sidebar, setSidebar] = useState(false);
  const [dark, setDark] = useState(false);
  const [settingsState, setSettingsState] = useState<SettingsState>(initialSettings);
  const [settingsHydrated, setSettingsHydrated] = useState(false);
  const [query, setQuery] = useState("");
  const [brainItems, setBrainItems] = useState(initialBrainItems);
  const [brainHydrated, setBrainHydrated] = useState(false);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [classesHydrated, setClassesHydrated] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesHydrated, setNotesHydrated] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [spacesFilter, setSpacesFilter] = useState<"All" | "Classes" | "Projects" | "Maintenance" | "Archived">("All");
  const [spaceComposer, setSpaceComposer] = useState<SpaceKind | null>(null);
  const [academicComposerClassId, setAcademicComposerClassId] = useState<string | null>(null);
  const [projectItems, setProjectItems] = useState(initialProjects);
  const [projectsHydrated, setProjectsHydrated] = useState(false);
  const restoredMissingSpaces = useRef(false);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(initialCalendarEvents);
  const [calendarHydrated, setCalendarHydrated] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourcesHydrated, setResourcesHydrated] = useState(false);
  const [lifeHub, setLifeHub] = useState<LifeHubState>(emptyLifeHub);
  const [lifeHubHydrated, setLifeHubHydrated] = useState(false);
  const [schoolHub, setSchoolHub] = useState<SchoolHubState>(emptySchoolHub);
  const [schoolHubHydrated, setSchoolHubHydrated] = useState(false);
  const [workHub, setWorkHub] = useState<WorkHubState>(emptyWorkHub);
  const [workHubHydrated, setWorkHubHydrated] = useState(false);
  const [workFocusTaskId, setWorkFocusTaskId] = useState<string | null>(null);
  const [workView, setWorkView] = useState<WorkView>("dashboard");
  const [schoolFocusTaskId, setSchoolFocusTaskId] = useState<number | null>(null);
  const [schoolView, setSchoolView] = useState<SchoolView>("dashboard");
  const [notificationsTick, setNotificationsTick] = useState(0);
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<Set<string>>(() => loadDismissedNotificationIds());
  const [hubCollection, setHubCollection] = useState<HubCollectionTarget | null>(null);
  const [schoolProfileOpen, setSchoolProfileOpen] = useState(false);
  const [schoolClassAction, setSchoolClassAction] = useState<"coursework" | "lecture" | null>(null);
  const [composer, setComposer] = useState<"task" | "project" | null>(null);
  const [aiTaskComposer, setAiTaskComposer] = useState(false);
  const [calendarComposer, setCalendarComposer] = useState(false);
  const [defaultEventDate, setDefaultEventDate] = useState<string | null>(null);
  const [calendarImporter, setCalendarImporter] = useState(false);
  const [editingCalendarEventId, setEditingCalendarEventId] = useState<string | null>(null);
  const [breakOpen, setBreakOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [actionTaskId, setActionTaskId] = useState<number | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [taskPageId, setTaskPageId] = useState<number | null>(null);
  const [actionProjectName, setActionProjectName] = useState<string | null>(null);
  const [actionClassId, setActionClassId] = useState<string | null>(null);
  const [selectedProjectName, setSelectedProjectName] = useState<string | null>(null);
  const [fullscreenProject, setFullscreenProject] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState<string | null>(null);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [ambientStartOpen, setAmbientStartOpen] = useState(false);
  const [ambientWrapupOpen, setAmbientWrapupOpen] = useState(false);
  const [dailyResetOpen, setDailyResetOpen] = useState(false);
  const [weeklyReviewOpen, setWeeklyReviewOpen] = useState(false);
  const [ambientDraft, setAmbientDraft] = useState<AmbientDraft>(null);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan>({});
  const [weeklyPlanHydrated, setWeeklyPlanHydrated] = useState(false);

  const chooseNowTask = useCallback((taskId: number | null) => {
    if (taskId !== null) setActiveTaskId(taskId);
    setSettingsState(current => ({ ...current, nowTaskId: taskId }));
  }, []);
  const beginAmbientActivity = (title: string, space?: { name: string; color: string }) => {
    setSettingsState(current => ({ ...current, ambientActivity: { title: title.trim() || "Unplanned work", startedAt: new Date().toISOString(), spaceName: space?.name, spaceColor: space?.color } }));
    setAmbientStartOpen(false);
    flash("Started. You can organize it later.");
  };
  const wrapUpAmbientActivity = (outcome: "task" | "note" | "dismiss", note: string) => {
    const activity = settingsState.ambientActivity;
    if (!activity) return;
    if (outcome === "task") {
      setTasks(items => [...items, normalizeTask({ id: Date.now(), title: activity.title, project: activity.spaceName || "Inbox", color: activity.spaceColor || "#625af6", due: toDateKey(new Date()), priority: "Medium", focusMinutes: settingsState.defaultFocusMinutes, energy: settingsState.defaultEnergy, status: "Not started", notes: note.trim() || "Captured after unplanned work.", customProperties: [], checklist: [], checklistProgress: [] })]);
      flash(activity.spaceName ? "Saved to " + activity.spaceName : "Saved as a task in Inbox");
    } else if (outcome === "note") {
      setNotes(items => [{ id: String(Date.now()) + "-" + Math.random().toString(36).slice(2), title: activity.title, body: note.trim() || "Unplanned work session.", projectName: activity.spaceName, updatedAt: new Date().toISOString() }, ...items]);
      flash("Saved as a note");
    } else {
      flash("Let it go. No admin required.");
    }
    setSettingsState(current => ({ ...current, ambientActivity: null }));
    setAmbientWrapupOpen(false);
  };
  const rememberSpaceTask = useCallback((task: Task) => {
    const key = task.classId ? `class:${task.classId}` : `project:${task.project}`;
    setSettingsState(current => ({ ...current, spaceContext: { ...current.spaceContext, [key]: { ...current.spaceContext?.[key], lastTaskId: task.id, updatedAt: new Date().toISOString() } } }));
  }, []);
  const allNotifications = useMemo(() => generateLifeOSNotifications({
    workHub,
    tasks,
    projects: projectItems,
    classes,
    events: calendarEvents,
    settings: {
      calendarAlerts: settingsState.calendarAlerts,
      enableWorkOS: settingsState.enableWorkOS,
      enableSchoolOS: settingsState.enableSchoolOS,
      enableLifeOS: settingsState.enableLifeOS,
    },
  }), [workHub, tasks, projectItems, classes, calendarEvents, settingsState.calendarAlerts, settingsState.enableWorkOS, settingsState.enableSchoolOS, settingsState.enableLifeOS, notificationsTick]);

  const visibleNotifications = useMemo(
    () => allNotifications.filter(item => !dismissedNotificationIds.has(item.id)),
    [allNotifications, dismissedNotificationIds],
  );

  useEffect(() => {
    setNotificationsTick(Date.now());
    const interval = window.setInterval(() => setNotificationsTick(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const systemNotifiedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (typeof window === "undefined" || !settingsState.calendarAlerts || Notification.permission !== "granted") return;
    visibleNotifications
      .filter(item => (item.kind === "meeting" || item.kind === "event") && isBannerCandidate(item))
      .forEach(item => {
        if (systemNotifiedRef.current.has(item.id)) return;
        systemNotifiedRef.current.add(item.id);
        new Notification(`${notificationSourceLabel[item.source]} · ${item.title}`, {
          body: `${item.dueIn}${item.subtitle ? ` · ${item.subtitle}` : ""}`,
          tag: item.id,
        });
      });
  }, [visibleNotifications, settingsState.calendarAlerts]);

  useEffect(() => {
    if (typeof window === "undefined" || !settingsState.focusReminders || Notification.permission !== "granted") return;
    visibleNotifications
      .filter(item => item.kind === "task" && (item.urgency === "overdue" || item.urgency === "today"))
      .slice(0, 5)
      .forEach(item => {
        const tag = `focus-${item.id}`;
        if (systemNotifiedRef.current.has(tag)) return;
        systemNotifiedRef.current.add(tag);
        new Notification(`${notificationSourceLabel[item.source]} · ${item.title}`, {
          body: `${item.dueIn}${item.subtitle ? ` · ${item.subtitle}` : ""}`,
          tag,
        });
      });
  }, [visibleNotifications, settingsState.focusReminders]);

  const dismissNotification = useCallback((id: string) => {
    setDismissedNotificationIds(current => {
      const next = new Set(current);
      next.add(id);
      saveDismissedNotificationIds(next);
      return next;
    });
  }, []);

  const dismissAllNotifications = useCallback(() => {
    setDismissedNotificationIds(current => {
      const next = new Set(current);
      visibleNotifications.forEach(item => next.add(item.id));
      saveDismissedNotificationIds(next);
      return next;
    });
  }, [visibleNotifications]);

  const openFocus = useCallback((taskId?: number) => {
    if (taskId) {
      setActiveTaskId(taskId);
      chooseNowTask(taskId);
      const task = tasks.find(item => item.id === taskId);
      if (task) rememberSpaceTask(task);
      if (task) setSettingsState(current => ({ ...current, momentumLog: [{ id: String(Date.now()), at: new Date().toISOString(), type: "focus" as const, title: task.title }, ...(current.momentumLog ?? [])].slice(0, 40) }));
    }
    setFocus(true);
  }, [chooseNowTask, rememberSpaceTask, tasks]);
  const openTaskPage = useCallback((taskId: number) => {
    const task = tasks.find(item => item.id === taskId);
    if (task) rememberSpaceTask(task);
    setTaskPageId(taskId);
    setSidebar(false);
  }, [rememberSpaceTask, tasks]);
  const bridgeWorkTaskToLife = useCallback((workTaskId: string) => {
    const workTask = workHub.tasks.find(item => item.id === workTaskId);
    if (!workTask) return null;
    setWorkFocusTaskId(workTaskId);
    const deliverable = workHub.deliverables.find(item => item.id === workTask.deliverableId);
    const project = workHub.projects.find(item => item.id === deliverable?.projectId);
    const projectName = project?.name ?? "Work";
    const linked = tasks.find(task =>
      task.customProperties?.some(property => property.name === "workTaskId" && property.value === workTaskId)
      || (task.title === workTask.title && task.project === projectName),
    );
    if (linked) return linked.id;
    if (project) {
      setProjectItems(items => {
        if (items.some(entry => entry.name === projectName)) return items;
        return [...items, {
          name: projectName,
          desc: project.description?.trim() || "A focused project with a finish line.",
          progress: 0,
          color: project.color ?? "#625af6",
          icon: projectIcons.BriefcaseBusiness,
          iconName: "BriefcaseBusiness" as ProjectIcon,
          tasks: 0,
          kind: "finishable" as ProjectKind,
        }];
      });
    }
    const priorityMap = { high: "High", medium: "Medium", low: "Low" } as const;
    const statusMap = { open: "Not started", in_progress: "In progress", blocked: "Blocked", done: "Done" } as const;
    const lifeTaskId = Date.now();
    setTasks(items => [...items, normalizeTask({
      id: lifeTaskId,
      title: workTask.title,
      project: projectName,
      color: project?.color ?? "#625af6",
      due: workTask.dueDate ?? toDateKey(new Date()),
      priority: priorityMap[workTask.priority],
      focusMinutes: settingsState.defaultFocusMinutes,
      energy: settingsState.defaultEnergy,
      status: statusMap[workTask.status],
      notes: workTask.notes ?? workTask.description ?? "",
      checklist: workTask.checklist ?? [],
      checklistProgress: workTask.checklistProgress ?? (workTask.checklist ?? []).map(() => false),
      customProperties: [{ id: "workTaskId", name: "workTaskId", value: workTaskId }],
    })]);
    return lifeTaskId;
  }, [workHub, tasks, settingsState.defaultFocusMinutes, settingsState.defaultEnergy]);
  const openWorkTask = useCallback((workTaskId: string) => {
    const lifeTaskId = bridgeWorkTaskToLife(workTaskId);
    if (lifeTaskId) openTaskPage(lifeTaskId);
  }, [bridgeWorkTaskToLife, openTaskPage]);
  const focusWorkTask = useCallback((workTaskId: string) => {
    const lifeTaskId = bridgeWorkTaskToLife(workTaskId);
    if (lifeTaskId) openFocus(lifeTaskId);
  }, [bridgeWorkTaskToLife, openFocus]);
  const go = useCallback((next: View) => {
    const destination: View = next === "Dashboard" ? "Life" : ["Notes", "Resources", "Brain", "Knowledge"].includes(next) ? "Library" : next;
    if (destination === "Spaces") { setSelectedProjectName(null); setSelectedClassId(null); }
    setView(destination); setSidebar(false); if (destination === "Focus") setFocus(true);
  }, []);
  const openProjectSpace = useCallback((projectName: string, workProject?: WorkProject) => {
    setProjectItems(items => {
      if (items.some(project => project.name === projectName)) return items;
      const source = workProject ?? workHub.projects.find(project => project.name === projectName);
      if (!source) return items;
      return [...items, {
        name: projectName,
        desc: source.description?.trim() || "A focused project with a finish line.",
        progress: 0,
        color: source.color ?? "#625af6",
        icon: projectIcons.BriefcaseBusiness,
        iconName: "BriefcaseBusiness" as ProjectIcon,
        tasks: 0,
        kind: "finishable" as ProjectKind,
      }];
    });
    const context = settingsState.spaceContext?.[`project:${projectName}`];
    if (context?.lastTaskId) setActiveTaskId(context.lastTaskId);
    setSettingsState(current => ({
      ...current,
      spaceContext: {
        ...current.spaceContext,
        [`project:${projectName}`]: { ...current.spaceContext?.[`project:${projectName}`], updatedAt: new Date().toISOString() },
      },
    }));
    setSpacesFilter("Projects");
    setSelectedClassId(null);
    setSelectedProjectName(projectName);
    setView("Spaces");
    setSidebar(false);
  }, [settingsState.spaceContext, workHub.projects]);
  const openClassSpace = useCallback((classId: string) => {
    const context = settingsState.spaceContext?.[`class:${classId}`];
    if (context?.lastTaskId) setActiveTaskId(context.lastTaskId);
    setSettingsState(current => ({
      ...current,
      spaceContext: {
        ...current.spaceContext,
        [`class:${classId}`]: { ...current.spaceContext?.[`class:${classId}`], updatedAt: new Date().toISOString() },
      },
    }));
    setSelectedProjectName(null);
    setSelectedClassId(classId);
    setView("Spaces");
    setSidebar(false);
  }, [settingsState.spaceContext]);
  const openSpacesList = useCallback((filter: "All" | "Classes" | "Projects" | "Maintenance" | "Archived" = "All") => {
    setSpacesFilter(filter);
    setSelectedProjectName(null);
    setSelectedClassId(null);
    setView("Spaces");
    setSidebar(false);
  }, []);
  const openWorkProjectSpace = useCallback((projectId: string) => {
    const workProject = workHub.projects.find(item => item.id === projectId);
    if (!workProject) return;
    openProjectSpace(workProject.name, workProject);
  }, [openProjectSpace, workHub.projects]);
  const handleNotificationNavigate = useCallback((notification: LifeOSNotification) => {
    const action: NotificationAction = notification.action;
    if (action.type === "work") {
      if (action.view === "projects" && action.itemId) {
        openWorkProjectSpace(action.itemId);
        return;
      }
      if (action.view === "tasks" && action.itemId) {
        openWorkTask(action.itemId);
        return;
      }
      setWorkView(action.view);
      go("Work");
      return;
    }
    if (action.type === "life-project") {
      openProjectSpace(action.projectName);
      return;
    }
    if (action.type === "life-task" || action.type === "school-task") {
      openTaskPage(action.taskId);
      return;
    }
    if (action.type === "calendar") {
      if (action.eventId) setEditingCalendarEventId(action.eventId);
      go("Calendar");
      return;
    }
    if (action.type === "now") go("Now");
  }, [go, openProjectSpace, openTaskPage, openWorkProjectSpace, openWorkTask]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const writeCurrentView = () => {
      const url = new URL(window.location.href);
      const routeValue = view === "Dashboard" ? "now" : view === "Calendar" ? "today" : view.toLowerCase();
      if (url.searchParams.get("view") === routeValue) return;
      url.searchParams.set("view", routeValue);
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    };
    const restoreView = () => setView(viewFromLocation());
    writeCurrentView();
    window.addEventListener("popstate", restoreView);
    return () => window.removeEventListener("popstate", restoreView);
  }, [view]);
  useEffect(() => {
    const importICloudEvents = (event: Event) => {
      const incoming = (event as CustomEvent<CalendarEvent[]>).detail;
      if (!Array.isArray(incoming)) return;
      setCalendarEvents(current => [...current.filter(item => !item.id.startsWith("icloud-")), ...incoming]);
    };
    window.addEventListener("lifeos:icloud-events", importICloudEvents);
    return () => window.removeEventListener("lifeos:icloud-events", importICloudEvents);
  }, []);
  useEffect(() => {
    const importGoogleEvents = (event: Event) => {
      const incoming = (event as CustomEvent<CalendarEvent[]>).detail;
      if (!Array.isArray(incoming)) return;
      setCalendarEvents(current => [...current.filter(item => !item.id.startsWith("google-")), ...incoming]);
    };
    window.addEventListener("lifeos:google-calendar-events", importGoogleEvents);
    return () => window.removeEventListener("lifeos:google-calendar-events", importGoogleEvents);
  }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = Boolean(target?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName || ""));
      // Fn is exposed by some browsers. Cmd/Ctrl + Shift is the reliable fallback
      // because many desktop browsers do not report the physical Fn key to web apps.
      const lifeOSShortcut = e.getModifierState("Fn") || ((e.metaKey || e.ctrlKey) && e.shiftKey);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette(true); }
      if (e.key === "Escape") {
        setPalette(false);
        setCapture(false);
        setComposer(null);
        setAiTaskComposer(false);
        setCalendarComposer(false);
        setCalendarImporter(false);
        setEditingCalendarEventId(null);
        setBreakOpen(false);
        setActionTaskId(null);
        setActionClassId(null);
        setEditingTaskId(null);
        setTaskPageId(null);
        setSpaceComposer(null);
        setAcademicComposerClassId(null);
        setActionProjectName(null);
        setEditingClassId(null);
        setSelectedProjectName(null);
        setAmbientStartOpen(false);
        setAmbientWrapupOpen(false);
        setAmbientDraft(null);
        setHubCollection(null);
        setSchoolProfileOpen(false);
        setSchoolClassAction(null);
        setSidebar(false);
        if (focus) {
          setFocus(false);
          setView("Dashboard");
        }
      }
      if (!typing && lifeOSShortcut) {
        if (e.key === "/") {
          e.preventDefault();
          setQuery("");
          setPalette(true);
        }
        if (e.key.toLowerCase() === "b") { e.preventDefault(); setCapture(true); }
        if (e.key.toLowerCase() === "f") { e.preventDefault(); openFocus(); }
        if (e.key.toLowerCase() === "n") { e.preventDefault(); setComposer("task"); }
        if (e.key.toLowerCase() === "a") { e.preventDefault(); setAiTaskComposer(true); }
        if (e.key.toLowerCase() === "p") { e.preventDefault(); go("Spaces"); }
        if (e.key.toLowerCase() === "r") { e.preventDefault(); setBreakOpen(true); }
        if (e.key.toLowerCase() === "w") {
          e.preventDefault();
          if (settingsState.ambientActivity) setAmbientWrapupOpen(true);
          else setAmbientStartOpen(true);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [focus, go, openFocus, settingsState.ambientActivity]);

  useEffect(() => {
    const auth = getClientAuth();

    // Check for test user ID in dev mode
    const testUserId = typeof window !== 'undefined' ? sessionStorage.getItem(STORAGE_KEYS.USER_ID) : null;
    if (testUserId === TEST_USER.ID) {
      logger.debug('Using test user for development');
      setUser({ displayName: TEST_USER.DISPLAY_NAME, email: TEST_USER.EMAIL });
      setUserId(testUserId);
      setCloudUserId(testUserId);
      setAuthLoading(false);
      return;
    }

    if (!auth) {
      logger.warn('Firebase auth not initialized');
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        logger.info('User authenticated', { uid: currentUser.uid, email: currentUser.email });
        setUser(currentUser);
        setUserId(currentUser.uid);
        setCloudUserId(currentUser.uid);
      } else {
        logger.info('User not authenticated');
        setUser(null);
        setCloudUserId(null);
        clearUserId();
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);
  useEffect(() => {
    if (cloudUserId === null) {
      setTasks([]);
      setProjectItems([]);
      setClasses([]);
      setNotes([]);
      setResources([]);
      setCalendarEvents([]);
      setLifeHub(emptyLifeHub);
      setSchoolHub(emptySchoolHub);
      setWorkHub(emptyWorkHub);
      setWorkFocusTaskId(null);
    }
  }, [cloudUserId]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  useEffect(() => {
    if (!cloudUserId) return;
    setSettingsHydrated(false);
    (async () => {
      try {
        const firebaseDark = await loadDataFromFirebase('dark');
        if (firebaseDark !== null && firebaseDark !== undefined) setDark(firebaseDark);

        const firebaseSettings = await loadDataFromFirebase('settings');
        if (firebaseSettings) setSettingsState({ ...initialSettings, ...firebaseSettings });
      } catch (error) {
        console.error('Failed to load settings from Firebase:', error);
      } finally {
        setSettingsHydrated(true);
      }
    })();
  }, [cloudUserId]);
  useEffect(() => {
    if (!cloudUserId || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const activity = params.get("lifeos_activity");
    if (activity !== "job-application" && activity !== "coursera-course") return;
    const title = params.get("title")?.slice(0, 120) || (activity === "coursera-course" ? "Google AI Certificate coursework" : "Job application");
    const spaceName = params.get("space")?.slice(0, 80) || "Career";
    setAmbientDraft({ title, spaceName, sourceLabel: activity === "coursera-course" ? "Coursera coursework" : "a job application" });
    setAmbientStartOpen(true);
    params.delete("lifeos_activity");
    params.delete("title");
    params.delete("space");
    const remainingSearch = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${remainingSearch ? `?${remainingSearch}` : ""}`);
  }, [cloudUserId]);
  useEffect(() => {
    if (!cloudUserId || !settingsHydrated) return;
    syncDataToFirebase('dark', dark);
  }, [cloudUserId, dark, settingsHydrated]);
  useEffect(() => {
    if (!cloudUserId || !settingsHydrated) return;
    document.documentElement.style.setProperty("--accent", settingsState.accent);
    document.documentElement.classList.toggle("compact", settingsState.compactMode);
    document.documentElement.classList.toggle("reduce-motion", settingsState.reduceMotion);
    syncDataToFirebase('settings', settingsState);
  }, [cloudUserId, settingsState, settingsHydrated]);
  useEffect(() => {
    if (!cloudUserId) return;
    setTasksHydrated(false);
    (async () => {
      try {
        const firebaseTasks = await loadDataFromFirebase('tasks');
        if (firebaseTasks && Array.isArray(firebaseTasks)) {
          setTasks(firebaseTasks.map(task => normalizeTask(task)));
        }
      } catch (error) {
        console.error('Failed to load tasks from Firebase:', error);
      } finally {
        setTasksHydrated(true);
      }
    })();
  }, [cloudUserId]);
  useEffect(() => {
    if (!cloudUserId || !tasksHydrated) return;
    syncDataToFirebase('tasks', tasks);
  }, [cloudUserId, tasks, tasksHydrated]);
  useEffect(() => {
    const activeTasks = tasks.filter(task => !task.done && !task.canceled);
    if (!activeTasks.length) {
      setActiveTaskId(0);
      return;
    }
    if (!activeTasks.some(task => task.id === activeTaskId)) setActiveTaskId(activeTasks[0].id);
  }, [activeTaskId, tasks]);
  useEffect(() => {
    if (!cloudUserId) return;
    setProjectsHydrated(false);
    (async () => {
      try {
        const firebaseProjects = await loadDataFromFirebase('projects');
        if (firebaseProjects && Array.isArray(firebaseProjects)) {
          setProjectItems(firebaseProjects.map((project: Partial<Project>) => {
            const iconName = project.iconName && projectIcons[project.iconName] ? project.iconName : "FolderKanban";
            return {
              name: project.name ?? "Untitled project",
              desc: project.desc ?? "A space for meaningful work.",
              progress: project.progress ?? 0,
              color: project.color ?? "#625af6",
              iconName,
              icon: projectIcons[iconName],
              tasks: project.tasks ?? 0,
              kind: project.kind === "maintenance" ? "maintenance" : "finishable",
            };
          }));
        }
      } catch (error) {
        console.error('Failed to load projects from Firebase:', error);
      } finally {
        setProjectsHydrated(true);
      }
    })();
  }, [cloudUserId]);
  useEffect(() => {
    if (!cloudUserId || !projectsHydrated) return;
    const projectsForStorage = projectItems.map(({ icon: _, ...project }) => project);
    syncDataToFirebase('projects', projectsForStorage);
  }, [cloudUserId, projectItems, projectsHydrated]);
  // The July 18 project validation change briefly treated legacy `iconName`
  // records as invalid. If that left a real workspace empty, rebuild only the
  // spaces that are already named on the user's non-starter tasks. New users
  // keep a blank Spaces area exactly as intended.
  useEffect(() => {
    if (!cloudUserId || !projectsHydrated || !tasksHydrated || restoredMissingSpaces.current) return;
    if (projectItems.length || isStarterTaskSet(tasks)) return;
    const recovered = recoverSpacesFromTasks(tasks);
    if (!recovered.length) return;
    restoredMissingSpaces.current = true;
    setProjectItems(recovered);
    setNotice(`Restored ${recovered.length} spaces from your linked tasks`);
  }, [cloudUserId, projectItems.length, projectsHydrated, tasks, tasksHydrated]);
  useEffect(() => {
    if (!cloudUserId) return;
    setCalendarHydrated(false);
    (async () => {
      try {
        const firebaseEvents = await loadDataFromFirebase('calendar');
        if (firebaseEvents && Array.isArray(firebaseEvents)) {
          setCalendarEvents(firebaseEvents);
        }
      } catch (error) {
        console.error('Failed to load calendar events from Firebase:', error);
      } finally {
        setCalendarHydrated(true);
      }
    })();
  }, [cloudUserId]);
  useEffect(() => {
    if (!cloudUserId || !calendarHydrated) return;
    syncDataToFirebase('calendar', calendarEvents);
  }, [cloudUserId, calendarEvents, calendarHydrated]);
  useEffect(() => {
    if (!cloudUserId) return;
    setBrainHydrated(false);
    (async () => {
      try {
        const firebaseBrain = await loadDataFromFirebase('brain');
        if (firebaseBrain && Array.isArray(firebaseBrain)) {
          setBrainItems(firebaseBrain.filter(item => typeof item === "string"));
        }
      } catch (error) {
        console.error('Failed to load brain items from Firebase:', error);
      } finally {
        setBrainHydrated(true);
      }
    })();
  }, [cloudUserId]);
  useEffect(() => {
    if (!cloudUserId || !brainHydrated) return;
    syncDataToFirebase('brain', brainItems);
  }, [cloudUserId, brainItems, brainHydrated]);

  useEffect(() => {
    if (!cloudUserId) return;
    setClassesHydrated(false);
    (async () => {
      try {
        const data = await loadDataFromFirebase('classes');
        if (Array.isArray(data)) setClasses(data.map(record => normalizeClass(record)));
      } catch (error) {
        console.error('Failed to load classes from Firebase:', error);
      } finally {
        setClassesHydrated(true);
      }
    })();
  }, [cloudUserId]);
  useEffect(() => {
    if (!cloudUserId || !classesHydrated) return;
    syncDataToFirebase('classes', classes);
  }, [classes, classesHydrated, cloudUserId]);
  useEffect(() => {
    if (!cloudUserId) return;
    setWeeklyPlanHydrated(false);
    (async () => {
      try {
        const data = await loadDataFromFirebase('weeklyPlan');
        if (data && typeof data === 'object') {
          setWeeklyPlan(data);
        }
      } catch (error) {
        console.error('Failed to load weekly plan from Firebase:', error);
      } finally {
        setWeeklyPlanHydrated(true);
      }
    })();
  }, [cloudUserId]);
  useEffect(() => {
    if (!cloudUserId || !weeklyPlanHydrated) return;
    syncDataToFirebase('weeklyPlan', weeklyPlan);
  }, [cloudUserId, weeklyPlan, weeklyPlanHydrated]);

  useEffect(() => {
    if (!cloudUserId) return;
    setNotesHydrated(false);
    (async () => {
      try {
        const data = await loadDataFromFirebase('notes');
        if (Array.isArray(data)) setNotes(data);
      } catch (error) {
        console.error('Failed to load notes from Firebase:', error);
      } finally {
        setNotesHydrated(true);
      }
    })();
  }, [cloudUserId]);
  useEffect(() => {
    if (!cloudUserId || !notesHydrated) return;
    syncDataToFirebase('notes', notes);
  }, [cloudUserId, notes, notesHydrated]);

  useEffect(() => {
    if (!cloudUserId) return;
    setResourcesHydrated(false);
    (async () => {
      try {
        const data = await loadDataFromFirebase('resources');
        if (Array.isArray(data)) setResources(data);
      } catch (error) {
        console.error('Failed to load resource metadata from Firebase:', error);
      } finally {
        setResourcesHydrated(true);
      }
    })();
  }, [cloudUserId]);
  useEffect(() => {
    if (!cloudUserId || !resourcesHydrated) return;
    syncDataToFirebase('resources', resources);
  }, [cloudUserId, resources, resourcesHydrated]);

  useEffect(() => {
    if (!cloudUserId) return;
    setLifeHubHydrated(false);
    (async () => {
      try {
        const data = await loadDataFromFirebase('life');
        if (data && typeof data === "object") setLifeHub({ ...emptyLifeHub, ...data });
      } catch (error) {
        console.error('Failed to load LifeOS collections from Firebase:', error);
      } finally {
        setLifeHubHydrated(true);
      }
    })();
  }, [cloudUserId]);
  useEffect(() => {
    if (!cloudUserId || !lifeHubHydrated) return;
    syncDataToFirebase('life', lifeHub);
  }, [cloudUserId, lifeHub, lifeHubHydrated]);

  useEffect(() => {
    if (!cloudUserId) return;
    setSchoolHubHydrated(false);
    (async () => {
      try {
        const data = await loadDataFromFirebase('school');
        if (data && typeof data === "object") setSchoolHub({ ...emptySchoolHub, ...data, profile: { ...emptySchoolHub.profile, ...data.profile } });
      } catch (error) {
        console.error('Failed to load SchoolOS collections from Firebase:', error);
      } finally {
        setSchoolHubHydrated(true);
      }
    })();
  }, [cloudUserId]);
  useEffect(() => {
    if (!cloudUserId || !schoolHubHydrated) return;
    syncDataToFirebase('school', schoolHub);
  }, [cloudUserId, schoolHub, schoolHubHydrated]);

  useEffect(() => {
    if (!cloudUserId) return;
    setWorkHubHydrated(false);
    (async () => {
      try {
        const data = await loadDataFromFirebase('work');
        if (data && typeof data === "object" && (data.projects?.length || data.tasks?.length || data.deliverables?.length || data.meetings?.length)) {
          setWorkHub({ ...emptyWorkHub, ...data });
        } else {
          setWorkHub(createSampleWorkHub());
        }
      } catch (error) {
        console.error('Failed to load WorkOS data from Firebase:', error);
        setWorkHub(createSampleWorkHub());
      } finally {
        setWorkHubHydrated(true);
      }
    })();
  }, [cloudUserId]);
  useEffect(() => {
    if (!cloudUserId || !workHubHydrated) return;
    syncDataToFirebase('work', workHub);
  }, [cloudUserId, workHub, workHubHydrated]);

  useEffect(() => {
    if (!cloudUserId || !tasksHydrated) return;
    listenToFirebaseChanges('tasks', (data) => {
      if (Array.isArray(data)) setTasks(data.map(task => normalizeTask(task)));
    });
    return () => stopListeningToFirebaseChanges('tasks');
  }, [cloudUserId, tasksHydrated]);

  useEffect(() => {
    if (!cloudUserId || !projectsHydrated) return;
    listenToFirebaseChanges('projects', (data) => {
      if (Array.isArray(data)) {
        setProjectItems(data.map((project: Partial<Project>) => {
          const iconName = project.iconName && projectIcons[project.iconName] ? project.iconName : "FolderKanban";
          return {
            name: project.name ?? "Untitled project",
            desc: project.desc ?? "A space for meaningful work.",
            progress: project.progress ?? 0,
            color: project.color ?? "#625af6",
            iconName,
            icon: projectIcons[iconName],
            tasks: project.tasks ?? 0,
            kind: project.kind === "maintenance" ? "maintenance" : "finishable",
          };
        }));
      }
    });
    return () => stopListeningToFirebaseChanges('projects');
  }, [cloudUserId, projectsHydrated]);

  useEffect(() => {
    if (!cloudUserId || !calendarHydrated) return;
    listenToFirebaseChanges('calendar', (data) => {
      if (Array.isArray(data)) setCalendarEvents(data);
    });
    return () => stopListeningToFirebaseChanges('calendar');
  }, [cloudUserId, calendarHydrated]);

  useEffect(() => {
    if (!cloudUserId || !brainHydrated) return;
    listenToFirebaseChanges('brain', (data) => {
      if (Array.isArray(data)) setBrainItems(data.filter(item => typeof item === "string"));
    });
    return () => stopListeningToFirebaseChanges('brain');
  }, [cloudUserId, brainHydrated]);

  useEffect(() => {
    if (!cloudUserId || !classesHydrated) return;
    listenToFirebaseChanges('classes', data => {
      if (Array.isArray(data)) setClasses(data.map(record => normalizeClass(record)));
    });
    return () => stopListeningToFirebaseChanges('classes');
  }, [classesHydrated, cloudUserId]);

  useEffect(() => {
    if (!cloudUserId || !notesHydrated) return;
    listenToFirebaseChanges('notes', data => {
      if (Array.isArray(data)) setNotes(data);
    });
    return () => stopListeningToFirebaseChanges('notes');
  }, [cloudUserId, notesHydrated]);

  useEffect(() => {
    if (!cloudUserId || !resourcesHydrated) return;
    listenToFirebaseChanges('resources', data => {
      if (Array.isArray(data)) setResources(data);
    });
    return () => stopListeningToFirebaseChanges('resources');
  }, [cloudUserId, resourcesHydrated]);

  const complete = (id: number) => {
    const completedTask = tasks.find(task => task.id === id);
    const isCompleting = Boolean(completedTask && !completedTask.done);
    setTasks(items => {
      const target = items.find(task => task.id === id);
      if (!target) return items;
      const next: Task[] = items.map(t => t.id === id ? { ...t, done: !t.done, canceled: false, status: (!t.done ? "Done" : "Not started") as TaskStatus, completedAt: !t.done ? new Date().toISOString() : undefined } : t);
      if (!target.done && target.recurringDays) {
        const nextDue = new Date();
        nextDue.setDate(nextDue.getDate() + target.recurringDays);
        next.push(normalizeTask({ ...target, id: Date.now(), due: toDateKey(nextDue), done: false, canceled: false, status: "Not started", completedAt: undefined, focusRemainingSeconds: undefined, focusSessionStarted: false, focusHalfwayPrompted: false, checklistProgress: (target.checklist ?? []).map(() => false) }));
      }
      return next;
    });
    if (isCompleting && completedTask) setSettingsState(current => ({ ...current, momentumLog: [{ id: String(Date.now()), at: new Date().toISOString(), type: "done" as const, title: completedTask.title }, ...(current.momentumLog ?? [])].slice(0, 40) }));
    setSettingsState(current => current.nowTaskId === id ? { ...current, nowTaskId: null } : current);
  };
  const flash = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  }, []);

  useEffect(() => {
    if (!settingsState.dailyDigest || !tasksHydrated || typeof window === "undefined") return;
    const today = toDateKey(new Date());
    const digestKey = `lifeos-digest-${cloudUserId ?? "local"}`;
    if (window.localStorage.getItem(digestKey) === today) return;
    const openTasks = tasks.filter(task => !task.done && !task.canceled);
    const dueToday = openTasks.filter(task => task.due === today).length;
    const overdue = openTasks.filter(task => task.due < today).length;
    window.localStorage.setItem(digestKey, today);
    flash(`Daily digest: ${openTasks.length} open · ${dueToday} due today · ${overdue} overdue`);
  }, [cloudUserId, flash, settingsState.dailyDigest, tasks, tasksHydrated]);

  const uploadResource = async (file: File, classId?: string) => {
    if (file.size > 25 * 1024 * 1024) {
      flash("That file is over the 25 MB limit");
      throw new Error("File too large");
    }
    try {
      const ownerId = cloudUserId ?? getUserId() ?? "local";
      const stored = await getFileStorage().uploadFile(file, ownerId, classId ? `classes/${classId}` : "resources");
      const next: Resource = { ...stored, name: file.name, type: file.type || "application/octet-stream", size: file.size, uploadedAt: new Date().toISOString(), classId };
      setResources(items => [...items, next]);
      flash(stored.storage === "cloud" ? "File uploaded and synced" : "File uploaded on this device");
    } catch (error) {
      flash("Upload failed");
      throw error;
    }
  };
  const deleteResource = async (resource: Resource) => {
    await getFileStorage().deleteFile(resource.id, resource.storagePath);
    setResources(items => items.filter(item => item.id !== resource.id));
    flash("Resource deleted");
  };
  const replaceResource = async (resource: Resource, file: File) => {
    if (file.size > 25 * 1024 * 1024) {
      flash("That file is over the 25 MB limit");
      throw new Error("File too large");
    }
    try {
      const stored = await getFileStorage().replaceFile(resource.id, file, resource.storagePath);
      setResources(items => items.map(item => item.id === resource.id ? { ...item, ...stored, storagePath: stored.storagePath, name: file.name, type: file.type || "application/octet-stream", size: file.size, uploadedAt: new Date().toISOString() } : item));
      flash("Resource replaced");
    } catch (error) {
      flash("Could not replace that file");
      throw error;
    }
  };
  const downloadResource = async (resource: Resource) => {
    const localUrl = resource.storage === "local" ? await getFileStorage().getFileUrl(resource.id) : null;
    const url = resource.storage === "local" ? localUrl : resource.url;
    if (!url) {
      flash("This file is not available on this device");
      return;
    }
    const link = document.createElement("a");
    link.href = url;
    link.download = resource.name;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.click();
    if (localUrl) window.setTimeout(() => URL.revokeObjectURL(localUrl), 1000);
  };
  const updateSettings = (updates: Partial<SettingsState>) => {
    setSettingsState(current => ({ ...current, ...updates }));
    flash("Settings updated");
  };
  const addTask = (title: string, _projectKind?: ProjectKind, spaceValue = "") => {
    const trimmed = title.trim();
    if (!trimmed) return 0;
    const id = Date.now();
    const classId = spaceValue.startsWith("class:") ? spaceValue.slice(6) : undefined;
    const projectName = spaceValue.startsWith("project:") ? spaceValue.slice(8) : spaceValue && spaceValue !== "Inbox" ? spaceValue : "Inbox";
    const linkedClass = classes.find(item => item.id === classId);
    const linkedProject = classId ? undefined : projectItems.find(project => project.name === projectName);
    setTasks(items => [...items, normalizeTask({ id, title: trimmed, project: linkedProject?.name ?? "Inbox", classId, academicType: classId ? "Assignment" : undefined, color: linkedClass?.color ?? linkedProject?.color ?? "#625af6", due: toDateKey(new Date()), priority: "Medium", focusMinutes: settingsState.defaultFocusMinutes, energy: settingsState.defaultEnergy, status: "Not started", notes: "", customProperties: [], checklist: [], checklistProgress: [] })]);
    setComposer(null);
    flash(linkedClass ? `Task linked to ${linkedClass.code}` : linkedProject ? `Task linked to ${linkedProject.name}` : "Task added to Today");
    return id;
  };
  const addAiTask = (task: ParsedTask) => {
    const requestedSpace = task.project.trim().toLowerCase();
    const linkedClass = classes.find(item => item.code.toLowerCase() === requestedSpace || item.name.toLowerCase() === requestedSpace);
    const linkedProject = linkedClass ? undefined : projectItems.find(item => item.name.toLowerCase() === requestedSpace);
    setTasks(items => [...items, normalizeTask({
      id: Date.now(),
      title: task.title,
      project: linkedProject?.name ?? "Inbox",
      classId: linkedClass?.id,
      academicType: linkedClass ? "Assignment" : undefined,
      color: linkedClass?.color ?? linkedProject?.color ?? "#625af6",
      due: task.due || toDateKey(new Date()),
      startTime: task.startTime,
      priority: task.priority,
      focusMinutes: task.focusMinutes,
      energy: task.energy,
      status: "Not started",
      notes: task.notes ?? "",
      customProperties: [],
      checklist: [],
      checklistProgress: [],
    })]);
    setAiTaskComposer(false);
    flash(linkedClass ? `AI task linked to ${linkedClass.code}` : linkedProject ? `AI task linked to ${linkedProject.name}` : "AI task added to Inbox");
  };
  const addProject = (name: string, kind: ProjectKind = "finishable", _taskProject?: string, icon: ProjectIcon = "FolderKanban", description?: string, color = "#625af6") => {
    const iconComponent = projectIcons[icon];
    setProjectItems(items => [...items, { name, desc: description?.trim() || (kind === "maintenance" ? "An ongoing system to keep healthy." : "A focused project with a finish line."), progress: kind === "maintenance" ? 100 : 0, color, icon: iconComponent, iconName: icon, tasks: 0, kind }]);
    setComposer(null);
    setSpaceComposer(null);
    flash(kind === "maintenance" ? "Maintenance space created" : "Finishable project created");
    openProjectSpace(name);
  };
  const addClass = (classRecord: Omit<ClassRecord, "id">) => {
    const next = normalizeClass({ ...classRecord, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` });
    setClasses(items => [...items, next]);
    setSpaceComposer(null);
    openClassSpace(next.id);
    flash(`${next.code} class created`);
  };
  const updateClass = (id: string, updates: Omit<ClassRecord, "id">) => {
    setClasses(items => items.map(item => item.id === id ? normalizeClass({ ...item, ...updates, id }) : item));
    setEditingClassId(null);
    flash("Class details saved");
  };
  const deleteClass = (id: string) => {
    if (!window.confirm("Delete this class folder? Assignments and notes will be kept, but unlinked from the class.")) return;
    setClasses(items => items.filter(item => item.id !== id));
    setTasks(items => items.map(task => task.classId === id ? { ...task, classId: undefined } : task));
    setNotes(items => items.map(note => note.classId === id ? { ...note, classId: undefined } : note));
    setResources(items => items.map(resource => resource.classId === id ? { ...resource, classId: undefined } : resource));
    setSelectedClassId(null);
    flash("Class folder deleted; its work was kept");
  };
  const addAcademicTask = (classId: string, task: Pick<Task, "title" | "due" | "startTime" | "priority" | "focusMinutes" | "energy" | "academicType" | "gradeWeight" | "pointsEarned" | "pointsPossible" | "submission">) => {
    const classRecord = classes.find(item => item.id === classId);
    if (!classRecord) return;
    setTasks(items => [...items, normalizeTask({
      ...task,
      id: Date.now(),
      classId,
      project: "Inbox",
      color: classRecord.color,
      status: "Not started",
      notes: "",
      checklist: [],
      checklistProgress: [],
    })]);
    setAcademicComposerClassId(null);
    flash(`${task.academicType ?? "Assignment"} added to ${classRecord.code}`);
  };
  const createNote = (classId?: string, projectName?: string, title = "Untitled note") => {
    const next: Note = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, title: title.trim() || "Untitled note", body: "", classId, projectName, updatedAt: new Date().toISOString() };
    setNotes(items => [next, ...items]);
    setSelectedNoteId(next.id);
    setView("Notes");
    setSelectedClassId(null);
    setSelectedProjectName(null);
    flash("New note ready");
  };
  const updateNote = (id: string, updates: Partial<Note>) => setNotes(items => items.map(note => note.id === id ? { ...note, ...updates, updatedAt: new Date().toISOString() } : note));
  const importNotes = (incoming: Note[]) => {
    const imported = incoming.filter(note => note && typeof note.title === "string" && typeof note.body === "string").map(note => ({ ...note, id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, updatedAt: note.updatedAt || new Date().toISOString(), template: ["blank", "lined", "dotted", "cornell", "meeting"].includes(note.template ?? "") ? note.template : "blank" }));
    if (!imported.length) { flash("No valid notes were found in that file"); return; }
    setNotes(items => [...imported, ...items]);
    setSelectedNoteId(imported[0].id);
    flash(`${imported.length} note${imported.length === 1 ? "" : "s"} imported`);
  };
  const deleteNote = (id: string) => {
    setNotes(items => items.filter(note => note.id !== id));
    setSelectedNoteId(current => current === id ? null : current);
    flash("Note deleted permanently");
  };
  const updateProjectKind = (name: string, kind: ProjectKind) => {
    setProjectItems(items => items.map(project => project.name === name ? {
      ...project,
      kind,
      desc: kind === "maintenance" && project.desc === "A focused project with a finish line." ? "An ongoing system to keep healthy." : project.desc,
      progress: kind === "maintenance" && project.progress === 0 ? 100 : project.progress,
    } : project));
    setActionProjectName(null);
    flash(kind === "maintenance" ? "Set as maintenance" : "Set as finishable project");
  };
  const deleteProject = (name: string) => {
    setProjectItems(items => items.filter(project => project.name !== name));
    setTasks(items => items.map(task => task.project === name ? { ...task, project: "Inbox", color: "#625af6" } : task));
    setNotes(items => items.map(note => note.projectName === name ? { ...note, projectName: undefined } : note));
    setActionProjectName(null);
    setSelectedProjectName(null);
    flash("Project deleted");
  };
  const updateProject = (oldName: string, newName: string, desc: string) => {
    setProjectItems(items => items.map(project => project.name === oldName ? { ...project, name: newName, desc } : project));
    setTasks(items => items.map(task => task.project === oldName ? { ...task, project: newName } : task));
    setNotes(items => items.map(note => note.projectName === oldName ? { ...note, projectName: newName } : note));
    setEditingProjectName(null);
    setActionProjectName(null);
    flash("Project updated");
  };
  const addCalendarEvent = (event: CalendarEvent) => {
    setCalendarEvents(items => [...items, event]);
    setCalendarComposer(false);
    flash("Calendar event added");
  };
  const updateCalendarEvent = (event: CalendarEvent) => {
    setCalendarEvents(items => items.map(item => item.id === event.id ? event : item));
    setEditingCalendarEventId(null);
    flash("Calendar event updated");
  };
  const deleteCalendarEvent = (id: string) => {
    setCalendarEvents(items => items.filter(event => event.id !== id));
    setEditingCalendarEventId(null);
    flash("Calendar event deleted");
  };
  const useCalendarEventAsTask = (event: CalendarEvent) => {
    const linkedTask = tasks.find(task => task.calendarEventId === event.id);
    if (linkedTask) {
      setEditingCalendarEventId(null);
      setTaskPageId(linkedTask.id);
      return;
    }
    const startAt = new Date(event.start);
    const endAt = event.end ? new Date(event.end) : null;
    const durationMinutes = endAt && !Number.isNaN(endAt.getTime()) && !Number.isNaN(startAt.getTime())
      ? Math.round((endAt.getTime() - startAt.getTime()) / 60000)
      : settingsState.defaultFocusMinutes;
    const taskId = Date.now();
    setTasks(items => [...items, normalizeTask({
      id: taskId,
      title: event.title,
      project: "Inbox",
      color: event.color,
      due: /^\d{4}-\d{2}-\d{2}/.test(event.start) ? event.start.slice(0, 10) : toDateKey(new Date()),
      startTime: /^\d{2}:\d{2}/.test(event.start.slice(11, 16)) ? event.start.slice(11, 16) : undefined,
      priority: "Medium",
      focusMinutes: Math.max(5, Math.min(240, durationMinutes > 0 ? durationMinutes : settingsState.defaultFocusMinutes)),
      energy: settingsState.defaultEnergy,
      status: "Not started",
      notes: event.notes ?? "",
      calendarEventId: event.id,
      customProperties: [],
      checklist: [],
      checklistProgress: [],
    })]);
    setEditingCalendarEventId(null);
    setTaskPageId(taskId);
    flash("Task created from calendar event");
  };
  const importCalendarEvents = (events: CalendarEvent[]) => {
    setCalendarEvents(items => {
      const seen = new Set(items.map(event => event.id));
      return [...items, ...events.filter(event => !seen.has(event.id))];
    });
    setCalendarImporter(false);
    flash(`${events.length} iCal event${events.length === 1 ? "" : "s"} imported`);
  };
  const updateTask = (id: number, updates: Pick<Task, "title" | "focusMinutes" | "energy" | "project" | "classId" | "academicType" | "color" | "due" | "startTime">) => {
    setTasks(items => items.map(task => task.id === id ? { ...task, ...updates } : task));
    setEditingTaskId(null);
    flash("Priority updated");
  };
  const updateTaskDetails = (id: number, updates: Partial<Task>) => {
    setTasks(items => items.map(task => {
      if (task.id !== id) return task;
      const next = { ...task, ...updates };
      if (updates.status) {
        next.done = updates.status === "Done";
        next.canceled = updates.status === "Canceled";
      }
      return next;
    }));
  };
  const linkTaskToProject = (id: number, project: Project) => {
    setTasks(items => items.map(task => task.id === id ? { ...task, project: project.name, color: project.color } : task));
    flash(`Linked to ${project.name}`);
  };
  const updateTaskChecklist = useCallback((id: number, checklist: string[]) => {
    setTasks(items => items.map(task => task.id === id ? { ...task, checklist } : task));
  }, []);
  const updateTaskChecklistProgress = useCallback((id: number, progress: boolean[]) => {
    setTasks(items => items.map(task => task.id === id ? { ...task, checklistProgress: progress } : task));
  }, []);
  const updateFocusSession = useCallback((id: number, session: FocusSessionUpdate) => {
    setTasks(items => items.map(task => {
      if (task.id !== id) return task;
      const remainingSeconds = Math.max(0, Math.min(task.focusMinutes * 60, Math.round(session.remainingSeconds)));
      if (
        task.focusRemainingSeconds === remainingSeconds
        && Boolean(task.focusSessionStarted) === session.hasStarted
        && Boolean(task.focusSessionRunning) === session.isRunning
        && Boolean(task.focusHalfwayPrompted) === session.halfwayPrompted
      ) return task;
      return {
        ...task,
        focusRemainingSeconds: remainingSeconds,
        focusSessionStarted: session.hasStarted,
        focusSessionRunning: session.isRunning,
        focusHalfwayPrompted: session.halfwayPrompted,
      };
    }));
  }, []);
  const toggleCanceled = (id: number) => {
    setTasks(items => items.map(task => task.id === id ? { ...task, canceled: !task.canceled, done: false, status: task.canceled ? "Not started" : "Canceled" } : task));
    setActionTaskId(null);
    flash("Priority status updated");
  };
  const deleteTask = (id: number) => {
    setTasks(items => {
      const next = items.filter(task => task.id !== id);
      if (activeTaskId === id) setActiveTaskId(next[0]?.id ?? 0);
      return next;
    });
    setActionTaskId(null);
    setEditingTaskId(null);
    setTaskPageId(current => current === id ? null : current);
    setSettingsState(current => current.nowTaskId === id ? { ...current, nowTaskId: null } : current);
    flash("Priority deleted");
  };
  const syncFromCloud = async () => {
    try {
      const data = await pullAllDataFromFirebase();
      if (!data) {
        flash("No cloud data found. Make sure you're online.");
        return;
      }
      if (data.tasks && Array.isArray(data.tasks)) setTasks(data.tasks.map(task => normalizeTask(task)));
      if (data.projects && Array.isArray(data.projects)) {
        setProjectItems(data.projects.map((project: Partial<Project>) => {
          const iconName = project.iconName && projectIcons[project.iconName] ? project.iconName : "FolderKanban";
          return {
            name: project.name ?? "Untitled project",
            desc: project.desc ?? "A space for meaningful work.",
            progress: project.progress ?? 0,
            color: project.color ?? "#625af6",
            iconName,
            icon: projectIcons[iconName],
            tasks: project.tasks ?? 0,
            kind: project.kind === "maintenance" ? "maintenance" : "finishable",
          };
        }));
      }
      if (data.calendar && Array.isArray(data.calendar)) setCalendarEvents(data.calendar);
      if (data.brain && Array.isArray(data.brain)) setBrainItems(data.brain.filter(item => typeof item === "string"));
      if (data.classes && Array.isArray(data.classes)) setClasses(data.classes);
      if (data.notes && Array.isArray(data.notes)) setNotes(data.notes);
      if (data.resources && Array.isArray(data.resources)) setResources(data.resources);
      if (data.life && typeof data.life === "object") setLifeHub({ ...emptyLifeHub, ...data.life });
      if (data.school && typeof data.school === "object") setSchoolHub({ ...emptySchoolHub, ...data.school, profile: { ...emptySchoolHub.profile, ...data.school.profile } });
      if (data.work && typeof data.work === "object") setWorkHub({ ...emptyWorkHub, ...data.work });
      if (data.settings) setSettingsState(current => ({ ...current, ...data.settings }));
      if (data.dark !== undefined) setDark(data.dark);
      flash("✓ Cloud data synced successfully");
    } catch (error) {
      flash("Error syncing from cloud");
      console.error("Sync error:", error);
    }
  };

  const exportData = () => {
    const payload = { exportedAt: new Date().toISOString(), tasks, projects: projectItems.map(({ icon: _, ...project }) => project), events: calendarEvents, brainItems, classes, notes, resources, life: lifeHub, school: schoolHub, work: workHub, settings: settingsState, dark };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lifeos-export-${toDateKey(new Date())}.json`;
    link.click();
    URL.revokeObjectURL(url);
    flash("LifeOS data exported");
  };

  const resetLocalData = () => {
    if (!window.confirm("Reset LifeOS data? This will clear everything and reload.")) return;
    setTasks([]);
    setProjectItems([]);
    setCalendarEvents([]);
    setBrainItems([]);
    setClasses([]);
    setNotes([]);
    setResources([]);
    setLifeHub(emptyLifeHub);
    setSchoolHub(emptySchoolHub);
    setWorkHub(emptyWorkHub);
    setSettingsState(initialSettings);
    setDark(false);
    window.location.reload();
  };

  const importData = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (e: any) => {
        try {
          const data = JSON.parse(e.target.result);
          if (data.tasks && Array.isArray(data.tasks)) {
            setTasks(data.tasks.map((task: any) => normalizeTask(task)));
            await syncDataToFirebase('tasks', data.tasks);
          }
          if (data.projects && Array.isArray(data.projects)) {
            setProjectItems(data.projects.map((project: Partial<Project>) => {
              const iconName = project.iconName && projectIcons[project.iconName] ? project.iconName : "FolderKanban";
              return {
                name: project.name ?? "Untitled project",
                desc: project.desc ?? "A space for meaningful work.",
                progress: project.progress ?? 0,
                color: project.color ?? "#625af6",
                iconName,
                icon: projectIcons[iconName],
                tasks: project.tasks ?? 0,
                kind: project.kind === "maintenance" ? "maintenance" : "finishable",
              };
            }));
            await syncDataToFirebase('projects', data.projects);
          }
          if (data.events && Array.isArray(data.events)) {
            setCalendarEvents(data.events);
            await syncDataToFirebase('calendar', data.events);
          }
          if (data.brainItems && Array.isArray(data.brainItems)) {
            setBrainItems(data.brainItems.filter((item: any) => typeof item === "string"));
            await syncDataToFirebase('brain', data.brainItems);
          }
          if (data.classes && Array.isArray(data.classes)) {
            setClasses(data.classes);
            await syncDataToFirebase('classes', data.classes);
          }
          if (data.notes && Array.isArray(data.notes)) {
            setNotes(data.notes);
            await syncDataToFirebase('notes', data.notes);
          }
          if (data.resources && Array.isArray(data.resources)) {
            setResources(data.resources);
            await syncDataToFirebase('resources', data.resources);
          }
          if (data.life && typeof data.life === "object") {
            const nextLife = { ...emptyLifeHub, ...data.life };
            setLifeHub(nextLife);
            await syncDataToFirebase('life', nextLife);
          }
          if (data.school && typeof data.school === "object") {
            const nextSchool = { ...emptySchoolHub, ...data.school, profile: { ...emptySchoolHub.profile, ...data.school.profile } };
            setSchoolHub(nextSchool);
            await syncDataToFirebase('school', nextSchool);
          }
          if (data.work && typeof data.work === "object") {
            const nextWork = { ...emptyWorkHub, ...data.work };
            setWorkHub(nextWork);
            await syncDataToFirebase('work', nextWork);
          }
          if (data.settings) {
            setSettingsState(current => ({ ...current, ...data.settings }));
            await syncDataToFirebase('settings', data.settings);
          }
          if (data.dark !== undefined) {
            setDark(data.dark);
            await syncDataToFirebase('dark', data.dark);
          }
          flash("✓ LifeOS data imported and synced to cloud");
        } catch {
          alert("Invalid data file. Make sure you're using a LifeOS export.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleLogout = async () => {
    if (!window.confirm("Sign out of LifeOS? You'll need to sign back in to access your data.")) return;
    try {
      await signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
      flash('Failed to sign out');
    }
  };

  const activeTasks = useMemo(() => tasks.filter(task => !task.done && !task.canceled), [tasks]);
  const floatingFocusTask = useMemo(() => activeTasks.find(task => Boolean(task.focusSessionStarted) && getTaskFocusSeconds(task) > 0), [activeTasks]);
  const filtered = useMemo(() => [...nav.map(n => n.name), ...projectItems.map(p => p.name), ...classes.map(item => item.code), ...notes.map(note => note.title), ...activeTasks.map(t => t.title)]
    .filter(x => x.toLowerCase().includes(query.toLowerCase())), [activeTasks, classes, notes, projectItems, query]);

  if (authLoading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0a', color: '#fff' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '20px' }}>LifeOS</div>
        <div style={{ fontSize: '14px', opacity: 0.6 }}>Loading...</div>
      </div>
    </div>;
  }

  if (!user) {
    return <LoginPage onLoginSuccess={() => { setUser({ displayName: TEST_USER.DISPLAY_NAME, email: TEST_USER.EMAIL }); setUserId(TEST_USER.ID); setCloudUserId(TEST_USER.ID); }} />;
  }

  const activeTask = activeTasks.find(task => task.id === activeTaskId) ?? activeTasks.find(task => task.id === settingsState.nowTaskId) ?? activeTasks[0];
  const taskPageTask = taskPageId === null ? null : tasks.find(task => task.id === taskPageId) ?? null;
  const notificationShell = (
    <GlobalNotificationShell
      notifications={visibleNotifications}
      onNavigate={handleNotificationNavigate}
      onDismiss={dismissNotification}
      onDismissAll={dismissAllNotifications}
    />
  );

  if (taskPageTask) {
    return <>
      {notificationShell}
      <TaskWorkspace
      task={taskPageTask}
      tasks={taskPageTask.done || taskPageTask.canceled ? [...activeTasks, taskPageTask] : activeTasks}
      projects={projectItems}
      classes={classes}
      onExit={() => setTaskPageId(null)}
      onSwitch={setTaskPageId}
      onUpdate={updates => updateTaskDetails(taskPageTask.id, updates)}
      onFocus={() => { chooseNowTask(taskPageTask.id); rememberSpaceTask(taskPageTask); setTaskPageId(null); setFocus(true); }}
      onMarkDone={() => { updateTaskDetails(taskPageTask.id, { status: "Done" }); chooseNowTask(settingsState.nowTaskId === taskPageTask.id ? null : settingsState.nowTaskId ?? null); setTaskPageId(null); flash("Done. Cleared from active views."); }}
      onDelete={() => deleteTask(taskPageTask.id)}
    />
    </>;
  }
  if (focus) {
    if (!activeTask) return <>
      {notificationShell}
      <EmptyFocus onExit={() => { setFocus(false); setView("Now"); }} onNewTask={() => { setFocus(false); setComposer("task"); }} />
    </>;
    return <>
      {notificationShell}
      <FocusMode key={activeTask.id} task={activeTask} tasks={activeTasks} soundEffectsEnabled={settingsState.soundEffects} onUpdateNotes={(id, notes) => updateTaskDetails(id, { notes })} onSwitch={(id) => { setActiveTaskId(id); chooseNowTask(id); const task = tasks.find(item => item.id === id); if (task) rememberSpaceTask(task); }} onUpdateChecklist={updateTaskChecklist} onUpdateChecklistProgress={updateTaskChecklistProgress} onUpdateFocusSession={updateFocusSession} onComplete={complete} onExit={(destination) => { setFocus(false); setView(destination ?? "Now"); }} />
    </>;
  }

  const workspaceName = settingsState.preferredName?.trim() || user?.displayName?.trim() || "there";
  const workspaceInitials = workspaceName.split(/\s+/).filter(Boolean).slice(0, 2).map((part: string) => part[0]).join("").toUpperCase() || "U";
  const needsWorkspaceName = Boolean(user && settingsHydrated && !settingsState.preferredName?.trim());

  return (
    <div className="app-shell">
      {notificationShell}
      <AnimatePresence>{sidebar && <motion.button aria-label="Close navigation" className="mobile-scrim" onClick={() => setSidebar(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />}</AnimatePresence>
      <aside className={`sidebar ${sidebar ? "sidebar-open" : ""}`}>
        <div className="brand"><div className="brand-mark"><span /><span /><span /></div><span>LifeOS</span></div>
        <button className="search-trigger" onClick={() => setPalette(true)}><Search size={15} /><span>Search anything</span><kbd>/</kbd><kbd>⌘ K</kbd></button>
        <nav>
          {nav.map((item, idx) => {
            const Icon = item.icon;
            const showCategory = item.category && (idx === 0 || nav[idx - 1].category !== item.category);
            return (
              <div key={item.name}>
                {showCategory && <p className="nav-label">{item.category}</p>}
                <button className={`nav-item ${view === item.name ? "active" : ""}`} onClick={() => go(item.name)}><Icon size={17} strokeWidth={1.8} /><span>{item.name}</span>{item.name === "Brain" && <em>{brainItems.length}</em>}{item.name === "Spaces" && projectItems.length + classes.length > 0 && <em>{projectItems.length + classes.length}</em>}</button>
              </div>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => go("Settings")}><Settings size={17} /><span>Settings</span></button>
          <button className="profile" onClick={() => go("Settings")}><div className="avatar">{workspaceInitials}</div><div><strong>{workspaceName}</strong><small>Personal workspace</small></div><MoreHorizontal size={16} /></button>
        </div>
      </aside>

      {user && <><ICloudCalendarAutoSync user={user} /><GoogleCalendarAutoSync user={user} /></>}
      <main>
        {!fullscreenProject && <>
        <header className="topbar">
          <IconButton label="Open navigation" onClick={() => setSidebar(true)}><Menu size={19} /></IconButton>
          <div className="breadcrumb"><span>LifeOS</span><span>/</span><strong>{view}</strong></div>
          <div className="top-actions">
            <IconButton label="Toggle theme" onClick={() => setDark(v => !v)}>{dark ? <Sun size={18} /> : <Moon size={18} />}</IconButton>
          </div>
        </header>
        <AnimatePresence mode="wait">
          <motion.div key={view} className={`page ${view === "Life" || view === "School" || view === "Work" ? "os-page" : ""}`} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: .18 }}>
            {view === "Life" && <LifeDashboard tasks={tasks} projects={projectItems} notes={notes} events={calendarEvents} workspaceName={workspaceName} onComplete={complete} onOpenTask={openTaskPage} onOpenProject={openProjectSpace} onOpenNote={(id) => { setSelectedNoteId(id); setView("Notes"); }} onOpenTasks={() => go("Tasks")} onOpenProjects={() => openSpacesList("Projects")} onOpenNotes={() => { setSelectedNoteId(null); setView("Notes"); }} onNewTask={() => setComposer("task")} onNewProject={() => setComposer("project")} onNewNote={() => createNote()} onOpenCalendar={() => go("Calendar")} onOpenNow={() => go("Now")} />}
            {view === "School" && <SchoolDashboard tasks={tasks} classes={classes} notes={notes} school={schoolHub} schoolView={schoolView} onChangeView={setSchoolView} schoolFocusTaskId={schoolFocusTaskId} onSelectFocusTask={setSchoolFocusTaskId} onComplete={complete} onOpenTask={openTaskPage} onOpenClass={openClassSpace} onOpenNote={(id) => { setSelectedNoteId(id); setView("Notes"); }} onNewCourse={() => setSpaceComposer("class")} onNewAcademic={() => classes.some(item => !isClassArchived(item)) ? setSchoolClassAction("coursework") : setSpaceComposer("class")} onNewLecture={() => classes.some(item => !isClassArchived(item)) ? setSchoolClassAction("lecture") : setSpaceComposer("class")} onOpenCollection={(key: SchoolHubKey, startAdd) => setHubCollection({ scope: "school", key, startAdd })} onOpenProfile={() => setSchoolProfileOpen(true)} onFocus={(id) => { setSchoolFocusTaskId(id); openFocus(id); }} onOpenCalendar={() => go("Calendar")} onUpdateTaskStatus={(id, status) => updateTaskDetails(id, { status, done: status === "Done" })} />}
            {view === "Work" && <WorkDashboard workHub={workHub} focusTaskId={workFocusTaskId} workView={workView} onChangeView={setWorkView} onChange={setWorkHub} onFocusWork={focusWorkTask} onOpenWorkTask={openWorkTask} onOpenCalendar={() => go("Calendar")} onOpenProject={openWorkProjectSpace} onBrowseProjects={() => openSpacesList("Projects")} />}
            {(view === "Now" || view === "Dashboard") && <NowView tasks={tasks} projects={projectItems} classes={classes} events={calendarEvents} user={user} workspaceName={workspaceName} nowTaskId={settingsState.nowTaskId ?? null} ambientActivity={settingsState.ambientActivity ?? null} currentEnergy={settingsState.currentEnergy ?? "Medium"} momentumLog={settingsState.momentumLog ?? []} onChoose={chooseNowTask} onFocus={openFocus} onOpenTask={openTaskPage} onUpdateTask={updateTaskDetails} onComplete={complete} onCapture={() => setCapture(true)} onSmartCapture={() => setAiTaskComposer(true)} onDailyReset={() => setDailyResetOpen(true)} onWeeklyReview={() => setWeeklyReviewOpen(true)} onStartAmbient={() => setAmbientStartOpen(true)} onWrapAmbient={() => setAmbientWrapupOpen(true)} onGo={go} weeklyPlan={weeklyPlan} setWeeklyPlan={setWeeklyPlan} onSetWorkHub={setWorkHub} onAddTask={(title) => addTask(title)} onAddProject={(name) => addProject(name)} onAddNote={(title) => createNote(undefined, undefined, title)} onAddAssignment={(title) => { const activeClasses = classes.filter(item => !isClassArchived(item)); if (!activeClasses.length) { flash("Add a course first"); setSpaceComposer("class"); return; } addAcademicTask(activeClasses[0].id, { title, due: toDateKey(new Date()), priority: "Medium", focusMinutes: settingsState.defaultFocusMinutes, energy: settingsState.defaultEnergy, academicType: "Assignment" }); }} onBreak={() => setBreakOpen(true)} />}
            {view === "Spaces" && <SpacesView projects={projectItems} classes={classes} tasks={tasks} notes={notes} resources={resources} selectedProjectName={selectedProjectName} selectedClassId={selectedClassId} onBack={() => { setSelectedProjectName(null); setSelectedClassId(null); }} onNew={() => setSpaceComposer("project")} onActionProject={setActionProjectName} onActionClass={setActionClassId} onOpenProject={openProjectSpace} onOpenClass={openClassSpace} onNewAcademicItem={setAcademicComposerClassId} onNewNote={createNote} onOpenTask={openTaskPage} onOpenNote={(id) => { setSelectedNoteId(id); setSelectedClassId(null); setSelectedProjectName(null); setView("Library"); }} onEditClass={setEditingClassId} onDeleteClass={deleteClass} onUploadResource={uploadResource} onDeleteResource={deleteResource} onReplaceResource={replaceResource} onDownloadResource={downloadResource} linkTask={linkTaskToProject} initialFilter={spacesFilter} onFilterChange={setSpacesFilter} />}
            {view === "Tasks" && <Tasks tasks={activeTasks} classes={classes} onComplete={complete} onNew={() => setComposer("task")} onTaskMenu={setActionTaskId} onOpenTask={openTaskPage} />}
            {(view === "Today" || view === "Calendar") && <CalendarView events={[...calendarEvents, ...tasksToCalendarEvents(tasks)]} tasks={activeTasks} weekStartsMonday={settingsState.weekStartsMonday} onNew={(date) => { setDefaultEventDate(date); setCalendarComposer(true); }} onImport={() => setCalendarImporter(true)} onEdit={(id) => id.startsWith("task-") ? openTaskPage(Number(id.slice(5))) : setEditingCalendarEventId(id)} onPlanTask={setEditingTaskId} />}
            {view === "Notes" && <NotesView notes={notes} classes={classes} projects={projectItems} selectedNoteId={selectedNoteId} onSelect={setSelectedNoteId} onCreate={() => createNote()} onUpdate={updateNote} onDelete={deleteNote} onImport={importNotes} />}
            {view === "Resources" && <ResourcesView resources={resources} classes={classes} onUpload={(file) => uploadResource(file)} onDelete={(id) => { const resource = resources.find(item => item.id === id); if (resource) void deleteResource(resource); }} onReplace={(id, file) => { const resource = resources.find(item => item.id === id); if (resource) void replaceResource(resource, file); }} onDownload={downloadResource} />}
            {view === "Library" && <LibraryView notes={notes} classes={classes} projects={projectItems} resources={resources} selectedNoteId={selectedNoteId} onSelectNote={setSelectedNoteId} onCreateNote={() => createNote()} onUpdateNote={updateNote} onDeleteNote={deleteNote} onImportNotes={importNotes} onUpload={(file) => uploadResource(file)} onDeleteResource={(id) => { const resource = resources.find(item => item.id === id); if (resource) void deleteResource(resource); }} onReplaceResource={(id, file) => { const resource = resources.find(item => item.id === id); if (resource) void replaceResource(resource, file); }} onDownload={downloadResource} />}
            {view === "Brain" && <BrainView items={brainItems} onCapture={() => setCapture(true)} onArchive={(index) => { setBrainItems(items => items.filter((_, i) => i !== index)); flash("Thought archived"); }} />}
            {view === "Settings" && <SettingsView dark={dark} setDark={setDark} settings={settingsState} update={updateSettings} tasks={tasks} projects={projectItems} events={calendarEvents} brainItems={brainItems} flash={flash} onSync={syncFromCloud} onReset={resetLocalData} onExport={exportData} onImport={importData} user={user} onLogout={handleLogout} />}
            {view === "Settings" && <CalendarConnections user={user} flash={flash} />}
            {!["Life", "School", "Work", "Now", "Today", "Spaces", "Library", "Dashboard", "Tasks", "Calendar", "Notes", "Brain", "Resources", "Settings"].includes(view) && <ComingSoon view={view} onFocus={() => setFocus(true)} />}
          </motion.div>
        </AnimatePresence>
        </>}
      </main>
      {!focus && floatingFocusTask && <FloatingFocusDock task={floatingFocusTask} onResume={(session) => { updateFocusSession(floatingFocusTask.id, session); setActiveTaskId(floatingFocusTask.id); chooseNowTask(floatingFocusTask.id); setFocus(true); }} onUpdateSession={(session) => updateFocusSession(floatingFocusTask.id, session)} onEnd={() => updateFocusSession(floatingFocusTask.id, { remainingSeconds: getTaskFocusSeconds(floatingFocusTask), hasStarted: false, isRunning: false, halfwayPrompted: Boolean(floatingFocusTask.focusHalfwayPrompted) })} />}
      <AnimatePresence>
        {needsWorkspaceName && <WelcomeNameModal key="welcome-name-modal" suggestedName={user?.displayName} save={(preferredName) => setSettingsState(current => ({ ...current, preferredName }))} />}
        {palette && <CommandPalette key="command-palette" query={query} setQuery={setQuery} results={filtered} close={() => { setPalette(false); setQuery(""); }} go={go} onFocus={() => { setPalette(false); openFocus(); }} onCapture={() => { setPalette(false); setCapture(true); }} onNewTask={() => { setPalette(false); setComposer("task"); }} onResult={(result) => { const task = activeTasks.find(item => item.title === result); const project = projectItems.find(item => item.name === result); const classRecord = classes.find(item => item.code === result); const note = notes.find(item => item.title === result); setPalette(false); setQuery(""); if (task) openTaskPage(task.id); else if (project) openProjectSpace(project.name); else if (classRecord) openClassSpace(classRecord.id); else if (note) { setSelectedNoteId(note.id); setView("Notes"); } }} />}
        {capture && <CaptureModal key="capture-modal" close={() => setCapture(false)} add={(text) => { setBrainItems(x => [text, ...x]); setCapture(false); flash("Thought captured"); }} />}
        {ambientStartOpen && <AmbientStartModal key="ambient-start-modal" close={() => { setAmbientStartOpen(false); setAmbientDraft(null); }} start={beginAmbientActivity} draft={ambientDraft} spaces={[...projectItems.map(item => ({ name: item.name, color: item.color })), ...classes.filter(item => !item.archived).map(item => ({ name: item.code, color: item.color }))]} />}
        {ambientWrapupOpen && settingsState.ambientActivity && <AmbientWrapupModal key="ambient-wrapup-modal" activity={settingsState.ambientActivity} close={() => setAmbientWrapupOpen(false)} finish={wrapUpAmbientActivity} />}
        {dailyResetOpen && <DailyResetModal key="daily-reset" tasks={tasks} close={() => { setDailyResetOpen(false); setSettingsState(current => ({ ...current, dailyReviewDate: toDateKey(new Date()) })); }} choose={chooseNowTask} complete={complete} />}
        {weeklyReviewOpen && <WeeklyReviewModal key="weekly-review" tasks={tasks} projects={projectItems} classes={classes} close={() => { setWeeklyReviewOpen(false); setSettingsState(current => ({ ...current, weeklyReviewDate: toDateKey(new Date()) })); }} onOpenTask={openTaskPage} onGoSpaces={() => { setWeeklyReviewOpen(false); go("Spaces"); }} />}
        {hubCollection?.scope === "school" && <HubCollectionModal key={`school-${hubCollection.key}`} target={hubCollection} records={schoolHub[hubCollection.key]} close={() => setHubCollection(null)} change={(records) => setSchoolHub(current => ({ ...current, [hubCollection.key]: records }))} />}
        {schoolProfileOpen && <SchoolProfileModal profile={schoolHub.profile} close={() => setSchoolProfileOpen(false)} save={(profile) => setSchoolHub(current => ({ ...current, profile }))} />}
        {schoolClassAction && <SchoolClassPickerModal classes={classes} title={schoolClassAction === "lecture" ? "New lecture note" : "New coursework"} close={() => setSchoolClassAction(null)} pick={(classId) => { const action = schoolClassAction; setSchoolClassAction(null); if (action === "lecture") createNote(classId); else setAcademicComposerClassId(classId); }} />}
        {aiTaskComposer && <NLTaskCreationModal key="ai-task-modal" close={() => setAiTaskComposer(false)} onSubmit={addAiTask} existingTasks={tasks} existingProjects={[...projectItems.map(project => project.name), ...classes.map(item => item.code)]} />}
        {composer && <CreateModal key={`create-${composer}`} kind={composer} projects={projectItems} classes={classes} close={() => setComposer(null)} submit={(value, projectKind, taskProject) => composer === "task" ? addTask(value, projectKind, taskProject) : addProject(value, projectKind)} />}
        {spaceComposer && <SpaceModal key={`space-modal-${spaceComposer}`} initialKind={spaceComposer} close={() => setSpaceComposer(null)} addProject={(name, kind, description, color, icon) => addProject(name, kind, undefined, icon, description, color)} addClass={addClass} />}
        {academicComposerClassId && classes.find(item => item.id === academicComposerClassId) && <AcademicItemModal key={`academic-${academicComposerClassId}`} classRecord={classes.find(item => item.id === academicComposerClassId)!} close={() => setAcademicComposerClassId(null)} add={(task) => addAcademicTask(academicComposerClassId, task)} defaults={{ focusMinutes: settingsState.defaultFocusMinutes, energy: settingsState.defaultEnergy }} />}
        {calendarComposer && <CalendarEventModal key="calendar-event-modal" close={() => { setCalendarComposer(false); setDefaultEventDate(null); }} add={addCalendarEvent} defaultDate={defaultEventDate} />}
        {editingCalendarEventId && calendarEvents.find(event => event.id === editingCalendarEventId) && <CalendarEventModal key={`calendar-edit-${editingCalendarEventId}`} event={calendarEvents.find(event => event.id === editingCalendarEventId)!} close={() => setEditingCalendarEventId(null)} add={updateCalendarEvent} remove={deleteCalendarEvent} onTaskAction={useCalendarEventAsTask} taskActionLabel={tasks.some(task => task.calendarEventId === editingCalendarEventId) ? "Open task" : "Create task"} />}
        {calendarImporter && <CalendarImportModal key="calendar-import-modal" close={() => setCalendarImporter(false)} add={importCalendarEvents} />}
        {breakOpen && <BreakModal key="break-modal" close={() => setBreakOpen(false)} done={() => { setBreakOpen(false); flash("Break complete — ease back in"); }} />}
        {actionTaskId !== null && tasks.find(task => task.id === actionTaskId) && <TaskActionsModal key={`task-actions-${actionTaskId}`} task={tasks.find(task => task.id === actionTaskId)!} close={() => setActionTaskId(null)} open={() => { openTaskPage(actionTaskId); setActionTaskId(null); }} edit={() => { setEditingTaskId(actionTaskId); setActionTaskId(null); }} toggleCanceled={() => toggleCanceled(actionTaskId)} remove={() => deleteTask(actionTaskId)} />}
        {actionClassId && classes.find(item => item.id === actionClassId) && <ClassActionsModal key={`class-actions-${actionClassId}`} classRecord={classes.find(item => item.id === actionClassId)!} close={() => setActionClassId(null)} edit={() => { setEditingClassId(actionClassId); setActionClassId(null); }} remove={() => { deleteClass(actionClassId); setActionClassId(null); }} />}
        {editingTaskId !== null && tasks.find(task => task.id === editingTaskId) && <EditTaskModal key={`edit-task-${editingTaskId}`} task={tasks.find(task => task.id === editingTaskId)!} tasks={tasks} projects={projectItems} classes={classes} close={() => setEditingTaskId(null)} save={(updates) => updateTask(editingTaskId, updates)} />}
        {editingProjectName && projectItems.find(project => project.name === editingProjectName) && <EditProjectModal key={`edit-project-${editingProjectName}`} project={projectItems.find(project => project.name === editingProjectName)!} close={() => setEditingProjectName(null)} save={(name, desc) => updateProject(editingProjectName, name, desc)} />}
        {editingClassId && classes.find(item => item.id === editingClassId) && <EditClassModal key={`edit-class-${editingClassId}`} classRecord={classes.find(item => item.id === editingClassId)!} close={() => setEditingClassId(null)} save={(updates) => updateClass(editingClassId, updates)} />}
        {actionProjectName && projectItems.find(project => project.name === actionProjectName) && <ProjectActionsModal key={`project-actions-${actionProjectName}`} project={projectItems.find(project => project.name === actionProjectName)!} close={() => setActionProjectName(null)} setKind={(kind) => updateProjectKind(actionProjectName, kind)} onDelete={() => deleteProject(actionProjectName)} onEdit={() => { setEditingProjectName(actionProjectName); setActionProjectName(null); }} />}
        {notice && <motion.div key="notice-toast" className="toast" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}><CheckCircle2 size={15} /> {notice}</motion.div>}
      </AnimatePresence>
    </div>
  );
}

function NowView({ tasks, projects, classes, events, user, workspaceName, nowTaskId, ambientActivity, currentEnergy, momentumLog, onChoose, onFocus, onOpenTask, onUpdateTask, onComplete, onCapture, onSmartCapture, onDailyReset, onWeeklyReview, onStartAmbient, onWrapAmbient, onGo, weeklyPlan, setWeeklyPlan, onSetWorkHub, onAddTask, onAddProject, onAddNote, onAddAssignment, onBreak }: { tasks: Task[]; projects: Project[]; classes: ClassRecord[]; events: CalendarEvent[]; user?: any; workspaceName: string; nowTaskId: number | null; ambientActivity: AmbientActivity | null; currentEnergy: EnergyLevel; momentumLog: SettingsState["momentumLog"]; onChoose: (id: number | null) => void; onFocus: (id: number) => void; onOpenTask: (id: number) => void; onUpdateTask: (id: number, updates: Partial<Task>) => void; onComplete: (id: number) => void; onCapture: () => void; onSmartCapture: () => void; onDailyReset: () => void; onWeeklyReview: () => void; onStartAmbient: () => void; onWrapAmbient: () => void; onGo: (view: View) => void; weeklyPlan: WeeklyPlan; setWeeklyPlan: (plan: WeeklyPlan) => void; onSetWorkHub: (updater: (current: WorkHubState) => WorkHubState) => void; onAddTask: (title: string) => number; onAddProject: (name: string) => void; onAddNote: (title: string) => void; onAddAssignment: (title: string) => void; onBreak: () => void }) {
  const [handoff, setHandoff] = useState("");
  const [captureInput, setCaptureInput] = useState("");
  const [suggestedCommandIndex, setSuggestedCommandIndex] = useState(-1);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window === 'undefined') return false;
    const seen = localStorage.getItem('lifeos-onboarding-seen');
    return !seen;
  });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1_000); return () => window.clearInterval(timer); }, []);
  const today = toDateKey(new Date());
  const allActive = tasks.filter(task => !task.done && !task.canceled);
  const active = allActive.filter(task => getTaskStatus(task) !== "Waiting" || !task.followUpDate || task.followUpDate <= today);
  const current = active.find(task => task.id === nowTaskId);
  const recommendations = [...active].sort((a, b) => {
    const score = (task: Task) => {
      const days = task.due ? Math.round((new Date(`${task.due}T12:00`).getTime() - new Date(`${today}T12:00`).getTime()) / 86_400_000) : 30;
      const dueScore = days <= 0 ? 100 : days === 1 ? 65 : Math.max(0, 35 - days * 4);
      const priorityScore = task.priority === "High" ? 38 : task.priority === "Medium" ? 20 : 8;
      const energyScore = task.energy === currentEnergy ? 28 : currentEnergy === "Low" && task.energy === "High" ? -26 : -3;
      return dueScore + priorityScore + energyScore - Math.min(task.focusMinutes, 90) / 12;
    };
    return score(b) - score(a);
  }).filter(task => task.id !== current?.id).slice(0, 5);
  const todayEvents = events.filter(event => eventOccursOnDate(event, today)).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 3);
  const activeSpace = current?.classId ? classes.find(item => item.id === current.classId)?.code : current?.project;
  const resurfacing = allActive.filter(task => task.id !== current?.id && (task.due < today || (getTaskStatus(task) === "Waiting" && Boolean(task.followUpDate && task.followUpDate <= today)))).slice(0, 3);

  const switchTo = (task: Task) => {
    if (current && handoff.trim()) onUpdateTask(current.id, { handoffNote: handoff.trim() });
    setHandoff("");
    onChoose(task.id);
  };
  const closeOnboarding = () => {
    setShowOnboarding(false);
    if (typeof window !== 'undefined') localStorage.setItem('lifeos-onboarding-seen', 'true');
  };
  const commands = [
    { shortcut: '/t', label: 'Add task', desc: 'Create a new task' },
    { shortcut: '/proj', label: 'Add project', desc: 'Start a new project' },
    { shortcut: '/asg', label: 'Add assignment', desc: 'School mode only' },
    { shortcut: '/note', label: 'Add note', desc: 'Capture a quick note' },
    { shortcut: '/w', label: 'I\'m doing something', desc: 'Start ambient activity' },
    { shortcut: '/b', label: 'Break', desc: 'I need a break' },
    { shortcut: '/a', label: 'AI task', desc: 'Create with AI assistance' },
    { shortcut: '/w proj', label: 'Work project', desc: 'Start a work project' },
    { shortcut: '/w deliver', label: 'Deliverable', desc: 'Add a work deliverable' },
    { shortcut: '/w task', label: 'Work task', desc: 'Add a work task' },
    { shortcut: '/w meet', label: 'Schedule meeting', desc: 'Schedule a meeting' },
  ];
  const filtered = captureInput.startsWith('/') ? commands.filter(c => c.shortcut.includes(captureInput.split(' ')[0])) : [];
  const handleCaptureKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSuggestedCommandIndex(Math.min(suggestedCommandIndex + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSuggestedCommandIndex(Math.max(suggestedCommandIndex - 1, -1));
    } else if (e.key === 'Enter') {
      const val = e.currentTarget.value.trim();
      if (suggestedCommandIndex >= 0) {
        const cmd = filtered[suggestedCommandIndex];
        setCaptureInput(cmd.shortcut + ' ');
        setSuggestedCommandIndex(-1);
      } else if (val) {
        if (val === '/w' || val === '/w ') {
          onStartAmbient();
        } else if (val === '/b' || val === '/b ') {
          onBreak();
        } else if (val === '/a' || val === '/a ') {
          onSmartCapture();
        } else if (val.startsWith('/t ')) {
          const taskTitle = val.slice(3).trim();
          if (taskTitle) {
            const id = onAddTask(taskTitle);
            if (id) onChoose(id);
          }
        } else if (val.startsWith('/proj ')) {
          const projectName = val.slice(6).trim();
          if (projectName) onAddProject(projectName);
        } else if (val.startsWith('/asg ')) {
          const assignmentTitle = val.slice(5).trim();
          if (assignmentTitle) onAddAssignment(assignmentTitle);
        } else if (val.startsWith('/note ')) {
          const noteTitle = val.slice(6).trim();
          if (noteTitle) onAddNote(noteTitle);
        } else if (val.startsWith('/w proj ')) {
          const projName = val.slice(8).trim() || 'New Project';
          const newProj: WorkProject = { id: `proj-${Date.now()}`, name: projName, color: '#625af6', status: 'active', createdAt: new Date().toISOString() };
          onSetWorkHub((current: WorkHubState) => ({ ...current, projects: [...current.projects, newProj] }));
          setCaptureInput('');
        } else if (val.startsWith('/w deliver ')) {
          const title = val.slice(11).trim() || 'New deliverable';
          onSetWorkHub((current: WorkHubState) => {
            const project = current.projects.find(item => item.status === 'active');
            if (!project) return current;
            const deliverable: WorkDeliverable = { id: `del-${Date.now()}`, projectId: project.id, title, type: 'document', status: 'planned', priority: 'medium', dueDate: toDateKey(new Date()), createdAt: new Date().toISOString() };
            return { ...current, deliverables: [...current.deliverables, deliverable] };
          });
          setCaptureInput('');
        } else if (val.startsWith('/w task ')) {
          const title = val.slice(8).trim() || 'New task';
          onSetWorkHub((current: WorkHubState) => {
            const deliverable = current.deliverables[0];
            if (!deliverable) return current;
            const task: WorkTask = { id: `task-${Date.now()}`, deliverableId: deliverable.id, title, status: 'open', priority: 'medium', dueDate: toDateKey(new Date()), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
            return { ...current, tasks: [...current.tasks, task] };
          });
          setCaptureInput('');
        } else if (val.startsWith('/w meet ')) {
          const meetTitle = val.slice(8).trim() || 'New Meeting';
          const newMeet: WorkMeeting = { id: `meet-${Date.now()}`, title: meetTitle, start: new Date().toISOString(), type: 'other', createdAt: new Date().toISOString() };
          onSetWorkHub((current: WorkHubState) => ({ ...current, meetings: [...current.meetings, newMeet] }));
          setCaptureInput('');
        } else {
          onStartAmbient();
        }
        setCaptureInput('');
      }
    }
  };
  return <div className="now-view">
    {showOnboarding && (
      <div className="onboarding-overlay">
        <div className="onboarding-modal">
          <button className="onboarding-close" onClick={closeOnboarding}>✕</button>
          <div className="onboarding-content">
            <h2>Welcome to LifeOS</h2>
            <p className="onboarding-subtitle">Your life, in focus.</p>
            <div className="onboarding-tips">
              <div className="tip">
                <strong>📝 Capture Commands</strong>
                <p>Type <code>/t</code> to add tasks, <code>/proj</code> for projects, <code>/asg</code> for assignments</p>
              </div>
              <div className="tip">
                <strong>🎯 Current Task</strong>
                <p>Click any task to focus on it. Your active task shows here with focus features.</p>
              </div>
              <div className="tip">
                <strong>✨ LifeOS Copilot</strong>
                <p>Your AI assistant suggests what to do next based on your priorities and context.</p>
              </div>
              <div className="tip">
                <strong>⌨️ Quick Actions</strong>
                <p>Use keyboard shortcuts for faster navigation. Hover over elements to learn more.</p>
              </div>
            </div>
            <button className="onboarding-button" onClick={closeOnboarding}>Let&apos;s go!</button>
          </div>
        </div>
      </div>
    )}
    <div className="page-title">
      <div><p className="eyebrow">One thing, on purpose</p><h1>Now</h1><p>LifeOS can suggest the next move. You decide what gets your attention.</p></div>
      <div className="now-header-actions"><button onClick={onCapture}><Inbox size={16} /> Capture thought</button><button onClick={onSmartCapture}><Sparkles size={16} /> Add naturally</button><button onClick={onDailyReset}>Daily reset</button><button onClick={onWeeklyReview}>Weekly review</button><button className="primary" onClick={() => onGo("Today")}><CalendarDays size={16} /> Plan today</button></div>
    </div>
    {ambientActivity ? (
      <section className="ambient-active-strip">
        <div><span className="section-icon orange"><TimerReset size={14} /></span><div><p>YOU’RE ALREADY DOING IT</p><strong>{ambientActivity.title}</strong><small>{formatAmbientDuration(now - new Date(ambientActivity.startedAt).getTime())} so far · no planning required</small></div></div>
        <button onClick={onWrapAmbient}>Finish & sort later <ArrowRight size={15} /></button>
      </section>
    ) : (
      <div className="capture-bar-wrapper">
        <section className="capture-bar-section" title="Capture commands: /t for tasks, /proj for projects, /asg for assignments">
          <span className="section-icon blue"><Command size={16} /></span>
          <input type="text" placeholder="Type / for commands" value={captureInput} onChange={(e) => { setCaptureInput(e.currentTarget.value); setSuggestedCommandIndex(-1); }} onKeyDown={handleCaptureKeyDown} title="Start typing / to see command suggestions" />
          <span className="capture-hint">/t task • /proj project • /asg assignment</span>
        </section>
        {filtered.length > 0 ? (
          <div className="capture-suggestions">
            {filtered.map((cmd, idx) => (
              <button key={cmd.shortcut} className={idx === suggestedCommandIndex ? "suggested" : ""} onClick={() => { setCaptureInput(cmd.shortcut + " "); setSuggestedCommandIndex(-1); }}>
                <strong>{cmd.shortcut}</strong>
                <span>{cmd.desc}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    )}
    <div className="now-layout">
      <section className="card now-current-card" title="Your focused task. Click any task to focus on it here.">
        <div className="card-head"><div><span className="section-icon violet"><Focus size={14} /></span><h2>Current task</h2></div>{current && <button className="text-button" onClick={() => onChoose(null)}>Clear</button>}</div>
        {current ? <div className="now-current-content">
          <span className="task-dot" style={{ background: current.color }} />
          <p className="eyebrow">{activeSpace || "Unsorted"} · {current.focusMinutes} min · {current.energy} energy</p>
          <h2>{current.title}</h2><p>{current.nextAction || current.handoffNote ? `Next visible step: ${current.nextAction || current.handoffNote}` : `Due ${formatDueDate(current.due)} · ${current.priority} priority`}</p>
          <div className="now-current-actions"><button className="primary" onClick={() => onFocus(current.id)}><Focus size={16} /> Start focus</button><button onClick={() => onOpenTask(current.id)}>Open task</button></div>
          <label className="handoff-field"><span>What is the smallest visible next step?</span><input value={handoff} onChange={event => setHandoff(event.target.value)} onBlur={() => handoff.trim() && onUpdateTask(current.id, { handoffNote: handoff.trim(), nextAction: handoff.trim() })} placeholder={current.nextAction || "Next visible step…"} /></label>
        </div> : <div className="priority-empty now-empty now-empty-productive"><div><strong>Nothing is claiming your attention.</strong><p>That’s not a void — it’s room to choose your next move on purpose.</p></div><div className="now-idle-actions"><button onClick={onStartAmbient}><TimerReset size={15} /><span><strong>I already started</strong><small>Track it without stopping</small></span></button><button onClick={onSmartCapture}><Sparkles size={15} /><span><strong>Make a task</strong><small>Say it naturally</small></span></button><button onClick={() => onGo("Today")}><CalendarDays size={15} /><span><strong>Protect time</strong><small>Plan a spot today</small></span></button></div></div>}
      </section>
      <LifeOSCopilot tasks={active} classes={classes} events={todayEvents} current={current} recommendations={recommendations} onChoose={switchTo} onFocus={onFocus} onComplete={onComplete} onPlan={() => onGo("Today")} />
    </div>
    <section className="card week-brainstorm">
      <div className="card-head">
        <div><span className="section-icon blue"><Brain size={14} /></span><h2>Plan the week</h2></div>
      </div>
      {(() => {
        const today = new Date();
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const weekDays = Array.from({ length: 7 }, (_, i) => {
          const date = new Date(today);
          date.setDate(date.getDate() + i);
          return { date, dayOfWeek: date.getDay(), label: dayNames[date.getDay()], dayNum: date.getDate() };
        });
        const updatePlan = (dayOfWeek: number, items: WeeklyPlanItem[]) => {
          const updated = { ...weeklyPlan };
          if (items.length === 0) {
            delete updated[dayOfWeek];
          } else {
            updated[dayOfWeek] = items;
          }
          setWeeklyPlan(updated);
        };
        const addPlanItem = (dayOfWeek: number, text: string) => {
          if (!text.trim()) return;
          const items = weeklyPlan[dayOfWeek] ?? [];
          updatePlan(dayOfWeek, [...items, { id: String(Date.now()) + '-' + Math.random().toString(36).slice(2), text: text.trim() }]);
        };
        const removePlanItem = (dayOfWeek: number, id: string) => {
          const items = (weeklyPlan[dayOfWeek] ?? []).filter(item => item.id !== id);
          updatePlan(dayOfWeek, items);
        };
        return (
          <div className="week-plan-grid">
            {weekDays.map(({ date, dayOfWeek, label, dayNum }) => (
              <div key={dayOfWeek} className="week-plan-day">
                <div className="week-day-header">
                  <strong>{label}</strong>
                  <span className="week-day-num">{dayNum}</span>
                </div>
                <div className="week-day-items">
                  {(weeklyPlan[dayOfWeek] ?? []).map(item => (
                    <div key={item.id} className="week-plan-item">
                      <span>{item.text}</span>
                      <button className="week-item-remove" onClick={() => removePlanItem(dayOfWeek, item.id)} aria-label="Remove"><X size={12} /></button>
                    </div>
                  ))}
                </div>
                <input
                  type="text"
                  className="week-day-input"
                  placeholder="Add something..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addPlanItem(dayOfWeek, e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>
            ))}
          </div>
        );
      })()}
    </section>
    <section className="card now-recommendations"><div className="card-head"><div><span className="section-icon orange"><Sparkles size={14} /></span><h2>Good next choices</h2></div><span className="count">Pick one — nothing starts automatically</span></div>
      {recommendations.length ? <div className="now-choice-list">{recommendations.map(task => <button key={task.id} className="now-choice" onClick={() => switchTo(task)}><i style={{ background: task.color }} /><div><strong>{task.title}</strong><p>{task.classId ? classes.find(item => item.id === task.classId)?.code : task.project} · {formatDueDate(task.due)} · {task.focusMinutes}m · {task.energy} energy</p></div><span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span><ArrowRight size={16} /></button>)}</div> : <div className="priority-empty"><strong>You’re clear.</strong><p>Add a task or capture a thought when something new arrives.</p></div>}
    </section>
    {resurfacing.length > 0 && <section className="card resurface-card"><div className="card-head"><div><span className="section-icon blue"><RefreshCw size={14} /></span><h2>Worth resurfacing</h2></div><span className="count">Old doesn’t mean failed</span></div><div className="resurface-list">{resurfacing.map(task => <div key={task.id}><i style={{ background: task.color }} /><div><strong>{task.title}</strong><p>{getTaskStatus(task) === "Waiting" ? `Follow up ${formatDueDate(task.followUpDate ?? task.due)}` : `Due ${formatDueDate(task.due)}`}</p></div><button onClick={() => switchTo(task)}>Make current</button><button className="resurface-done" aria-label={`Mark ${task.title} done`} onClick={() => onComplete(task.id)}><Check size={15} /></button></div>)}</div></section>}
    <div className="now-bottom-grid"><DashboardGmailCard user={user} onSettings={() => onGo("Settings")} /><section className="card now-space-card"><div className="card-head"><div><span className="section-icon blue"><Sparkles size={14} /></span><h2>Momentum</h2></div><span className="count">Last 7 days</span></div><div className="agenda-list">{(momentumLog ?? []).slice(0, 4).map(entry => <div key={entry.id} className="agenda-item compact"><i /><div><strong>{entry.title}</strong><p>{entry.type === "done" ? "Completed" : "Focus started"} · {new Date(entry.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p></div></div>)}{!(momentumLog?.length) && <div className="priority-empty"><strong>Momentum starts small.</strong><p>Focus or finish one thing and it will show here.</p></div>}</div></section></div>
  </div>;
}

function DailyResetModal({ tasks, close, choose, complete }: { tasks: Task[]; close: () => void; choose: (id: number | null) => void; complete: (id: number) => void }) {
  const today = toDateKey(new Date());
  const active = tasks.filter(task => !task.done && !task.canceled);
  const needsAttention = active.filter(task => task.due <= today).slice(0, 3);
  return <motion.div className="modal-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.section className="review-modal" initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }}><button className="modal-close" aria-label="Close daily reset" onClick={close}><X size={18} /></button><p className="eyebrow">A calm reset</p><h2>What would make today feel lighter?</h2><p>Pick one thing. The rest can wait without disappearing.</p><div className="review-stats"><div><strong>{active.length}</strong><span>open tasks</span></div><div><strong>{needsAttention.length}</strong><span>need attention</span></div><div><strong>{active.filter(task => task.due === today).length}</strong><span>due today</span></div></div><div className="review-task-list">{needsAttention.length ? needsAttention.map(task => <div key={task.id}><i style={{ background: task.color }} /><div><strong>{task.title}</strong><small>{task.project} · {formatDueDate(task.due)}</small></div><button onClick={() => { choose(task.id); close(); }}>Choose</button><button className="review-check" aria-label={`Complete ${task.title}`} onClick={() => complete(task.id)}><Check size={15} /></button></div>) : <div className="review-empty">Nothing urgent. Protect your breathing room.</div>}</div><button className="review-finish" onClick={close}>I’m clear on my next move</button></motion.section></motion.div>;
}

function WeeklyReviewModal({ tasks, projects, classes, close, onOpenTask, onGoSpaces }: { tasks: Task[]; projects: Project[]; classes: ClassRecord[]; close: () => void; onOpenTask: (id: number) => void; onGoSpaces: () => void }) {
  const active = tasks.filter(task => !task.done && !task.canceled);
  const stale = active.filter(task => task.due < toDateKey(new Date())).slice(0, 4);
  const spaces = [...projects.map(project => ({ label: project.name, count: active.filter(task => task.project === project.name).length, color: project.color })), ...classes.filter(item => !item.archived).map(item => ({ label: item.code, count: active.filter(task => task.classId === item.id).length, color: item.color }))].filter(item => item.count > 0).slice(0, 6);
  return <motion.div className="modal-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.section className="review-modal weekly-review" initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }}><button className="modal-close" aria-label="Close weekly review" onClick={close}><X size={18} /></button><p className="eyebrow">Weekly review</p><h2>Get your worlds back in view.</h2><p>No giant productivity audit. Just notice what is active, stale, or ready to let go.</p><div className="space-review-list">{spaces.map(space => <div key={space.label}><i style={{ background: space.color }} /><strong>{space.label}</strong><span>{space.count} open</span></div>)}{!spaces.length && <div className="review-empty">You have no active work right now.</div>}</div>{stale.length > 0 && <div className="review-task-list"><p>Worth deciding on</p>{stale.map(task => <div key={task.id}><i style={{ background: task.color }} /><div><strong>{task.title}</strong><small>Due {formatDueDate(task.due)}</small></div><button onClick={() => { onOpenTask(task.id); close(); }}>Review</button></div>)}</div>}<button className="review-finish" onClick={onGoSpaces}>Open my spaces</button></motion.section></motion.div>;
}

function LifeOSCopilot({ tasks, classes, events, current, recommendations, onChoose, onFocus, onComplete, onPlan }: { tasks: Task[]; classes: ClassRecord[]; events: CalendarEvent[]; current?: Task; recommendations: Task[]; onChoose: (task: Task) => void; onFocus: (id: number) => void; onComplete: (id: number) => void; onPlan: () => void }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(current ? "You have a current task. I can help you make the next step smaller or protect time for it." : "You are not locked into anything right now. Ask me what matters, or pick one good next move.");
  const [suggestion, setSuggestion] = useState<{ task?: Task; action: "focus" | "choose" | "plan" | "complete" | "none" }>({ action: current ? "focus" : "none", task: current });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const firstTask = current || recommendations[0] || tasks[0];
  const fallback = (prompt: string) => {
    const lower = prompt.toLowerCase();
    const completionWords = /\b(done|finished|completed|complete|wrapped up)\b/.test(lower);
    const namedTask = tasks.find(task => lower.includes(task.title.toLowerCase()));
    if (completionWords && (namedTask || current)) return { answer: "Marked " + (namedTask || current)!.title + " as done. Nice work.", action: "complete" as const, task: namedTask || current };
    if (lower.includes("plan")) return { answer: events.length ? "You have " + events.length + " calendar item" + (events.length === 1 ? "" : "s") + " today. Let’s protect those blocks first, then place one focused task around them." : "Your calendar is open. Put one realistic task into Today before adding more.", action: "plan" as const, task: firstTask };
    if (lower.includes("urgent") || lower.includes("catch")) return { answer: firstTask ? firstTask.title + " is the clearest next move based on due date, priority, and focus size. We can make it current without starting it yet." : "You’re clear right now. Capture the next thing that lands, then we’ll sort it.", action: "choose" as const, task: firstTask };
    return { answer: firstTask ? "Let’s make the first visible move: choose " + firstTask.title + (firstTask.focusMinutes <= 30 ? " and start a short focus session." : " as your current task. You can stop or switch anytime.") : "Start with one tiny capture: write the next thing on your mind, then I’ll help shape it.", action: firstTask ? "focus" as const : "none" as const, task: firstTask };
  };
  const ask = async (prompt: string) => {
    const clean = prompt.trim();
    if (!clean || busy) return;
    setBusy(true); setError(""); setQuestion("");
    const context = {
      currentTaskId: current?.id || null,
      tasks: tasks.slice(0, 12).map(task => ({ id: task.id, title: task.title, due: task.due, priority: task.priority, focusMinutes: task.focusMinutes, energy: task.energy, space: task.classId ? classes.find(item => item.id === task.classId)?.code : task.project })),
      events: events.map(event => ({ title: event.title, start: event.start })),
    };
    try {
      const response = await fetch("/api/ai", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "copilot", question: clean, context }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "LifeOS Copilot could not answer right now.");
      const task = tasks.find(item => item.id === data.suggestedTaskId);
      if (data.suggestedAction === "complete" && task) {
        onComplete(task.id);
        setAnswer("Marked " + task.title + " as done. Nice work.");
        setSuggestion({ action: "none" });
      } else {
        setAnswer(data.answer); setSuggestion({ task, action: data.suggestedAction || "none" });
      }
    } catch {
      const local = fallback(clean);
      if (local.action === "complete" && local.task) {
        onComplete(local.task.id);
        setAnswer(local.answer); setSuggestion({ action: "none" });
      } else {
        setAnswer(local.answer); setSuggestion({ task: local.task, action: local.action });
      }
      setError("Using your LifeOS context while AI is unavailable.");
    } finally { setBusy(false); }
  };
  const act = () => {
    if (suggestion.action === "plan") return onPlan();
    if (!suggestion.task) return;
    if (suggestion.action === "complete") return onComplete(suggestion.task.id);
    if (suggestion.action === "focus") { onChoose(suggestion.task); onFocus(suggestion.task.id); return; }
    if (suggestion.action === "choose") onChoose(suggestion.task);
  };
  const actionLabel = suggestion.action === "focus" ? "Start this focus" : suggestion.action === "choose" ? "Make this current" : suggestion.action === "plan" ? "Open Today" : suggestion.action === "complete" ? "Mark as done" : "";
  return <aside className="card copilot-card" aria-label="LifeOS Copilot"><div className="card-head"><div><span className="section-icon violet"><Sparkles size={14} /></span><h2>LifeOS Copilot</h2></div><span className="copilot-status"><i /> AI assistant</span></div><div className="copilot-body"><p className="copilot-kicker">YOUR CONTEXT, NOT A GENERIC CHATBOT</p><div className="copilot-orb"><Sparkles size={19} /></div><div className="copilot-answer" aria-live="polite">{busy ? <><span className="copilot-thinking"><i /><i /><i /></span><strong>Thinking with your context…</strong></> : <><strong>{answer}</strong>{error && <small>{error}</small>}</>}</div>{suggestion.task && !busy && <div className="copilot-suggestion"><i style={{ background: suggestion.task.color }} /><div><span>Suggested next move</span><strong>{suggestion.task.title}</strong><small>{suggestion.task.focusMinutes} min · {suggestion.task.energy} energy</small></div></div>}{actionLabel && !busy && <button className="copilot-action" onClick={act}>{suggestion.action === "focus" ? <Focus size={15} /> : suggestion.action === "plan" ? <CalendarDays size={15} /> : <CheckCircle2 size={15} />}{actionLabel}</button>}<div className="copilot-prompts"><button onClick={() => void ask("What is the most urgent thing I should do next?")} disabled={busy}>What’s urgent?</button><button onClick={() => void ask("Help me start with the smallest possible first step.")} disabled={busy}>Help me start</button><button onClick={() => void ask("Plan my day around my calendar and open tasks.")} disabled={busy}>Plan my day</button><button onClick={() => void ask("Catch me up on what matters across my work.")} disabled={busy}>Catch me up</button></div><form className="copilot-input" onSubmit={event => { event.preventDefault(); void ask(question); }}><label htmlFor="copilot-question">Ask LifeOS</label><div><input id="copilot-question" value={question} onChange={event => setQuestion(event.target.value)} placeholder="What should I focus on?" disabled={busy} /><button aria-label="Ask LifeOS" disabled={!question.trim() || busy}><ArrowRight size={16} /></button></div></form></div></aside>;
}

function LibraryView({ notes, classes, projects, resources, selectedNoteId, onSelectNote, onCreateNote, onUpdateNote, onDeleteNote, onImportNotes, onUpload, onDeleteResource, onReplaceResource, onDownload }: { notes: Note[]; classes: ClassRecord[]; projects: Project[]; resources: Resource[]; selectedNoteId: string | null; onSelectNote: (id: string | null) => void; onCreateNote: () => void; onUpdateNote: (id: string, updates: Partial<Note>) => void; onDeleteNote: (id: string) => void; onImportNotes: (notes: Note[]) => void; onUpload: (file: File) => void | Promise<void>; onDeleteResource: (id: string) => void; onReplaceResource: (id: string, file: File) => void; onDownload: (resource: Resource) => void | Promise<void> }) {
  const [tab, setTab] = useState<"notes" | "resources">("notes");
  return <><div className="page-title"><div><p className="eyebrow">Keep & organize</p><h1>Library</h1><p>Your notes and files.</p></div><div className="calendar-mode-tabs"><button className={tab === "notes" ? "selected" : ""} onClick={() => setTab("notes")}><NotebookPen size={14} /> Notes</button><button className={tab === "resources" ? "selected" : ""} onClick={() => setTab("resources")}><Archive size={14} /> Resources</button></div></div>{tab === "notes" ? <NotesView notes={notes} classes={classes} projects={projects} selectedNoteId={selectedNoteId} onSelect={onSelectNote} onCreate={onCreateNote} onUpdate={onUpdateNote} onDelete={onDeleteNote} onImport={onImportNotes} /> : <ResourcesView resources={resources} classes={classes} onUpload={onUpload} onDelete={onDeleteResource} onReplace={onReplaceResource} onDownload={onDownload} />}</>;
}

function Dashboard({ tasks, projects, classes, brainCount, user, onComplete, onFocus, onOpenTask, onCapture, onGo, onNewTask, onTaskMenu, events, onOpenProject, weeklyPlan, setWeeklyPlan }: { tasks: Task[]; projects: Project[]; classes: ClassRecord[]; brainCount: number; user?: any; onComplete: (id: number) => void; onFocus: (id?: number) => void; onOpenTask: (id: number) => void; onCapture: () => void; onGo: (view: View) => void; onNewTask: () => void; onTaskMenu: (id: number) => void; events: CalendarEvent[]; onOpenProject: (name: string) => void; weeklyPlan: WeeklyPlan; setWeeklyPlan: (plan: WeeklyPlan) => void }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(tick);
  }, []);
  const activeTasks = tasks.filter(task => !task.done && !task.canceled);
  const readyPriorities = activeTasks.slice(0, 3).length;
  const nextTask = activeTasks.find(task => true);
  const todayKey = toDateKey(now);
  const todayEvents = events.filter(event => event.start.slice(0, 10) === todayKey).sort((a, b) => a.start.localeCompare(b.start));
  const todayTasksDue = activeTasks.filter(task => task.due === toDateKey(new Date()) && !activeTasks.slice(0, 3).includes(task));
  const taskSpaceLabel = (task: Task) => classes.find(item => item.id === task.classId)?.code ?? task.project;
  const dashboardSpaces = [
    ...classes.map(item => ({ key: `class-${item.id}`, name: item.code, detail: item.name, kind: "Class", color: item.color, progress: 100, icon: GraduationCap, projectName: null as string | null })),
    ...projects.map(item => ({ key: `project-${item.name}`, name: item.name, detail: item.desc, kind: item.kind === "maintenance" ? "Maintenance" : "Project", color: item.color, progress: item.progress, icon: item.icon, projectName: item.name })),
  ].slice(0, 3);
  return <>
    <section className="welcome">
      <div><p className="eyebrow">{now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p><h1>{getGreeting(now, user?.displayName || "there")}</h1><p>Here’s what deserves your attention today.</p></div>
      <div className="day-score"><span>Today</span>{readyPriorities === 0 && activeTasks.length === 0 ? <><strong>All Done</strong><small style={{ textTransform: "none" }}>for Today</small></> : <><strong>{readyPriorities}<span>/{activeTasks.length}</span></strong><small>priorities ready</small></>}</div>
    </section>
    <div className="dashboard-grid">
      <section className="card priorities">
        <div className="card-head"><div><span className="section-icon violet"><Zap size={14} /></span><h2>Today’s priorities</h2></div><button onClick={() => onGo("Tasks")}>Plan day <ArrowRight size={14} /></button></div>
        <div className="task-list">{activeTasks.length ? activeTasks.slice(0, 3).map((task, i) => <div className={`task-row`} key={task.id}><button className="check" onClick={() => onComplete(task.id)}><span>{i + 1}</span></button><button className="task-open" onClick={() => onOpenTask(task.id)}><strong>{task.title}</strong><p><i style={{ background: task.color }} />{taskSpaceLabel(task)} <span>·</span> {formatDueDate(task.due)} <span>·</span> {task.focusMinutes} min <span>·</span> {task.energy} energy</p></button><button className="quick-focus" aria-label={`Focus on ${task.title}`} title="Focus on this task" onClick={() => onFocus(task.id)}><Focus size={15} /></button><button className="more" aria-label={`Actions for ${task.title}`} onClick={() => onTaskMenu(task.id)}><MoreHorizontal size={17} /></button></div>) : <div className="priority-empty"><strong>No priorities right now.</strong><p>Clean slate. Add one when your brain hands you the next thing.</p></div>}</div>
        {todayTasksDue.length > 0 && <><div style={{ borderTop: "1px solid var(--line)", margin: "8px 0", paddingTop: "12px" }}><p style={{ fontSize: "9px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".08em", margin: "0 0 8px 0", fontWeight: 700, paddingLeft: "15px" }}>Today’s other tasks</p><div className="task-list" style={{ margin: 0 }}>{todayTasksDue.slice(0, 2).map(task => <div className={`task-row ${task.done ? "done" : ""} ${task.canceled ? "canceled" : ""}`} key={task.id} style={{ opacity: .7, fontSize: "13px" }}><button className="check" disabled={task.canceled} onClick={() => onComplete(task.id)}>{task.done ? <Check size={12} /> : task.canceled ? <X size={11} /> : <span style={{ fontSize: "10px" }}>•</span>}</button><button className="task-open" onClick={() => onOpenTask(task.id)}><strong>{task.title}</strong><p><i style={{ background: task.color }} />{taskSpaceLabel(task)} <span>·</span> {task.canceled ? "Canceled" : formatDueDate(task.due)} <span>·</span> {task.energy} energy</p></button><button className="more" aria-label={`Actions for ${task.title}`} onClick={() => onTaskMenu(task.id)}><MoreHorizontal size={15} /></button></div>)}</div>{todayTasksDue.length > 2 && <div style={{ padding: "4px 15px", fontSize: "9px", color: "var(--muted)" }}>+{todayTasksDue.length - 2} more</div>}</div></>}
        <button className="add-row" onClick={onNewTask}><Plus size={15} /> Add priority</button>
      </section>
      <section className="focus-card">
        <div className="focus-glow" />
        <div className="card-head"><div><span className="section-icon dark-icon"><Focus size={14} /></span><h2>Next focus</h2></div><span className="ready"><i /> {nextTask ? "Ready" : "Clear"}</span></div>
        <div className="focus-content"><p>{nextTask ? taskSpaceLabel(nextTask) : "You're all caught up"}</p><h3>{nextTask?.title ?? "What should we work on next?"}</h3><div className="focus-meta">{nextTask && <><span><Clock3 size={14} /> {nextTask.focusMinutes} min</span><span><Flame size={14} /> {nextTask.energy} energy</span></>}</div></div>
        <button className="start-focus" onClick={() => nextTask ? onFocus(nextTask.id) : onNewTask()}><Focus size={16} /> {nextTask ? "Start focus session" : "Add priority"} <span>{nextTask ? "F" : "N"}</span></button>
      </section>
      <section className="card schedule">
        <div className="card-head"><div><span className="section-icon blue"><CalendarDays size={14} /></span><h2>Today’s schedule</h2></div><button onClick={() => onGo("Calendar")}>View calendar</button></div>
        {todayEvents.length ? todayEvents.map((event, i) => {
          const start = new Date(event.start);
          const end = event.end ? new Date(event.end) : new Date(start.getTime() + 45 * 60_000);
          const startTime = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
          const endTime = `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
          return <div className="event" key={event.id}><div><strong>{startTime}</strong><span>{endTime}</span></div><i className={`event-line e${i % 3}`} style={{ background: event.color }} /><div><strong>{event.title}</strong><span>{event.notes || (event.source === "LifeOS" ? "Focus block" : event.source)}</span></div></div>;
        }) : <div style={{ padding: "20px 18px", textAlign: "center", color: "var(--muted)", fontSize: "12px" }}><p>No events scheduled for today</p></div>}
      </section>
      <DashboardGmailCard user={user} onSettings={() => onGo("Settings")} />
      <section className="card projects-card">
        <div className="card-head"><div><span className="section-icon orange"><LayoutGrid size={14} /></span><h2>Active spaces</h2></div><button onClick={() => onGo("Spaces")}>All spaces <ArrowRight size={14} /></button></div>
        {dashboardSpaces.map(space => <div className="project-row" key={space.key} onClick={() => space.projectName ? onOpenProject(space.projectName) : onGo("Spaces")} style={{ cursor: "pointer" }}><div className="project-glyph" style={{ color: space.color, background: `${space.color}16` }}><space.icon size={17} /></div><div><strong>{space.name}</strong><small className="project-kind">{space.kind}</small><div className="progress"><i style={{ width: `${space.progress}%`, background: space.color }} /></div></div><span>{space.kind === "Maintenance" ? "∞" : space.kind === "Class" ? "↗" : `${space.progress}%`}</span></div>)}
      </section>
      <section className="card inbox-card">
        <div className="card-head"><div><span className="section-icon green"><Brain size={14} /></span><h2>Brain inbox</h2></div><span className="count">{brainCount} uncategorized</span></div>
        <button className="capture-zone" onClick={onCapture}><Plus size={18} /><div><strong>Capture what’s on your mind</strong><span>Idea, thought, link, anything…</span></div><kbd>Fn B</kbd></button>
      </section>
    </div>
    <p className="quote">“The main thing is to keep the main thing the main thing.” <span>— Stephen Covey</span></p>
  </>;
}

function Projects({ projects, tasks, onNew, onAction, onOpen }: { projects: Project[]; tasks: Task[]; onNew: () => void; onAction: (name: string) => void; onOpen: (name: string) => void }) {
  const maintenance = projects.filter(project => project.kind === "maintenance").length;
  const finishable = projects.length - maintenance;
  return <><div className="page-title"><div><p className="eyebrow">Your worlds</p><h1>Projects</h1><p>Some things are gardens. Some things are missions. Label them correctly.</p></div><button className="primary" onClick={onNew}><Plus size={16} /> New project</button></div><div className="project-type-summary"><span><Sparkles size={14} /> {maintenance} maintenance systems</span><span><CheckCircle2 size={14} /> {finishable} finishable projects</span></div><div className="projects-grid">{projects.map((p, i) => {
    const projectTasks = tasks.filter(task => task.project === p.name);
    const activeTasks = projectTasks.filter(task => !task.done && !task.canceled);
    const completedTasks = projectTasks.filter(task => task.done && !task.canceled).length;
    const totalTasks = projectTasks.length;
    const calculatedProgress = p.kind === "maintenance" ? 100 : totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const topTask = [...activeTasks].sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority])[0];
    const nextDue = [...activeTasks].sort((a, b) => dueRank(a.due) - dueRank(b.due))[0];
    const nextDueCountdown = nextDue ? getCountdownText(nextDue.due) : null;
    return <motion.article role="button" tabIndex={0} className={`project-card ${p.kind}`} key={p.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .04 }} onClick={() => onOpen(p.name)} onKeyDown={event => { if (event.key === "Enter") onOpen(p.name); }}><div className="project-top"><div className="big-glyph" style={{ color: p.color, background: `${p.color}16` }}><p.icon size={22} /></div><button aria-label={`Actions for ${p.name}`} onClick={(event) => { event.stopPropagation(); onAction(p.name); }}><MoreHorizontal size={18} /></button></div><div className="project-title-line"><h3>{p.name}</h3><span className={`project-kind ${p.kind}`}>{p.kind === "maintenance" ? "Maintenance" : "Finishable"}</span></div><p>{p.desc}</p><div className="project-intel"><div><span>Next due</span><strong style={{ color: nextDueCountdown ? getUrgencyColor(nextDueCountdown.urgency) : undefined }}>{nextDueCountdown ? nextDueCountdown.text : "Nothing due"}</strong></div><div><span>Priority</span><strong>{topTask?.priority ?? "Clear"}</strong></div></div><div className="project-task-preview">{activeTasks.slice(0, 2).map(task => <div key={task.id}><i style={{ background: task.color }} /><span>{task.title}</span><em className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</em></div>)}{!activeTasks.length && <div><i style={{ background: p.color }} /><span>No open tasks linked yet</span><em>Clear</em></div>}</div><div className="project-stats"><span>{activeTasks.length} open task{activeTasks.length !== 1 ? "s" : ""}</span><strong>{p.kind === "maintenance" ? "Ongoing" : `${calculatedProgress}%`}</strong></div><div className="progress large"><i style={{ width: `${p.kind === "maintenance" ? 100 : calculatedProgress}%`, background: p.color }} /></div></motion.article>;
  })}</div></>;
}

function SpacesView({ projects, classes, tasks, notes, resources, selectedProjectName, selectedClassId, onBack, onNew, onActionProject, onActionClass, onOpenProject, onOpenClass, onNewAcademicItem, onNewNote, onOpenTask, onOpenNote, onEditClass, onDeleteClass, onUploadResource, onDeleteResource, onReplaceResource, onDownloadResource, linkTask, initialFilter = "All", onFilterChange }: { projects: Project[]; classes: ClassRecord[]; tasks: Task[]; notes: Note[]; resources: Resource[]; selectedProjectName: string | null; selectedClassId: string | null; onBack: () => void; onNew: () => void; onActionProject: (name: string) => void; onActionClass: (id: string) => void; onOpenProject: (name: string) => void; onOpenClass: (id: string) => void; onNewAcademicItem: (id: string) => void; onNewNote: (classId?: string, projectName?: string) => void; onOpenTask: (id: number) => void; onOpenNote: (id: string) => void; onEditClass: (id: string) => void; onDeleteClass: (id: string) => void; onUploadResource: (file: File, classId?: string) => Promise<void>; onDeleteResource: (resource: Resource) => Promise<void>; onReplaceResource: (resource: Resource, file: File) => Promise<void>; onDownloadResource: (resource: Resource) => Promise<void>; linkTask: (id: number, project: Project) => void; initialFilter?: "All" | "Classes" | "Projects" | "Maintenance" | "Archived"; onFilterChange?: (filter: "All" | "Classes" | "Projects" | "Maintenance" | "Archived") => void }) {
  const [filter, setFilter] = useState<"All" | "Classes" | "Projects" | "Maintenance" | "Archived">(initialFilter);
  const [semester, setSemester] = useState("All semesters");
  const [sortBy, setSortBy] = useState<"due" | "priority" | "open" | "name">("due");
  const selectedClass = classes.find(item => item.id === selectedClassId);
  const selectedProject = projects.find(item => item.name === selectedProjectName);

  if (selectedClass) {
    return <ClassesView classes={classes} tasks={tasks} notes={notes} resources={resources} selectedClassId={selectedClass.id} onSelectClass={() => onBack()} onNewClass={onNew} onNewAcademicItem={onNewAcademicItem} onNewNote={classId => onNewNote(classId)} onOpenTask={onOpenTask} onOpenNote={onOpenNote} onEditClass={onEditClass} onDeleteClass={onDeleteClass} onUploadResource={onUploadResource} onDeleteResource={onDeleteResource} onReplaceResource={onReplaceResource} onDownloadResource={onDownloadResource} />;
  }

  if (selectedProject) {
    const linkedTasks = tasks.filter(task => task.project === selectedProject.name);
    const activeTasks = linkedTasks.filter(task => !task.done && !task.canceled);
    const completedTasks = linkedTasks.filter(task => task.done || task.canceled);
    const availableTasks = tasks.filter(task => task.project !== selectedProject.name && !task.done && !task.canceled);
    const projectNotes = notes.filter(note => note.projectName === selectedProject.name);
    const topTask = [...activeTasks].sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority])[0];
    const nextDue = [...activeTasks].sort((a, b) => dueRank(a.due) - dueRank(b.due))[0];
    return <section className="space-detail-view" style={{ "--space-color": selectedProject.color } as React.CSSProperties}>
      <button className="class-back" onClick={onBack}><ArrowRight size={14} /> All spaces</button>
      <div className="space-detail-hero">
        <div className="space-hero-icon"><selectedProject.icon size={25} /></div>
        <div><p className="eyebrow">{selectedProject.kind === "maintenance" ? "Maintenance · ongoing" : "Project · finishable"}</p><h1>{selectedProject.name}</h1><p>{selectedProject.desc}</p></div>
        <div className="class-hero-actions"><button onClick={() => onNewNote(undefined, selectedProject.name)}><NotebookPen size={15} /> New note</button><button className="primary" onClick={() => onActionProject(selectedProject.name)}><SlidersHorizontal size={15} /> Space settings</button></div>
      </div>
      <div className="class-meta-strip">
        <div><span>Next due</span><strong>{nextDue ? formatDueDate(nextDue.due) : "Nothing due"}</strong></div>
        <div><span>Highest priority</span><strong>{topTask?.priority ?? "Clear"}</strong></div>
        <div><span>Energy load</span><strong>{topTask ? `${topTask.energy} · ${topTask.focusMinutes}m` : "Clear"}</strong></div>
        <div><span>Open work</span><strong>{activeTasks.length}</strong></div>
      </div>
      <div className="class-content-grid">
        <section className="card class-coursework">
          <div className="class-section-title"><div><h2>Tasks</h2><p>Everything actively moving inside this space.</p></div></div>
          {activeTasks.length ? <div className="coursework-list">{activeTasks.map(task => <button key={task.id} onClick={() => onOpenTask(task.id)}><span className="coursework-type" style={{ color: selectedProject.color, background: `${selectedProject.color}14` }}>Task</span><span className="coursework-name"><strong>{task.title}</strong><small>{formatDueDate(task.due)} · {task.focusMinutes}m · {task.energy}</small></span><em className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</em><ArrowRight size={14} /></button>)}</div> : <div className="class-empty"><CheckCircle2 size={22} /><strong>No active tasks.</strong><span>Link an existing task below when this space needs attention.</span></div>}
          {completedTasks.length > 0 && <details className="completed-coursework"><summary>{completedTasks.length} completed / canceled</summary><div>{completedTasks.map(task => <button key={task.id} onClick={() => onOpenTask(task.id)}><CheckCircle2 size={14} /><span>{task.title}</span><small>{task.canceled ? "Canceled" : "Done"}</small></button>)}</div></details>}
        </section>
        <section className="card class-notes-card">
          <div className="class-section-title"><div><h2>Notes</h2><p>Context, decisions, research, and loose thinking.</p></div><button onClick={() => onNewNote(undefined, selectedProject.name)}><Plus size={14} /></button></div>
          {projectNotes.length ? <div className="class-note-list">{projectNotes.map(note => <button key={note.id} onClick={() => onOpenNote(note.id)}><NotebookPen size={15} /><span><strong>{note.title || "Untitled note"}</strong><small>{new Date(note.updatedAt).toLocaleDateString()}</small></span><ArrowRight size={13} /></button>)}</div> : <div className="class-empty compact"><NotebookPen size={21} /><strong>No notes yet.</strong><button onClick={() => onNewNote(undefined, selectedProject.name)}>Start a space note</button></div>}
        </section>
      </div>
      {availableTasks.length > 0 && <section className="card space-link-panel"><div className="class-section-title"><div><h2>Link existing tasks</h2><p>Move loose work into {selectedProject.name}.</p></div></div><div className="space-link-list">{availableTasks.slice(0, 8).map(task => <button key={task.id} onClick={() => linkTask(task.id, selectedProject)}><span><strong>{task.title}</strong><small>{task.project} · {formatDueDate(task.due)}</small></span><Plus size={15} /></button>)}</div></section>}
    </section>;
  }

  const semesterOptions = [...new Set(classes.map(item => item.term.trim()).filter(Boolean))].sort((a, b) => b.localeCompare(a));
  const classesForView = classes.filter(item => {
    const archived = isClassArchived(item);
    if (filter === "Archived") return archived;
    if (archived) return false;
    return semester === "All semesters" || item.term === semester;
  });
  const spaces = [
    ...classesForView.map(item => ({ id: `class:${item.id}`, kind: "class" as SpaceKind, title: item.code, description: item.name, meta: item.term || "Current term", color: item.color, icon: GraduationCap, open: tasks.filter(task => task.classId === item.id && !task.done && !task.canceled).length, nextDue: [...tasks.filter(task => task.classId === item.id && !task.done && !task.canceled)].sort((a, b) => dueRank(a.due) - dueRank(b.due))[0], classId: item.id, projectName: null as string | null, archived: isClassArchived(item) })),
    ...projects.map(item => ({ id: `project:${item.name}`, kind: (item.kind === "maintenance" ? "maintenance" : "project") as SpaceKind, title: item.name, description: item.desc, meta: item.kind === "maintenance" ? "Ongoing system" : "Finishable project", color: item.color, icon: item.icon, open: tasks.filter(task => task.project === item.name && !task.done && !task.canceled).length, nextDue: [...tasks.filter(task => task.project === item.name && !task.done && !task.canceled)].sort((a, b) => dueRank(a.due) - dueRank(b.due))[0], classId: null as string | null, projectName: item.name, archived: false })),
  ];
  const visibleSpaces = spaces.filter(space => filter === "All" || (filter === "Classes" && space.kind === "class") || (filter === "Projects" && (space.kind === "project" || space.kind === "maintenance")) || (filter === "Maintenance" && space.kind === "maintenance") || (filter === "Archived" && space.kind === "class" && space.archived));
  const highestPriorityRank = (space: typeof spaces[number]) => {
    const linkedTasks = tasks.filter(task => !task.done && !task.canceled && (space.classId ? task.classId === space.classId : task.project === space.projectName));
    return linkedTasks.length ? Math.min(...linkedTasks.map(task => priorityRank[task.priority])) : Number.MAX_SAFE_INTEGER;
  };
  const sortedSpaces = [...visibleSpaces].sort((left, right) => {
    if (sortBy === "name") return left.title.localeCompare(right.title);
    if (sortBy === "open") return right.open - left.open || left.title.localeCompare(right.title);
    if (sortBy === "priority") return highestPriorityRank(left) - highestPriorityRank(right) || dueRank(left.nextDue?.due ?? "") - dueRank(right.nextDue?.due ?? "") || left.title.localeCompare(right.title);
    return dueRank(left.nextDue?.due ?? "") - dueRank(right.nextDue?.due ?? "") || highestPriorityRank(left) - highestPriorityRank(right) || left.title.localeCompare(right.title);
  });
  const counts = { Classes: classes.filter(item => !isClassArchived(item)).length, Projects: projects.length, Maintenance: projects.filter(item => item.kind === "maintenance").length, Archived: classes.filter(item => isClassArchived(item)).length };

  return <>
    <div className="page-title"><div><p className="eyebrow">Everything has one home</p><h1>Spaces</h1><p>Classes, finishable projects, and ongoing areas—together, without the taxonomy headache.</p></div><button className="primary" onClick={onNew}><Plus size={16} /> New space</button></div>
    <div className="spaces-filter" role="tablist" aria-label="Filter spaces">{(["All", "Classes", "Projects", "Maintenance", "Archived"] as const).map(value => <button key={value} role="tab" aria-selected={filter === value} className={filter === value ? "selected" : ""} onClick={() => { setFilter(value); onFilterChange?.(value); }}>{value}<span>{value === "All" ? spaces.length : counts[value]}</span></button>)}</div>
    <div className="spaces-toolbar">
      {(filter === "Classes" || filter === "Archived") && semesterOptions.length > 0 && <label className="semester-sort"><span>Semester</span><select value={semester} onChange={event => setSemester(event.target.value)}><option>All semesters</option>{semesterOptions.map(value => <option key={value}>{value}</option>)}</select></label>}
      <label className="semester-sort space-sort"><span>Sort by</span><select value={sortBy} onChange={event => setSortBy(event.target.value as "due" | "priority" | "open" | "name")} aria-label="Sort spaces"><option value="due">Due soon</option><option value="priority">Highest priority</option><option value="open">Most open work</option><option value="name">A–Z</option></select></label>
    </div>
    {sortedSpaces.length ? <div className="spaces-grid">{sortedSpaces.map((space, index) => <motion.article role="button" tabIndex={0} className={`space-card ${space.kind}`} key={space.id} style={{ "--space-color": space.color } as React.CSSProperties} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .035 }} onClick={() => space.classId ? onOpenClass(space.classId) : onOpenProject(space.projectName!)} onKeyDown={event => { if (event.key === "Enter") space.classId ? onOpenClass(space.classId) : onOpenProject(space.projectName!); }}>
      <div className="space-card-top"><span className="space-card-icon"><space.icon size={21} /></span><button aria-label={`Actions for ${space.title}`} onClick={event => { event.stopPropagation(); if (space.classId) onActionClass(space.classId); else onActionProject(space.projectName!); }}><MoreHorizontal size={18} /></button></div>
      <span className="space-type">{space.archived ? "Archived class" : space.kind === "class" ? "Class" : space.kind === "maintenance" ? "Maintenance" : "Project"}</span><h2>{space.title}</h2><p>{space.description}</p>
      <div className="space-card-footer"><span>{space.open} open</span><strong>{space.nextDue ? `Next: ${formatDueDate(space.nextDue.due)}` : "Nothing due"}</strong></div><div className="space-card-line"><i /></div>
    </motion.article>)}</div> : <div className="classes-empty"><div><LayoutGrid size={28} /></div><h2>No {filter.toLowerCase()} yet.</h2><p>Create the space your brain is looking for.</p><button className="primary" onClick={onNew}><Plus size={15} /> New space</button></div>}
  </>;
}

function SpaceModal({ initialKind, close, addProject, addClass }: { initialKind: SpaceKind; close: () => void; addProject: (name: string, kind: ProjectKind, description: string, color: string, icon: ProjectIcon) => void; addClass: (value: Omit<ClassRecord, "id">) => void }) {
  const [kind, setKind] = useState<SpaceKind>(initialKind);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  const [term, setTerm] = useState("");
  const [instructor, setInstructor] = useState("");
  const [location, setLocation] = useState("");
  const [credits, setCredits] = useState("3");
  const [semesterEnd, setSemesterEnd] = useState("");
  const [color, setColor] = useState("#625af6");
  const [icon, setIcon] = useState<ProjectIcon>("FolderKanban");
  const iconOptions: { value: ProjectIcon; label: string; icon: typeof Home }[] = [
    { value: "FolderKanban", label: "Project", icon: FolderKanban }, { value: "BriefcaseBusiness", label: "Career", icon: BriefcaseBusiness },
    { value: "Code2", label: "Build", icon: Code2 }, { value: "Camera", label: "Photography", icon: Camera },
    { value: "Utensils", label: "Food", icon: Utensils }, { value: "HeartPulse", label: "Health", icon: HeartPulse },
    { value: "BookOpen", label: "Learning", icon: BookOpen }, { value: "Sparkles", label: "Creative", icon: Sparkles },
    { value: "Zap", label: "Momentum", icon: Zap }, { value: "Aperture", label: "Visual", icon: Aperture },
    { value: "FileText", label: "Writing", icon: FileText }, { value: "UserRound", label: "Personal", icon: UserRound },
  ];
  const valid = kind === "class" ? Boolean(code.trim() && name.trim()) : Boolean(name.trim());
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    if (kind === "class") {
      addClass({ code: code.trim().toUpperCase(), name: name.trim(), term: term.trim(), instructor: instructor.trim(), location: location.trim(), credits: Number(credits) || undefined, semesterEnd: semesterEnd || undefined, color });
      return;
    }
    addProject(name.trim(), kind === "maintenance" ? "maintenance" : "finishable", description.trim(), color, icon);
  };
  return <motion.div className="modal-layer space-modal-layer" onMouseDown={close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.form className="create-modal space-modal" onMouseDown={event => event.stopPropagation()} onSubmit={submit} initial={{ scale: .98, y: 8 }} animate={{ scale: 1, y: 0 }}>
    <div className="capture-head"><div className="brain-dot"><LayoutGrid size={16} /></div><div><strong>{kind === "class" ? "Create a class" : "Create a space"}</strong><span>{kind === "class" ? "Add the course that holds your schoolwork." : "Pick the shape. You can change your mind later."}</span></div><button type="button" onClick={close} aria-label="Close"><X size={18} /></button></div>
    <div className="space-modal-body">
      <div className="space-kind-picker">{([{ value: "project", label: "Project", hint: "Has a finish line", icon: CheckCircle2 }, { value: "maintenance", label: "Maintenance", hint: "Keeps going", icon: Sparkles }, { value: "class", label: "Class", hint: "Coursework + notes", icon: GraduationCap }] as const).map(option => <button type="button" key={option.value} className={kind === option.value ? "selected" : ""} onClick={() => setKind(option.value)}><option.icon size={18} /><span><strong>{option.label}</strong><small>{option.hint}</small></span></button>)}</div>
      {kind === "class" ? <div className="class-form-grid"><label>Course code<input autoFocus value={code} onChange={event => setCode(event.target.value)} placeholder="BIO 101" /></label><label>Class name<input value={name} onChange={event => setName(event.target.value)} placeholder="General Biology" /></label><label>Semester<input value={term} onChange={event => setTerm(event.target.value)} placeholder="Fall 2026" /></label><label>Semester ends<input type="date" value={semesterEnd} onChange={event => setSemesterEnd(event.target.value)} /></label><small className="class-form-hint">LifeOS archives this class after this date.</small><label>Instructor<input value={instructor} onChange={event => setInstructor(event.target.value)} placeholder="Dr. Rivera" /></label><label>Location<input value={location} onChange={event => setLocation(event.target.value)} placeholder="Science 204 / Zoom" /></label><label>Credits<input type="number" min={0} max={12} value={credits} onChange={event => setCredits(event.target.value)} /></label></div> : <><label htmlFor="space-name">Space name</label><input id="space-name" autoFocus value={name} onChange={event => setName(event.target.value)} placeholder={kind === "maintenance" ? "Health, Photography, Finances…" : "Portfolio launch, Move apartments…"} /><label htmlFor="space-description">Description</label><textarea id="space-description" value={description} onChange={event => setDescription(event.target.value)} placeholder="What belongs here?" /><label>Icon</label><div className="project-icon-picker" role="group" aria-label="Choose a project icon">{iconOptions.map(option => <button key={option.value} type="button" className={icon === option.value ? "selected" : ""} aria-label={`Use ${option.label} icon`} aria-pressed={icon === option.value} title={option.label} onClick={() => setIcon(option.value)}><option.icon size={18} /><span>{option.label}</span></button>)}</div></>}
      <label>Color</label><div className="calendar-color-picker">{["#625af6", "#4b8bdc", "#47a47b", "#d99b38", "#e48b6b", "#cf625a"].map(option => <button type="button" aria-label={`Use ${option}`} key={option} className={color === option ? "selected" : ""} style={{ background: option }} onClick={() => setColor(option)} />)}</div>
    </div>
    <div className="create-actions"><button type="button" onClick={close}>Cancel</button><button className="primary" type="submit" disabled={!valid}>Create {kind === "class" ? "class" : "space"}</button></div>
  </motion.form></motion.div>;
}

function Tasks({ tasks, classes, onComplete, onNew, onTaskMenu, onOpenTask }: { tasks: Task[]; classes: ClassRecord[]; onComplete: (id: number) => void; onNew: () => void; onTaskMenu: (id: number) => void; onOpenTask: (id: number) => void }) {
  return <><div className="page-title"><div><p className="eyebrow">Make it happen</p><h1>Tasks</h1><p>A clear list of what needs your attention.</p></div><button className="primary" onClick={onNew}><Plus size={16} /> New task</button></div><section className="card task-table"><div className="table-view-label">List view</div><div className="table-head"><span>Task</span><span>Space</span><span>Due</span><span>Priority</span><span>Focus</span></div>{tasks.map(t => <div className={`table-row ${t.done ? "done" : ""} ${t.canceled ? "canceled" : ""}`} key={t.id}><button className="round-check" disabled={t.canceled} onClick={() => onComplete(t.id)}>{t.done ? <Check size={13} /> : t.canceled ? <X size={12} /> : null}</button><button className="task-title-link" onClick={() => onOpenTask(t.id)}>{t.title}</button><span className="project-pill"><i style={{ background: t.color }} />{classes.find(item => item.id === t.classId)?.code ?? t.project}</span><span>{t.canceled ? "Canceled" : formatDueDate(t.due)}</span><span className={`priority ${t.priority.toLowerCase()}`}>{t.priority}</span><span>{t.focusMinutes}m · {t.energy}</span><button aria-label={`Actions for ${t.title}`} onClick={() => onTaskMenu(t.id)}><MoreHorizontal size={17} /></button></div>)}</section></>;
}

function ClassesView({ classes, tasks, notes, resources, selectedClassId, onSelectClass, onNewClass, onNewAcademicItem, onNewNote, onOpenTask, onOpenNote, onEditClass, onDeleteClass, onUploadResource, onDeleteResource, onReplaceResource, onDownloadResource }: { classes: ClassRecord[]; tasks: Task[]; notes: Note[]; resources: Resource[]; selectedClassId: string | null; onSelectClass: (id: string | null) => void; onNewClass: () => void; onNewAcademicItem: (id: string) => void; onNewNote: (classId?: string) => void; onOpenTask: (id: number) => void; onOpenNote: (id: string) => void; onEditClass: (id: string) => void; onDeleteClass: (id: string) => void; onUploadResource: (file: File, classId?: string) => Promise<void>; onDeleteResource: (resource: Resource) => Promise<void>; onReplaceResource: (resource: Resource, file: File) => Promise<void>; onDownloadResource: (resource: Resource) => Promise<void> }) {
  const selected = classes.find(item => item.id === selectedClassId);
  if (selected) {
    const classTasks = tasks.filter(task => task.classId === selected.id);
    const active = classTasks.filter(task => !task.done && !task.canceled).sort((a, b) => dueRank(a.due) - dueRank(b.due));
    const completed = classTasks.filter(task => task.done || task.canceled);
    const classNotes = notes.filter(note => note.classId === selected.id);
    const classResources = resources.filter(resource => resource.classId === selected.id);
    return <section className="class-detail-view">
      <button className="class-back" onClick={() => onSelectClass(null)}><ArrowRight size={14} /> All spaces</button>
      <div className="class-detail-hero" style={{ "--class-color": selected.color } as React.CSSProperties}>
        <div className="class-hero-icon"><GraduationCap size={25} /></div>
        <div><p className="eyebrow">{selected.term || "Current term"}</p><h1>{selected.code}</h1><p>{selected.name}</p></div>
        <div className="class-hero-actions"><button onClick={() => onEditClass(selected.id)}><Pencil size={15} /> Edit class</button><button onClick={() => onNewNote(selected.id)}><NotebookPen size={15} /> New note</button><button className="primary" onClick={() => onNewAcademicItem(selected.id)}><Plus size={15} /> Add coursework</button></div>
      </div>
      <div className="class-meta-strip">
        <div><span>Instructor</span><strong>{selected.instructor || "Not added"}</strong></div>
        <div><span>Location</span><strong>{selected.location || "Not added"}</strong></div>
        <div><span>Credits</span><strong>{selected.credits ? `${selected.credits} credits` : "Not added"}</strong></div>
        <div><span>Open work</span><strong>{active.length}</strong></div>
      </div>
      <div className="class-content-grid">
        <section className="card class-coursework">
          <div className="class-section-title"><div><h2>Upcoming coursework</h2><p>Assignments, exams, labs, and everything between.</p></div><button onClick={() => onNewAcademicItem(selected.id)}><Plus size={14} /> Add</button></div>
          {active.length ? <div className="coursework-list">{active.map(task => <button key={task.id} onClick={() => onOpenTask(task.id)}><span className="coursework-type" style={{ color: selected.color, background: `${selected.color}14` }}>{task.academicType ?? "Task"}</span><span className="coursework-name"><strong>{task.title}</strong><small>{formatDueDate(task.due)}{task.gradeWeight !== undefined ? ` · ${task.gradeWeight}% of grade` : ""}{task.pointsPossible !== undefined ? ` · ${task.pointsEarned !== undefined ? `${task.pointsEarned}/${task.pointsPossible}` : task.pointsPossible} pts` : ""}</small></span><em className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</em><ArrowRight size={14} /></button>)}</div> : <div className="class-empty"><CheckCircle2 size={22} /><strong>Nothing due right now.</strong><span>Add the next assignment when it lands.</span></div>}
          {completed.length > 0 && <details className="completed-coursework"><summary>{completed.length} completed / canceled</summary><div>{completed.map(task => <button key={task.id} onClick={() => onOpenTask(task.id)}><CheckCircle2 size={14} /><span>{task.title}</span><small>{task.canceled ? "Canceled" : "Done"}</small></button>)}</div></details>}
        </section>
        <section className="card class-notes-card">
          <div className="class-section-title"><div><h2>Class notes</h2><p>Lecture notes and study material.</p></div><button onClick={() => onNewNote(selected.id)}><Plus size={14} /></button></div>
          {classNotes.length ? <div className="class-note-list">{classNotes.map(note => <button key={note.id} onClick={() => onOpenNote(note.id)}><NotebookPen size={15} /><span><strong>{note.title || "Untitled note"}</strong><small>{new Date(note.updatedAt).toLocaleDateString()}</small></span><ArrowRight size={13} /></button>)}</div> : <div className="class-empty compact"><NotebookPen size={21} /><strong>No notes yet.</strong><button onClick={() => onNewNote(selected.id)}>Start a class note</button></div>}
        </section>
        <ClassResourcesCard classRecord={selected} resources={classResources} onUpload={onUploadResource} onDelete={onDeleteResource} onReplace={onReplaceResource} onDownload={onDownloadResource} />
      </div>
      <button className="delete-class-button" onClick={() => onDeleteClass(selected.id)}><Trash2 size={14} /> Delete class space</button>
    </section>;
  }

  return <><div className="page-title"><div><p className="eyebrow">Your semester, under control</p><h1>Classes</h1><p>Course folders for assignments, exams, projects, and notes.</p></div><button className="primary" onClick={onNewClass}><Plus size={16} /> New class</button></div>{classes.length ? <div className="classes-grid">{classes.map((item, index) => {
    const classTasks = tasks.filter(task => task.classId === item.id);
    const active = classTasks.filter(task => !task.done && !task.canceled);
    const nextDue = [...active].sort((a, b) => dueRank(a.due) - dueRank(b.due))[0];
    return <motion.button className="class-card" key={item.id} onClick={() => onSelectClass(item.id)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .04 }} style={{ "--class-color": item.color } as React.CSSProperties}><span className="class-card-icon"><GraduationCap size={21} /></span><span className="class-card-term">{item.term || "Current term"}</span><strong>{item.code}</strong><em>{item.name}</em><span className="class-card-stats"><span>{active.length} open</span><span>{nextDue ? `Next: ${formatDueDate(nextDue.due)}` : "Nothing due"}</span></span><span className="class-card-line"><i /></span></motion.button>;
  })}</div> : <div className="classes-empty"><div><GraduationCap size={28} /></div><h2>Create your first class.</h2><p>Try BIO 101, CHEM 202, or whatever is actually on your schedule.</p><button className="primary" onClick={onNewClass}><Plus size={15} /> Create a class</button></div>}</>;
}

function formatResourceSize(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${Math.round((bytes / Math.pow(1024, unit)) * 10) / 10} ${units[unit]}`;
}

function ClassResourcesCard({ classRecord, resources, onUpload, onDelete, onReplace, onDownload }: { classRecord: ClassRecord; resources: Resource[]; onUpload: (file: File, classId?: string) => Promise<void>; onDelete: (resource: Resource) => Promise<void>; onReplace: (resource: Resource, file: File) => Promise<void>; onDownload: (resource: Resource) => Promise<void> }) {
  const [busy, setBusy] = useState<string | null>(null);
  const chooseFile = (resource?: Resource) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.md,.pages,.key,.numbers,image/*,audio/*,video/*";
    input.onchange = async event => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const operation = resource?.id ?? "upload";
      setBusy(operation);
      try {
        if (resource) await onReplace(resource, file);
        else await onUpload(file, classRecord.id);
      } catch {
        // The parent already shows a useful toast. Swallow the rejected promise
        // here so the picker always returns to an interactive state.
      } finally {
        setBusy(null);
      }
    };
    input.click();
  };
  const remove = async (resource: Resource) => {
    if (!window.confirm(`Delete ${resource.name}? This removes the file permanently.`)) return;
    setBusy(resource.id);
    try {
      await onDelete(resource);
    } finally {
      setBusy(null);
    }
  };
  return <section className="card class-resources-card">
    <div className="class-section-title"><div><h2>Class resources</h2><p>Syllabi, slides, readings, study guides, recordings, and reference files.</p></div><button onClick={() => chooseFile()} disabled={busy === "upload"}><Upload size={14} /> {busy === "upload" ? "Uploading…" : "Upload"}</button></div>
    {resources.length ? <div className="class-resource-list">{resources.map(resource => <article key={resource.id}>
      <div className="class-resource-icon"><FileText size={17} /></div>
      <button className="class-resource-name" onClick={() => void onDownload(resource)}><strong>{resource.name}</strong><small>{formatResourceSize(resource.size)} · {new Date(resource.uploadedAt).toLocaleDateString()} · {resource.storage === "local" ? "This device" : "Cloud"}</small></button>
      <div className="class-resource-actions">
        <button onClick={() => void onDownload(resource)} title={`Download ${resource.name}`} aria-label={`Download ${resource.name}`}><Download size={14} /></button>
        <button onClick={() => chooseFile(resource)} disabled={busy === resource.id} title={`Replace ${resource.name}`} aria-label={`Replace ${resource.name}`}><RefreshCw size={14} /></button>
        <button className="danger" onClick={() => void remove(resource)} disabled={busy === resource.id} title={`Delete ${resource.name}`} aria-label={`Delete ${resource.name}`}><Trash2 size={14} /></button>
      </div>
    </article>)}</div> : <div className="class-resource-empty"><Upload size={23} /><strong>No class files yet.</strong><p>Upload your syllabus or the next reading. Files can be up to 25 MB.</p><button onClick={() => chooseFile()}><Plus size={14} /> Upload the first file</button></div>}
  </section>;
}

function NotesView({ notes, classes, projects, selectedNoteId, onSelect, onCreate, onUpdate, onDelete, onImport }: { notes: Note[]; classes: ClassRecord[]; projects: Project[]; selectedNoteId: string | null; onSelect: (id: string | null) => void; onCreate: () => void; onUpdate: (id: string, updates: Partial<Note>) => void; onDelete: (id: string) => void; onImport: (notes: Note[]) => void }) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "title" | "space">("newest");
  const editorRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const filtered = notes.filter(note => `${note.title} ${note.body}`.toLowerCase().includes(search.toLowerCase()));
  const visible = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "newest": return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      case "oldest": return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      case "title": return (a.title || "Untitled").localeCompare(b.title || "Untitled");
      case "space": {
        const getSpace = (n: Note) => classes.find(c => c.id === n.classId)?.code ?? projects.find(p => p.name === n.projectName)?.name ?? "Personal";
        return getSpace(a).localeCompare(getSpace(b));
      }
      default: return 0;
    }
  });
  const selected = notes.find(note => note.id === selectedNoteId) ?? notes[0];
  const selectedSpaceValue = selected?.classId ? `class:${selected.classId}` : selected?.projectName ? `project:${selected.projectName}` : "";
  const changeSpace = (value: string) => {
    if (!selected) return;
    if (value.startsWith("class:")) onUpdate(selected.id, { classId: value.slice(6), projectName: undefined });
    else if (value.startsWith("project:")) onUpdate(selected.id, { classId: undefined, projectName: value.slice(8) });
    else onUpdate(selected.id, { classId: undefined, projectName: undefined });
  };
  const textOnly = (value: string) => value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  const noteHtml = (value: string) => /<\/?[a-z][\s\S]*>/i.test(value) ? value : value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
  const asCornell = (body: string) => {
    const current = noteHtml(body);
    if (current.includes("cornell-entry")) return current;
    return `<div class="cornell-layout" contenteditable="false"><section><strong contenteditable="false">Cues &amp; questions</strong><div class="cornell-entry" contenteditable="true" data-placeholder="Key terms, prompts, questions…"></div></section><section><strong contenteditable="false">Notes</strong><div class="cornell-entry" contenteditable="true" data-placeholder="Capture the main ideas here…">${current}</div></section><footer><strong contenteditable="false">Summary</strong><div class="cornell-entry" contenteditable="true" data-placeholder="What matters most?"></div></footer></div>`;
  };
  const fromCornell = (body: string) => {
    if (!body.includes("cornell-entry")) return body;
    const doc = new DOMParser().parseFromString(body, "text/html");
    const labels = ["Cues &amp; questions", "Notes", "Summary"];
    return Array.from(doc.querySelectorAll<HTMLElement>(".cornell-entry"))
      .map((entry, index) => entry.innerHTML.trim() ? `<h3>${labels[index]}</h3>${entry.innerHTML}` : "")
      .join("");
  };
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !selected) return;
    // Never replace the editor DOM while the user is typing. Replacing it on
    // every saved keystroke resets the browser selection, which is why Enter
    // was jumping back to the top of lined notes.
    if (document.activeElement === editor) return;
    const html = noteHtml(selected.body);
    if (editor.innerHTML !== html) editor.innerHTML = html;
  }, [selected]);
  const command = (name: string, value?: string) => { editorRef.current?.focus(); document.execCommand(name, false, value); if (selected && editorRef.current) onUpdate(selected.id, { body: editorRef.current.innerHTML }); };
  const applyTemplate = (template: NonNullable<Note["template"]>) => {
    if (!selected) return;
    const currentTemplate = selected.template ?? "blank";
    if (template === currentTemplate) return;
    const body = template === "cornell" ? asCornell(selected.body) : currentTemplate === "cornell" ? fromCornell(selected.body) : selected.body;
    onUpdate(selected.id, { template, body });
    if (editorRef.current) editorRef.current.innerHTML = noteHtml(body);
  };
  const exportNotes = () => {
    const payload = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), notes }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url; link.download = `lifeos-notes-${toDateKey(new Date())}.json`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  const importFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        const incoming = Array.isArray(data) ? data : data?.notes;
        if (!Array.isArray(incoming)) throw new Error("Invalid notes file");
        onImport(incoming as Note[]);
      } catch { window.alert("That file is not a valid LifeOS notes export."); }
    };
    reader.readAsText(file);
  };
  const exportNotePdf = () => {
    if (!selected) return;
    const popup = window.open("", "_blank", "width=900,height=1100");
    if (!popup) { window.alert("Allow pop-ups for LifeOS, then try Export PDF again."); return; }
    const title = selected.title.replace(/[<>]/g, "") || "Untitled note";
    const space = classes.find(item => item.id === selected.classId)?.code ?? projects.find(item => item.name === selected.projectName)?.name ?? "Personal note";
    const paperKind = selected.template === "lined" ? "lined" : selected.template === "dotted" ? "dotted" : null;
    const paper = paperKind ? `<div class="paper-art ${paperKind}" aria-hidden="true"><svg viewBox="0 0 1000 2200" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="lifeos-paper-rule" width="1000" height="34" patternUnits="userSpaceOnUse"><line x1="0" y1="33" x2="1000" y2="33" stroke="#dbe7ff" stroke-width="1" /></pattern><pattern id="lifeos-paper-dot" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="12" cy="12" r="1.15" fill="#cbd6e9" /></pattern></defs><rect width="1000" height="2200" fill="url(#lifeos-paper-${paperKind === "lined" ? "rule" : "dot"})" />${paperKind === "lined" ? '<line x1="32" y1="0" x2="32" y2="2200" stroke="#ef9f9c" stroke-width="1.5" />' : ""}</svg></div>` : "";
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>@page{size:letter;margin:0.72in}*{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#1f2430;line-height:1.65;font-size:11pt}header{border-bottom:2px solid #625af6;padding-bottom:18px;margin-bottom:28px}h1{font-family:Georgia,serif;font-size:30pt;line-height:1.1;margin:0 0 10px}.meta{font-size:9pt;color:#687084;text-transform:uppercase;letter-spacing:.08em}.content h2{font-family:Georgia,serif;font-size:20pt;margin:24px 0 8px}.content h3{font-size:13pt;margin:20px 0 6px}.content p{margin:0 0 13px}.content ul{padding-left:24px}.cornell-layout{display:grid;grid-template-columns:34% 66%;border:1px solid #cfd5df;border-radius:8px;overflow:hidden}.cornell-layout section{min-height:420px;padding:18px;border-bottom:1px solid #cfd5df}.cornell-layout section:first-child{border-right:1px solid #cfd5df;background:#f6f5ff}.cornell-layout footer{grid-column:1/-1;padding:18px;background:#f8fafc}.cornell-layout strong{display:block;margin-bottom:8px}.note-paper{position:relative;min-height:620px;padding:8px 16px 12px 52px;overflow:hidden}.paper-art{position:absolute;inset:0;z-index:0}.paper-art svg{display:block;width:100%;height:100%}.note-paper>*:not(.paper-art){position:relative;z-index:1}</style></head><body><header><h1>${title}</h1><div class="meta">${space} · Exported from LifeOS · ${new Date().toLocaleDateString()}</div></header><main class="content ${paperKind ? "note-paper" : ""}">${paper}${noteHtml(selected.body)}</main><script>window.onload=()=>window.print()<\/script></body></html>`);
    popup.document.close();
  };
  return <section className="notes-view">
    <div className="notes-sidebar-panel"><div className="notes-panel-head"><div><p className="eyebrow">Write it down</p><h1>Notes</h1></div><button onClick={onCreate} aria-label="New note"><Plus size={17} /></button></div><div className="notes-transfer"><button onClick={exportNotes}><Download size={13} /> Export</button><button onClick={() => importRef.current?.click()}><Upload size={13} /> Import</button><input ref={importRef} type="file" accept="application/json,.json" onChange={event => { importFile(event.target.files?.[0]); event.currentTarget.value = ""; }} /></div><label className="notes-search"><Search size={14} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Find notes…" /></label><div className="notes-sort"><select value={sortBy} onChange={event => setSortBy(event.target.value as "newest" | "oldest" | "title" | "space")}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="title">A–Z</option><option value="space">By space</option></select></div><div className="notes-list">{visible.map(note => { const linkedClass = classes.find(item => item.id === note.classId); const linkedProject = projects.find(item => item.name === note.projectName); return <button key={note.id} className={selected?.id === note.id ? "active" : ""} onClick={() => onSelect(note.id)}><strong>{note.title || "Untitled note"}</strong><span>{linkedClass?.code ?? linkedProject?.name ?? "Personal note"} · {new Date(note.updatedAt).toLocaleDateString()}</span><p>{textOnly(note.body).slice(0, 90) || "Empty note"}</p></button>; })}{!visible.length && <div className="notes-list-empty">No notes here yet.</div>}</div></div>
    {selected ? <article className={`note-editor note-template-${selected.template ?? "blank"}`}><div className="note-editor-top"><select aria-label="Linked space" value={selectedSpaceValue} onChange={event => changeSpace(event.target.value)}><option value="">Personal note</option>{classes.length > 0 && <optgroup label="Classes">{classes.map(item => <option key={item.id} value={`class:${item.id}`}>{item.code} — {item.name}</option>)}</optgroup>}{projects.length > 0 && <optgroup label="Projects & maintenance">{projects.map(item => <option key={item.name} value={`project:${item.name}`}>{item.name}</option>)}</optgroup>}</select><select className="note-template-picker" aria-label="Page template" value={selected.template ?? "blank"} onChange={event => applyTemplate(event.target.value as NonNullable<Note["template"]>)}><option value="blank">Blank page</option><option value="lined">Lined notes</option><option value="dotted">Dotted notes</option><option value="cornell">Cornell notes</option><option value="meeting">Meeting notes</option></select><span>Saved {new Date(selected.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span><button className="note-pdf-button" onClick={exportNotePdf}><Download size={14} /> PDF</button><button onClick={() => onDelete(selected.id)}><Trash2 size={14} /> Delete</button></div><input className="note-title-input" value={selected.title} onChange={event => onUpdate(selected.id, { title: event.target.value })} placeholder="Untitled note" /><div className="note-format-bar" role="toolbar" aria-label="Text formatting"><button aria-label="Bold" onMouseDown={event => event.preventDefault()} onClick={() => command("bold")}><Bold size={15} /></button><button aria-label="Italic" onMouseDown={event => event.preventDefault()} onClick={() => command("italic")}><Italic size={15} /></button><button aria-label="Heading" onMouseDown={event => event.preventDefault()} onClick={() => command("formatBlock", "h2")}><Heading1 size={15} /></button><button aria-label="Bullet list" onMouseDown={event => event.preventDefault()} onClick={() => command("insertUnorderedList")}><List size={15} /></button><label title="Text color"><Palette size={14} /><input aria-label="Text color" type="color" defaultValue="#625af6" onChange={event => command("foreColor", event.target.value)} /></label><label title="Highlight color"><Highlighter size={14} /><input aria-label="Highlight color" type="color" defaultValue="#fff09d" onChange={event => command("hiliteColor", event.target.value)} /></label></div><div ref={editorRef} className="note-body-input rich-note-body" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" data-placeholder="Start writing. Lecture notes, ideas, study guides, random thoughts — all fair game." onInput={event => onUpdate(selected.id, { body: event.currentTarget.innerHTML })} /></article> : <div className="note-editor-empty"><NotebookPen size={28} /><h2>Take a note without making a task.</h2><p>Wild concept, right? Notes can just be notes.</p><button className="primary" onClick={onCreate}><Plus size={15} /> New note</button></div>}
  </section>;
}

function EditClassModal({ classRecord, close, save }: { classRecord: ClassRecord; close: () => void; save: (value: Omit<ClassRecord, "id">) => void }) {
  const [code, setCode] = useState(classRecord.code);
  const [name, setName] = useState(classRecord.name);
  const [term, setTerm] = useState(classRecord.term);
  const [instructor, setInstructor] = useState(classRecord.instructor);
  const [location, setLocation] = useState(classRecord.location ?? "");
  const [credits, setCredits] = useState(classRecord.credits?.toString() ?? "");
  const [semesterEnd, setSemesterEnd] = useState(classRecord.semesterEnd ?? "");
  const [archived, setArchived] = useState(Boolean(classRecord.archived));
  const [color, setColor] = useState(classRecord.color);
  const archivedByDate = Boolean(semesterEnd && semesterEnd < toDateKey(new Date()));
  return <motion.div className="modal-layer" onMouseDown={close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.form className="create-modal class-modal" onMouseDown={event => event.stopPropagation()} onSubmit={event => { event.preventDefault(); if (code.trim() && name.trim()) save({ code: code.trim().toUpperCase(), name: name.trim(), term: term.trim(), instructor: instructor.trim(), location: location.trim(), credits: Number(credits) || undefined, semesterEnd: semesterEnd || undefined, archived, color }); }} initial={{ scale: .98, y: 8 }} animate={{ scale: 1, y: 0 }}><div className="capture-head"><div className="brain-dot"><GraduationCap size={16} /></div><div><strong>Edit {classRecord.code}</strong><span>Change details, move it to another semester, or archive it.</span></div><button type="button" onClick={close} aria-label="Close"><X size={18} /></button></div><div className="class-form-grid"><label>Course code<input autoFocus value={code} onChange={event => setCode(event.target.value)} /></label><label>Class name<input value={name} onChange={event => setName(event.target.value)} /></label><label>Semester<input value={term} onChange={event => setTerm(event.target.value)} placeholder="Fall 2026" /></label><label>Semester ends<input type="date" value={semesterEnd} onChange={event => setSemesterEnd(event.target.value)} /></label><small className="class-form-hint">Past end dates archive it automatically.</small><label>Instructor<input value={instructor} onChange={event => setInstructor(event.target.value)} /></label><label>Location<input value={location} onChange={event => setLocation(event.target.value)} /></label><label>Credits<input type="number" min={0} max={12} value={credits} onChange={event => setCredits(event.target.value)} /></label><label>Class status<select value={archived || archivedByDate ? "Archived" : "Active"} onChange={event => setArchived(event.target.value === "Archived")}><option>Active</option><option>Archived</option></select></label></div><label>Class color</label><div className="calendar-color-picker">{["#625af6", "#4b8bdc", "#47a47b", "#d99b38", "#e48b6b", "#cf625a"].map(option => <button type="button" aria-label={`Use ${option}`} key={option} className={color === option ? "selected" : ""} style={{ background: option }} onClick={() => setColor(option)} />)}</div><div className="create-actions"><button type="button" onClick={close}>Cancel</button><button className="primary" type="submit" disabled={!code.trim() || !name.trim()}>Save class</button></div></motion.form></motion.div>;
}

function AcademicItemModal({ classRecord, close, add, defaults }: { classRecord: ClassRecord; close: () => void; add: (task: Pick<Task, "title" | "due" | "startTime" | "priority" | "focusMinutes" | "energy" | "academicType" | "gradeWeight" | "pointsEarned" | "pointsPossible" | "submission">) => void; defaults: { focusMinutes: number; energy: EnergyLevel } }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<AcademicItemType>("Assignment");
  const [due, setDue] = useState(toDateKey(new Date()));
  const [startTime, setStartTime] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("Medium");
  const [focusMinutes, setFocusMinutes] = useState(String(defaults.focusMinutes));
  const [energy, setEnergy] = useState<EnergyLevel>(defaults.energy);
  const [gradeWeight, setGradeWeight] = useState("");
  const [pointsPossible, setPointsPossible] = useState("");
  const [pointsEarned, setPointsEarned] = useState("");
  const [submission, setSubmission] = useState("");
  const [titleError, setTitleError] = useState("");
  const [pointsError, setPointsError] = useState("");
  const isAssessment = type === "Quiz" || type === "Exam";
  const possiblePoints = Number(pointsPossible);
  const earnedPoints = Number(pointsEarned);
  const useCurrentTime = () => {
    const current = new Date();
    setStartTime(`${String(current.getHours()).padStart(2, "0")}:${String(current.getMinutes()).padStart(2, "0")}`);
  };
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) { setTitleError(`Give this ${type.toLowerCase()} a name first.`); return; }
    const hasPoints = pointsPossible !== "" || pointsEarned !== "";
    if (isAssessment && hasPoints && (!Number.isFinite(possiblePoints) || possiblePoints <= 0 || (pointsEarned !== "" && (!Number.isFinite(earnedPoints) || earnedPoints < 0 || earnedPoints > possiblePoints)))) {
      setPointsError("Add total points first, then enter a score between 0 and that total.");
      return;
    }
    add({ title: title.trim(), due, startTime: startTime || undefined, priority, focusMinutes: Math.max(5, Math.min(240, Number(focusMinutes) || defaults.focusMinutes)), energy, academicType: type, gradeWeight: gradeWeight === "" ? undefined : Number(gradeWeight), pointsPossible: isAssessment && pointsPossible !== "" ? possiblePoints : undefined, pointsEarned: isAssessment && pointsEarned !== "" ? earnedPoints : undefined, submission });
  };
  return <motion.div className="modal-layer" onMouseDown={close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.form className="create-modal academic-modal" onMouseDown={event => event.stopPropagation()} onSubmit={submit} initial={{ scale: .98, y: 8 }} animate={{ scale: 1, y: 0 }}><div className="capture-head"><div className="brain-dot" style={{ color: classRecord.color, background: `${classRecord.color}16` }}><BookOpen size={16} /></div><div><strong>Add coursework to {classRecord.code}</strong><span>Capture the deadline and the grade impact now.</span></div><button type="button" onClick={close} aria-label="Close"><X size={18} /></button></div><label className="academic-title-field" htmlFor="academic-title">{type} title <em>Required</em><input id="academic-title" autoFocus value={title} aria-invalid={Boolean(titleError)} aria-describedby={titleError ? "academic-title-error" : undefined} onChange={event => { setTitle(event.target.value); if (titleError) setTitleError(""); }} placeholder={type === "Quiz" ? "e.g. Module 2 quiz" : "e.g. Midterm exam"} /></label>{titleError && <p id="academic-title-error" className="academic-title-error" role="alert">{titleError}</p>}<div className="academic-form-grid"><label>Type<select value={type} onChange={event => { setType(event.target.value as AcademicItemType); setPointsError(""); }}>{(["Assignment", "Project", "Exam", "Quiz", "Lab", "Reading", "Discussion"] as AcademicItemType[]).map(value => <option key={value}>{value}</option>)}</select></label><label>Due date<input type="date" value={due} onChange={event => setDue(event.target.value)} /></label><label>Start time<div className="time-input-with-now"><input type="time" value={startTime} onChange={event => setStartTime(event.target.value)} /><button type="button" onClick={useCurrentTime}>Now</button></div></label><label>Priority<select value={priority} onChange={event => setPriority(event.target.value as Task["priority"])}><option>High</option><option>Medium</option><option>Low</option></select></label><label>Focus estimate<input type="number" min={5} max={240} step={5} value={focusMinutes} onChange={event => setFocusMinutes(event.target.value)} /></label><label>Energy<select value={energy} onChange={event => setEnergy(event.target.value as EnergyLevel)}><option>Low</option><option>Medium</option><option>High</option></select></label><label>Grade weight (%)<input type="number" min={0} max={100} step={0.5} value={gradeWeight} onChange={event => setGradeWeight(event.target.value)} placeholder="15" /></label><label>Submission / LMS<input value={submission} onChange={event => setSubmission(event.target.value)} placeholder="Canvas, Blackboard, room…" /></label>{isAssessment && <div className="assessment-points"><div className="assessment-points-head"><strong>Points</strong><span>Optional until it’s graded</span></div><div className="assessment-points-grid"><label>Total points<input type="number" min={1} step={0.5} value={pointsPossible} onChange={event => { setPointsPossible(event.target.value); setPointsError(""); }} placeholder="100" /></label><label>Points earned<input type="number" min={0} max={pointsPossible || undefined} step={0.5} value={pointsEarned} onChange={event => { setPointsEarned(event.target.value); setPointsError(""); }} placeholder="Leave blank for now" /></label></div>{pointsPossible !== "" && possiblePoints > 0 && <p>{pointsEarned === "" ? `${possiblePoints} points possible` : `${earnedPoints}/${possiblePoints} points · ${((earnedPoints / possiblePoints) * 100).toFixed(1)}%`}</p>}{pointsError && <p className="assessment-points-error" role="alert">{pointsError}</p>}</div>}</div><div className="create-actions"><button type="button" onClick={close}>Cancel</button><button className="primary" type="submit">Add {type.toLowerCase()} to {classRecord.code}</button></div></motion.form></motion.div>;
}

const tasksToCalendarEvents = (tasks: Task[]): CalendarEvent[] => {
  return tasks
    .filter(task => !task.done && !task.canceled && task.due)
    .map(task => ({
      id: `task-${task.id}`,
      title: task.title,
      start: `${task.due}T09:00`,
      color: task.color,
      source: "LifeOS" as const,
      notes: `${task.project} · ${task.focusMinutes}m · ${task.energy}`,
    }));
};


function LegacyCalendarView({ events, weekStartsMonday, onNew, onImport, onEdit }: { events: CalendarEvent[]; weekStartsMonday: boolean; onNew: (date: string) => void; onImport: () => void; onEdit: (id: string) => void }) {
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => toDateKey(new Date()));
  const [mode, setMode] = useState<"month" | "day">("month");
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = new Date(monthStart);
  const firstDayOffset = weekStartsMonday ? (monthStart.getDay() + 6) % 7 : monthStart.getDay();
  const weekDays = weekStartsMonday ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  gridStart.setDate(monthStart.getDate() - firstDayOffset);
  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
  const monthSegments = buildMonthEventSegments(events, days);
  const selectedEvents = events.filter(event => eventOccursOnDate(event, selected)).sort((a, b) => a.start.localeCompare(b.start));
  const todayEvents = events.filter(event => eventOccursOnDate(event, toDateKey(new Date()))).sort((a, b) => a.start.localeCompare(b.start));
  const changeMonth = (offset: number) => setCursor(value => new Date(value.getFullYear(), value.getMonth() + offset, 1));
  const selectedDate = new Date(selected + "T12:00");
  const selectedLabel = selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  const hours = Array.from({ length: 24 }, (_, hour) => hour);
  const changeDay = (offset: number) => {
    const next = new Date(selected + "T12:00");
    next.setDate(next.getDate() + offset);
    setSelected(toDateKey(next));
    setCursor(new Date(next.getFullYear(), next.getMonth(), 1));
  };
  const selectDay = (key: string) => {
    setSelected(key);
    setMode("day");
  };
  const now = new Date();
  const selectedIsToday = selected === toDateKey(now);
  const nowTop = ((now.getHours() * 60 + now.getMinutes()) / 1440) * 100;
  const eventBlockStyle = (event: CalendarEvent) => {
    const start = new Date(event.start);
    const end = event.end ? new Date(event.end) : new Date(start.getTime() + 45 * 60_000);
    const { startKey, endKey } = getEventDateRange(event);
    const startMinutes = selected === startKey ? start.getHours() * 60 + start.getMinutes() : 0;
    const endMinutes = selected === endKey ? end.getHours() * 60 + end.getMinutes() : 1440;
    const durationMinutes = Math.max(20, endMinutes - startMinutes);
    return {
      top: `${(startMinutes / 1440) * 100}%`,
      minHeight: 34,
      height: `${Math.max(2.5, (durationMinutes / 1440) * 100)}%`,
      borderColor: event.color,
      background: `linear-gradient(135deg, ${event.color}22, var(--panel))`,
    } as React.CSSProperties;
  };
  return <><div className="page-title"><div><p className="eyebrow">Protect your time</p><h1>Calendar</h1><p>Manual planning plus iCal imports from Apple Calendar, school, work, or anything that exports `.ics`.</p></div><div className="calendar-actions"><div className="calendar-mode-tabs"><button className={mode === "month" ? "selected" : ""} onClick={() => setMode("month")}><CalendarDays size={14} /> Month</button><button className={mode === "day" ? "selected" : ""} onClick={() => setMode("day")}><Clock3 size={14} /> Day</button></div><button onClick={onImport}><Link2 size={16} /> Import iCal</button><button className="primary" onClick={() => onNew(selected)}><Plus size={16} /> Add event</button></div></div><div className="calendar-layout"><section className="card calendar-card">{mode === "month" ? <><div className="calendar-toolbar"><button onClick={() => changeMonth(-1)}>←</button><strong>{cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</strong><button onClick={() => changeMonth(1)}>→</button></div><div className="calendar-weekdays">{weekDays.map(day => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{days.map(day => { const key = toDateKey(day); const dayEvents = events.filter(event => event.start.slice(0, 10) === key); return <button key={key} className={`${day.getMonth() !== cursor.getMonth() ? "muted" : ""} ${key === selected ? "selected" : ""} ${key === toDateKey(new Date()) ? "today" : ""}`} onClick={() => selectDay(key)}><span>{day.getDate()}</span><div>{dayEvents.slice(0, 3).map(event => <i key={event.id} style={{ background: event.color }} title={event.title} />)}</div>{dayEvents.length > 3 && <small>+{dayEvents.length - 3}</small>}</button>; })}</div></> : <><div className="calendar-toolbar day-toolbar"><button onClick={() => changeDay(-1)}>←</button><div><strong>{selectedLabel}</strong><span>{selectedEvents.length ? `${selectedEvents.length} scheduled event${selectedEvents.length === 1 ? "" : "s"}` : "Open day"}</span></div><button onClick={() => changeDay(1)}>→</button></div><div className="day-jump-row"><button onClick={() => changeDay(-1)}>Yesterday</button><button onClick={() => { const today = new Date(); setSelected(toDateKey(today)); setCursor(new Date(today.getFullYear(), today.getMonth(), 1)); }}>Today</button><button onClick={() => changeDay(1)}>Tomorrow</button></div><div className="day-timeline"><div className="day-hours">{hours.map(hour => <div key={hour} className="day-hour"><span>{new Date(`${selected}T${String(hour).padStart(2, "0")}:00`).toLocaleTimeString("en-US", { hour: "numeric" })}</span></div>)}</div><div className="day-events-layer">{selectedIsToday && <div className="now-line" style={{ top: `${nowTop}%` }}><span>Now</span></div>}{selectedEvents.map(event => <button key={event.id} className="day-event-block" style={eventBlockStyle(event)} onClick={() => onEdit(event.id)}><strong>{event.title}</strong><span>{formatEventTime(event.start)}{event.end ? ` – ${formatEventTime(event.end)}` : ""}</span>{event.notes && <small>{event.notes}</small>}</button>)}</div></div></>}</section><aside className="calendar-side"><section className="card agenda-card"><div className="card-head"><div><span className="section-icon blue"><CalendarDays size={14} /></span><h2>{selectedLabel}</h2></div><span className="count">{selectedEvents.length} events</span></div><div className="agenda-list">{selectedEvents.length ? selectedEvents.map(event => <button className="agenda-item editable" key={event.id} onClick={() => onEdit(event.id)}><i style={{ background: event.color }} /><div><strong>{event.title}</strong><p>{formatEventTime(event.start)}{event.end ? ` – ${formatEventTime(event.end)}` : ""} · {event.source}</p>{event.notes && <small>{event.notes}</small>}</div><Pencil size={14} /></button>) : <div className="priority-empty"><strong>Nothing scheduled.</strong><p>That white space is not a bug. Protect it.</p></div>}</div></section><section className="card agenda-card"><div className="card-head"><div><span className="section-icon violet"><Clock3 size={14} /></span><h2>Today</h2></div><span className="count">{todayEvents.length}</span></div><div className="agenda-list">{todayEvents.slice(0, 4).map(event => <button className="agenda-item compact editable" key={event.id} onClick={() => onEdit(event.id)}><i style={{ background: event.color }} /><div><strong>{event.title}</strong><p>{formatEventTime(event.start)}</p></div><Pencil size={14} /></button>)}</div></section></aside></div></>;
}

function CalendarView({ events, tasks, weekStartsMonday, onNew, onImport, onEdit, onPlanTask }: { events: CalendarEvent[]; tasks: Task[]; weekStartsMonday: boolean; onNew: (date: string) => void; onImport: () => void; onEdit: (id: string) => void; onPlanTask: (id: number) => void }) {
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => toDateKey(new Date()));
  const [mode, setMode] = useState<"month" | "day" | "upcoming">("upcoming");
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = new Date(monthStart);
  const firstDayOffset = weekStartsMonday ? (monthStart.getDay() + 6) % 7 : monthStart.getDay();
  const weekDays = weekStartsMonday ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  gridStart.setDate(monthStart.getDate() - firstDayOffset);
  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
  const monthSegments = buildMonthEventSegments(events, days);
  const selectedEvents = events.filter(event => eventOccursOnDate(event, selected)).sort((a, b) => a.start.localeCompare(b.start));
  const todayKey = toDateKey(new Date());
  const todayEvents = events.filter(event => eventOccursOnDate(event, todayKey)).sort((a, b) => a.start.localeCompare(b.start));
  const selectedDate = new Date(`${selected}T12:00`);
  const selectedLabel = selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  type UpcomingItem = { id: string; kind: "event" | "task"; title: string; date: string; color: string; meta: string };
  const upcomingItems: UpcomingItem[] = [
    ...events
      .filter(event => !event.id.startsWith("task-") && (event.end ?? event.start).slice(0, 10) >= todayKey)
      .map(event => ({ id: event.id, kind: "event" as const, title: event.title, date: event.start, color: event.color, meta: `${formatEventRange(event)} · ${event.source}` })),
    ...tasks
      .filter(task => !task.done && !task.canceled && /^\d{4}-\d{2}-\d{2}$/.test(task.due) && task.due >= todayKey && !task.calendarEventId)
      .map(task => ({ id: String(task.id), kind: "task" as const, title: task.title, date: `${task.due}T${task.startTime || "09:00"}`, color: task.color, meta: `Task · due ${task.due === todayKey ? "today" : task.due} · ${task.focusMinutes}m` })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  const hours = Array.from({ length: 24 }, (_, hour) => hour);
  const changeMonth = (offset: number) => setCursor(value => new Date(value.getFullYear(), value.getMonth() + offset, 1));
  const changeDay = (offset: number) => {
    const next = new Date(`${selected}T12:00`);
    next.setDate(next.getDate() + offset);
    setSelected(toDateKey(next));
    setCursor(new Date(next.getFullYear(), next.getMonth(), 1));
  };
  const selectDay = (key: string) => {
    setSelected(key);
    setMode("day");
  };
  const now = new Date();
  const selectedIsToday = selected === todayKey;
  const nowTop = ((now.getHours() * 60 + now.getMinutes()) / 1440) * 100;
  const eventBlockStyle = (event: CalendarEvent) => {
    const start = new Date(event.start);
    const end = event.end ? new Date(event.end) : new Date(start.getTime() + 45 * 60_000);
    const { startKey, endKey } = getEventDateRange(event);
    const startMinutes = selected === startKey ? start.getHours() * 60 + start.getMinutes() : 0;
    const endMinutes = selected === endKey ? end.getHours() * 60 + end.getMinutes() : 1440;
    const durationMinutes = Math.max(20, endMinutes - startMinutes);
    return {
      top: `${(startMinutes / 1440) * 100}%`,
      minHeight: 34,
      height: `${Math.max(2.5, (durationMinutes / 1440) * 100)}%`,
      borderColor: event.color,
      background: `linear-gradient(135deg, ${event.color}22, var(--panel))`,
    } as React.CSSProperties;
  };

  return <>
    <div className="page-title">
      <div><p className="eyebrow">Protect your time</p><h1>Today</h1><p>Your timeline, calendar, and ready work in one calm planning layer.</p></div>
      <div className="calendar-actions">
        <div className="calendar-mode-tabs"><button className={mode === "upcoming" ? "selected" : ""} onClick={() => setMode("upcoming")}><ListTodo size={14} /> Upcoming</button><button className={mode === "month" ? "selected" : ""} onClick={() => setMode("month")}><CalendarDays size={14} /> Month</button><button className={mode === "day" ? "selected" : ""} onClick={() => setMode("day")}><Clock3 size={14} /> Day</button></div>
        <button onClick={onImport}><Link2 size={16} /> Import iCal</button>
        <button className="primary" onClick={() => onNew(selected)}><Plus size={16} /> Add event</button>
      </div>
    </div>
    <div className="calendar-layout">
      <section className="card calendar-card">
        {mode === "upcoming" ? <>
          <div className="calendar-toolbar upcoming-toolbar"><div><strong>What’s coming up</strong><span>Events and dated tasks, in order.</span></div><span className="count">{upcomingItems.length} upcoming</span></div>
          <div className="upcoming-list">
            {upcomingItems.length ? upcomingItems.slice(0, 5).map(item => {
              const itemDate = new Date(`${item.date.slice(0, 10)}T12:00`);
              return <button key={`${item.kind}-${item.id}`} className="upcoming-item" onClick={() => item.kind === "event" ? onEdit(item.id) : onPlanTask(Number(item.id))}>
                <time dateTime={item.date}><strong>{itemDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</strong><span>{itemDate.toLocaleDateString("en-US", { weekday: "short" })}</span></time>
                <i style={{ background: item.color }} />
                <div><span className="upcoming-kind">{item.kind === "event" ? "Calendar event" : "Task"}</span><strong>{item.title}</strong><small>{item.meta}</small></div>
                <ArrowRight size={16} />
              </button>;
            }) : <div className="priority-empty"><strong>Nothing upcoming yet.</strong><p>Add an event, import a calendar, or give a task a due date.</p></div>}
          </div>
        </> : mode === "month" ? <>
          <div className="calendar-toolbar"><button onClick={() => changeMonth(-1)}>←</button><strong>{cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</strong><button onClick={() => changeMonth(1)}>→</button></div>
          <div className="calendar-weekdays">{weekDays.map(day => <span key={day}>{day}</span>)}</div>
          <div className="calendar-grid month-grid">
            {days.map((day, index) => {
              const key = toDateKey(day);
              const dayEvents = events.filter(event => eventOccursOnDate(event, key));
              return <button
                aria-label={day.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                key={key}
                style={{ gridColumn: index % 7 + 1, gridRow: Math.floor(index / 7) + 1 }}
                className={`calendar-day-cell ${day.getMonth() !== cursor.getMonth() ? "muted" : ""} ${key === selected ? "selected" : ""} ${key === todayKey ? "today" : ""}`}
                onClick={() => selectDay(key)}
              ><span>{day.getDate()}</span>{dayEvents.length > 3 && <small>+{dayEvents.length - 3} more</small>}</button>;
            })}
            {monthSegments.filter(segment => segment.lane < 3).map(segment => <button
              key={`${segment.event.id}-${segment.week}`}
              className={`calendar-span-event ${segment.startsEvent ? "starts-event" : "continues-left"} ${segment.endsEvent ? "ends-event" : "continues-right"}`}
              style={{ gridColumn: `${segment.startColumn} / ${segment.endColumn + 1}`, gridRow: segment.week + 1, "--event-color": segment.event.color, "--event-lane": segment.lane } as React.CSSProperties}
              onClick={clickEvent => { clickEvent.stopPropagation(); onEdit(segment.event.id); }}
              title={`${segment.event.title} · ${formatEventRange(segment.event)}`}
            ><i /><strong>{segment.event.title}</strong>{segment.endsEvent && <span>{formatEventTime(segment.event.end ?? segment.event.start)}</span>}</button>)}
          </div>
        </> : <>
          <div className="calendar-toolbar day-toolbar"><button onClick={() => changeDay(-1)}>←</button><div><strong>{selectedLabel}</strong><span>{selectedEvents.length ? `${selectedEvents.length} scheduled event${selectedEvents.length === 1 ? "" : "s"}` : "Open day"}</span></div><button onClick={() => changeDay(1)}>→</button></div>
          <div className="day-jump-row"><button onClick={() => changeDay(-1)}>Yesterday</button><button onClick={() => { const today = new Date(); setSelected(toDateKey(today)); setCursor(new Date(today.getFullYear(), today.getMonth(), 1)); }}>Today</button><button onClick={() => changeDay(1)}>Tomorrow</button></div>
          <div className="day-timeline">
            <div className="day-hours">{hours.map(hour => <div key={hour} className="day-hour"><span>{new Date(`${selected}T${String(hour).padStart(2, "0")}:00`).toLocaleTimeString("en-US", { hour: "numeric" })}</span></div>)}</div>
            <div className="day-events-layer">{selectedIsToday && <div className="now-line" style={{ top: `${nowTop}%` }}><span>Now</span></div>}{selectedEvents.map(event => <button key={event.id} className="day-event-block" style={eventBlockStyle(event)} onClick={() => onEdit(event.id)}><strong>{event.title}</strong><span>{formatEventRange(event)}</span>{event.notes && <small>{event.notes}</small>}</button>)}</div>
          </div>
        </>}
      </section>
      <aside className="calendar-side">
        <section className="card agenda-card"><div className="card-head"><div><span className="section-icon blue"><CalendarDays size={14} /></span><h2>{selectedLabel}</h2></div><span className="count">{selectedEvents.length} events</span></div><div className="agenda-list">{selectedEvents.length ? selectedEvents.map(event => <button className="agenda-item editable" key={event.id} onClick={() => onEdit(event.id)}><i style={{ background: event.color }} /><div><strong>{event.title}</strong><p>{formatEventRange(event)} · {event.source}</p>{event.notes && <small>{event.notes}</small>}</div><Pencil size={14} /></button>) : <div className="priority-empty"><strong>Nothing scheduled.</strong><p>That white space is not a bug. Protect it.</p></div>}</div></section>
        <section className="card agenda-card"><div className="card-head"><div><span className="section-icon violet"><Clock3 size={14} /></span><h2>Today</h2></div><span className="count">{todayEvents.length}</span></div><div className="agenda-list">{todayEvents.slice(0, 4).map(event => <button className="agenda-item compact editable" key={event.id} onClick={() => onEdit(event.id)}><i style={{ background: event.color }} /><div><strong>{event.title}</strong><p>{formatEventRange(event)}</p></div><Pencil size={14} /></button>)}</div></section>
        <section className="card agenda-card"><div className="card-head"><div><span className="section-icon orange"><ListTodo size={14} /></span><h2>Ready to place</h2></div><span className="count">{tasks.filter(task => !task.startTime || task.due !== selected).length}</span></div><div className="agenda-list">{tasks.filter(task => !task.startTime || task.due !== selected).slice(0, 4).map(task => <button className="agenda-item compact editable" key={task.id} onClick={() => onPlanTask(task.id)}><i style={{ background: task.color }} /><div><strong>{task.title}</strong><p>{task.focusMinutes}m · {task.energy} energy</p></div><Plus size={14} /></button>)}{!tasks.filter(task => !task.startTime || task.due !== selected).length && <div className="priority-empty"><strong>Everything has a place.</strong><p>Leave the rest unscheduled on purpose.</p></div>}</div></section>
      </aside>
    </div>
  </>;
}

function ToggleRow({ title, desc, checked, onChange }: { title: string; desc: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <div className="setting-row"><div><strong>{title}</strong><p>{desc}</p></div><button className={`toggle ${checked ? "on" : ""}`} onClick={() => onChange(!checked)} aria-pressed={checked}><span /></button></div>;
}

type GmailMessage = { id: string; subject: string; from: string; date: string; snippet: string };

function GmailIntegration({ user, flash }: { user?: any; flash: (message: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");

  const token = useCallback(async () => {
    if (!user?.getIdToken) throw new Error("Sign in to LifeOS before connecting Gmail.");
    return user.getIdToken();
  }, [user]);
  const load = useCallback(async () => {
    try {
      setLoading(true); setError("");
      const idToken = await token();
      const response = await fetch("/api/gmail", { headers: { authorization: `Bearer ${idToken}` }, cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load Gmail.");
      setConnected(Boolean(data.connected));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load Gmail."); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => { void load(); }, [load]);
  const connect = async () => {
    try {
      setConnecting(true); setError("");
      const idToken = await token();
      const response = await fetch("/api/gmail/connect", { headers: { authorization: `Bearer ${idToken}` } });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || "Could not start Gmail connection.");
      window.location.assign(data.url);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not connect Gmail."); setConnecting(false); }
  };
  const disconnect = async () => {
    if (!window.confirm("Disconnect Gmail? LifeOS will delete its encrypted connection record.")) return;
    try {
      setDisconnecting(true); const idToken = await token();
      const response = await fetch("/api/gmail", { method: "DELETE", headers: { authorization: `Bearer ${idToken}` } });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not disconnect Gmail.");
      setConnected(false); flash("Gmail disconnected");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not disconnect Gmail."); }
    finally { setDisconnecting(false); }
  };
  return <section className="card settings-card gmail-card"><div className="card-head"><div><span className="section-icon red"><Mail size={14} /></span><h2>Gmail connection</h2></div></div><div className="settings-body"><div className="gmail-intro"><div><strong>{connected ? "Gmail is connected" : "Connect Gmail"}</strong><p>Your three most recent Primary emails appear on the dashboard. Promotions and social mail stay out.</p></div>{connected ? <button className="gmail-disconnect" onClick={() => void disconnect()} disabled={disconnecting}>{disconnecting ? "Disconnecting…" : "Disconnect"}</button> : <button className="primary gmail-connect" onClick={() => void connect()} disabled={connecting || loading}><Mail size={15} /> {connecting ? "Opening Google…" : "Connect Gmail"}</button>}</div>{error && <p className="gmail-error" role="alert">{error}</p>}{loading && <p className="settings-note">Checking your Gmail connection…</p>}<p className="settings-note">Read-only access. You can disconnect it anytime.</p></div></section>;
}

function DashboardGmailCard({ user, onSettings }: { user?: any; onSettings: () => void }) {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      if (!user?.getIdToken) throw new Error("Sign in to load Gmail.");
      setLoading(true); setError("");
      const idToken = await user.getIdToken();
      const response = await fetch("/api/gmail", { headers: { authorization: `Bearer ${idToken}` }, cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load Gmail.");
      setConnected(Boolean(data.connected)); setMessages(Array.isArray(data.messages) ? data.messages.slice(0, 3) : []);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load Gmail."); }
    finally { setLoading(false); }
  }, [user]);
  useEffect(() => { void load(); }, [load]);
  return <section className="card dashboard-gmail-card"><div className="card-head"><div><span className="section-icon red"><Mail size={14} /></span><h2>Recent email</h2></div>{connected && <button onClick={() => void load()} disabled={loading}>Refresh</button>}</div>{loading ? <p className="dashboard-gmail-status">Loading recent email…</p> : !connected ? <div className="dashboard-gmail-status"><strong>Gmail is not connected.</strong><button onClick={onSettings}>Connect Gmail</button></div> : error ? <div className="dashboard-gmail-status"><strong>Couldn’t load email.</strong><p>{error}</p><button onClick={() => void load()}>Try again</button></div> : messages.length ? <div className="dashboard-gmail-list">{messages.map(message => <article key={message.id}><div><strong>{message.subject}</strong><span>{message.from}</span></div><a href={`https://mail.google.com/mail/u/0/#inbox/${message.id}`} target="_blank" rel="noreferrer">Reply in Gmail <ExternalLink size={12} /></a></article>)}</div> : <div className="dashboard-gmail-status"><strong>No Primary inbox mail right now.</strong><p>Promotions and social mail are hidden.</p></div>}</section>;
}

type ICloudCalendarChoice = { url: string; name: string; color?: string };
type GoogleCalendarChoice = { id: string; name: string; color?: string; primary?: boolean };
function GoogleCalendarAutoSync({ user }: { user: any }) {
  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      try {
        const idToken = await user.getIdToken();
        const response = await fetch("/api/gmail/calendar/sync", { method: "POST", headers: { authorization: "Bearer " + idToken } });
        const data = await response.json();
        if (!response.ok || cancelled || !Array.isArray(data.events)) return;
        window.dispatchEvent(new CustomEvent("lifeos:google-calendar-events", { detail: data.events }));
      } catch {
        // Calendar connection remains optional; settings exposes the clear recovery path.
      }
    };
    const firstSync = window.setTimeout(sync, 250);
    const interval = window.setInterval(sync, 5 * 60 * 1000);
    return () => { cancelled = true; window.clearTimeout(firstSync); window.clearInterval(interval); };
  }, [user]);
  return null;
}
function CalendarConnections({ user, flash }: { user?: any; flash: (message: string) => void }) {
  const [provider, setProvider] = useState<"apple" | "google">("apple");
  const choices = [
    { id: "apple" as const, number: "1", name: "Apple", detail: "iCloud Calendar" },
    { id: "google" as const, number: "2", name: "Google", detail: "Google Calendar" },
  ];
  return <section className="card settings-card calendar-hub"><div className="card-head"><div><span className="section-icon violet"><CalendarDays size={14} /></span><h2>Calendar connections</h2></div><span className="calendar-hub-note">Read-only imports</span></div><div className="calendar-auto-refresh"><span><CheckCircle2 size={14} /> Automatic refresh is on</span><small>Connected calendars update every 5 minutes while LifeOS is open.</small></div><div className="calendar-provider-tabs" role="tablist" aria-label="Calendar providers">{choices.map(choice => <button key={choice.id} role="tab" aria-selected={provider === choice.id} className={provider === choice.id ? "selected" : ""} onClick={() => setProvider(choice.id)}><b>{choice.number}</b><span>{choice.name}<small>{choice.detail}</small></span></button>)}</div><div className="calendar-provider-content">{provider === "apple" && <ICloudCalendarIntegration user={user} flash={flash} />}{provider === "google" && <GoogleCalendarIntegration user={user} flash={flash} />}</div></section>;
}

function GoogleCalendarIntegration({ user, flash }: { user?: any; flash: (message: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [calendars, setCalendars] = useState<GoogleCalendarChoice[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const token = useCallback(async () => {
    if (!user?.getIdToken) throw new Error("Sign in to LifeOS before connecting Google Calendar.");
    return user.getIdToken();
  }, [user]);
  const load = useCallback(async () => {
    try {
      setLoading(true); setError("");
      const response = await fetch("/api/gmail/calendar", { headers: { authorization: "Bearer " + await token() }, cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load Google Calendar.");
      setConnected(Boolean(data.connected)); setNeedsReconnect(Boolean(data.needsReconnect));
      setCalendars(Array.isArray(data.calendars) ? data.calendars : []); setSelected(Array.isArray(data.selectedGoogleCalendarIds) ? data.selectedGoogleCalendarIds : []);
      if (data.error) setError(data.error);
    } catch (reason) { setConnected(false); setError(reason instanceof Error ? reason.message : "Could not load Google Calendar."); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => { void load(); }, [load]);
  const connect = async () => {
    try {
      setBusy(true); setError("");
      const response = await fetch("/api/gmail/connect", { headers: { authorization: "Bearer " + await token() } });
      const data = await response.json(); if (!response.ok || !data.url) throw new Error(data.error || "Could not start Google Calendar connection.");
      window.location.assign(data.url);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not connect Google Calendar."); setBusy(false); }
  };
  const saveSelection = async (next: string[]) => {
    setSelected(next);
    try {
      const response = await fetch("/api/gmail/calendar", { method: "PUT", headers: { authorization: "Bearer " + await token(), "content-type": "application/json" }, body: JSON.stringify({ selectedGoogleCalendarIds: next }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not save calendar choices.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save Google Calendar choices."); }
  };
  const sync = async () => {
    try {
      setBusy(true); setError("");
      const response = await fetch("/api/gmail/calendar/sync", { method: "POST", headers: { authorization: "Bearer " + await token() } });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not sync Google Calendar.");
      window.dispatchEvent(new CustomEvent("lifeos:google-calendar-events", { detail: Array.isArray(data.events) ? data.events : [] }));
      flash((data.events?.length || 0) + " Google Calendar events synced");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not sync Google Calendar."); }
    finally { setBusy(false); }
  };
  return <section className="card settings-card calendar-connection-card"><div className="card-head"><div><span className="section-icon google-calendar-icon"><CalendarDays size={14} /></span><h2>Google Calendar</h2></div>{connected && !needsReconnect && <button onClick={() => void sync()} disabled={busy}><RefreshCw size={14} /> {busy ? "Syncing…" : "Sync now"}</button>}</div><div className="settings-body">{loading ? <p className="settings-note">Checking Google Calendar…</p> : !connected ? <div className="integration-empty"><strong>Connect your Google Calendar.</strong><p>Choose the calendars LifeOS can read. Your Gmail preview stays read-only too.</p><button className="primary" onClick={() => void connect()} disabled={busy}><CalendarDays size={15} /> {busy ? "Opening Google…" : "Connect Google Calendar"}</button></div> : needsReconnect ? <div className="integration-empty"><strong>One quick permission update.</strong><p>Reconnect your Google account and approve Calendar access. Your existing Gmail connection and data stay safe.</p><button className="primary" onClick={() => void connect()} disabled={busy}>{busy ? "Opening Google…" : "Reconnect Google"}</button></div> : <><div className="icloud-status"><span><CheckCircle2 size={15} /> Connected securely</span><button onClick={() => void connect()} disabled={busy}>Reconnect</button></div><p className="settings-note">Choose which Google calendars LifeOS should import. Sync is read-only, so it never changes Google Calendar.</p>{calendars.length ? <div className="icloud-calendar-list">{calendars.map(calendar => <label key={calendar.id} className="google-calendar-option"><input type="checkbox" checked={selected.includes(calendar.id)} onChange={event => void saveSelection(event.target.checked ? [...selected, calendar.id] : selected.filter(id => id !== calendar.id))} /><i style={{ background: calendar.color || "#4285f4" }} /><span>{calendar.name}{calendar.primary ? " · Primary" : ""}</span></label>)}</div> : <div className="integration-empty"><strong>No calendars found yet.</strong><p>Reconnect Google to grant Calendar access, then come back here.</p><button onClick={() => void connect()} disabled={busy}>Reconnect Google</button></div>}</>}{error && <p className="gmail-error" role="alert">{error}</p>}</div></section>;
}
function OutlookCalendarAutoSync({ user }: { user: any }) {
  useEffect(() => {
    let cancelled = false;
    const sync = async () => { try { const idToken = await user.getIdToken(); const response = await fetch("/api/outlook/calendar/sync", { method: "POST", headers: { authorization: "Bearer " + idToken } }); const data = await response.json(); if (response.ok && !cancelled && Array.isArray(data.events)) window.dispatchEvent(new CustomEvent("lifeos:outlook-calendar-events", { detail: data.events })); } catch { /* connection is optional */ } };
    const first = window.setTimeout(sync, 500); const interval = window.setInterval(sync, 5 * 60 * 1000);
    return () => { cancelled = true; window.clearTimeout(first); window.clearInterval(interval); };
  }, [user]);
  return null;
}
function OutlookCalendarIntegration({ user, flash }: { user?: any; flash: (message: string) => void }) {
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [connected, setConnected] = useState(false); const [calendars, setCalendars] = useState<GoogleCalendarChoice[]>([]); const [selected, setSelected] = useState<string[]>([]); const [error, setError] = useState("");
  const token = useCallback(async () => { if (!user?.getIdToken) throw new Error("Sign in to LifeOS before connecting Outlook Calendar."); return user.getIdToken(); }, [user]);
  const load = useCallback(async () => { try { setLoading(true); setError(""); const response = await fetch("/api/outlook/calendar", { headers: { authorization: "Bearer " + await token() }, cache: "no-store" }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not load Outlook Calendar."); setConnected(Boolean(data.connected)); setCalendars(Array.isArray(data.calendars) ? data.calendars : []); setSelected(Array.isArray(data.selectedCalendarIds) ? data.selectedCalendarIds : []); } catch (reason) { setConnected(false); setError(reason instanceof Error ? reason.message : "Could not load Outlook Calendar."); } finally { setLoading(false); } }, [token]);
  useEffect(() => { void load(); }, [load]);
  const connect = async () => { try { setBusy(true); setError(""); const response = await fetch("/api/outlook/connect", { headers: { authorization: "Bearer " + await token() } }); const data = await response.json(); if (!response.ok || !data.url) throw new Error(data.error || "Could not start Outlook connection."); window.location.assign(data.url); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not connect Outlook Calendar."); setBusy(false); } };
  const save = async (next: string[]) => { setSelected(next); try { const response = await fetch("/api/outlook/calendar", { method: "PUT", headers: { authorization: "Bearer " + await token(), "content-type": "application/json" }, body: JSON.stringify({ selectedCalendarIds: next }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not save calendar choices."); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save Outlook calendar choices."); } };
  const sync = async () => { try { setBusy(true); setError(""); const response = await fetch("/api/outlook/calendar/sync", { method: "POST", headers: { authorization: "Bearer " + await token() } }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not sync Outlook Calendar."); window.dispatchEvent(new CustomEvent("lifeos:outlook-calendar-events", { detail: Array.isArray(data.events) ? data.events : [] })); flash((data.events?.length || 0) + " Outlook events synced"); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not sync Outlook Calendar."); } finally { setBusy(false); } };
  const disconnect = async () => { if (!window.confirm("Disconnect Outlook Calendar? LifeOS will remove its encrypted connection record.")) return; try { setBusy(true); const response = await fetch("/api/outlook/calendar", { method: "DELETE", headers: { authorization: "Bearer " + await token() } }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not disconnect Outlook."); setConnected(false); setCalendars([]); setSelected([]); flash("Outlook Calendar disconnected"); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not disconnect Outlook Calendar."); } finally { setBusy(false); } };
  return <section className="card settings-card calendar-connection-card"><div className="card-head"><div><span className="section-icon outlook-calendar-icon"><CalendarDays size={14} /></span><h2>Outlook Calendar</h2></div>{connected && <button onClick={() => void sync()} disabled={busy}><RefreshCw size={14} /> {busy ? "Syncing…" : "Sync now"}</button>}</div><div className="settings-body">{loading ? <p className="settings-note">Checking Outlook Calendar…</p> : !connected ? <div className="integration-empty"><strong>Connect Outlook Calendar.</strong><p>Choose the Microsoft calendars LifeOS can read. Sync is read-only: LifeOS never changes events in Outlook.</p><ol className="integration-steps"><li>Press <b>Connect Outlook Calendar</b> and sign in to Microsoft.</li><li>Approve read-only calendar access.</li><li>Back in LifeOS, check the calendars you want and press <b>Sync now</b>.</li></ol><details className="integration-help"><summary>First-time Microsoft setup (only if Connect does not open)</summary><p>In Microsoft Entra, add <code>https://lifeos-mu-three.vercel.app/api/outlook/callback</code> as a Web redirect URL. Then add <code>MICROSOFT_OUTLOOK_CLIENT_ID</code> and <code>MICROSOFT_OUTLOOK_CLIENT_SECRET</code> to Vercel, and grant Microsoft Graph delegated <code>Calendars.Read</code>.</p></details><button className="primary" onClick={() => void connect()} disabled={busy}><CalendarDays size={15} /> {busy ? "Opening Microsoft…" : "Connect Outlook Calendar"}</button></div> : <><div className="icloud-status"><span><CheckCircle2 size={15} /> Connected securely</span><button onClick={() => void disconnect()} disabled={busy}>Disconnect</button></div><p className="settings-note">Choose the Outlook calendars LifeOS should import.</p>{calendars.length ? <div className="icloud-calendar-list">{calendars.map(calendar => <label key={calendar.id} className="outlook-calendar-option"><input type="checkbox" checked={selected.includes(calendar.id)} onChange={event => void save(event.target.checked ? [...selected, calendar.id] : selected.filter(id => id !== calendar.id))} /><i style={{ background: calendar.color || "#0078d4" }} /><span>{calendar.name}{calendar.primary ? " · Default" : ""}</span></label>)}</div> : <div className="integration-empty"><strong>No Outlook calendars found.</strong><p>Try reconnecting your Microsoft account.</p><button onClick={() => void connect()} disabled={busy}>Reconnect Outlook</button></div>}</>}{error && <p className="gmail-error" role="alert">{error}</p>}</div></section>;
}
function ICloudCalendarAutoSync({ user }: { user: any }) {
  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      try {
        const idToken = await user.getIdToken();
        const connection = await fetch("/api/icloud", { headers: { authorization: "Bearer " + idToken }, cache: "no-store" });
        const status = await connection.json();
        if (!connection.ok || !status.configured || !status.connected) return;
        await fetch("/api/icloud", { method: "POST", headers: { authorization: "Bearer " + idToken, "content-type": "application/json" }, body: JSON.stringify({ action: "refresh" }) });
        const response = await fetch("/api/icloud/sync", { method: "POST", headers: { authorization: "Bearer " + idToken } });
        const data = await response.json();
        if (!response.ok || cancelled || !Array.isArray(data.events)) return;
        localStorage.setItem("lifeos-icloud-last-sync", new Date().toISOString());
        window.dispatchEvent(new CustomEvent("lifeos:icloud-events", { detail: data.events }));
      } catch {
        // Settings still offers a manual sync if a background refresh cannot run.
      }
    };
    const firstSync = window.setTimeout(sync, 0);
    const interval = window.setInterval(sync, 5 * 60 * 1000);
    return () => { cancelled = true; window.clearTimeout(firstSync); window.clearInterval(interval); };
  }, [user]);
  return null;
}
function ICloudCalendarIntegration({ user, flash }: { user?: any; flash: (message: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [connected, setConnected] = useState(false);
  const [appleId, setAppleId] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [calendars, setCalendars] = useState<ICloudCalendarChoice[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const token = useCallback(async () => {
    if (!user?.getIdToken) throw new Error("Sign in to LifeOS before connecting iCloud Calendar.");
    return user.getIdToken();
  }, [user]);
  const load = useCallback(async () => {
    try {
      setLoading(true); setError("");
      const response = await fetch("/api/icloud", { headers: { authorization: "Bearer " + await token() }, cache: "no-store" });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not load iCloud Calendar.");
      setConfigured(Boolean(data.configured)); setConnected(Boolean(data.connected)); setCalendars(Array.isArray(data.calendars) ? data.calendars : []); setSelected(Array.isArray(data.selectedCalendarUrls) ? data.selectedCalendarUrls : []);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load iCloud Calendar."); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => { void load(); }, [load]);
  const connect = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setBusy(true); setError("");
      const response = await fetch("/api/icloud", { method: "POST", headers: { authorization: "Bearer " + await token(), "content-type": "application/json" }, body: JSON.stringify({ appleId, appPassword }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not connect iCloud Calendar.");
      setConnected(true); setCalendars(data.calendars || []); setSelected(data.selectedCalendarUrls || []); setAppPassword(""); flash("iCloud Calendar connected");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not connect iCloud Calendar."); }
    finally { setBusy(false); }
  };
  const saveSelection = async (next: string[]) => {
    setSelected(next);
    try {
      const response = await fetch("/api/icloud", { method: "PUT", headers: { authorization: "Bearer " + await token(), "content-type": "application/json" }, body: JSON.stringify({ selectedCalendarUrls: next }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not save choices.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save calendar choices."); }
  };
  const sync = async () => {
    try {
      setBusy(true); setError("");
      const response = await fetch("/api/icloud/sync", { method: "POST", headers: { authorization: "Bearer " + await token() } });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not sync iCloud Calendar.");
      window.dispatchEvent(new CustomEvent("lifeos:icloud-events", { detail: Array.isArray(data.events) ? data.events : [] }));
      flash((data.events?.length || 0) + " iCloud events synced");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not sync iCloud Calendar."); }
    finally { setBusy(false); }
  };
  const refreshCalendars = async () => {
    try {
      setBusy(true); setError("");
      const response = await fetch("/api/icloud", { method: "POST", headers: { authorization: "Bearer " + await token(), "content-type": "application/json" }, body: JSON.stringify({ action: "refresh" }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not refresh calendars.");
      setCalendars(Array.isArray(data.calendars) ? data.calendars : []); setSelected(Array.isArray(data.selectedCalendarUrls) ? data.selectedCalendarUrls : []); flash("iCloud calendars refreshed");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not refresh calendars."); }
    finally { setBusy(false); }
  };
  const disconnect = async () => {
    if (!window.confirm("Disconnect iCloud Calendar? LifeOS will delete its encrypted connection record.")) return;
    try { setBusy(true); const response = await fetch("/api/icloud", { method: "DELETE", headers: { authorization: "Bearer " + await token() } }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not disconnect."); setConnected(false); setCalendars([]); setSelected([]); flash("iCloud Calendar disconnected"); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not disconnect iCloud Calendar."); }
    finally { setBusy(false); }
  };
  return <section className="card settings-card icloud-card"><div className="card-head"><div><span className="section-icon blue"><CalendarDays size={14} /></span><h2>iCloud Calendar</h2></div>{connected && <button onClick={() => void sync()} disabled={busy}><RefreshCw size={14} /> {busy ? "Syncing…" : "Sync now"}</button>}</div><div className="settings-body">{loading ? <p className="settings-note">Checking iCloud Calendar…</p> : !configured ? <div className="integration-empty"><strong>One setup step left.</strong><p>Add <code>ICLOUD_CONNECTION_SECRET</code> in Vercel to turn on encrypted iCloud Calendar connections.</p></div> : !connected ? <form className="icloud-connect-form" onSubmit={connect}><p className="settings-note">Use an Apple app-specific password — never your normal Apple Account password. LifeOS encrypts it server-side.</p><label>Apple ID<input type="email" required autoComplete="username" value={appleId} onChange={event => setAppleId(event.target.value)} placeholder="you@icloud.com" /></label><label>App-specific password<input type="password" required autoComplete="new-password" value={appPassword} onChange={event => setAppPassword(event.target.value)} placeholder="xxxx-xxxx-xxxx-xxxx" /></label><button className="primary" disabled={busy}>{busy ? "Connecting…" : "Connect iCloud Calendar"}</button></form> : <><div className="icloud-status"><span><CheckCircle2 size={15} /> Connected securely</span><button onClick={() => void disconnect()} disabled={busy}>Disconnect</button></div><p className="settings-note">Choose the calendars LifeOS should import. Sync is read-only for now, so it won’t alter Apple Calendar.</p>{calendars.length ? <div className="icloud-calendar-list">{calendars.map(calendar => <label key={calendar.url}><input type="checkbox" checked={selected.includes(calendar.url)} onChange={event => void saveSelection(event.target.checked ? [...selected, calendar.url] : selected.filter(url => url !== calendar.url))} /><i style={{ background: calendar.color || "#8b7cff" }} /><span>{calendar.name}</span></label>)}</div> : <div className="integration-empty"><strong>Calendars need a refresh.</strong><p>Your connection is safe. Refreshing re-reads the available iCloud calendars.</p><button onClick={() => void refreshCalendars()} disabled={busy}>Refresh calendars</button></div>}</>}{error && <p className="gmail-error" role="alert">{error}</p>}</div></section>;
}

function SettingsView({ dark, setDark, settings, update, tasks, projects, events, brainItems, flash, onSync, onReset, onExport, onImport, user, onLogout }: { dark: boolean; setDark: (next: boolean | ((value: boolean) => boolean)) => void; settings: SettingsState; update: (updates: Partial<SettingsState>) => void; tasks: Task[]; projects: Project[]; events: CalendarEvent[]; brainItems: string[]; flash: (message: string) => void; onSync?: () => void; onReset?: () => void; onExport?: () => void; onImport?: () => void; user?: any; onLogout?: () => void }) {
  const requestNotifications = async () => {
    if (!("Notification" in window)) {
      flash("Notifications are not supported here");
      return;
    }
    const permission = await Notification.requestPermission();
    flash(permission === "granted" ? "Browser notifications enabled" : "Notifications not enabled");
  };
  return <><div className="page-title"><div><p className="eyebrow">Make it yours</p><h1>Settings</h1><p>Theme, notifications, focus defaults, calendar behavior, data, and workspace controls.</p></div><button className="primary" onClick={onExport}><Download size={16} /> Export data</button></div><div className="settings-layout"><section className="card settings-card"><div className="card-head"><div><span className="section-icon violet"><Palette size={14} /></span><h2>Appearance</h2></div></div><div className="settings-body"><div className="theme-options"><button className={!dark ? "selected" : ""} onClick={() => setDark(false)}><Sun size={16} /><span>Light</span></button><button className={dark ? "selected" : ""} onClick={() => setDark(true)}><Moon size={16} /><span>Dark</span></button></div><div className="accent-picker">{["#625af6", "#4b8bdc", "#47a47b", "#d99b38", "#e48b6b", "#cf625a"].map(color => <button key={color} className={settings.accent === color ? "selected" : ""} style={{ background: color }} onClick={() => update({ accent: color })} aria-label={`Set accent ${color}`} />)}</div><ToggleRow title="Compact mode" desc="Tighten spacing when you want more on screen." checked={settings.compactMode} onChange={(compactMode) => update({ compactMode })} /><ToggleRow title="Reduce motion" desc="Calmer transitions for lower sensory load." checked={settings.reduceMotion} onChange={(reduceMotion) => update({ reduceMotion })} /></div></section><section className="card settings-card"><div className="card-head"><div><span className="section-icon blue"><Bell size={14} /></span><h2>Notifications</h2></div><button onClick={requestNotifications}>Enable browser</button></div><div className="settings-body"><ToggleRow title="Daily digest" desc="A quick morning/evening summary of what matters." checked={settings.dailyDigest} onChange={(dailyDigest) => update({ dailyDigest })} /><ToggleRow title="Focus reminders" desc="Gentle nudges when a priority is waiting." checked={settings.focusReminders} onChange={(focusReminders) => update({ focusReminders })} /><ToggleRow title="Calendar alerts" desc="Remind you before events you added or imported." checked={settings.calendarAlerts} onChange={(calendarAlerts) => update({ calendarAlerts })} /><ToggleRow title="Sound effects" desc="Optional little audio cues for starts and completions." checked={settings.soundEffects} onChange={(soundEffects) => update({ soundEffects })} /></div></section><section className="card settings-card"><div className="card-head"><div><span className="section-icon green"><Focus size={14} /></span><h2>Focus defaults</h2></div></div><div className="settings-body"><div className="settings-grid-fields"><label>Default focus length<input type="number" min={5} max={240} step={5} value={settings.defaultFocusMinutes} onChange={event => update({ defaultFocusMinutes: Math.max(5, Number(event.target.value) || 45) })} /></label><label>Default energy<select value={settings.defaultEnergy} onChange={event => update({ defaultEnergy: event.target.value as EnergyLevel })}><option>Low</option><option>Medium</option><option>High</option></select></label></div><p className="settings-note">New priorities use these defaults. Existing tasks can still be edited individually.</p></div></section><section className="card settings-card"><div className="card-head"><div><span className="section-icon orange"><CalendarDays size={14} /></span><h2>Calendar</h2></div></div><div className="settings-body"><ToggleRow title="Week starts Monday" desc="Use a workweek-style calendar layout preference." checked={settings.weekStartsMonday} onChange={(weekStartsMonday) => update({ weekStartsMonday })} /><p className="settings-note">iCal imports are editable locally. Full private Apple Calendar sync needs a backend/CalDAV layer later.</p></div></section><section className="card settings-card"><div className="card-head"><div><span className="section-icon blue"><Settings size={14} /></span><h2>Environments</h2></div></div><div className="settings-body"><ToggleRow title="LifeOS" desc="Personal task management and life organization." checked={settings.enableLifeOS !== false} onChange={(enableLifeOS) => update({ enableLifeOS })} /><ToggleRow title="SchoolOS" desc="Academic coursework, assignments, and learning." checked={settings.enableSchoolOS !== false} onChange={(enableSchoolOS) => update({ enableSchoolOS })} /><ToggleRow title="WorkOS" desc="Professional projects, tasks, and deliverables." checked={settings.enableWorkOS !== false} onChange={(enableWorkOS) => update({ enableWorkOS })} /></div></section><GmailIntegration user={user} flash={flash} /><section className="card settings-card"><div className="card-head"><div><span className="section-icon dark-icon"><Shield size={14} /></span><h2>Privacy & data</h2></div></div><div className="settings-body"><div className="data-stats"><span>{tasks.length}<small>priorities</small></span><span>{projects.length}<small>projects</small></span><span>{brainItems.length}<small>brain</small></span></div><div className="settings-actions">{onSync && <button onClick={onSync}><Download size={15} /> Sync from cloud</button>}<button onClick={onExport}><Download size={15} /> Export JSON</button><button onClick={onImport}><Download size={15} style={{ transform: "scaleY(-1)" }} /> Import JSON</button><button className="danger-settings" onClick={onReset}><Trash2 size={15} /> Reset local data</button></div><p className="settings-note">All your data syncs to the cloud. Access it from any device by visiting this link. Deleted brain thoughts stay deleted unless you capture them again.</p></div></section><section className="card settings-card"><div className="card-head"><div><span className="section-icon violet"><Command size={14} /></span><h2>Shortcuts</h2></div></div><div className="settings-body shortcut-list"><div><kbd>/</kbd><span>Find anything</span></div><div><kbd>⌘ K</kbd><span>Command palette</span></div><div><kbd>B</kbd><span>Quick capture</span></div><div><kbd>F</kbd><span>Start focus</span></div><div><kbd>N</kbd><span>New task</span></div><div><kbd>J / K</kbd><span>Switch focus task</span></div></div></section><section className="card settings-card workspace-settings"><div className="card-head"><div><span className="section-icon blue"><SlidersHorizontal size={14} /></span><h2>Account</h2></div></div><div className="settings-body"><div className="workspace-profile"><div className="avatar">{user?.email?.charAt(0).toUpperCase() || 'U'}</div><div><strong>{user?.displayName || 'User'}</strong><p>{user?.email}</p></div></div><button onClick={onLogout} style={{marginTop: '16px', width: '100%', padding: '8px 12px', background: 'rgba(255,107,107,0.1)', color: '#ff6b6b', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s'}} onMouseEnter={(e) => {e.currentTarget.style.background = 'rgba(255,107,107,0.2)'}} onMouseLeave={(e) => {e.currentTarget.style.background = 'rgba(255,107,107,0.1)'}}>Sign out</button><p className="settings-note" style={{marginTop: '16px'}}>Your data is securely stored in the cloud and synced across all your devices.</p></div></section></div></>;
}

function BrainView({ items, onCapture, onArchive }: { items: string[]; onCapture: () => void; onArchive: (index: number) => void }) {
  const [newest, setNewest] = useState(true);
  const visibleItems = (newest ? items : [...items].reverse()).map((item, index) => ({ item, sourceIndex: newest ? index : items.length - 1 - index }));
  return <><div className="page-title"><div><p className="eyebrow">Capture first. Organize later.</p><h1>Brain inbox</h1><p>A safe place for everything on your mind.</p></div><button className="primary" onClick={onCapture}><Plus size={16} /> Capture thought</button></div><div className="brain-layout"><section className="card brain-list"><div className="brain-filter"><strong>{items.length} thoughts</strong><button onClick={() => setNewest(value => !value)}>{newest ? "Newest" : "Oldest"} first <ChevronDown size={14} /></button></div>{visibleItems.map(({ item, sourceIndex }) => <div className="brain-row" key={`${item}-${sourceIndex}`}><div className="brain-dot"><Sparkles size={15} /></div><div><strong>{item}</strong><p>Captured {sourceIndex === 0 ? "just now" : `${sourceIndex + 1} hours ago`} · Unsorted</p></div><button aria-label={`Delete ${item}`} title="Delete thought" onClick={() => onArchive(sourceIndex)}><Trash2 size={15} /></button></div>)}</section><aside className="brain-aside"><div className="soft-card"><Inbox size={20} /><strong>Inbox zero is not the goal.</strong><p>Your brain is for having ideas, not holding them. Capture freely; sort when you’re ready.</p></div></aside></div></>;
}

function ResourcesView({ resources, classes, onUpload, onDelete, onReplace, onDownload }: { resources: Resource[]; classes: ClassRecord[]; onUpload: (file: File) => void | Promise<void>; onDelete: (id: string) => void; onReplace: (id: string, file: File) => void; onDownload: (resource: Resource) => void | Promise<void> }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = async (e: any) => {
      if (e.target.files[0]) {
        setIsUploading(true);
        try {
          await onUpload(e.target.files[0]);
        } catch {
          // uploadResource owns the error message; this keeps the button usable.
        } finally {
          setIsUploading(false);
        }
      }
    };
    input.click();
  };

  const handleReplace = (id: string) => {
    setSelectedId(id);
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = async (e: any) => {
      if (e.target.files[0]) {
        try {
          await onReplace(id, e.target.files[0]);
        } catch {
          // replaceResource owns the error message; this clears the busy state.
        } finally {
          setSelectedId(null);
        }
      }
    };
    input.click();
  };

  return <>
    <div className="page-title">
      <div style={{ flex: 1 }}>
        <p className="eyebrow">Keep & organize</p>
        <h1>Resources</h1>
        <p>Download, replace, or remove files and assets.</p>
      </div>
      <button onClick={handleUpload} disabled={isUploading} style={{ padding: '8px 16px', fontSize: '14px', background: '#625af6', color: '#fff', border: 'none', borderRadius: '6px', cursor: isUploading ? 'not-allowed' : 'pointer', opacity: isUploading ? 0.6 : 1, whiteSpace: 'nowrap', flexShrink: 0, marginTop: '2px' }}>
        {isUploading ? 'Uploading...' : '+ Upload file'}
      </button>
    </div>
    <div className="brain-layout">
      <section className="card brain-list">
        {resources.length ? (
          resources.map(resource => (
            <div className="brain-row" key={resource.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <strong>{resource.name}</strong>
                <p>{classes.find(item => item.id === resource.classId)?.code ?? "Unfiled"} · {resource.type} · {formatResourceSize(resource.size)} · {new Date(resource.uploadedAt).toLocaleDateString()}</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => onDownload(resource)} title="Download" style={{ padding: '6px 12px', fontSize: '12px', background: '#625af6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Download</button>
                <button onClick={() => handleReplace(resource.id)} title="Replace" disabled={selectedId === resource.id} style={{ padding: '6px 12px', fontSize: '12px', background: 'rgba(200, 200, 200, 0.2)', border: '1px solid rgba(200, 200, 200, 0.4)', borderRadius: '4px', cursor: 'pointer' }}>Replace</button>
                <button onClick={() => onDelete(resource.id)} title="Delete" style={{ padding: '6px 12px', fontSize: '12px', background: 'rgba(255, 107, 107, 0.2)', color: '#ff6b6b', border: '1px solid rgba(255, 107, 107, 0.3)', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
              </div>
            </div>
          ))
        ) : (
          <div className="priority-empty">
            <strong>No resources yet.</strong>
            <p>Upload files and keep them organized in one place.</p>
          </div>
        )}
      </section>
    </div>
  </>;
}

function LoginPage({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      const code = typeof err?.code === "string" ? err.code : "";
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        setError("Google sign-in was closed before it finished.");
      } else if (code === "auth/popup-blocked") {
        setError("Your browser blocked the Google sign-in window. Allow popups for LifeOS, then try again.");
      } else if (code === "auth/unauthorized-domain") {
        setError("This LifeOS website is not authorized in Firebase yet.");
      } else {
        setError(err?.message || "Google sign-in failed. Please try again.");
      }
      setIsLoading(false);
    }
  };

  const handleTestLogin = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEYS.USER_ID, TEST_USER.ID);
      logger.debug('Test login initiated');
    }
    onLoginSuccess();
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      color: '#fff',
      padding: '20px'
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '400px',
        width: '100%'
      }}>
        <div style={{
          fontSize: '48px',
          marginBottom: '12px',
          fontWeight: '600'
        }}>LifeOS</div>

        <p style={{
          fontSize: '14px',
          opacity: 0.7,
          marginBottom: '40px',
          lineHeight: '1.6'
        }}>
          Your personal operating system for priorities, focus, and growth
        </p>

        <div style={{ marginBottom: '32px' }}>
          <div style={{
            fontSize: '12px',
            opacity: 0.6,
            marginBottom: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>New here?</div>
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: '#625af6',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              transition: 'all 0.2s',
              marginBottom: '16px'
            }}
            onMouseEnter={(e) => !isLoading && (e.currentTarget.style.background = '#7c6fff')}
            onMouseLeave={(e) => !isLoading && (e.currentTarget.style.background = '#625af6')}
          >
            {isLoading ? 'Creating account...' : 'Create Account with Google'}
          </button>
        </div>

        <div style={{ marginBottom: '24px', opacity: 0.5 }}>
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
        </div>

        <div style={{
          fontSize: '12px',
          opacity: 0.6,
          marginBottom: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>Returning user?</div>
        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: 'transparent',
            color: '#625af6',
            border: '1px solid #625af6',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => !isLoading && (e.currentTarget.style.background = 'rgba(98, 90, 246, 0.1)')}
          onMouseLeave={(e) => !isLoading && (e.currentTarget.style.background = 'transparent')}
        >
          {isLoading ? 'Signing in...' : 'Sign in with Google'}
        </button>

        {error && (
          <p style={{
            fontSize: '12px',
            color: '#ff6b6b',
            marginTop: '12px'
          }}>
            {error}
          </p>
        )}

        {typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname) && (
          <button
            onClick={handleTestLogin}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginTop: '12px'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
          >
            Dev: Test Login
          </button>
        )}

        <p style={{
          fontSize: '12px',
          opacity: 0.5,
          marginTop: '24px'
        }}>
          Your data stays private and syncs across all your devices
        </p>
      </div>
    </div>
  );
}

function ComingSoon({ view, onFocus }: { view: View; onFocus: () => void }) {
  const Icon = view === "Calendar" ? CalendarDays : view === "Knowledge" ? Library : view === "Resources" ? Archive : Settings;
  return <div className="empty-state"><div><Icon size={28} /></div><p className="eyebrow">Part of your LifeOS</p><h1>{view}</h1><p>This space is ready for the next layer of your system. For now, the cockpit keeps you centered on what matters today.</p><button className="primary" onClick={onFocus}><Focus size={16} /> Return to focus</button></div>;
}

function EmptyFocus({ onExit, onNewTask }: { onExit: () => void; onNewTask: () => void }) {
  return <div className="focus-mode empty-focus"><header><div className="brand"><div className="brand-mark light"><span /><span /><span /></div><span>LifeOS</span></div><button onClick={onExit}><X size={16} /> Exit focus <kbd>Esc</kbd></button></header><main><section className="empty-state"><div><Focus size={28} /></div><p className="eyebrow">Nothing to focus on</p><h1>Your priorities are clear.</h1><p>You deleted every priority, and LifeOS respected it. Add a new one when you’re ready to choose the next lane.</p><button className="primary" onClick={onNewTask}><Plus size={16} /> Add priority</button></section></main></div>;
}

function TaskWorkspace({ task, tasks, projects, classes, onExit, onSwitch, onUpdate, onFocus, onMarkDone, onDelete }: { task: Task; tasks: Task[]; projects: Project[]; classes: ClassRecord[]; onExit: () => void; onSwitch: (id: number) => void; onUpdate: (updates: Partial<Task>) => void; onFocus: () => void; onMarkDone: () => void; onDelete: () => void }) {
  const [taskFilter, setTaskFilter] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { createBreakdown, loading: breakdownLoading, error: breakdownError } = useTaskBreakdown();
  const checklist = task.checklist ?? [];
  const checklistProgress = checklist.map((_, index) => task.checklistProgress?.[index] ?? false);
  const customProperties = task.customProperties ?? [];
  const status = getTaskStatus(task);
  const dateValue = /^\d{4}-\d{2}-\d{2}$/.test(task.due) ? task.due : "";
  const visibleTasks = tasks.filter(item => `${item.title} ${item.project}`.toLowerCase().includes(taskFilter.toLowerCase()));
  const spaceValue = task.classId ? `class:${task.classId}` : task.project !== "Inbox" ? `project:${task.project}` : "";

  const updateSpace = (value: string) => {
    if (value.startsWith("class:")) {
      const classId = value.slice(6);
      const nextClass = classes.find(item => item.id === classId);
      onUpdate({ classId, project: "Inbox", color: nextClass?.color ?? task.color, academicType: task.academicType ?? "Assignment" });
      return;
    }
    if (value.startsWith("project:")) {
      const projectName = value.slice(8);
      const project = projects.find(item => item.name === projectName);
      onUpdate({ classId: undefined, project: projectName, color: project?.color ?? "#625af6" });
      return;
    }
    onUpdate({ classId: undefined, project: "Inbox", color: "#625af6" });
  };
  const updateChecklistItem = (index: number, value: string) => {
    onUpdate({ checklist: checklist.map((item, itemIndex) => itemIndex === index ? value : item) });
  };
  const toggleChecklistItem = (index: number) => {
    onUpdate({ checklistProgress: checklistProgress.map((value, itemIndex) => itemIndex === index ? !value : value) });
  };
  const removeChecklistItem = (index: number) => {
    onUpdate({
      checklist: checklist.filter((_, itemIndex) => itemIndex !== index),
      checklistProgress: checklistProgress.filter((_, itemIndex) => itemIndex !== index),
    });
  };
  const moveChecklistItem = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= checklist.length) return;
    const nextChecklist = [...checklist];
    const nextProgress = [...checklistProgress];
    [nextChecklist[index], nextChecklist[destination]] = [nextChecklist[destination], nextChecklist[index]];
    [nextProgress[index], nextProgress[destination]] = [nextProgress[destination], nextProgress[index]];
    onUpdate({ checklist: nextChecklist, checklistProgress: nextProgress });
  };
  const updateCustomProperty = (id: string, updates: Partial<TaskProperty>) => {
    onUpdate({ customProperties: customProperties.map(property => property.id === id ? { ...property, ...updates } : property) });
  };
  const addAiChecklist = async () => {
    const steps = await createBreakdown({ title: task.title, notes: task.notes, focusMinutes: task.focusMinutes, energy: task.energy });
    if (!steps) return;
    onUpdate({ checklist: [...checklist, ...steps], checklistProgress: [...checklistProgress, ...steps.map(() => false)] });
  };

  return <motion.div className="task-workspace" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
    <header className="task-page-topbar">
      <button className="task-page-back" onClick={onExit}><ArrowRight size={15} /> Back to LifeOS</button>
      <div className="task-page-save"><i /> Autosave on</div>
      {status !== "Done" && <button className="task-page-done" onClick={onMarkDone}><CheckCircle2 size={15} /> Mark as done</button>}
      <button className="task-page-focus" onClick={onFocus} disabled={status === "Canceled" || status === "Done"}><Focus size={15} /> Start focus</button>
      <button className="task-page-close" onClick={onExit} aria-label="Close task page"><X size={18} /></button>
    </header>
    <main className="task-page-shell">
      <section className="task-page-main">
        <div className="task-page-icon" style={{ color: task.color, background: `${task.color}16` }}><CheckCircle2 size={27} /></div>
        <textarea className="task-page-title" aria-label="Task name" value={task.title} onChange={event => onUpdate({ title: event.target.value })} rows={1} placeholder="Untitled task" />
        <p className="task-page-hint">Everything here belongs to this task and syncs with your LifeOS.</p>

        <section className="task-properties">
          <h2>Properties</h2>
          <div className="task-property-grid">
            <label><span><Circle size={14} /> Status</span><select value={status} onChange={event => onUpdate({ status: event.target.value as TaskStatus })}>{(["Not started", "In progress", "Waiting", "Blocked", "Done", "Canceled"] as TaskStatus[]).map(value => <option key={value}>{value}</option>)}</select></label>
            <label><span><LayoutGrid size={14} /> Space</span><select value={spaceValue} onChange={event => updateSpace(event.target.value)}><option value="">Inbox / no space</option>{classes.length > 0 && <optgroup label="Classes">{classes.map(item => <option key={item.id} value={`class:${item.id}`}>{item.code} — {item.name}</option>)}</optgroup>}{projects.length > 0 && <optgroup label="Projects & maintenance">{projects.map(project => <option key={project.name} value={`project:${project.name}`}>{project.name}</option>)}</optgroup>}</select></label>
            <label><span><CalendarDays size={14} /> Due date</span><input type="date" value={dateValue} onChange={event => onUpdate({ due: event.target.value })} /></label>
            <label><span><Clock3 size={14} /> Start time</span><input type="time" value={task.startTime ?? ""} onChange={event => onUpdate({ startTime: event.target.value })} /></label>
            <label><span><Flame size={14} /> Priority</span><select value={task.priority} onChange={event => onUpdate({ priority: event.target.value as Task["priority"] })}><option>High</option><option>Medium</option><option>Low</option></select></label>
            <label><span><TimerReset size={14} /> Focus estimate</span><div className="task-number-field"><input type="number" min={5} max={240} step={5} value={task.focusMinutes} onChange={event => onUpdate({ focusMinutes: Math.max(5, Math.min(240, Number(event.target.value) || 5)) })} /><em>minutes</em></div></label>
            <label><span><Zap size={14} /> Energy</span><select value={task.energy} onChange={event => onUpdate({ energy: event.target.value as EnergyLevel })}><option>Low</option><option>Medium</option><option>High</option></select></label>
            <label><span><RefreshCw size={14} /> Repeat</span><select value={task.recurringDays ?? 0} onChange={event => onUpdate({ recurringDays: Number(event.target.value) || undefined })}><option value={0}>Does not repeat</option><option value={7}>Every week</option><option value={14}>Every 2 weeks</option><option value={30}>Every month</option></select></label>
            <label><span><Bell size={14} /> Follow up</span><input type="date" value={task.followUpDate ?? ""} onChange={event => onUpdate({ followUpDate: event.target.value || undefined, status: event.target.value ? "Waiting" : task.status })} /></label>
          </div>
        </section>

        <section className="task-next-action"><div className="task-section-heading"><div><h2>Next visible step</h2><p>Make returning to this task frictionless.</p></div><Focus size={18} /></div><input value={task.nextAction ?? ""} onChange={event => onUpdate({ nextAction: event.target.value, handoffNote: event.target.value })} placeholder="Open the course page and finish lesson 2…" /></section>

        {task.classId && <section className="task-academic-properties">
          <div className="task-section-heading"><div><h2>University details</h2><p>The stuff that actually matters when deadlines start stacking up.</p></div><GraduationCap size={18} /></div>
          <div className="task-property-grid">
            <label><span><BookOpen size={14} /> Work type</span><select value={task.academicType ?? "Assignment"} onChange={event => onUpdate({ academicType: event.target.value as AcademicItemType })}>{(["Assignment", "Project", "Exam", "Quiz", "Lab", "Reading", "Discussion"] as AcademicItemType[]).map(value => <option key={value}>{value}</option>)}</select></label>
            <label><span><Flame size={14} /> Grade weight</span><div className="task-number-field"><input type="number" min={0} max={100} step={0.5} value={task.gradeWeight ?? ""} placeholder="0" onChange={event => onUpdate({ gradeWeight: event.target.value === "" ? undefined : Math.max(0, Math.min(100, Number(event.target.value))) })} /><em>%</em></div></label>
            {(task.academicType === "Quiz" || task.academicType === "Exam") && <><label><span><BookOpen size={14} /> Total points</span><input type="number" min={1} step={0.5} value={task.pointsPossible ?? ""} placeholder="100" onChange={event => onUpdate({ pointsPossible: event.target.value === "" ? undefined : Math.max(0, Number(event.target.value)) })} /></label><label><span><CheckCircle2 size={14} /> Points earned</span><input type="number" min={0} max={task.pointsPossible} step={0.5} value={task.pointsEarned ?? ""} placeholder="Add after grading" onChange={event => onUpdate({ pointsEarned: event.target.value === "" ? undefined : Math.max(0, Math.min(task.pointsPossible ?? Infinity, Number(event.target.value))) })} /></label>{task.pointsPossible && <div className="academic-points-summary">{task.pointsEarned === undefined ? `${task.pointsPossible} points possible` : `${task.pointsEarned}/${task.pointsPossible} points · ${((task.pointsEarned / task.pointsPossible) * 100).toFixed(1)}%`}</div>}</>}
            <label className="academic-submission-field"><span><ExternalLink size={14} /> Submission / LMS</span><input value={task.submission ?? ""} onChange={event => onUpdate({ submission: event.target.value })} placeholder="Canvas link, room, professor email…" /></label>
          </div>
        </section>}

        <section className="task-custom-properties">
          <div className="task-section-heading"><div><h2>Custom properties</h2><p>Add whatever this task needs: owner, link, context, location, outcome — your call.</p></div><button onClick={() => onUpdate({ customProperties: [...customProperties, { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, name: "New property", value: "" }] })}><Plus size={14} /> Add property</button></div>
          {customProperties.length ? <div className="custom-property-list">{customProperties.map(property => <div key={property.id}><input aria-label="Property name" value={property.name} onChange={event => updateCustomProperty(property.id, { name: event.target.value })} /><input aria-label={`${property.name} value`} value={property.value} onChange={event => updateCustomProperty(property.id, { value: event.target.value })} placeholder="Empty" /><button aria-label={`Delete ${property.name}`} onClick={() => onUpdate({ customProperties: customProperties.filter(item => item.id !== property.id) })}><Trash2 size={14} /></button></div>)}</div> : <div className="task-inline-empty">No custom properties yet.</div>}
        </section>

        <section className="task-notes-section">
          <div className="task-section-heading"><div><h2>Notes</h2><p>Brain dump, links, decisions, rough drafts, or the exact next move.</p></div><FileText size={18} /></div>
          <textarea value={task.notes ?? ""} onChange={event => onUpdate({ notes: event.target.value })} placeholder="Start writing…" aria-label="Task notes" />
        </section>

        <section className="task-page-checklist">
          <div className="task-section-heading"><div><h2>Checklist</h2><p>These steps also appear inside the focus session.</p></div><div style={{ display: "flex", gap: "8px" }}><button onClick={addAiChecklist} disabled={breakdownLoading}><Sparkles size={14} /> {breakdownLoading ? "Making steps…" : "Break into steps"}</button><button onClick={() => onUpdate({ checklist: [...checklist, "New step"], checklistProgress: [...checklistProgress, false] })}><Plus size={14} /> Add step</button></div></div>
          {breakdownError && <p style={{ color: "#cf625a", fontSize: "12px", margin: "0 0 12px" }}>{breakdownError}</p>}
          {checklist.length ? <div className="task-page-checklist-list">{checklist.map((item, index) => <div className={checklistProgress[index] ? "checked" : ""} key={`${index}-${item}`}>
            <button className="task-page-check" aria-label={checklistProgress[index] ? "Mark incomplete" : "Mark complete"} onClick={() => toggleChecklistItem(index)}>{checklistProgress[index] && <Check size={13} />}</button>
            <input value={item} onChange={event => updateChecklistItem(index, event.target.value)} aria-label={`Checklist step ${index + 1}`} />
            <div className="task-step-order"><button disabled={index === 0} onClick={() => moveChecklistItem(index, -1)} aria-label="Move step up">↑</button><button disabled={index === checklist.length - 1} onClick={() => moveChecklistItem(index, 1)} aria-label="Move step down">↓</button></div>
            <button className="task-step-delete" onClick={() => removeChecklistItem(index)} aria-label={`Delete ${item}`}><Trash2 size={14} /></button>
          </div>)}</div> : <div className="task-inline-empty">No steps yet. Add one when the next move becomes clear.</div>}
        </section>

        <section className="task-danger-zone">
          {!confirmDelete ? <button onClick={() => setConfirmDelete(true)}><Trash2 size={14} /> Delete task</button> : <div><span>This permanently deletes the task.</span><button onClick={() => setConfirmDelete(false)}>Keep it</button><button className="confirm-delete" onClick={onDelete}>Yes, delete</button></div>}
        </section>
      </section>

      <aside className="task-page-switcher">
        <div><p>SWITCH TASK</p><strong>{tasks.length} tasks</strong></div>
        <div className="task-switch-search"><Search size={14} /><input value={taskFilter} onChange={event => setTaskFilter(event.target.value)} placeholder="Find a task…" /></div>
        <div className="task-switch-list">{visibleTasks.map(item => <button key={item.id} className={item.id === task.id ? "active" : ""} onClick={() => { setConfirmDelete(false); onSwitch(item.id); }}><i style={{ background: item.color }} /><span><strong>{item.title || "Untitled task"}</strong><small>{item.project} · {getTaskStatus(item)}</small></span>{item.id === task.id && <Check size={14} />}</button>)}</div>
      </aside>
    </main>
  </motion.div>;
}

function FullscreenProject({ project, tasks, onExit, linkTask, onOpenTask }: { project: Project; tasks: Task[]; onExit: () => void; linkTask: (id: number, project: Project) => void; onOpenTask: (id: number) => void }) {
  const linkedTasks = tasks.filter(task => task.project === project.name);
  const activeTasks = linkedTasks.filter(task => !task.done && !task.canceled);
  const availableTasks = tasks.filter(task => task.project !== project.name && !task.done && !task.canceled);
  const topTask = [...activeTasks].sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority])[0];
  const nextDue = [...activeTasks].sort((a, b) => dueRank(a.due) - dueRank(b.due))[0];
  return <div style={{ minHeight: "100vh", background: "var(--canvas)", display: "flex", flexDirection: "column" }}>
    <div style={{ height: "65px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", padding: "0 38px", gap: "16px" }}>
      <button onClick={onExit} style={{ border: "1px solid var(--line)", background: "var(--panel)", cursor: "pointer", borderRadius: "8px", padding: "8px 12px", fontSize: "11px", display: "flex", alignItems: "center", gap: "6px" }}><ArrowRight size={14} style={{ transform: "rotate(180deg)" }} /> Back</button>
      <h1 style={{ margin: 0, fontSize: "24px", flex: 1 }}>{project.name}</h1>
      <span style={{ fontSize: "12px", color: "var(--muted)" }}>{project.kind === "maintenance" ? "Maintenance system" : "Finishable project"}</span>
    </div>
    <div style={{ flex: 1, overflow: "auto", padding: "32px 48px" }}>
      <div style={{ maxWidth: "1000px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "32px" }}>
          <div style={{ border: "1px solid var(--line)", borderRadius: "12px", padding: "16px", background: "var(--panel)" }}>
            <span style={{ display: "block", color: "var(--muted)", fontSize: "9px", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: "8px" }}>Next due</span>
            <strong style={{ fontSize: "14px" }}>{nextDue?.due ?? "Nothing due"}</strong>
          </div>
          <div style={{ border: "1px solid var(--line)", borderRadius: "12px", padding: "16px", background: "var(--panel)" }}>
            <span style={{ display: "block", color: "var(--muted)", fontSize: "9px", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: "8px" }}>Highest priority</span>
            <strong style={{ fontSize: "14px" }}>{topTask?.priority ?? "Clear"}</strong>
          </div>
          <div style={{ border: "1px solid var(--line)", borderRadius: "12px", padding: "16px", background: "var(--panel)" }}>
            <span style={{ display: "block", color: "var(--muted)", fontSize: "9px", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: "8px" }}>Energy load</span>
            <strong style={{ fontSize: "14px" }}>{topTask ? `${topTask.energy} · ${topTask.focusMinutes}m` : "Clear"}</strong>
          </div>
        </div>
        <div style={{ border: "1px solid var(--line)", borderRadius: "12px", overflow: "hidden", marginBottom: "32px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 80px 105px", gap: "10px", alignItems: "center", background: "var(--canvas)", padding: "10px 12px", color: "var(--muted)", fontSize: "8px", textTransform: "uppercase", letterSpacing: ".08em", borderBottom: "1px solid var(--line)" }}>
            <span>Task</span><span>Due</span><span>Priority</span><span>Focus</span>
          </div>
          {linkedTasks.length ? linkedTasks.map(task => <div key={task.id} style={{ display: "grid", gridTemplateColumns: "1fr 90px 80px 105px", gap: "10px", alignItems: "center", padding: "12px", borderTop: "1px solid var(--line)", opacity: task.done || task.canceled ? 0.5 : 1 }}>
            <button onClick={() => onOpenTask(task.id)} style={{ border: 0, background: "transparent", padding: 0, textAlign: "left", fontWeight: 700, cursor: "pointer", textDecoration: task.done || task.canceled ? "line-through" : "none" }}>{task.title}</button>
            <span style={{ color: "var(--muted)" }}>{task.canceled ? "Canceled" : task.done ? "Done" : formatDueDate(task.due)}</span>
            <em style={{ fontStyle: "normal", fontSize: "8px", padding: "3px 7px", borderRadius: "10px", width: "max-content", background: task.priority === "High" ? "#cf625a15" : task.priority === "Medium" ? "#cc8a2515" : "#4f8bc415", color: task.priority === "High" ? "#cf625a" : task.priority === "Medium" ? "#cc8a25" : "#4f8bc4" }}>{task.priority}</em>
            <span style={{ color: "var(--muted)" }}>{task.focusMinutes}m · {task.energy}</span>
          </div>) : <div style={{ padding: "24px", textAlign: "center", color: "var(--muted)" }}>No tasks linked yet</div>}
        </div>
        {availableTasks.length > 0 && <div style={{ border: "1px solid var(--line)", borderRadius: "12px", padding: "16px", background: "var(--panel)" }}>
          <div style={{ marginBottom: "16px" }}>
            <strong style={{ display: "block", fontSize: "11px", marginBottom: "4px" }}>Link existing tasks</strong>
            <span style={{ color: "var(--muted)", fontSize: "9px", display: "block" }}>Pull loose tasks into {project.name}</span>
          </div>
          <div style={{ display: "grid", gap: "8px" }}>
            {availableTasks.slice(0, 10).map(task => <button key={task.id} onClick={() => linkTask(task.id, project)} style={{ border: "1px solid var(--line)", background: "var(--canvas)", borderRadius: "8px", padding: "10px", display: "grid", gridTemplateColumns: "1fr auto", gap: "10px", alignItems: "center", cursor: "pointer", textAlign: "left", fontSize: "10px" }}>
              <div>
                <strong style={{ display: "block" }}>{task.title}</strong>
                <small style={{ color: "var(--muted)", display: "block", marginTop: "4px" }}>{task.project} · {formatDueDate(task.due)} · {task.focusMinutes}m</small>
              </div>
              <em style={{ fontStyle: "normal", fontSize: "8px", padding: "3px 7px", borderRadius: "10px", background: task.priority === "High" ? "#cf625a15" : task.priority === "Medium" ? "#cc8a2515" : "#4f8bc415", color: task.priority === "High" ? "#cf625a" : task.priority === "Medium" ? "#cc8a25" : "#4f8bc4" }}>{task.priority}</em>
            </button>)}
          </div>
        </div>}
      </div>
    </div>
  </div>;
}

function FloatingFocusDock({ task, onResume, onUpdateSession, onEnd }: { task: Task; onResume: (session: FocusSessionUpdate) => void; onUpdateSession: (session: FocusSessionUpdate) => void; onEnd: () => void }) {
  const [seconds, setSeconds] = useState(() => getTaskFocusSeconds(task));
  const [running, setRunning] = useState(Boolean(task.focusSessionRunning));
  const secondsRef = useRef(seconds);
  useEffect(() => { const next = getTaskFocusSeconds(task); setSeconds(next); secondsRef.current = next; }, [task]);
  useEffect(() => { setRunning(Boolean(task.focusSessionRunning)); }, [task.focusSessionRunning, task.id]);
  useEffect(() => { secondsRef.current = seconds; }, [seconds]);
  useEffect(() => {
    if (!running || seconds <= 0) return;
    const id = window.setInterval(() => setSeconds(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(id);
  }, [running, seconds]);
  useEffect(() => {
    if (seconds <= 0 && running) {
      setRunning(false);
      onUpdateSession({ remainingSeconds: 0, hasStarted: true, isRunning: false, halfwayPrompted: Boolean(task.focusHalfwayPrompted) });
      return;
    }
    if (running && seconds > 0 && seconds % 15 === 0) onUpdateSession({ remainingSeconds: seconds, hasStarted: true, isRunning: true, halfwayPrompted: Boolean(task.focusHalfwayPrompted) });
  }, [onUpdateSession, running, seconds, task.focusHalfwayPrompted]);
  const toggleRunning = () => {
    const next = !running;
    setRunning(next);
    onUpdateSession({ remainingSeconds: secondsRef.current, hasStarted: true, isRunning: next, halfwayPrompted: Boolean(task.focusHalfwayPrompted) });
  };
  return <motion.aside className="floating-focus-dock" aria-label={running ? "Focus session continues" : "Focus session paused"} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 18 }} transition={{ duration: .2 }}><span className="floating-focus-orb"><Focus size={16} /></span><div className="floating-focus-copy"><small>{running ? "FOCUS CONTINUES" : "FOCUS PAUSED"}</small><strong>{task.title}</strong><span>{formatFocusTime(seconds)} left · your notes are safe</span></div><button className="floating-focus-resume" onClick={() => onResume({ remainingSeconds: secondsRef.current, hasStarted: true, isRunning: running, halfwayPrompted: Boolean(task.focusHalfwayPrompted) })}><Focus size={15} /> Open focus</button><button className="floating-focus-toggle" aria-label={running ? "Pause focus session" : "Continue focus session"} onClick={toggleRunning}>{running ? <Circle size={15} fill="currentColor" /> : <Focus size={15} />}</button><button className="floating-focus-end" aria-label="End this focus session" onClick={onEnd}><X size={17} /></button></motion.aside>;
}

function playFocusCue(frequency: number, duration = 0.12, volume = 0.04) {
  if (typeof window === "undefined") return;
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.value = volume;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
    window.setTimeout(() => { void ctx.close(); }, (duration + 0.1) * 1000);
  } catch {
    /* optional audio */
  }
}

function FocusMode({ task, tasks, soundEffectsEnabled, onUpdateNotes, onSwitch, onUpdateChecklist, onUpdateChecklistProgress, onUpdateFocusSession, onComplete, onExit }: { task: Task; tasks: Task[]; soundEffectsEnabled: boolean; onUpdateNotes: (id: number, notes: string) => void; onSwitch: (id: number) => void; onUpdateChecklist: (id: number, checklist: string[]) => void; onUpdateChecklistProgress: (id: number, progress: boolean[]) => void; onUpdateFocusSession: (id: number, session: FocusSessionUpdate) => void; onComplete: (id: number) => void; onExit: (destination?: View) => void }) {
  const totalSeconds = task.focusMinutes * 60;
  const savedSeconds = getTaskFocusSeconds(task);
  const [seconds, setSeconds] = useState(savedSeconds);
  const [running, setRunning] = useState(Boolean(task.focusSessionRunning));
  const [hasStarted, setHasStarted] = useState(Boolean(task.focusSessionStarted) || savedSeconds < totalSeconds);
  const [halfwayPrompted, setHalfwayPrompted] = useState(Boolean(task.focusHalfwayPrompted));
  const [breakStage, setBreakStage] = useState<"hidden" | "suggested" | "running">("hidden");
  const [breakSeconds, setBreakSeconds] = useState(5 * 60);
  const [checklist, setChecklist] = useState<string[]>(task.checklist ?? []);
  const nextChecklist = task.checklist ?? [];
  const [checks, setChecks] = useState<boolean[]>(() => task.checklistProgress?.length === nextChecklist.length ? task.checklistProgress : nextChecklist.map(() => false));
  const [focusNotes, setFocusNotes] = useState(task.notes ?? "");
  const [sounds, setSounds] = useState(false);
  const noiseRef = useRef<{ context: AudioContext | null; source: AudioBufferSourceNode | null; gain: GainNode | null }>({ context: null, source: null, gain: null });
  const secondsRef = useRef(seconds);
  const hasStartedRef = useRef(hasStarted);
  const runningRef = useRef(running);
  const halfwayPromptedRef = useRef(halfwayPrompted);
  useEffect(() => { secondsRef.current = seconds; }, [seconds]);
  useEffect(() => { hasStartedRef.current = hasStarted; }, [hasStarted]);
  useEffect(() => { runningRef.current = running; }, [running]);
  useEffect(() => { halfwayPromptedRef.current = halfwayPrompted; }, [halfwayPrompted]);
  const saveFocusSession = useCallback((remainingSeconds = seconds, started = hasStarted, prompted = halfwayPrompted, isRunning = running) => {
    onUpdateFocusSession(task.id, { remainingSeconds, hasStarted: started, isRunning, halfwayPrompted: prompted });
  }, [hasStarted, halfwayPrompted, onUpdateFocusSession, running, seconds, task.id]);
  useEffect(() => () => {
    onUpdateFocusSession(task.id, {
      remainingSeconds: secondsRef.current,
      hasStarted: hasStartedRef.current,
      isRunning: runningRef.current,
      halfwayPrompted: halfwayPromptedRef.current,
    });
  }, [onUpdateFocusSession, task.id]);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setSeconds(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(id);
  }, [running]);
  useEffect(() => {
    if (!running || seconds <= 0 || seconds % 15 !== 0) return;
    saveFocusSession(seconds, true, halfwayPrompted, true);
  }, [halfwayPrompted, running, saveFocusSession, seconds]);
  useEffect(() => {
    if (seconds !== 0 || !hasStarted) return;
    setRunning(false);
    saveFocusSession(0, true, halfwayPrompted, false);
  }, [halfwayPrompted, hasStarted, saveFocusSession, seconds]);
  useEffect(() => {
    const breakEligible = task.focusMinutes >= 30 && task.focusMinutes <= 40;
    if (!breakEligible || halfwayPrompted || !running || seconds > Math.floor(totalSeconds / 2) || seconds <= 0) return;
    setRunning(false);
    setHalfwayPrompted(true);
    saveFocusSession(seconds, true, true, false);
    setBreakStage("suggested");
  }, [halfwayPrompted, running, saveFocusSession, seconds, task.focusMinutes, totalSeconds]);
  useEffect(() => {
    if (breakStage !== "running" || breakSeconds <= 0) return;
    const id = window.setInterval(() => setBreakSeconds(value => value - 1), 1000);
    return () => window.clearInterval(id);
  }, [breakStage, breakSeconds]);
  useEffect(() => {
    if (breakStage !== "running" || breakSeconds !== 0) return;
    setBreakStage("hidden");
    setRunning(true);
  }, [breakStage, breakSeconds]);
  useEffect(() => { onUpdateChecklistProgress(task.id, checks); }, [checks, task.id, onUpdateChecklistProgress]);
  useEffect(() => { setFocusNotes(task.notes ?? ""); }, [task.id, task.notes]);
  useEffect(() => {
    if (!sounds || !soundEffectsEnabled) {
      noiseRef.current.source?.stop();
      noiseRef.current.source?.disconnect();
      noiseRef.current.gain?.disconnect();
      noiseRef.current.source = null;
      noiseRef.current.gain = null;
      return;
    }
    const context = noiseRef.current.context ?? new AudioContext();
    noiseRef.current.context = context;
    const bufferSize = 2 * context.sampleRate;
    const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let index = 0; index < bufferSize; index += 1) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[index] = last * 3.5;
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = context.createGain();
    gain.gain.value = 0.06;
    source.connect(gain);
    gain.connect(context.destination);
    source.start();
    noiseRef.current.source = source;
    noiseRef.current.gain = gain;
    return () => {
      source.stop();
      source.disconnect();
      gain.disconnect();
      noiseRef.current.source = null;
      noiseRef.current.gain = null;
    };
  }, [soundEffectsEnabled, sounds]);
  useEffect(() => () => {
    noiseRef.current.source?.stop();
    void noiseRef.current.context?.close();
  }, []);
  const saveChecklist = (next: string[]) => {
    setChecklist(next);
    setChecks(current => next.map((_, index) => current[index] ?? false));
    onUpdateChecklist(task.id, next);
  };
  const switchChecklist = (templateName: string) => {
    const template = focusChecklistTemplates.find(item => item.name === templateName);
    if (!template) return;
    setChecklist(template.items);
    setChecks(template.items.map(() => false));
    onUpdateChecklist(task.id, template.items);
  };
  const activeTemplateName = focusChecklistTemplates.find(template => template.items.length === checklist.length && template.items.every((item, index) => item === checklist[index]))?.name ?? "Custom";
  const updateChecklistItem = (index: number, value: string) => saveChecklist(checklist.map((item, itemIndex) => itemIndex === index ? value : item));
  const addChecklistItem = () => saveChecklist([...checklist, ""]);
  const deleteChecklistItem = (index: number) => saveChecklist(checklist.filter((_, itemIndex) => itemIndex !== index));
  const switchTask = useCallback((id: number) => {
    if (id === task.id) return;
    saveFocusSession(secondsRef.current, hasStartedRef.current, halfwayPromptedRef.current, runningRef.current);
    setRunning(false);
    setBreakStage("hidden");
    onSwitch(id);
  }, [onSwitch, saveFocusSession, task.id]);
  const switchBy = useCallback((offset: number) => {
    const current = tasks.findIndex(item => item.id === task.id);
    const next = (current + offset + tasks.length) % tasks.length;
    switchTask(tasks[next].id);
  }, [switchTask, task.id, tasks]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName || "")) return;
      if (!(event.getModifierState("Fn") || ((event.metaKey || event.ctrlKey) && event.shiftKey))) return;
      if (event.key.toLowerCase() === "j") switchBy(1);
      if (event.key.toLowerCase() === "k") switchBy(-1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [switchBy]);
  const time = formatFocusTime(seconds);
  const breakTime = `${String(Math.floor(breakSeconds / 60)).padStart(2, "0")}:${String(breakSeconds % 60).padStart(2, "0")}`;
  useEffect(() => {
    if (hasStarted) document.title = `${time} · ${task.title}`;
    return () => { document.title = "LifeOS"; };
  }, [hasStarted, task.title, time]);
  const completedSteps = checks.filter(Boolean).length;
  const totalSteps = Math.max(1, checklist.length);
  const resumeFocus = () => { setBreakStage("hidden"); setRunning(true); };
  const toggleTimer = () => {
    if (running) {
      setRunning(false);
      saveFocusSession(seconds, true, halfwayPrompted, false);
      return;
    }
    setHasStarted(true);
    hasStartedRef.current = true;
    setRunning(true);
    saveFocusSession(seconds, true, halfwayPrompted, true);
    if (soundEffectsEnabled) playFocusCue(440);
  };
  const resetTimer = () => {
    setSeconds(totalSeconds);
    secondsRef.current = totalSeconds;
    setRunning(false);
    setHasStarted(false);
    hasStartedRef.current = false;
    setHalfwayPrompted(false);
    halfwayPromptedRef.current = false;
    setBreakStage("hidden");
    setBreakSeconds(5 * 60);
    saveFocusSession(totalSeconds, false, false, false);
  };
  const exitFocus = (destination?: View) => {
    saveFocusSession();
    onExit(destination);
  };
  return <motion.div className={`focus-mode focus-studio ${hasStarted ? "session-active" : ""}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
    <AnimatePresence>{breakStage !== "hidden" && <motion.div className="focus-break-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.div className="focus-break-card" initial={{ scale: .96, y: 12 }} animate={{ scale: 1, y: 0 }}>
      {breakStage === "suggested" ? <><div className="focus-break-icon"><Coffee size={22} /></div><p className="eyebrow">HALFWAY CHECK-IN</p><h2>You’ve earned a quick reset.</h2><p>You’re halfway through this {task.focusMinutes}-minute focus. Take five minutes to stand up, drink water, stretch, or take meds if they’re due.</p><div className="focus-break-actions"><button onClick={resumeFocus}>Keep going</button><button className="take-break" onClick={() => { setBreakSeconds(5 * 60); setBreakStage("running"); }}><Coffee size={15} /> Take a 5-minute break</button></div></> : <><div className="focus-break-countdown"><strong>{breakTime}</strong><span>5-minute reset</span></div><p className="eyebrow">BREAK IN PROGRESS</p><h2>Step away. LifeOS has the time.</h2><p>Your focus timer is paused. When this reaches zero, your session resumes automatically.</p><div className="focus-break-actions"><button onClick={resumeFocus}>Return to focus early</button></div></>}
    </motion.div></motion.div>}</AnimatePresence>
    <header><div className="brand"><div className="brand-mark light"><span /><span /><span /></div><span>LifeOS</span></div><span className="focus-label"><i /> {running ? "In a focus session" : hasStarted ? "Paused — your time is saved" : "Ready when you are"}</span><div className="focus-top-actions"><button className="focus-note-link" onClick={() => exitFocus("Library")}><NotebookPen size={15} /> Take notes</button><button onClick={() => exitFocus()}><X size={16} /> Exit <kbd>Esc</kbd></button></div></header>
    <main>
      <section className="focus-main"><div className="focus-hero"><p className="focus-project"><i style={{ background: task.color }} />{task.project} <span>·</span> {task.focusMinutes} min <span>·</span> {task.energy} energy</p><h1>{task.title}</h1><p className="focus-sub">{running ? "One gentle pass. You don’t need to do the whole thing at once." : "Choose a tiny next step, then press start when you’re ready."}</p></div>
        <div className="checklist"><div className="checklist-head"><span>SESSION CHECKLIST</span><div><label htmlFor="checklist-template">Switch checklist</label><select id="checklist-template" value={activeTemplateName} onChange={event => switchChecklist(event.target.value)}><option value="Custom" disabled>Custom checklist</option>{focusChecklistTemplates.map(template => <option key={template.name} value={template.name}>{template.name}</option>)}</select><button type="button" onClick={addChecklistItem}><Plus size={13} /> Add step</button></div></div>{checklist.length ? checklist.map((item, i) => <div className={`checklist-row ${checks[i] ? "checked" : ""}`} key={`${task.id}-${i}`}><button type="button" className="check-toggle" aria-label={`Toggle ${item}`} onClick={() => setChecks(current => current.map((value, index) => index === i ? !value : value))}>{checks[i] && <Check size={14} />}</button><input autoFocus={i === checklist.length - 1} value={item} placeholder="Write the next tiny step…" onChange={event => updateChecklistItem(i, event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); addChecklistItem(); } }} /><button type="button" className="delete-step" aria-label={`Delete ${item || "step"}`} onClick={() => deleteChecklistItem(i)}><Trash2 size={13} /></button></div>) : <div className="empty-checklist"><strong>No steps yet.</strong><button type="button" onClick={addChecklistItem}><Plus size={13} /> Add the first step</button></div>}</div>
        <div className="notes"><span>NOTES</span><textarea value={focusNotes} onChange={event => setFocusNotes(event.target.value)} onBlur={() => onUpdateNotes(task.id, focusNotes.trim())} placeholder="Keep any thoughts here while you work…" /></div>
      </section>
      <aside className={`timer-panel ${hasStarted ? "running" : ""}`}><span>{running ? "FOCUS IN PROGRESS" : hasStarted ? "FOCUS PAUSED" : "YOUR TIME"}</span><div className="timer-ring" style={{ "--progress": `${(seconds / totalSeconds) * 360}deg` } as React.CSSProperties}><div><strong>{time}</strong><span>{running ? "Stay with this one thing" : `${task.focusMinutes} minute session`}</span></div></div><button className="timer-button" onClick={toggleTimer}>{running ? <><Circle size={15} fill="currentColor" /> Pause & save</> : <><Focus size={16} /> {hasStarted ? "Resume focus" : "Start focus"}</>}</button><button className="reset" onClick={resetTimer}><TimerReset size={15} /> Reset to {task.focusMinutes}:00</button>
        <div className="focus-switcher"><div><span>SWITCH TASK</span><small><kbd>K</kbd><kbd>J</kbd></small></div><div className="switch-list">{tasks.filter(item => !item.done && !item.canceled).map(item => { const remaining = getTaskFocusSeconds(item); const hasProgress = Boolean(item.focusSessionStarted) || remaining < item.focusMinutes * 60; return <button key={item.id} className={item.id === task.id ? "active" : ""} onClick={() => switchTask(item.id)}><i style={{ background: item.color }} /><span><strong>{item.title}</strong>{hasProgress && <small>{formatFocusTime(remaining)} left</small>}</span>{item.id === task.id && <Check size={13} />}</button>; })}</div><div className="switch-arrows"><button onClick={() => switchBy(-1)}>← Previous</button><button onClick={() => switchBy(1)}>Next →</button></div></div>
        <div className="music"><Music2 size={17} /><div><strong>Focus sounds</strong><span>{!soundEffectsEnabled ? "Enable sound effects in Settings" : sounds ? "Brown noise on" : "Sounds are off"}</span></div><button aria-label="Toggle focus sounds" disabled={!soundEffectsEnabled} onClick={() => setSounds(value => !value)}>{sounds ? <Check size={15} /> : <Plus size={15} />}</button></div>
        <button className="mark-done-button" onClick={() => { if (soundEffectsEnabled) playFocusCue(660, 0.16); onComplete(task.id); setTimeout(() => onExit(), 300); }}><CheckCircle2 size={16} /> Mark as done</button>
      </aside>
    </main>
    <footer><span>Session progress</span><div><i style={{ width: `${completedSteps / totalSteps * 100}%` }} /></div><strong>{completedSteps} of {checklist.length} complete</strong></footer>
  </motion.div>;
}

function CommandPalette({ query, setQuery, results, close, go, onFocus, onCapture, onNewTask, onResult }: { query: string; setQuery: (s: string) => void; results: string[]; close: () => void; go: (v: View) => void; onFocus: () => void; onCapture: () => void; onNewTask: () => void; onResult: (result: string) => void }) {
  return <motion.div className="modal-layer" onMouseDown={close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.div className="command-modal" onMouseDown={e => e.stopPropagation()} initial={{ scale: .98, y: -10 }} animate={{ scale: 1, y: 0 }}><div className="command-input"><Search size={20} /><input autoFocus placeholder="Find anything in LifeOS…" value={query} onChange={e => setQuery(e.target.value)} /><kbd>ESC</kbd></div><div className="command-results">{!query && <><p>QUICK ACTIONS</p><button onClick={onFocus}><span className="command-icon"><Focus size={16} /></span><span>Start focus session</span><kbd>F</kbd></button><button onClick={onCapture}><span className="command-icon"><Brain size={16} /></span><span>Capture a thought</span><kbd>B</kbd></button><button onClick={onNewTask}><span className="command-icon"><Plus size={16} /></span><span>Create new task</span><kbd>N</kbd></button></>}{query && <p>RESULTS</p>}{results.slice(0, 7).map(result => <button key={result} onClick={() => { if (nav.some(n => n.name === result)) { go(result as View); close(); } else onResult(result); }}><span className="command-icon">{nav.some(n => n.name === result) ? <Command size={16} /> : <Search size={16} />}</span><span>{result}</span><ArrowRight size={14} /></button>)}</div><footer><span><kbd>/</kbd> Find</span><span><kbd>↵</kbd> Open</span><span>LifeOS Search</span></footer></motion.div></motion.div>;
}

function AmbientStartModal({ close, start, spaces, draft }: { close: () => void; start: (title: string, space?: { name: string; color: string }) => void; spaces: { name: string; color: string }[]; draft: AmbientDraft }) {
  const [title, setTitle] = useState(draft?.title || "");
  const [spaceName, setSpaceName] = useState<string | null>(draft?.spaceName || null);
  const visibleSpaces = [...spaces].sort((a, b) => (a.name === "Career" ? -1 : b.name === "Career" ? 1 : a.name.localeCompare(b.name))).slice(0, 6);
  const selectedSpace = visibleSpaces.find(space => space.name === spaceName);
  const pick = (nextTitle: string, space?: { name: string; color: string }) => {
    setTitle(nextTitle);
    setSpaceName(space?.name ?? null);
  };
  return <motion.div className="modal-layer" onMouseDown={close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.form className="capture-modal ambient-modal" onMouseDown={event => event.stopPropagation()} onSubmit={event => { event.preventDefault(); start(title, selectedSpace); }} initial={{ scale: .98, y: 8 }} animate={{ scale: 1, y: 0 }}><div className="capture-head"><div className="brain-dot"><TimerReset size={16} /></div><div><strong>{draft ? "LifeOS noticed " + draft.sourceLabel : "What are you doing?"}</strong><span>{draft ? "Want to start a Career activity? Nothing is saved until you say so." : "Start the work first. LifeOS can sort it later."}</span></div><button type="button" onClick={close} aria-label="Close"><X size={18} /></button></div><div className="ambient-quick-start"><span>QUICK START</span><div><button type="button" className={title === "Job application" ? "selected" : ""} onClick={() => pick("Job application", visibleSpaces.find(space => space.name === "Career"))}><UserRound size={14} />Job application</button><button type="button" className={title === "Replying to email" ? "selected" : ""} onClick={() => pick("Replying to email")}><Mail size={14} />Reply to email</button><button type="button" className={title === "Research" ? "selected" : ""} onClick={() => pick("Research")}><Search size={14} />Research</button></div></div>{visibleSpaces.length > 0 && <div className="ambient-space-picker"><span>WHERE DOES THIS BELONG? <em>OPTIONAL</em></span><div>{visibleSpaces.map(space => <button type="button" key={space.name} className={spaceName === space.name ? "selected" : ""} onClick={() => setSpaceName(current => current === space.name ? null : space.name)}><i style={{ background: space.color }} />{space.name}</button>)}</div></div>}<label htmlFor="ambient-title">Or type a few words</label><input id="ambient-title" autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. fixing the Synapse login" /><div className="ambient-modal-actions"><button type="button" onClick={() => start("", selectedSpace)}>Start without naming it</button><button className="primary">Start doing it <ArrowRight size={15} /></button></div><p>Nothing becomes a task until you decide it should.</p></motion.form></motion.div>;
}

function AmbientWrapupModal({ activity, close, finish }: { activity: AmbientActivity; close: () => void; finish: (outcome: "task" | "note" | "dismiss", note: string) => void }) {
  const [note, setNote] = useState("");
  return <motion.div className="modal-layer" onMouseDown={close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 1 }}><motion.div className="capture-modal ambient-modal" onMouseDown={event => event.stopPropagation()} initial={{ scale: .98, y: 8 }} animate={{ scale: 1, y: 0 }}><div className="capture-head"><div className="brain-dot"><CheckCircle2 size={16} /></div><div><strong>Nice. What should happen with this?</strong><span>{activity.title} · {formatAmbientDuration(Date.now() - new Date(activity.startedAt).getTime())}</span></div><button onClick={close} aria-label="Close"><X size={18} /></button></div><label htmlFor="ambient-note">A tiny note, if useful</label><textarea id="ambient-note" value={note} onChange={event => setNote(event.target.value)} placeholder="What did you do, or what is the next step?" /><div className="ambient-outcomes"><button onClick={() => finish("task", note)}><ListTodo size={16} /><span>Save as task</span><small>Put it in Inbox</small></button><button onClick={() => finish("note", note)}><NotebookPen size={16} /><span>Save as note</span><small>Keep the context</small></button><button onClick={() => finish("dismiss", note)}><X size={16} /><span>Let it go</span><small>Don’t save anything</small></button></div></motion.div></motion.div>;
}

function WelcomeNameModal({ suggestedName, save }: { suggestedName?: string | null; save: (name: string) => void }) {
  const [name, setName] = useState(suggestedName?.trim() || "");
  const trimmedName = name.trim();
  return <motion.div className="modal-layer welcome-name-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="presentation"><motion.form className="capture-modal welcome-name-modal" role="dialog" aria-modal="true" aria-labelledby="welcome-name-title" onSubmit={event => { event.preventDefault(); if (trimmedName) save(trimmedName); }} initial={{ scale: .98, y: 8 }} animate={{ scale: 1, y: 0 }}><div className="capture-head"><div className="brain-dot"><UserRound size={16} /></div><div><strong id="welcome-name-title">What should we call you?</strong><span>Use the name that feels right inside your LifeOS.</span></div></div><label className="welcome-name-field" htmlFor="preferred-name">YOUR NAME<input id="preferred-name" autoFocus autoComplete="name" maxLength={40} value={name} onChange={event => setName(event.target.value)} placeholder="Your name" /></label><div className="capture-footer"><span>Private to your workspace.</span><button type="submit" disabled={!trimmedName}>Continue <ArrowRight size={14} /></button></div></motion.form></motion.div>;
}

function CaptureModal({ close, add }: { close: () => void; add: (s: string) => void }) {
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
      }
    }
  }, []);

  const handleVoiceCapture = () => {
    if (!recognitionRef.current) {
      alert("Voice capture is not supported in your browser");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      return;
    }

    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.onstart = () => setIsListening(true);
    recognitionRef.current.onend = () => setIsListening(false);
    recognitionRef.current.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          setText(prev => prev + (prev ? " " : "") + transcript);
        }
      }
    };
    recognitionRef.current.onerror = () => setIsListening(false);
    recognitionRef.current.start();
  };

  return <motion.div className="modal-layer" onMouseDown={close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.div className="capture-modal" onMouseDown={e => e.stopPropagation()} initial={{ scale: .98, y: 8 }} animate={{ scale: 1, y: 0 }}><div className="capture-head"><div className="brain-dot"><Brain size={16} /></div><div><strong>Quick capture</strong><span>Send it to your Brain inbox</span></div><button onClick={close}><X size={18} /></button></div><div style={{ display: "flex", gap: "10px", alignItems: "flex-end", padding: "0 18px", marginBottom: "10px" }}><textarea autoFocus placeholder="What’s on your mind?" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && text.trim()) add(text.trim()); }} style={{ flex: 1, margin: 0, minHeight: "120px" }} /><button onClick={handleVoiceCapture} style={{ border: `1px solid ${isListening ? "var(--accent)" : "var(--line)"}`, background: isListening ? "var(--accent)" : "var(--canvas)", color: isListening ? "white" : "var(--muted)", cursor: "pointer", borderRadius: "8px", width: "44px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .2s" }} title="Voice capture"><Mic size={20} /></button></div><div className="capture-footer"><span>Organize it later. Just get it out.</span><button disabled={!text.trim()} onClick={() => text.trim() && add(text.trim())}>Capture <kbd>⌘ ↵</kbd></button></div></motion.div></motion.div>;
}

function BreakModal({ close, done }: { close: () => void; done: () => void }) {
  const [minutes, setMinutes] = useState(5);
  const [remaining, setRemaining] = useState(5 * 60);
  const [running, setRunning] = useState(false);
  const clamped = Math.min(20, Math.max(1, minutes));
  useEffect(() => {
    if (!running || remaining <= 0) return;
    const id = window.setInterval(() => setRemaining(value => value - 1), 1000);
    return () => window.clearInterval(id);
  }, [running, remaining]);
  useEffect(() => {
    if (running || remaining > 0) return;
    done();
  }, [done, remaining, running]);
  const setBreakLength = (value: number) => {
    const next = Math.min(20, Math.max(1, value));
    setMinutes(next);
    setRemaining(next * 60);
    setRunning(false);
  };
  const time = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
  return <motion.div className="modal-layer break-layer" onMouseDown={close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.div className="break-modal" onMouseDown={event => event.stopPropagation()} initial={{ scale: .98, y: 10 }} animate={{ scale: 1, y: 0 }}><div className="capture-head"><div className="brain-dot"><Coffee size={16} /></div><div><strong>I need a break rn</strong><span>Pick 1–20 minutes. No guilt, just a controlled reset.</span></div><button onClick={close} aria-label="Close"><X size={18} /></button></div><div className="break-timer"><strong>{time}</strong><span>{running ? "Break in progress" : "Ready when you are"}</span></div><div className="break-presets">{[1, 3, 5, 10, 15, 20].map(value => <button key={value} className={clamped === value ? "selected" : ""} onClick={() => setBreakLength(value)}>{value}m</button>)}</div><label htmlFor="break-length">Custom break length</label><input id="break-length" type="range" min={1} max={20} value={clamped} onChange={event => setBreakLength(Number(event.target.value))} /><div className="break-actions"><button onClick={() => setBreakLength(clamped)}><TimerReset size={15} /> Reset</button><button className="break-start" onClick={() => setRunning(value => !value)}>{running ? "Pause break" : "Start break"}</button><button onClick={done}>End now</button></div><p>Suggested: stand up, water, meds if due, bathroom, stretch, then return gently.</p></motion.div></motion.div>;
}

function LegacyCalendarEventModal({ close, add, event, remove, defaultDate }: { close: () => void; add: (event: CalendarEvent) => void; event?: CalendarEvent; remove?: (id: string) => void; defaultDate?: string | null }) {
  const now = new Date();
  const eventDay = event?.start.slice(0, 10) ?? defaultDate ?? toDateKey(now);
  const [title, setTitle] = useState(event?.title ?? "");
  const [day, setDay] = useState(eventDay);
  const [start, setStart] = useState(event?.start.slice(11, 16) ?? "09:00");
  const [end, setEnd] = useState(event?.end?.slice(11, 16) ?? "10:00");
  const [notes, setNotes] = useState(event?.notes ?? "");
  const [color, setColor] = useState(event?.color ?? "#665df6");
  const isEditing = Boolean(event);
  return <motion.div className="modal-layer" onMouseDown={close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.form className="create-modal calendar-modal" onMouseDown={modalEvent => modalEvent.stopPropagation()} onSubmit={submitEvent => { submitEvent.preventDefault(); if (!title.trim()) return; add({ id: event?.id ?? `lifeos-${Date.now()}`, title: title.trim(), start: `${day}T${start}`, end: end ? `${day}T${end}` : undefined, source: event?.source ?? "LifeOS", color, notes: notes.trim() || undefined }); }} initial={{ scale: .98, y: 8 }} animate={{ scale: 1, y: 0 }}><div className="capture-head"><div className="brain-dot" style={{ color, background: `${color}16` }}><CalendarDays size={16} /></div><div><strong>{isEditing ? "Edit calendar event" : "Add calendar event"}</strong><span>{isEditing ? "Change time, notes, color, or delete it." : "Put time on the board so your day stops being abstract."}</span></div><button type="button" onClick={close} aria-label="Close"><X size={18} /></button></div><label htmlFor="event-title">Event title</label><input id="event-title" autoFocus placeholder="What’s happening?" value={title} onChange={event => setTitle(event.target.value)} /><div className="calendar-form-grid"><label>Date<input type="date" value={day} onChange={event => setDay(event.target.value)} /></label><label>Start<input type="time" value={start} onChange={event => setStart(event.target.value)} /></label><label>End<input type="time" value={end} onChange={event => setEnd(event.target.value)} /></label></div><label htmlFor="event-notes">Notes / location</label><textarea id="event-notes" className="event-notes" placeholder="Location, link, reminder, whatever helps…" value={notes} onChange={event => setNotes(event.target.value)} /><label>Color</label><div className="calendar-color-picker">{["#665df6", "#4b8bdc", "#47a47b", "#d99b38", "#e48b6b", "#cf625a"].map(option => <button type="button" aria-label={`Use color ${option}`} className={color === option ? "selected" : ""} key={option} style={{ background: option }} onClick={() => setColor(option)} />)}</div><div className="create-actions split-actions">{isEditing && remove && <button type="button" className="danger-text" onClick={() => remove(event!.id)}><Trash2 size={14} /> Delete</button>}<button type="button" onClick={close}>Cancel</button><button className="primary" disabled={!title.trim()} type="submit">{isEditing ? "Save event" : "Add event"}</button></div></motion.form></motion.div>;
}

function CalendarEventModal({ close, add, event, remove, defaultDate, onTaskAction, taskActionLabel }: { close: () => void; add: (event: CalendarEvent) => void; event?: CalendarEvent; remove?: (id: string) => void; defaultDate?: string | null; onTaskAction?: (event: CalendarEvent) => void; taskActionLabel?: string }) {
  const now = new Date();
  const eventDay = event?.start.slice(0, 10) ?? defaultDate ?? toDateKey(now);
  const initialEndDay = event?.end?.slice(0, 10) ?? eventDay;
  const [title, setTitle] = useState(event?.title ?? "");
  const [day, setDay] = useState(eventDay);
  const [endDay, setEndDay] = useState(initialEndDay < eventDay ? eventDay : initialEndDay);
  const [start, setStart] = useState(event?.start.slice(11, 16) ?? "09:00");
  const [end, setEnd] = useState(event?.end?.slice(11, 16) ?? "10:00");
  const [notes, setNotes] = useState(event?.notes ?? "");
  const [color, setColor] = useState(event?.color ?? "#665df6");
  const isEditing = Boolean(event);
  const datesValid = endDay >= day;
  const timesValid = endDay > day || !end || end > start;
  const rangeValid = datesValid && timesValid;
  const changeStartDay = (value: string) => {
    setDay(value);
    if (endDay < value) setEndDay(value);
  };
  const submit = (submitEvent: React.FormEvent) => {
    submitEvent.preventDefault();
    if (!title.trim() || !rangeValid) return;
    add({
      id: event?.id ?? `lifeos-${Date.now()}`,
      title: title.trim(),
      start: `${day}T${start}`,
      end: end ? `${endDay}T${end}` : `${endDay}T23:59`,
      source: event?.source ?? "LifeOS",
      color,
      notes: notes.trim() || undefined,
    });
  };
  return <motion.div className="modal-layer" onMouseDown={close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <motion.form className="create-modal calendar-modal" onMouseDown={modalEvent => modalEvent.stopPropagation()} onSubmit={submit} initial={{ scale: .98, y: 8 }} animate={{ scale: 1, y: 0 }}>
      <div className="capture-head"><div className="brain-dot" style={{ color, background: `${color}16` }}><CalendarDays size={16} /></div><div><strong>{isEditing ? "Edit calendar event" : "Add calendar event"}</strong><span>{isEditing ? "Change the date range, time, notes, or color." : "One event can run across multiple days."}</span></div><button type="button" onClick={close} aria-label="Close"><X size={18} /></button></div>
      <label htmlFor="event-title">Event title</label>
      <input id="event-title" autoFocus placeholder="What’s happening?" value={title} onChange={inputEvent => setTitle(inputEvent.target.value)} />
      <div className="calendar-date-range-grid">
        <label>Starts on<input aria-label="Start date" type="date" value={day} onChange={inputEvent => changeStartDay(inputEvent.target.value)} /></label>
        <label>Ends on<input aria-label="End date" type="date" min={day} value={endDay} onChange={inputEvent => setEndDay(inputEvent.target.value)} /></label>
      </div>
      <div className="calendar-time-range-grid">
        <label>Start time<input aria-label="Start time" type="time" value={start} onChange={inputEvent => setStart(inputEvent.target.value)} /></label>
        <label>End time<input aria-label="End time" type="time" value={end} onChange={inputEvent => setEnd(inputEvent.target.value)} /></label>
      </div>
      {!rangeValid && <p className="calendar-range-error">The event needs to end after it starts.</p>}
      <label htmlFor="event-notes">Notes / location</label>
      <textarea id="event-notes" className="event-notes" placeholder="Location, link, reminder, whatever helps…" value={notes} onChange={inputEvent => setNotes(inputEvent.target.value)} />
      <label>Color</label>
      <div className="calendar-color-picker">{["#665df6", "#4b8bdc", "#47a47b", "#d99b38", "#e48b6b", "#cf625a"].map(option => <button type="button" aria-label={`Use color ${option}`} className={color === option ? "selected" : ""} key={option} style={{ background: option }} onClick={() => setColor(option)} />)}</div>
      <div className="event-form-actions">
        <div className="event-danger-action">
          {isEditing && remove && <button type="button" className="danger-text" onClick={() => remove(event!.id)}><Trash2 size={14} /> Delete event</button>}
        </div>
        <div className="event-main-actions">
          {isEditing && event && onTaskAction && <button type="button" className="event-task-action" onClick={() => onTaskAction(event)}><ListTodo size={14} /> {taskActionLabel ?? "Create task"}</button>}
          <span className="event-action-divider" aria-hidden="true" />
          <button type="button" className="event-cancel-action" onClick={close}>Cancel</button>
          <button className="primary" disabled={!title.trim() || !rangeValid} type="submit">{isEditing ? "Save event" : "Add event"}</button>
        </div>
      </div>
    </motion.form>
  </motion.div>;
}

function CalendarImportModal({ close, add }: { close: () => void; add: (events: CalendarEvent[]) => void }) {
  const [url, setUrl] = useState("");
  const [ics, setIcs] = useState("");
  const [status, setStatus] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const importText = (text: string) => {
    const events = parseIcsEvents(text);
    if (!events.length) {
      setStatus("No events found. Make sure this is real .ics/iCal text.");
      return;
    }
    add(events);
    setStatus(`${events.length} event${events.length === 1 ? "" : "s"} imported.`);
    window.setTimeout(close, 650);
  };
  const importUrl = async () => {
    if (!url.trim()) return;
    setIsImporting(true);
    setStatus("Importing the calendar…");
    try {
      const response = await fetch("/api/ical", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || typeof payload.ics !== "string") throw new Error(typeof payload.error === "string" ? payload.error : "LifeOS could not import that calendar link.");
      importText(payload.ics);
    } catch (error) {
      setStatus(error instanceof Error ? `${error.message} Try copying the subscription link again, or paste an exported .ics file below.` : "LifeOS could not import that link. Try again or paste an exported .ics file below.");
    } finally {
      setIsImporting(false);
    }
  };
  return <motion.div className="modal-layer" onMouseDown={close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.div className="capture-modal import-modal" onMouseDown={event => event.stopPropagation()} initial={{ scale: .98, y: 8 }} animate={{ scale: 1, y: 0 }}><div className="capture-head"><div className="brain-dot"><Link2 size={16} /></div><div><strong>Import a calendar</strong><span>Paste a Coursera `webcal://` link, an `.ics` link, or exported calendar text.</span></div><button onClick={close} aria-label="Close"><X size={18} /></button></div><label htmlFor="ical-url">Calendar subscription link</label><div className="import-url-row"><input id="ical-url" inputMode="url" placeholder="webcal://… or https://…" value={url} onChange={event => setUrl(event.target.value)} /><button disabled={!url.trim() || isImporting} onClick={importUrl}>{isImporting ? "Importing…" : "Import link"}</button></div><label htmlFor="ical-text">Or paste .ics text</label><textarea id="ical-text" placeholder={"BEGIN:VCALENDAR\nBEGIN:VEVENT\nSUMMARY:Example\nDTSTART:20260709T090000Z\nEND:VEVENT\nEND:VCALENDAR"} value={ics} onChange={event => setIcs(event.target.value)} /><div className="capture-footer"><span role="status">{status || "Coursera links starting with webcal:// work here. The import uses LifeOS, not your browser."}</span><button disabled={!ics.trim() || isImporting} onClick={() => importText(ics)}>Import pasted iCal</button></div></motion.div></motion.div>;
}

function TaskActionsModal({ task, close, open, edit, toggleCanceled, remove }: { task: Task; close: () => void; open: () => void; edit: () => void; toggleCanceled: () => void; remove: () => void }) {
  return <motion.div className="modal-layer" onMouseDown={close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.div className="task-actions-modal" onMouseDown={event => event.stopPropagation()} initial={{ scale: .98, y: 8 }} animate={{ scale: 1, y: 0 }}><div className="capture-head"><div className="brain-dot"><ListTodo size={16} /></div><div><strong>{task.title}</strong><span>{task.project} · {formatDueDate(task.due)} · {task.focusMinutes}m · {task.energy} energy</span></div><button onClick={close} aria-label="Close"><X size={18} /></button></div><div className="task-action-list"><button onClick={open}><FileText size={16} /><span><strong>Open task page</strong><small>Notes, properties, checklist, and full context</small></span></button><button onClick={edit}><Pencil size={16} /><span><strong>Quick edit</strong><small>Change name, focus time, and energy</small></span></button><button onClick={toggleCanceled}><Ban size={16} /><span><strong>{task.canceled ? "Restore priority" : "Mark as canceled"}</strong><small>{task.canceled ? "Put it back into your active list" : "Keep it visible without treating it as active"}</small></span></button><button className="danger" onClick={remove}><Trash2 size={16} /><span><strong>Delete priority</strong><small>Remove it permanently</small></span></button></div><button className="action-cancel" onClick={close}>Cancel</button></motion.div></motion.div>;
}

function EditProjectModal({ project, close, save }: { project: Project; close: () => void; save: (name: string, desc: string) => void }) {
  const [name, setName] = useState(project.name);
  const [desc, setDesc] = useState(project.desc);
  return <motion.div className="modal-layer" onMouseDown={close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.form className="create-modal" onMouseDown={event => event.stopPropagation()} onSubmit={event => { event.preventDefault(); if (name.trim()) save(name.trim(), desc.trim() || project.desc); }} initial={{ scale: .98, y: 8 }} animate={{ scale: 1, y: 0 }}><div className="capture-head"><div className="brain-dot" style={{ color: project.color, background: `${project.color}16` }}><Pencil size={16} /></div><div><strong>Edit project</strong><span>Update the project name and description</span></div><button type="button" onClick={close} aria-label="Close"><X size={18} /></button></div><label htmlFor="project-name">Project name</label><input id="project-name" autoFocus value={name} onChange={event => setName(event.target.value)} /><label htmlFor="project-desc">Description</label><textarea id="project-desc" value={desc} onChange={event => setDesc(event.target.value)} style={{ minHeight: "80px", marginTop: "7px" }} /><div className="create-actions"><button type="button" onClick={close}>Cancel</button><button className="primary" disabled={!name.trim()} type="submit">Save changes</button></div></motion.form></motion.div>;
}

function ClassActionsModal({ classRecord, close, edit, remove }: { classRecord: ClassRecord; close: () => void; edit: () => void; remove: () => void }) {
  return <motion.div className="modal-layer" onMouseDown={close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.div className="task-actions-modal" onMouseDown={event => event.stopPropagation()} initial={{ scale: .98, y: 8 }} animate={{ scale: 1, y: 0 }}><div className="capture-head"><div className="brain-dot" style={{ color: classRecord.color, background: `${classRecord.color}16` }}><GraduationCap size={16} /></div><div><strong>{classRecord.code}</strong><span>{classRecord.name}{classRecord.term ? ` · ${classRecord.term}` : ""}</span></div><button onClick={close} aria-label="Close"><X size={18} /></button></div><div className="task-action-list"><button onClick={edit}><Pencil size={16} /><span><strong>Edit class</strong><small>Update the course details, semester, and color.</small></span></button><button className="danger" onClick={remove}><Trash2 size={16} /><span><strong>Delete class</strong><small>Remove this class and keep its tasks, notes, and files unlinked.</small></span></button></div><button className="action-cancel" onClick={close}>Cancel</button></motion.div></motion.div>;
}

function ProjectActionsModal({ project, close, setKind, onDelete, onEdit }: { project: Project; close: () => void; setKind: (kind: ProjectKind) => void; onDelete?: () => void; onEdit?: () => void }) {
  return <motion.div className="modal-layer" onMouseDown={close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.div className="task-actions-modal" onMouseDown={event => event.stopPropagation()} initial={{ scale: .98, y: 8 }} animate={{ scale: 1, y: 0 }}><div className="capture-head"><div className="brain-dot" style={{ color: project.color, background: `${project.color}16` }}><project.icon size={16} /></div><div><strong>{project.name}</strong><span>{project.kind === "maintenance" ? "Maintenance system" : "Finishable project"}</span></div><button onClick={close} aria-label="Close"><X size={18} /></button></div><div className="task-action-list">{onEdit && <button onClick={onEdit}><Pencil size={16} /><span><strong>Edit project</strong><small>Change the name and description</small></span></button>}<button onClick={() => setKind("maintenance")}><Sparkles size={16} /><span><strong>Make it maintenance</strong><small>For ongoing areas like health, business ops, learning, habits.</small></span>{project.kind === "maintenance" && <Check size={15} />}</button><button onClick={() => setKind("finishable")}><CheckCircle2 size={16} /><span><strong>Make it finishable</strong><small>For projects that should end, ship, submit, or launch.</small></span>{project.kind === "finishable" && <Check size={15} />}</button>{onDelete && <button className="danger" onClick={onDelete}><Trash2 size={16} /><span><strong>Delete project</strong><small>Remove this project and move tasks to Inbox</small></span></button>}</div><button className="action-cancel" onClick={close}>Cancel</button></motion.div></motion.div>;
}

function ProjectDetailModal({ project, tasks, close, linkTask, onOpenTask, onFullscreen }: { project: Project; tasks: Task[]; close: () => void; linkTask: (id: number, project: Project) => void; onOpenTask: (id: number) => void; onFullscreen?: () => void }) {
  const linkedTasks = tasks.filter(task => task.project === project.name);
  const activeTasks = linkedTasks.filter(task => !task.done && !task.canceled);
  const availableTasks = tasks.filter(task => task.project !== project.name && !task.done && !task.canceled);
  const topTask = [...activeTasks].sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority])[0];
  const nextDue = [...activeTasks].sort((a, b) => dueRank(a.due) - dueRank(b.due))[0];
  return <motion.div className="modal-layer" onMouseDown={close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.div className="project-detail-modal" onMouseDown={event => event.stopPropagation()} initial={{ scale: .98, y: 8 }} animate={{ scale: 1, y: 0 }}><div className="capture-head"><div className="brain-dot" style={{ color: project.color, background: `${project.color}16` }}><project.icon size={16} /></div><div><strong>{project.name}</strong><span>{project.kind === "maintenance" ? "Maintenance / ongoing" : "Finishable project"} · {activeTasks.length} active tasks</span></div><div style={{ display: "flex", gap: "8px" }}>{onFullscreen && <button onClick={onFullscreen} aria-label="Open fullscreen" title="Open fullscreen"><Maximize size={18} style={{ color: "var(--muted)" }} /></button>}<button onClick={close} aria-label="Close"><X size={18} /></button></div></div><div className="project-detail-summary"><div><span>Next due</span><strong>{nextDue ? formatDueDate(nextDue.due) : "Nothing due"}</strong></div><div><span>Highest priority</span><strong>{topTask?.priority ?? "Clear"}</strong></div><div><span>Energy load</span><strong>{topTask ? `${topTask.energy} · ${topTask.focusMinutes}m` : "Clear"}</strong></div></div><div className="project-detail-list"><div className="project-detail-head"><span>Task</span><span>Due</span><span>Priority</span><span>Focus</span></div>{linkedTasks.length ? linkedTasks.map(task => <div className={`project-detail-row ${task.done ? "done" : ""} ${task.canceled ? "canceled" : ""}`} key={task.id}><button className="project-task-link" onClick={() => onOpenTask(task.id)}>{task.title}</button><span>{task.canceled ? "Canceled" : task.done ? "Done" : formatDueDate(task.due)}</span><em className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</em><span>{task.focusMinutes}m · {task.energy}</span></div>) : <div className="priority-empty"><strong>No tasks linked yet.</strong><p>Link an existing task below, or choose this project when creating a new task.</p></div>}</div><div className="link-task-panel"><div><strong>Link existing tasks</strong><span>Pull loose tasks into {project.name} so this project view is actually useful.</span></div>{availableTasks.length ? <div className="link-task-list">{availableTasks.slice(0, 6).map(task => <button key={task.id} type="button" onClick={() => linkTask(task.id, project)}><span><strong>{task.title}</strong><small>{task.project} · {formatDueDate(task.due)} · {task.focusMinutes}m</small></span><em className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</em><Plus size={15} /></button>)}</div> : <p>No loose active tasks to link right now.</p>}</div></motion.div></motion.div>;
}

function EditTaskModal({ task, projects, classes, tasks, close, save }: { task: Task; projects: Project[]; classes: ClassRecord[]; tasks: Task[]; close: () => void; save: (updates: Pick<Task, "title" | "focusMinutes" | "energy" | "project" | "classId" | "academicType" | "color" | "due" | "startTime">) => void }) {
  const [title, setTitle] = useState(task.title);
  const [spaceValue, setSpaceValue] = useState(task.classId ? `class:${task.classId}` : task.project !== "Inbox" ? `project:${task.project}` : "");
  const [focusMinutes, setFocusMinutes] = useState(String(task.focusMinutes));
  const [energy, setEnergy] = useState<EnergyLevel>(task.energy);
  const [dueDate, setDueDate] = useState(task.due);
  const [startTime, setStartTime] = useState(task.startTime ?? "");
  const parsedMinutes = Math.max(5, Math.min(240, Number(focusMinutes) || 45));
  const linkedClass = spaceValue.startsWith("class:") ? classes.find(item => item.id === spaceValue.slice(6)) : undefined;
  const linkedProject = spaceValue.startsWith("project:") ? projects.find(project => project.name === spaceValue.slice(8)) : undefined;
  const doubleBooked = checkDoubleBooking(tasks, task.id, dueDate, startTime, parsedMinutes);
  return (
    <motion.div className="modal-layer" onMouseDown={close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.form className="create-modal" onMouseDown={event => event.stopPropagation()} onSubmit={event => { event.preventDefault(); if (title.trim()) save({ title: title.trim(), project: linkedProject?.name ?? "Inbox", classId: linkedClass?.id, academicType: linkedClass ? (task.academicType ?? "Assignment") : task.academicType, color: linkedClass?.color ?? linkedProject?.color ?? "#625af6", focusMinutes: parsedMinutes, energy, due: dueDate, startTime: startTime || undefined }); }} initial={{ scale: .98, y: 8 }} animate={{ scale: 1, y: 0 }}>
        <div className="capture-head">
          <div className="brain-dot"><Pencil size={16} /></div>
          <div><strong>Edit priority</strong><span>Update the space, focus length, energy cost, and schedule.</span></div>
          <button type="button" onClick={close} aria-label="Close"><X size={18} /></button>
        </div>
        <label htmlFor="edit-task-name">Priority name</label>
        <input id="edit-task-name" autoFocus value={title} onChange={event => setTitle(event.target.value)} />
        <label htmlFor="edit-task-project">Linked space</label>
        <select id="edit-task-project" value={spaceValue} onChange={event => setSpaceValue(event.target.value)}>
          <option value="">Inbox / no space</option>
          {classes.length > 0 && <optgroup label="Classes">{classes.map(item => <option key={item.id} value={`class:${item.id}`}>{item.code} — {item.name}</option>)}</optgroup>}
          {projects.length > 0 && <optgroup label="Projects & maintenance">{projects.map(project => <option key={project.name} value={`project:${project.name}`}>{project.name}</option>)}</optgroup>}
        </select>
        <label htmlFor="edit-task-due">Schedule for</label>
        <input id="edit-task-due" type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} />
        <label htmlFor="edit-task-time">Start time (optional)</label>
        <input id="edit-task-time" type="time" value={startTime} onChange={event => setStartTime(event.target.value)} />
        {doubleBooked.length > 0 && (
          <div style={{ background: "rgba(255, 107, 107, 0.1)", border: "1px solid rgba(255, 107, 107, 0.3)", borderRadius: "6px", padding: "12px", marginTop: "8px", fontSize: "12px", color: "#ff6b6b" }}>
            <strong>⚠️ Time conflict detected</strong>
            <p style={{ margin: "4px 0 0 0" }}>{doubleBooked.map(t => t.title).join(", ")} scheduled at overlapping times</p>
          </div>
        )}
        <div className="focus-edit-grid">
          <label htmlFor="edit-focus-minutes">Focus time<input id="edit-focus-minutes" type="number" min={5} max={240} step={5} value={focusMinutes} onChange={event => setFocusMinutes(event.target.value)} /></label>
          <label>Energy needed<div className="energy-picker">{(["Low", "Medium", "High"] as EnergyLevel[]).map(level => <button key={level} type="button" className={energy === level ? "selected" : ""} onClick={() => setEnergy(level)}>{level}</button>)}</div></label>
        </div>
        <div className="create-actions">
          <button type="button" onClick={close}>Cancel</button>
          <button className="primary" disabled={!title.trim()} type="submit">Save changes</button>
        </div>
      </motion.form>
    </motion.div>
  );
}

function CreateModal({ kind, projects, classes, close, submit }: { kind: "task" | "project"; projects: Project[]; classes: ClassRecord[]; close: () => void; submit: (value: string, projectKind?: ProjectKind, taskProject?: string, icon?: ProjectIcon) => void }) {
  const [value, setValue] = useState("");
  const [projectKind, setProjectKind] = useState<ProjectKind>("finishable");
  const [taskProject, setTaskProject] = useState("");
  const [selectedIcon, setSelectedIcon] = useState<ProjectIcon>("Zap");
  const label = kind === "task" ? "Task" : "Project";
  const availableIcons: ProjectIcon[] = ["Zap", "Aperture", "Sparkles", "FileText", "UserRound", "FolderKanban"];
  return <motion.div className="modal-layer" onMouseDown={close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.form className="create-modal" onMouseDown={e => e.stopPropagation()} onSubmit={e => { e.preventDefault(); if (value.trim()) submit(value.trim(), projectKind, taskProject, selectedIcon); }} initial={{ scale: .98, y: 8 }} animate={{ scale: 1, y: 0 }}><div className="capture-head"><div className="brain-dot">{kind === "task" ? <CheckCircle2 size={16} /> : <FolderKanban size={16} />}</div><div><strong>New {kind}</strong><span>{kind === "project" ? "Choose if this is a garden or a mission." : "Give it a clear name and park it in the right space."}</span></div><button type="button" onClick={close} aria-label="Close"><X size={18} /></button></div><label htmlFor="create-name">{label} name</label><input id="create-name" autoFocus placeholder={kind === "task" ? "What needs to get done?" : "What are you building?"} value={value} onChange={e => setValue(e.target.value)} />{kind === "task" && <><label htmlFor="create-task-project">Linked space</label><select id="create-task-project" value={taskProject} onChange={event => setTaskProject(event.target.value)}><option value="">Inbox / no space</option>{classes.length > 0 && <optgroup label="Classes">{classes.map(item => <option key={item.id} value={`class:${item.id}`}>{item.code} — {item.name}</option>)}</optgroup>}{projects.length > 0 && <optgroup label="Projects & maintenance">{projects.map(project => <option key={project.name} value={`project:${project.name}`}>{project.name}</option>)}</optgroup>}</select></>}{kind === "project" && <><div className="project-kind-picker"><button type="button" className={projectKind === "finishable" ? "selected" : ""} onClick={() => setProjectKind("finishable")}><CheckCircle2 size={16} /><span><strong>Finishable project</strong><small>Has a launch, deadline, deliverable, or done state.</small></span></button><button type="button" className={projectKind === "maintenance" ? "selected" : ""} onClick={() => setProjectKind("maintenance")}><Sparkles size={16} /><span><strong>Maintenance / ongoing</strong><small>A garden you keep alive: business, health, habits, creative practice.</small></span></button></div><label>Project icon</label><div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "8px" }}>{availableIcons.map(icon => {const IconComponent = projectIcons[icon]; return <button key={icon} type="button" className={`icon-option ${selectedIcon === icon ? "selected" : ""}`} onClick={() => setSelectedIcon(icon)} style={{ padding: "12px", borderRadius: "8px", border: selectedIcon === icon ? "2px solid var(--accent)" : "1px solid var(--line)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{IconComponent && <IconComponent size={20} />}</button>;})}</div></>}<div className="create-actions"><button type="button" onClick={close}>Cancel</button><button className="primary" disabled={!value.trim()} type="submit">Create {kind}</button></div></motion.form></motion.div>;
}
