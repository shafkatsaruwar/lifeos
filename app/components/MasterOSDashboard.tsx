"use client";

import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import {
  BookOpen, ClipboardList, GraduationCap, Home, Layers, Library, Settings, Sparkles, Users, UsersRound,
} from "lucide-react";
import { MasterOSProvider } from "@/lib/masteros/store";
import {
  MosEmbedProvider,
  isMosFullscreenPath,
  mosPathToQuery,
  parseMosHref,
  queryToMosPath,
} from "@/lib/masteros/embed-routing";
import "@/app/masteros/masteros.css";

import MasterOSHome from "@/app/masteros/page";
import MasterOSClasses from "@/app/masteros/classes/page";
import MasterOSStudents from "@/app/masteros/students/page";
import MasterOSStudent from "@/app/masteros/students/[id]/page";
import MasterOSStudentReport from "@/app/masteros/students/[id]/report/page";
import MasterOSCourses from "@/app/masteros/courses/page";
import MasterOSCourse from "@/app/masteros/courses/[id]/page";
import MasterOSLessons from "@/app/masteros/lessons/page";
import MasterOSLesson from "@/app/masteros/lessons/[id]/page";
import MasterOSTeach from "@/app/masteros/lessons/[id]/teach/page";
import MasterOSAssignments from "@/app/masteros/assignments/page";
import MasterOSAssignment from "@/app/masteros/assignments/[id]/page";
import MasterOSGradebook from "@/app/masteros/gradebook/page";
import MasterOSSkills from "@/app/masteros/skills/page";
import MasterOSQuestions from "@/app/masteros/questions/page";
import MasterOSSettings from "@/app/masteros/settings/page";

const SUBNAV = [
  { href: "/masteros", label: "Home", icon: Home },
  { href: "/masteros/classes", label: "Classes", icon: UsersRound },
  { href: "/masteros/students", label: "Students", icon: Users },
  { href: "/masteros/courses", label: "Courses", icon: GraduationCap },
  { href: "/masteros/lessons", label: "Lessons", icon: BookOpen },
  { href: "/masteros/assignments", label: "Assignments", icon: ClipboardList },
  { href: "/masteros/gradebook", label: "Gradebook", icon: Layers },
  { href: "/masteros/skills", label: "Skills", icon: Sparkles },
  { href: "/masteros/questions", label: "Questions", icon: Library },
  { href: "/masteros/settings", label: "Settings", icon: Settings },
];

function readInitialMosLocation() {
  if (typeof window === "undefined") return { path: "/masteros", search: "" };
  const params = new URLSearchParams(window.location.search);
  const path = queryToMosPath(params.get("mos"));
  const searchParams = new URLSearchParams(params);
  searchParams.delete("view");
  searchParams.delete("mos");
  const search = searchParams.toString() ? `?${searchParams.toString()}` : "";
  return { path, search };
}

function renderMosRoute(path: string) {
  if (path === "/masteros") return <MasterOSHome />;
  if (path === "/masteros/classes") return <MasterOSClasses />;
  if (path === "/masteros/students") return <MasterOSStudents />;
  if (path === "/masteros/courses") return <MasterOSCourses />;
  if (path === "/masteros/lessons") return <MasterOSLessons />;
  if (path === "/masteros/assignments") return <MasterOSAssignments />;
  if (path === "/masteros/gradebook") return <MasterOSGradebook />;
  if (path === "/masteros/skills") return <MasterOSSkills />;
  if (path === "/masteros/questions") return <MasterOSQuestions />;
  if (path === "/masteros/settings") return <MasterOSSettings />;
  if (/^\/masteros\/lessons\/[^/]+\/teach$/.test(path)) return <MasterOSTeach />;
  if (/^\/masteros\/lessons\/[^/]+$/.test(path)) return <MasterOSLesson />;
  if (/^\/masteros\/students\/[^/]+\/report$/.test(path)) return <MasterOSStudentReport />;
  if (/^\/masteros\/students\/[^/]+$/.test(path)) return <MasterOSStudent />;
  if (/^\/masteros\/courses\/[^/]+$/.test(path)) return <MasterOSCourse />;
  if (/^\/masteros\/assignments\/[^/]+$/.test(path)) return <MasterOSAssignment />;
  return (
    <div className="mos-page">
      <p className="mos-muted">That MasterOS page isn’t available here.</p>
      <p className="mos-muted">Path: {path}</p>
    </div>
  );
}

