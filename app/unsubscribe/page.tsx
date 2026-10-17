"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getMarketingEmailIdentity, unsubscribeUrl } from "@/lib/email/marketingCompliance";

function UnsubscribeForm() {
  const params = useSearchParams();
  const initialEmail = params.get("email") || "";
  const token = params.get("token") || "";
  const identity = useMemo(() => getMarketingEmailIdentity(), []);
  const [email, setEmail] = useState(initialEmail);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/email/unsubscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), token: token || undefined }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not unsubscribe.");
      setDone(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not unsubscribe.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="legal-page">
      <p className="eyebrow">Email preferences</p>
      <h1>Unsubscribe</h1>
      <p>
        Stop LifeOS marketing emails. Transactional messages (security, billing receipts) may still be sent when
        required.
      </p>

      {done ? (
        <section className="legal-card">
          <strong>You&apos;re unsubscribed.</strong>
          <p style={{ marginTop: 8 }}>
            We won&apos;t send marketing mail to <code>{email}</code>. You can close this page.
          </p>
        </section>
      ) : (
        <form className="legal-card" onSubmit={submit}>
          <label className="legal-label">
            Email address
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <button type="submit" className="primary" disabled={busy} style={{ marginTop: 14 }}>
            {busy ? "Saving…" : "Unsubscribe from marketing"}
          </button>
          {error ? (
            <p role="alert" style={{ color: "#b42318", marginTop: 10, fontSize: 13 }}>
              {error}
            </p>
          ) : null}
        </form>
      )}

      <section className="legal-card">
        <h2>Our mailing address</h2>
        <p>
          <strong>{identity.entityName}</strong>
          <br />
          {identity.physicalAddress}
        </p>
        <p style={{ marginTop: 8, fontSize: 13, color: "var(--muted)" }}>
          Direct link format: <code>{unsubscribeUrl("you@example.com")}</code>
        </p>
      </section>

      <p className="legal-back">
        <Link href="/">← Back to LifeOS</Link>
      </p>
    </main>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<main className="legal-page"><p>Loading…</p></main>}>
      <UnsubscribeForm />
    </Suspense>
  );
}
