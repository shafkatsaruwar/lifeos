import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { StatusBar } from "expo-status-bar";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from "react-native-webview";

WebBrowser.maybeCompleteAuthSession();

/** Production LifeOS. Override with EXPO_PUBLIC_LIFEOS_URL for local testing. */
const DEFAULT_LIFEOS_URL = "https://lifeos-mu-three.vercel.app";

function resolveLifeOSUrl() {
  const raw = process.env.EXPO_PUBLIC_LIFEOS_URL?.trim() || DEFAULT_LIFEOS_URL;
  try {
    const url = new URL(raw);
    url.searchParams.set("app", "ios");
    return url.toString();
  } catch {
    return DEFAULT_LIFEOS_URL;
  }
}

function resolveLifeOSOrigin() {
  const raw = process.env.EXPO_PUBLIC_LIFEOS_URL?.trim() || DEFAULT_LIFEOS_URL;
  try {
    return new URL(raw).origin;
  } catch {
    return "https://lifeos-mu-three.vercel.app";
  }
}

function readIdTokenFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    const fromQuery = parsed.searchParams.get("id_token");
    if (fromQuery) return fromQuery;
    const hash = parsed.hash.startsWith("#") ? parsed.hash.slice(1) : parsed.hash;
    if (!hash) return null;
    return new URLSearchParams(hash).get("id_token");
  } catch {
    return null;
  }
}

function injectGoogleIdToken(idToken: string) {
  const token = JSON.stringify(idToken);
  return `
    (function() {
      try {
        if (typeof window.__lifeosCompleteGoogleSignIn === 'function') {
          window.__lifeosCompleteGoogleSignIn(${token});
        } else {
          window.__lifeosPendingGoogleIdToken = ${token};
        }
      } catch (error) {}
      true;
    })();
  `;
}

function injectGoogleSignInError(message: string) {
  const text = JSON.stringify(message);
  return `
    (function() {
      try {
        if (typeof window.__lifeosRejectGoogleSignIn === 'function') {
          window.__lifeosRejectGoogleSignIn(${text});
        }
      } catch (error) {}
      true;
    })();
  `;
}

