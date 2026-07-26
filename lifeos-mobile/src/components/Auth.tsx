import Feather from "@expo/vector-icons/Feather";
import { StatusBar } from "expo-status-bar";
import * as Google from "expo-auth-session/providers/google";
import { useEffect, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, useColorScheme, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { auth, firebaseConfigured } from "../lib/firebase";
import { LIGHT, DARK } from "../lib/theme";
import { ActionButton } from "./UI";
import { useLifeOS } from "../lib/LifeOSContext";

function GoogleSignInButton() {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type !== "success") return;
    const idToken = response.params.id_token;
    if (!idToken) {
      Alert.alert("Google sign-in did not return an ID token", "Check that the mobile OAuth client IDs are in your .env file.");
      return;
    }
    signInWithCredential(auth, GoogleAuthProvider.credential(idToken)).catch((error) => Alert.alert("Could not sign in", error.message));
  }, [response]);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={!request}
      onPress={() => promptAsync()}
      style={({ pressed }) => [styles.signInButton, { opacity: pressed ? 0.8 : !request ? 0.45 : 1 }]}
    >
      <Feather name="log-in" size={18} color="#FFF" />
      <Text style={styles.signInButtonText}>Continue with Google</Text>
    </Pressable>
  );
}

export function SignIn() {
  const dark = useColorScheme() === "dark";
  const theme = dark ? DARK : LIGHT;
  const googleConfigured = Boolean(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID && process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);

  return (
    <SafeAreaView style={[styles.signIn, { backgroundColor: "#111115" }]}>
      <StatusBar style="light" />
      <View style={styles.signInInner}>
        <View style={[styles.logo, { backgroundColor: "#6D5DFB" }]}>
          <Feather name="activity" size={26} color="#FFF" />
        </View>
        <Text style={styles.signInTitle}>LifeOS</Text>
        <Text style={styles.signInCopy}>Your life, in focus. The same private cloud data you already use on the web.</Text>
        {firebaseConfigured && googleConfigured ? (
          <GoogleSignInButton />
        ) : (
          <View style={[styles.signInButton, { opacity: 0.45 }]}>
            <Feather name="log-in" size={18} color="#FFF" />
            <Text style={styles.signInButtonText}>Continue with Google</Text>
          </View>
        )}
        {!firebaseConfigured ? <Text style={[styles.setupText, { color: theme.muted }]}>Add the Firebase values to your local .env file first.</Text> : null}
        {firebaseConfigured && !googleConfigured ? (
          <Text style={[styles.setupText, { color: theme.muted }]}>Firebase is connected. Add your iPhone and web Google client IDs to enable sign-in.</Text>
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
  signIn: { flex: 1, justifyContent: "center", padding: 28 },
  signInInner: { alignItems: "center", gap: 18 },
  logo: { width: 58, height: 58, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  signInTitle: { color: "#FFF", fontSize: 42, fontWeight: "800" },
  signInCopy: { color: "#B8B5C0", fontSize: 16, lineHeight: 24, textAlign: "center", maxWidth: 310 },
  signInButton: { minHeight: 54, alignSelf: "stretch", borderRadius: 15, backgroundColor: "#6D5DFB", flexDirection: "row", gap: 10, alignItems: "center", justifyContent: "center", marginTop: 8 },
  signInButtonText: { color: "#FFF", fontWeight: "800", fontSize: 16 },
  setupText: { textAlign: "center", fontSize: 13 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", borderRadius: 22, padding: 22, gap: 12, alignItems: "center" },
  iconBox: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  modalTitle: { fontSize: 19, fontWeight: "800", textAlign: "center" },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 16, alignSelf: "stretch" },
});
