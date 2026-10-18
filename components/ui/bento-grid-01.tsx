"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Globe, Lock, Smartphone } from "lucide-react";

/**
 * Settings hub bento — uses semantic CSS variables so Atelier Light and
 * Atelier Dark (Phase 2) both read correctly without hard-coded zinc/white.
 */

function TypeTester({ reduceMotion }: { reduceMotion?: boolean }) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (reduceMotion) return;
    const interval = setInterval(() => {
      setScale((prev) => (prev === 1 ? 1.5 : 1));
    }, 2000);
    return () => clearInterval(interval);
  }, [reduceMotion]);

  return (
    <div className="flex h-full items-center justify-center">
      <motion.span
        className="text-6xl font-medium text-[var(--ink)] md:text-8xl"
        animate={reduceMotion ? undefined : { scale }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        Aa
      </motion.span>
    </div>
  );
}

function LayoutAnimation({ reduceMotion }: { reduceMotion?: boolean }) {
  const [layout, setLayout] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const interval = setInterval(() => {
      setLayout((prev) => (prev + 1) % 3);
    }, 2500);
    return () => clearInterval(interval);
  }, [reduceMotion]);

  const layouts = ["grid-cols-2", "grid-cols-3", "grid-cols-1"];

  return (
    <div className="flex h-full items-center justify-center">
      <motion.div
        className={`grid ${layouts[layout]} h-full w-full max-w-[140px] gap-1.5`}
        layout={!reduceMotion}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="h-5 w-full rounded-md bg-[color-mix(in_srgb,var(--ink)_12%,transparent)]"
            layout={!reduceMotion}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          />
        ))}
      </motion.div>
    </div>
  );
}

function SpeedIndicator({ reduceMotion }: { reduceMotion?: boolean }) {
  const [loading, setLoading] = useState(!reduceMotion);

  useEffect(() => {
    if (reduceMotion) {
      setLoading(false);
      return;
    }
    const timeout = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timeout);
  }, [reduceMotion]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <div className="relative flex h-10 w-full items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loader"
              className="h-8 w-24 rounded bg-[color-mix(in_srgb,var(--ink)_10%,transparent)]"
              initial={{ opacity: 0.5 }}
              animate={{ opacity: [0.4, 0.7, 0.4] }}
              exit={{ opacity: 0, y: -20, position: "absolute" }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          ) : (
            <motion.span
              key="text"
              initial={reduceMotion ? false : { y: 20, opacity: 0, filter: "blur(5px)" }}
              animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
              className="text-3xl font-medium text-[var(--ink)] md:text-4xl"
            >
              45m
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <span className="text-sm text-[var(--muted)]">Focus default</span>
      <div className="h-1.5 w-full max-w-[120px] overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--ink)_10%,transparent)]">
        <motion.div
          className="h-full rounded-full bg-[var(--ink)]"
          initial={{ width: 0 }}
          animate={{ width: loading ? 0 : "100%" }}
          transition={{ type: "spring", stiffness: 100, damping: 15, mass: 1 }}
        />
      </div>
    </div>
  );
}

