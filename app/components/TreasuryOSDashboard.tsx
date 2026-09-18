"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  CalendarClock, Check, Cloud, CloudOff, HeartHandshake, Pencil, PiggyBank,
  Plus, RotateCcw, Settings2, Sparkles, Trash2, WalletCards
} from "lucide-react";
import { get, ref, set } from "firebase/database";
import { getClientDatabase } from "@/lib/firebase";

type Mode = "employed" | "between-contracts";
type CategoryKind = "expense" | "savings";

type LifeOSUser = {
  uid: string;
  email: string | null;
  displayName?: string | null;
};

type TreasuryCategory = {
  id: string;
  name: string;
  emoji: string;
  kind: CategoryKind;
  target: number;
  betweenTarget: number;
};

type TreasurySettings = {
  copy: TreasuryCopy;
  hourlyRate: number;
  weeklyHours: number;
  withholdingRate: number;
  monthlyBaseline: number;
  babaEveningShiftValue: number;
  contractEnd: string;
  categories: TreasuryCategory[];
};

type TreasuryCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  safeCardLabel: string;
  safeCardHelp: string;
  availableCardLabel: string;
  availableCardHelp: string;
  remainingCardLabel: string;
  remainingCardHelp: string;
  contractCardLabel: string;
  budgetModeTitle: string;
  employedHelp: string;
  betweenContractsHelp: string;
  retireBabaTitle: string;
  retireBabaMetricLabel: string;
  retireBabaImpactPrefix: string;
  retireBabaImpactMiddle: string;
  retireBabaImpactSuffix: string;
  retireBabaMissing: string;
  savingsTitle: string;
  savingsHelp: string;
  savingsCallout: string;
  moneyMapTitle: string;
  incomeInputLabel: string;
  incomeHintPrefix: string;
  monthNotePlaceholder: string;
  categoriesTitle: string;
  categoriesHelp: string;
  incomeSetupTitle: string;
  incomeSetupHelp: string;
  footer: string;
};

type MonthlyState = {
  month: string;
  mode: Mode;
  categoryValues: Record<string, number>;
  refundIncome: number;
  giftIncome: number;
  actualIncome: number;
  otherIncome: number;
  note: string;
};

const defaultCategories: TreasuryCategory[] = [
  { id: "parents", name: "Parents / Project Retire Baba", emoji: "❤️", kind: "expense", target: 1100, betweenTarget: 0 },
  { id: "masters", name: "Master's", emoji: "🎓", kind: "savings", target: 350, betweenTarget: 0 },
  { id: "debt", name: "Debt", emoji: "💳", kind: "expense", target: 400, betweenTarget: 400 },
  { id: "transportation", name: "Transportation", emoji: "🚆", kind: "expense", target: 165, betweenTarget: 0 },
  { id: "subscriptions", name: "Subscriptions", emoji: "📱", kind: "expense", target: 100, betweenTarget: 100 },
  { id: "fun", name: "Fun / misc", emoji: "🎉", kind: "expense", target: 300, betweenTarget: 100 },
];

