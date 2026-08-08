import Feather from "@expo/vector-icons/Feather";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Card, Empty, Page } from "../components/UI";
import { useLifeOS } from "../lib/LifeOSContext";
import { PRIORITY_COLOR } from "../lib/theme";
import { dueRank, formatDueDate, formatResourceSize } from "../lib/helpers";

export function ClassDetailScreen() {
  const { theme, workspace } = useLifeOS();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const classId = route.params?.classId as string;
  const cls = workspace.classes.find((c) => c.id === classId);

  if (!cls) {
    return (
      <Page><View style={styles.missing}><Text style={{ color: theme.muted }}>Class not found.</Text></View></Page>
    );
  }

  const classTasks = workspace.tasks.filter((t) => t.classId === cls.id);
  const active = classTasks.filter((t) => !t.done && !t.canceled).sort((a, b) => dueRank(a.due) - dueRank(b.due));
  const completed = classTasks.filter((t) => t.done || t.canceled);
  const classNotes = workspace.notes.filter((n) => n.classId === cls.id);
  const classResources = workspace.resources.filter((r) => r.classId === cls.id);
  const color = cls.color || theme.accent;

  return (
    <Page edges={["top", "bottom"]}>
      <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
        <Feather name="chevron-left" size={22} color={theme.text} />
        <Text style={{ color: theme.text, fontWeight: "700" }}>Courses</Text>
      </Pressable>

      <ScrollView contentContainerStyle={styles.screen}>
        <View style={[styles.hero, { backgroundColor: `${color}18`, borderColor: color }]}>
          <View style={[styles.heroIcon, { backgroundColor: color }]}>
            <Feather name="book-open" size={20} color="#FFF" />
          </View>
          <Text style={[styles.eyebrow, { color: theme.muted }]}>{cls.term || "Current term"}</Text>
          <Text style={[styles.heroTitle, { color: theme.text }]}>{cls.code}</Text>
          <Text style={[styles.heroSub, { color: theme.muted }]}>{cls.name}</Text>
        </View>

        <View style={styles.metaStrip}>
          <MetaBlock label="Instructor" value={cls.instructor || "Not added"} theme={theme} />
          <MetaBlock label="Location" value={cls.location || "Not added"} theme={theme} />
          <MetaBlock label="Credits" value={cls.credits ? `${cls.credits}` : "—"} theme={theme} />
          <MetaBlock label="Open work" value={String(active.length)} theme={theme} />
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Upcoming coursework</Text>
        {active.length ? (
          active.map((task) => (
            <Pressable
              key={task.id}
              onPress={() => navigation.navigate("TasksTab", { screen: "TaskDetail", params: { taskId: task.id } })}
              style={[styles.courseworkRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <Text style={[styles.typeTag, { color, backgroundColor: `${color}14` }]}>{task.academicType ?? "Task"}</Text>
              <View style={styles.grow}>
                <Text style={{ color: theme.text, fontWeight: "800" }} numberOfLines={1}>{task.title}</Text>
                <Text style={{ color: theme.muted, fontSize: 12 }}>
                  {formatDueDate(task.due)}
                  {task.gradeWeight !== undefined ? ` · ${task.gradeWeight}% of grade` : ""}
                  {task.pointsPossible !== undefined ? ` · ${task.pointsEarned ?? "—"}/${task.pointsPossible} pts` : ""}
                </Text>
              </View>
              <Text style={{ color: PRIORITY_COLOR[task.priority ?? "Medium"], fontSize: 11, fontWeight: "800" }}>{task.priority}</Text>
            </Pressable>
          ))
        ) : (
          <Card><Empty title="Nothing due right now." body="Add the next assignment when it lands." /></Card>
        )}

        {completed.length ? (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Completed / canceled ({completed.length})</Text>
            {completed.map((task) => (
              <View key={task.id} style={[styles.simpleRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Feather name="check-circle" size={15} color={theme.muted} />
                <Text style={{ color: theme.muted, flex: 1 }} numberOfLines={1}>{task.title}</Text>
                <Text style={{ color: theme.muted, fontSize: 12 }}>{task.canceled ? "Canceled" : "Done"}</Text>
              </View>
            ))}
          </>
        ) : null}

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Notebooks</Text>
        {workspace.notebookHub.notebooks.filter((n) => n.context?.classId === cls.id).length ? (
          workspace.notebookHub.notebooks
            .filter((n) => n.context?.classId === cls.id)
            .map((nb) => (
              <Pressable
                key={nb.id}
                onPress={() => navigation.navigate("LibraryTab", { screen: "NotebookDetail", params: { notebookId: nb.id } })}
                style={[styles.simpleRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <Feather name="book" size={15} color={theme.accent} />
                <Text style={{ color: theme.text, fontWeight: "700", flex: 1 }} numberOfLines={1}>{nb.name}</Text>
                <Feather name="chevron-right" size={16} color={theme.muted} />
              </Pressable>
            ))
        ) : (
          <Card><Empty title="No class notebooks." body="Create one in Library → Notebooks and link it to this class." /></Card>
        )}

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Class notes</Text>
        {classNotes.length ? (
          classNotes.map((note) => (
            <Pressable key={note.id} onPress={() => navigation.navigate("LibraryTab", { screen: "NoteEditor", params: { noteId: note.id } })} style={[styles.simpleRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Feather name="file-text" size={15} color={theme.accent} />
              <Text style={{ color: theme.text, fontWeight: "700", flex: 1 }} numberOfLines={1}>{note.title || "Untitled note"}</Text>
              <Text style={{ color: theme.muted, fontSize: 11 }}>{new Date(note.updatedAt).toLocaleDateString()}</Text>
            </Pressable>
          ))
        ) : (
          <Card><Empty title="No notes yet." body="Start a class note from the Notes tab." /></Card>
        )}

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Class resources</Text>
        {classResources.length ? (
          classResources.map((resource) => (
            <View key={resource.id} style={[styles.simpleRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Feather name="paperclip" size={15} color={theme.accent} />
              <View style={styles.grow}>
                <Text style={{ color: theme.text, fontWeight: "700" }} numberOfLines={1}>{resource.name}</Text>
                <Text style={{ color: theme.muted, fontSize: 11 }}>{formatResourceSize(resource.size)}</Text>
              </View>
            </View>
          ))
        ) : (
          <Card><Empty title="No class files yet." body="Upload your syllabus from the Resources tab." /></Card>
        )}
      </ScrollView>
    </Page>
  );
}

function MetaBlock({ label, value, theme }: { label: string; value: string; theme: any }) {
  return (
    <View style={[styles.metaBlock, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.metaValue, { color: theme.text }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.metaLabel, { color: theme.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  missing: { flex: 1, alignItems: "center", justifyContent: "center" },
  screen: { padding: 20, paddingTop: 4, paddingBottom: 28, gap: 12 },
  backButton: { flexDirection: "row", alignItems: "center", gap: 4, marginLeft: 12, marginTop: 12, marginBottom: 4 },
  hero: { borderWidth: 1.5, borderRadius: 20, padding: 18, gap: 4 },
  heroIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" },
  heroTitle: { fontSize: 24, fontWeight: "800" },
  heroSub: { fontSize: 14 },
  metaStrip: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  metaBlock: { flexGrow: 1, flexBasis: "22%", borderWidth: 1, borderRadius: 14, padding: 10, alignItems: "center" },
  metaValue: { fontSize: 14, fontWeight: "800" },
  metaLabel: { fontSize: 10, marginTop: 2 },
  sectionTitle: { fontSize: 17, fontWeight: "800", marginTop: 10 },
  courseworkRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 14, padding: 12 },
  typeTag: { fontSize: 10, fontWeight: "800", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, overflow: "hidden" },
  grow: { flex: 1, minWidth: 0 },
  simpleRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 12, padding: 12 },
});
