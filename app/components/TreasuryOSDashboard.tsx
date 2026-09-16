"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CalendarClock, ChevronDown, Cloud, CloudOff, HeartHandshake, LogOut, PiggyBank,
  Plus, RotateCcw, Settings2, Sparkles, Trash2, WalletCards
} from "lucide-react";
import { initializeApp, getApps } from "firebase/app";
import { doc, getDoc, getFirestore, setDoc } from "firebase/firestore";
import {
  browserLocalPersistence, getAuth, GoogleAuthProvider, onAuthStateChanged,
  setPersistence, signInWithPopup, signOut as firebaseSignOut, type User
} from "firebase/auth";

type Mode = "employed" | "between-contracts";
type CategoryKind = "expense" | "savings";

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

const ownerEmail = "mohammedshafkatsaruwar@gmail.com";
const firebaseEnabled = true;
const budgetFirebaseConfig = {
  apiKey: "AIzaSyBZwVWwlLd7hBFBls27kvCzExsKq69xOqk",
  authDomain: "shafkat-budget-private.firebaseapp.com",
  projectId: "shafkat-budget-private",
  storageBucket: "shafkat-budget-private.firebasestorage.app",
  messagingSenderId: "715394261587",
  appId: "1:715394261587:web:6f0494524c692729851ca6",
};

function getTreasuryFirebase() {
  if (typeof window === "undefined") return { firebaseAuth: null, firebaseDb: null, googleProvider: new GoogleAuthProvider() };
  const app = getApps().find(candidate => candidate.name === "shafkat-budget") ?? initializeApp(budgetFirebaseConfig, "shafkat-budget");
  const firebaseAuth = getAuth(app);
  void setPersistence(firebaseAuth, browserLocalPersistence).catch(() => undefined);
  return { firebaseAuth, firebaseDb: getFirestore(app), googleProvider: new GoogleAuthProvider() };
}

