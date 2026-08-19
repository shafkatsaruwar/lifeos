"use client";

import { useMasterOS } from "@/lib/masteros/store";

export default function SettingsPage() {
  const { resetDemo } = useMasterOS();

  return (
    <div className="mos-page">
      <div className="mos-top">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Settings</h1>
          <p>MasterOS stores teaching data locally until Supabase is connected.</p>
        </div>
      </div>

      <section className="mos-card" style={{ marginBottom: 16 }}>
        <header><h2>Data</h2></header>
        <div className="mos-pad">
          <p className="mos-muted">
            The schema is generic: students, courses, units, lessons, skills, questions, assignments,
            assessments, and notes. SAT Prep is demo content, not a special table.
          </p>
          <p className="mos-muted">
            Connect Supabase later with <code>supabase/masteros.sql</code>. The store API is already shaped
            for a remote adapter in <code>lib/masteros/supabase.ts</code>.
          </p>
          <button
            className="mos-ghost"
            type="button"
            onClick={() => {
              if (confirm("Reset MasterOS to the Wafia / SAT Prep demo?")) resetDemo();
            }}
          >
            Reset demo data
          </button>
        </div>
      </section>

      <section className="mos-card">
        <header><h2>Future AI</h2></header>
        <div className="mos-pad">
          <p className="mos-muted">
            Generation is off in v1. Extension points live in <code>lib/masteros/ai.ts</code> for lesson plans,
            practice sets, explanations, error analysis, and next-lesson recommendations.
          </p>
        </div>
      </section>
    </div>
  );
}
