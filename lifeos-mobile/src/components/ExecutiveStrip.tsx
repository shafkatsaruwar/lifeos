import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useLifeOS } from "../lib/LifeOSContext";
import {
  activeRuns,
  COPY,
  emptyExecutiveHub,
  findRoutine,
  modeLabel,
  resolveCurrentStep,
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

  return (
    <Pressable
      onPress={open}
      style={({ pressed }) => [
        styles.active,
        { borderColor: theme.border, backgroundColor: theme.surface, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[styles.chip, { color: theme.accent }]}>
          {modeLabel(run.mode)} · {label}
        </Text>
        <Text style={{ color: theme.text, fontWeight: "700", fontSize: 15 }} numberOfLines={2}>
          {prompt}
        </Text>
      </View>
      <View style={[styles.cta, { backgroundColor: theme.text }]}>
        <Text style={{ color: theme.surface, fontWeight: "700", fontSize: 12 }}>Open</Text>
      </View>
    </Pressable>
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
  cta: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
});