const { firebaseAuth, firebaseDb, googleProvider } = typeof window === "undefined"
  ? { firebaseAuth: null, firebaseDb: null, googleProvider: new GoogleAuthProvider() }
  : getTreasuryFirebase();

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const exactMoney = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
const clamp = (n: number, min = 0) => Math.max(min, Number.isFinite(n) ? n : 0);
const makeId = () => `cat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const LOCAL_SETTINGS_KEY = "shafkat-budget-settings";
const LEGACY_MONTH_KEY = "shafkat-budget-month";
const monthKey = (month: string) => `shafkat-budget-month-${month}`;

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

export function TreasuryOSDashboard() {
  const [settings, setSettings] = useState<TreasurySettings>(defaultSettings);
  const [month, setMonth] = useState<MonthlyState>(defaultMonthState());
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!firebaseEnabled);
  const [authMsg, setAuthMsg] = useState("");
  const [syncMsg, setSyncMsg] = useState("");
  const [localReady, setLocalReady] = useState(false);
  const [copyEditorOpen, setCopyEditorOpen] = useState(false);
  const isOwner = Boolean(sessionEmail && sessionEmail.toLowerCase() === ownerEmail.toLowerCase());

  useEffect(() => {
    try {
      const localSettings = localStorage.getItem(LOCAL_SETTINGS_KEY);
      const localMonth = localStorage.getItem(monthKey(defaultMonthState().month)) ?? localStorage.getItem(LEGACY_MONTH_KEY);
      if (localSettings) setSettings(migrateSettings(JSON.parse(localSettings)));
      if (localMonth) setMonth(migrateMonth(JSON.parse(localMonth)));
      setLocalReady(true);
    } catch {
      setSyncMsg("Couldn’t load browser storage. Allow site storage and reload to save your budget.");
    }

    const activeAuth = firebaseAuth;
    if (!activeAuth) return;
    return onAuthStateChanged(activeAuth, async user => {
      setCurrentUser(user);
      setSessionEmail(user?.email ?? null);
      setAuthReady(true);

      if (!user) return;
      if (user.email?.toLowerCase() !== ownerEmail.toLowerCase()) {
        setAuthMsg(`This app is private to ${ownerEmail}.`);
        await firebaseSignOut(activeAuth);
        return;
      }

      setAuthMsg("Signed in with Google.");
      await loadCloud(user.uid, defaultMonthState().month);
    });
  }, []);

  useEffect(() => {
    if (!localReady) return;
    try {
      localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
      localStorage.setItem(monthKey(month.month), JSON.stringify(month));
      localStorage.setItem(LEGACY_MONTH_KEY, JSON.stringify(month));
      if (!firebaseEnabled || !isOwner) setSyncMsg("Saved in this browser ✓");
    } catch {
      setSyncMsg("Couldn’t save in this browser. Check available storage and site permissions.");
    }
  }, [settings, month, localReady, isOwner]);

  async function loadCloud(userId: string, monthKey: string) {
    if (!firebaseDb) return;
    setSyncMsg("Loading cloud budget...");
    const [settingsSnap, monthSnap] = await Promise.all([
      getDoc(doc(firebaseDb, "users", userId, "budget", "settings")),
      getDoc(doc(firebaseDb, "users", userId, "months", monthKey)),
    ]);
    if (settingsSnap.exists()) setSettings(migrateSettings(settingsSnap.data().data));
    if (monthSnap.exists()) setMonth(migrateMonth(monthSnap.data().data));
    setSyncMsg(monthSnap.exists() || settingsSnap.exists() ? "Loaded from cloud ✓" : "No cloud budget yet. Save once to sync this browser.");
  }

  async function changeMonth(monthKey: string) {
    const fallback = (currentMode: MonthlyState["mode"]) => ({ ...defaultMonthState(), month: monthKey, mode: currentMode });
    const localMonth = localStorage.getItem(`shafkat-budget-month-${monthKey}`);
    setMonth(m => localMonth ? migrateMonth(JSON.parse(localMonth)) : fallback(m.mode));
    if (currentUser && isOwner) await loadCloud(currentUser.uid, monthKey);
  }

  async function saveCloud() {
    if (!firebaseDb) return setSyncMsg("Firebase is not configured yet.");
    const user = currentUser;
    if (!user) return setSyncMsg("Sign in first to sync across devices.");
    if (!isOwner) return setSyncMsg(`This app is private to ${ownerEmail}.`);
    setSyncMsg("Saving…");
    await Promise.all([
      setDoc(doc(firebaseDb, "users", user.uid, "budget", "settings"), { data: settings, updatedAt: new Date().toISOString(), ownerEmail }),
      setDoc(doc(firebaseDb, "users", user.uid, "months", month.month), { data: month, month: month.month, updatedAt: new Date().toISOString(), ownerEmail }),
    ]);
    setSyncMsg("Synced to cloud ✓");
  }

  async function authSubmit(e: FormEvent) {
    e.preventDefault();
    if (!firebaseAuth) return setAuthMsg("Add Firebase environment variables first.");
    setAuthMsg("Opening Google sign-in...");
    try {
      const result = await signInWithPopup(firebaseAuth, googleProvider);
      if (result.user.email?.toLowerCase() !== ownerEmail.toLowerCase()) {
        setAuthMsg(`This app is private to ${ownerEmail}.`);
        await firebaseSignOut(firebaseAuth);
      }
    } catch (err) {
      setAuthMsg(err instanceof Error ? err.message : "Google sign-in failed.");
    }
  }

  async function signOut() {
    if (firebaseAuth) await firebaseSignOut(firebaseAuth);
    setCurrentUser(null);
    setSessionEmail(null);
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
    return { grossWeekly, netWeekly, modeledMonthly, earnedIncome, oneOffs, available, planned, safeToSpend, actualRemaining, parentsPaid, savingsAllocated, babaShifts, contractDays };
  }, [settings, month]);

  const setS = (k: keyof Omit<TreasurySettings, "categories" | "copy">, v: string) => setSettings(s => ({ ...s, [k]: k === "contractEnd" ? v : clamp(Number(v)) }));
  const setM = (k: keyof MonthlyState, v: string) => setMonth(m => ({ ...m, [k]: v }));
  const setCategoryValue = (id: string, value: number) => setMonth(m => ({ ...m, categoryValues: { ...m.categoryValues, [id]: clamp(value) } }));
  const setCopy = (k: keyof TreasurySettings["copy"], v: string) => setSettings(s => ({ ...s, copy: { ...s.copy, [k]: v } }));

  function updateCategory(id: string, patch: Partial<TreasuryCategory>) {
    setSettings(s => ({ ...s, categories: s.categories.map(c => c.id === id ? { ...c, ...patch } : c) }));
  }

  function addCategory() {
    const id = makeId();
    setSettings(s => ({ ...s, categories: [...s.categories, { id, name: "New category", emoji: "💰", kind: "expense", target: 0, betweenTarget: 0 }] }));
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

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <div className="eyebrow"><Sparkles size={15}/><EditableText value={settings.copy.eyebrow} onChange={v => setCopy("eyebrow", v)} ariaLabel="App eyebrow" /></div>
          <h1><EditableText value={settings.copy.title} onChange={v => setCopy("title", v)} ariaLabel="Dashboard title" /></h1>
          <p><EditableText value={settings.copy.subtitle} onChange={v => setCopy("subtitle", v)} ariaLabel="Dashboard subtitle" /></p>
        </div>
        <div className="cloudPill">{sessionEmail ? <><Cloud size={16}/> Synced as {sessionEmail}</> : <><CloudOff size={16}/> {firebaseEnabled ? "Private Google login" : "Local mode"}</>}</div>
      </section>

      {firebaseEnabled && authReady && !isOwner && <section className="panel authGate">
        <div>
          <div className="panelTitle"><Cloud/> Private budget</div>
          <p className="muted">Sign in with {ownerEmail} to open and sync this budget across your devices.</p>
        </div>
        <form onSubmit={authSubmit}>
          <button className="primary">Sign in with Google</button>
          <span>{authMsg}</span>
        </form>
      </section>}

      {firebaseEnabled && !authReady && <section className="panel authGate">
        <div className="panelTitle"><Cloud/> Checking sign-in...</div>
      </section>}

      {(!firebaseEnabled || isOwner) && <>

      <section className="topGrid">
        <article className="bigCard safe"><span><EditableText value={settings.copy.safeCardLabel} onChange={v => setCopy("safeCardLabel", v)} ariaLabel="Safe card label" /></span><strong>{money.format(computed.safeToSpend)}</strong><small><EditableText value={settings.copy.safeCardHelp} onChange={v => setCopy("safeCardHelp", v)} ariaLabel="Safe card helper text" /></small></article>
        <article className="bigCard"><span><EditableText value={settings.copy.availableCardLabel} onChange={v => setCopy("availableCardLabel", v)} ariaLabel="Available card label" /></span><strong>{money.format(computed.available)}</strong><small><EditableText value={settings.copy.availableCardHelp} onChange={v => setCopy("availableCardHelp", v)} ariaLabel="Available card helper text" /></small></article>
        <article className="bigCard"><span><EditableText value={settings.copy.remainingCardLabel} onChange={v => setCopy("remainingCardLabel", v)} ariaLabel="Remaining card label" /></span><strong className={computed.actualRemaining < 0 ? "bad" : ""}>{money.format(computed.actualRemaining)}</strong><small><EditableText value={settings.copy.remainingCardHelp} onChange={v => setCopy("remainingCardHelp", v)} ariaLabel="Remaining card helper text" /></small></article>
        <article className="bigCard countdown"><span><EditableText value={settings.copy.contractCardLabel} onChange={v => setCopy("contractCardLabel", v)} ariaLabel="Contract card label" /></span><strong>{computed.contractDays >= 0 ? `${computed.contractDays} days` : "Ended"}</strong><small>{settings.contractEnd}</small></article>
      </section>

      <section className="modeBar">
        <div><strong><EditableText value={settings.copy.budgetModeTitle} onChange={v => setCopy("budgetModeTitle", v)} ariaLabel="Budget mode title" /></strong><p><EditableText value={month.mode === "employed" ? settings.copy.employedHelp : settings.copy.betweenContractsHelp} onChange={v => setCopy(month.mode === "employed" ? "employedHelp" : "betweenContractsHelp", v)} ariaLabel="Budget mode helper text" /></p></div>
        <div className="segmented">
          <button className={month.mode === "employed" ? "active" : ""} onClick={() => setMonth(m => ({ ...m, mode: "employed" }))}>Employed</button>
          <button className={month.mode === "between-contracts" ? "active" : ""} onClick={() => setMonth(m => ({ ...m, mode: "between-contracts" }))}>Between contracts</button>
        </div>
      </section>

      <section className="grid2">
        <article className="panel">
          <div className="panelTitle"><HeartHandshake/> <EditableText value={settings.copy.retireBabaTitle} onChange={v => setCopy("retireBabaTitle", v)} ariaLabel="Retire Baba panel title" /></div>
          {settings.categories.some(c => c.id === "parents") ? <>
            <div className="progressRow"><span><EditableText value={settings.copy.retireBabaMetricLabel} onChange={v => setCopy("retireBabaMetricLabel", v)} ariaLabel="Retire Baba metric label" /></span><b>{money.format(computed.parentsPaid)} / {money.format(settings.categories.find(c => c.id === "parents")?.target ?? 0)}</b></div>
            <Progress value={computed.parentsPaid} max={settings.categories.find(c => c.id === "parents")?.target ?? 0}/>
            <div className="impact"><EditableText value={settings.copy.retireBabaImpactPrefix} onChange={v => setCopy("retireBabaImpactPrefix", v)} ariaLabel="Retire Baba impact prefix" /> <strong>{computed.babaShifts.toFixed(1)}</strong> <EditableText value={settings.copy.retireBabaImpactMiddle} onChange={v => setCopy("retireBabaImpactMiddle", v)} ariaLabel="Retire Baba impact middle" /> {exactMoney.format(settings.babaEveningShiftValue)}<EditableText value={settings.copy.retireBabaImpactSuffix} onChange={v => setCopy("retireBabaImpactSuffix", v)} ariaLabel="Retire Baba impact suffix" /></div>
          </> : <p className="muted"><EditableText value={settings.copy.retireBabaMissing} onChange={v => setCopy("retireBabaMissing", v)} ariaLabel="Missing parents category message" /></p>}
        </article>
        <article className="panel">
          <div className="panelTitle"><PiggyBank/> <EditableText value={settings.copy.savingsTitle} onChange={v => setCopy("savingsTitle", v)} ariaLabel="Savings panel title" /></div>
          <div className="runwayNumber">{money.format(computed.savingsAllocated)}</div>
          <p className="muted"><EditableText value={settings.copy.savingsHelp} onChange={v => setCopy("savingsHelp", v)} ariaLabel="Savings helper text" /></p>
          <div className="miniCallout"><EditableText value={settings.copy.savingsCallout} onChange={v => setCopy("savingsCallout", v)} ariaLabel="Savings callout" multiline /></div>
        </article>
      </section>

      <section className="panel">
        <div className="panelHead">
          <div className="panelTitle"><WalletCards/> {month.month} <EditableText value={settings.copy.moneyMapTitle} onChange={v => setCopy("moneyMapTitle", v)} ariaLabel="Money map title" /></div>
          <input className="monthPicker" type="month" value={month.month} onChange={e => changeMonth(e.target.value)} />
        </div>
        <div className="incomeStrip">
          <MoneyInput label={settings.copy.incomeInputLabel} value={month.actualIncome} onChange={v => setMonth(m => ({ ...m, actualIncome: v }))} positive />
          <div className="incomeHint"><EditableText value={settings.copy.incomeHintPrefix} onChange={v => setCopy("incomeHintPrefix", v)} ariaLabel="Income hint" /> <strong>{money.format(settings.monthlyBaseline)}</strong>.</div>
        </div>

        <div className="categoryEntryList">
          {settings.categories.map(c => {
            const target = month.mode === "employed" ? c.target : c.betweenTarget;
            return <MoneyInput key={c.id} label={`${c.emoji} ${c.name}`} value={month.categoryValues[c.id] ?? 0} target={target} onChange={v => setCategoryValue(c.id, v)} savings={c.kind === "savings"} />;
          })}
        </div>

        <div className="moneyGrid">
          <MoneyInput label="Refunds received" value={month.refundIncome} onChange={v => setMonth(m => ({ ...m, refundIncome: v }))} positive />
          <MoneyInput label="Gifts / birthday money" value={month.giftIncome} onChange={v => setMonth(m => ({ ...m, giftIncome: v }))} positive />
          <MoneyInput label="Other income" value={month.otherIncome} onChange={v => setMonth(m => ({ ...m, otherIncome: v }))} positive />
        </div>
        <textarea value={month.note} onChange={e => setM("note", e.target.value)} placeholder={settings.copy.monthNotePlaceholder} />
        <div className="actions">{firebaseEnabled && <button className="primary" onClick={saveCloud}>Save + sync</button>}<button onClick={resetMonth}><RotateCcw size={16}/> Reset month</button><span>{syncMsg}</span></div>
      </section>

      <section className="panel">
        <div className="panelHead categoryHead">
          <div><div className="panelTitle"><Settings2/> <EditableText value={settings.copy.categoriesTitle} onChange={v => setCopy("categoriesTitle", v)} ariaLabel="Categories section title" /></div><p className="muted"><EditableText value={settings.copy.categoriesHelp} onChange={v => setCopy("categoriesHelp", v)} ariaLabel="Categories helper text" multiline /></p></div>
          <button className="addButton" onClick={addCategory}><Plus size={16}/> Add category</button>
        </div>
        <div className="categoryEditor">
          {settings.categories.map(c => <div className="categoryEditRow" key={c.id}>
            <input className="emojiInput" aria-label={`${c.name} emoji`} value={c.emoji} maxLength={4} onChange={e => updateCategory(c.id, { emoji: e.target.value })}/>
            <input className="categoryName" aria-label="Category name" value={c.name} onChange={e => updateCategory(c.id, { name: e.target.value })}/>
            <select value={c.kind} onChange={e => updateCategory(c.id, { kind: e.target.value as "expense" | "savings" })}><option value="expense">Expense</option><option value="savings">Savings</option></select>
            <label><span>Normal target</span><div className="miniCurrency">$<input type="number" min="0" value={c.target} onChange={e => updateCategory(c.id, { target: clamp(Number(e.target.value)) })}/></div></label>
            <label><span>Between contracts</span><div className="miniCurrency">$<input type="number" min="0" value={c.betweenTarget} onChange={e => updateCategory(c.id, { betweenTarget: clamp(Number(e.target.value)) })}/></div></label>
            <button className="deleteButton" aria-label={`Delete ${c.name}`} onClick={() => deleteCategory(c.id)}><Trash2 size={16}/></button>
          </div>)}
        </div>
      </section>

      <section className="grid2">
        <article className="panel">
          <div className="panelTitle"><CalendarClock/> <EditableText value={settings.copy.incomeSetupTitle} onChange={v => setCopy("incomeSetupTitle", v)} ariaLabel="Income setup title" /></div>
          <p className="muted"><EditableText value={settings.copy.incomeSetupHelp} onChange={v => setCopy("incomeSetupHelp", v)} ariaLabel="Income setup helper text" multiline /></p>
          <div className="stats"><div><span>Gross / week</span><b>{exactMoney.format(computed.grossWeekly)}</b></div><div><span>Net / week</span><b>{exactMoney.format(computed.netWeekly)}</b></div><div><span>Modeled avg / month</span><b>{exactMoney.format(computed.modeledMonthly)}</b></div></div>
          <div className="settingsGrid">
            <Num label="Hourly rate" value={settings.hourlyRate} onChange={v=>setS("hourlyRate",v)} step="0.5"/>
            <Num label="Hours / week" value={settings.weeklyHours} onChange={v=>setS("weeklyHours",v)} step="0.5"/>
            <Num label="Withholding %" value={settings.withholdingRate} onChange={v=>setS("withholdingRate",v)} step="0.1"/>
            <Num label="Budget baseline" value={settings.monthlyBaseline} onChange={v=>setS("monthlyBaseline",v)} />
            <Num label="Baba evening shift $" value={settings.babaEveningShiftValue} onChange={v=>setS("babaEveningShiftValue",v)} />
            <label className="field"><span>Contract end</span><input type="date" value={settings.contractEnd} onChange={e=>setS("contractEnd",e.target.value)}/></label>
          </div>
        </article>
        <article className="panel authPanel compactAuth">
          {firebaseEnabled ? <>
          <div><div className="panelTitle"><Cloud/> Cloud sync</div><p className="muted">Use the same login on iPhone, Mac, or iPad. Categories and monthly entries sync too.</p></div>
          {sessionEmail ? <button onClick={signOut}><LogOut size={16}/> Sign out</button> : <form onSubmit={authSubmit}><button className="primary">Sign in with Google</button><span>{authMsg}</span></form>}
          </> : <div><div className="panelTitle"><CloudOff/> Saved on this device</div><p className="muted">Changes save automatically in this browser. No account is needed. Budgets do not sync between devices, and clearing this site’s browser data removes saved entries.</p></div>}
        </article>
      </section>

      <section className={`panel copyPanel ${copyEditorOpen ? "open" : ""}`}>
        <button className="collapseHeader" onClick={() => setCopyEditorOpen(open => !open)} aria-expanded={copyEditorOpen}>
          <span className="panelTitle"><Settings2/> Edit dashboard wording</span>
          <ChevronDown size={18}/>
        </button>
        {copyEditorOpen && <div className="copyEditor">
          {Object.entries(settings.copy).map(([key, value]) => (
            <label key={key} className="field"><span>{labelize(key)}</span><input value={value} onChange={e => setCopy(key as keyof TreasurySettings["copy"], e.target.value)} /></label>
          ))}
        </div>}
      </section>

      <footer><EditableText value={settings.copy.footer} onChange={v => setCopy("footer", v)} ariaLabel="Footer text" /></footer>
      </>}
    </main>
  );
}

function labelize(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());
}

function EditableText({ value, onChange, ariaLabel, multiline = false }: { value: string; onChange: (value: string) => void; ariaLabel: string; multiline?: boolean }) {
  if (multiline) return <textarea className="inlineEdit multiline" aria-label={ariaLabel} value={value} onChange={e => onChange(e.target.value)} />;
  return <input className="inlineEdit" aria-label={ariaLabel} value={value} onChange={e => onChange(e.target.value)} />;
}

function Progress({ value, max }: { value: number; max: number }) {
  const pct = max ? Math.min(100, value / max * 100) : 0;
  return <div className="progress"><div style={{ width: `${pct}%` }} /></div>;
}

function MoneyInput({ label, value, onChange, target, positive=false, savings=false }: { label:string; value:number; onChange:(v:number)=>void; target?:number; positive?:boolean; savings?:boolean }) {
  return <label className={`moneyInput ${positive ? "positive" : ""} ${savings ? "savings" : ""}`}><div><span>{label}{target != null && <small>Target {money.format(target)}</small>}</span></div><div className="currency"><span>$</span><input inputMode="decimal" type="number" min="0" step="1" value={value || ""} placeholder="0" onChange={e=>onChange(clamp(Number(e.target.value)))}/></div></label>;
}
function Num({label,value,onChange,step="1"}:{label:string;value:number;onChange:(v:string)=>void;step?:string}){return <label className="field"><span>{label}</span><input type="number" min="0" step={step} value={value} onChange={e=>onChange(e.target.value)}/></label>}
