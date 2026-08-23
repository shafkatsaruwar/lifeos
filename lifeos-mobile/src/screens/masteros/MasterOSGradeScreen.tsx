import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MasterOSShell } from "../../components/masteros/MasterOSShell";
import { useLifeOS } from "../../lib/LifeOSContext";
import { useMasterOS } from "../../lib/masteros/MasterOSContext";
import { MISTAKE_LABEL } from "../../lib/masteros/shared";
import type { MasterOSStackParamList } from "../../navigation/MasterOSNavigator";

type Props = NativeStackScreenProps<MasterOSStackParamList, "MasterOSGrade">;

export function MasterOSGradeScreen({ navigation, route }: Props) {
  const { theme } = useLifeOS();
  const { state } = useMasterOS();
  const assignment = state.assignments.find((item) => item.id === route.params.assignmentId);
  const student = state.students.find((item) => item.id === assignment?.studentId);
  const links = useMemo(
    () =>
      state.assignmentQuestions
        .filter((item) => item.assignmentId === assignment?.id)
        .sort((a, b) => a.order - b.order),
    [assignment?.id, state.assignmentQuestions],
  );
  const [activeId, setActiveId] = useState(links[0]?.questionId);
  const question = state.questions.find((item) => item.id === activeId);
  const result = state.questionResults.find(
    (item) => item.questionId === activeId && item.assignmentId === assignment?.id,
  );

  if (!assignment) {
    return (
      <MasterOSShell active="assignments" onNavigate={() => undefined} onClose={() => navigation.goBack()}>
        <View style={styles.center}>
          <Text style={{ color: theme.muted }}>Assignment not found.</Text>
        </View>
      </MasterOSShell>
    );
  }

  return (
    <MasterOSShell active="assignments" onNavigate={() => undefined} onClose={() => navigation.goBack()}>
      <View style={styles.split}>
        <ScrollView style={[styles.left, { borderRightColor: theme.border }]} contentContainerStyle={{ padding: 12 }}>
          <Text style={[styles.eyebrow, { color: theme.muted }]}>GRADE</Text>
          <Text style={[styles.title, { color: theme.text }]}>{assignment.title}</Text>
          <Text style={[styles.meta, { color: theme.muted }]}>
            {student?.name} · {assignment.type} · {assignment.status.replace("_", " ")}
          </Text>
          {links.map((link, index) => {
            const item = state.questions.find((row) => row.id === link.questionId);
            const on = link.questionId === activeId;
            return (
              <Pressable
                key={link.questionId}
                onPress={() => setActiveId(link.questionId)}
                style={[styles.qRow, { borderColor: theme.border }, on && { backgroundColor: theme.soft }]}
              >
                <Text style={{ color: on ? theme.accent : theme.text, fontWeight: "800", fontSize: 12 }}>
                  Q{index + 1}
                </Text>
                <Text style={{ color: theme.muted, fontSize: 12, flex: 1 }} numberOfLines={2}>
                  {item?.text ?? "Question"}
                </Text>
              </Pressable>
            );
          })}
          <Pressable style={[styles.addBank, { borderColor: theme.border }]}>
            <Text style={{ color: theme.accent, fontWeight: "800", fontSize: 12 }}>Add from bank</Text>
          </Pressable>
        </ScrollView>

        <ScrollView style={styles.right} contentContainerStyle={{ padding: 18 }}>
          <Text style={[styles.eyebrow, { color: theme.muted }]}>ACTIVE ITEM</Text>
          <Text style={[styles.prompt, { color: theme.text }]}>{question?.text ?? "Pick a question"}</Text>
          {question?.answer ? (
            <Text style={[styles.meta, { color: theme.muted, marginTop: 8 }]}>Answer: {question.answer}</Text>
          ) : null}
          <View style={styles.actions}>
            <Pressable style={[styles.mark, { backgroundColor: theme.success }]}>
              <Text style={styles.markText}>Correct</Text>
            </Pressable>
            <Pressable style={[styles.mark, { backgroundColor: theme.danger }]}>
              <Text style={styles.markText}>Missed</Text>
            </Pressable>
          </View>
          <Text style={[styles.eyebrow, { color: theme.muted, marginTop: 18 }]}>MISTAKE TAG</Text>
          <View style={styles.tags}>
            {Object.entries(MISTAKE_LABEL).slice(0, 6).map(([key, label]) => (
              <View key={key} style={[styles.tag, { borderColor: theme.border, backgroundColor: theme.surface }]}>
                <Text style={{ color: theme.muted, fontSize: 11, fontWeight: "700" }}>{label}</Text>
              </View>
            ))}
          </View>
          {result ? (
            <Text style={[styles.meta, { color: theme.muted, marginTop: 16 }]}>
              Saved result · {result.correct ? "correct" : "missed"}
              {result.mistakeType ? ` · ${MISTAKE_LABEL[result.mistakeType] ?? result.mistakeType}` : ""}
            </Text>
          ) : (
            <Text style={[styles.meta, { color: theme.muted, marginTop: 16 }]}>
              Mark correct/missed to update mastery (demo view — wire marks next).
            </Text>
          )}
        </ScrollView>
      </View>
    </MasterOSShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  split: { flex: 1, flexDirection: "row" },
  left: { width: 280, borderRightWidth: StyleSheet.hairlineWidth },
  right: { flex: 1 },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  title: { fontSize: 20, fontWeight: "800", marginTop: 6 },
  meta: { fontSize: 12, marginTop: 4 },
  qRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    padding: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
  },
  addBank: {
    marginTop: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  prompt: { fontSize: 22, fontWeight: "700", marginTop: 10, lineHeight: 30 },
  actions: { flexDirection: "row", gap: 10, marginTop: 18 },
  mark: { flex: 1, minHeight: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  markText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  tag: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
});
