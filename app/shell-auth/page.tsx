"use client";

import { useEffect, useState } from "react";
import {
  beginShellBridgeGoogleSignIn,
  consumeShellBridgeGoogleRedirect,
  googleIdTokenFromAuthResult,
} from "@/lib/firebase";

const REDIRECT_KEY = "lifeos_shell_auth_redirect";
const NONCE_KEY = "lifeos_shell_auth_nonce";
const STATE_KEY = "lifeos_shell_auth_state";
const CLIENT_KEY = "lifeos_shell_auth_google_client_id";

function isAllowedShellRedirect(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "exp:" || url.protocol === "exps:" || url.protocol === "lifeos:";
  } catch {
    return false;
  }
}

function isGoogleClientId(value: string) {
  return /^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/i.test(value);
}

function remember(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function read(key: string, fallback = "") {
  try {
    return sessionStorage.getItem(key) || localStorage.getItem(key) || fallback || "";
  } catch {
    return fallback || "";
  }
}

function clearKey(key: string) {
  try {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function clearAuthKeys() {
  clearKey(REDIRECT_KEY);
  clearKey(NONCE_KEY);
  clearKey(STATE_KEY);
  clearKey(CLIENT_KEY);
}

function randomToken() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function returnToShell(redirect: string, idToken: string) {
  const target = new URL(redirect);
  target.searchParams.set("id_token", idToken);
  window.location.href = target.toString();
}

function shellAuthRedirectUri() {
  return `${window.location.origin}/shell-auth`;
}

function startDirectGoogleOAuth(clientId: string) {
  const nonce = randomToken();
  const state = randomToken();
  remember(NONCE_KEY, nonce);
  remember(STATE_KEY, state);
  remember(CLIENT_KEY, clientId);

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: shellAuthRedirectUri(),
    response_type: "id_token",
    scope: "openid email profile",
    nonce,
    state,
    prompt: "select_account",
  }).toString();
  window.location.href = url.toString();
}

function readGoogleIdTokenFromHash() {
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const idToken = params.get("id_token");
  const state = params.get("state");
  const error = params.get("error");
  if (error) {
    throw new Error(params.get("error_description") || `Google sign-in error: ${error}`);
  }
  if (!idToken) return null;
  const expectedState = read(STATE_KEY);
  if (expectedState && state && expectedState !== state) {
    throw new Error("Google sign-in state mismatch. Close this window and try Sign in again.");
  }
  // Drop the token from the URL bar before hopping back to Expo.
  window.history.replaceState({}, "", window.location.pathname + window.location.search);
  return idToken;
}

export default function ShellAuthPage() {
  const [status, setStatus] = useState("Starting Google sign-in…");
  const [error, setError] = useState("");
  const [canRetry, setCanRetry] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const params = new URLSearchParams(window.location.search);
      const redirectParam = params.get("redirect") || "";
      const clientParam = params.get("google_client_id") || "";
      const envClient = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";

      if (redirectParam && isAllowedShellRedirect(redirectParam)) remember(REDIRECT_KEY, redirectParam);
      if (clientParam && isGoogleClientId(clientParam)) remember(CLIENT_KEY, clientParam);
      else if (envClient && isGoogleClientId(envClient)) remember(CLIENT_KEY, envClient);

      const redirect = read(REDIRECT_KEY, redirectParam);
      if (!redirect || !isAllowedShellRedirect(redirect)) {
        if (!cancelled) {
          setError("Open this page from the LifeOS iPhone app Sign in button.");
          setStatus("");
        }
        return;
      }
      remember(REDIRECT_KEY, redirect);

      try {
        // 1) Direct Google OAuth return (id_token in hash) — avoids firebaseapp.com entirely.
        const directToken = readGoogleIdTokenFromHash();
        if (cancelled) return;
        if (directToken) {
          setStatus("Returning to LifeOS…");
          clearAuthKeys();
          returnToShell(redirect, directToken);
          return;
        }

        // 2) Firebase redirect return (same-origin authDomain via /__/auth proxy).
        const result = await consumeShellBridgeGoogleRedirect();
        if (cancelled) return;
        if (result?.user) {
          const googleIdToken = googleIdTokenFromAuthResult(result);
          if (!googleIdToken) {
            setError("Google signed in, but did not return an ID token. Try again.");
            setStatus("");
            setCanRetry(true);
            return;
          }
          setStatus("Returning to LifeOS…");
          clearAuthKeys();
          returnToShell(redirect, googleIdToken);
          return;
        }

        // 3) Start auth. Prefer direct Google OAuth when we have a web client ID.
        const clientId = read(CLIENT_KEY, clientParam || envClient);
        if (clientId && isGoogleClientId(clientId)) {
          setStatus("Opening Google…");
          startDirectGoogleOAuth(clientId);
          return;
        }

        setStatus("Opening Google…");
        await beginShellBridgeGoogleSignIn();
      } catch (reason) {
        if (cancelled) return;
        const message = reason instanceof Error ? reason.message : "Google sign-in failed.";
        const redirectUri = typeof window !== "undefined" ? shellAuthRedirectUri() : "https://lifeos-mu-three.vercel.app/shell-auth";
        if (/redirect_uri_mismatch/i.test(message) || /invalid_request/i.test(message)) {
          setError(
            `Add this Authorized redirect URI to your Google Web client, then try again:\n${redirectUri}`,
          );
        } else {
          setError(message);
        }
        setStatus("");
        setCanRetry(true);
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
      <div style={{ width: "min(400px, 100%)", textAlign: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 8 }}>LifeOS</div>
        {status ? <p style={{ margin: 0, color: "#777b84", fontSize: 14 }}>{status}</p> : null}
        {error ? (
          <p
            role="alert"
            style={{
              margin: "12px 0 0",
              color: "#b42318",
              fontSize: 14,
              lineHeight: 1.45,
              whiteSpace: "pre-wrap",
            }}
          >
            {error}
          </p>
        ) : null}
        {canRetry ? (
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: 16,
              border: 0,
              borderRadius: 10,
              background: "#202124",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              padding: "12px 16px",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        ) : null}
      </div>
    </main>
  );
}
