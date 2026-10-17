import { useNavigation, useRoute } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { ActionButton, Card, Eyebrow, IconButton, Page, Title } from "../components/UI";
import { useFloatingTabBarContentPadding } from "../components/FloatingTabBar";
import { useLifeOS } from "../lib/LifeOSContext";
import {
  acknowledgeRun,
  activeRuns,
  buildDailyBriefing,
  confirmStep,
  COPY,
  emptyExecutiveHub,
  findRoutine,
  isEngineError,
  modeLabel,
  pauseRun,
  resolveCurrentStep,
  restoreExecutiveNotifications,
  resumeRun,
  scheduleOrPromptRun,
  snoozeOptions,
  statusChecklist,
  stillWorking,
  subscribeExecutiveHub,
  saveExecutiveHub,
  tickExecutiveSchedules,
  type ExecutiveHub,
  type GuidanceMode,
} from "../lib/executive";

export function ExecutiveHomeScreen() {
  const { user, theme, workspace } = useLifeOS();
  const tabBarPad = useFloatingTabBarContentPadding(28);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [hub, setHub] = useState<ExecutiveHub>(emptyExecutiveHub());
  const [modeOverride, setModeOverride] = useState<GuidanceMode | "auto">("auto");
  const [busy, setBusy] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);

  const persist = useCallback(
    async (next: ExecutiveHub) => {
      setHub(next);
      if (!user?.uid) return;
      await saveExecutiveHub(user.uid, next);
      await restoreExecutiveNotifications(next);
    },
    [user?.uid],
  );

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeExecutiveHub(user.uid, (incoming) => {
      const ticked = tickExecutiveSchedules(incoming);
      setHub(ticked);
      if (ticked !== incoming) {
        void saveExecutiveHub(user.uid, ticked).then(() => restoreExecutiveNotifications(ticked));
      }
    });
  }, [user?.uid]);

  // Deep-link: start a routine or focus a run from notification
  useEffect(() => {
    const startRoutineId = route.params?.startRoutineId as string | undefined;
    if (!startRoutineId || busy || !user?.uid) return;
    const existing = activeRuns(hub).find((r) => r.routineId === startRoutineId);
    if (existing) {
      navigation.setParams?.({ startRoutineId: undefined });
      return;
    }
    setBusy(true);
    const scheduled = scheduleOrPromptRun(hub, startRoutineId);
    if (isEngineError(scheduled)) {
      Alert.alert("Executive Function", scheduled.error);
      setBusy(false);
      navigation.setParams?.({ startRoutineId: undefined });
      return;
    }
    void persist(scheduled).finally(() => {
      setBusy(false);
      navigation.setParams?.({ startRoutineId: undefined });
    });
  }, [route.params?.startRoutineId, hub, busy, user?.uid, persist, navigation]);

  const actives = useMemo(() => activeRuns(hub), [hub]);
  const primary = actives[0] || null;
  const routine = primary ? findRoutine(hub, primary.routineId) : null;
  const step = primary && routine ? resolveCurrentStep(routine, primary) : null;
  const checklist = primary && routine ? statusChecklist(routine, primary) : [];
  const openPriorityCount = workspace.tasks.filter((t) => !t.done && !t.canceled).length;
  const briefing = useMemo(
    () => buildDailyBriefing(hub, { openPriorityCount }),
    [hub, openPriorityCount],
  );
  const snoozes = snoozeOptions(hub.prefs.defaultSnoozeMinutes);
  const offerHelp = primary ? primary.postponementCount >= hub.prefs.snoozeLimit : false;

  const apply = async (result: ReturnType<typeof scheduleOrPromptRun>, ok?: string) => {
    if (isEngineError(result)) {
      Alert.alert("Executive Function", result.error);
      return;
    }
    setBusy(true);
    try {
      await persist(result);
      if (ok) Alert.alert("LifeOS", ok);
    } finally {
      setBusy(false);
    }
  };

  const start = async (routineId: string) => {
    const mode = modeOverride === "auto" ? undefined : modeOverride;
    const scheduled = scheduleOrPromptRun(hub, routineId, { mode });
    if (isEngineError(scheduled)) {
      Alert.alert("Executive Function", scheduled.error);
      return;
    }
    const runId = scheduled.runs[0]?.id;
    if (!runId) return;
    await apply(acknowledgeRun(scheduled, runId, "start"));
  };

  return (
    <Page>
      <View style={styles.header}>
        <IconButton icon="arrow-left" label="Back" onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <Eyebrow>Executive Function</Eyebrow>
          <Title>Commitments</Title>
        </View>
        <IconButton
          icon="sliders"
          label="Preferences"
          onPress={() => setShowPrefs((v) => !v)}
        />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: tabBarPad, gap: 14 }}>
        <Card>
          <Text style={[styles.lead, { color: theme.muted }]}>
            Intention → prompt → acknowledgment → start → follow-up → confirmed completion. Nothing is
            assumed.
          </Text>
          <View style={styles.modeRow}>
            {(["auto", "executive", "guided", "transition"] as const).map((m) => (
              <Pressable
                key={m}
                onPress={() => setModeOverride(m)}
                style={[
                  styles.modePill,
                  {
                    borderColor: modeOverride === m ? theme.accent : theme.border,
                    backgroundColor: modeOverride === m ? theme.soft : theme.surface,
                  },
                ]}
              >
                <Text style={{ color: theme.text, fontSize: 11, fontWeight: "700" }}>
                  {m === "auto" ? "Auto" : modeLabel(m)}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <Card>
          <Eyebrow>{briefing.title}</Eyebrow>
          <Text style={{ color: theme.text, marginTop: 6 }}>{briefing.summary}</Text>
          {briefing.recommended ? (
            <Text style={[styles.hint, { color: theme.muted }]}>
              Recommended: {briefing.recommended.label}
              {briefing.recommended.detail ? ` — ${briefing.recommended.detail}` : ""}
            </Text>
          ) : null}
        </Card>

        {primary && routine && (primary.state === "pending" || primary.state === "scheduled" || primary.state === "acknowledged") ? (
          <Card>
            <Text style={[styles.chip, { color: theme.accent }]}>
              {modeLabel(primary.mode)} · {primary.state.replace("_", " ")}
            </Text>
            <Text style={[styles.prompt, { color: theme.text }]}>
              {routine.category === "hygiene" ? COPY.eveningRetainers : COPY.pendingRoutine(routine.name)}
            </Text>
            <Text style={[styles.hint, { color: theme.muted }]}>{COPY.neverAssumed}</Text>
            {offerHelp ? (
              <Text style={[styles.hint, { color: theme.text, marginTop: 8 }]}>{COPY.troubleSwitching}</Text>
            ) : null}
            <View style={styles.actions}>
              <ActionButton
                label={offerHelp ? "Help me transition" : "Starting now"}
                onPress={() => void apply(acknowledgeRun(hub, primary.id, "start"))}
                disabled={busy}
              />
              {snoozes.map((m) => (
                <ActionButton
                  key={m}
                  quiet
                  label={`In ${m}m`}
                  icon="clock"
                  onPress={() =>
                    void apply(acknowledgeRun(hub, primary.id, "snooze", m), `Follow-up in ${m}m`)
                  }
                  disabled={busy}
                />
              ))}
              <ActionButton
                quiet
                label="Already completed"
                onPress={() => void apply(acknowledgeRun(hub, primary.id, "already_completed"))}
                disabled={busy}
              />
              <ActionButton
                quiet
                label="Dismiss"
                onPress={() => void apply(acknowledgeRun(hub, primary.id, "decline"), COPY.declineAck)}
                disabled={busy}
              />
            </View>
          </Card>
        ) : null}

        {primary && routine && step && (primary.state === "in_progress" || primary.state === "paused") ? (
          <Card>
            <Text style={[styles.chip, { color: theme.accent }]}>
              {modeLabel(primary.mode)} · {primary.state.replace("_", " ")} · {routine.name}
            </Text>
            {primary.mode === "guided" ? (
              <View style={{ gap: 6, marginTop: 10 }}>
                {checklist.map((item) => (
                  <Text
                    key={item.id}
                    style={{
                      color: item.done ? theme.muted : item.current ? theme.text : theme.muted,
                      fontWeight: item.current ? "700" : "400",
                    }}
                  >
                    {item.done ? "✓" : item.current ? "→" : "·"} {item.title}
                  </Text>
                ))}
              </View>
            ) : null}
            {primary.state === "paused" ? (
              <Text style={[styles.hint, { color: theme.text, marginTop: 10 }]}>{COPY.paused}</Text>
            ) : null}
            <Eyebrow>{step.title}</Eyebrow>
            <Text style={[styles.prompt, { color: theme.text }]}>{step.prompt}</Text>
            <View style={styles.actions}>
              {primary.state === "paused" ? (
                <ActionButton
                  label="Resume"
                  icon="play"
                  onPress={() => void apply(resumeRun(hub, primary.id))}
                  disabled={busy}
                />
              ) : (
                <>
                  {step.kind === "yes_no" ? (
                    <>
                      <ActionButton
                        label="Yes"
                        icon="check"
                        onPress={() => void apply(confirmStep(hub, primary.id, "yes"))}
                        disabled={busy}
                      />
                      <ActionButton
                        quiet
                        label="Not yet"
                        onPress={() => void apply(confirmStep(hub, primary.id, "no"))}
                        disabled={busy}
                      />
                    </>
                  ) : (
                    <>
                      <ActionButton
                        label="Completed"
                        icon="check"
                        onPress={() => void apply(confirmStep(hub, primary.id, "done"))}
                        disabled={busy}
                      />
                      <ActionButton
                        quiet
                        label="Still working"
                        onPress={() =>
                          void apply(
                            stillWorking(hub, primary.id),
                            `Follow-up in ${hub.prefs.defaultSnoozeMinutes}m`,
                          )
                        }
                        disabled={busy}
                      />
                    </>
                  )}
                  <ActionButton
                    quiet
                    label="Pause"
                    icon="pause"
                    onPress={() => void apply(pauseRun(hub, primary.id), COPY.paused)}
                    disabled={busy}
                  />
                </>
              )}
            </View>
          </Card>
        ) : null}

        {!primary || ["completed", "skipped", "expired"].includes(primary.state) ? (
          <View style={{ gap: 10 }}>
            {hub.routines.map((item) => (
              <Card key={item.id}>
                <Text style={[styles.chip, { color: theme.accent }]}>{item.category.toUpperCase()}</Text>
                <Text style={{ color: theme.text, fontWeight: "700", fontSize: 17, marginTop: 4 }}>
                  {item.name}
                </Text>
                <Text style={[styles.hint, { color: theme.muted }]}>{item.description}</Text>
                <Text style={[styles.meta, { color: theme.muted }]}>
                  {item.steps.length} steps · {modeLabel(item.defaultMode)}
                  {item.schedule?.timeLocal ? ` · ${item.schedule.timeLocal}` : ""}
                  {item.schedule?.kind === "salah" ? " · calculated times" : ""}
                </Text>
                <View style={{ marginTop: 12 }}>
                  <ActionButton label="Start" icon="play" onPress={() => void start(item.id)} disabled={busy} />
                </View>
              </Card>
            ))}
          </View>
        ) : null}

        {showPrefs ? (
          <Card>
            <Eyebrow>Preferences</Eyebrow>
            <Text style={[styles.hint, { color: theme.muted, marginBottom: 10 }]}>
              Follow-ups use local notifications. Salah stays private when the lock is on.
            </Text>
            <PrefRow
              label="Proactive prompts"
              value={hub.prefs.proactiveEnabled}
              onChange={(proactiveEnabled) =>
                void persist({ ...hub, prefs: { ...hub.prefs, proactiveEnabled } })
              }
              theme={theme}
            />
            <PrefRow
              label="Follow-ups"
              value={hub.prefs.followUpEnabled}
              onChange={(followUpEnabled) =>
                void persist({ ...hub, prefs: { ...hub.prefs, followUpEnabled } })
              }
              theme={theme}
            />
            <PrefRow
              label="Salah prompts"
              value={hub.prefs.salah.enabled}
              onChange={(enabled) =>
                void persist({
                  ...hub,
                  prefs: { ...hub.prefs, salah: { ...hub.prefs.salah, enabled } },
                })
              }
              theme={theme}
            />
            <PrefRow
              label="Keep salah private"
              value={hub.prefs.salah.privacyLocked}
              onChange={(privacyLocked) =>
                void persist({
                  ...hub,
                  prefs: { ...hub.prefs, salah: { ...hub.prefs.salah, privacyLocked } },
                })
              }
              theme={theme}
            />
            <Text style={[styles.fieldLabel, { color: theme.muted }]}>Latitude</Text>
            <TextInput
              keyboardType="decimal-pad"
              placeholder="e.g. 40.7128"
              placeholderTextColor={theme.muted}
              value={hub.prefs.salah.latitude == null ? "" : String(hub.prefs.salah.latitude)}
              onChangeText={(text) =>
                void persist({
                  ...hub,
                  prefs: {
                    ...hub.prefs,
                    salah: {
                      ...hub.prefs.salah,
                      latitude: text.trim() === "" ? null : Number(text),
                    },
                  },
                })
              }
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
            />
            <Text style={[styles.fieldLabel, { color: theme.muted }]}>Longitude</Text>
            <TextInput
              keyboardType="decimal-pad"
              placeholder="e.g. -74.006"
              placeholderTextColor={theme.muted}
              value={hub.prefs.salah.longitude == null ? "" : String(hub.prefs.salah.longitude)}
              onChangeText={(text) =>
                void persist({
                  ...hub,
                  prefs: {
                    ...hub.prefs,
                    salah: {
                      ...hub.prefs.salah,
                      longitude: text.trim() === "" ? null : Number(text),
                    },
                  },
                })
              }
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
            />
            <View style={styles.methodRow}>
              {(["ISNA", "MWL", "Egypt", "Makkah", "Karachi"] as const).map((method) => (
                <Pressable
                  key={method}
                  onPress={() =>
                    void persist({
                      ...hub,
                      prefs: { ...hub.prefs, salah: { ...hub.prefs.salah, method } },
                    })
                  }
                  style={[
                    styles.modePill,
                    {
                      borderColor: hub.prefs.salah.method === method ? theme.accent : theme.border,
                      backgroundColor: hub.prefs.salah.method === method ? theme.soft : theme.surface,
                    },
                  ]}
                >
                  <Text style={{ color: theme.text, fontSize: 11, fontWeight: "700" }}>{method}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.methodRow}>
              {(["Standard", "Hanafi"] as const).map((asr) => (
                <Pressable
                  key={asr}
                  onPress={() =>
                    void persist({
                      ...hub,
                      prefs: { ...hub.prefs, salah: { ...hub.prefs.salah, asr } },
                    })
                  }
                  style={[
                    styles.modePill,
                    {
                      borderColor: hub.prefs.salah.asr === asr ? theme.accent : theme.border,
                      backgroundColor: hub.prefs.salah.asr === asr ? theme.soft : theme.surface,
                    },
                  ]}
                >
                  <Text style={{ color: theme.text, fontSize: 11, fontWeight: "700" }}>Asr · {asr}</Text>
                </Pressable>
              ))}
            </View>
          </Card>
        ) : null}
      </ScrollView>
    </Page>
  );
}

function PrefRow({
  label,
  value,
  onChange,
  theme,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  theme: { text: string; muted: string };
}) {
  return (
    <View style={styles.prefRow}>
      <Text style={{ color: theme.text, flex: 1 }}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  lead: { fontSize: 13, lineHeight: 18 },
  modeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  methodRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  modePill: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  chip: { fontSize: 11, fontWeight: "800", letterSpacing: 0.4, textTransform: "uppercase" },
  prompt: { fontSize: 20, fontWeight: "600", marginTop: 8, lineHeight: 26 },
  hint: { fontSize: 12, marginTop: 6, lineHeight: 17 },
  meta: { fontSize: 11, marginTop: 8 },
  actions: { gap: 8, marginTop: 14 },
  prefRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  fieldLabel: { fontSize: 11, fontWeight: "700", marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
});
