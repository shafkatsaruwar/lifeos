"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen, ClipboardList, GraduationCap, Home, Layers, Library, Settings, Sparkles, Users,
} from "lucide-react";
import { MasterOSProvider } from "@/lib/masteros/store";

const NAV = [
  { href: "/masteros", label: "Home", icon: Home },
  { href: "/masteros/students", label: "Students", icon: Users },
  { href: "/masteros/courses", label: "Courses", icon: GraduationCap },
  { href: "/masteros/lessons", label: "Lessons", icon: BookOpen },
  { href: "/masteros/assignments", label: "Assignments", icon: ClipboardList },
  { href: "/masteros/gradebook", label: "Gradebook", icon: Layers },
  { href: "/masteros/skills", label: "Skills", icon: Sparkles },
  { href: "/masteros/questions", label: "Question Bank", icon: Library },
];

export function MasterOSShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const teaching = pathname?.includes("/teach");
  const report = pathname?.includes("/report");

  return (
    <MasterOSProvider>
      {teaching || report ? (
        children
      ) : (
        <div className="mos-shell">
          <aside className="mos-sidebar">
            <Link href="/masteros" className="mos-brand">
              <span className="mos-brand-mark">
                <span /><span /><span />
              </span>
              <span>MasterOS<small>Personal teaching OS</small></span>
            </Link>
            <p className="nav-label">Classroom</p>
            <nav className="mos-nav">
              {NAV.map((item) => {
                const active = item.href === "/masteros" ? pathname === "/masteros" : pathname?.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href} className={`nav-item${active ? " active" : ""}`}>
                    <item.icon size={16} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="sidebar-bottom">
              <Link href="/" className="nav-item">LifeOS</Link>
              <Link href="/masteros/settings" className={`nav-item${pathname === "/masteros/settings" ? " active" : ""}`}>
                <Settings size={16} /> Settings
              </Link>
            </div>
          </aside>
          <div className="mos-main">{children}</div>
          <nav className="mos-mobile-nav">
            {NAV.slice(0, 5).map((item) => (
              <Link key={item.href} href={item.href} className={pathname === item.href || (item.href !== "/masteros" && pathname?.startsWith(item.href)) ? "active" : ""}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </MasterOSProvider>
  );
}
