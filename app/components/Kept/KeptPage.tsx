"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Archive,
  ArrowLeft,
  Bookmark,
  Lock,
  MapPin,
  Mic,
  MicOff,
  Plus,
  Search,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createMicInactivityTimer,
  emptyKeptHub,
  executeKeptCommand,
  KEPT_LISTENING_CANCELED_STATUS,
  locationsIndex,
  normalizeKeptHub,
  recentKept,
  resolveKeptIntent,
  searchKept,
  type KeptHub,
  type KeptItem,
  type KeptPrivacy,
  type MicInactivityTimer,
} from "@/lib/kept";
import { isKeptSpeechSupported, startKeptSpeech } from "@/lib/kept/speech";
import { syncDataToFirebase, loadDataFromFirebase } from "@/lib/dataSync";

type VoicePhase = "idle" | "listening" | "processing" | "confirm" | "done" | "error";

type Props = {
  userId: string | null;
  reduceMotion?: boolean;
  flash: (message: string) => void;
  /** Optional Firebase ID token for authenticated /api/kept calls. */
  getIdToken?: () => Promise<string | null>;
};

const spring = { type: "spring" as const, stiffness: 380, damping: 28, mass: 0.7 };
const DEFAULT_TAGLINE = "A place for everything you want to remember.";


