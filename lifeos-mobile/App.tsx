import { StatusBar } from "expo-status-bar";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewNavigation } from "react-native-webview";

/** Production LifeOS. Override with EXPO_PUBLIC_LIFEOS_URL for local testing. */
const DEFAULT_LIFEOS_URL = "https://lifeos-mu-three.vercel.app";

function resolveLifeOSUrl() {
  const raw = process.env.EXPO_PUBLIC_LIFEOS_URL?.trim() || DEFAULT_LIFEOS_URL;
  try {
    const url = new URL(raw);
    // Hint the site that it's running inside the iPhone shell.
    url.searchParams.set("app", "ios");
    return url.toString();
  } catch {
    return DEFAULT_LIFEOS_URL;
  }
}

export default function App() {
  const webRef = useRef<WebView>(null);
  const lifeOSUrl = useMemo(() => resolveLifeOSUrl(), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);

  const reload = useCallback(() => {
    setError(null);
    setLoading(true);
    webRef.current?.reload();
  }, []);

  const onNav = useCallback((nav: WebViewNavigation) => {
    setCanGoBack(nav.canGoBack);
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
        <StatusBar style="dark" />
        <View style={styles.toolbar}>
          <Text style={styles.brand}>LifeOS</Text>
          <View style={styles.toolbarActions}>
            {canGoBack && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back"
                onPress={() => webRef.current?.goBack()}
                style={styles.toolButton}
              >
                <Text style={styles.toolButtonText}>Back</Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reload LifeOS"
              onPress={reload}
              style={styles.toolButton}
            >
              <Text style={styles.toolButtonText}>Reload</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.webWrap}>
          {error ? (
            <View style={styles.errorPane}>
              <Text style={styles.errorTitle}>Couldn’t open LifeOS</Text>
              <Text style={styles.errorBody}>{error}</Text>
              <Pressable onPress={reload} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Try again</Text>
              </Pressable>
            </View>
          ) : (
            <WebView
              ref={webRef}
              source={{ uri: lifeOSUrl }}
              style={styles.webview}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              onNavigationStateChange={onNav}
              onError={(event) => {
                setLoading(false);
                setError(event.nativeEvent.description || "Network error");
              }}
              onHttpError={(event) => {
                if (event.nativeEvent.statusCode >= 500) {
                  setError(`LifeOS returned ${event.nativeEvent.statusCode}`);
                }
              }}
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
