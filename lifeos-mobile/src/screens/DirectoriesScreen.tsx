import Feather from "@expo/vector-icons/Feather";
import { useNavigation } from "@react-navigation/native";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Empty, Page } from "../components/UI";
import { useLifeOS } from "../lib/LifeOSContext";
import { taskIsOpen } from "../lib/helpers";

function DirectoryHeader({ eyebrow, title, onBack, onAdd }: { eyebrow: string; title: string; onBack: () => void; onAdd: () => void }) {
  const { theme } = useLifeOS();
  return (
    <View style={styles.header}>
      <Pressable accessibilityLabel="Go back" onPress={onBack} style={styles.iconButton}>
        <Feather name="chevron-left" size={22} color={theme.text} />
      </Pressable>
      <View style={styles.grow}>
        <Text style={[styles.eyebrow, { color: theme.muted }]}>{eyebrow}</Text>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      </View>
      <Pressable accessibilityLabel={`Add ${title}`} onPress={onAdd} style={[styles.addButton, { backgroundColor: theme.text }]}>
        <Feather name="plus" size={19} color={theme.surface} />
      </Pressable>
    </View>
  );
}

export function ProjectsDirectoryScreen() {
  const { theme, workspace, updateProjects } = useLifeOS();
  const navigation = useNavigation<any>();

  const add = async () => {
    const name = `New project ${workspace.projects.length + 1}`;
    await updateProjects([...workspace.projects, { name, color: theme.accent, kind: "finishable" }]);
    navigation.navigate("ProjectDetail", { projectName: name });
  };

  return (
    <Page>
      <DirectoryHeader eyebrow="LIFE OS" title="Projects" onBack={() => navigation.goBack()} onAdd={add} />
      <FlatList
        data={workspace.projects}
        keyExtractor={(item) => item.name}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const open = workspace.tasks.filter((task) => task.project === item.name && taskIsOpen(task)).length;
          return (
            <Pressable
              onPress={() => navigation.navigate("ProjectDetail", { projectName: item.name })}
              style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <View style={[styles.rowIcon, { backgroundColor: `${item.color ?? theme.accent}18` }]}>
                <Feather name="folder" size={18} color={item.color ?? theme.accent} />
              </View>
              <View style={styles.grow}>
                <Text style={[styles.rowTitle, { color: theme.text }]}>{item.name}</Text>
                <Text style={[styles.rowMeta, { color: theme.muted }]}>{open} open · {item.kind === "maintenance" ? "Ongoing" : "Finishable"}</Text>
              </View>
              <Feather name="chevron-right" size={17} color={theme.muted} />
            </Pressable>
          );
        }}
        ListEmptyComponent={<Empty title="No projects yet." body="Add the first project when something needs more than one step." />}
      />
    </Page>
  );
}

export function CoursesDirectoryScreen() {
  const { theme, workspace } = useLifeOS();
  const navigation = useNavigation<any>();
  const courses = workspace.classes.filter((course) => !course.archived);

  return (
    <Page>
      <DirectoryHeader eyebrow="SCHOOL OS" title="Courses" onBack={() => navigation.goBack()} onAdd={() => navigation.navigate("AcademicCreate", { kind: "course" })} />
      <FlatList
        data={courses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const open = workspace.tasks.filter((task) => task.classId === item.id && taskIsOpen(task)).length;
          const notes = workspace.notes.filter((note) => note.classId === item.id).length;
          return (
            <Pressable
              onPress={() => navigation.navigate("ClassDetail", { classId: item.id })}
              style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <View style={[styles.rowIcon, { backgroundColor: `${item.color ?? theme.accent}18` }]}>
                <Feather name="book-open" size={18} color={item.color ?? theme.accent} />
              </View>
              <View style={styles.grow}>
                <Text style={[styles.rowTitle, { color: theme.text }]}>{item.code}</Text>
                <Text style={[styles.rowMeta, { color: theme.muted }]} numberOfLines={1}>{item.name} · {open} due · {notes} notes</Text>
              </View>
              <Feather name="chevron-right" size={17} color={theme.muted} />
            </Pressable>
          );
        }}
        ListEmptyComponent={<Empty title="No courses yet." body="Add your current classes to connect coursework and lecture notes." />}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingTop: 8 },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  addButton: { width: 44, height: 44, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  grow: { flex: 1, minWidth: 0 },
  eyebrow: { fontSize: 10, fontWeight: "800" },
  title: { fontSize: 24, fontWeight: "800", marginTop: 2 },
  list: { padding: 16, paddingBottom: 28, gap: 10 },
  row: { minHeight: 72, borderWidth: 1, borderRadius: 8, padding: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  rowIcon: { width: 40, height: 40, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontSize: 15, fontWeight: "800" },
  rowMeta: { fontSize: 12, marginTop: 3 },
});
