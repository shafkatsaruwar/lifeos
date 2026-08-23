import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MasterOSShell } from "../../components/masteros/MasterOSShell";
import { useLifeOS } from "../../lib/LifeOSContext";
import { courseProgress, useMasterOS } from "../../lib/masteros/MasterOSContext";
import { formatDate } from "../../lib/masteros/shared";
import type { MasterOSStackParamList } from "../../navigation/MasterOSNavigator";

type Props = NativeStackScreenProps<MasterOSStackParamList, "MasterOSReport">;

export function MasterOSReportScreen({ navigation, route }: Props) {
  const { theme } = useLifeOS();
  const { state } = useMasterOS();
  const student = state.students.find((item) => item.id === route.params.studentId) ?? state.students[0];
  const course = state.courses[0];
  const mastery = student && course ? courseProgress(state, student.id, course.id) : 0;
  const graded = state.assignments
    .filter((item) => item.studentId === student?.id && item.status === "graded")
    .slice(0, 6);

  return (
    <MasterOSShell
      active="students"
      onNavigate={(key) => {
        if (key === "hub") navigation.navigate("MasterOSHub");
      }}
      onClose={() => navigation.goBack()}
      hideChrome
    >
      <View style={[styles.row, { borderColor: theme.border }]}>
        <View style={[styles.side, { borderRightColor: theme.border, backgroundColor: theme.surface }]}>
          <Text style={[styles.eyebrow, { color: theme.muted }]}>STUDENT</Text>
          <Text style={[styles.name, { color: theme.text }]}>{student?.name}</Text>
          <Text style={[styles.meta, { color: theme.muted }]}>Grade {student?.gradeLevel}</Text>
          <View style={styles.masteryBox}>
            <Text style={{ color: theme.text, fontSize: 36, fontWeight: "800" }}>{mastery}%</Text>
            <Text style={{ color: theme.muted, fontSize: 12, fontWeight: "700" }}>course mastery</Text>
          </View>
          <Pressable style={[styles.share, { backgroundColor: theme.text }]}>
            <Text style={{ color: theme.surface, fontWeight: "800", fontSize: 12 }}>Share PDF</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate("MasterOSHub")} style={{ marginTop: 12 }}>
            <Text style={{ color: theme.accent, fontWeight: "800", fontSize: 12 }}>Back to home</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 18 }}>
          <Text style={[styles.eyebrow, { color: theme.muted }]}>PARENT REPORT</Text>
          <Text style={[styles.heading, { color: theme.text }]}>{course?.name}</Text>
          <Text style={[styles.body, { color: theme.muted }]}>
            Progress without teacher notes — what {student?.name} has practiced and scored recently.
          </Text>

          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Recent work</Text>
            {graded.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.gradeRow,
                  index < graded.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontWeight: "800", fontSize: 13 }}>{item.title}</Text>
                  <Text style={{ color: theme.muted, fontSize: 11, marginTop: 3 }}>{formatDate(item.dueDate)}</Text>
                </View>
                <Text style={{ color: theme.accent, fontWeight: "800" }}>
                  {item.score != null ? item.score : "—"}
                  {item.totalPoints ? ` / ${item.totalPoints}` : ""}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </MasterOSShell>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: "row", margin: 8, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  side: { width: 240, borderRightWidth: StyleSheet.hairlineWidth, padding: 18 },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  name: { fontSize: 26, fontWeight: "800", marginTop: 8 },
  meta: { fontSize: 12, marginTop: 4 },
  masteryBox: { marginTop: 28, marginBottom: 18 },
  share: { minHeight: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  heading: { fontSize: 28, fontWeight: "800", marginTop: 8 },
  body: { fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 18 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, overflow: "hidden" },
  cardTitle: { fontSize: 13, fontWeight: "800", padding: 14, paddingBottom: 8 },
  gradeRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
});