export function MasterOSDashboard() {
  const initial = useMemo(() => readInitialMosLocation(), []);
  const [path, setPath] = useState(initial.path);
  const [search, setSearch] = useState(initial.search);
  const [history, setHistory] = useState<string[]>([initial.path + initial.search]);

  const syncUrl = useCallback((nextPath: string, nextSearch: string) => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("view", "masteros");
    const mos = mosPathToQuery(nextPath);
    if (mos) url.searchParams.set("mos", mos);
    else url.searchParams.delete("mos");
    const extra = new URLSearchParams(nextSearch.startsWith("?") ? nextSearch.slice(1) : nextSearch);
    ["view", "mos"].forEach(key => extra.delete(key));
    extra.forEach((value, key) => url.searchParams.set(key, value));
    // Drop leftover new= etc from previous page when search cleared
    if (!nextSearch) {
      ["new"].forEach(key => {
        if (!extra.has(key)) url.searchParams.delete(key);
      });
    }
    window.history.replaceState({}, "", `${url.pathname}?${url.searchParams.toString()}`);
  }, []);

  const navigate = useCallback((href: string) => {
    const parsed = parseMosHref(href);
    if (!parsed.path.startsWith("/masteros")) {
      window.location.href = href;
      return;
    }
    setPath(parsed.path);
    setSearch(parsed.search);
    setHistory(current => [...current, parsed.path + parsed.search]);
    syncUrl(parsed.path, parsed.search);
  }, [syncUrl]);

  const back = useCallback(() => {
    setHistory(current => {
      if (current.length < 2) {
        setPath("/masteros");
        setSearch("");
        syncUrl("/masteros", "");
        return ["/masteros"];
      }
      const next = current.slice(0, -1);
      const target = next[next.length - 1] ?? "/masteros";
      const parsed = parseMosHref(target);
      setPath(parsed.path);
      setSearch(parsed.search);
      syncUrl(parsed.path, parsed.search);
      return next;
    });
  }, [syncUrl]);

  useEffect(() => {
    syncUrl(path, search);
  }, [path, search, syncUrl]);

  const onCaptureClick = (event: MouseEvent<HTMLDivElement>) => {
    const anchor = (event.target as HTMLElement | null)?.closest?.("a");
    if (!anchor) return;
    const href = anchor.getAttribute("href");
    if (!href || !href.startsWith("/masteros")) return;
    if (anchor.getAttribute("target") === "_blank") return;
    event.preventDefault();
    event.stopPropagation();
    navigate(href);
  };

  const fullscreen = isMosFullscreenPath(path);

  return (
    <MasterOSProvider>
      <MosEmbedProvider path={path} search={search} navigate={navigate} back={back}>
        <div className={`masteros-embedded${fullscreen ? " fullscreen" : ""}`} onClickCapture={onCaptureClick}>
          {!fullscreen && (
            <nav className="masteros-subnav" aria-label="MasterOS classroom">
              {SUBNAV.map(item => {
                const active = item.href === "/masteros"
                  ? path === "/masteros"
                  : path === item.href || path.startsWith(`${item.href}/`);
                return (
                  <button
                    key={item.href}
                    type="button"
                    className={active ? "active" : ""}
                    onClick={() => navigate(item.href)}
                  >
                    <item.icon size={14} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          )}
          <div className="masteros-embedded-body">
            {renderMosRoute(path)}
          </div>
        </div>
      </MosEmbedProvider>
    </MasterOSProvider>
  );
}
