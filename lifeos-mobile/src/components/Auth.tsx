import Feather from "@expo/vector-icons/Feather";
import * as AppleAuthentication from "expo-apple-authentication";
import * as AuthSession from "expo-auth-session";
import * as Crypto from "expo-crypto";
import * as Device from "expo-device";
import * as WebBrowser from "expo-web-browser";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GoogleAuthProvider, OAuthProvider, signInWithCredential } from "firebase/auth";
import { auth, firebaseConfigured } from "../lib/firebase";
import { LIGHT, DARK } from "../lib/theme";
import { ActionButton } from "./UI";
import { useLifeOS } from "../lib/LifeOSContext";

WebBrowser.maybeCompleteAuthSession();

const LIFEOS_ORIGIN = (() => {
  const raw = process.env.EXPO_PUBLIC_LIFEOS_URL?.trim() || "https://lifeos-mu-three.vercel.app";
  try {
    return new URL(raw).origin;
  } catch {
    return "https://lifeos-mu-three.vercel.app";
  }
})();

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

function GoogleSignInButton() {
  const [signingIn, setSigningIn] = useState(false);
  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();

  const promptSignIn = useCallback(async () => {
    if (signingIn) return;
    setSigningIn(true);
    try {
      // Google rejects Expo Go's exp:// redirect_uri. Run OAuth on HTTPS LifeOS,
      // then deep-link the Google ID token back into the native app.
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: "lifeos",
        path: "shell-auth",
      });
      const authUrl = new URL("/shell-auth", LIFEOS_ORIGIN);
      authUrl.searchParams.set("redirect", redirectUri);
      if (googleWebClientId) {
        authUrl.searchParams.set("google_client_id", googleWebClientId);
      }

      const result = await WebBrowser.openAuthSessionAsync(authUrl.toString(), redirectUri);
      if (result.type === "success" && "url" in result && result.url) {
        const idToken = readIdTokenFromUrl(result.url);
        if (!idToken) {
          Alert.alert("Sign-in incomplete", "Google sign-in finished, but no ID token came back.");
          return;
        }
        await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
        return;
      }
      if (result.type !== "cancel" && result.type !== "dismiss") {
        Alert.alert("Google sign-in failed", "Could not complete Google sign-in.");
      }
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Could not open Google sign-in.";
      Alert.alert("Google sign-in failed", message);
    } finally {
      setSigningIn(false);
    }
  }, [googleWebClientId, signingIn]);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={signingIn}
      onPress={() => void promptSignIn()}
      style={({ pressed }) => [styles.signInButton, { opacity: pressed || signingIn ? 0.8 : 1 }]}
    >
      <Feather name="log-in" size={18} color="#FFF" />
      <Text style={styles.signInButtonText}>{signingIn ? "Signing in…" : "Continue with Google"}</Text>
    </Pressable>
  );
}

function AppleSignInButton() {
  const [signingIn, setSigningIn] = useState(false);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    void AppleAuthentication.isAvailableAsync().then(setAvailable);
  }, []);

  const promptSignIn = useCallback(async () => {
    if (signingIn) return;
    setSigningIn(true);
    try {
      const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
      const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);
      const apple = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
      if (!apple.identityToken) {
        Alert.alert("Sign-in incomplete", "Apple did not return an identity token.");
        return;
      }
      const provider = new OAuthProvider("apple.com");
      const credential = provider.credential({
        idToken: apple.identityToken,
        rawNonce: nonce,
      });
      await signInWithCredential(auth, credential);
    } catch (reason: any) {
      if (reason?.code === "ERR_REQUEST_CANCELED") return;
      const code = typeof reason?.code === "string" ? reason.code : "";
      const base = reason instanceof Error ? reason.message : "Could not complete Apple sign-in.";
      // Simulator Apple Sign In is unreliable (ERR_REQUEST_UNKNOWN / hang after password).
      const message =
        !Device.isDevice && (code === "ERR_REQUEST_UNKNOWN" || /unknown reason/i.test(base))
          ? "Sign in with Apple is unreliable on the iOS Simulator. Use Continue with Google here, or try Apple on a physical iPhone."
          : base;
      Alert.alert("Apple sign-in failed", message);
    } finally {
      setSigningIn(false);
    }
  }, [signingIn]);

  if (!available) return null;

  return (
    <View style={styles.appleBlock}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
        cornerRadius={14}
        style={styles.appleButton}
        onPress={() => void promptSignIn()}
      />
      {!Device.isDevice ? (
        <Text style={styles.appleHint}>Simulator tip: use Google — Apple Sign In needs a real device.</Text>
      ) : null}
    </View>
  );
}

