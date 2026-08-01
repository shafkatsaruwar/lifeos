"use client";

import "./NotificationCenter.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CalendarDays, Check, FileText, GraduationCap, ListTodo, X } from "lucide-react";
import {
  type LifeOSNotification,
  type NotificationSource,
  formatNotificationTime,
  groupNotificationsBySource,
  isBannerCandidate,
  notificationSourceAccent,
  notificationSourceLabel,
} from "@/lib/notifications";

const BANNER_DURATION_MS = 5000;
const sourceIcon = (source: NotificationSource) => {
  switch (source) {
    case "work": return ListTodo;
    case "life": return Check;
    case "school": return GraduationCap;
    case "calendar": return CalendarDays;
  }
};

function NotificationIcon({ item, size = 16 }: { item: LifeOSNotification; size?: number }) {
  const Icon = item.kind === "deliverable" ? FileText : sourceIcon(item.source);
  const accent = notificationSourceAccent[item.source];
  return (
    <span className="macos-notification-icon" style={{ color: accent, background: `${accent}18` }}>
      <Icon size={size} />
    </span>
  );
}

function MacOSBanner({ item, onNavigate, onClose }: {
  item: LifeOSNotification;
  onNavigate: (item: LifeOSNotification) => void;
  onClose: (id: string) => void;
}) {
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const startRef = useRef(Date.now());
  const elapsedRef = useRef(0);

  useEffect(() => {
    startRef.current = Date.now() - elapsedRef.current;
  }, [paused]);

  useEffect(() => {
    if (paused) return;
    const tick = window.setInterval(() => {
      elapsedRef.current = Date.now() - startRef.current;
      const remaining = Math.max(0, 100 - (elapsedRef.current / BANNER_DURATION_MS) * 100);
      setProgress(remaining);
      if (remaining <= 0) onClose(item.id);
    }, 40);
    return () => window.clearInterval(tick);
  }, [item.id, onClose, paused]);

  return (
    <motion.div
      className="macos-banner"
      layout
      initial={{ opacity: 0, y: -12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, scale: 0.96 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <button type="button" className="macos-banner-main" onClick={() => onNavigate(item)}>
        <NotificationIcon item={item} size={15} />
        <span className="macos-banner-copy">
          <strong>{notificationSourceLabel[item.source]}</strong>
          <span>{item.title}</span>
          <small>{item.subtitle || item.kind} · {item.dueIn}</small>
        </span>
      </button>
      <button type="button" className="macos-banner-close" aria-label={`Dismiss ${item.title}`} onClick={() => onClose(item.id)}>
        <X size={14} />
      </button>
      <div className="macos-banner-progress-track">
        <div className="macos-banner-progress" style={{ width: `${progress}%`, background: notificationSourceAccent[item.source] }} />
      </div>
    </motion.div>
  );
}

export function NotificationBanners({ notifications, onNavigate }: {
  notifications: LifeOSNotification[];
  onNavigate: (item: LifeOSNotification) => void;
}) {
  const seenRef = useRef<Set<string>>(new Set());
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [visible, setVisible] = useState<LifeOSNotification[]>([]);

  useEffect(() => {
    const incoming = notifications.filter(item => isBannerCandidate(item) && !seenRef.current.has(item.id) && !hiddenIds.has(item.id));
    if (!incoming.length) return;
    incoming.forEach(item => { seenRef.current.add(item.id); });
    setVisible(current => {
      const merged = [...incoming, ...current.filter(item => !incoming.some(entry => entry.id === item.id))];
      return merged.slice(0, 3);
    });
  }, [notifications, hiddenIds]);

  const closeBanner = useCallback((id: string) => {
    setHiddenIds(current => new Set(current).add(id));
    setVisible(current => current.filter(item => item.id !== id));
  }, []);

  const openBanner = useCallback((item: LifeOSNotification) => {
    closeBanner(item.id);
    onNavigate(item);
  }, [closeBanner, onNavigate]);

  if (!visible.length) return null;

  return (
    <div className="macos-banner-stack" aria-live="polite">
      <AnimatePresence initial={false}>
        {visible.map(item => (
          <MacOSBanner key={item.id} item={item} onNavigate={openBanner} onClose={closeBanner} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function CenterNotificationRow({ item, onNavigate, onDismiss }: {
  item: LifeOSNotification;
  onNavigate: (item: LifeOSNotification) => void;
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="macos-center-row">
      <button type="button" className="macos-center-row-main" onClick={() => onNavigate(item)}>
        <NotificationIcon item={item} />
        <span className="macos-center-row-copy">
          <strong>{item.title}</strong>
          <small>{item.subtitle || notificationSourceLabel[item.source]} · {item.dueIn}</small>
        </span>
        <time>{formatNotificationTime(item.sortAt)}</time>
      </button>
      <button type="button" className="macos-center-row-dismiss" aria-label={`Dismiss ${item.title}`} onClick={() => onDismiss(item.id)}>
        <X size={13} />
      </button>
    </div>
  );
}

export function NotificationBell({ notifications, onNavigate, onDismiss, onDismissAll }: {
  notifications: LifeOSNotification[];
  onNavigate: (item: LifeOSNotification) => void;
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const groups = groupNotificationsBySource(notifications);
  const todayLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="notification-bell-wrap" ref={rootRef}>
      <button
        type="button"
        className="notification-bell-button"
        aria-label={notifications.length ? `${notifications.length} notifications` : "Notification Center"}
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
      >
        <Bell size={18} />
        {notifications.length > 0 && <span className="notification-bell-badge">{notifications.length > 9 ? "9+" : notifications.length}</span>}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="macos-center-panel"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
          >
            <header className="macos-center-header">
              <div>
                <strong>Notification Center</strong>
                <small>{todayLabel}</small>
              </div>
              {notifications.length > 0 && (
                <button type="button" className="macos-center-clear" onClick={() => { onDismissAll(); setOpen(false); }}>
                  Clear All
                </button>
              )}
            </header>

            <div className="macos-center-body">
              {groups.length ? groups.map(group => (
                <section key={group.source} className="macos-center-group">
                  <header>
                    <span className="macos-center-group-dot" style={{ background: notificationSourceAccent[group.source] }} />
                    <strong>{notificationSourceLabel[group.source]}</strong>
                    <span>{group.items.length}</span>
                  </header>
                  {group.items.map(item => (
                    <CenterNotificationRow
                      key={item.id}
                      item={item}
                      onNavigate={(entry) => { onNavigate(entry); setOpen(false); }}
                      onDismiss={onDismiss}
                    />
                  ))}
                </section>
              )) : (
                <div className="macos-center-empty">
                  <Bell size={22} />
                  <strong>No Notifications</strong>
                  <p>Alerts for meetings, due items, and calendar events will appear here.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
