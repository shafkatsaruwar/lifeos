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
import { syncDataToFirebase, loadDataFromFirebase, listenToFirebaseChanges, stopListeningToFirebaseChanges, pullAllDataFromFirebase, setUserId, getUserId } from "@/lib/dataSync";
import { signInWithGoogle, signOut, onAuthStateChanged, getClientAuth, getRedirectResult } from "@/lib/firebase";
import { logger } from "@/lib/logger";
import { PRIORITY_RANK, TEST_USER, ERROR_MESSAGES, STORAGE_KEYS } from "@/lib/constants";
import { checkDoubleBooking, formatDueDate, toDateKey, isValidTimeFormat } from "@/lib/helpers";
import {
  Aperture, Archive, ArrowRight, Brain, CalendarDays, Check, CheckCircle2,
  ChevronDown, Circle, Clock3, Command, FileText, Flame, Focus, FolderKanban,
  Home, Inbox, LayoutGrid, Library, Link2, ListTodo, Menu, Moon, MoreHorizontal,
  Music2, Plus, Search, Settings, Sparkles, Sun, TimerReset, UserRound, X, Zap,
  Ban, Pencil, Trash2, Bell, Database, Download, Palette, Shield, SlidersHorizontal, Coffee, Maximize, Mic,
} from "lucide-react";

type View = "Dashboard" | "Focus" | "Projects" | "Tasks" | "Calendar" | "Brain" | "Knowledge" | "Resources" | "Settings";
type EnergyLevel = "Low" | "Medium" | "High";
type Task = { id: number; title: string; project: string; color: string; due: string; startTime?: string; priority: "High" | "Medium" | "Low"; focusMinutes: number; energy: EnergyLevel; checklist?: string[]; checklistProgress?: boolean[]; done?: boolean; canceled?: boolean };
type ProjectKind = "maintenance" | "finishable";
type ProjectIcon = "Zap" | "Aperture" | "Sparkles" | "FileText" | "UserRound" | "FolderKanban";
type Resource = { id: string; name: string; type: string; size: number; url: string; uploadedAt: string };
type Project = { name: string; desc: string; progress: number; color: string; icon: typeof Home; iconName: ProjectIcon; tasks: number; kind: ProjectKind };
type CalendarEvent = { id: string; title: string; start: string; end?: string; source: "LifeOS" | "iCal"; color: string; notes?: string };
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
};

const projectIcons: Record<ProjectIcon, typeof Home> = { Zap, Aperture, Sparkles, FileText, UserRound, FolderKanban };

const nav: { name: View; icon: typeof Home }[] = [
  { name: "Dashboard", icon: Home }, { name: "Focus", icon: Focus },
  { name: "Projects", icon: FolderKanban }, { name: "Tasks", icon: ListTodo },
  { name: "Calendar", icon: CalendarDays }, { name: "Brain", icon: Brain },
  { name: "Knowledge", icon: Library }, { name: "Resources", icon: Archive },
];

const initialTasks: Task[] = [
  { id: 1, title: "Finalize onboarding flow", project: "Synapse", color: "#635bff", due: "2026-07-10", priority: "High", focusMinutes: 45, energy: "High" },
  { id: 2, title: "Edit Brooklyn portrait set", project: "Photography", color: "#e48b6b", due: "2026-07-10", priority: "Medium", focusMinutes: 60, energy: "Medium" },
  { id: 3, title: "Review personal statement draft", project: "Master's Applications", color: "#47a47b", due: "2026-07-10", priority: "High", focusMinutes: 30, energy: "High" },
  { id: 4, title: "Update catering menu pricing", project: "Mom's Catering", color: "#d99b38", due: "2026-07-11", priority: "Medium", focusMinutes: 25, energy: "Medium" },
  { id: 5, title: "Prepare portfolio case study", project: "Career", color: "#4e8bd7", due: "2026-07-12", priority: "Low", focusMinutes: 45, energy: "Low" },
];

const TASKS_STORAGE_KEY = "lifeos.priorities.v1";
const PROJECTS_STORAGE_KEY = "lifeos.projects.v1";
const CALENDAR_STORAGE_KEY = "lifeos.calendar.v1";
const SETTINGS_STORAGE_KEY = "lifeos.settings.v1";
const DARK_STORAGE_KEY = "lifeos.dark.v1";
const BRAIN_STORAGE_KEY = "lifeos.brain.v1";

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
};

const initialProjects: Project[] = [
  { name: "Synapse", desc: "A calmer way to understand your health.", progress: 72, color: "#635bff", icon: Zap, iconName: "Zap", tasks: 8, kind: "finishable" },
  { name: "Photography", desc: "Stories, portraits, and visual experiments.", progress: 48, color: "#e48b6b", icon: Aperture, iconName: "Aperture", tasks: 5, kind: "maintenance" },
  { name: "Mom's Catering", desc: "A beautiful digital home for the family business.", progress: 61, color: "#d99b38", icon: Sparkles, iconName: "Sparkles", tasks: 4, kind: "maintenance" },
  { name: "Master's Applications", desc: "The next chapter, thoughtfully prepared.", progress: 35, color: "#47a47b", icon: FileText, iconName: "FileText", tasks: 7, kind: "finishable" },
  { name: "Career", desc: "Build leverage and create meaningful work.", progress: 54, color: "#4e8bd7", icon: UserRound, iconName: "UserRound", tasks: 3, kind: "maintenance" },
];

