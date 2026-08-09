import Feather from "@expo/vector-icons/Feather";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card, Empty, Page, ActionButton } from "../components/UI";
import { TaskRow } from "../components/TaskRow";
import { useLifeOS } from "../lib/LifeOSContext";
import { dueRank, taskIsOpen } from "../lib/helpers";
import { primaryPageForNotebook } from "../lib/notebooks";
import { SPACE_COLORS } from "../lib/theme";
import type { Project, ProjectKind } from "../types";

export function ProjectDetailScreen() {
  const { theme, workspace, updateTasks, updateProjects, updateNotes, updateResources, updateNotebookHub } =
    useLifeOS();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const projectName = route.params?.projectName as string;
  const project = workspace.projects.find((p) => p.name === projectName);
  const [editOpen, setEditOpen] = useState(false);

  const projectTasks = workspace.tasks.filter((t) => t.project === projectName);
  const active = projectTasks.filter(taskIsOpen).sort((a, b) => dueRank(a.due) - dueRank(b.due));
  const completed = projectTasks.filter((t) => !taskIsOpen(t));
  const textNotes = workspace.notes.filter((n) => n.projectName === projectName);
  const pageNotes = workspace.notebookHub.notebooks.filter((n) => n.context?.projectName === projectName);
  const notesCount = textNotes.length + pageNotes.length;
  const resources = workspace.resources.filter((r) => r.projectName === projectName);

  const toggleDone = (id: number) =>
    updateTasks(
      workspace.tasks.map((t) =>
        t.id === id ? { ...t, done: !t.done, status: !t.done ? "Done" : "Not started" } : t,
      ),
    );

  const deleteTask = (id: number) => updateTasks(workspace.tasks.filter((t) => t.id !== id));

  const saveProject = async (next: { name: string; desc: string; color: string; kind: ProjectKind }) => {
    const oldName = projectName;
    const newName = next.name.trim() || oldName;
    if (!project) return;

    const renamed = newName !== oldName;
    if (renamed && workspace.projects.some((p) => p.name === newName)) {
      Alert.alert("Name taken", "Another project already uses that name.");
      return;
    }

    await updateProjects(
      workspace.projects.map((p) =>
        p.name === oldName ? { ...p, name: newName, desc: next.desc, color: next.color, kind: next.kind } : p,
      ),
    );
    if (renamed) {
      await updateTasks(
        workspace.tasks.map((t) => (t.project === oldName ? { ...t, project: newName, color: next.color } : t)),
      );
      await updateNotes(
        workspace.notes.map((n) => (n.projectName === oldName ? { ...n, projectName: newName } : n)),
      );
      await updateResources(
        workspace.resources.map((r) => (r.projectName === oldName ? { ...r, projectName: newName } : r)),
      );
      await updateNotebookHub({
        ...workspace.notebookHub,
        notebooks: workspace.notebookHub.notebooks.map((nb) =>
          nb.context?.projectName === oldName
            ? { ...nb, context: { ...nb.context, projectName: newName } }
            : nb,
        ),
      });
      navigation.setParams({ projectName: newName });
    }
    setEditOpen(false);
  };

  const deleteProject = () => {
    Alert.alert("Delete project", `Delete "${projectName}"? Tasks move to Inbox.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await updateProjects(workspace.projects.filter((p) => p.name !== projectName));
          await updateTasks(
            workspace.tasks.map((t) =>
              t.project === projectName ? { ...t, project: "Inbox", color: "#625af6" } : t,
            ),
          );
          await updateNotes(
            workspace.notes.map((n) => (n.projectName === projectName ? { ...n, projectName: undefined } : n)),
          );
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <Page edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="chevron-left" size={22} color={theme.text} />
          <Text style={{ color: theme.text, fontWeight: "700" }}>Projects</Text>
        </Pressable>
        <Pressable
          onPress={() => setEditOpen(true)}
          style={[styles.editBtn, { borderColor: theme.border, backgroundColor: theme.surface }]}
        >
          <Feather name="edit-2" size={16} color={theme.text} />
          <Text style={{ color: theme.text, fontWeight: "700", fontSize: 13 }}>Edit</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.screen}>
        <View
          style={[
            styles.hero,
            { backgroundColor: `${project?.color || theme.accent}18`, borderColor: project?.color || theme.accent },
          ]}
        >
          <View style={[styles.heroIcon, { backgroundColor: project?.color || theme.accent }]}>
            <Feather name="folder" size={20} color="#FFF" />
          </View>
          <Text style={[styles.heroTitle, { color: theme.text }]}>{projectName}</Text>
          {project?.desc ? <Text style={[styles.heroSub, { color: theme.muted }]}>{project.desc}</Text> : null}
          {project?.kind ? (
            <Text style={{ color: theme.muted, fontSize: 12, fontWeight: "700" }}>
              {project.kind === "maintenance" ? "Maintenance" : "Finishable"}
            </Text>
          ) : null}
        </View>

        <View style={styles.metaStrip}>
          <MetaBlock label="Open work" value={String(active.length)} theme={theme} />
          <MetaBlock label="Notes" value={String(notesCount)} theme={theme} />
          <MetaBlock label="Files" value={String(resources.length)} theme={theme} />
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Active tasks</Text>
        {active.length ? (
          active.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onPress={() =>
                navigation.navigate("TasksTab", { screen: "TaskDetail", params: { taskId: task.id } })
              }
              onToggleDone={() => toggleDone(task.id)}
              onDelete={() => deleteTask(task.id)}
            />
          ))
        ) : (
          <Card>
            <Empty title="Nothing due right now." body="Add the next task when it lands." />
          </Card>
        )}

        {completed.length ? (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Completed ({completed.length})</Text>
            {completed.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onPress={() =>
                  navigation.navigate("TasksTab", { screen: "TaskDetail", params: { taskId: task.id } })
                }
                onToggleDone={() => toggleDone(task.id)}
                onDelete={() => deleteTask(task.id)}
              />
            ))}
          </>
        ) : null}

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Notes</Text>
        {notesCount ? (
          <>
            {pageNotes.map((nb) => (
              <Pressable
                key={nb.id}
                onPress={() => {
                  const page = primaryPageForNotebook(workspace.notebookPages, nb.id);
                  if (page) {
                    navigation.navigate("LibraryTab", {
                      screen: "PageCanvas",
                      params: { notebookId: nb.id, pageId: page.id },
                    });
                  } else {
                    navigation.navigate("LibraryTab", { screen: "NotebookDetail", params: { notebookId: nb.id } });
                  }
                }}
                style={[styles.simpleRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <Feather name="edit-3" size={15} color={theme.accent} />
                <Text style={{ color: theme.text, fontWeight: "700", flex: 1 }} numberOfLines={1}>
                  {nb.name}
                </Text>
                <Feather name="chevron-right" size={16} color={theme.muted} />
              </Pressable>
            ))}
            {textNotes.map((note) => (
              <Pressable
                key={note.id}
                onPress={() => {
                  const nb = workspace.notebookHub.notebooks.find((n) => n.context?.legacyNoteId === note.id);
                  const page = nb
                    ? Object.values(workspace.notebookPages).find((p) => p.notebookId === nb.id)
                    : undefined;
                  if (nb && page) {
                    navigation.navigate("LibraryTab", {
                      screen: "PageCanvas",
                      params: { notebookId: nb.id, pageId: page.id },
                    });
                  } else {
                    navigation.navigate("LibraryTab", { screen: "NotebooksList" });
                  }
                }}
                style={[styles.simpleRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <Feather name="file-text" size={15} color={theme.accent} />
                <Text style={{ color: theme.text, fontWeight: "700", flex: 1 }} numberOfLines={1}>
                  {note.title || "Untitled note"}
                </Text>
              </Pressable>
            ))}
          </>
        ) : (
          <Card>
            <Empty title="No notes yet." body="Create one in Library → Notes and link this space." />
          </Card>
        )}

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Files</Text>
        {resources.length ? (
          resources.map((resource) => (
            <View key={resource.id} style={[styles.simpleRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Feather name="paperclip" size={15} color={theme.accent} />
              <Text style={{ color: theme.text, fontWeight: "700", flex: 1 }} numberOfLines={1}>
                {resource.name}
              </Text>
            </View>
          ))
        ) : (
          <Card>
            <Empty title="No files yet." body="Upload from the Resources tab." />
          </Card>
        )}
      </ScrollView>

      {project && editOpen ? (
        <EditProjectModal
          key={project.name}
          visible={editOpen}
          project={project}
          theme={theme}
          onClose={() => setEditOpen(false)}
          onSave={saveProject}
          onDelete={deleteProject}
        />
      ) : null}
    </Page>
  );
}

function EditProjectModal({
  visible,
  project,
  theme,
  onClose,
  onSave,
  onDelete,
}: {
  visible: boolean;
  project: Project;
  theme: any;
  onClose: () => void;
  onSave: (next: { name: string; desc: string; color: string; kind: ProjectKind }) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(project.name);
  const [desc, setDesc] = useState(project.desc ?? "");
  const [color, setColor] = useState(project.color || SPACE_COLORS[0]);
  const [kind, setKind] = useState<ProjectKind>(project.kind === "maintenance" ? "maintenance" : "finishable");

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.modalRoot, { backgroundColor: theme.bg }]} edges={["top", "bottom"]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Edit project</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Feather name="x" size={22} color={theme.muted} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
          <Text style={{ color: theme.muted, fontSize: 12, fontWeight: "700" }}>NAME</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
          />
          <Text style={{ color: theme.muted, fontSize: 12, fontWeight: "700" }}>DESCRIPTION</Text>
          <TextInput
            value={desc}
            onChangeText={setDesc}
            multiline
            style={[
              styles.input,
              { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface, minHeight: 80 },
            ]}
          />
          <Text style={{ color: theme.muted, fontSize: 12, fontWeight: "700" }}>COLOR</Text>
          <View style={styles.swatchRow}>
            {SPACE_COLORS.slice(0, 12).map((swatch) => (
              <Pressable
                key={swatch}
                onPress={() => setColor(swatch)}
                style={[
                  styles.swatch,
                  { backgroundColor: swatch, borderColor: color === swatch ? theme.text : "transparent" },
                ]}
              />
            ))}
          </View>
          <Text style={{ color: theme.muted, fontSize: 12, fontWeight: "700" }}>KIND</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {(["finishable", "maintenance"] as ProjectKind[]).map((k) => (
              <Pressable
                key={k}
                onPress={() => setKind(k)}
                style={[
                  styles.kindChip,
                  {
                    borderColor: kind === k ? theme.accent : theme.border,
                    backgroundColor: kind === k ? `${theme.accent}18` : theme.surface,
                  },
                ]}
              >
                <Text style={{ color: theme.text, fontWeight: "700", fontSize: 13 }}>
                  {k === "finishable" ? "Finishable" : "Maintenance"}
                </Text>
              </Pressable>
            ))}
          </View>
          <ActionButton label="Save" icon="check" onPress={() => onSave({ name, desc, color, kind })} />
          <ActionButton label="Delete project" icon="trash-2" quiet danger onPress={onDelete} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
  screen: { padding: 20, paddingTop: 4, paddingBottom: 28, gap: 12 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 4,
  },
  backButton: { flexDirection: "row", alignItems: "center", gap: 4 },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
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
  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  modalTitle: { fontSize: 22, fontWeight: "800" },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, minHeight: 46, fontSize: 15 },
  swatchRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 2 },
  kindChip: { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
});
