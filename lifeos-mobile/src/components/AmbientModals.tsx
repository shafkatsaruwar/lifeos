import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useLifeOS } from "../lib/LifeOSContext";
import { formatAmbientDuration } from "../lib/helpers";
import type { AmbientActivity } from "../types";

// Mirrors web's AmbientStartModal ("I'm doing something Fn W"). Persists into
// settings.ambientActivity, the exact same shape web reads/writes, so state
// is consistent across clients.
export function AmbientStartModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme, workspace, updateSettings } = useLifeOS();
  const [title, setTitle] = useState("");
  const [spaceName, setSpaceName] = useState<string | null>(null);

  const spaces = [
    ...workspace.projects.map((p) => ({ name: p.name, color: p.color || theme.accent })),
    ...workspace.classes.filter((c) => !c.archived).map((c) => ({ name: c.code, color: c.color || theme.accent })),
  ].slice(0, 6);

  useEffect(() => {
    if (visible) { setTitle(""); setSpaceName(null); }
  }, [visible]);

  const start = (customTitle?: string) => {
    const selected = spaces.find((s) => s.name === spaceName);
    const finalTitle = (customTitle ?? title).trim() || "Unplanned work";
    updateSettings({
      ...workspace.settings,
      ambientActivity: { title: finalTitle, startedAt: new Date().toISOString(), spaceName: selected?.name, spaceColor: selected?.color },
    });
    onClose();
  };

  const quickOptions = ["Job application", "Replying to email", "Research"];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <View style={styles.head}>
              <View style={[styles.dot, { backgroundColor: theme.soft }]}><Feather name="clock" size={16} color={theme.accent} /></View>
              <View style={styles.grow}>
                <Text style={[styles.title, { color: theme.text }]}>What are you doing?</Text>
                <Text style={[styles.subtitle, { color: theme.muted }]}>Start the work first. LifeOS can sort it later.</Text>
              </View>
              <Pressable onPress={onClose}><Feather name="x" size={20} color={theme.muted} /></Pressable>
            </View>
            <Text style={[styles.label, { color: theme.muted }]}>QUICK START</Text>
            <View style={styles.chipRow}>
              {quickOptions.map((opt) => (
                <Pressable key={opt} onPress={() => setTitle(opt)} style={[styles.chip, { borderColor: title === opt ? theme.accent : theme.border, backgroundColor: title === opt ? theme.soft : theme.bg }]}>
                  <Text style={{ color: theme.text, fontSize: 13, fontWeight: "700" }}>{opt}</Text>
                </Pressable>
              ))}
            </View>
            {spaces.length > 0 ? (
              <>
                <Text style={[styles.label, { color: theme.muted }]}>WHERE DOES THIS BELONG? (OPTIONAL)</Text>
                <View style={styles.chipRow}>
                  {spaces.map((space) => (
                    <Pressable key={space.name} onPress={() => setSpaceName((cur) => (cur === space.name ? null : space.name))} style={[styles.chip, { borderColor: spaceName === space.name ? space.color : theme.border, backgroundColor: spaceName === space.name ? `${space.color}20` : theme.bg }]}>
                      <View style={[styles.chipDot, { backgroundColor: space.color }]} />
                      <Text style={{ color: theme.text, fontSize: 13, fontWeight: "700" }}>{space.name}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}
            <Text style={[styles.label, { color: theme.muted }]}>OR TYPE A FEW WORDS</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder="e.g. fixing the login bug" placeholderTextColor={theme.muted} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />
            <View style={styles.row}>
              <Pressable onPress={() => start("")} style={[styles.secondaryButton, { borderColor: theme.border }]}>
                <Text style={{ color: theme.text, fontWeight: "800" }}>Start without naming it</Text>
              </Pressable>
              <Pressable onPress={() => start()} style={[styles.primaryButton, { backgroundColor: theme.text }]}>
                <Text style={{ color: theme.surface, fontWeight: "800" }}>Start doing it</Text>
              </Pressable>
            </View>
            <Text style={[styles.footnote, { color: theme.muted }]}>Nothing becomes a task until you decide it should.</Text>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// Mirrors web's AmbientWrapupModal — decide what happens to the tracked time.
export function AmbientWrapupModal({ visible, activity, onClose }: { visible: boolean; activity: AmbientActivity | null; onClose: () => void }) {
  const { theme, workspace, updateSettings, updateTasks, updateNotebookHub, upsertNotebookPage } = useLifeOS();
  const [note, setNote] = useState("");

  useEffect(() => { if (visible) setNote(""); }, [visible]);

  if (!activity) return null;

  const finish = async (outcome: "task" | "note" | "dismiss") => {
    if (outcome === "task") {
      updateTasks([
        ...workspace.tasks,
        {
          id: Date.now(),
          title: activity.title,
          project: activity.spaceName || "Inbox",
          color: activity.spaceColor || theme.accent,
          due: new Date().toISOString().slice(0, 10),
          priority: "Medium",
          focusMinutes: workspace.settings.defaultFocusMinutes ?? 45,
          energy: workspace.settings.defaultEnergy ?? "Medium",
          status: "Not started",
          notes: note.trim() || "Captured after unplanned work.",
          checklist: [],
          checklistProgress: [],
        },
      ]);
    } else if (outcome === "note") {
      const { createNotebookFromText } = await import("../lib/notebooks");
      const { notebook, page } = createNotebookFromText(
        activity.title,
        note.trim() || "Unplanned work session.",
        { projectName: activity.spaceName },
      );
      await updateNotebookHub({
        ...workspace.notebookHub,
        notebooks: [notebook, ...workspace.notebookHub.notebooks],
      });
      await upsertNotebookPage(page);
    }
    updateSettings({ ...workspace.settings, ambientActivity: null });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <View style={styles.head}>
              <View style={[styles.dot, { backgroundColor: theme.soft }]}><Feather name="check-circle" size={16} color={theme.accent} /></View>
              <View style={styles.grow}>
                <Text style={[styles.title, { color: theme.text }]}>Nice. What should happen with this?</Text>
                <Text style={[styles.subtitle, { color: theme.muted }]}>{activity.title} · {formatAmbientDuration(Date.now() - new Date(activity.startedAt).getTime())}</Text>
              </View>
              <Pressable onPress={onClose}><Feather name="x" size={20} color={theme.muted} /></Pressable>
            </View>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="What did you do, or what's the next step?"
              placeholderTextColor={theme.muted}
              multiline
              style={[styles.input, { color: theme.text, borderColor: theme.border, minHeight: 80 }]}
            />
            <View style={{ gap: 8 }}>
              <OutcomeRow icon="list" title="Save as task" subtitle="Put it in Inbox" onPress={() => finish("task")} theme={theme} />
              <OutcomeRow icon="edit-3" title="Save as note" subtitle="Keep the context" onPress={() => finish("note")} theme={theme} />
              <OutcomeRow icon="x" title="Let it go" subtitle="Don't save anything" onPress={() => finish("dismiss")} theme={theme} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function OutcomeRow({ icon, title, subtitle, onPress, theme }: { icon: keyof typeof Feather.glyphMap; title: string; subtitle: string; onPress: () => void; theme: any }) {
  return (
    <Pressable onPress={onPress} style={[outcomeStyles.row, { borderColor: theme.border, backgroundColor: theme.bg }]}>
      <Feather name={icon} size={18} color={theme.accent} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.text, fontWeight: "800", fontSize: 14 }}>{title}</Text>
        <Text style={{ color: theme.muted, fontSize: 12 }}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

const outcomeStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 12, padding: 14 },
});

// Mirrors web's BreakModal ("I need a break Fn R").
export function BreakModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme } = useLifeOS();
  const [minutes, setMinutes] = useState(5);
  const [remaining, setRemaining] = useState(5 * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (visible) { setMinutes(5); setRemaining(5 * 60); setRunning(false); }
  }, [visible]);

  useEffect(() => {
    if (!running || remaining <= 0) return;
    const id = setInterval(() => setRemaining((v) => v - 1), 1000);
    return () => clearInterval(id);
  }, [running, remaining]);

  useEffect(() => {
    if (running || remaining > 0 || !visible) return;
    onClose();
  }, [remaining, running, visible]);

  const setBreakLength = (value: number) => {
    const next = Math.min(20, Math.max(1, value));
    setMinutes(next);
    setRemaining(next * 60);
    setRunning(false);
  };

  const time = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={styles.head}>
            <View style={[styles.dot, { backgroundColor: theme.soft }]}><Feather name="coffee" size={16} color={theme.accent} /></View>
            <View style={styles.grow}>
              <Text style={[styles.title, { color: theme.text }]}>I need a break rn</Text>
              <Text style={[styles.subtitle, { color: theme.muted }]}>Pick 1–20 minutes. No guilt, just a reset.</Text>
            </View>
            <Pressable onPress={onClose}><Feather name="x" size={20} color={theme.muted} /></Pressable>
          </View>
          <View style={styles.breakTimer}>
            <Text style={[styles.breakTime, { color: theme.text }]}>{time}</Text>
            <Text style={{ color: theme.muted, fontSize: 13 }}>{running ? "Break in progress" : "Ready when you are"}</Text>
          </View>
          <View style={styles.chipRow}>
            {[1, 3, 5, 10, 15, 20].map((value) => (
              <Pressable key={value} onPress={() => setBreakLength(value)} style={[styles.chip, { borderColor: minutes === value ? theme.accent : theme.border, backgroundColor: minutes === value ? theme.soft : theme.bg }]}>
                <Text style={{ color: theme.text, fontWeight: "700", fontSize: 13 }}>{value}m</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.row}>
            <Pressable onPress={() => setBreakLength(minutes)} style={[styles.secondaryButton, { borderColor: theme.border }]}>
              <Text style={{ color: theme.text, fontWeight: "800" }}>Reset</Text>
            </Pressable>
            <Pressable onPress={() => setRunning((v) => !v)} style={[styles.primaryButton, { backgroundColor: theme.accent }]}>
              <Text style={{ color: "#FFF", fontWeight: "800" }}>{running ? "Pause break" : "Start break"}</Text>
            </Pressable>
            <Pressable onPress={onClose} style={[styles.secondaryButton, { borderColor: theme.border }]}>
              <Text style={{ color: theme.text, fontWeight: "800" }}>End now</Text>
            </Pressable>
          </View>
          <Text style={[styles.footnote, { color: theme.muted }]}>Suggested: stand up, water, meds if due, bathroom, stretch, then return gently.</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  card: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12 },
  head: { flexDirection: "row", alignItems: "center", gap: 12 },
  dot: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  grow: { flex: 1 },
  title: { fontSize: 17, fontWeight: "800" },
  subtitle: { fontSize: 13, marginTop: 2 },
  label: { fontSize: 11, fontWeight: "800", letterSpacing: 0.6, marginTop: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  row: { flexDirection: "row", gap: 10 },
  primaryButton: { flex: 1, minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  secondaryButton: { flex: 1, minHeight: 48, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  footnote: { fontSize: 12, textAlign: "center", lineHeight: 17 },
  breakTimer: { alignItems: "center", paddingVertical: 8, gap: 4 },
  breakTime: { fontSize: 44, fontWeight: "800", fontVariant: ["tabular-nums"] },
});
