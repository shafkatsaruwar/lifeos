import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { MasterOSShell } from "../../components/masteros/MasterOSShell";
import { useLifeOS } from "../../lib/LifeOSContext";
import { useMasterOS } from "../../lib/masteros/MasterOSContext";
import { SECTION_LABEL } from "../../lib/masteros/shared";
import { mos } from "../../lib/masteros/ui";
import type { MasterOSStackParamList } from "../../navigation/MasterOSNavigator";

type Props = NativeStackScreenProps<MasterOSStackParamList, "MasterOSTeach">;

export function MasterOSTeachScreen({ navigation, route }: Props) {
  const { theme } = useLifeOS();
  const { state, addNote, updateLesson } = useMasterOS();
  const lesson = state.lessons.find((item) => item.id === route.params.lessonId);
  const student = state.students.find((item) => item.id === lesson?.studentId);
  const sections = useMemo(
    () =>
      state.lessonSections
        .filter((item) => item.lessonId === lesson?.id)
        .sort((a, b) => a.order - b.order),
    [lesson?.id, state.lessonSections],
  );
  const [index, setIndex] = useState(0);
  const [note, setNote] = useState("");
  const [seconds, setSeconds] = useState((lesson?.duration ?? 60) * 60);

  useEffect(() => {
    if (lesson && lesson.status !== "in_progress") {
      updateLesson(lesson.id, { status: "in_progress" });
    }
  }, [lesson, updateLesson]);

  useEffect(() => {
    const id = setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  if (!lesson) {
    return (
      <MasterOSShell active="lessons" onNavigate={() => undefined} onClose={() => navigation.goBack()} hideChrome>
        <View style={styles.center}>
          <Text style={{ color: theme.muted }}>Lesson not found.</Text>
        </View>
      </MasterOSShell>
    );
  }

  const section = sections[index] ?? sections[0];
  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <MasterOSShell active="lessons" onNavigate={() => undefined} onClose={() => navigation.goBack()} hideChrome>
      <View style={[styles.row, { borderColor: theme.border }]}>
        <View style={[styles.rail, { borderRightColor: theme.border, backgroundColor: theme.surface }]}>
          {sections.map((item, itemIndex) => {
            const on = itemIndex === index;
            return (
              <Pressable
                key={item.id}
                onPress={() => setIndex(itemIndex)}
                style={[styles.railItem, on && { backgroundColor: theme.soft }]}
              >
                <Text style={{ color: on ? theme.accent : theme.muted, fontWeight: on ? "800" : "600", fontSize: 11 }}>
                  {SECTION_LABEL[item.type] ?? item.title}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.stage}>
          <Text style={[styles.eyebrow, { color: theme.muted }]}>
            TEACH · SECTION {index + 1} OF {Math.max(sections.length, 1)}
          </Text>
          <Text style={[styles.prompt, { color: theme.text }]}>
            {section?.content?.split(". ")[0] ?? lesson.title}
            {section?.content?.includes(".") ? "." : ""}
          </Text>
          <Text style={[styles.body, { color: theme.muted }]}>
            {section?.content ?? lesson.objective}
          </Text>
        </View>

        <View style={[styles.side, { borderLeftColor: theme.border, backgroundColor: theme.surface }]}>
          <View>
            <Text style={[styles.eyebrow, { color: theme.muted }]}>TIMER</Text>
            <Text style={[styles.timer, { color: theme.text }]}>{time}</Text>
          </View>
          <View>
            <Text style={[styles.eyebrow, { color: theme.muted }]}>STUDENT</Text>
            <Text style={{ color: theme.text, fontWeight: "800", fontSize: 14, marginTop: 4 }}>{student?.name}</Text>
            <Text style={{ color: theme.muted, fontSize: 11, marginTop: 2 }} numberOfLines={2}>
              {lesson.title}
            </Text>
          </View>
          <View style={[styles.noteBox, { borderColor: theme.border, backgroundColor: theme.bg }]}>
            <Text style={[styles.eyebrow, { color: theme.muted }]}>LIVE NOTE</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              onBlur={() => {
                if (!note.trim()) return;
                addNote({
                  studentId: lesson.studentId,
                  lessonId: lesson.id,
                  text: note.trim(),
                });
              }}
              placeholder="Quick observation…"
              placeholderTextColor={theme.muted}
              multiline
              style={{ color: theme.text, fontSize: 12, marginTop: 6, minHeight: 56 }}
            />
          </View>
          <View style={{ marginTop: "auto", gap: 8 }}>
            <Pressable
              style={[styles.btn, { borderColor: theme.border }]}
              onPress={() => navigation.navigate("MasterOSWhiteboard", { lessonId: lesson.id })}
            >
              <Text style={{ color: theme.text, fontWeight: "800", fontSize: 12 }}>Whiteboard</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, { borderColor: theme.border }]}
              onPress={() => setIndex((value) => Math.max(0, value - 1))}
              disabled={index === 0}
            >
              <Text style={{ color: theme.muted, fontWeight: "800", fontSize: 12 }}>Prev</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, { backgroundColor: theme.text, borderColor: theme.text }]}
              onPress={() => {
                if (index >= sections.length - 1) {
                  updateLesson(lesson.id, { status: "complete" });
                  navigation.goBack();
                  return;
                }
                setIndex((value) => value + 1);
              }}
            >
              <Text style={{ color: theme.surface, fontWeight: "800", fontSize: 12 }}>
                {index >= sections.length - 1 ? "Finish lesson" : "Next section"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </MasterOSShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  row: { flex: 1, flexDirection: "row", borderWidth: StyleSheet.hairlineWidth, margin: 8, borderRadius: 12, overflow: "hidden" },
  rail: { width: mos.teachRailWidth, borderRightWidth: StyleSheet.hairlineWidth, padding: 8 },
  railItem: { paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8, marginBottom: 4 },
  stage: { flex: 1, paddingHorizontal: 28, paddingVertical: 24 },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  prompt: { fontSize: 34, fontWeight: "400", lineHeight: 42, marginTop: 8, marginBottom: 18 },
  body: { fontSize: 17, lineHeight: 26, maxWidth: 520 },
  side: { width: mos.teachSideWidth, borderLeftWidth: StyleSheet.hairlineWidth, padding: 14, gap: 12 },
  timer: { fontSize: 28, fontWeight: "800", fontVariant: ["tabular-nums"], marginTop: 4 },
  noteBox: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 10 },
  btn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
