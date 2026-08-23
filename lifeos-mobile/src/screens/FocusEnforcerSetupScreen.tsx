import Feather from "@expo/vector-icons/Feather";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { ActionButton, Card, Page, Title } from "../components/UI";
import { useLifeOS } from "../lib/LifeOSContext";
import {
  createFocusEnforcerSession,
  loadFocusEnforcerPrefs,
} from "../lib/focusEnforcer";

function roundToNextFiveMinutes(date: Date) {
  const next = new Date(date);
  next.setSeconds(0, 0);
  const m = next.getMinutes();
  const add = m % 5 === 0 ? 5 : 5 - (m % 5);
  next.setMinutes(m + add);
  return next;
}

export function FocusEnforcerSetupScreen() {
  const { user, workspace, theme } = useLifeOS();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const taskId = Number(route.params?.taskId);
  const task = workspace.tasks.find((t) => t.id === taskId);
  const colorScheme = useColorScheme();
  const pickerTheme = colorScheme === "dark" ? "dark" : "light";

  const defaultStart = useMemo(() => roundToNextFiveMinutes(new Date()), []);
  const [startAt, setStartAt] = useState(defaultStart);
  const [durationMin, setDurationMin] = useState(
    String(task?.focusMinutes || workspace.settings.defaultFocusMinutes || 60),
  );
  const [proofRequired, setProofRequired] = useState(true);
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!task) {
    return (
      <Page>
        <View style={styles.screen}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.back}>
            <Feather name="chevron-left" size={22} color={theme.accent} />
            <Text style={{ color: theme.accent, fontWeight: "700" }}>Back</Text>
          </Pressable>
          <Title>Task missing</Title>
          <Text style={{ color: theme.muted }}>This task is no longer available.</Text>
        </View>
      </Page>
    );
  }

  const create = async () => {
    if (!user?.uid || busy) return;
    const duration = Math.max(5, Math.min(240, Number(durationMin.replace(/\D/g, "")) || 60));
    if (startAt.getTime() < Date.now() - 60_000) {
      Alert.alert("Focus Enforcer", "Pick a start time that is still ahead.");
      return;
    }
    setBusy(true);
    try {
      const prefs = await loadFocusEnforcerPrefs(user.uid);
      const session = await createFocusEnforcerSession(
        user.uid,
        {
          taskId: task.id,
          taskTitle: task.title,
          scheduledStartAt: startAt,
          expectedDurationMin: duration,
          proofRequired,
        },
        prefs,
        workspace.settings.preferredName,
      );
      navigation.replace("FocusEnforcerSession", { sessionId: session.id });
    } catch (error) {
      Alert.alert(
        "Focus Enforcer",
        error instanceof Error ? error.message : "Could not create the session.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <ScrollView contentContainerStyle={styles.screen}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.back}>
          <Feather name="chevron-left" size={22} color={theme.accent} />
          <Text style={{ color: theme.accent, fontWeight: "700" }}>Back</Text>
        </Pressable>
        <Title>Enforce focus</Title>
        <Text style={{ color: theme.muted, fontSize: 14, lineHeight: 20 }}>
          Schedule a start, escalate if you delay, and optionally prove you&apos;re on task with a live photo.
        </Text>

        <Card>
          <Text style={[styles.label, { color: theme.text }]}>Task</Text>
          <Text style={{ color: theme.text, fontSize: 17, fontWeight: "800" }}>{task.title}</Text>
        </Card>

        <Card>
          <Text style={[styles.label, { color: theme.text }]}>Scheduled start</Text>
          {Platform.OS === "ios" ? (
            <View style={styles.pickerRow}>
              <DateTimePicker
                value={startAt}
                mode="datetime"
                display="compact"
                minuteInterval={5}
                themeVariant={pickerTheme}
                onChange={(_, date) => {
                  if (date) setStartAt(date);
                }}
              />
            </View>
          ) : (
            <>
              <Pressable
                onPress={() => setShowAndroidPicker(true)}
                style={[styles.pickerButton, { borderColor: theme.border }]}
              >
                <Feather name="clock" size={16} color={theme.accent} />
                <Text style={{ color: theme.text, fontWeight: "600" }}>{startAt.toLocaleString()}</Text>
              </Pressable>
              {showAndroidPicker ? (
                <DateTimePicker
                  value={startAt}
                  mode="datetime"
                  display="default"
                  onChange={(event, date) => {
                    setShowAndroidPicker(false);
                    if (event.type !== "dismissed" && date) setStartAt(date);
                  }}
                />
              ) : null}
            </>
          )}
        </Card>

        <Card>
          <Text style={[styles.label, { color: theme.text }]}>Duration (minutes)</Text>
          <TextInput
            value={durationMin}
            onChangeText={(v) => setDurationMin(v.replace(/[^\d]/g, "") || "")}
            keyboardType="number-pad"
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            placeholder="60"
            placeholderTextColor={theme.muted}
          />
          <Text style={{ color: theme.muted, fontSize: 12 }}>Default ~60. Clamped 5–240.</Text>
        </Card>

        <Card>
          <View style={styles.row}>
            <View style={styles.grow}>
              <Text style={{ color: theme.text, fontWeight: "800" }}>Proof required</Text>
              <Text style={{ color: theme.muted, fontSize: 12 }}>
                Live camera at start and complete (library uploads never count).
              </Text>
            </View>
            <Switch
              value={proofRequired}
              onValueChange={setProofRequired}
              trackColor={{ true: theme.accent }}
            />
          </View>
        </Card>

        <ActionButton
          label={busy ? "Creating…" : "Create session"}
          icon="zap"
          onPress={() => void create()}
          disabled={busy}
        />
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 20, paddingBottom: 40, gap: 14 },
  back: { flexDirection: "row", alignItems: "center", gap: 2, alignSelf: "flex-start" },
  label: { fontSize: 14, fontWeight: "800", marginBottom: 4 },
  pickerRow: { alignItems: "flex-start" },
  pickerButton: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 15 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  grow: { flex: 1, gap: 4 },
});
