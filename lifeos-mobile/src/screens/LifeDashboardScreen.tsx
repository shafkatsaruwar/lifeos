import Feather from "@expo/vector-icons/Feather";
import { useNavigation } from "@react-navigation/native";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { DashboardModule, DashboardRow, ModuleEmpty, ProgressBar, QuickAction } from "../components/HubDashboard";
import { Eyebrow, Page } from "../components/UI";
import { useLifeOS } from "../lib/LifeOSContext";
import { formatDueDate, getGreeting, taskIsOpen, toDateKey, uid } from "../lib/helpers";

function periodProgress(now: Date) {
  const day = (now.getHours() * 60 + now.getMinutes()) / 1440;
  const mondayIndex = (now.getDay() + 6) % 7;
  const week = (mondayIndex + day) / 7;
  const month = (now.getDate() - 1 + day) / new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear() + 1, 0, 1);
  const year = (now.getTime() - start.getTime()) / (end.getTime() - start.getTime());
  return { day, week, month, year };
}

export function LifeDashboardScreen() {
  const { theme, workspace, updateTasks, updateNotes, updateProjects, updateLife } = useLifeOS();
  const navigation = useNavigation<any>();
  const now = new Date();
  const today = toDateKey(now);
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() + 7);
  const weekEndKey = toDateKey(weekEnd);
  const progress = periodProgress(now);
  const lifeTasks = workspace.tasks
    .filter((task) => !task.classId && taskIsOpen(task))
    .filter((task) => !task.due || (task.due >= today && task.due <= weekEndKey))
    .sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));
  const notes = workspace.notes
    .filter((note) => !note.classId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const habitsDone = workspace.life.habits.filter((habit) => habit.completedDates?.includes(today)).length;
  const upcomingEvents = [...workspace.calendar]
    .filter((event) => event.start.slice(0, 10) >= today)
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 3);
  const reading = workspace.life.media.filter((item) => item.category === "Reading").slice(0, 2);
  const watching = workspace.life.media.filter((item) => item.category === "Watching").slice(0, 2);
  const listening = workspace.life.media.filter((item) => item.category === "Listening").slice(0, 3);

  const toggleTask = (id: number) =>
    updateTasks(workspace.tasks.map((task) => task.id === id ? { ...task, done: true, status: "Done" } : task));

  const createTask = async () => {
    const id = Date.now();
    await updateTasks([
      ...workspace.tasks,
      {
        id,
        title: "New task",
        project: "Inbox",
        priority: "Medium",
        focusMinutes: workspace.settings.defaultFocusMinutes ?? 30,
        energy: workspace.settings.defaultEnergy ?? "Medium",
        status: "Not started",
        checklist: [],
        checklistProgress: [],
      },
    ]);
    navigation.navigate("TasksTab", { screen: "TaskDetail", params: { taskId: id } });
  };

  const createNote = async () => {
    const id = uid();
    await updateNotes([{ id, title: "", body: "", template: "blank", updatedAt: new Date().toISOString() }, ...workspace.notes]);
    navigation.navigate("LibraryTab", { screen: "NoteEditor", params: { noteId: id } });
  };

  const createProject = async () => {
    const name = `New project ${workspace.projects.length + 1}`;
    await updateProjects([...workspace.projects, { name, kind: "finishable", color: theme.accent }]);
    navigation.navigate("ProjectDetail", { projectName: name });
  };

  const toggleHabit = (id: string) => {
    updateLife({
      ...workspace.life,
      habits: workspace.life.habits.map((habit) => {
        if (habit.id !== id) return habit;
        const dates = habit.completedDates ?? [];
        return { ...habit, completedDates: dates.includes(today) ? dates.filter((date) => date !== today) : [...dates, today] };
      }),
    });
  };

  const openCollection = (collection: string, startAdd = false) =>
    navigation.navigate("HubCollection", { scope: "life", collection, startAdd });

  return (
    <Page>
      <ScrollView contentContainerStyle={styles.screen}>
        <View style={styles.header}>
          <View style={styles.grow}>
            <Eyebrow>{now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }).toUpperCase()}</Eyebrow>
            <Text style={[styles.title, { color: theme.text }]}>LifeOS</Text>
            <Text style={[styles.greeting, { color: theme.muted }]}>{getGreeting(now, workspace.settings.preferredName || "there")}</Text>
          </View>
          <Pressable
            accessibilityLabel="Open focus and ambient tools"
            onPress={() => navigation.navigate("NowTab")}
            style={[styles.nowButton, { backgroundColor: theme.text }]}
          >
            <Feather name="zap" size={18} color={theme.surface} />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
          <QuickAction icon="edit-3" label="New note" onPress={createNote} />
          <QuickAction icon="check-square" label="New task" onPress={createTask} color={theme.blue} />
          <QuickAction icon="folder-plus" label="New project" onPress={createProject} color={theme.warning} />
          <QuickAction icon="map" label="Trip idea" onPress={() => openCollection("trips", true)} color={theme.success} />
          <QuickAction icon="coffee" label="New recipe" onPress={() => openCollection("recipes", true)} color={theme.danger} />
          <QuickAction icon="activity" label="New training" onPress={() => openCollection("trainings", true)} color={theme.blue} />
        </ScrollView>

        <DashboardModule icon="check-circle" title="Tasks this week" action="All tasks" onAction={() => navigation.navigate("TasksTab")}>
          {lifeTasks.length ? lifeTasks.slice(0, 4).map((task) => (
            <DashboardRow
              key={task.id}
              icon="check-square"
              title={task.title}
              meta={`${task.project ?? "Inbox"} · ${formatDueDate(task.due)}`}
              color={task.color}
              onPress={() => navigation.navigate("TasksTab", { screen: "TaskDetail", params: { taskId: task.id } })}
              trailing={
                <Pressable accessibilityLabel={`Complete ${task.title}`} hitSlop={10} onPress={() => toggleTask(task.id)} style={styles.rowAction}>
                  <Feather name="circle" size={19} color={theme.muted} />
                </Pressable>
              }
            />
          )) : <ModuleEmpty text="Your life task list is clear for the next seven days." />}
        </DashboardModule>

        <DashboardModule icon="bar-chart-2" title="Habits today" action="Manage" onAction={() => openCollection("habits")}>
          {workspace.life.habits.length ? (
            <>
              <View style={styles.habitSummary}>
                <Text style={[styles.habitCount, { color: theme.text }]}>{habitsDone}/{workspace.life.habits.length}</Text>
                <Text style={[styles.habitMeta, { color: theme.muted }]}>completed today</Text>
              </View>
              {workspace.life.habits.slice(0, 4).map((habit) => {
                const done = habit.completedDates?.includes(today);
                return (
                  <DashboardRow
                    key={habit.id}
                    icon={done ? "check" : "circle"}
                    title={habit.title}
                    meta={done ? "Done today" : "Tap to complete"}
                    color={done ? theme.success : theme.accent}
                    onPress={() => toggleHabit(habit.id)}
                  />
                );
              })}
            </>
          ) : <ModuleEmpty text="Add a habit and it will show up here every day." />}
        </DashboardModule>

        <DashboardModule icon="folder" title="Active projects" action="See all" onAction={() => navigation.navigate("ProjectsDirectory")}>
          {workspace.projects.length ? workspace.projects.slice(0, 4).map((project) => {
            const open = workspace.tasks.filter((task) => task.project === project.name && taskIsOpen(task)).length;
            return (
              <DashboardRow
                key={project.name}
                icon="folder"
                title={project.name}
                meta={`${open} open task${open === 1 ? "" : "s"} · ${project.kind === "maintenance" ? "Ongoing" : "Finishable"}`}
                color={project.color}
                onPress={() => navigation.navigate("ProjectDetail", { projectName: project.name })}
              />
            );
          }) : <ModuleEmpty text="Create a project for anything with more than one step." />}
        </DashboardModule>

        <DashboardModule icon="calendar" title="Month calendar" action="Open" onAction={() => navigation.navigate("CalendarTab")}>
          {upcomingEvents.length ? upcomingEvents.map((event) => (
            <DashboardRow
              key={event.id}
              icon="calendar"
              title={event.title}
              meta={new Date(event.start).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              color={event.color}
              onPress={() => navigation.navigate("CalendarTab")}
            />
          )) : <ModuleEmpty text="No upcoming events on your calendar." />}
        </DashboardModule>

        <DashboardModule icon="clock" title="Your progress">
          <ProgressBar label="Day" value={progress.day} color={theme.blue} />
          <ProgressBar label="Week" value={progress.week} color={theme.success} />
          <ProgressBar label="Month" value={progress.month} color={theme.warning} />
          <ProgressBar label="Year" value={progress.year} color={theme.accent} />
        </DashboardModule>

        <DashboardModule icon="edit-3" title="Recent notes" action="Library" onAction={() => navigation.navigate("LibraryTab")}>
          {notes.length ? notes.slice(0, 3).map((note) => (
            <DashboardRow
              key={note.id}
              icon="file-text"
              title={note.title || "Untitled note"}
              meta={new Date(note.updatedAt).toLocaleDateString()}
              onPress={() => navigation.navigate("LibraryTab", { screen: "NoteEditor", params: { noteId: note.id } })}
            />
          )) : <ModuleEmpty text="Personal notes will appear here." />}
        </DashboardModule>

        <DashboardModule icon="activity" title="Recent trainings" action="Open" onAction={() => openCollection("trainings")}>
          {workspace.life.trainings.length ? workspace.life.trainings.slice(0, 3).map((training) => (
            <DashboardRow key={training.id} icon="activity" title={training.title} meta={training.subtitle || training.date} color={theme.blue} />
          )) : <ModuleEmpty text="Log a training session and it will appear here." />}
        </DashboardModule>

        <DashboardModule icon="tool" title="Useful tools" action="Open" onAction={() => openCollection("tools")}>
          {workspace.life.tools.length ? workspace.life.tools.slice(0, 3).map((tool) => (
            <DashboardRow key={tool.id} icon="tool" title={tool.title} meta={tool.subtitle} color={theme.warning} />
          )) : <ModuleEmpty text="Keep frequently used links and resources here." />}
        </DashboardModule>

        <View style={styles.split}>
          <View style={styles.splitItem}>
            <DashboardModule icon="play" title="Watching" action="Open" onAction={() => openCollection("media")}>
              {watching.length ? watching.map((item) => (
                <DashboardRow key={item.id} icon="film" title={item.title} meta={item.subtitle} />
              )) : <ModuleEmpty text="Nothing queued." />}
            </DashboardModule>
          </View>
          <View style={styles.splitItem}>
            <DashboardModule icon="book-open" title="Reading" action="Open" onAction={() => openCollection("media")}>
              {reading.length ? reading.map((item) => (
                <DashboardRow key={item.id} icon="book" title={item.title} meta={item.subtitle} />
              )) : <ModuleEmpty text="No current book." />}
            </DashboardModule>
          </View>
        </View>

        <DashboardModule icon="compass" title="Life databases">
          <View style={styles.databaseGrid}>
            <DatabaseButton icon="check-circle" label="Habits" onPress={() => openCollection("habits")} />
            <DatabaseButton icon="coffee" label="Recipes" onPress={() => openCollection("recipes")} />
            <DatabaseButton icon="archive" label="Food storage" onPress={() => openCollection("food")} />
            <DatabaseButton icon="activity" label="Exercises" onPress={() => openCollection("exercises")} />
            <DatabaseButton icon="activity" label="Trainings" onPress={() => openCollection("trainings")} />
            <DatabaseButton icon="map" label="Trips" onPress={() => openCollection("trips")} />
            <DatabaseButton icon="book-open" label="Media" onPress={() => openCollection("media")} />
            <DatabaseButton icon="tool" label="Tools" onPress={() => openCollection("tools")} />
            <DatabaseButton icon="user" label="Contacts" onPress={() => openCollection("contacts")} />
            <DatabaseButton icon="file-text" label="Documents" onPress={() => openCollection("documents")} />
            <DatabaseButton icon="lock" label="Vault links" onPress={() => openCollection("vault")} />
            <DatabaseButton icon="camera" label="Gallery" onPress={() => openCollection("gallery")} />
            <DatabaseButton icon="archive" label="Archive" onPress={() => openCollection("archive")} />
          </View>
        </DashboardModule>

        <DashboardModule icon="headphones" title="Recent albums" action="Open" onAction={() => openCollection("media")}>
          {listening.length ? listening.map((item) => (
            <DashboardRow key={item.id} icon="headphones" title={item.title} meta={item.subtitle} color={theme.success} />
          )) : <ModuleEmpty text="Add music under Listening in Books & media." />}
        </DashboardModule>

        <DashboardModule icon="image" title="Vision board" action="Open" onAction={() => openCollection("vision")}>
          {workspace.life.vision.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.visionRow}>
              {workspace.life.vision.slice(0, 5).map((item) => (
                <Pressable key={item.id} onPress={() => openCollection("vision")} style={[styles.visionTile, { backgroundColor: theme.soft }]}>
                  {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.visionImage} /> : <Feather name="image" size={24} color={theme.accent} />}
                  <Text style={styles.visionLabel} numberOfLines={1}>{item.title}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : <ModuleEmpty text="Add images or links that keep the bigger picture visible." />}
        </DashboardModule>
      </ScrollView>
    </Page>
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
  greeting: { fontSize: 13, marginTop: 2 },
  nowButton: { width: 44, height: 44, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  quickRow: { gap: 7, paddingRight: 16 },
  rowAction: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginRight: -10 },
  habitSummary: { flexDirection: "row", alignItems: "baseline", gap: 6, paddingVertical: 8 },
  habitCount: { fontSize: 22, fontWeight: "800", fontVariant: ["tabular-nums"] },
  habitMeta: { fontSize: 12 },
  split: { gap: 18 },
  splitItem: { flex: 1 },
  databaseGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingVertical: 8 },
  databaseButton: { width: "48.5%", minHeight: 48, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 7 },
  databaseText: { flex: 1, fontSize: 12, fontWeight: "800" },
  visionRow: { gap: 10, paddingVertical: 8 },
  visionTile: { width: 142, height: 112, borderRadius: 8, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  visionImage: { width: "100%", height: "100%" },
  visionLabel: { position: "absolute", left: 6, right: 6, bottom: 6, borderRadius: 5, backgroundColor: "rgba(0,0,0,0.62)", color: "#FFF", padding: 6, fontSize: 11, fontWeight: "800" },
});
