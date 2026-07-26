import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLifeOS } from "../lib/LifeOSContext";
import { parseTaskFromText, type AiParsedTask } from "../lib/api";
import { formatDueDate } from "../lib/helpers";

// Mirrors web's NLTaskCreationModal ("AI task Fn A" / Sparkles icon), which
// calls POST https://lifeos-mu-three.vercel.app/api/ai with
// { action: "parse-task", input, spaces }. See lib/useNLTaskCreation.ts.
export function AiTaskModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme, workspace, updateTasks } = useLifeOS();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiParsedTask | null>(null);

  const spaces = [...workspace.projects.map((p) => p.name), ...workspace.classes.map((c) => c.code)];

  const reset = () => {
    setInput("");
    setResult(null);
    setError(null);
    setLoading(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleParse = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const task = await parseTaskFromText(input.trim(), spaces);
      setResult(task);
    } catch (err: any) {
      setError(err?.message || "Failed to parse task");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    if (!result) return;
    const isKnownProject = workspace.projects.some((p) => p.name === result.space);
    updateTasks([
      ...workspace.tasks,
      {
        id: Date.now(),
        title: result.title,
        project: result.space || "Inbox",
        color: isKnownProject ? workspace.projects.find((p) => p.name === result.space)?.color : theme.accent,
        due: result.due,
        priority: result.priority,
        focusMinutes: result.focusMinutes,
        energy: result.energy,
        status: "Not started",
        notes: result.notes,
        checklist: [],
        checklistProgress: [],
      },
    ]);
    close();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.avoidWrap}>
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <View style={styles.head}>
              <View style={[styles.dot, { backgroundColor: theme.soft }]}>
                <Feather name="zap" size={16} color={theme.accent} />
              </View>
              <View style={styles.grow}>
                <Text style={[styles.title, { color: theme.text }]}>AI task</Text>
                <Text style={[styles.subtitle, { color: theme.muted }]}>{result ? "Review and confirm" : "Turn a brain dump into a task"}</Text>
              </View>
              <Pressable onPress={close}><Feather name="x" size={20} color={theme.muted} /></Pressable>
            </View>

            {!result ? (
              <>
                <TextInput
                  autoFocus
                  multiline
                  value={input}
                  onChangeText={setInput}
                  placeholder={'e.g. "Schedule time tomorrow at 2pm to work on the roadmap for 90 minutes"'}
                  placeholderTextColor={theme.muted}
                  style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
                />
                {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
                <View style={styles.row}>
                  <Pressable onPress={close} style={[styles.secondaryButton, { borderColor: theme.border }]}>
                    <Text style={{ color: theme.text, fontWeight: "800" }}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    disabled={!input.trim() || loading}
                    onPress={handleParse}
                    style={[styles.primaryButton, { backgroundColor: theme.text, opacity: !input.trim() || loading ? 0.5 : 1 }]}
                  >
                    {loading ? <ActivityIndicator color={theme.surface} /> : <Text style={{ color: theme.surface, fontWeight: "800" }}>Turn into a task</Text>}
                  </Pressable>
                </View>
              </>
            ) : (
              <ScrollView style={{ maxHeight: 380 }}>
                <Field label="Title" value={result.title} onChange={(v) => setResult({ ...result, title: v })} theme={theme} />
                <Field label="Space" value={result.space} onChange={(v) => setResult({ ...result, space: v })} theme={theme} />
                <View style={styles.inlineRow}>
                  <Text style={[styles.metaChip, { color: theme.text, backgroundColor: theme.soft }]}>Due {formatDueDate(result.due)}</Text>
                  <Text style={[styles.metaChip, { color: theme.text, backgroundColor: theme.soft }]}>{result.priority} priority</Text>
                  <Text style={[styles.metaChip, { color: theme.text, backgroundColor: theme.soft }]}>{result.focusMinutes}m · {result.energy}</Text>
                </View>
                {result.notes ? <Text style={[styles.notes, { color: theme.muted }]}>{result.notes}</Text> : null}
                <View style={styles.row}>
                  <Pressable onPress={() => setResult(null)} style={[styles.secondaryButton, { borderColor: theme.border }]}>
                    <Text style={{ color: theme.text, fontWeight: "800" }}>Back</Text>
                  </Pressable>
                  <Pressable onPress={handleCreate} style={[styles.primaryButton, { backgroundColor: theme.text }]}>
                    <Text style={{ color: theme.surface, fontWeight: "800" }}>Create task</Text>
                  </Pressable>
                </View>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function Field({ label, value, onChange, theme }: { label: string; value: string; onChange: (v: string) => void; theme: any }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 12, fontWeight: "700", color: theme.muted, marginBottom: 6 }}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} style={[styles.fieldInput, { color: theme.text, borderColor: theme.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  avoidWrap: { width: "100%" },
  card: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 14, maxHeight: "88%" },
  head: { flexDirection: "row", alignItems: "center", gap: 12 },
  dot: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  grow: { flex: 1 },
  title: { fontSize: 17, fontWeight: "800" },
  subtitle: { fontSize: 13, marginTop: 2 },
  input: { minHeight: 110, borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 16, textAlignVertical: "top" },
  error: { fontSize: 13 },
  row: { flexDirection: "row", gap: 10, marginTop: 4 },
  primaryButton: { flex: 1, minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  secondaryButton: { flex: 1, minHeight: 48, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  fieldInput: { minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 15 },
  inlineRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  metaChip: { fontSize: 12, fontWeight: "700", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, overflow: "hidden" },
  notes: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
});
