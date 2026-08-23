import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { attentionSkills, courseProgress, createSeedState, uid, type Lesson, type MasterOSState, type TeacherNote } from "./shared";

const STORAGE_KEY = "lifeos.masteros.v1";

type MasterOSContextValue = {
  state: MasterOSState;
  hydrated: boolean;
  addNote: (note: Omit<TeacherNote, "id" | "createdAt">) => void;
  updateLesson: (id: string, updates: Partial<Lesson>) => void;
  resetDemo: () => void;
};

const MasterOSContext = createContext<MasterOSContextValue | null>(null);

export function MasterOSProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<MasterOSState>(() => createSeedState());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled) return;
        if (raw) {
          const parsed = JSON.parse(raw) as MasterOSState;
          setState({ ...createSeedState(), ...parsed });
        }
      } catch {
        // keep seed
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  const addNote = useCallback((note: Omit<TeacherNote, "id" | "createdAt">) => {
    setState((current) => ({
      ...current,
      teacherNotes: [
        { ...note, id: uid("tn"), createdAt: new Date().toISOString() },
        ...current.teacherNotes,
      ],
    }));
  }, []);

  const updateLesson = useCallback((id: string, updates: Partial<Lesson>) => {
    setState((current) => ({
      ...current,
      lessons: current.lessons.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    }));
  }, []);

  const resetDemo = useCallback(() => {
    setState(createSeedState());
  }, []);

  const value = useMemo(
    () => ({ state, hydrated, addNote, updateLesson, resetDemo }),
    [state, hydrated, addNote, updateLesson, resetDemo],
  );

  return <MasterOSContext.Provider value={value}>{children}</MasterOSContext.Provider>;
}

export function useMasterOS() {
  const ctx = useContext(MasterOSContext);
  if (!ctx) throw new Error("useMasterOS must be used inside MasterOSProvider");
  return ctx;
}

export { attentionSkills, courseProgress };
