import Feather from "@expo/vector-icons/Feather";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { DashboardModule, DashboardRow, ModuleEmpty, QuickAction } from "../components/HubDashboard";
import { FocusModal } from "../components/FocusModal";
import { Eyebrow, Page } from "../components/UI";
import { useLifeOS } from "../lib/LifeOSContext";
import { formatDueDate, taskIsOpen, toDateKey } from "../lib/helpers";
import { primaryPageForNotebook } from "../lib/notebooks";

export function SchoolDashboardScreen() {
  const { theme, workspace, updateTasks } = useLifeOS();
  const navigation = useNavigation<any>();
  const [focusTaskId, setFocusTaskId] = useState<number | null>(null);
  const now = new Date();
  const today = toDateKey(now);
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() + 7);
  const weekEndKey = toDateKey(weekEnd);
  const activeCourses = workspace.classes.filter((course) => !course.archived);
  const academicTasks = workspace.tasks
    .filter((task) => task.classId && taskIsOpen(task))
    .filter((task) => !task.due || (task.due >= today && task.due <= weekEndKey))
    .sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));
  const assignments = academicTasks.filter((task) => task.academicType && task.academicType !== "Reading" && task.academicType !== "Discussion");
  const lectureNotes = workspace.notebookHub.notebooks
    .filter((nb) => nb.context?.classId && !nb.trashedAt)
    .map((nb) => ({
      id: nb.id,
      title: nb.name,
      updatedAt: nb.updatedAt,
      classId: nb.context?.classId,
      open: () => {
        const page = primaryPageForNotebook(workspace.notebookPages, nb.id);
        if (page) {
          navigation.navigate("LibraryTab", {
            screen: "PageCanvas",
            params: { notebookId: nb.id, pageId: page.id },
          });
        } else {
          navigation.navigate("LibraryTab", { screen: "NotebookDetail", params: { notebookId: nb.id } });
        }
      },
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 4);
  const focusTask = workspace.tasks.find((task) => task.id === focusTaskId);
  const nextFocus = academicTasks[0];

  const courseFor = (classId?: string) => activeCourses.find((course) => course.id === classId);
  const openCollection = (collection: string) => navigation.navigate("HubCollection", { scope: "school", collection });
  const create = (kind: string) => navigation.navigate("AcademicCreate", { kind });
  const complete = (id: number) =>
    updateTasks(workspace.tasks.map((task) => task.id === id ? { ...task, done: true, status: "Done", completedAt: new Date().toISOString() } : task));

  return (
    <Page>
      <ScrollView contentContainerStyle={styles.screen}>
        <View style={styles.header}>
          <View style={styles.grow}>
            <Eyebrow>CURRENT TERM</Eyebrow>
            <Text style={[styles.title, { color: theme.text }]}>SchoolOS</Text>
            <Text style={[styles.subtitle, { color: theme.muted }]}>
              {activeCourses.length} course{activeCourses.length === 1 ? "" : "s"} · {academicTasks.length} due this week
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Edit academic profile"
            onPress={() => navigation.navigate("SchoolProfile")}
            style={[styles.profileButton, { backgroundColor: theme.highlight }]}
          >
            <Feather name="user" size={18} color={theme.text} />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
          <QuickAction icon="book-open" label="New course" onPress={() => create("course")} color={theme.warning} />
          <QuickAction icon="check-square" label="New task" onPress={() => create("task")} color={theme.blue} />
          <QuickAction icon="download" label="Assignment" onPress={() => create("assignment")} color={theme.danger} />
          <QuickAction icon="bookmark" label="Lecture note" onPress={() => create("lecture")} color={theme.success} />
          <QuickAction icon="layers" label="New topic" onPress={() => create("topic")} color={theme.accent} />
        </ScrollView>

        <DashboardModule icon="book-open" title="Courses right now" action="All courses" onAction={() => navigation.navigate("CoursesDirectory")}>
          {activeCourses.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.courseRow}>
              {activeCourses.map((course) => {
                const due = academicTasks.filter((task) => task.classId === course.id).length;
                return (
                  <Pressable
                    key={course.id}
                    onPress={() => navigation.navigate("ClassDetail", { classId: course.id })}
                    style={[styles.courseCard, { backgroundColor: `${course.color ?? theme.accent}14`, borderColor: course.color ?? theme.accent }]}
                  >
                    <View style={[styles.courseIcon, { backgroundColor: course.color ?? theme.accent }]}>
                      <Feather name="book-open" size={17} color="#FFF" />
                    </View>
                    <Text style={[styles.courseCode, { color: theme.text }]} numberOfLines={1}>{course.code}</Text>
                    <Text style={[styles.courseName, { color: theme.muted }]} numberOfLines={2}>{course.name}</Text>
                    <Text style={[styles.courseDue, { color: course.color ?? theme.accent }]}>{due} due this week</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : <ModuleEmpty text="Add your current courses to start the academic dashboard." />}
        </DashboardModule>

        <DashboardModule icon="check-square" title="Tasks this week" action="All tasks" onAction={() => navigation.navigate("TasksTab")}>
          {academicTasks.length ? academicTasks.slice(0, 4).map((task) => {
            const course = courseFor(task.classId);
            return (
              <DashboardRow
                key={task.id}
                icon="check-square"
                title={task.title}
                meta={`${course?.code ?? "School"} · ${formatDueDate(task.due)} · ${task.priority ?? "Medium"}`}
                color={course?.color}
                onPress={() => navigation.navigate("TasksTab", { screen: "TaskDetail", params: { taskId: task.id } })}
                trailing={
                  <Pressable accessibilityLabel={`Complete ${task.title}`} hitSlop={10} onPress={() => complete(task.id)} style={styles.rowAction}>
                    <Feather name="circle" size={19} color={theme.muted} />
                  </Pressable>
                }
              />
            );
          }) : <ModuleEmpty text="No school tasks are due in the next seven days." />}
        </DashboardModule>

        <DashboardModule icon="download" title="Assignments this week" action="Add" onAction={() => create("assignment")}>
          {assignments.length ? assignments.slice(0, 4).map((task) => {
            const course = courseFor(task.classId);
            return (
              <DashboardRow
                key={task.id}
                icon={task.academicType === "Exam" || task.academicType === "Quiz" ? "award" : "file-text"}
                title={task.title}
                meta={`${task.academicType ?? "Assignment"} · ${formatDueDate(task.due)}${task.gradeWeight !== undefined ? ` · ${task.gradeWeight}%` : ""}`}
                color={course?.color}
                onPress={() => navigation.navigate("TasksTab", { screen: "TaskDetail", params: { taskId: task.id } })}
              />
            );
          }) : <ModuleEmpty text="Assignments, exams, labs, and projects will collect here." />}
        </DashboardModule>

        <Pressable
          onPress={() => nextFocus ? setFocusTaskId(nextFocus.id) : create("task")}
          style={[styles.focusCard, { backgroundColor: theme.text }]}
        >
          <View style={styles.focusHead}>
            <Feather name="clock" size={16} color={theme.surface} />
            <Text style={[styles.focusLabel, { color: theme.surface }]}>FOCUS TIMER</Text>
            <Text style={[styles.focusTime, { color: theme.surface }]}>{nextFocus?.focusMinutes ?? 25}:00</Text>
          </View>
          <Text style={[styles.focusTitle, { color: theme.surface }]} numberOfLines={2}>{nextFocus?.title ?? "Choose the next study task"}</Text>
          <Text style={[styles.focusMeta, { color: theme.muted }]}>
            {nextFocus ? `${courseFor(nextFocus.classId)?.code ?? "School"} · tap to start` : "Add a school task to begin"}
          </Text>
        </Pressable>

        <DashboardModule icon="bookmark" title="Lecture notes this week" action="New note" onAction={() => create("lecture")}>
          {lectureNotes.length ? lectureNotes.map((note) => {
            const course = courseFor(note.classId);
            return (
              <DashboardRow
                key={note.id}
                icon="edit-3"
                title={note.title}
                meta={`${course?.code ?? "Course"} · ${new Date(note.updatedAt).toLocaleDateString()}`}
                color={course?.color}
                onPress={note.open}
              />
            );
          }) : <ModuleEmpty text="Course-linked notes will appear here." />}
        </DashboardModule>

        <DashboardModule icon="user" title="Personal" action="Edit" onAction={() => navigation.navigate("SchoolProfile")}>
          <ProfileRow label="Name" value={workspace.settings.preferredName || "Not set"} />
          <ProfileRow label="Major" value={workspace.school.profile.major || "Not set"} />
          <ProfileRow label="Minor" value={workspace.school.profile.minor || "Not set"} />
          <ProfileRow label="Class of" value={workspace.school.profile.classOf || "Not set"} />
        </DashboardModule>

        <DashboardModule icon="layers" title="Recent topics" action="All topics" onAction={() => openCollection("topics")}>
          {workspace.school.topics.length ? workspace.school.topics.slice(0, 4).map((topic) => (
            <DashboardRow
              key={topic.id}
              icon="bookmark"
              title={topic.title}
              meta={topic.subtitle}
              color={courseFor(topic.classId)?.color}
              onPress={() => openCollection("topics")}
            />
          )) : <ModuleEmpty text="Save a concept from class and it will land here." />}
        </DashboardModule>

        <DashboardModule icon="flag" title="My goals" action="Manage" onAction={() => openCollection("goals")}>
          {workspace.school.goals.length ? workspace.school.goals.slice(0, 5).map((goal) => (
            <DashboardRow key={goal.id} icon="target" title={goal.title} meta={goal.category} />
          )) : <ModuleEmpty text="Set goals for this week, semester, or year." />}
        </DashboardModule>

        <DashboardModule icon="compass" title="Academic databases">
          <View style={styles.databaseGrid}>
            <DatabaseButton icon="book-open" label="Courses" onPress={() => navigation.navigate("CoursesDirectory")} />
            <DatabaseButton icon="layers" label="Topics" onPress={() => openCollection("topics")} />
            <DatabaseButton icon="bookmark" label="Lectures" onPress={() => navigation.navigate("LibraryTab")} />
            <DatabaseButton icon="users" label="Professors" onPress={() => openCollection("professors")} />
            <DatabaseButton icon="check-square" label="Tasks" onPress={() => navigation.navigate("TasksTab")} />
            <DatabaseButton icon="download" label="Assignments" onPress={() => create("assignment")} />
          </View>
        </DashboardModule>
      </ScrollView>
      {focusTask ? <FocusModal visible={Boolean(focusTaskId)} task={focusTask} onClose={() => setFocusTaskId(null)} /> : null}
    </Page>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  const { theme } = useLifeOS();
  return (
    <View style={[styles.profileRow, { borderBottomColor: theme.border }]}>
      <Text style={[styles.profileLabel, { color: theme.warning }]}>{label}</Text>
      <Text style={[styles.profileValue, { color: theme.text }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function DatabaseButton({ icon, label, onPress }: { icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void }) {
  const { theme } = useLifeOS();
  return (
    <Pressable onPress={onPress} style={[styles.databaseButton, { borderColor: theme.border }]}>
      <Feather name={icon} size={15} color={theme.warning} />
      <Text style={[styles.databaseText, { color: theme.text }]}>{label}</Text>
      <Feather name="chevron-right" size={14} color={theme.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 16, paddingBottom: 28, gap: 18 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  grow: { flex: 1, minWidth: 0 },
  title: { fontSize: 29, fontWeight: "800", marginTop: 2 },
  subtitle: { fontSize: 13, marginTop: 2 },
  profileButton: { width: 44, height: 44, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  quickRow: { flexGrow: 1, justifyContent: "center", alignItems: "center", gap: 14 },
  courseRow: { gap: 10, paddingVertical: 8, paddingRight: 12 },
  courseCard: { width: 152, minHeight: 146, borderWidth: 1, borderRadius: 8, padding: 12 },
  courseIcon: { width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  courseCode: { fontSize: 16, fontWeight: "800", marginTop: 12 },
  courseName: { fontSize: 12, lineHeight: 16, marginTop: 3 },
  courseDue: { fontSize: 11, fontWeight: "800", marginTop: "auto" },
  rowAction: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginRight: -10 },
  focusCard: { borderRadius: 8, padding: 16, gap: 8 },
  focusHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  focusLabel: { flex: 1, fontSize: 10, fontWeight: "800" },
  focusTime: { fontSize: 20, fontWeight: "800", fontVariant: ["tabular-nums"] },
  focusTitle: { fontSize: 18, lineHeight: 23, fontWeight: "800" },
  focusMeta: { fontSize: 12 },
  profileRow: { minHeight: 46, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", gap: 12 },
  profileLabel: { width: 74, fontSize: 12, fontWeight: "800" },
  profileValue: { flex: 1, fontSize: 13, fontWeight: "700", textAlign: "right" },
  databaseGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingVertical: 8 },
  databaseButton: { width: "48.5%", minHeight: 48, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 7 },
  databaseText: { flex: 1, fontSize: 12, fontWeight: "800" },
});
