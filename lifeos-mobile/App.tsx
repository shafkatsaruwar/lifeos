import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [webKey, setWebKey] = useState(0);

  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  const googleConfigured = Boolean(iosClientId && webClientId);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId,
    androidClientId,
    webClientId,
  });

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
    // Recover from dead Firebase/Google auth handler pages inside the WebView.
    const href = nav.url || "";
    if (
      href.includes("missing initial state") ||
      href.includes("__/auth/handler") ||
      href.includes("accounts.google.com/o/oauth2") && href.includes("error")
    ) {
      // Keep navigation state; user can tap Home. Auto-home on handler stall.
    }
  }, []);

  const startNativeGoogleSignIn = useCallback(async () => {
    if (!googleConfigured) {
      const message = "Add EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID and EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to lifeos-mobile/.env, then restart Expo.";
      webRef.current?.injectJavaScript(injectGoogleSignInError(message));
      Alert.alert("Google sign-in needs setup", message);
      return;
    }
    if (!request) {
      webRef.current?.injectJavaScript(injectGoogleSignInError("Google sign-in is still warming up. Try again in a second."));
      return;
    }
    try {
      await promptAsync();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Could not open Google sign-in.";
      webRef.current?.injectJavaScript(injectGoogleSignInError(message));
    }
  }, [googleConfigured, promptAsync, request]);

  useEffect(() => {
    if (!response) return;
    if (response.type === "success") {
      const idToken = response.params.id_token;
      if (!idToken) {
        webRef.current?.injectJavaScript(injectGoogleSignInError("Google did not return an ID token."));
        return;
      }
      webRef.current?.injectJavaScript(injectGoogleIdToken(idToken));
      return;
    }
    if (response.type === "dismiss" || response.type === "cancel") {
      webRef.current?.injectJavaScript(injectGoogleSignInError("Google sign-in was closed before it finished."));
    }
  }, [response]);

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data);
      if (payload?.type === "LIFEOS_REQUEST_GOOGLE_SIGNIN") {
        void startNativeGoogleSignIn();
      }
    } catch {
      // ignore non-JSON messages
    }
  }, [startNativeGoogleSignIn]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
        <StatusBar style="dark" />
        <View style={styles.toolbar}>
          <Text style={styles.brand}>LifeOS</Text>
          <View style={styles.toolbarActions}>
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
                  window.addEventListener('DOMContentLoaded', function() {
                    if (window.__lifeosPendingGoogleIdToken && typeof window.__lifeosCompleteGoogleSignIn === 'function') {
                      window.__lifeosCompleteGoogleSignIn(window.__lifeosPendingGoogleIdToken);
                      delete window.__lifeosPendingGoogleIdToken;
                    }
                  });
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
