"use client";

import { useEffect, useState } from "react";
import {
  beginShellBridgeGoogleSignIn,
  consumeShellBridgeGoogleRedirect,
  googleIdTokenFromAuthResult,
} from "@/lib/firebase";

const REDIRECT_KEY = "lifeos_shell_auth_redirect";

function isAllowedShellRedirect(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "exp:" || url.protocol === "exps:" || url.protocol === "lifeos:";
  } catch {
    return false;
  }
}

function rememberRedirect(value: string) {
  if (!isAllowedShellRedirect(value)) return false;
  try {
    sessionStorage.setItem(REDIRECT_KEY, value);
    localStorage.setItem(REDIRECT_KEY, value);
  } catch {
    // Private mode can block storage; query param may still survive the round trip.
  }
  return true;
}

function readRedirect(fallback = "") {
  try {
    return (
      sessionStorage.getItem(REDIRECT_KEY) ||
      localStorage.getItem(REDIRECT_KEY) ||
      fallback ||
      ""
    );
  } catch {
    return fallback || "";
  }
}

function clearRedirect() {
  try {
    sessionStorage.removeItem(REDIRECT_KEY);
    localStorage.removeItem(REDIRECT_KEY);
  } catch {
    // ignore
  }
}

function returnToShell(redirect: string, idToken: string) {
  const target = new URL(redirect);
  target.searchParams.set("id_token", idToken);
  window.location.href = target.toString();
}

export default function ShellAuthPage() {
  const [status, setStatus] = useState("Starting Google sign-in…");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const params = new URLSearchParams(window.location.search);
      const redirectParam = params.get("redirect") || "";
      if (redirectParam) rememberRedirect(redirectParam);

      const redirect = readRedirect(redirectParam);
      if (!redirect || !isAllowedShellRedirect(redirect)) {
        if (!cancelled) {
          setError("Open this page from the LifeOS iPhone app Sign in button.");
          setStatus("");
        }
        return;
      }

      // Persist again in case Firebase stripped query params on return.
      rememberRedirect(redirect);

      try {
        const result = await consumeShellBridgeGoogleRedirect();
        if (cancelled) return;

        if (result?.user) {
          const googleIdToken = googleIdTokenFromAuthResult(result);
          if (!googleIdToken) {
            setError("Google signed in, but did not return an ID token. Try again.");
            setStatus("");
            return;
          }
          setStatus("Returning to LifeOS…");
          clearRedirect();
          returnToShell(redirect, googleIdToken);
          return;
        }

        // Do not reuse Firebase user.getIdToken() — the shell needs a Google ID token.
        setStatus("Opening Google…");
        await beginShellBridgeGoogleSignIn();
      } catch (reason) {
        if (cancelled) return;
        const message = reason instanceof Error ? reason.message : "Google sign-in failed.";
        setError(message);
        setStatus("");
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#f6f7f9",
        color: "#202124",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
      }}
    >
      <div style={{ width: "min(360px, 100%)", textAlign: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 8 }}>LifeOS</div>
        {status ? <p style={{ margin: 0, color: "#777b84", fontSize: 14 }}>{status}</p> : null}
        {error ? (
          <p role="alert" style={{ margin: "12px 0 0", color: "#b42318", fontSize: 14, lineHeight: 1.45 }}>
            {error}
          </p>
        ) : null}
      </div>
    </main>
  );
}