const defaultSettings: TreasurySettings = {
  copy: {
    eyebrow: "TREASURYOS",
    title: "TreasuryOS",
    subtitle: "Your categories, your targets, your actual numbers. Nothing important is locked in.",
    safeCardLabel: "SAFE TO SPEND / SAVE",
    safeCardHelp: "after your current mode targets",
    availableCardLabel: "AVAILABLE THIS MONTH",
    availableCardHelp: "income + one-off money",
    remainingCardLabel: "ACTUAL REMAINING",
    remainingCardHelp: "after what you actually entered",
    contractCardLabel: "CONTRACT ENDS",
    budgetModeTitle: "Budget mode",
    employedHelp: "Use each category’s normal target.",
    betweenContractsHelp: "Use each category’s between-contract target.",
    retireBabaTitle: "Project Retire Baba",
    retireBabaMetricLabel: "This month",
    retireBabaImpactPrefix: "That replaces about",
    retireBabaImpactMiddle: "evening DoorDash shifts at",
    retireBabaImpactSuffix: "/shift.",
    retireBabaMissing: "Add or restore a category with the built-in Parents role to show this tracker.",
    savingsTitle: "Savings buckets",
    savingsHelp: "Total entered this month across categories marked as savings.",
    savingsCallout: "Create buckets like Emergency Fund, Tuition, Camera Gear, Travel, or anything else you want to save toward.",
    moneyMapTitle: "money map",
    incomeInputLabel: "Actual take-home income this month",
    incomeHintPrefix: "Leave this at $0 to use your editable baseline of",
    monthNotePlaceholder: "Month note, e.g. transit was prepaid last month; phone came from birthday money…",
    categoriesTitle: "Custom categories",
    categoriesHelp: "Add, rename, delete, or retarget anything. Between-contract targets let the same category automatically shrink or pause when you switch modes.",
    incomeSetupTitle: "Income setup",
    incomeSetupHelp: "These are editable assumptions. Your actual monthly income can override the baseline above.",
    footer: "Your budget, your categories, your numbers. The defaults are only a starting point.",
  },
  hourlyRate: 25,
  weeklyHours: 37.5,
  withholdingRate: 20.3,
  monthlyBaseline: 3200,
  babaEveningShiftValue: 75,
  contractEnd: "2026-10-31",
  categories: defaultCategories,
};

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function defaultMonthState(): MonthlyState {
  return {
    month: currentMonthKey(),
    mode: "employed",
    categoryValues: {},
    refundIncome: 0,
    giftIncome: 0,
    actualIncome: 0,
    otherIncome: 0,
    note: "",
  };
}

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const exactMoney = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
const clamp = (n: number, min = 0) => Math.max(min, Number.isFinite(n) ? n : 0);
const makeId = () => `cat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const LOCAL_SETTINGS_KEY = "shafkat-budget-settings";
const LEGACY_MONTH_KEY = "shafkat-budget-month";
const monthStorageKey = (month: string) => `shafkat-budget-month-${month}`;
const lifeosTreasuryPath = (uid: string, suffix: string) => `users/${uid}/treasuryOS/${suffix}`;

function migrateSettings(raw: any): TreasurySettings {
  if (!raw) return defaultSettings;
  if (Array.isArray(raw.categories)) return { ...defaultSettings, ...raw, copy: { ...defaultSettings.copy, ...raw.copy }, categories: raw.categories };
  const categories = defaultCategories.map(c => ({
    ...c,
    target:
      c.id === "parents" ? raw.parentsTarget ?? c.target :
      c.id === "masters" ? raw.mastersTarget ?? c.target :
      c.id === "debt" ? raw.debtTarget ?? c.target :
      c.id === "transportation" ? raw.transitTarget ?? c.target :
      c.id === "subscriptions" ? raw.subscriptionsTarget ?? c.target :
      c.id === "fun" ? raw.funTarget ?? c.target : c.target,
  }));
  return { ...defaultSettings, ...raw, copy: { ...defaultSettings.copy, ...raw.copy }, categories };
}

function migrateMonth(raw: any): MonthlyState {
  if (!raw) return defaultMonthState();
  if (raw.categoryValues) return { ...defaultMonthState(), ...raw };
  return {
    ...defaultMonthState(),
    ...raw,
    categoryValues: {
      parents: raw.parentsPaid ?? 0,
      masters: raw.mastersPaid ?? 0,
      debt: raw.debtPaid ?? 0,
      transportation: raw.transitPaid ?? 0,
      subscriptions: raw.subscriptionsPaid ?? 0,
      fun: raw.funSpent ?? 0,
    },
  };
}

export function TreasuryOSDashboard({ lifeosUser = null }: { lifeosUser?: LifeOSUser | null }) {
  const [settings, setSettings] = useState<TreasurySettings>(defaultSettings);
  const [month, setMonth] = useState<MonthlyState>(defaultMonthState());
  const [syncMsg, setSyncMsg] = useState("");
  const [localReady, setLocalReady] = useState(false);
  const [cloudReady, setCloudReady] = useState(!lifeosUser);
  const [copyEditing, setCopyEditing] = useState(false);
  const [newBucketName, setNewBucketName] = useState("");
  const [newBucketTarget, setNewBucketTarget] = useState("");
  const [addingBucket, setAddingBucket] = useState(false);
  const [editingBucketId, setEditingBucketId] = useState<string | null>(null);
  const skipNextCloudSave = useRef(false);
  const sessionEmail = lifeosUser?.email ?? null;
  const copy = settings.copy;
  const savingsBuckets = settings.categories.filter(c => c.kind === "savings");
  const cloudEnabled = Boolean(lifeosUser?.uid);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const localSettings = localStorage.getItem(LOCAL_SETTINGS_KEY);
        const localMonth = localStorage.getItem(monthStorageKey(defaultMonthState().month)) ?? localStorage.getItem(LEGACY_MONTH_KEY);
        if (localSettings) setSettings(migrateSettings(JSON.parse(localSettings)));
        if (localMonth) setMonth(migrateMonth(JSON.parse(localMonth)));
      } catch {
        if (!cancelled) setSyncMsg("Couldn’t load browser storage. Allow site storage and reload to save your budget.");
      }
      if (!cancelled) setLocalReady(true);

      if (!lifeosUser?.uid) {
        if (!cancelled) {
          setCloudReady(true);
          setSyncMsg("Saved in this browser ✓");
        }
        return;
      }

      if (!cancelled) {
        setCloudReady(false);
        setSyncMsg("Loading cloud budget…");
      }
      const database = getClientDatabase();
      if (!database) {
        if (!cancelled) {
          setCloudReady(true);
          setSyncMsg("Saved in this browser ✓");
        }
        return;
      }

      try {
        const [settingsSnap, monthSnap] = await Promise.all([
          get(ref(database, lifeosTreasuryPath(lifeosUser.uid, "settings"))),
          get(ref(database, lifeosTreasuryPath(lifeosUser.uid, `months/${defaultMonthState().month}`))),
        ]);
        if (cancelled) return;
        skipNextCloudSave.current = true;
        if (settingsSnap.exists()) setSettings(migrateSettings(settingsSnap.val()?.data ?? settingsSnap.val()));
        if (monthSnap.exists()) setMonth(migrateMonth(monthSnap.val()?.data ?? monthSnap.val()));
        setSyncMsg(settingsSnap.exists() || monthSnap.exists() ? "Synced with LifeOS ✓" : "No cloud budget yet — changes will sync with your LifeOS account.");
      } catch {
        if (!cancelled) setSyncMsg("Cloud sync unavailable. Saving in this browser.");
      } finally {
        if (!cancelled) setCloudReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [lifeosUser?.uid]);

  useEffect(() => {
    if (!localReady) return;
    try {
      localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
      localStorage.setItem(monthStorageKey(month.month), JSON.stringify(month));
      localStorage.setItem(LEGACY_MONTH_KEY, JSON.stringify(month));
    } catch {
      setSyncMsg("Couldn’t save in this browser. Check available storage and site permissions.");
      return;
    }

    if (!cloudEnabled || !cloudReady) {
      if (!cloudEnabled) setSyncMsg("Saved in this browser ✓");
      return;
    }
    if (skipNextCloudSave.current) {
      skipNextCloudSave.current = false;
      return;
    }

    const timer = window.setTimeout(async () => {
      const database = getClientDatabase();
      if (!database || !lifeosUser?.uid) return;
      try {
        await Promise.all([
          set(ref(database, lifeosTreasuryPath(lifeosUser.uid, "settings")), { data: settings, updatedAt: new Date().toISOString() }),
          set(ref(database, lifeosTreasuryPath(lifeosUser.uid, `months/${month.month}`)), { data: month, month: month.month, updatedAt: new Date().toISOString() }),
        ]);
        setSyncMsg("Synced with LifeOS ✓");
      } catch {
        setSyncMsg("Saved in this browser. Cloud sync failed — try again later.");
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [settings, month, localReady, cloudReady, cloudEnabled, lifeosUser?.uid]);

  async function changeMonth(nextMonth: string) {
    const fallback = (currentMode: MonthlyState["mode"]) => ({ ...defaultMonthState(), month: nextMonth, mode: currentMode });
    const localMonth = localStorage.getItem(monthStorageKey(nextMonth));
    if (localMonth) {
      setMonth(migrateMonth(JSON.parse(localMonth)));
    } else {
      setMonth(m => fallback(m.mode));
    }

    if (!lifeosUser?.uid) return;
    const database = getClientDatabase();
    if (!database) return;
    try {
      const monthSnap = await get(ref(database, lifeosTreasuryPath(lifeosUser.uid, `months/${nextMonth}`)));
      if (monthSnap.exists()) {
        skipNextCloudSave.current = true;
        setMonth(migrateMonth(monthSnap.val()?.data ?? monthSnap.val()));
        setSyncMsg("Loaded month from LifeOS ✓");
      }
    } catch {
      setSyncMsg("Couldn’t load that month from cloud.");
    }
  }

  async function saveCloud() {
    if (!lifeosUser?.uid) return setSyncMsg("Sign in to LifeOS to sync across devices.");
    const database = getClientDatabase();
    if (!database) return setSyncMsg("Firebase is not configured yet.");
    setSyncMsg("Saving…");
    try {
      await Promise.all([
        set(ref(database, lifeosTreasuryPath(lifeosUser.uid, "settings")), { data: settings, updatedAt: new Date().toISOString() }),
        set(ref(database, lifeosTreasuryPath(lifeosUser.uid, `months/${month.month}`)), { data: month, month: month.month, updatedAt: new Date().toISOString() }),
      ]);
      setSyncMsg("Synced with LifeOS ✓");
    } catch {
      setSyncMsg("Cloud save failed. Your budget is still saved in this browser.");
    }
  }

  const computed = useMemo(() => {
    const grossWeekly = settings.hourlyRate * settings.weeklyHours;
    const netWeekly = grossWeekly * (1 - settings.withholdingRate / 100);
    const modeledMonthly = netWeekly * 52 / 12;
    const earnedIncome = month.actualIncome > 0 ? month.actualIncome : settings.monthlyBaseline;
    const oneOffs = month.refundIncome + month.giftIncome + month.otherIncome;
    const available = earnedIncome + oneOffs;
    const planned = settings.categories.reduce((sum, c) => sum + (month.mode === "employed" ? c.target : c.betweenTarget), 0);
    const safeToSpend = Math.max(0, available - planned);
    const actualAllocated = Object.values(month.categoryValues).reduce((a, b) => a + clamp(b), 0);
    const actualRemaining = available - actualAllocated;
    const parentsPaid = month.categoryValues.parents ?? 0;
    const savingsAllocated = settings.categories.filter(c => c.kind === "savings").reduce((sum, c) => sum + (month.categoryValues[c.id] ?? 0), 0);
    const babaShifts = settings.babaEveningShiftValue > 0 ? parentsPaid / settings.babaEveningShiftValue : 0;
    const contractDays = Math.ceil((new Date(settings.contractEnd + "T23:59:59").getTime() - Date.now()) / 86400000);
    return { grossWeekly, netWeekly, modeledMonthly, earnedIncome, oneOffs, available, planned, safeToSpend, actualAllocated, actualRemaining, parentsPaid, savingsAllocated, babaShifts, contractDays };
  }, [settings, month]);

  const setS = (k: keyof Omit<TreasurySettings, "categories" | "copy">, v: string) => setSettings(s => ({ ...s, [k]: k === "contractEnd" ? v : clamp(Number(v)) }));
  const setM = (k: keyof MonthlyState, v: string) => setMonth(m => ({ ...m, [k]: v }));
  const setCategoryValue = (id: string, value: number) => setMonth(m => ({ ...m, categoryValues: { ...m.categoryValues, [id]: clamp(value) } }));
  const setCopy = (k: keyof TreasuryCopy, v: string) => setSettings(s => ({ ...s, copy: { ...s.copy, [k]: v } }));

  function updateCategory(id: string, patch: Partial<TreasuryCategory>) {
    setSettings(s => ({ ...s, categories: s.categories.map(c => c.id === id ? { ...c, ...patch } : c) }));
  }

  function addCategory() {
    const id = makeId();
    setSettings(s => ({ ...s, categories: [...s.categories, { id, name: "New category", emoji: "💰", kind: "expense", target: 0, betweenTarget: 0 }] }));
  }

  function addSavingsBucket(name = "New savings bucket", emoji = "🏦", target = 0) {
    const id = makeId();
    setSettings(s => ({
      ...s,
      categories: [...s.categories, { id, name, emoji, kind: "savings", target, betweenTarget: 0 }],
    }));
    return id;
  }

  function beginEditBucket(bucket: TreasuryCategory) {
    setAddingBucket(false);
    setEditingBucketId(bucket.id);
    setNewBucketName(bucket.name);
    setNewBucketTarget(String(bucket.target || ""));
  }

  function cancelBucketForm() {
    setAddingBucket(false);
    setEditingBucketId(null);
    setNewBucketName("");
    setNewBucketTarget("");
  }

  function saveBucketForm() {
    const name = newBucketName.trim() || "New savings bucket";
    const target = clamp(Number(newBucketTarget));
    if (editingBucketId) {
      updateCategory(editingBucketId, { name, target });
      setSyncMsg(`Updated savings bucket “${name}”`);
    } else {
      addSavingsBucket(name, "🏦", target);
      setSyncMsg(`Created savings bucket “${name}”`);
    }
    cancelBucketForm();
  }

  function deleteBucket(id: string) {
    const cat = settings.categories.find(c => c.id === id);
    if (!cat || !confirm(`Delete “${cat.name}”? Existing monthly amounts for it will no longer be counted.`)) return;
    setSettings(s => ({ ...s, categories: s.categories.filter(c => c.id !== id) }));
    if (editingBucketId === id) cancelBucketForm();
    setSyncMsg(`Deleted savings bucket “${cat.name}”`);
  }

  function deleteCategory(id: string) {
    const cat = settings.categories.find(c => c.id === id);
    if (!cat || !confirm(`Delete “${cat.name}”? Existing monthly amounts for it will no longer be counted.`)) return;
    setSettings(s => ({ ...s, categories: s.categories.filter(c => c.id !== id) }));
  }

  function resetMonth() {
    if (!confirm("Reset this month’s entries? Your categories and targets stay the same.")) return;
    setMonth({ ...defaultMonthState(), month: month.month, mode: month.mode });
  }

  const parentsTarget = settings.categories.find(c => c.id === "parents")?.target ?? 0;

  return (
    <div className={`os-dashboard treasury-dashboard${copyEditing ? " copy-editing" : ""}`}>
      <div className="os-hero">
        <div>
          <p className="eyebrow" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Sparkles size={12} />
            <EditableText editing={copyEditing} value={copy.eyebrow} onChange={v => setCopy("eyebrow", v)} ariaLabel="App eyebrow" />
          </p>
          <h1><EditableText editing={copyEditing} value={copy.title} onChange={v => setCopy("title", v)} ariaLabel="Dashboard title" /></h1>
          <p><EditableText editing={copyEditing} value={copy.subtitle} onChange={v => setCopy("subtitle", v)} ariaLabel="Dashboard subtitle" /></p>
        </div>
        <div className="treasury-hero-actions">
          <button
            type="button"
            className={`treasury-edit-toggle${copyEditing ? " active" : ""}`}
            onClick={() => setCopyEditing(open => !open)}
            aria-pressed={copyEditing}
            title={copyEditing ? "Done editing labels" : "Edit labels"}
          >
            {copyEditing ? <Check size={14} /> : <Pencil size={14} />}
            <span>{copyEditing ? "Done" : "Edit labels"}</span>
          </button>
          <div className={`treasury-sync-pill${sessionEmail || cloudEnabled ? " synced" : ""}`}>
            {sessionEmail
              ? <><Cloud size={14} /> Synced as {sessionEmail}</>
              : cloudEnabled
                ? <><Cloud size={14} /> Synced with LifeOS</>
                : <><CloudOff size={14} /> Local mode</>}
          </div>
        </div>
      </div>

      {!cloudReady && (
        <section className="os-module">
          <header><div><Cloud size={17} /><h2>Loading budget…</h2></div></header>
        </section>
      )}

      <>
        <section className="os-module treasury-summary-sticky">
          <div className="work-stat-grid treasury-stat-grid">
            <article className="work-stat-card treasury-stat safe" data-testid="treasury-safe">
              <strong>{money.format(computed.safeToSpend)}</strong>
              <span><EditableText editing={copyEditing} value={copy.safeCardLabel} onChange={v => setCopy("safeCardLabel", v)} ariaLabel="Safe card label" /></span>
              <small><EditableText editing={copyEditing} value={copy.safeCardHelp} onChange={v => setCopy("safeCardHelp", v)} ariaLabel="Safe card helper text" /></small>
            </article>
            <article className="work-stat-card treasury-stat" data-testid="treasury-available">
              <strong>{money.format(computed.available)}</strong>
              <span><EditableText editing={copyEditing} value={copy.availableCardLabel} onChange={v => setCopy("availableCardLabel", v)} ariaLabel="Available card label" /></span>
              <small><EditableText editing={copyEditing} value={copy.availableCardHelp} onChange={v => setCopy("availableCardHelp", v)} ariaLabel="Available card helper text" /></small>
            </article>
            <article className="work-stat-card treasury-stat" data-testid="treasury-remaining">
              <strong className={computed.actualRemaining < 0 ? "bad" : ""}>{money.format(computed.actualRemaining)}</strong>
              <span><EditableText editing={copyEditing} value={copy.remainingCardLabel} onChange={v => setCopy("remainingCardLabel", v)} ariaLabel="Remaining card label" /></span>
              <small><EditableText editing={copyEditing} value={copy.remainingCardHelp} onChange={v => setCopy("remainingCardHelp", v)} ariaLabel="Remaining card helper text" /></small>
            </article>
            <article className="work-stat-card treasury-stat">
              <strong>{computed.contractDays >= 0 ? `${computed.contractDays} days` : "Ended"}</strong>
              <span><EditableText editing={copyEditing} value={copy.contractCardLabel} onChange={v => setCopy("contractCardLabel", v)} ariaLabel="Contract card label" /></span>
              <small>{settings.contractEnd}</small>
            </article>
          </div>
        </section>

        <section className="os-module treasury-mode-bar">
          <div className="os-module-body treasury-mode-inner">
            <div>
              <strong><EditableText editing={copyEditing} value={copy.budgetModeTitle} onChange={v => setCopy("budgetModeTitle", v)} ariaLabel="Budget mode title" /></strong>
              <p>
                <EditableText
                  editing={copyEditing}
                  value={month.mode === "employed" ? copy.employedHelp : copy.betweenContractsHelp}
                  onChange={v => setCopy(month.mode === "employed" ? "employedHelp" : "betweenContractsHelp", v)}
                  ariaLabel="Budget mode helper text"
                />
              </p>
            </div>
            <div className="work-view-tabs">
              <button type="button" className={month.mode === "employed" ? "selected" : ""} onClick={() => setMonth(m => ({ ...m, mode: "employed" }))}>Employed</button>
              <button type="button" className={month.mode === "between-contracts" ? "selected" : ""} onClick={() => setMonth(m => ({ ...m, mode: "between-contracts" }))}>Between contracts</button>
            </div>
          </div>
        </section>

        <div className="os-two-up">
          <section className="os-module">
            <header><div><HeartHandshake size={17} /><h2><EditableText editing={copyEditing} value={copy.retireBabaTitle} onChange={v => setCopy("retireBabaTitle", v)} ariaLabel="Retire Baba panel title" /></h2></div></header>
            <div className="os-module-body treasury-pad">
              {settings.categories.some(c => c.id === "parents") ? <>
                <div className="treasury-progress-row">
                  <span><EditableText editing={copyEditing} value={copy.retireBabaMetricLabel} onChange={v => setCopy("retireBabaMetricLabel", v)} ariaLabel="Retire Baba metric label" /></span>
                  <b>{money.format(computed.parentsPaid)} / {money.format(parentsTarget)}</b>
                </div>
                <Progress value={computed.parentsPaid} max={parentsTarget} />
                <p className="treasury-impact">
                  <EditableText editing={copyEditing} value={copy.retireBabaImpactPrefix} onChange={v => setCopy("retireBabaImpactPrefix", v)} ariaLabel="Retire Baba impact prefix" />{" "}
                  <strong>{computed.babaShifts.toFixed(1)}</strong>{" "}
                  <EditableText editing={copyEditing} value={copy.retireBabaImpactMiddle} onChange={v => setCopy("retireBabaImpactMiddle", v)} ariaLabel="Retire Baba impact middle" />{" "}
                  {exactMoney.format(settings.babaEveningShiftValue)}
                  <EditableText editing={copyEditing} value={copy.retireBabaImpactSuffix} onChange={v => setCopy("retireBabaImpactSuffix", v)} ariaLabel="Retire Baba impact suffix" />
                </p>
              </> : <p className="treasury-muted"><EditableText editing={copyEditing} value={copy.retireBabaMissing} onChange={v => setCopy("retireBabaMissing", v)} ariaLabel="Missing parents category message" /></p>}
            </div>
          </section>

          <section className="os-module">
            <header>
              <div><PiggyBank size={17} /><h2><EditableText editing={copyEditing} value={copy.savingsTitle} onChange={v => setCopy("savingsTitle", v)} ariaLabel="Savings panel title" /></h2></div>
              {!addingBucket && !editingBucketId ? (
                <button type="button" onClick={() => { setEditingBucketId(null); setAddingBucket(true); setNewBucketName(""); setNewBucketTarget(""); }}><Plus size={14} /> Add bucket</button>
              ) : null}
            </header>
            <div className="os-module-body treasury-pad">
              <div className="treasury-runway">{money.format(computed.savingsAllocated)}</div>
              <p className="treasury-muted"><EditableText editing={copyEditing} value={copy.savingsHelp} onChange={v => setCopy("savingsHelp", v)} ariaLabel="Savings helper text" /></p>

              {savingsBuckets.length > 0 ? (
                <div className="treasury-bucket-list">
                  {savingsBuckets.map(bucket => {
                    const paid = month.categoryValues[bucket.id] ?? 0;
                    const target = month.mode === "employed" ? bucket.target : bucket.betweenTarget;
                    const isEditing = editingBucketId === bucket.id;
                    return (
                      <div className="treasury-bucket-row" key={bucket.id}>
                        <div className="treasury-bucket-meta">
                          <strong>{bucket.emoji} {bucket.name}</strong>
                          <small>{money.format(paid)} / {money.format(target)}</small>
                          <Progress value={paid} max={target} />
                        </div>
                        <div className="treasury-bucket-controls">
                          <div className="currency"><span>$</span><input inputMode="decimal" type="number" min="0" step="1" value={paid || ""} placeholder="0" aria-label={`${bucket.name} this month`} onChange={e => setCategoryValue(bucket.id, clamp(Number(e.target.value)))} /></div>
                          <button type="button" className="treasury-icon-button" aria-label={`Edit ${bucket.name}`} aria-pressed={isEditing} onClick={() => beginEditBucket(bucket)}><Pencil size={14} /></button>
                          <button type="button" className="treasury-icon-button danger" aria-label={`Delete ${bucket.name}`} onClick={() => deleteBucket(bucket.id)}><Trash2 size={14} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : !addingBucket && !editingBucketId ? (
                copyEditing ? (
                  <div className="treasury-callout">
                    <EditableText editing={copyEditing} value={copy.savingsCallout} onChange={v => setCopy("savingsCallout", v)} ariaLabel="Savings callout" multiline />
                  </div>
                ) : (
                  <button
                    type="button"
                    className="treasury-callout treasury-callout-action"
                    onClick={() => { setEditingBucketId(null); setAddingBucket(true); }}
                  >
                    <span>{copy.savingsCallout}</span>
                    <strong><Plus size={14} /> Create a savings bucket</strong>
                  </button>
                )
              ) : null}

              {(addingBucket || editingBucketId) ? (
                <form
                  className="treasury-bucket-form"
                  onSubmit={e => {
                    e.preventDefault();
                    saveBucketForm();
                  }}
                >
                  <label className="treasury-field">
                    <span>{editingBucketId ? "Edit bucket name" : "Bucket name"}</span>
                    <input autoFocus value={newBucketName} placeholder="Emergency Fund" onChange={e => setNewBucketName(e.target.value)} />
                  </label>
                  <label className="treasury-field">
                    <span>Monthly target</span>
                    <input type="number" min="0" step="1" value={newBucketTarget} placeholder="500" onChange={e => setNewBucketTarget(e.target.value)} />
                  </label>
                  <div className="treasury-bucket-form-actions">
                    <button type="submit" className="os-now-button">{editingBucketId ? "Save bucket" : "Create bucket"}</button>
                    <button type="button" className="os-profile-button" onClick={cancelBucketForm}>Cancel</button>
                  </div>
                </form>
              ) : null}
            </div>
          </section>
        </div>

        <section className="os-module">
          <header>
            <div>
              <WalletCards size={17} />
              <h2>
                {month.month}{" "}
                <EditableText editing={copyEditing} value={copy.moneyMapTitle} onChange={v => setCopy("moneyMapTitle", v)} ariaLabel="Money map title" />
              </h2>
            </div>
            <input className="treasury-month-picker" type="month" value={month.month} onChange={e => changeMonth(e.target.value)} />
          </header>
          <div className="os-module-body treasury-pad">
            <div className="treasury-live-totals" aria-live="polite">
              <div><span>Available</span><b data-testid="live-available">{money.format(computed.available)}</b></div>
              <div><span>Entered this month</span><b data-testid="live-entered">{money.format(computed.actualAllocated)}</b></div>
              <div><span>Actual remaining</span><b data-testid="live-remaining" className={computed.actualRemaining < 0 ? "bad" : ""}>{money.format(computed.actualRemaining)}</b></div>
              <div><span>Safe after targets</span><b data-testid="live-safe">{money.format(computed.safeToSpend)}</b></div>
            </div>

            <div className="treasury-income-strip">
              <MoneyInput
                label={<EditableText editing={copyEditing} value={copy.incomeInputLabel} onChange={v => setCopy("incomeInputLabel", v)} ariaLabel="Income input label" />}
                value={month.actualIncome}
                onChange={v => setMonth(m => ({ ...m, actualIncome: v }))}
                positive
                amountLabel="Actual take-home income this month"
              />
              <div className="treasury-income-hint">
                <EditableText editing={copyEditing} value={copy.incomeHintPrefix} onChange={v => setCopy("incomeHintPrefix", v)} ariaLabel="Income hint" />{" "}
                <label className="treasury-baseline-edit">
                  <span className="sr-only">Budget baseline</span>
                  <span>$</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={settings.monthlyBaseline || ""}
                    aria-label="Budget baseline"
                    onChange={e => setS("monthlyBaseline", e.target.value)}
                  />
                </label>
                .
              </div>
            </div>

            <div className="treasury-category-list">
              {settings.categories.map(c => {
                const target = month.mode === "employed" ? c.target : c.betweenTarget;
                return (
                  <MoneyInput
                    key={c.id}
                    label={`${c.emoji} ${c.name}`}
                    value={month.categoryValues[c.id] ?? 0}
                    target={target}
                    onChange={v => setCategoryValue(c.id, v)}
                    onTargetChange={v => updateCategory(c.id, month.mode === "employed" ? { target: v } : { betweenTarget: v })}
                    savings={c.kind === "savings"}
                    amountLabel={`${c.name} this month`}
                    targetLabel={`${c.name} target`}
                  />
                );
              })}
            </div>

            <div className="treasury-money-grid">
              <MoneyInput label="Refunds received" value={month.refundIncome} onChange={v => setMonth(m => ({ ...m, refundIncome: v }))} positive amountLabel="Refunds received" />
              <MoneyInput label="Gifts / birthday money" value={month.giftIncome} onChange={v => setMonth(m => ({ ...m, giftIncome: v }))} positive amountLabel="Gifts / birthday money" />
              <MoneyInput label="Other income" value={month.otherIncome} onChange={v => setMonth(m => ({ ...m, otherIncome: v }))} positive amountLabel="Other income" />
            </div>

            <textarea
              className="treasury-note"
              value={month.note}
              onChange={e => setM("note", e.target.value)}
              placeholder={copy.monthNotePlaceholder}
            />
            {copyEditing && (
              <label className="treasury-field" style={{ marginTop: 10 }}>
                <span>Month note placeholder</span>
                <input value={copy.monthNotePlaceholder} onChange={e => setCopy("monthNotePlaceholder", e.target.value)} />
              </label>
            )}

            <div className="treasury-actions">
              {cloudEnabled && <button type="button" className="os-now-button" onClick={saveCloud}>Save + sync</button>}
              <button type="button" className="os-profile-button" onClick={resetMonth}><RotateCcw size={14} /> Reset month</button>
              {syncMsg ? <span className="treasury-muted">{syncMsg}</span> : null}
            </div>
          </div>
        </section>

        <section className="os-module">
          <header>
            <div>
              <Settings2 size={17} />
              <h2><EditableText editing={copyEditing} value={copy.categoriesTitle} onChange={v => setCopy("categoriesTitle", v)} ariaLabel="Categories section title" /></h2>
            </div>
            <button type="button" onClick={addCategory}><Plus size={14} /> Add category</button>
          </header>
          <div className="os-module-body treasury-pad">
            <p className="treasury-muted" style={{ marginBottom: 14 }}>
              <EditableText editing={copyEditing} value={copy.categoriesHelp} onChange={v => setCopy("categoriesHelp", v)} ariaLabel="Categories helper text" multiline />
            </p>
            <div className="treasury-category-editor">
              {settings.categories.map(c => (
                <div className="treasury-category-row" key={c.id}>
                  <input className="emoji" aria-label={`${c.name} emoji`} value={c.emoji} maxLength={4} onChange={e => updateCategory(c.id, { emoji: e.target.value })} />
                  <input className="name" aria-label="Category name" value={c.name} onChange={e => updateCategory(c.id, { name: e.target.value })} />
                  <select value={c.kind} onChange={e => updateCategory(c.id, { kind: e.target.value as CategoryKind })}>
                    <option value="expense">Expense</option>
                    <option value="savings">Savings</option>
                  </select>
                  <label><span>Normal target</span><div className="mini-currency">$<input type="number" min="0" value={c.target} onChange={e => updateCategory(c.id, { target: clamp(Number(e.target.value)) })} /></div></label>
                  <label><span>Between contracts</span><div className="mini-currency">$<input type="number" min="0" value={c.betweenTarget} onChange={e => updateCategory(c.id, { betweenTarget: clamp(Number(e.target.value)) })} /></div></label>
                  <button type="button" className="treasury-delete" aria-label={`Delete ${c.name}`} onClick={() => deleteCategory(c.id)}><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="os-two-up">
          <section className="os-module">
            <header><div><CalendarClock size={17} /><h2><EditableText editing={copyEditing} value={copy.incomeSetupTitle} onChange={v => setCopy("incomeSetupTitle", v)} ariaLabel="Income setup title" /></h2></div></header>
            <div className="os-module-body treasury-pad">
              <p className="treasury-muted"><EditableText editing={copyEditing} value={copy.incomeSetupHelp} onChange={v => setCopy("incomeSetupHelp", v)} ariaLabel="Income setup helper text" multiline /></p>
              <div className="treasury-mini-stats">
                <div><span>Gross / week</span><b>{exactMoney.format(computed.grossWeekly)}</b></div>
                <div><span>Net / week</span><b>{exactMoney.format(computed.netWeekly)}</b></div>
                <div><span>Modeled avg / month</span><b>{exactMoney.format(computed.modeledMonthly)}</b></div>
              </div>
              <div className="treasury-settings-grid">
                <Num label="Hourly rate" value={settings.hourlyRate} onChange={v => setS("hourlyRate", v)} step="0.5" />
                <Num label="Hours / week" value={settings.weeklyHours} onChange={v => setS("weeklyHours", v)} step="0.5" />
                <Num label="Withholding %" value={settings.withholdingRate} onChange={v => setS("withholdingRate", v)} step="0.1" />
                <Num label="Budget baseline" value={settings.monthlyBaseline} onChange={v => setS("monthlyBaseline", v)} />
                <Num label="Baba evening shift $" value={settings.babaEveningShiftValue} onChange={v => setS("babaEveningShiftValue", v)} />
                <label className="treasury-field"><span>Contract end</span><input type="date" value={settings.contractEnd} onChange={e => setS("contractEnd", e.target.value)} /></label>
              </div>
            </div>
          </section>

          <section className="os-module">
            <header>
              <div>
                {cloudEnabled ? <Cloud size={17} /> : <CloudOff size={17} />}
                <h2>{cloudEnabled ? "Cloud sync" : "Saved on this device"}</h2>
              </div>
            </header>
            <div className="os-module-body treasury-pad">
              {cloudEnabled ? (
                <p className="treasury-muted">
                  TreasuryOS uses your LifeOS Google login. Categories and monthly entries sync automatically with the rest of LifeOS
                  {sessionEmail ? ` as ${sessionEmail}` : ""}.
                </p>
              ) : (
                <p className="treasury-muted">Changes save automatically in this browser. Sign in to LifeOS to sync across devices.</p>
              )}
              {syncMsg ? <p className="treasury-muted" style={{ marginTop: 10 }}>{syncMsg}</p> : null}
            </div>
          </section>
        </div>

        <footer className="treasury-footer">
          <EditableText editing={copyEditing} value={copy.footer} onChange={v => setCopy("footer", v)} ariaLabel="Footer text" />
        </footer>
      </>
    </div>
  );
}

function EditableText({
  editing,
  value,
  onChange,
  ariaLabel,
  multiline = false,
}: {
  editing: boolean;
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  multiline?: boolean;
}) {
  if (!editing) {
    if (multiline) return <span className="treasury-static multiline">{value}</span>;
    return <span className="treasury-static">{value}</span>;
  }
  if (multiline) {
    return <textarea className="treasury-inline multiline" aria-label={ariaLabel} value={value} onChange={e => onChange(e.target.value)} />;
  }
  return <input className="treasury-inline" aria-label={ariaLabel} value={value} onChange={e => onChange(e.target.value)} />;
}

function Progress({ value, max }: { value: number; max: number }) {
  const pct = max ? Math.min(100, value / max * 100) : 0;
  return <div className="treasury-progress"><i style={{ width: `${pct}%` }} /></div>;
}

function MoneyInput({
  label,
  value,
  onChange,
  target,
  onTargetChange,
  positive = false,
  savings = false,
  amountLabel,
  targetLabel,
}: {
  label: ReactNode;
  value: number;
  onChange: (v: number) => void;
  target?: number;
  onTargetChange?: (v: number) => void;
  positive?: boolean;
  savings?: boolean;
  amountLabel?: string;
  targetLabel?: string;
}) {
  return (
    <div className={`treasury-money-input${positive ? " positive" : ""}${savings ? " savings" : ""}`}>
      <div className="treasury-money-meta">
        <span className="treasury-money-label">{label}</span>
        {target != null && onTargetChange ? (
          <label className="treasury-target-field">
            <span>Target</span>
            <div className="mini-currency">
              <span>$</span>
              <input
                inputMode="decimal"
                type="number"
                min="0"
                step="1"
                value={Number.isFinite(target) ? target : 0}
                aria-label={targetLabel || "Target"}
                onChange={e => onTargetChange(clamp(Number(e.target.value)))}
              />
            </div>
          </label>
        ) : target != null ? (
          <small>Target {money.format(target)}</small>
        ) : null}
      </div>
      <label className="currency">
        <span>$</span>
        <input
          inputMode="decimal"
          type="number"
          min="0"
          step="1"
          value={value || ""}
          placeholder="0"
          aria-label={amountLabel || (typeof label === "string" ? label : "Amount")}
          onChange={e => onChange(clamp(Number(e.target.value)))}
        />
      </label>
    </div>
  );
}

function Num({ label, value, onChange, step = "1" }: { label: string; value: number; onChange: (v: string) => void; step?: string }) {
  return <label className="treasury-field"><span>{label}</span><input type="number" min="0" step={step} value={value} onChange={e => onChange(e.target.value)} /></label>;
}
