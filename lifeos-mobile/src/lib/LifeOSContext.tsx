import { createContext, useContext } from "react";
import type { User } from "firebase/auth";
import type {
  BrainItem,
  CalendarEvent,
  ClassRecord,
  LifeHubState,
  Note,
  Project,
  Resource,
  SettingsState,
  SchoolHubState,
  Task,
  Workspace,
} from "../types";
import type { Theme } from "./theme";

export type AppState = {
  user: User;
  workspace: Workspace;
  theme: Theme;
  dark: boolean;
  sync: () => Promise<void>;
  updateTasks: (next: Task[]) => Promise<void>;
  updateProjects: (next: Project[]) => Promise<void>;
  updateNotes: (next: Note[]) => Promise<void>;
  updateSettings: (next: SettingsState) => Promise<void>;
  updateClasses: (next: ClassRecord[]) => Promise<void>;
  updateCalendar: (next: CalendarEvent[]) => Promise<void>;
  updateBrain: (next: BrainItem[]) => Promise<void>;
  updateResources: (next: Resource[]) => Promise<void>;
  updateLife: (next: LifeHubState) => Promise<void>;
  updateSchool: (next: SchoolHubState) => Promise<void>;
};

export const LifeOSContext = createContext<AppState | null>(null);

export function useLifeOS(): AppState {
  const ctx = useContext(LifeOSContext);
  if (!ctx) throw new Error("LifeOS has not loaded yet");
  return ctx;
}