function SecurityBadge({ reduceMotion }: { reduceMotion?: boolean }) {
  const [shields, setShields] = useState([
    { id: 1, active: false },
    { id: 2, active: false },
    { id: 3, active: false },
  ]);

  useEffect(() => {
    if (reduceMotion) {
      setShields((prev) => prev.map((s) => ({ ...s, active: true })));
      return;
    }
    const interval = setInterval(() => {
      setShields((prev) => {
        const nextIndex = prev.findIndex((s) => !s.active);
        if (nextIndex === -1) {
          return prev.map(() => ({ id: Math.random(), active: false }));
        }
        return prev.map((s, i) => (i === nextIndex ? { ...s, active: true } : s));
      });
    }, 800);
    return () => clearInterval(interval);
  }, [reduceMotion]);

  return (
    <div className="flex h-full items-center justify-center gap-2">
      {shields.map((shield) => (
        <motion.div
          key={shield.id}
          className={`flex h-12 w-12 items-center justify-center rounded-lg ${
            shield.active
              ? "bg-[color-mix(in_srgb,var(--ink)_12%,transparent)]"
              : "bg-[color-mix(in_srgb,var(--ink)_5%,transparent)]"
          }`}
          animate={{ scale: shield.active ? 1.1 : 1 }}
          transition={{ duration: 0.3 }}
        >
          <Lock
            className={`h-5 w-5 ${shield.active ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}
          />
        </motion.div>
      ))}
    </div>
  );
}

function GlobalNetwork({ reduceMotion }: { reduceMotion?: boolean }) {
  const pulses = [0, 1, 2, 3, 4];

  return (
    <div className="relative flex h-full items-center justify-center">
      <Globe className="z-10 h-16 w-16 text-[color-mix(in_srgb,var(--ink)_80%,transparent)]" />
      {!reduceMotion &&
        pulses.map((pulse) => (
          <motion.div
            key={pulse}
            className="absolute h-16 w-16 rounded-full border-2 border-[color-mix(in_srgb,var(--ink)_20%,transparent)]"
            initial={{ scale: 0.5, opacity: 1 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: pulse * 0.8,
              ease: "easeOut",
            }}
          />
        ))}
    </div>
  );
}

export type SettingsBentoSection =
  | "appearance"
  | "hubs"
  | "connections"
  | "focus"
  | "privacy"
  | "notifications";

export type SettingsBentoGridProps = {
  reduceMotion?: boolean;
  onSelect?: (section: SettingsBentoSection) => void;
};

const tileClass =
  "settings-bento-tile flex cursor-pointer flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)] p-8 transition-colors hover:border-[color-mix(in_srgb,var(--accent)_28%,var(--line))] hover:bg-[color-mix(in_srgb,var(--canvas)_55%,var(--panel))]";

export function SettingsBentoGrid({ reduceMotion, onSelect }: SettingsBentoGridProps) {
  const select = (section: SettingsBentoSection) => () => onSelect?.(section);

  return (
    <section
      className="settings-bento rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-4 py-8 md:px-6 md:py-10"
      data-testid="settings-bento"
    >
      <div className="mx-auto w-full max-w-7xl">
        <motion.p
          className="mb-6 text-sm uppercase tracking-widest text-[var(--muted)]"
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          Workspace overview
        </motion.p>

        <div className="grid auto-rows-[200px] grid-cols-1 gap-4 md:grid-cols-6">
          <motion.div
            role="button"
            tabIndex={0}
            onClick={select("appearance")}
            onKeyDown={(e) => e.key === "Enter" && select("appearance")()}
            className={`${tileClass} md:col-span-2 md:row-span-2`}
            initial={reduceMotion ? false : { opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={reduceMotion ? undefined : { scale: 1.02 }}
          >
            <div className="flex-1">
              <TypeTester reduceMotion={reduceMotion} />
            </div>
            <div className="mt-4">
              <h3 className="text-xl font-medium text-[var(--ink)]">Appearance</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">Theme, accent, and density for LifeOS.</p>
            </div>
          </motion.div>

          <motion.div
            role="button"
            tabIndex={0}
            onClick={select("hubs")}
            onKeyDown={(e) => e.key === "Enter" && select("hubs")()}
            className={`${tileClass} md:col-span-2`}
            initial={reduceMotion ? false : { opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            whileHover={reduceMotion ? undefined : { scale: 0.98 }}
          >
            <div className="flex-1">
              <LayoutAnimation reduceMotion={reduceMotion} />
            </div>
            <div className="mt-4">
              <h3 className="text-xl font-medium text-[var(--ink)]">Hubs</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">Choose which spaces show in the sidebar.</p>
            </div>
          </motion.div>

          <motion.div
            role="button"
            tabIndex={0}
            onClick={select("connections")}
            onKeyDown={(e) => e.key === "Enter" && select("connections")()}
            className={`${tileClass} p-6 md:col-span-2 md:row-span-2`}
            initial={reduceMotion ? false : { opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            whileHover={
              reduceMotion
                ? undefined
                : { scale: 1.02, boxShadow: "var(--shadow-card)" }
            }
          >
            <div className="flex flex-1 items-center justify-center">
              <div className="relative">
                <GlobalNetwork reduceMotion={reduceMotion} />
              </div>
            </div>
            <div className="relative z-20 mt-auto rounded-lg bg-[color-mix(in_srgb,var(--surface-2)_90%,transparent)] p-2 backdrop-blur-sm">
              <h3 className="flex items-center gap-2 text-xl font-medium text-[var(--ink)]">
                <Globe className="h-5 w-5" />
                Connections
              </h3>
              <p className="mt-1 text-sm text-[var(--muted)]">Gmail, calendars, and assistant access in one place.</p>
            </div>
          </motion.div>

          <motion.div
            role="button"
            tabIndex={0}
            onClick={select("focus")}
            onKeyDown={(e) => e.key === "Enter" && select("focus")()}
            className={`${tileClass} md:col-span-2`}
            initial={reduceMotion ? false : { opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            whileHover={reduceMotion ? undefined : { scale: 0.98 }}
          >
            <div className="flex-1">
              <SpeedIndicator reduceMotion={reduceMotion} />
            </div>
            <div className="mt-4">
              <h3 className="text-xl font-medium text-[var(--ink)]">Focus</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">Default session length and energy.</p>
            </div>
          </motion.div>

          <motion.div
            role="button"
            tabIndex={0}
            onClick={select("privacy")}
            onKeyDown={(e) => e.key === "Enter" && select("privacy")()}
            className={`${tileClass} md:col-span-3`}
            initial={reduceMotion ? false : { opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            whileHover={reduceMotion ? undefined : { scale: 0.98 }}
          >
            <div className="flex-1">
              <SecurityBadge reduceMotion={reduceMotion} />
            </div>
            <div className="mt-4">
              <h3 className="flex items-center gap-2 text-xl font-medium text-[var(--ink)]">
                <Lock className="h-5 w-5" />
                Privacy &amp; data
              </h3>
              <p className="mt-1 text-sm text-[var(--muted)]">Export, sync, and keep session replay opt-in.</p>
            </div>
          </motion.div>

          <motion.div
            role="button"
            tabIndex={0}
            onClick={select("notifications")}
            onKeyDown={(e) => e.key === "Enter" && select("notifications")()}
            className={`${tileClass} md:col-span-3`}
            initial={reduceMotion ? false : { opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            whileHover={reduceMotion ? undefined : { scale: 0.98 }}
          >
            <div className="flex flex-1 items-center justify-center">
              <Smartphone className="h-16 w-16 text-[var(--ink)]" />
            </div>
            <div className="mt-4">
              <h3 className="text-xl font-medium text-[var(--ink)]">Notifications</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">Digest, focus nudges, and calendar alerts.</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/** Demo / marketing variant matching the original bento-grid-01 recipe. */
export default function BentoGrid01() {
  return <SettingsBentoGrid />;
}
