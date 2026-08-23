import Feather from "@expo/vector-icons/Feather";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ActionButton, Card, Page, Title } from "../components/UI";
import { FocusProofModal } from "../components/FocusProofModal";
import { useLifeOS } from "../lib/LifeOSContext";
import {
  abandonFocusEnforcerSession,
  completeFocusEnforcerSession,
  loadFocusEnforcerPrefs,
  respondToCheck,
  startFocusEnforcerSession,
  subscribeFocusEnforcerSession,
  type FocusCheck,
  type FocusEnforcerPrefs,
  type FocusEnforcerSession,
  type FocusProofPhase,
  type FocusProofResult,
} from "../lib/focusEnforcer";
import { DEFAULT_FOCUS_ENFORCER_PREFS } from "../lib/focusEnforcer/shared";

type ProofIntent =
  | { kind: "start" }
  | { kind: "complete" }
  | { kind: "check"; check: FocusCheck };

export function FocusEnforcerSessionScreen() {
  const { user, workspace, theme } = useLifeOS();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const sessionId = String(route.params?.sessionId || "");
  const [session, setSession] = useState<FocusEnforcerSession | null>(null);
  const [prefs, setPrefs] = useState<FocusEnforcerPrefs>(DEFAULT_FOCUS_ENFORCER_PREFS);
  const [proofIntent, setProofIntent] = useState<ProofIntent | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.uid || !sessionId) return;
    void loadFocusEnforcerPrefs(user.uid).then(setPrefs);
    return subscribeFocusEnforcerSession(user.uid, sessionId, setSession);
  }, [user?.uid, sessionId]);

  const pendingCheck = useMemo(() => {
    if (!session || session.status !== "active") return null;
    const now = Date.now();
    return (
      (session.checks ?? []).find((c) => !c.response && new Date(c.scheduledAt).getTime() <= now) ||
      null
    );
  }, [session]);

  const preferredName = workspace.settings.preferredName;

  const runStart = async (proof?: FocusProofResult) => {
    if (!user?.uid || !session || busy) return;
    setBusy(true);
    try {
      await startFocusEnforcerSession(user.uid, session, prefs, proof, preferredName);
    } catch (error) {
      Alert.alert("Focus Enforcer", error instanceof Error ? error.message : "Could not start.");
    } finally {
      setBusy(false);
      setProofIntent(null);
    }
  };

  const runComplete = async (proof?: FocusProofResult) => {
    if (!user?.uid || !session || busy) return;
    setBusy(true);
    try {
      await completeFocusEnforcerSession(user.uid, session, proof);
    } catch (error) {
      Alert.alert("Focus Enforcer", error instanceof Error ? error.message : "Could not complete.");
    } finally {
      setBusy(false);
      setProofIntent(null);
    }
  };

  const runCheckResponse = async (check: FocusCheck, proof?: FocusProofResult) => {
    if (!user?.uid || !session || busy) return;
    setBusy(true);
    try {
      const response =
        proof?.manualOverride
          ? "override"
          : proof
            ? proof.match
              ? "photo_pass"
              : "photo_fail"
            : "still_working";
      await respondToCheck(
        user.uid,
        session,
        check.id,
        {
          response,
          proof,
          promptedAt: new Date().toISOString(),
          recovered: response === "photo_fail" ? false : undefined,
        },
        prefs,
        preferredName,
      );
    } catch (error) {
      Alert.alert("Focus Enforcer", error instanceof Error ? error.message : "Could not save check.");
    } finally {
      setBusy(false);
      setProofIntent(null);
    }
  };

  const onProofResult = (proof: FocusProofResult) => {
    if (!proofIntent) return;
    if (proofIntent.kind === "start") {
      void runStart(proof);
      return;
    }
    if (proofIntent.kind === "complete") {
      void runComplete(proof);
      return;
    }
    void runCheckResponse(proofIntent.check, proof);
  };

  const requestStart = () => {
    if (!session) return;
    if (session.proofRequired) {
      setProofIntent({ kind: "start" });
      return;
    }
    void runStart();
  };

  const requestComplete = () => {
    if (!session) return;
    if (session.proofRequired) {
      setProofIntent({ kind: "complete" });
      return;
    }
    void runComplete();
  };

  const requestCheck = (check: FocusCheck) => {
    if (check.kind === "photo") {
      setProofIntent({ kind: "check", check });
      return;
    }
    void runCheckResponse(check);
  };

  const abandon = () => {
    if (!user?.uid || !session) return;
    Alert.alert("Abandon session?", "Escalations and checks will stop.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Abandon",
        style: "destructive",
        onPress: () => {
          void abandonFocusEnforcerSession(user.uid, session).then(() => navigation.goBack());
        },
      },
    ]);
  };

  const proofPhase: FocusProofPhase =
    proofIntent?.kind === "complete" ? "complete" : proofIntent?.kind === "check" ? "check" : "start";

  if (!session) {
    return (
      <Page>
        <View style={styles.screen}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.back}>
            <Feather name="chevron-left" size={22} color={theme.accent} />
            <Text style={{ color: theme.accent, fontWeight: "700" }}>Back</Text>
          </Pressable>
          <Title>Session</Title>
          <Text style={{ color: theme.muted }}>Loading…</Text>
        </View>
      </Page>
    );
  }

  const canStart = session.status === "scheduled" || session.status === "escalating";
  const canComplete = session.status === "active";
  const terminal = session.status === "completed" || session.status === "abandoned";

  return (
    <Page>
      <ScrollView contentContainerStyle={styles.screen}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.back}>
          <Feather name="chevron-left" size={22} color={theme.accent} />
          <Text style={{ color: theme.accent, fontWeight: "700" }}>Back</Text>
        </Pressable>
        <Title>Focus Enforcer</Title>
        <Text style={{ color: theme.accent, fontSize: 16, fontWeight: "800" }}>{session.taskTitle}</Text>

        <Card>
          <Text style={[styles.label, { color: theme.text }]}>Status</Text>
          <Text style={{ color: theme.text, fontWeight: "800", textTransform: "capitalize" }}>
            {session.status}
            {session.escalationLevel ? ` · ${session.escalationLevel}` : ""}
          </Text>
          <Text style={{ color: theme.muted, fontSize: 13 }}>
            Start {new Date(session.scheduledStartAt).toLocaleString()} · {session.expectedDurationMin} min
            {session.proofRequired ? " · proof on" : ""}
          </Text>
          {session.actualStartAt ? (
            <Text style={{ color: theme.muted, fontSize: 13 }}>
              Started {new Date(session.actualStartAt).toLocaleString()}
              {session.startDelayMin != null ? ` (+${session.startDelayMin} min)` : ""}
            </Text>
          ) : null}
        </Card>

        {canStart ? (
          <ActionButton label="Start" icon="play" onPress={requestStart} disabled={busy} />
        ) : null}

        {pendingCheck ? (
          <Card>
            <Text style={[styles.label, { color: theme.text }]}>Mid-session check</Text>
            <Text style={{ color: theme.muted, fontSize: 13 }}>
              {pendingCheck.kind === "photo"
                ? "Live photo required to confirm you're still on task."
                : "Quick ack that you're still working."}
            </Text>
            <ActionButton
              label={pendingCheck.kind === "photo" ? "Take photo check" : "Still working"}
              icon={pendingCheck.kind === "photo" ? "camera" : "check"}
              onPress={() => requestCheck(pendingCheck)}
              disabled={busy}
            />
          </Card>
        ) : null}

        {canComplete ? (
          <ActionButton label="Complete" icon="check-circle" onPress={requestComplete} disabled={busy} />
        ) : null}

        {!terminal ? (
          <ActionButton label="Abandon" icon="x-circle" quiet danger onPress={abandon} disabled={busy} />
        ) : null}

        <Card>
          <Text style={[styles.label, { color: theme.text }]}>Checks</Text>
          {(session.checks ?? []).length === 0 ? (
            <Text style={{ color: theme.muted, fontSize: 13 }}>
              Checks appear after you start.
            </Text>
          ) : (
            (session.checks ?? []).map((check) => (
              <View key={check.id} style={[styles.checkRow, { borderColor: theme.border }]}>
                <View style={styles.grow}>
                  <Text style={{ color: theme.text, fontWeight: "700" }}>
                    {check.kind === "photo" ? "Photo" : "Ack"} ·{" "}
                    {new Date(check.scheduledAt).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </Text>
                  <Text style={{ color: theme.muted, fontSize: 12 }}>
                    {check.response || "pending"}
                    {check.proof?.manualOverride ? " (override)" : ""}
                  </Text>
                </View>
              </View>
            ))
          )}
        </Card>

        {session.startProof || session.completionProof ? (
          <Card>
            <Text style={[styles.label, { color: theme.text }]}>Proofs</Text>
            {session.startProof ? (
              <Text style={{ color: theme.muted, fontSize: 13 }}>
                Start: {session.startProof.manualOverride ? "override" : session.startProof.match ? "pass" : "fail"} —{" "}
                {session.startProof.reason}
              </Text>
            ) : null}
            {session.completionProof ? (
              <Text style={{ color: theme.muted, fontSize: 13 }}>
                Complete:{" "}
                {session.completionProof.manualOverride
                  ? "override"
                  : session.completionProof.match
                    ? "pass"
                    : "fail"}{" "}
                — {session.completionProof.reason}
              </Text>
            ) : null}
          </Card>
        ) : null}
      </ScrollView>

      <FocusProofModal
        visible={Boolean(proofIntent)}
        taskTitle={session.taskTitle}
        phase={proofPhase}
        onClose={() => setProofIntent(null)}
        onResult={onProofResult}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 20, paddingBottom: 40, gap: 14 },
  back: { flexDirection: "row", alignItems: "center", gap: 2, alignSelf: "flex-start" },
  label: { fontSize: 14, fontWeight: "800" },
  checkRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    marginTop: 4,
  },
  grow: { flex: 1, gap: 2 },
});
