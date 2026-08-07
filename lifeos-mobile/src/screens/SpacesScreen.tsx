import Feather from "@expo/vector-icons/Feather";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Empty, Eyebrow, Page, Subtitle, Title } from "../components/UI";
import { useLifeOS } from "../lib/LifeOSContext";
import { taskIsOpen } from "../lib/helpers";

// Mirrors web's SpacesView: a unified grid of projects + classes. Drilling
// into either opens a dedicated detail screen (ProjectDetailScreen /
// ClassDetailScreen) matching web's grouping logic exactly
// (workspace.tasks.filter(t => t.project === project.name) for projects,
// t.classId === class.id for classes).
export function SpacesScreen() {
  const { theme, workspace, updateProjects } = useLifeOS();
  const navigation = useNavigation<any>();

  const items = [
    ...workspace.projects.map((p) => ({ kind: "project" as const, key: `p-${p.name}`, title: p.name, subtitle: p.desc, color: p.color || theme.accent, id: p.name })),
    ...workspace.classes.filter((c) => !c.archived).map((c) => ({ kind: "class" as const, key: `c-${c.id}`, title: c.code, subtitle: c.name, color: c.color || theme.accent, id: c.id })),
  ];

  const openCount = (item: (typeof items)[number]) =>
    item.kind === "project"
      ? workspace.tasks.filter((t) => t.project === item.id && taskIsOpen(t)).length
      : workspace.tasks.filter((t) => t.classId === item.id && taskIsOpen(t)).length;

  const createProject = () => {
    updateProjects([...workspace.projects, { name: `New space ${workspace.projects.length + 1}`, color: theme.accent, kind: "finishable" }]);
  };

  return (
    <Page>
      <View style={styles.header}>
        <View style={styles.grow}>
          <Eyebrow>WHERE THE WORK LIVES</Eyebrow>
          <Title>Spaces</Title>
          <Subtitle>Projects and classes, each with their own tasks and notes.</Subtitle>
        </View>
        <Pressable onPress={createProject} style={[styles.addButton, { backgroundColor: theme.text }]}>
          <Feather name="plus" size={18} color={theme.surface} />
        </Pressable>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.key}
        numColumns={2}
        columnWrapperStyle={styles.columnWrap}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate(item.kind === "project" ? "ProjectDetail" : "ClassDetail", item.kind === "project" ? { projectName: item.id } : { classId: item.id })}
            style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={[styles.iconWrap, { backgroundColor: `${item.color}22` }]}>
              <Feather name={item.kind === "project" ? "folder" : "book-open"} size={18} color={item.color} />
            </View>
            <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
            {item.subtitle ? <Text style={[styles.cardSubtitle, { color: theme.muted }]} numberOfLines={2}>{item.subtitle}</Text> : null}
            <Text style={[styles.cardMeta, { color: theme.muted }]}>{openCount(item)} open</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Empty title="No spaces yet." body="Create a project or class to organize your work." />}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 20, gap: 12 },
  grow: { flex: 1 },
  addButton: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  list: { padding: 20, paddingBottom: 28, gap: 12 },
  columnWrap: { gap: 12 },
  card: { flex: 1, borderWidth: 1, borderRadius: 16, padding: 14, gap: 6, minHeight: 128 },
  iconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 15, fontWeight: "800", marginTop: 4 },
  cardSubtitle: { fontSize: 12, lineHeight: 16 },
  cardMeta: { fontSize: 11, fontWeight: "700", marginTop: "auto" },
});
