import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MasterOSShell } from "../../components/masteros/MasterOSShell";
import { useLifeOS } from "../../lib/LifeOSContext";
import { attentionSkills, courseProgress, useMasterOS } from "../../lib/masteros/MasterOSContext";
import { formatDate } from "../../lib/masteros/shared";
import { masteryLabel, masteryTone } from "../../lib/masteros/ui";
import type { MasterOSStackParamList } from "../../navigation/MasterOSNavigator";

type Props = NativeStackScreenProps<MasterOSStackParamList, "MasterOSHub">;

export function MasterOSHubScreen({ navigation }: Props) {
  const { theme } = useLifeOS();
  const { state } = useMasterOS();
  const student = state.students[0];
  const course = state.courses[0];
  const todayLesson =
    state.lessons.find((item) => item.status === "ready" || item.status === "in_progress") ??
    state.lessons.find((item) => item.status === "planned");
  const unit = state.units.find((item) => item.id === todayLesson?.unitId);
  const ungraded = state.assignments.find((item) => item.status !== "graded" && item.studentId === student?.id);
  const weak = student ? attentionSkills(state, student.id).slice(0, 3) : [];
  const mastery = student && course ? courseProgress(state, student.id, course.id) : 0;
  const recent = state.assignments
    .filter((item) => item.status === "graded" && item.studentId === student?.id)
    .slice(0, 3);

  const close = () => {
    const parent = navigation.getParent();
    if (parent?.canGoBack()) parent.goBack();
    else navigation.goBack();
  };
  const onNavigate = (key: string) => {
    if (key === "hub") return;
    if (key === "students" && student) {
      navigation.navigate("MasterOSReport", { studentId: student.id });
      return;
    }
    if (key === "lessons" && todayLesson) {
      navigation.navigate("MasterOSTeach", { lessonId: todayLesson.id });
      return;
    }
    if (key === "assignments" && ungraded) {
      navigation.navigate("MasterOSGrade", { assignmentId: ungraded.id });
    }
  };

  return (
    <MasterOSShell active="hub" onNavigate={onNavigate} onClose={close}>
      <ScrollView contentContainerStyle={styles.pad}>
        <View style={styles.top}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.eyebrow, { color: theme.muted }]}>TEACHING</Text>
            <Text style={[styles.title, { color: theme.text }]}>Good afternoon</Text>
            <Text style={[styles.meta, { color: theme.muted }]}>
              {student?.name} · {course?.name} · {todayLesson ? "1 lesson ready" : "No lesson"} ·{" "}
              {ungraded ? "1 to grade" : "caught up"}
            </Text>
          </View>
          <View style={styles.chips}>
            <Chip label="New lesson" theme={theme} />
            <Chip
              label="Whiteboard"
              theme={theme}
              onPress={() => todayLesson && navigation.navigate("MasterOSWhiteboard", { lessonId: todayLesson.id })}
            />
            <Chip
              label="Report card"
              theme={theme}
              onPress={() => student && navigation.navigate("MasterOSReport", { studentId: student.id })}
            />
          </View>
        </View>

        <View style={styles.split}>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.cardHead, { borderBottomColor: theme.border }]}>
              <Text style={[styles.eyebrow, { color: theme.muted }]}>TODAY</Text>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{todayLesson?.title ?? "No lesson yet"}</Text>
              <Text style={[styles.meta, { color: theme.muted }]}>
                {student?.name} · {unit ? `Unit ${unit.order} · ${unit.title}` : course?.name} ·{" "}
                {todayLesson?.status?.replace("_", " ") ?? "—"}
              </Text>
            </View>
            {todayLesson ? (
              <Row
                title="Start lesson"
                meta="Teaching Mode"
                trailing="Start"
                accent
                theme={theme}
                onPress={() => navigation.navigate("MasterOSTeach", { lessonId: todayLesson.id })}
              />
            ) : null}
            {ungraded ? (
              <Row
                title={ungraded.title}
                meta={`Ungraded · due ${formatDate(ungraded.dueDate)}`}
                trailing="Grade"
                theme={theme}
                last
                onPress={() => navigation.navigate("MasterOSGrade", { assignmentId: ungraded.id })}
              />
            ) : null}
          </View>

          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.cardHead, { borderBottomColor: theme.border }]}>
              <Text style={[styles.eyebrow, { color: theme.muted }]}>NEEDS ATTENTION</Text>
            </View>
            {weak.map((row, index) => {
              const skill = state.skills.find((item) => item.id === row.skillId);
              return (
                <Row
                  key={row.skillId}
                  title={skill?.name ?? row.skillId}
                  meta={`${row.accuracy}% · ${row.attempts} attempts`}
                  trailing={masteryLabel(row.masteryState)}
                  theme={theme}
                  last={index === weak.length - 1}
                  compact
                  trailingColor={masteryTone(theme, row.masteryState)}
                />
              );
            })}
            <View style={styles.barWrap}>
              <View style={styles.barLabel}>
                <Text style={{ color: theme.muted, fontSize: 11, fontWeight: "700" }}>
                  {student?.name} · {course?.name}
                </Text>
                <Text style={{ color: theme.muted, fontSize: 11, fontWeight: "800" }}>{mastery}% mastery</Text>
              </View>
              <View style={[styles.barTrack, { backgroundColor: theme.border }]}>
                <View style={[styles.barFill, { width: `${mastery}%`, backgroundColor: theme.accent }]} />
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, marginTop: 12 }]}>
          <View style={[styles.cardHead, { borderBottomColor: theme.border }]}>
            <Text style={[styles.eyebrow, { color: theme.muted }]}>RECENT GRADES</Text>
          </View>
          <View style={styles.grades}>
            {recent.map((item) => (
              <View key={item.id} style={{ flex: 1 }}>
                <Row
                  title={item.title}
                  meta={formatDate(item.dueDate)}
                  trailing={item.score != null ? String(item.score) : "—"}
                  theme={theme}
                  compact
                  last
                />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </MasterOSShell>
  );
}

function Chip({
  label,
  theme,
  onPress,
}: {
  label: string;
  theme: { text: string; border: string; surface: string };
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.border,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: theme.surface,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: "700", color: theme.text }}>{label}</Text>
    </Pressable>
  );
}

