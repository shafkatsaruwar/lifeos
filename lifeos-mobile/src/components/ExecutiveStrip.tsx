import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useLifeOS } from "../lib/LifeOSContext";
import {
  acknowledgeRun,
  activeRuns,
  COPY,
  emptyExecutiveHub,
  findRoutine,
  isEngineError,
  modeLabel,
  resolveCurrentStep,
  restoreExecutiveNotifications,
  resumeRun,
  saveExecutiveHub,
  subscribeExecutiveHub,
  type ExecutiveHub,
} from "../lib/executive";

/** Compact Now strip — open commitments without burying them in Settings. */
export function ExecutiveStrip() {
  const { user, theme } = useLifeOS();
  const navigation = useNavigation<any>();
  const [hub, setHub] = useState<ExecutiveHub>(emptyExecutiveHub());

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeExecutiveHub(user.uid, setHub);
  }, [user?.uid]);

  const run = activeRuns(hub)[0];
  const open = () => navigation.navigate("ExecutiveHome");

  const persist = async (next: ExecutiveHub) => {
    setHub(next);
    if (!user?.uid) return;
    await saveExecutiveHub(user.uid, next);
    await restoreExecutiveNotifications(next);
  };

  if (!run) {
    return (
      <Pressable
        onPress={open}
        style={({ pressed }) => [
          styles.idle,
          { borderColor: theme.border, backgroundColor: theme.surface, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Feather name="crosshair" size={16} color={theme.accent} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.chip, { color: theme.accent }]}>Executive Function</Text>
          <Text style={{ color: theme.text, fontWeight: "600" }}>Open commitments</Text>
        </View>
        <Feather name="chevron-right" size={18} color={theme.muted} />
      </Pressable>
    );
  }

  const routine = findRoutine(hub, run.routineId);
  if (!routine) return null;
  const step = resolveCurrentStep(routine, run);
  const label =
    routine.sensitive && hub.prefs.salah.privacyLocked && routine.category === "salah"
      ? "Open commitment"
      : routine.name;
  const prompt =
    run.state === "pending" || run.state === "scheduled" || run.state === "acknowledged"
      ? COPY.pendingRoutine(label)
      : step
        ? step.prompt
        : COPY.previousOpen(label);

  const primaryLabel =
    run.state === "paused" ? "Resume" : run.state === "in_progress" && step ? (step.kind === "yes_no" ? "Yes" : "Completed") : "Starting now";

  const onPrimary = async () => {
    if (run.state === "paused") {
      const result = resumeRun(hub, run.id);
      if (!isEngineError(result)) await persist(result);
      return;
    }
    if (run.state === "in_progress") {
      open();
      return;
    }
    const result = acknowledgeRun(hub, run.id, "start");
    if (!isEngineError(result)) await persist(result);
  };

  const onCancel = async () => {
    const result = acknowledgeRun(hub, run.id, "decline");
    if (!isEngineError(result)) await persist(result);
  };

  return (
    <View style={[styles.active, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[styles.chip, { color: theme.accent }]}>
          {modeLabel(run.mode)} · {label}
        </Text>
        <Text style={{ color: theme.text, fontWeight: "700", fontSize: 15 }} numberOfLines={2}>
          {prompt}
        </Text>
      </View>
      <View style={styles.actions}>
        <Pressable
          onPress={() => void onPrimary()}
          style={({ pressed }) => [styles.cta, { backgroundColor: theme.text, opacity: pressed ? 0.8 : 1 }]}
        >
          <Text style={{ color: theme.surface, fontWeight: "700", fontSize: 12 }}>{primaryLabel}</Text>
        </Pressable>
        <Pressable
          onPress={open}
          style={({ pressed }) => [styles.quiet, { borderColor: theme.border, opacity: pressed ? 0.8 : 1 }]}
        >
          <Text style={{ color: theme.text, fontWeight: "700", fontSize: 12 }}>Open</Text>
        </Pressable>
        <Pressable
          onPress={() => void onCancel()}
          style={({ pressed }) => [styles.quiet, { borderColor: theme.border, opacity: pressed ? 0.8 : 1 }]}
        >
          <Text style={{ color: theme.muted, fontWeight: "700", fontSize: 12 }}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  idle: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  active: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  chip: { fontSize: 10, fontWeight: "800", letterSpacing: 0.3, textTransform: "uppercase" },
  actions: { gap: 6, alignItems: "stretch" },
  cta: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignItems: "center" },
  quiet: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1,
  },
});