function formatWhen(iso: string) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function KeptPage({ userId, reduceMotion: reduceMotionProp, flash, getIdToken }: Props) {
  const prefersReduced = useReducedMotion();
  const reduceMotion = Boolean(reduceMotionProp || prefersReduced);

  const [hub, setHub] = useState<KeptHub>(emptyKeptHub);
  const [hydrated, setHydrated] = useState(false);
  const [query, setQuery] = useState("");
  const [transcript, setTranscript] = useState("");
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [statusMessage, setStatusMessage] = useState(DEFAULT_TAGLINE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualLocation, setManualLocation] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [manualPrivacy, setManualPrivacy] = useState<KeptPrivacy>("normal");
  const [locationFilter, setLocationFilter] = useState<string | null>(null);
  const [speechOk] = useState(() => isKeptSpeechSupported());
  const stopRef = useRef<(() => void) | null>(null);
  const phaseRef = useRef<VoicePhase>("idle");
  const listenCancelledRef = useRef(false);
  const inactivityRef = useRef<MicInactivityTimer | null>(null);

  phaseRef.current = phase;

  // Load from Firebase / local fallback
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (userId) {
          const data = await loadDataFromFirebase("kept");
          if (!cancelled && data) {
            setHub(normalizeKeptHub(data));
            setHydrated(true);
            return;
          }
        }
        if (typeof window !== "undefined") {
          const raw = localStorage.getItem("lifeos.kept.v1");
          if (raw && !cancelled) setHub(normalizeKeptHub(JSON.parse(raw)));
        }
      } catch {
        /* local empty */
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Persist
  useEffect(() => {
    if (!hydrated) return;
    if (typeof window !== "undefined") {
      localStorage.setItem("lifeos.kept.v1", JSON.stringify(hub));
    }
    if (userId) {
      void syncDataToFirebase("kept", hub);
    }
  }, [hub, hydrated, userId]);

  useEffect(
    () => () => {
      inactivityRef.current?.clear();
      inactivityRef.current = null;
      stopRef.current?.();
    },
    [],
  );

  const clearInactivity = () => {
    inactivityRef.current?.clear();
    inactivityRef.current = null;
  };

  const cancelListening = () => {
    if (phaseRef.current !== "listening") return;
    listenCancelledRef.current = true;
    clearInactivity();
    stopRef.current?.();
    stopRef.current = null;
    setTranscript("");
    setPhase("idle");
    setStatusMessage(KEPT_LISTENING_CANCELED_STATUS);
  };

  const armInactivity = () => {
    clearInactivity();
    inactivityRef.current = createMicInactivityTimer(cancelListening);
  };

  const visible = useMemo(() => {
    let items = searchKept(hub, query, { includePrivate: true });
    if (locationFilter) {
      const needle = locationFilter.toLowerCase();
      items = items.filter((i) => i.location.toLowerCase().includes(needle));
    }
    return items;
  }, [hub, query, locationFilter]);

  const recent = useMemo(() => recentKept(hub, 8, true), [hub]);
  const places = useMemo(() => locationsIndex(hub, true), [hub]);
  const selected = selectedId ? hub.items.find((i) => i.id === selectedId && !i.forgottenAt) : null;

  const applyHub = (next: KeptHub, message: string) => {
    setHub(next);
    setStatusMessage(message);
    flash(message);
  };

  const runUtterance = async (text: string) => {
    const utterance = text.trim();
    if (!utterance) return;
    setPhase("processing");
    setStatusMessage("Understanding…");

    // Prefer authenticated server path when token is available.
    const token = getIdToken ? await getIdToken().catch(() => null) : null;
    if (token) {
      try {
        const intentRes = await fetch("/api/kept", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action: "intent", utterance }),
        });
        const intentBody = await intentRes.json();
        if (intentRes.ok && intentBody.intent?.command) {
          const execRes = await fetch("/api/kept", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ action: "execute", command: intentBody.intent.command }),
          });
          const execBody = await execRes.json();
          if (execRes.ok && execBody.hub) {
            setHub(normalizeKeptHub(execBody.hub));
            setStatusMessage(execBody.message || intentBody.intent.summary);
            setPhase(execBody.ok ? "done" : "confirm");
            if (execBody.item?.id) setSelectedId(execBody.item.id);
            flash(execBody.message || "Kept");
            return;
          }
        }
      } catch {
        /* fall through to local */
      }
    }

    const intent = resolveKeptIntent(utterance, hub, { includePrivate: true });
    const result = executeKeptCommand(hub, intent.command, { includePrivate: true });
    if (result.ok) {
      applyHub(result.hub, result.message);
      setPhase("done");
      if (result.item?.id) setSelectedId(result.item.id);
    } else {
      setStatusMessage(result.message);
      setPhase(result.clarify ? "confirm" : "error");
    }
  };

  const startListening = () => {
    if (!speechOk) {
      setPhase("error");
      setStatusMessage("Speech isn’t available here — type below instead.");
      return;
    }
    listenCancelledRef.current = false;
    clearInactivity();
    stopRef.current?.();
    setTranscript("");
    setPhase("listening");
    phaseRef.current = "listening";
    setStatusMessage("Listening…");
    // Accidental tap: cancel if no transcript activity for ~3s.
    armInactivity();
    const handle = startKeptSpeech({
      onStart: () => {
        if (listenCancelledRef.current) return;
        setPhase("listening");
        phaseRef.current = "listening";
      },
      onResult: (text) => {
        if (listenCancelledRef.current) return;
        armInactivity();
        setTranscript(text);
      },
      onEnd: () => {
        clearInactivity();
        stopRef.current = null;
        if (listenCancelledRef.current) return;
        setTranscript((current) => {
          if (current.trim()) void runUtterance(current);
          else {
            setPhase("idle");
            setStatusMessage("Didn’t catch that — try again or type.");
          }
          return current;
        });
      },
      onError: (message) => {
        clearInactivity();
        if (listenCancelledRef.current) return;
        setPhase("error");
        setStatusMessage(message);
      },
    });
    stopRef.current = handle?.stop || null;
  };

  const stopListening = () => {
    clearInactivity();
    listenCancelledRef.current = false;
    stopRef.current?.();
    stopRef.current = null;
    setPhase((p) => (p === "listening" ? "processing" : p));
  };

  const submitManual = () => {
    const name = manualName.trim();
    const location = manualLocation.trim();
    if (!name || !location) {
      flash("Object and place are required");
      return;
    }
    const result = executeKeptCommand(
      hub,
      {
        kind: "SAVE",
        name,
        location,
        notes: manualNotes.trim() || undefined,
        privacy: manualPrivacy,
      },
      { includePrivate: true },
    );
    if (result.ok) {
      applyHub(result.hub, result.message);
      setManualOpen(false);
      setManualName("");
      setManualLocation("");
      setManualNotes("");
      setManualPrivacy("normal");
      if (result.item?.id) setSelectedId(result.item.id);
      setPhase("done");
    } else {
      flash(result.message);
    }
  };

  const updateSelected = (patch: Partial<KeptItem>) => {
    if (!selected) return;
    const result = executeKeptCommand(
      hub,
      {
        kind: "UPDATE",
        itemId: selected.id,
        location: patch.location,
        notes: patch.notes,
        name: patch.name,
        privacy: patch.privacy,
        archived: patch.archived,
        photoUrl: patch.photoUrl === undefined ? undefined : patch.photoUrl || null,
      },
      { includePrivate: true },
    );
    if (result.ok) {
      applyHub(result.hub, result.message);
      if (patch.archived) setSelectedId(null);
    } else flash(result.message);
  };

  const forgetSelected = () => {
    if (!selected) return;
    const result = executeKeptCommand(hub, { kind: "FORGET", itemId: selected.id }, { includePrivate: true });
    if (result.ok) {
      applyHub(result.hub, result.message);
      setSelectedId(null);
    }
  };

  const motionProps = reduceMotion
    ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.12 } }
    : {
        initial: { opacity: 0, y: 8, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -6, scale: 0.98 },
        transition: spring,
      };

  if (selected) {
    return (
      <motion.section className="kept-page" data-testid="kept-page" {...motionProps}>
        <button type="button" className="kept-back" onClick={() => setSelectedId(null)} data-testid="kept-back">
          <ArrowLeft size={16} /> Back to Kept
        </button>
        <header className="kept-detail-head">
          <div>
            <p className="eyebrow">Kept</p>
            <h1 data-testid="kept-detail-name">{selected.name}</h1>
            <p className="kept-location-line">
              <MapPin size={14} /> {selected.location}
              {selected.privacy === "private" ? (
                <span className="kept-private-badge">
                  <Lock size={12} /> Private
                </span>
              ) : null}
            </p>
          </div>
        </header>
        <div className="kept-detail-grid">
          <label>
            Object
            <input
              data-testid="kept-detail-name-input"
              value={selected.name}
              onChange={(e) => updateSelected({ name: e.target.value })}
            />
          </label>
          <label>
            Location
            <input
              data-testid="kept-detail-location-input"
              value={selected.location}
              onChange={(e) => updateSelected({ location: e.target.value })}
            />
          </label>
          <label className="kept-span-2">
            Notes
            <textarea
              data-testid="kept-detail-notes"
              rows={3}
              value={selected.notes}
              onChange={(e) => updateSelected({ notes: e.target.value })}
            />
          </label>
          <label>
            Privacy
            <select
              data-testid="kept-detail-privacy"
              value={selected.privacy}
              onChange={(e) => updateSelected({ privacy: e.target.value as KeptPrivacy })}
            >
              <option value="normal">Normal</option>
              <option value="private">Private (no Spotlight)</option>
            </select>
          </label>
          {selected.photoUrl ? (
            <div className="kept-photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selected.photoUrl} alt="" />
            </div>
          ) : (
            <p className="kept-muted">No photo attached.</p>
          )}
        </div>
        <div className="kept-history">
          <h2>Location history</h2>
          {selected.locationHistory.length === 0 ? (
            <p className="kept-muted">No earlier places yet.</p>
          ) : (
            <ul>
              {selected.locationHistory.map((entry) => (
                <li key={`${entry.at}-${entry.location}`}>
                  <strong>{entry.location}</strong>
                  <span>{formatWhen(entry.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="kept-detail-actions">
          <button type="button" onClick={() => updateSelected({ archived: true })}>
            <Archive size={15} /> Archive
          </button>
          <button type="button" className="danger" onClick={forgetSelected} data-testid="kept-forget">
            <Trash2 size={15} /> Forget
          </button>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section className="kept-page" data-testid="kept-page" {...motionProps}>
      <header className="kept-hero">
        <div>
          <p className="eyebrow">Kept</p>
          <h1>Kept</h1>
          <p className="kept-tagline">A place for everything you want to remember.</p>
        </div>
        <button
          type="button"
          className="kept-add"
          onClick={() => setManualOpen(true)}
          data-testid="kept-manual-open"
        >
          <Plus size={16} /> Add
        </button>
      </header>

      <div className="kept-voice" data-testid="kept-voice">
        <button
          type="button"
          className={`kept-mic ${phase === "listening" ? "listening" : ""}`}
          aria-label={phase === "listening" ? "Stop listening" : "Start listening"}
          data-testid="kept-mic"
          onClick={() => (phase === "listening" ? stopListening() : startListening())}
        >
          {speechOk ? <Mic size={28} /> : <MicOff size={28} />}
        </button>
        <div className="kept-voice-copy">
          <strong data-testid="kept-status">{statusMessage}</strong>
          <span className="kept-phase" data-testid="kept-phase">
            {phase === "idle" && (speechOk ? "Tap the mic or type below" : "Type below — mic unavailable")}
            {phase === "listening" && "Listening"}
            {phase === "processing" && "Processing"}
            {phase === "confirm" && "Needs a choice"}
            {phase === "done" && "Done"}
            {phase === "error" && "Try again"}
          </span>
        </div>
      </div>

      <form
        className="kept-transcript"
        onSubmit={(e) => {
          e.preventDefault();
          void runUtterance(transcript);
        }}
      >
        <Type size={15} />
        <input
          data-testid="kept-transcript"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder='e.g. “keys in the kitchen drawer” or “where are my keys?”'
          aria-label="Correctable transcript"
        />
        <button type="submit" data-testid="kept-submit-transcript" disabled={!transcript.trim()}>
          Go
        </button>
      </form>

      <div className="kept-search-row">
        <Search size={15} />
        <input
          data-testid="kept-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search kept items"
          aria-label="Search Kept"
        />
        {locationFilter ? (
          <button type="button" className="kept-chip active" onClick={() => setLocationFilter(null)}>
            {locationFilter} <X size={12} />
          </button>
        ) : null}
      </div>

      {places.length > 0 ? (
        <div className="kept-places" data-testid="kept-places">
          {places.slice(0, 8).map((place) => (
            <button
              key={place.location}
              type="button"
              className={`kept-chip ${locationFilter === place.location ? "active" : ""}`}
              onClick={() =>
                setLocationFilter((cur) => (cur === place.location ? null : place.location))
              }
            >
              <MapPin size={12} /> {place.location}
              <em>{place.count}</em>
            </button>
          ))}
        </div>
      ) : null}

      <AnimatePresence mode="wait">
        {visible.length === 0 ? (
          <motion.div
            key="empty"
            className="kept-empty"
            data-testid="kept-empty"
            {...(reduceMotion
              ? { initial: false, animate: { opacity: 1 } }
              : { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: spring })}
          >
            <Bookmark size={22} />
            <strong>Nothing kept yet</strong>
            <p>Say or type where something lives — “passport in the blue suitcase”.</p>
          </motion.div>
        ) : (
          <motion.ul
            key="list"
            className="kept-list"
            data-testid="kept-list"
            {...(reduceMotion ? { initial: false } : { initial: { opacity: 0 }, animate: { opacity: 1 } })}
          >
            {(query || locationFilter ? visible : recent.length ? recent : visible).map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="kept-row"
                  data-testid={`kept-item-${item.id}`}
                  onClick={() => setSelectedId(item.id)}
                >
                  <div>
                    <strong>
                      {item.name}
                      {item.privacy === "private" ? <Lock size={12} /> : null}
                    </strong>
                    <span>
                      <MapPin size={12} /> {item.location}
                    </span>
                  </div>
                  <small>{formatWhen(item.updatedAt)}</small>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {manualOpen ? (
          <motion.div
            className="modal-layer kept-modal-layer"
            data-testid="kept-manual-modal"
            onMouseDown={() => setManualOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.form
              className="capture-modal kept-manual"
              onMouseDown={(e) => e.stopPropagation()}
              onSubmit={(e) => {
                e.preventDefault();
                submitManual();
              }}
              {...(reduceMotion
                ? { initial: false, animate: { opacity: 1 } }
                : {
                    initial: { scale: 0.98, y: 10 },
                    animate: { scale: 1, y: 0 },
                    transition: spring,
                  })}
            >
              <div className="capture-head">
                <div>
                  <strong>Keep something</strong>
                  <span>Object + place only.</span>
                </div>
                <button type="button" aria-label="Close" onClick={() => setManualOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <label>
                Object
                <input
                  data-testid="kept-manual-name"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Keys, passport, charger…"
                  autoFocus
                />
              </label>
              <label>
                Location
                <input
                  data-testid="kept-manual-location"
                  value={manualLocation}
                  onChange={(e) => setManualLocation(e.target.value)}
                  placeholder="Kitchen drawer, blue suitcase…"
                />
              </label>
              <label>
                Notes
                <textarea
                  data-testid="kept-manual-notes"
                  rows={2}
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                />
              </label>
              <label className="kept-check">
                <input
                  type="checkbox"
                  checked={manualPrivacy === "private"}
                  onChange={(e) => setManualPrivacy(e.target.checked ? "private" : "normal")}
                />
                Private (exclude from Spotlight)
              </label>
              <button type="submit" className="primary" data-testid="kept-manual-save">
                Keep
              </button>
            </motion.form>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.section>
  );
}