export function SignIn() {
  const dark = useColorScheme() === "dark";
  const theme = dark ? DARK : LIGHT;
  const googleConfigured = Boolean(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim());

  return (
    <SafeAreaView style={[styles.signIn, { backgroundColor: "#111115" }]}>
      <StatusBar style="light" />
      <View style={styles.signInInner}>
        <Image source={require("../../assets/icon.png")} style={styles.logo} accessibilityLabel="LifeOS" />
        <Text style={styles.signInTitle}>LifeOS</Text>
        <Text style={styles.signInCopy}>
          Your life, in focus. Native iPhone & iPad app — same private cloud data as the web.
        </Text>
        {firebaseConfigured && googleConfigured ? (
          <GoogleSignInButton />
        ) : (
          <View style={[styles.signInButton, { opacity: 0.45 }]}>
            <Feather name="log-in" size={18} color="#FFF" />
            <Text style={styles.signInButtonText}>Continue with Google</Text>
          </View>
        )}
        {firebaseConfigured && Platform.OS === "ios" ? <AppleSignInButton /> : null}
        {!firebaseConfigured ? (
          <Text style={[styles.setupText, { color: theme.muted }]}>
            Add the Firebase values to your local .env file first.
          </Text>
        ) : null}
        {firebaseConfigured && !googleConfigured ? (
          <Text style={[styles.setupText, { color: theme.muted }]}>
            Firebase is connected. Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to enable Google sign-in. Apple Sign In still
            works when enabled in Firebase Console.
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

export function OnboardingName() {
  const { workspace, theme, updateSettings } = useLifeOS();
  const [name, setName] = useState("");
  if (workspace.settings.preferredName) return null;
  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
          <View style={[styles.iconBox, { backgroundColor: theme.soft }]}>
            <Feather name="smile" size={22} color={theme.accent} />
          </View>
          <Text style={[styles.modalTitle, { color: theme.text }]}>What should we call you?</Text>
          <Text style={{ color: theme.muted, fontSize: 15, lineHeight: 22 }}>LifeOS will use this in your greeting. You can change it anytime.</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            autoFocus
            placeholder="Your name"
            placeholderTextColor={theme.muted}
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          />
          <ActionButton
            label="Continue"
            onPress={() => {
              if (name.trim()) updateSettings({ ...workspace.settings, preferredName: name.trim() });
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  signIn: { flex: 1 },
  signInInner: { flex: 1, justifyContent: "center", padding: 28, gap: 14, width: "100%", maxWidth: 480, alignSelf: "center" },
  logo: { width: 56, height: 56, borderRadius: 16, marginBottom: 8 },
  signInTitle: { color: "#FFF", fontSize: 40, fontWeight: "800", letterSpacing: -1 },
  signInCopy: { color: "#A1A1AA", fontSize: 16, lineHeight: 24, marginBottom: 12, maxWidth: 320 },
  signInButton: { height: 52, borderRadius: 14, backgroundColor: "#6D5DFB", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  signInButtonText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  appleBlock: { width: "100%", gap: 8 },
  appleButton: { width: "100%", height: 52 },
  appleHint: { color: "#71717A", fontSize: 12, lineHeight: 17 },
  setupText: { fontSize: 13, lineHeight: 19, marginTop: 8 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", maxWidth: 400, borderRadius: 20, padding: 22, gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  modalTitle: { fontSize: 22, fontWeight: "800" },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
});