function Row({
  title,
  meta,
  trailing,
  accent,
  last,
  compact,
  theme,
  onPress,
  trailingColor,
}: {
  title: string;
  meta: string;
  trailing?: string;
  accent?: boolean;
  last?: boolean;
  compact?: boolean;
  theme: { text: string; muted: string; border: string; accent: string };
  onPress?: () => void;
  trailingColor?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: compact ? 12 : 14,
        paddingVertical: compact ? 10 : 12,
        borderTopWidth: last ? 0 : StyleSheet.hairlineWidth,
        borderTopColor: theme.border,
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: compact ? 13 : 14, fontWeight: "800", color: theme.text }} numberOfLines={1}>
          {title}
        </Text>
        <Text style={{ fontSize: 11, color: theme.muted, marginTop: 3 }} numberOfLines={1}>
          {meta}
        </Text>
      </View>
      {trailing ? (
        <Text style={{ fontSize: 11, fontWeight: "800", color: trailingColor ?? (accent ? theme.accent : theme.muted) }}>
          {trailing}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 40 },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: 16, marginBottom: 14 },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  title: { fontSize: 28, fontWeight: "800", marginTop: 4 },
  meta: { fontSize: 12, marginTop: 4 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  split: { flexDirection: "row", gap: 12 },
  card: { flex: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, overflow: "hidden" },
  cardHead: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  cardTitle: { fontSize: 17, fontWeight: "800", marginTop: 5 },
  barWrap: { padding: 14 },
  barLabel: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  barTrack: { height: 8, borderRadius: 99, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 99 },
  grades: { flexDirection: "row" },
});

