"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Mic, Sparkles } from "lucide-react";
import { fallbackParseGoal } from "@/lib/focusFlow/fallbacks";
import type { ParsedGoalPlan } from "@/lib/focusFlow/types";

function Waveform() {
  const heights = [8, 14, 10, 18, 12, 22, 16, 24, 14, 20, 11, 17, 9, 15, 21, 13];
  return (
    <div className="focus-flow-waveform" aria-hidden>
      {heights.map((height, index) => (
        <span key={index} style={{ height }} />
      ))}
    </div>
  );
}

export function TalkToPlanPanel({
  projects,
  onCommit,
}: {
  projects: string[];
  onCommit: (plan: ParsedGoalPlan) => void;
}) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<ParsedGoalPlan | null>(null);
  const [error, setError] = useState("");
  const recognitionRef = useRef<any>(null);
  const secondsRef = useRef(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) recognitionRef.current = new SpeechRecognition();
  }, []);

  useEffect(() => {
    if (!listening) return;
    const id = window.setInterval(() => {
      secondsRef.current += 1;
      setSeconds(secondsRef.current);
    }, 1000);
    return () => window.clearInterval(id);
  }, [listening]);

  const parsePlan = async (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "parse-goal", input: trimmed, spaces: projects }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not parse goal");
      setPlan(data.plan);
    } catch {
      setPlan(fallbackParseGoal(trimmed, projects));
      setError("Using local parsing while AI is unavailable.");
    } finally {
      setBusy(false);
    }
  };

  const toggleVoice = () => {
    if (!recognitionRef.current) {
      setError("Voice capture is not supported in this browser.");
      return;
    }
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
      void parsePlan(text);
      return;
    }
    secondsRef.current = 0;
    setSeconds(0);
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.onstart = () => setListening(true);
    recognitionRef.current.onend = () => setListening(false);
    recognitionRef.current.onresult = (event: any) => {
      let chunk = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        if (event.results[i].isFinal) chunk += event.results[i][0].transcript;
      }
      if (chunk) setText(prev => (prev ? `${prev} ${chunk}` : chunk).trim());
    };
    recognitionRef.current.onerror = () => setListening(false);
    recognitionRef.current.start();
  };

  const finish = () => {
    if (listening) recognitionRef.current?.stop();
    void parsePlan(text);
  };

  const timeLabel = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")} / 10:00`;

  return (
    <div className="focus-flow-talk">
      <div className="focus-flow-card">
        {plan ? (
          <>
            <div className="focus-flow-goal-head">
              <div className="focus-flow-play">▶</div>
              <div>
                <strong>{plan.goal}</strong>
                {plan.summary ? <p>{plan.summary}</p> : null}
              </div>
            </div>
            {plan.tasks.map((task, index) => (
              <div key={`${task.title}-${index}`} className="focus-flow-task-row">
                <span className={`focus-flow-marker ${index === 0 ? "milestone" : ""}`} />
                <span className="focus-flow-task-title">{task.title}</span>
                <span className={`focus-flow-badge tone-${task.badge.replace(/\s+/g, "-").toLowerCase()}`}>{task.badge}</span>
              </div>
            ))}
            {busy ? <p className="focus-flow-muted">Turning your thoughts into tasks…</p> : null}
          </>
        ) : (
          <div className="focus-flow-empty-plan">
            <Sparkles size={18} />
            <p>Talk or type a goal — LifeOS breaks it into milestones and tasks you can start today.</p>
          </div>
        )}
      </div>

      <div className="focus-flow-recorder">
        <textarea
          value={text}
          onChange={event => setText(event.target.value)}
          placeholder="Launch my YouTube channel… or describe what you want to accomplish."
          rows={3}
        />
        <Waveform />
        <div className="focus-flow-recorder-actions">
          <span className="focus-flow-muted">{listening ? timeLabel : "Ready to capture"}</span>
          <div className="focus-flow-recorder-buttons">
            <button type="button" className={listening ? "selected" : ""} onClick={toggleVoice} aria-label="Voice capture">
              <Mic size={16} />
            </button>
            <button type="button" className="primary" disabled={!text.trim() || busy} onClick={finish}>
              {busy ? "Planning…" : "Finish"}
            </button>
          </div>
        </div>
        {error ? <p className="focus-flow-error">{error}</p> : null}
      </div>

      {plan ? (
        <div className="focus-flow-commit">
          <button type="button" className="primary" onClick={() => onCommit(plan)}>
            <Check size={16} /> Add {plan.tasks.length} tasks & start focus
          </button>
        </div>
      ) : null}
    </div>
  );
}
