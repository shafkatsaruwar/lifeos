import Feather from "@expo/vector-icons/Feather";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Card, Empty, Page } from "../components/UI";
import { TaskRow } from "../components/TaskRow";
import { useLifeOS } from "../lib/LifeOSContext";
import { dueRank, taskIsOpen } from "../lib/helpers";

export function ProjectDetailScreen() {
  const { theme, workspace, updateTasks } = useLifeOS();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const projectName = route.params?.projectName as string;
  const project = workspace.projects.find((p) => p.name === projectName);

  // Matches web's grouping logic exactly: workspace.tasks.filter(t => t.project === project.name).
  const projectTasks = workspace.tasks.filter((t) => t.project === projectName);
  const active = projectTasks.filter(taskIsOpen).sort((a, b) => dueRank(a.due) - dueRank(b.due));
  const completed = projectTasks.filter((t) => !taskIsOpen(t));
  const notes = workspace.notes.filter((n) => n.projectName === projectName);
  const resources = workspace.resources.filter((r) => r.projectName === projectName);

  const toggleDone = (id: number) =>
    updateTasks(workspace.tasks.map((t) => (t.id === id ? { ...t, done: !t.done, status: !t.done ? "Done" : "Not started" } : t)));

  return (
    <Page edges={["bottom"]}>
      <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
        <Feather name="chevron-left" size={22} color={theme.text} />
        <Text style={{ color: theme.text, fontWeight: "700" }}>Projects</Text>
      </Pressable>

      <ScrollView contentContainerStyle={styles.screen}>
        <View style={[styles.hero, { backgroundColor: `${project?.color || theme.accent}18`, borderColor: project?.color || theme.accent }]}>
          <View style={[styles.heroIcon, { backgroundColor: project?.color || theme.accent }]}>
            <Feather name="folder" size={20} color="#FFF" />
          </View>
          <Text style={[styles.heroTitle, { color: theme.text }]}>{projectName}</Text>
          {project?.desc ? <Text style={[styles.heroSub, { color: theme.muted }]}>{project.desc}</Text> : null}
        </View>

        <View style={styles.metaStrip}>
          <MetaBlock label="Open work" value={String(active.length)} theme={theme} />
          <MetaBlock label="Notes" value={String(notes.length)} theme={theme} />
          <MetaBlock label="Files" value={String(resources.length)} theme={theme} />
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Active tasks</Text>
        {active.length ? (
          active.map((task) => (
            <TaskRow key={task.id} task={task} onPress={() => navigation.navigate("TasksTab", { screen: "TaskDetail", params: { taskId: task.id } })} onToggleDone={() => toggleDone(task.id)} />
          ))
        ) : (
          <Card><Empty title="Nothing due right now." body="Add the next task when it lands." /></Card>
        )}

        {completed.length ? (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Completed ({completed.length})</Text>
            {completed.map((task) => (
              <TaskRow key={task.id} task={task} onPress={() => navigation.navigate("TasksTab", { screen: "TaskDetail", params: { taskId: task.id } })} onToggleDone={() => toggleDone(task.id)} />
            ))}
          </>
        ) : null}

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Notes</Text>
        {notes.length ? (
          notes.map((note) => (
            <Pressable key={note.id} onPress={() => navigation.navigate("LibraryTab", { screen: "NoteEditor", params: { noteId: note.id } })} style={[styles.simpleRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Feather name="file-text" size={15} color={theme.accent} />
              <Text style={{ color: theme.text, fontWeight: "700", flex: 1 }} numberOfLines={1}>{note.title || "Untitled note"}</Text>
            </Pressable>
          ))
        ) : (
          <Card><Empty title="No notes yet." body="Start one from this space." /></Card>
        )}

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Files</Text>
        {resources.length ? (
          resources.map((resource) => (
            <View key={resource.id} style={[styles.simpleRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Feather name="paperclip" size={15} color={theme.accent} />
              <Text style={{ color: theme.text, fontWeight: "700", flex: 1 }} numberOfLines={1}>{resource.name}</Text>
            </View>
          ))
        ) : (
          <Card><Empty title="No files yet." body="Upload from the Resources tab." /></Card>
        )}
      </ScrollView>
    </Page>
  );
}

function MetaBlock({ label, value, theme }: { label: string; value: string; theme: any }) {
  return (
    <View style={[styles.metaBlock, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.metaValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.metaLabel, { color: theme.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 20, paddingTop: 4, paddingBottom: 110, gap: 12 },
  backButton: { flexDirection: "row", alignItems: "center", gap: 4, marginLeft: 12, marginTop: 12, marginBottom: 4 },
  hero: { borderWidth: 1.5, borderRadius: 20, padding: 18, gap: 8 },
  heroIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 24, fontWeight: "800", marginTop: 4 },
  heroSub: { fontSize: 14, lineHeight: 19 },
  metaStrip: { flexDirection: "row", gap: 10 },
  metaBlock: { flex: 1, borderWidth: 1, borderRadius: 14, padding: 12, alignItems: "center" },
  metaValue: { fontSize: 18, fontWeight: "800" },
  metaLabel: { fontSize: 11, marginTop: 2 },
  sectionTitle: { fontSize: 17, fontWeight: "800", marginTop: 10 },
  simpleRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 12, padding: 12 },
});