export default function App() {
  const webRef = useRef<WebView>(null);
  const lifeOSUrl = useMemo(() => resolveLifeOSUrl(), []);
  const lifeOSOrigin = useMemo(() => resolveLifeOSOrigin(), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [webKey, setWebKey] = useState(0);
  const [signingIn, setSigningIn] = useState(false);

  const goHome = useCallback(() => {
    setError(null);
    setLoading(true);
    setCanGoBack(false);
    setWebKey((value) => value + 1);
  }, []);

  const reload = useCallback(() => {
    setError(null);
    setLoading(true);
    webRef.current?.reload();
  }, []);

  const onNav = useCallback((nav: WebViewNavigation) => {
    setCanGoBack(nav.canGoBack);
  }, []);

  const startNativeGoogleSignIn = useCallback(async () => {
    if (signingIn) return;
    setSigningIn(true);
    try {
      // Google rejects Expo Go's exp:// redirect_uri. Run OAuth on HTTPS LifeOS,
      // then deep-link the ID token back into the shell.
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: "lifeos",
        path: "shell-auth",
      });
      const authUrl = new URL("/shell-auth", lifeOSOrigin);
      authUrl.searchParams.set("redirect", redirectUri);

      const result = await WebBrowser.openAuthSessionAsync(authUrl.toString(), redirectUri);

      if (result.type === "success" && "url" in result && result.url) {
        const idToken = readIdTokenFromUrl(result.url);
        if (!idToken) {
          const message = "Google sign-in finished, but no ID token came back.";
          webRef.current?.injectJavaScript(injectGoogleSignInError(message));
          Alert.alert("Sign-in incomplete", message);
          return;
        }
        webRef.current?.injectJavaScript(injectGoogleIdToken(idToken));
        return;
      }

      if (result.type === "cancel" || result.type === "dismiss") {
        webRef.current?.injectJavaScript(
          injectGoogleSignInError("Google sign-in was closed before it finished."),
        );
      }
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Could not open Google sign-in.";
      webRef.current?.injectJavaScript(injectGoogleSignInError(message));
      Alert.alert("Google sign-in failed", message);
    } finally {
      setSigningIn(false);
    }
  }, [lifeOSOrigin, signingIn]);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const payload = JSON.parse(event.nativeEvent.data);
        if (payload?.type === "LIFEOS_REQUEST_GOOGLE_SIGNIN") {
          void startNativeGoogleSignIn();
        }
      } catch {
        // ignore non-JSON messages
      }
    },
    [startNativeGoogleSignIn],
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
        <StatusBar style="dark" />
        <View style={styles.toolbar}>
          <Text style={styles.brand}>LifeOS</Text>
          <View style={styles.toolbarActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign in with Google"
              disabled={signingIn}
              onPress={() => void startNativeGoogleSignIn()}
              style={[styles.toolButton, styles.signInButton, signingIn && styles.signInButtonDisabled]}
            >
              <Text style={styles.signInButtonText}>{signingIn ? "Signing in…" : "Sign in"}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Go to LifeOS home" onPress={goHome} style={styles.toolButton}>
              <Text style={styles.toolButtonText}>Home</Text>
            </Pressable>
            {canGoBack && (
              <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => webRef.current?.goBack()} style={styles.toolButton}>
                <Text style={styles.toolButtonText}>Back</Text>
              </Pressable>
            )}
            <Pressable accessibilityRole="button" accessibilityLabel="Reload LifeOS" onPress={reload} style={styles.toolButton}>
              <Text style={styles.toolButtonText}>Reload</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.webWrap}>
          {error ? (
            <View style={styles.errorPane}>
              <Text style={styles.errorTitle}>Couldn’t open LifeOS</Text>
              <Text style={styles.errorBody}>{error}</Text>
              <Pressable onPress={goHome} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Try again</Text>
              </Pressable>
            </View>
          ) : (
            <WebView
              key={webKey}
              ref={webRef}
              source={{ uri: lifeOSUrl }}
              style={styles.webview}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              onNavigationStateChange={onNav}
              onMessage={onMessage}
              onError={(event) => {
                setLoading(false);
                setError(event.nativeEvent.description || "Network error");
              }}
              onHttpError={(event) => {
                if (event.nativeEvent.statusCode >= 500) {
                  setError(`LifeOS returned ${event.nativeEvent.statusCode}`);
                }
              }}
              injectedJavaScriptBeforeContentLoaded={`
                (function() {
                  if (!window.ReactNativeWebView) {
                    window.ReactNativeWebView = {
                      postMessage: function(data) {
                        try {
                          window.webkit.messageHandlers.ReactNativeWebView.postMessage(String(data));
                        } catch (error) {}
                      }
                    };
                  }
                  window.addEventListener('DOMContentLoaded', function() {
                    if (window.__lifeosPendingGoogleIdToken && typeof window.__lifeosCompleteGoogleSignIn === 'function') {
                      window.__lifeosCompleteGoogleSignIn(window.__lifeosPendingGoogleIdToken);
                      delete window.__lifeosPendingGoogleIdToken;
                    }
                  });
                  true;
                })();
              `}
              injectedJavaScript={`
                (function() {
                  if (!window.ReactNativeWebView) {
                    window.ReactNativeWebView = {
                      postMessage: function(data) {
                        try {
                          window.webkit.messageHandlers.ReactNativeWebView.postMessage(String(data));
                        } catch (error) {}
                      }
                    };
                  }
                  if (window.__lifeosPendingGoogleIdToken && typeof window.__lifeosCompleteGoogleSignIn === 'function') {
                    window.__lifeosCompleteGoogleSignIn(window.__lifeosPendingGoogleIdToken);
                    delete window.__lifeosPendingGoogleIdToken;
                  }
                  true;
                })();
              `}
              allowsBackForwardNavigationGestures
              sharedCookiesEnabled
              thirdPartyCookiesEnabled
              setSupportMultipleWindows={false}
              pullToRefreshEnabled={Platform.OS === "android"}
              applicationNameForUserAgent="LifeOS-iOS-Shell"
              startInLoadingState
            />
          )}

          {loading && !error && (
            <View style={styles.loadingOverlay} pointerEvents="none">
              <ActivityIndicator color="#625af6" size="large" />
              <Text style={styles.loadingText}>Opening LifeOS…</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f6f7f9",
  },
  toolbar: {
    height: 44,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e8e9ed",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    fontSize: 16,
    fontWeight: "700",
    color: "#202124",
    letterSpacing: -0.3,
  },
  toolbarActions: {
    flexDirection: "row",
    gap: 8,
  },
  toolButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#f6f7f9",
  },
  toolButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#625af6",
  },
  signInButton: {
    backgroundColor: "#202124",
  },
  signInButtonDisabled: {
    opacity: 0.7,
  },
  signInButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff",
  },
  webWrap: {
    flex: 1,
    backgroundColor: "#f6f7f9",
  },
  webview: {
    flex: 1,
    backgroundColor: "#f6f7f9",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(246,247,249,0.88)",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: "#777b84",
  },
  errorPane: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 10,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#202124",
  },
  errorBody: {
    fontSize: 13,
    lineHeight: 18,
    color: "#777b84",
    textAlign: "center",
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: "#202124",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
});
