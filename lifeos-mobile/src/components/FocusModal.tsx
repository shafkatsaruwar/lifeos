import Feather from "@expo/vector-icons/Feather";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLifeOS } from "../lib/LifeOSContext";
import { durationText, taskRemaining } from "../lib/helpers";
import type { Task } from "../types";

// Checklist templates ported from web's focusChecklistTemplates.
const CHECKLIST_TEMPLATES: { name: string; items: string[] }[] = [
  { name: "Default", items: ["Choose the next visible step", "Make one meaningful pass", "Leave a clear handoff note"] },
  { name: "Admin", items: ["Open the right portal or email", "Find the exact required info", "Send / save / confirm it is done"] },
  { name: "Writing", items: ["Write the messy first pass", "Tighten the strongest points", "Leave one clear next edit note"] },
  { name: "Deep work", items: ["Define the tiny outcome", "Block distractions", "Make one meaningful pass"] },
  { name: "Errands", items: ["Check what is needed", "Do the physical / outside step", "Confirm and reset your space"] },
  { name: "Study", items: ["Pick the exact section", "Active recall before notes", "Write the confusing question"] },
];

export function FocusModal({ visible, task, onClose }: { visible: boolean; task: Task; onClose: () => void }) {
  const { workspace, theme, updateTasks } = useLifeOS();
  const [remaining, setRemaining] = useState(taskRemaining(task));
  const [running, setRunning] = useState(Boolean(task.focusSessionRunning));
  const [checklist, setChecklist] = useState<string[]>(task.checklist ?? []);
  const [checks, setChecks] = useState<boolean[]>(task.checklistProgress ?? []);

  useEffect(() => {
    setRemaining(taskRemaining(task));
    setRunning(Boolean(task.focusSessionRunning));
    setChecklist(task.checklist ?? []);
    setChecks(task.checklistProgress ?? []);
  }, [task.id, visible]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (remaining === 0 && running) setRunning(false);
  }, [remaining, running]);

  const persist = (patch: Partial<Task>) =>
    updateTasks(workspace.tasks.map((item) => (item.id === task.id ? { ...item, ...patch, focusUpdatedAt: new Date().toISOString() } : item)));

  const toggle = () => {
    const next = !running;
    setRunning(next);
    persist({ focusRemainingSeconds: remaining, focusSessionRunning: next, focusSessionStarted: true });
  };

  const finish = () => {
    persist({ done: true, status: "Done", focusSessionRunning: false, focusRemainingSeconds: remaining, checklist, checklistProgress: checks });
    onClose();
  };

  const applyTemplate = (name: string) => {
    const template = CHECKLIST_TEMPLATES.find((t) => t.name === name);
    if (!template) return;
    setChecklist(template.items);
    const nextChecks = template.items.map(() => false);
    setChecks(nextChecks);
    persist({ checklist: template.items, checklistProgress: nextChecks });
  };

  const toggleCheck = (index: number) => {
    const next = checks.map((c, i) => (i === index ? !c : c));
    setChecks(next);
    persist({ checklistProgress: next });
  };

  const updateItem = (index: number, value: string) => {
    const next = checklist.map((item, i) => (i === index ? value : item));
    setChecklist(next);
    persist({ checklist: next });
  };

  const addItem = () => {
    const next = [...checklist, ""];
    setChecklist(next);
    persist({ checklist: next });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.focusPage}>
        <StatusBar style="light" />
        <View style={styles.focusHeader}>
          <Pressable onPress={onClose} style={styles.closeButton}><Feather name="chevron-down" color="#FFF" size={24} /></Pressable>
          <Text style={styles.focusHeaderText}>Focus in progress</Text>
          <View style={{ width: 44 }} />
        </View>
        <ScrollView contentContainerStyle={styles.focusBody}>
          <Text style={styles.focusSpace}>{task.project || "Personal"}</Text>
          <Text style={styles.focusTitle}>{task.title}</Text>
          <Text style={styles.focusSub}>Stay with this one thing. You can leave this screen without pausing the timer.</Text>
          <View style={[styles.timerRing, { borderColor: theme.accent }]}>
            <Text style={styles.timer}>{durationText(remaining)}</Text>
            <Text style={styles.timerSub}>{running ? "In progress" : "Paused"}</Text>
          </View>
          <Pressable onPress={toggle} style={[styles.focusMainButton, { backgroundColor: theme.accent }]}>
            <Feather name={running ? "pause" : "play"} size={20} color="#FFF" />
            <Text style={styles.focusMainText}>{running ? "Pause & save" : "Resume focus"}</Text>
          </Pressable>
          <Pressable onPress={finish} style={styles.focusDoneButton}>
            <Feather name="check" size={18} color="#78E0AF" />
            <Text style={styles.focusDoneText}>Mark task as done</Text>
          </Pressable>

          <View style={styles.checklistSection}>
            <View style={styles.checklistHead}>
              <Text style={styles.checklistTitle}>Checklist</Text>
            </View>
            {!checklist.length ? (
              <View style={styles.templateRow}>
                {CHECKLIST_TEMPLATES.map((t) => (
                  <Pressable key={t.name} onPress={() => applyTemplate(t.name)} style={styles.templateChip}>
                    <Text style={styles.templateChipText}>{t.name}</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <>
                {checklist.map((item, index) => (
                  <Pressable key={index} onPress={() => toggleCheck(index)} style={styles.checkRow}>
                    <View style={[styles.checkBox, checks[index] && { backgroundColor: theme.accent, borderColor: theme.accent }]}>
                      {checks[index] ? <Feather name="check" size={12} color="#FFF" /> : null}
                    </View>
                    <TextInput
                      value={item}
                      onChangeText={(value) => updateItem(index, value)}
                      style={[styles.checkInput, checks[index] && styles.checkInputDone]}
                      placeholder="Step"
                      placeholderTextColor="#77748A"
                    />
                  </Pressable>
                ))}
                <Pressable onPress={addItem} style={styles.addStepButton}>
                  <Feather name="plus" size={14} color="#A79DFF" />
                  <Text style={styles.addStepText}>Add step</Text>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  focusPage: { flex: 1, backgroundColor: "#111115" },
  focusHeader: { height: 64, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#303039" },
  closeButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  focusHeaderText: { color: "#CBC7D4", fontSize: 14, fontWeight: "800" },
  focusBody: { flexGrow: 1, padding: 28, alignItems: "center", gap: 18 },
  focusSpace: { color: "#A79DFF", fontSize: 13, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1.2 },
  focusTitle: { color: "#FFF", fontSize: 30, fontWeight: "700", lineHeight: 38, textAlign: "center" },
  focusSub: { color: "#AAA6B3", fontSize: 15, textAlign: "center", lineHeight: 22 },
  timerRing: { width: 220, height: 220, borderRadius: 110, borderWidth: 7, alignItems: "center", justifyContent: "center", marginVertical: 8 },
  timer: { color: "#FFF", fontSize: 52, fontWeight: "800", fontVariant: ["tabular-nums"] },
  timerSub: { color: "#AAA6B3", marginTop: 8 },
  focusMainButton: { minHeight: 58, borderRadius: 16, alignSelf: "stretch", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10 },
  focusMainText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  focusDoneButton: { minHeight: 48, alignSelf: "stretch", borderRadius: 14, borderWidth: 1, borderColor: "#255A47", flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  focusDoneText: { color: "#78E0AF", fontWeight: "800" },
  checklistSection: { alignSelf: "stretch", marginTop: 10, gap: 10 },
  checklistHead: { flexDirection: "row", justifyContent: "space-between" },
  checklistTitle: { color: "#CBC7D4", fontWeight: "800", fontSize: 14 },
  templateRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  templateChip: { borderWidth: 1, borderColor: "#33313D", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  templateChipText: { color: "#CBC7D4", fontSize: 12, fontWeight: "700" },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkBox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: "#4A4757", alignItems: "center", justifyContent: "center" },
  checkInput: { flex: 1, color: "#EDEBF2", fontSize: 14, paddingVertical: 6 },
  checkInputDone: { textDecorationLine: "line-through", color: "#77748A" },
  addStepButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6 },
  addStepText: { color: "#A79DFF", fontWeight: "700", fontSize: 13 },
});