const initialBrainItems = [
  "Explore a photo essay about late-night diners",
  "Research German student visa timeline",
  "Recipe idea: pistachio cardamom cake",
];

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
const getGreeting = (date: Date) => {
  const hour = date.getHours();
  if (hour < 5) return "Still Up, Mohammed?";
  if (hour < 12) return "Good Morning, Mohammed.";
  if (hour < 17) return "Good Afternoon, Mohammed.";
  if (hour < 22) return "Good Evening, Mohammed.";
  return "Good Night, Mohammed.";
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
  checklist: Array.isArray(task.checklist) ? task.checklist : [],
  done: task.done,
  canceled: task.canceled,
});
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
  const [view, setView] = useState<View>("Dashboard");
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
  const [projectItems, setProjectItems] = useState(initialProjects);
  const [projectsHydrated, setProjectsHydrated] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(initialCalendarEvents);
  const [calendarHydrated, setCalendarHydrated] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourcesHydrated, setResourcesHydrated] = useState(false);
  const [composer, setComposer] = useState<"task" | "project" | null>(null);
  const [calendarComposer, setCalendarComposer] = useState(false);
  const [defaultEventDate, setDefaultEventDate] = useState<string | null>(null);
  const [calendarImporter, setCalendarImporter] = useState(false);
  const [editingCalendarEventId, setEditingCalendarEventId] = useState<string | null>(null);
  const [breakOpen, setBreakOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [actionTaskId, setActionTaskId] = useState<number | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [actionProjectName, setActionProjectName] = useState<string | null>(null);
  const [selectedProjectName, setSelectedProjectName] = useState<string | null>(null);
  const [fullscreenProject, setFullscreenProject] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState<string | null>(null);

  const openFocus = useCallback((taskId?: number) => {
    if (taskId) setActiveTaskId(taskId);
    setFocus(true);
  }, []);
  const go = useCallback((next: View) => { setView(next); setSidebar(false); if (next === "Focus") setFocus(true); }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const typing = ["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette(true); }
      if (e.key === "Escape") {
        setPalette(false);
        setCapture(false);
        setComposer(null);
        setCalendarComposer(false);
        setCalendarImporter(false);
        setEditingCalendarEventId(null);
        setBreakOpen(false);
        setActionTaskId(null);
        setEditingTaskId(null);
        setActionProjectName(null);
        setSelectedProjectName(null);
        setSidebar(false);
        if (focus) {
          setFocus(false);
          setView("Dashboard");
        }
      }
      if (!typing && !e.metaKey && !e.ctrlKey) {
        if (e.key === "/") {
          e.preventDefault();
          setQuery("");
          setPalette(true);
        }
        if (e.key.toLowerCase() === "b") setCapture(true);
        if (e.key.toLowerCase() === "f") openFocus();
        if (e.key.toLowerCase() === "n") setComposer("task");
        if (e.key.toLowerCase() === "p") go("Projects");
        if (e.key.toLowerCase() === "r") setBreakOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [focus, go, openFocus]);

  useEffect(() => {
    const auth = getClientAuth();

    // Check for test user ID in dev mode
    const testUserId = typeof window !== 'undefined' ? sessionStorage.getItem(STORAGE_KEYS.USER_ID) : null;
    if (testUserId === TEST_USER.ID) {
      logger.debug('Using test user for development');
      setUser({ displayName: TEST_USER.DISPLAY_NAME, email: TEST_USER.EMAIL });
      setUserId(testUserId);
      setAuthLoading(false);
      return;
    }

    if (!auth) {
      logger.warn('Firebase auth not initialized');
      setAuthLoading(false);
      return;
    }

    // Handle redirect result from Google Sign-In
    getRedirectResult(auth).catch(error => {
      logger.error('Redirect result error during auth', error as Error);
    });

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        logger.info('User authenticated', { uid: currentUser.uid, email: currentUser.email });
        setUser(currentUser);
        setUserId(currentUser.uid);
      } else {
        logger.info('User not authenticated');
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  useEffect(() => {
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
  }, []);
  useEffect(() => {
    if (!settingsHydrated) return;
    syncDataToFirebase('dark', dark);
  }, [dark, settingsHydrated]);
  useEffect(() => {
    if (!settingsHydrated) return;
    document.documentElement.style.setProperty("--accent", settingsState.accent);
    document.documentElement.classList.toggle("compact", settingsState.compactMode);
    document.documentElement.classList.toggle("reduce-motion", settingsState.reduceMotion);
    syncDataToFirebase('settings', settingsState);
  }, [settingsState, settingsHydrated]);
  useEffect(() => {
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
  }, []);
  useEffect(() => {
    if (!tasksHydrated) return;
    syncDataToFirebase('tasks', tasks);
  }, [tasks, tasksHydrated]);
  useEffect(() => {
    if (!tasks.length) {
      setActiveTaskId(0);
      return;
    }
    if (!tasks.some(task => task.id === activeTaskId)) setActiveTaskId(tasks[0].id);
  }, [activeTaskId, tasks]);
  useEffect(() => {
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
  }, []);
  useEffect(() => {
    if (!projectsHydrated) return;
    const projectsForStorage = projectItems.map(({ icon, ...project }) => project);
    syncDataToFirebase('projects', projectsForStorage);
  }, [projectItems, projectsHydrated]);
  useEffect(() => {
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
  }, []);
  useEffect(() => {
    if (!calendarHydrated) return;
    syncDataToFirebase('calendar', calendarEvents);
  }, [calendarEvents, calendarHydrated]);
  useEffect(() => {
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
  }, []);
  useEffect(() => {
    if (!brainHydrated) return;
    syncDataToFirebase('brain', brainItems);
  }, [brainItems, brainHydrated]);

  useEffect(() => {
    console.log('Tasks listener effect running, hydrated:', tasksHydrated);
    if (!tasksHydrated) return;
    const unsubscribe = listenToFirebaseChanges('tasks', (data) => {
      console.log('Tasks listener callback fired');
      if (Array.isArray(data)) setTasks(data.map(task => normalizeTask(task)));
    });
    return () => stopListeningToFirebaseChanges('tasks');
  }, [tasksHydrated]);

  useEffect(() => {
    if (!projectsHydrated) return;
    const unsubscribe = listenToFirebaseChanges('projects', (data) => {
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
  }, [projectsHydrated]);

  useEffect(() => {
    if (!calendarHydrated) return;
    const unsubscribe = listenToFirebaseChanges('calendar', (data) => {
      if (Array.isArray(data)) setCalendarEvents(data);
    });
    return () => stopListeningToFirebaseChanges('calendar');
  }, [calendarHydrated]);

  useEffect(() => {
    if (!brainHydrated) return;
    const unsubscribe = listenToFirebaseChanges('brain', (data) => {
      if (Array.isArray(data)) setBrainItems(data.filter(item => typeof item === "string"));
    });
    return () => stopListeningToFirebaseChanges('brain');
  }, [brainHydrated]);

  const complete = (id: number) => setTasks(items => items.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const flash = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  }, []);
  const updateSettings = (updates: Partial<SettingsState>) => {
    setSettingsState(current => ({ ...current, ...updates }));
    flash("Settings updated");
  };
  const addTask = (title: string, _projectKind?: ProjectKind, projectName = "Inbox") => {
    const linkedProject = projectItems.find(project => project.name === projectName);
    setTasks(items => [...items, { id: Date.now(), title, project: linkedProject?.name ?? "Inbox", color: linkedProject?.color ?? "#625af6", due: toDateKey(new Date()), priority: "Medium", focusMinutes: settingsState.defaultFocusMinutes, energy: settingsState.defaultEnergy, checklist: [] }]);
    setComposer(null);
    flash(linkedProject ? `Task linked to ${linkedProject.name}` : "Task added to Today");
  };
  const addProject = (name: string, kind: ProjectKind = "finishable", _taskProject?: string, icon: ProjectIcon = "FolderKanban") => {
    const iconComponent = projectIcons[icon];
    setProjectItems(items => [...items, { name, desc: kind === "maintenance" ? "An ongoing system to keep healthy." : "A focused project with a finish line.", progress: kind === "maintenance" ? 100 : 0, color: "#625af6", icon: iconComponent, iconName: icon, tasks: 0, kind }]);
    setComposer(null);
    flash(kind === "maintenance" ? "Maintenance space created" : "Finishable project created");
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
    setActionProjectName(null);
    flash("Project deleted");
  };
  const updateProject = (oldName: string, newName: string, desc: string) => {
    setProjectItems(items => items.map(project => project.name === oldName ? { ...project, name: newName, desc } : project));
    setTasks(items => items.map(task => task.project === oldName ? { ...task, project: newName } : task));
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
  const importCalendarEvents = (events: CalendarEvent[]) => {
    setCalendarEvents(items => {
      const seen = new Set(items.map(event => event.id));
      return [...items, ...events.filter(event => !seen.has(event.id))];
    });
    setCalendarImporter(false);
    flash(`${events.length} iCal event${events.length === 1 ? "" : "s"} imported`);
  };
  const updateTask = (id: number, updates: Pick<Task, "title" | "focusMinutes" | "energy" | "project" | "color" | "due" | "startTime">) => {
    setTasks(items => items.map(task => task.id === id ? { ...task, ...updates } : task));
    setEditingTaskId(null);
    flash("Priority updated");
  };
  const linkTaskToProject = (id: number, project: Project) => {
    setTasks(items => items.map(task => task.id === id ? { ...task, project: project.name, color: project.color } : task));
    flash(`Linked to ${project.name}`);
  };
  const updateTaskChecklist = (id: number, checklist: string[]) => {
    setTasks(items => items.map(task => task.id === id ? { ...task, checklist } : task));
  };
  const updateTaskChecklistProgress = (id: number, progress: boolean[]) => {
    setTasks(items => items.map(task => task.id === id ? { ...task, checklistProgress: progress } : task));
  };
  const toggleCanceled = (id: number) => {
    setTasks(items => items.map(task => task.id === id ? { ...task, canceled: !task.canceled, done: false } : task));
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
      if (data.settings) setSettingsState(current => ({ ...current, ...data.settings }));
      if (data.dark !== undefined) setDark(data.dark);
      flash("✓ Cloud data synced successfully");
    } catch (error) {
      flash("Error syncing from cloud");
      console.error("Sync error:", error);
    }
  };

  const exportData = () => {
    const payload = { exportedAt: new Date().toISOString(), tasks, projects: projectItems.map(({ icon, ...project }) => project), events: calendarEvents, brainItems, settings: settingsState, dark };
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
          if (data.settings) {
            setSettingsState(current => ({ ...current, ...data.settings }));
            await syncDataToFirebase('settings', data.settings);
          }
          if (data.dark !== undefined) {
            setDark(data.dark);
            await syncDataToFirebase('dark', data.dark);
          }
          flash("✓ LifeOS data imported and synced to cloud");
        } catch (err) {
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

  const filtered = useMemo(() => [...nav.map(n => n.name), ...projectItems.map(p => p.name), ...tasks.map(t => t.title)]
    .filter(x => x.toLowerCase().includes(query.toLowerCase())), [projectItems, query, tasks]);

  if (authLoading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0a', color: '#fff' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '20px' }}>LifeOS</div>
        <div style={{ fontSize: '14px', opacity: 0.6 }}>Loading...</div>
      </div>
    </div>;
  }

  if (!user) {
    return <LoginPage onLoginSuccess={() => {}} />;
  }

  const activeTask = tasks.find(task => task.id === activeTaskId) ?? tasks[0];
  if (fullscreenProject && projectItems.find(p => p.name === fullscreenProject)) {
    return <FullscreenProject project={projectItems.find(p => p.name === fullscreenProject)!} tasks={tasks} onExit={() => setFullscreenProject(null)} linkTask={linkTaskToProject} />;
  }
  if (focus) {
    if (!activeTask) return <EmptyFocus onExit={() => { setFocus(false); setView("Dashboard"); }} onNewTask={() => { setFocus(false); setComposer("task"); }} />;
    return <FocusMode task={activeTask} tasks={tasks} onSwitch={setActiveTaskId} onUpdateChecklist={updateTaskChecklist} onUpdateChecklistProgress={updateTaskChecklistProgress} onComplete={complete} onExit={() => { setFocus(false); setView("Dashboard"); }} />;
  }

  return (
    <div className="app-shell">
      <AnimatePresence>{sidebar && <motion.button aria-label="Close navigation" className="mobile-scrim" onClick={() => setSidebar(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />}</AnimatePresence>
      <aside className={`sidebar ${sidebar ? "sidebar-open" : ""}`}>
        <div className="brand"><div className="brand-mark"><span /><span /><span /></div><span>LifeOS</span></div>
        <button className="search-trigger" onClick={() => setPalette(true)}><Search size={15} /><span>Search anything</span><kbd>/</kbd><kbd>⌘ K</kbd></button>
        <nav>
          <p className="nav-label">Workspace</p>
          {nav.map(({ name, icon: Icon }) => <button key={name} className={`nav-item ${view === name ? "active" : ""}`} onClick={() => go(name)}><Icon size={17} strokeWidth={1.8} /><span>{name}</span>{name === "Brain" && <em>{brainItems.length}</em>}</button>)}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => go("Settings")}><Settings size={17} /><span>Settings</span></button>
          <button className="profile" onClick={() => go("Settings")}><div className="avatar">MS</div><div><strong>Mohammed</strong><small>Personal workspace</small></div><MoreHorizontal size={16} /></button>
        </div>
      </aside>

      <main>
        {!fullscreenProject && <>
        <header className="topbar">
          <IconButton label="Open navigation" onClick={() => setSidebar(true)}><Menu size={19} /></IconButton>
          <div className="breadcrumb"><span>LifeOS</span><span>/</span><strong>{view}</strong></div>
          <div className="top-actions">
            <IconButton label="Toggle theme" onClick={() => setDark(v => !v)}>{dark ? <Sun size={18} /> : <Moon size={18} />}</IconButton>
            <button className="break-button" onClick={() => setBreakOpen(true)}><Coffee size={16} /> I need a break <kbd>R</kbd></button>
            <button className="capture-button" onClick={() => setCapture(true)}><Plus size={16} /> Quick capture <kbd>B</kbd></button>
          </div>
        </header>
        <AnimatePresence mode="wait">
          <motion.div key={view} className="page" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: .18 }}>
            {view === "Dashboard" && <Dashboard tasks={tasks} projects={projectItems} brainCount={brainItems.length} onComplete={complete} onFocus={openFocus} onCapture={() => setCapture(true)} onGo={go} onNewTask={() => setComposer("task")} onTaskMenu={setActionTaskId} events={calendarEvents} onOpenProject={setSelectedProjectName} />}
            {view === "Projects" && <Projects projects={projectItems} tasks={tasks} onNew={() => setComposer("project")} onAction={setActionProjectName} onOpen={setSelectedProjectName} />}
            {view === "Tasks" && <Tasks tasks={tasks} onComplete={complete} onNew={() => setComposer("task")} onTaskMenu={setActionTaskId} />}
            {view === "Calendar" && <CalendarView events={[...calendarEvents, ...tasksToCalendarEvents(tasks)]} weekStartsMonday={settingsState.weekStartsMonday} onNew={(date) => { setDefaultEventDate(date); setCalendarComposer(true); }} onImport={() => setCalendarImporter(true)} onEdit={setEditingCalendarEventId} />}
            {view === "Resources" && <ResourcesView resources={resources} onDelete={(id) => { setResources(r => r.filter(res => res.id !== id)); flash("Resource deleted"); }} onReplace={(id, file) => { flash("Resource updated"); }} onDownload={(resource) => { const a = document.createElement('a'); a.href = resource.url; a.download = resource.name; a.click(); }} />}
            {view === "Brain" && <BrainView items={brainItems} onCapture={() => setCapture(true)} onArchive={(index) => { setBrainItems(items => items.filter((_, i) => i !== index)); flash("Thought archived"); }} />}
            {view === "Settings" && <SettingsView dark={dark} setDark={setDark} settings={settingsState} update={updateSettings} tasks={tasks} projects={projectItems} events={calendarEvents} brainItems={brainItems} flash={flash} onSync={syncFromCloud} onReset={resetLocalData} onExport={exportData} onImport={importData} user={user} onLogout={handleLogout} />}
            {!["Dashboard", "Projects", "Tasks", "Calendar", "Brain", "Settings"].includes(view) && <ComingSoon view={view} onFocus={() => setFocus(true)} />}
          </motion.div>
        </AnimatePresence>
        </>}
      </main>
      <AnimatePresence>
        {palette && <CommandPalette key="command-palette" query={query} setQuery={setQuery} results={filtered} close={() => { setPalette(false); setQuery(""); }} go={go} onFocus={() => { setPalette(false); openFocus(); }} onCapture={() => { setPalette(false); setCapture(true); }} onNewTask={() => { setPalette(false); setComposer("task"); }} onResult={(result) => { setPalette(false); flash(`Opened “${result}”`); }} />}
        {capture && <CaptureModal key="capture-modal" close={() => setCapture(false)} add={(text) => { setBrainItems(x => [text, ...x]); setCapture(false); flash("Thought captured"); }} />}
        {composer && <CreateModal key={`create-${composer}`} kind={composer} projects={projectItems} close={() => setComposer(null)} submit={(value, projectKind, taskProject) => composer === "task" ? addTask(value, projectKind, taskProject) : addProject(value, projectKind)} />}
        {calendarComposer && <CalendarEventModal key="calendar-event-modal" close={() => { setCalendarComposer(false); setDefaultEventDate(null); }} add={addCalendarEvent} defaultDate={defaultEventDate} />}
        {editingCalendarEventId && calendarEvents.find(event => event.id === editingCalendarEventId) && <CalendarEventModal key={`calendar-edit-${editingCalendarEventId}`} event={calendarEvents.find(event => event.id === editingCalendarEventId)!} close={() => setEditingCalendarEventId(null)} add={updateCalendarEvent} remove={deleteCalendarEvent} />}
        {calendarImporter && <CalendarImportModal key="calendar-import-modal" close={() => setCalendarImporter(false)} add={importCalendarEvents} />}
        {breakOpen && <BreakModal key="break-modal" close={() => setBreakOpen(false)} done={() => { setBreakOpen(false); flash("Break complete — ease back in"); }} />}
        {actionTaskId !== null && tasks.find(task => task.id === actionTaskId) && <TaskActionsModal key={`task-actions-${actionTaskId}`} task={tasks.find(task => task.id === actionTaskId)!} close={() => setActionTaskId(null)} edit={() => { setEditingTaskId(actionTaskId); setActionTaskId(null); }} toggleCanceled={() => toggleCanceled(actionTaskId)} remove={() => deleteTask(actionTaskId)} />}
        {editingTaskId !== null && tasks.find(task => task.id === editingTaskId) && <EditTaskModal key={`edit-task-${editingTaskId}`} task={tasks.find(task => task.id === editingTaskId)!} tasks={tasks} projects={projectItems} close={() => setEditingTaskId(null)} save={(updates) => updateTask(editingTaskId, updates)} />}
        {editingProjectName && projectItems.find(project => project.name === editingProjectName) && <EditProjectModal key={`edit-project-${editingProjectName}`} project={projectItems.find(project => project.name === editingProjectName)!} close={() => setEditingProjectName(null)} save={(name, desc) => updateProject(editingProjectName, name, desc)} />}
        {actionProjectName && projectItems.find(project => project.name === actionProjectName) && <ProjectActionsModal key={`project-actions-${actionProjectName}`} project={projectItems.find(project => project.name === actionProjectName)!} close={() => setActionProjectName(null)} setKind={(kind) => updateProjectKind(actionProjectName, kind)} onDelete={() => deleteProject(actionProjectName)} onEdit={() => { setEditingProjectName(actionProjectName); setActionProjectName(null); }} />}
        {selectedProjectName && projectItems.find(project => project.name === selectedProjectName) && <ProjectDetailModal key={`project-detail-${selectedProjectName}`} project={projectItems.find(project => project.name === selectedProjectName)!} tasks={tasks} close={() => setSelectedProjectName(null)} linkTask={linkTaskToProject} onFullscreen={() => { setFullscreenProject(selectedProjectName); setSelectedProjectName(null); }} />}
        {notice && <motion.div key="notice-toast" className="toast" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}><CheckCircle2 size={15} /> {notice}</motion.div>}
      </AnimatePresence>
    </div>
  );
}

function Dashboard({ tasks, projects, brainCount, onComplete, onFocus, onCapture, onGo, onNewTask, onTaskMenu, events, onOpenProject }: { tasks: Task[]; projects: Project[]; brainCount: number; onComplete: (id: number) => void; onFocus: (id?: number) => void; onCapture: () => void; onGo: (view: View) => void; onNewTask: () => void; onTaskMenu: (id: number) => void; events: CalendarEvent[]; onOpenProject: (name: string) => void }) {
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
  return <>
    <section className="welcome">
      <div><p className="eyebrow">{now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p><h1>{getGreeting(now)}</h1><p>Here’s what deserves your attention today.</p></div>
      <div className="day-score"><span>Today</span>{readyPriorities === 0 && activeTasks.length === 0 ? <><strong>All Done</strong><small style={{ textTransform: "none" }}>for Today</small></> : <><strong>{readyPriorities}<span>/{activeTasks.length}</span></strong><small>priorities ready</small></>}</div>
    </section>
    <div className="dashboard-grid">
      <section className="card priorities">
        <div className="card-head"><div><span className="section-icon violet"><Zap size={14} /></span><h2>Today’s priorities</h2></div><button onClick={() => onGo("Tasks")}>Plan day <ArrowRight size={14} /></button></div>
        <div className="task-list">{activeTasks.length ? activeTasks.slice(0, 3).map((task, i) => <div className={`task-row`} key={task.id}><button className="check" onClick={() => onComplete(task.id)}><span>{i + 1}</span></button><button className="task-open" onClick={() => onFocus(task.id)}><strong>{task.title}</strong><p><i style={{ background: task.color }} />{task.project} <span>·</span> {formatDueDate(task.due)} <span>·</span> {task.focusMinutes} min <span>·</span> {task.energy} energy</p></button><button className="quick-focus" aria-label={`Focus on ${task.title}`} title="Focus on this task" onClick={() => onFocus(task.id)}><Focus size={15} /></button><button className="more" aria-label={`Actions for ${task.title}`} onClick={() => onTaskMenu(task.id)}><MoreHorizontal size={17} /></button></div>) : <div className="priority-empty"><strong>No priorities right now.</strong><p>Clean slate. Add one when your brain hands you the next thing.</p></div>}</div>
        {todayTasksDue.length > 0 && <><div style={{ borderTop: "1px solid var(--line)", margin: "8px 0", paddingTop: "12px" }}><p style={{ fontSize: "9px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".08em", margin: "0 0 8px 0", fontWeight: 700, paddingLeft: "15px" }}>Today’s other tasks</p><div className="task-list" style={{ margin: 0 }}>{todayTasksDue.slice(0, 2).map(task => <div className={`task-row ${task.done ? "done" : ""} ${task.canceled ? "canceled" : ""}`} key={task.id} style={{ opacity: .7, fontSize: "13px" }}><button className="check" disabled={task.canceled} onClick={() => onComplete(task.id)}>{task.done ? <Check size={12} /> : task.canceled ? <X size={11} /> : <span style={{ fontSize: "10px" }}>•</span>}</button><button className="task-open" disabled={task.canceled} onClick={() => onFocus(task.id)}><strong>{task.title}</strong><p><i style={{ background: task.color }} />{task.project} <span>·</span> {task.canceled ? "Canceled" : formatDueDate(task.due)} <span>·</span> {task.energy} energy</p></button><button className="more" aria-label={`Actions for ${task.title}`} onClick={() => onTaskMenu(task.id)}><MoreHorizontal size={15} /></button></div>)}</div>{todayTasksDue.length > 2 && <div style={{ padding: "4px 15px", fontSize: "9px", color: "var(--muted)" }}>+{todayTasksDue.length - 2} more</div>}</div></>}
        <button className="add-row" onClick={onNewTask}><Plus size={15} /> Add priority</button>
      </section>
      <section className="focus-card">
        <div className="focus-glow" />
        <div className="card-head"><div><span className="section-icon dark-icon"><Focus size={14} /></span><h2>Next focus</h2></div><span className="ready"><i /> {nextTask ? "Ready" : "Clear"}</span></div>
        <div className="focus-content"><p>{nextTask?.project ?? "You're all caught up"}</p><h3>{nextTask?.title ?? "What should we work on next?"}</h3><div className="focus-meta">{nextTask && <><span><Clock3 size={14} /> {nextTask.focusMinutes} min</span><span><Flame size={14} /> {nextTask.energy} energy</span></>}</div></div>
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
      <section className="card projects-card">
        <div className="card-head"><div><span className="section-icon orange"><FolderKanban size={14} /></span><h2>Active projects</h2></div><button onClick={() => onGo("Projects")}>All projects <ArrowRight size={14} /></button></div>
        {projects.slice(0, 3).map(p => <div className="project-row" key={p.name} onClick={() => onOpenProject(p.name)} style={{ cursor: "pointer" }}><div className="project-glyph" style={{ color: p.color, background: `${p.color}16` }}><p.icon size={17} /></div><div><strong>{p.name}</strong><small className={`project-kind ${p.kind}`}>{p.kind === "maintenance" ? "Maintenance" : "Project"}</small><div className="progress"><i style={{ width: `${p.progress}%`, background: p.color }} /></div></div><span>{p.kind === "maintenance" ? "∞" : `${p.progress}%`}</span></div>)}
      </section>
      <section className="card inbox-card">
        <div className="card-head"><div><span className="section-icon green"><Brain size={14} /></span><h2>Brain inbox</h2></div><span className="count">{brainCount} uncategorized</span></div>
        <button className="capture-zone" onClick={onCapture}><Plus size={18} /><div><strong>Capture what’s on your mind</strong><span>Idea, thought, link, anything…</span></div><kbd>B</kbd></button>
        <div className="inbox-preview"><span>Recently captured</span><p>Explore a photo essay about late-night diners <small>12m</small></p><p>Research German student visa timeline <small>1h</small></p></div>
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
    return <motion.article role="button" tabIndex={0} className={`project-card ${p.kind}`} key={p.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .04 }} onClick={() => onOpen(p.name)} onKeyDown={event => { if (event.key === "Enter") onOpen(p.name); }}><div className="project-top"><div className="big-glyph" style={{ color: p.color, background: `${p.color}16` }}><p.icon size={22} /></div><button aria-label={`Actions for ${p.name}`} onClick={(event) => { event.stopPropagation(); onAction(p.name); }}><MoreHorizontal size={18} /></button></div><div className="project-title-line"><h3>{p.name}</h3><span className={`project-kind ${p.kind}`}>{p.kind === "maintenance" ? "Maintenance" : "Finishable"}</span></div><p>{p.desc}</p><div className="project-intel"><div><span>Next due</span><strong>{nextDue?.due ?? "Nothing due"}</strong></div><div><span>Priority</span><strong>{topTask?.priority ?? "Clear"}</strong></div></div><div className="project-task-preview">{activeTasks.slice(0, 2).map(task => <div key={task.id}><i style={{ background: task.color }} /><span>{task.title}</span><em className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</em></div>)}{!activeTasks.length && <div><i style={{ background: p.color }} /><span>No open tasks linked yet</span><em>Clear</em></div>}</div><div className="project-stats"><span>{activeTasks.length} open task{activeTasks.length !== 1 ? "s" : ""}</span><strong>{p.kind === "maintenance" ? "Ongoing" : `${calculatedProgress}%`}</strong></div><div className="progress large"><i style={{ width: `${p.kind === "maintenance" ? 100 : calculatedProgress}%`, background: p.color }} /></div></motion.article>;
  })}</div></>;
}

function Tasks({ tasks, onComplete, onNew, onTaskMenu }: { tasks: Task[]; onComplete: (id: number) => void; onNew: () => void; onTaskMenu: (id: number) => void }) {
  const [layout, setLayout] = useState<"List" | "Board" | "Calendar">("List");
  return <><div className="page-title"><div><p className="eyebrow">Make it happen</p><h1>Tasks</h1><p>A clear list of what needs your attention.</p></div><button className="primary" onClick={onNew}><Plus size={16} /> New task</button></div><div className="view-tabs"><button className={layout === "List" ? "selected" : ""} onClick={() => setLayout("List")}><ListTodo size={15} /> List</button><button className={layout === "Board" ? "selected" : ""} onClick={() => setLayout("Board")}><LayoutGrid size={15} /> Board</button><button className={layout === "Calendar" ? "selected" : ""} onClick={() => setLayout("Calendar")}><CalendarDays size={15} /> Calendar</button></div><section className={`card task-table layout-${layout.toLowerCase()}`}><div className="table-view-label">{layout} view</div><div className="table-head"><span>Task</span><span>Project</span><span>Due</span><span>Priority</span><span>Focus</span></div>{tasks.map(t => <div className={`table-row ${t.done ? "done" : ""} ${t.canceled ? "canceled" : ""}`} key={t.id}><button className="round-check" disabled={t.canceled} onClick={() => onComplete(t.id)}>{t.done ? <Check size={13} /> : t.canceled ? <X size={12} /> : null}</button><strong>{t.title}</strong><span className="project-pill"><i style={{ background: t.color }} />{t.project}</span><span>{t.canceled ? "Canceled" : formatDueDate(t.due)}</span><span className={`priority ${t.priority.toLowerCase()}`}>{t.priority}</span><span>{t.focusMinutes}m · {t.energy}</span><button aria-label={`Actions for ${t.title}`} onClick={() => onTaskMenu(t.id)}><MoreHorizontal size={17} /></button></div>)}</section></>;
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


function CalendarView({ events, weekStartsMonday, onNew, onImport, onEdit }: { events: CalendarEvent[]; weekStartsMonday: boolean; onNew: (date: string) => void; onImport: () => void; onEdit: (id: string) => void }) {
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
  const selectedEvents = events.filter(event => event.start.slice(0, 10) === selected).sort((a, b) => a.start.localeCompare(b.start));
  const todayEvents = events.filter(event => event.start.slice(0, 10) === toDateKey(new Date())).sort((a, b) => a.start.localeCompare(b.start));
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
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const durationMinutes = Math.max(20, Math.round((end.getTime() - start.getTime()) / 60_000));
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

function ToggleRow({ title, desc, checked, onChange }: { title: string; desc: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <div className="setting-row"><div><strong>{title}</strong><p>{desc}</p></div><button className={`toggle ${checked ? "on" : ""}`} onClick={() => onChange(!checked)} aria-pressed={checked}><span /></button></div>;
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
  return <><div className="page-title"><div><p className="eyebrow">Make it yours</p><h1>Settings</h1><p>Theme, notifications, focus defaults, calendar behavior, data, and workspace controls.</p></div><button className="primary" onClick={onExport}><Download size={16} /> Export data</button></div><div className="settings-layout"><section className="card settings-card"><div className="card-head"><div><span className="section-icon violet"><Palette size={14} /></span><h2>Appearance</h2></div></div><div className="settings-body"><div className="theme-options"><button className={!dark ? "selected" : ""} onClick={() => setDark(false)}><Sun size={16} /><span>Light</span></button><button className={dark ? "selected" : ""} onClick={() => setDark(true)}><Moon size={16} /><span>Dark</span></button></div><div className="accent-picker">{["#625af6", "#4b8bdc", "#47a47b", "#d99b38", "#e48b6b", "#cf625a"].map(color => <button key={color} className={settings.accent === color ? "selected" : ""} style={{ background: color }} onClick={() => update({ accent: color })} aria-label={`Set accent ${color}`} />)}</div><ToggleRow title="Compact mode" desc="Tighten spacing when you want more on screen." checked={settings.compactMode} onChange={(compactMode) => update({ compactMode })} /><ToggleRow title="Reduce motion" desc="Calmer transitions for lower sensory load." checked={settings.reduceMotion} onChange={(reduceMotion) => update({ reduceMotion })} /></div></section><section className="card settings-card"><div className="card-head"><div><span className="section-icon blue"><Bell size={14} /></span><h2>Notifications</h2></div><button onClick={requestNotifications}>Enable browser</button></div><div className="settings-body"><ToggleRow title="Daily digest" desc="A quick morning/evening summary of what matters." checked={settings.dailyDigest} onChange={(dailyDigest) => update({ dailyDigest })} /><ToggleRow title="Focus reminders" desc="Gentle nudges when a priority is waiting." checked={settings.focusReminders} onChange={(focusReminders) => update({ focusReminders })} /><ToggleRow title="Calendar alerts" desc="Remind you before events you added or imported." checked={settings.calendarAlerts} onChange={(calendarAlerts) => update({ calendarAlerts })} /><ToggleRow title="Sound effects" desc="Optional little audio cues for starts and completions." checked={settings.soundEffects} onChange={(soundEffects) => update({ soundEffects })} /></div></section><section className="card settings-card"><div className="card-head"><div><span className="section-icon green"><Focus size={14} /></span><h2>Focus defaults</h2></div></div><div className="settings-body"><div className="settings-grid-fields"><label>Default focus length<input type="number" min={5} max={240} step={5} value={settings.defaultFocusMinutes} onChange={event => update({ defaultFocusMinutes: Math.max(5, Number(event.target.value) || 45) })} /></label><label>Default energy<select value={settings.defaultEnergy} onChange={event => update({ defaultEnergy: event.target.value as EnergyLevel })}><option>Low</option><option>Medium</option><option>High</option></select></label></div><p className="settings-note">New priorities use these defaults. Existing tasks can still be edited individually.</p></div></section><section className="card settings-card"><div className="card-head"><div><span className="section-icon orange"><CalendarDays size={14} /></span><h2>Calendar</h2></div></div><div className="settings-body"><ToggleRow title="Week starts Monday" desc="Use a workweek-style calendar layout preference." checked={settings.weekStartsMonday} onChange={(weekStartsMonday) => update({ weekStartsMonday })} /><p className="settings-note">iCal imports are editable locally. Full private Apple Calendar sync needs a backend/CalDAV layer later.</p></div></section><section className="card settings-card"><div className="card-head"><div><span className="section-icon dark-icon"><Shield size={14} /></span><h2>Privacy & data</h2></div></div><div className="settings-body"><div className="data-stats"><span>{tasks.length}<small>priorities</small></span><span>{projects.length}<small>projects</small></span><span>{brainItems.length}<small>brain</small></span></div><div className="settings-actions">{onSync && <button onClick={onSync}><Download size={15} /> Sync from cloud</button>}<button onClick={onExport}><Download size={15} /> Export JSON</button><button onClick={onImport}><Download size={15} style={{ transform: "scaleY(-1)" }} /> Import JSON</button><button className="danger-settings" onClick={onReset}><Trash2 size={15} /> Reset local data</button></div><p className="settings-note">All your data syncs to the cloud. Access it from any device by visiting this link. Deleted brain thoughts stay deleted unless you capture them again.</p></div></section><section className="card settings-card"><div className="card-head"><div><span className="section-icon violet"><Command size={14} /></span><h2>Shortcuts</h2></div></div><div className="settings-body shortcut-list"><div><kbd>/</kbd><span>Find anything</span></div><div><kbd>⌘ K</kbd><span>Command palette</span></div><div><kbd>B</kbd><span>Quick capture</span></div><div><kbd>F</kbd><span>Start focus</span></div><div><kbd>N</kbd><span>New task</span></div><div><kbd>J / K</kbd><span>Switch focus task</span></div></div></section><section className="card settings-card workspace-settings"><div className="card-head"><div><span className="section-icon blue"><SlidersHorizontal size={14} /></span><h2>Account</h2></div></div><div className="settings-body"><div className="workspace-profile"><div className="avatar">{user?.email?.charAt(0).toUpperCase() || 'U'}</div><div><strong>{user?.displayName || 'User'}</strong><p>{user?.email}</p></div></div><button onClick={onLogout} style={{marginTop: '16px', width: '100%', padding: '8px 12px', background: 'rgba(255,107,107,0.1)', color: '#ff6b6b', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s'}} onMouseEnter={(e) => {e.currentTarget.style.background = 'rgba(255,107,107,0.2)'}} onMouseLeave={(e) => {e.currentTarget.style.background = 'rgba(255,107,107,0.1)'}}>Sign out</button><p className="settings-note" style={{marginTop: '16px'}}>Your data is securely stored in the cloud and synced across all your devices.</p></div></section></div></>;
}

function BrainView({ items, onCapture, onArchive }: { items: string[]; onCapture: () => void; onArchive: (index: number) => void }) {
  const [newest, setNewest] = useState(true);
  const visibleItems = (newest ? items : [...items].reverse()).map((item, index) => ({ item, sourceIndex: newest ? index : items.length - 1 - index }));
  return <><div className="page-title"><div><p className="eyebrow">Capture first. Organize later.</p><h1>Brain inbox</h1><p>A safe place for everything on your mind.</p></div><button className="primary" onClick={onCapture}><Plus size={16} /> Capture thought</button></div><div className="brain-layout"><section className="card brain-list"><div className="brain-filter"><strong>{items.length} thoughts</strong><button onClick={() => setNewest(value => !value)}>{newest ? "Newest" : "Oldest"} first <ChevronDown size={14} /></button></div>{visibleItems.map(({ item, sourceIndex }) => <div className="brain-row" key={`${item}-${sourceIndex}`}><div className="brain-dot"><Sparkles size={15} /></div><div><strong>{item}</strong><p>Captured {sourceIndex === 0 ? "just now" : `${sourceIndex + 1} hours ago`} · Unsorted</p></div><button aria-label={`Delete ${item}`} title="Delete thought" onClick={() => onArchive(sourceIndex)}><Trash2 size={15} /></button></div>)}</section><aside className="brain-aside"><div className="soft-card"><Inbox size={20} /><strong>Inbox zero is not the goal.</strong><p>Your brain is for having ideas, not holding them. Capture freely; sort when you’re ready.</p></div></aside></div></>;
}

function ResourcesView({ resources, onDelete, onReplace, onDownload }: { resources: Resource[]; onDelete: (id: string) => void; onReplace: (id: string, file: File) => void; onDownload: (resource: Resource) => void }) {
  const fileInputRef = { current: null as HTMLInputElement | null };
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleReplace = (id: string) => {
    setSelectedId(id);
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = (e: any) => {
      if (e.target.files[0]) {
        onReplace(id, e.target.files[0]);
        setSelectedId(null);
      }
    };
    input.click();
  };

  return <>
    <div className="page-title">
      <div>
        <p className="eyebrow">Keep & organize</p>
        <h1>Resources</h1>
        <p>Download, replace, or remove files and assets.</p>
      </div>
    </div>
    <div className="brain-layout">
      <section className="card brain-list">
        {resources.length ? (
          resources.map(resource => (
            <div className="brain-row" key={resource.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <strong>{resource.name}</strong>
                <p>{resource.type} · {formatFileSize(resource.size)} · {new Date(resource.uploadedAt).toLocaleDateString()}</p>
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
      setError(err.message || "Failed to sign in");
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
            marginBottom: '12px'
          }}
          onMouseEnter={(e) => !isLoading && (e.currentTarget.style.background = '#7c6fff')}
          onMouseLeave={(e) => !isLoading && (e.currentTarget.style.background = '#625af6')}
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

        {typeof window !== 'undefined' && window.location.hostname === 'localhost' && (
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

function FullscreenProject({ project, tasks, onExit, linkTask }: { project: Project; tasks: Task[]; onExit: () => void; linkTask: (id: number, project: Project) => void }) {
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
            <strong style={{ textDecoration: task.done || task.canceled ? "line-through" : "none" }}>{task.title}</strong>
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

function FocusMode({ task, tasks, onSwitch, onUpdateChecklist, onUpdateChecklistProgress, onComplete, onExit }: { task: Task; tasks: Task[]; onSwitch: (id: number) => void; onUpdateChecklist: (id: number, checklist: string[]) => void; onUpdateChecklistProgress: (id: number, progress: boolean[]) => void; onComplete: (id: number) => void; onExit: () => void }) {
  const totalSeconds = task.focusMinutes * 60;
  const [seconds, setSeconds] = useState(totalSeconds);
  const [running, setRunning] = useState(false);
  const [checklist, setChecklist] = useState<string[]>(task.checklist ?? []);
  const nextChecklist = task.checklist ?? [];
  const [checks, setChecks] = useState<boolean[]>(() => task.checklistProgress?.length === nextChecklist.length ? task.checklistProgress : nextChecklist.map(() => false));
  const [sounds, setSounds] = useState(false);
  useEffect(() => {
    setSeconds(totalSeconds);
    setRunning(false);
    const nextChecklist = task.checklist ?? [];
    setChecklist(nextChecklist);
    const savedProgress = task.checklistProgress?.length === nextChecklist.length ? task.checklistProgress : nextChecklist.map(() => false);
    setChecks(savedProgress);
  }, [task.id, totalSeconds]);
  useEffect(() => { if (!running || seconds <= 0) return; const id = setInterval(() => setSeconds(s => s - 1), 1000); return () => clearInterval(id); }, [running, seconds]);
  useEffect(() => {
    onUpdateChecklistProgress(task.id, checks);
  }, [checks, task.id, onUpdateChecklistProgress]);
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
  const switchBy = useCallback((offset: number) => {
    const current = tasks.findIndex(item => item.id === task.id);
    const next = (current + offset + tasks.length) % tasks.length;
    onSwitch(tasks[next].id);
  }, [onSwitch, task.id, tasks]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((event.target as HTMLElement).tagName)) return;
      if (event.key.toLowerCase() === "j") switchBy(1);
      if (event.key.toLowerCase() === "k") switchBy(-1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [switchBy]);
  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const completedSteps = checks.filter(Boolean).length;
  const totalSteps = Math.max(1, checklist.length);
  return <motion.div className="focus-mode" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
    <header><div className="brand"><div className="brand-mark light"><span /><span /><span /></div><span>LifeOS</span></div><span className="focus-label"><i /> Focus session</span><button onClick={onExit}><X size={16} /> Exit focus <kbd>Esc</kbd></button></header>
    <main>
      <section className="focus-main"><p className="focus-project"><i style={{ background: task.color }} />{task.project} · {task.focusMinutes} min · {task.energy} energy</p><h1>{task.title}</h1><p className="focus-sub">Stay here while it helps. Switch cleanly when your attention moves.</p>
        <div className="checklist"><div className="checklist-head"><span>SESSION CHECKLIST</span><div><label htmlFor="checklist-template">Switch checklist</label><select id="checklist-template" value={activeTemplateName} onChange={event => switchChecklist(event.target.value)}><option value="Custom" disabled>Custom checklist</option>{focusChecklistTemplates.map(template => <option key={template.name} value={template.name}>{template.name}</option>)}</select><button type="button" onClick={addChecklistItem}><Plus size={13} /> Add step</button></div></div>{checklist.length ? checklist.map((item, i) => <div className={`checklist-row ${checks[i] ? "checked" : ""}`} key={`${task.id}-${i}`}><button type="button" className="check-toggle" aria-label={`Toggle ${item}`} onClick={() => setChecks(current => current.map((value, index) => index === i ? !value : value))}>{checks[i] && <Check size={14} />}</button><input autoFocus={i === checklist.length - 1} value={item} placeholder="Write the next tiny step…" onChange={event => updateChecklistItem(i, event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); addChecklistItem(); } }} /><button type="button" className="delete-step" aria-label={`Delete ${item || "step"}`} onClick={() => deleteChecklistItem(i)}><Trash2 size={13} /></button></div>) : <div className="empty-checklist"><strong>No steps yet.</strong><button type="button" onClick={addChecklistItem}><Plus size={13} /> Add the first step</button></div>}</div>
        <div className="notes"><span>NOTES</span><textarea placeholder="Keep any thoughts here while you work…" /></div>
      </section>
      <aside className="timer-panel"><span>FOCUS TIMER</span><div className="timer-ring" style={{ "--progress": `${(seconds / totalSeconds) * 360}deg` } as React.CSSProperties}><div><strong>{time}</strong><span>{task.focusMinutes} minute session</span></div></div><button className="timer-button" onClick={() => setRunning(v => !v)}>{running ? <><Circle size={15} fill="currentColor" /> Pause</> : <><Focus size={16} /> Begin session</>}</button><button className="reset" onClick={() => { setSeconds(totalSeconds); setRunning(false); }}><TimerReset size={15} /> Reset timer</button>
        <div className="focus-switcher"><div><span>SWITCH TASK</span><small><kbd>K</kbd><kbd>J</kbd></small></div><div className="switch-list">{tasks.filter(item => !item.done && !item.canceled).map(item => <button key={item.id} className={item.id === task.id ? "active" : ""} onClick={() => onSwitch(item.id)}><i style={{ background: item.color }} /><span>{item.title}</span>{item.id === task.id && <Check size={13} />}</button>)}</div><div className="switch-arrows"><button onClick={() => switchBy(-1)}>← Previous</button><button onClick={() => switchBy(1)}>Next →</button></div></div>
        <div className="music"><Music2 size={17} /><div><strong>Focus sounds</strong><span>{sounds ? "Brown noise connected" : "Sounds are off"}</span></div><button aria-label="Toggle focus sounds" onClick={() => setSounds(value => !value)}>{sounds ? <Check size={15} /> : <Plus size={15} />}</button></div>
        <button className="mark-done-button" onClick={() => { onComplete(task.id); setTimeout(() => onExit(), 300); }}><CheckCircle2 size={16} /> Mark as done</button>
      </aside>
    </main>
    <footer><span>Session progress</span><div><i style={{ width: `${completedSteps / totalSteps * 100}%` }} /></div><strong>{completedSteps} of {checklist.length} complete</strong></footer>
  </motion.div>;
}

function CommandPalette({ query, setQuery, results, close, go, onFocus, onCapture, onNewTask, onResult }: { query: string; setQuery: (s: string) => void; results: string[]; close: () => void; go: (v: View) => void; onFocus: () => void; onCapture: () => void; onNewTask: () => void; onResult: (result: string) => void }) {
  return <motion.div className="modal-layer" onMouseDown={close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.div className="command-modal" onMouseDown={e => e.stopPropagation()} initial={{ scale: .98, y: -10 }} animate={{ scale: 1, y: 0 }}><div className="command-input"><Search size={20} /><input autoFocus placeholder="Find anything in LifeOS…" value={query} onChange={e => setQuery(e.target.value)} /><kbd>ESC</kbd></div><div className="command-results">{!query && <><p>QUICK ACTIONS</p><button onClick={onFocus}><span className="command-icon"><Focus size={16} /></span><span>Start focus session</span><kbd>F</kbd></button><button onClick={onCapture}><span className="command-icon"><Brain size={16} /></span><span>Capture a thought</span><kbd>B</kbd></button><button onClick={onNewTask}><span className="command-icon"><Plus size={16} /></span><span>Create new task</span><kbd>N</kbd></button></>}{query && <p>RESULTS</p>}{results.slice(0, 7).map(result => <button key={result} onClick={() => { if (nav.some(n => n.name === result)) { go(result as View); close(); } else onResult(result); }}><span className="command-icon">{nav.some(n => n.name === result) ? <Command size={16} /> : <Search size={16} />}</span><span>{result}</span><ArrowRight size={14} /></button>)}</div><footer><span><kbd>/</kbd> Find</span><span><kbd>↵</kbd> Open</span><span>LifeOS Search</span></footer></motion.div></motion.div>;
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

function CalendarEventModal({ close, add, event, remove, defaultDate }: { close: () => void; add: (event: CalendarEvent) => void; event?: CalendarEvent; remove?: (id: string) => void; defaultDate?: string | null }) {
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

function CalendarImportModal({ close, add }: { close: () => void; add: (events: CalendarEvent[]) => void }) {
  const [url, setUrl] = useState("");
  const [ics, setIcs] = useState("");
  const [status, setStatus] = useState("");
  const importText = (text: string) => {
    const events = parseIcsEvents(text);
    if (!events.length) {
      setStatus("No events found. Make sure this is real .ics/iCal text.");
      return;
    }
    add(events);
  };
  const importUrl = async () => {
    if (!url.trim()) return;
    setStatus("Trying to read the iCal feed…");
    try {
      const response = await fetch(url.trim());
      if (!response.ok) throw new Error("Feed rejected the request");
      importText(await response.text());
    } catch {
      setStatus("The feed could not be read in-browser. Apple often blocks private calendar fetches here — paste the .ics contents below instead.");
    }
  };
  return <motion.div className="modal-layer" onMouseDown={close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.div className="capture-modal import-modal" onMouseDown={event => event.stopPropagation()} initial={{ scale: .98, y: 8 }} animate={{ scale: 1, y: 0 }}><div className="capture-head"><div className="brain-dot"><Link2 size={16} /></div><div><strong>Import iCal / Apple Calendar</strong><span>Use a public `.ics` subscription link or paste exported calendar text.</span></div><button onClick={close} aria-label="Close"><X size={18} /></button></div><label htmlFor="ical-url">iCal subscription URL</label><div className="import-url-row"><input id="ical-url" placeholder="https://.../calendar.ics" value={url} onChange={event => setUrl(event.target.value)} /><button disabled={!url.trim()} onClick={importUrl}>Connect</button></div><label htmlFor="ical-text">Or paste .ics text</label><textarea id="ical-text" placeholder={"BEGIN:VCALENDAR\nBEGIN:VEVENT\nSUMMARY:Example\nDTSTART:20260709T090000Z\nEND:VEVENT\nEND:VCALENDAR"} value={ics} onChange={event => setIcs(event.target.value)} /><div className="capture-footer"><span>{status || "Apple tip: share/export a calendar as iCal, then paste or use the .ics URL."}</span><button disabled={!ics.trim()} onClick={() => importText(ics)}>Import pasted iCal</button></div></motion.div></motion.div>;
}

function TaskActionsModal({ task, close, edit, toggleCanceled, remove }: { task: Task; close: () => void; edit: () => void; toggleCanceled: () => void; remove: () => void }) {
  return <motion.div className="modal-layer" onMouseDown={close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.div className="task-actions-modal" onMouseDown={event => event.stopPropagation()} initial={{ scale: .98, y: 8 }} animate={{ scale: 1, y: 0 }}><div className="capture-head"><div className="brain-dot"><ListTodo size={16} /></div><div><strong>{task.title}</strong><span>{task.project} · {formatDueDate(task.due)} · {task.focusMinutes}m · {task.energy} energy</span></div><button onClick={close} aria-label="Close"><X size={18} /></button></div><div className="task-action-list"><button onClick={edit}><Pencil size={16} /><span><strong>Edit priority</strong><small>Change name, focus time, and energy</small></span></button><button onClick={toggleCanceled}><Ban size={16} /><span><strong>{task.canceled ? "Restore priority" : "Mark as canceled"}</strong><small>{task.canceled ? "Put it back into your active list" : "Keep it visible without treating it as active"}</small></span></button><button className="danger" onClick={remove}><Trash2 size={16} /><span><strong>Delete priority</strong><small>Remove it permanently</small></span></button></div><button className="action-cancel" onClick={close}>Cancel</button></motion.div></motion.div>;
}

function EditProjectModal({ project, close, save }: { project: Project; close: () => void; save: (name: string, desc: string) => void }) {
  const [name, setName] = useState(project.name);
  const [desc, setDesc] = useState(project.desc);
  return <motion.div className="modal-layer" onMouseDown={close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.form className="create-modal" onMouseDown={event => event.stopPropagation()} onSubmit={event => { event.preventDefault(); if (name.trim()) save(name.trim(), desc.trim() || project.desc); }} initial={{ scale: .98, y: 8 }} animate={{ scale: 1, y: 0 }}><div className="capture-head"><div className="brain-dot" style={{ color: project.color, background: `${project.color}16` }}><Pencil size={16} /></div><div><strong>Edit project</strong><span>Update the project name and description</span></div><button type="button" onClick={close} aria-label="Close"><X size={18} /></button></div><label htmlFor="project-name">Project name</label><input id="project-name" autoFocus value={name} onChange={event => setName(event.target.value)} /><label htmlFor="project-desc">Description</label><textarea id="project-desc" value={desc} onChange={event => setDesc(event.target.value)} style={{ minHeight: "80px", marginTop: "7px" }} /><div className="create-actions"><button type="button" onClick={close}>Cancel</button><button className="primary" disabled={!name.trim()} type="submit">Save changes</button></div></motion.form></motion.div>;
}

function ProjectActionsModal({ project, close, setKind, onDelete, onEdit }: { project: Project; close: () => void; setKind: (kind: ProjectKind) => void; onDelete?: () => void; onEdit?: () => void }) {
  return <motion.div className="modal-layer" onMouseDown={close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.div className="task-actions-modal" onMouseDown={event => event.stopPropagation()} initial={{ scale: .98, y: 8 }} animate={{ scale: 1, y: 0 }}><div className="capture-head"><div className="brain-dot" style={{ color: project.color, background: `${project.color}16` }}><project.icon size={16} /></div><div><strong>{project.name}</strong><span>{project.kind === "maintenance" ? "Maintenance system" : "Finishable project"}</span></div><button onClick={close} aria-label="Close"><X size={18} /></button></div><div className="task-action-list">{onEdit && <button onClick={onEdit}><Pencil size={16} /><span><strong>Edit project</strong><small>Change the name and description</small></span></button>}<button onClick={() => setKind("maintenance")}><Sparkles size={16} /><span><strong>Make it maintenance</strong><small>For ongoing areas like health, business ops, learning, habits.</small></span>{project.kind === "maintenance" && <Check size={15} />}</button><button onClick={() => setKind("finishable")}><CheckCircle2 size={16} /><span><strong>Make it finishable</strong><small>For projects that should end, ship, submit, or launch.</small></span>{project.kind === "finishable" && <Check size={15} />}</button>{onDelete && <button className="danger" onClick={onDelete}><Trash2 size={16} /><span><strong>Delete project</strong><small>Remove this project and move tasks to Inbox</small></span></button>}</div><button className="action-cancel" onClick={close}>Cancel</button></motion.div></motion.div>;
}

function ProjectDetailModal({ project, tasks, close, linkTask, onFullscreen }: { project: Project; tasks: Task[]; close: () => void; linkTask: (id: number, project: Project) => void; onFullscreen?: () => void }) {
  const linkedTasks = tasks.filter(task => task.project === project.name);
  const activeTasks = linkedTasks.filter(task => !task.done && !task.canceled);
  const availableTasks = tasks.filter(task => task.project !== project.name && !task.done && !task.canceled);
  const topTask = [...activeTasks].sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority])[0];
  const nextDue = [...activeTasks].sort((a, b) => dueRank(a.due) - dueRank(b.due))[0];
  return <motion.div className="modal-layer" onMouseDown={close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.div className="project-detail-modal" onMouseDown={event => event.stopPropagation()} initial={{ scale: .98, y: 8 }} animate={{ scale: 1, y: 0 }}><div className="capture-head"><div className="brain-dot" style={{ color: project.color, background: `${project.color}16` }}><project.icon size={16} /></div><div><strong>{project.name}</strong><span>{project.kind === "maintenance" ? "Maintenance / ongoing" : "Finishable project"} · {activeTasks.length} active tasks</span></div><div style={{ display: "flex", gap: "8px" }}>{onFullscreen && <button onClick={onFullscreen} aria-label="Open fullscreen" title="Open fullscreen"><Maximize size={18} style={{ color: "var(--muted)" }} /></button>}<button onClick={close} aria-label="Close"><X size={18} /></button></div></div><div className="project-detail-summary"><div><span>Next due</span><strong>{nextDue ? formatDueDate(nextDue.due) : "Nothing due"}</strong></div><div><span>Highest priority</span><strong>{topTask?.priority ?? "Clear"}</strong></div><div><span>Energy load</span><strong>{topTask ? `${topTask.energy} · ${topTask.focusMinutes}m` : "Clear"}</strong></div></div><div className="project-detail-list"><div className="project-detail-head"><span>Task</span><span>Due</span><span>Priority</span><span>Focus</span></div>{linkedTasks.length ? linkedTasks.map(task => <div className={`project-detail-row ${task.done ? "done" : ""} ${task.canceled ? "canceled" : ""}`} key={task.id}><strong>{task.title}</strong><span>{task.canceled ? "Canceled" : task.done ? "Done" : formatDueDate(task.due)}</span><em className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</em><span>{task.focusMinutes}m · {task.energy}</span></div>) : <div className="priority-empty"><strong>No tasks linked yet.</strong><p>Link an existing task below, or choose this project when creating a new task.</p></div>}</div><div className="link-task-panel"><div><strong>Link existing tasks</strong><span>Pull loose tasks into {project.name} so this project view is actually useful.</span></div>{availableTasks.length ? <div className="link-task-list">{availableTasks.slice(0, 6).map(task => <button key={task.id} type="button" onClick={() => linkTask(task.id, project)}><span><strong>{task.title}</strong><small>{task.project} · {formatDueDate(task.due)} · {task.focusMinutes}m</small></span><em className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</em><Plus size={15} /></button>)}</div> : <p>No loose active tasks to link right now.</p>}</div></motion.div></motion.div>;
}

function EditTaskModal({ task, projects, tasks, close, save }: { task: Task; projects: Project[]; tasks: Task[]; close: () => void; save: (updates: Pick<Task, "title" | "focusMinutes" | "energy" | "project" | "color" | "due" | "startTime">) => void }) {
  const [title, setTitle] = useState(task.title);
  const [projectName, setProjectName] = useState(task.project);
  const [focusMinutes, setFocusMinutes] = useState(String(task.focusMinutes));
  const [energy, setEnergy] = useState<EnergyLevel>(task.energy);
  const [dueDate, setDueDate] = useState(task.due);
  const [startTime, setStartTime] = useState(task.startTime ?? "");
  const parsedMinutes = Math.max(5, Math.min(240, Number(focusMinutes) || 45));
  const linkedProject = projects.find(project => project.name === projectName);
  const doubleBooked = checkDoubleBooking(tasks, task.id, dueDate, startTime, parsedMinutes);
  return (
    <motion.div className="modal-layer" onMouseDown={close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.form className="create-modal" onMouseDown={event => event.stopPropagation()} onSubmit={event => { event.preventDefault(); if (title.trim()) save({ title: title.trim(), project: linkedProject?.name ?? "Inbox", color: linkedProject?.color ?? "#625af6", focusMinutes: parsedMinutes, energy, due: dueDate, startTime: startTime || undefined }); }} initial={{ scale: .98, y: 8 }} animate={{ scale: 1, y: 0 }}>
        <div className="capture-head">
          <div className="brain-dot"><Pencil size={16} /></div>
          <div><strong>Edit priority</strong><span>Update the project link, focus length, energy cost, and schedule.</span></div>
          <button type="button" onClick={close} aria-label="Close"><X size={18} /></button>
        </div>
        <label htmlFor="edit-task-name">Priority name</label>
        <input id="edit-task-name" autoFocus value={title} onChange={event => setTitle(event.target.value)} />
        <label htmlFor="edit-task-project">Linked project</label>
        <select id="edit-task-project" value={projectName} onChange={event => setProjectName(event.target.value)}>
          <option value="Inbox">Inbox / no project</option>
          {projects.map(project => <option key={project.name} value={project.name}>{project.name}</option>)}
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

function CreateModal({ kind, projects, close, submit }: { kind: "task" | "project"; projects: Project[]; close: () => void; submit: (value: string, projectKind?: ProjectKind, taskProject?: string, icon?: ProjectIcon) => void }) {
  const [value, setValue] = useState("");
  const [projectKind, setProjectKind] = useState<ProjectKind>("finishable");
  const [taskProject, setTaskProject] = useState("Inbox");
  const [selectedIcon, setSelectedIcon] = useState<ProjectIcon>("Zap");
  const label = kind === "task" ? "Task" : "Project";
  const availableIcons: ProjectIcon[] = ["Zap", "Aperture", "Sparkles", "FileText", "UserRound", "FolderKanban"];
  return <motion.div className="modal-layer" onMouseDown={close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.form className="create-modal" onMouseDown={e => e.stopPropagation()} onSubmit={e => { e.preventDefault(); if (value.trim()) submit(value.trim(), projectKind, taskProject, selectedIcon); }} initial={{ scale: .98, y: 8 }} animate={{ scale: 1, y: 0 }}><div className="capture-head"><div className="brain-dot">{kind === "task" ? <CheckCircle2 size={16} /> : <FolderKanban size={16} />}</div><div><strong>New {kind}</strong><span>{kind === "project" ? "Choose if this is a garden or a mission." : "Give it a clear name and park it in the right project."}</span></div><button type="button" onClick={close} aria-label="Close"><X size={18} /></button></div><label htmlFor="create-name">{label} name</label><input id="create-name" autoFocus placeholder={kind === "task" ? "What needs to get done?" : "What are you building?"} value={value} onChange={e => setValue(e.target.value)} />{kind === "task" && <><label htmlFor="create-task-project">Linked project</label><select id="create-task-project" value={taskProject} onChange={event => setTaskProject(event.target.value)}><option value="Inbox">Inbox / no project</option>{projects.map(project => <option key={project.name} value={project.name}>{project.name}</option>)}</select></>}{kind === "project" && <><div className="project-kind-picker"><button type="button" className={projectKind === "finishable" ? "selected" : ""} onClick={() => setProjectKind("finishable")}><CheckCircle2 size={16} /><span><strong>Finishable project</strong><small>Has a launch, deadline, deliverable, or done state.</small></span></button><button type="button" className={projectKind === "maintenance" ? "selected" : ""} onClick={() => setProjectKind("maintenance")}><Sparkles size={16} /><span><strong>Maintenance / ongoing</strong><small>A garden you keep alive: business, health, habits, creative practice.</small></span></button></div><label>Project icon</label><div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "8px" }}>{availableIcons.map(icon => {const IconComponent = projectIcons[icon]; return <button key={icon} type="button" className={`icon-option ${selectedIcon === icon ? "selected" : ""}`} onClick={() => setSelectedIcon(icon)} style={{ padding: "12px", borderRadius: "8px", border: selectedIcon === icon ? "2px solid var(--accent)" : "1px solid var(--line)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{IconComponent && <IconComponent size={20} />}</button>;})}</div></>}<div className="create-actions"><button type="button" onClick={close}>Cancel</button><button className="primary" disabled={!value.trim()} type="submit">Create {kind}</button></div></motion.form></motion.div>;
}
