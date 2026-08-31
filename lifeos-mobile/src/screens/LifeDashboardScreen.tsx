import Feather from "@expo/vector-icons/Feather";
import { useNavigation } from "@react-navigation/native";
import { useMemo } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { PlanTomorrowModal } from "../components/PlanTomorrowModal";
import { useState } from "react";
import { DashboardModule, DashboardRow, ModuleEmpty, ProgressBar, QuickAction } from "../components/HubDashboard";
import { Eyebrow, Page } from "../components/UI";
import { useFloatingTabBarContentPadding } from "../components/FloatingTabBar";
import { useLifeOS } from "../lib/LifeOSContext";
import { formatDueDate, getGreeting, taskIsOpen, toDateKey } from "../lib/helpers";
import {
  bumpHabit,
  habitKind,
  habitProgressLabel,
  isHabitDone,
  toggleHabitCheck,
} from "../lib/habits";
import { buildInbox } from "../lib/notifications";
import { useLayout } from "../lib/layout";
import { createNotebook, createPage, primaryPageForNotebook } from "../lib/notebooks";
import { filterLifeProjects, isWorkLinkedTask } from "../lib/workos";

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

/** Map projects / school into calm “life areas” — overview, not a task dump. */
const AREA_HINTS: { match: RegExp; icon: keyof typeof Feather.glyphMap; tint: "accent" | "blue" | "success" | "warning" | "danger" }[] = [
  { match: /synapse|ai|code|dev/i, icon: "zap", tint: "accent" },
  { match: /career|job|work|interview/i, icon: "briefcase", tint: "blue" },
  { match: /school|class|study|exam|gre|master/i, icon: "book", tint: "warning" },
  { match: /photo|camera|gallery/i, icon: "camera", tint: "success" },
  { match: /home|house|family/i, icon: "home", tint: "danger" },
  { match: /personal|life|health|habit/i, icon: "heart", tint: "accent" },
];

export function LifeDashboardScreen() {
  const { theme, workspace, updateTasks, updateNotebookHub, upsertNotebookPage, updateProjects, updateLife } =
    useLifeOS();
  const navigation = useNavigation<any>();
  const { isTablet } = useLayout();
  const tabBarPad = useFloatingTabBarContentPadding(28);
  const [planTomorrowOpen, setPlanTomorrowOpen] = useState(false);
  const now = new Date();
  const today = toDateKey(now);
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() + 7);
  const weekEndKey = toDateKey(weekEnd);
  const progress = periodProgress(now);
  const name = workspace.settings.preferredName?.trim() || "there";

  const lifeProjects = useMemo(
    () => filterLifeProjects(workspace.projects, workspace.work),
    [workspace.projects, workspace.work],
  );

  const openTasks = useMemo(
    () => workspace.tasks.filter((t) => !t.classId && !isWorkLinkedTask(t, workspace.work) && taskIsOpen(t)),
    [workspace.tasks, workspace.work],
  );

  const attention = useMemo(() => {
    return openTasks
      .filter((task) => {
        if (!task.due) return task.priority === "High";
        const key = task.due.slice(0, 10);
        return key <= today || task.priority === "High";
      })
      .sort((a, b) => {
        const aOver = (a.due?.slice(0, 10) ?? "9999") < today ? 0 : 1;
        const bOver = (b.due?.slice(0, 10) ?? "9999") < today ? 0 : 1;
        if (aOver !== bOver) return aOver - bOver;
        return (a.due ?? "9999").localeCompare(b.due ?? "9999");
      })
      .slice(0, 4);
  }, [openTasks, today]);

  const weekPulse = useMemo(() => {
    const events = [...workspace.calendar]
      .filter((e) => {
        const key = e.start.slice(0, 10);
        return key >= today && key <= weekEndKey;
      })
      .sort((a, b) => a.start.localeCompare(b.start))
      .slice(0, 4)
      .map((e) => ({
        id: `e-${e.id}`,
        title: e.title,
        meta: new Date(e.start).toLocaleString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }),
        color: e.color || theme.blue,
        icon: "calendar" as const,
        onPress: () => navigation.navigate("CalendarTab"),
      }));

    const deadlines = openTasks
      .filter((t) => t.due && t.due.slice(0, 10) >= today && t.due.slice(0, 10) <= weekEndKey)
      .filter((t) => t.academicType || t.priority === "High")
      .slice(0, 3)
      .map((t) => ({
        id: `t-${t.id}`,
        title: t.title,
        meta: `${t.academicType ? `${t.academicType} · ` : ""}${formatDueDate(t.due)}`,
        color: t.color || theme.warning,
        icon: "flag" as const,
        onPress: () => navigation.navigate("TasksTab", { screen: "TaskDetail", params: { taskId: t.id } }),
      }));

    return [...events, ...deadlines].slice(0, 5);
  }, [workspace.calendar, openTasks, today, weekEndKey, theme.blue, theme.warning, navigation]);

  const areas = useMemo(() => {
    return lifeProjects.slice(0, 6).map((project) => {
      const open = workspace.tasks.filter((task) => task.project === project.name && taskIsOpen(task)).length;
      const hint = AREA_HINTS.find((h) => h.match.test(project.name));
      const tintKey = hint?.tint ?? "accent";
      const color =
        project.color ||
        (tintKey === "blue"
          ? theme.blue
          : tintKey === "success"
            ? theme.success
            : tintKey === "warning"
              ? theme.warning
              : tintKey === "danger"
                ? theme.danger
                : theme.accent);
      return {
        project,
        open,
        icon: hint?.icon ?? ("folder" as const),
        color,
      };
    });
  }, [lifeProjects, workspace.tasks, theme]);

  const inboxCount = buildInbox(workspace).filter((i) => i.bucket === "today").length;
  const habitsDone = workspace.life.habits.filter((habit) => isHabitDone(habit, today)).length;
  const notes = useMemo(() => {
    const pageNotes = workspace.notebookHub.notebooks
      .filter((nb) => nb.context?.type !== "class" && !nb.trashedAt)
      .map((nb) => ({
        id: nb.id,
        title: nb.name,
        updatedAt: nb.updatedAt,
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
      }));
    return pageNotes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [workspace.notebookHub.notebooks, workspace.notebookPages, navigation]);

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
    const hub = workspace.notebookHub;
    const notebook = createNotebook("Untitled note", { context: { type: "personal", label: "Personal" } });
    const page = createPage(notebook.id, 0, "ruled");
    await updateNotebookHub({ ...hub, notebooks: [notebook, ...hub.notebooks] });
    await upsertNotebookPage(page);
    navigation.navigate("LibraryTab", {
      screen: "PageCanvas",
      params: { notebookId: notebook.id, pageId: page.id },
    });
  };

  const createProject = () => {
    Alert.prompt(
      "New project",
      "Give this project a name",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Create",
          onPress: async (value?: string) => {
            const nameNext = (value || "").trim() || `New project ${workspace.projects.length + 1}`;
            if (workspace.projects.some((p) => p.name === nameNext)) {
              Alert.alert("Name taken", "Another project already uses that name.");
              return;
            }
            await updateProjects([...workspace.projects, { name: nameNext, kind: "finishable", color: theme.accent }]);
            navigation.navigate("ProjectDetail", { projectName: nameNext });
          },
        },
      ],
      "plain-text",
    );
  };

  const toggleHabit = (id: string) => {
    updateLife({
      ...workspace.life,
      habits: workspace.life.habits.map((habit) => {
        if (habit.id !== id) return habit;
        const kind = habitKind(habit);
        if (kind === "check") return toggleHabitCheck(habit, today);
        return bumpHabit(habit, today, kind === "scale" ? 5 : 1);
      }),
    });
  };

  const adjustHabit = (id: string, delta: number) => {
    updateLife({
      ...workspace.life,
      habits: workspace.life.habits.map((habit) => (habit.id === id ? bumpHabit(habit, today, delta) : habit)),
    });
  };

  const openCollection = (collection: string, startAdd = false) =>
    navigation.navigate("HubCollection", { scope: "life", collection, startAdd });

  return (
    <Page>
      <ScrollView contentContainerStyle={[styles.screen, { paddingBottom: tabBarPad }]}>
        <View style={styles.header}>
          <View style={styles.grow}>
            <Eyebrow>
              {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }).toUpperCase()}
            </Eyebrow>
            <Text style={[styles.title, { color: theme.text }]}>HomeOS</Text>
            <Text style={[styles.greeting, { color: theme.muted }]}>{getGreeting(now, name)}</Text>
            <Text style={[styles.subGreeting, { color: theme.muted }]}>
              A quiet look at what’s going on — execution stays in Now.
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              accessibilityLabel="Notification inbox"
              onPress={() => navigation.navigate("NotificationCenter")}
              style={[styles.iconBtn, { backgroundColor: theme.soft }]}
            >
              <Feather name="bell" size={18} color={theme.accent} />
              {inboxCount > 0 ? (
                <View style={[styles.badge, { backgroundColor: theme.danger }]}>
                  <Text style={styles.badgeText}>{inboxCount > 9 ? "9+" : inboxCount}</Text>
                </View>
              ) : null}
            </Pressable>
            <Pressable
              accessibilityLabel="Open Now"
              onPress={() => navigation.navigate("NowTab")}
              style={[styles.iconBtn, { backgroundColor: theme.text }]}
            >
              <Feather name="zap" size={18} color={theme.surface} />
            </Pressable>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
          <QuickAction icon="edit-3" label="New note" onPress={createNote} />
          <QuickAction icon="check-square" label="New task" onPress={createTask} color={theme.blue} />
          <QuickAction icon="folder-plus" label="New project" onPress={createProject} color={theme.warning} />
          <QuickAction
            icon="calendar"
            label="Day signals"
            onPress={() => navigation.navigate("LifeDay")}
            color={theme.success}
          />
          <QuickAction icon="sun" label="Plan tomorrow" onPress={() => setPlanTomorrowOpen(true)} color={theme.accent} />
          <QuickAction icon="map" label="Trip idea" onPress={() => openCollection("trips", true)} color={theme.success} />
          {isTablet && workspace.settings.enableMasterOS !== false ? (
            <QuickAction
              icon="book-open"
              label="MasterOS"
              onPress={() => navigation.navigate("MasterOS")}
              color={theme.blue}
            />
          ) : null}
        </ScrollView>

        <DashboardModule
          icon="activity"
          title="Day signals"
          action="Open"
          onAction={() => navigation.navigate("LifeDay")}
        >
          <DashboardRow
            icon="calendar"
            title="Day log calendar"
            meta="Colored dots for habits, focus, memories, body, and more"
            color={theme.accent}
            onPress={() => navigation.navigate("LifeDay")}
          />
        </DashboardModule>

        <DashboardModule
          icon="alert-circle"
          title="Needs attention"
          action="Tasks"
          onAction={() => navigation.navigate("TasksTab")}
        >
          {attention.length ? (
            attention.map((task) => {
              const overdue = Boolean(task.due && task.due.slice(0, 10) < today);
              return (
                <DashboardRow
                  key={task.id}
                  icon={overdue ? "alert-triangle" : "flag"}
                  title={task.title}
                  meta={`${task.project ?? "Inbox"} · ${formatDueDate(task.due)}${task.priority === "High" ? " · High" : ""}`}
                  color={overdue ? theme.danger : task.color || theme.warning}
                  onPress={() => navigation.navigate("TasksTab", { screen: "TaskDetail", params: { taskId: task.id } })}
                />
              );
            })
          ) : (
            <ModuleEmpty text="Nothing pressing. Enjoy the calm — or pick something up in Now." />
          )}
        </DashboardModule>

        <DashboardModule
          icon="calendar"
          title="This week"
          action="Calendar"
          onAction={() => navigation.navigate("CalendarTab")}
        >
          {weekPulse.length ? (
            weekPulse.map((item) => (
              <DashboardRow
                key={item.id}
                icon={item.icon}
                title={item.title}
                meta={item.meta}
                color={item.color}
                onPress={item.onPress}
              />
            ))
          ) : (
            <ModuleEmpty text="No events or deadlines in the next seven days." />
          )}
        </DashboardModule>

        <DashboardModule
          icon="layers"
          title="Active areas"
          action="Projects"
          onAction={() => navigation.navigate("ProjectsDirectory")}
        >
          {areas.length ? (
            <View style={styles.areaGrid}>
              {areas.map(({ project, open, icon, color }) => (
                <Pressable
                  key={project.name}
                  onPress={() => navigation.navigate("ProjectDetail", { projectName: project.name })}
                  style={[styles.areaCard, { borderColor: theme.border, backgroundColor: theme.surface }]}
                >
                  <View style={[styles.areaIcon, { backgroundColor: `${color}22` }]}>
                    <Feather name={icon} size={16} color={color} />
                  </View>
                  <Text style={[styles.areaTitle, { color: theme.text }]} numberOfLines={1}>
                    {project.name}
                  </Text>
                  <Text style={{ color: theme.muted, fontSize: 11, fontWeight: "600" }}>
                    {open} open · {project.kind === "maintenance" ? "Ongoing" : "Finishable"}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <ModuleEmpty text="Projects become life areas here — Career, School, Home, and the rest." />
          )}
        </DashboardModule>

        <DashboardModule icon="trending-up" title="Momentum">
          <ProgressBar label="Day" value={progress.day} color={theme.blue} />
          <ProgressBar label="Week" value={progress.week} color={theme.success} />
          <ProgressBar label="Month" value={progress.month} color={theme.warning} />
          <View style={styles.habitSummary}>
            <Text style={[styles.habitCount, { color: theme.text }]}>
              {habitsDone}/{workspace.life.habits.length || 0}
            </Text>
            <Text style={[styles.habitMeta, { color: theme.muted }]}>habits today</Text>
            <Pressable onPress={() => openCollection("habits")} hitSlop={8}>
              <Text style={{ color: theme.accent, fontWeight: "800", fontSize: 12 }}>Manage</Text>
            </Pressable>
          </View>
          {workspace.life.habits.slice(0, 3).map((habit) => {
            const done = isHabitDone(habit, today);
            const kind = habitKind(habit);
            return (
              <DashboardRow
                key={habit.id}
                icon={done ? "check" : kind === "check" ? "circle" : "plus-circle"}
                title={habit.title}
                meta={habitProgressLabel(habit, today)}
                color={done ? theme.success : theme.accent}
                onPress={() => toggleHabit(habit.id)}
                trailing={
                  kind !== "check" ? (
                    <Pressable
                      accessibilityLabel={`Add progress to ${habit.title}`}
                      hitSlop={8}
                      onPress={() => adjustHabit(habit.id, kind === "scale" ? 5 : 1)}
                      style={[styles.habitPlus, { borderColor: theme.border, backgroundColor: theme.soft }]}
                    >
                      <Feather name="plus" size={14} color={theme.accent} />
                    </Pressable>
                  ) : undefined
                }
              />
            );
          })}
        </DashboardModule>

        <DashboardModule icon="edit-3" title="Recent notes" action="Library" onAction={() => navigation.navigate("LibraryTab")}>
          {notes.length ? (
            notes.slice(0, 3).map((note) => (
              <DashboardRow
                key={note.id}
                icon="edit-3"
                title={note.title}
                meta={new Date(note.updatedAt).toLocaleDateString()}
                onPress={note.open}
              />
            ))
          ) : (
            <ModuleEmpty text="Handwritten and typed notes will appear here." />
          )}
        </DashboardModule>

        <DashboardModule icon="compass" title="Life databases">
          <View style={styles.databaseGrid}>
            <DatabaseButton icon="check-circle" label="Habits" onPress={() => openCollection("habits")} />
            <DatabaseButton icon="coffee" label="Recipes" onPress={() => openCollection("recipes")} />
            <DatabaseButton icon="activity" label="Trainings" onPress={() => openCollection("trainings")} />
            <DatabaseButton icon="map" label="Trips" onPress={() => openCollection("trips")} />
            <DatabaseButton icon="book-open" label="Media" onPress={() => openCollection("media")} />
            <DatabaseButton icon="camera" label="Gallery" onPress={() => openCollection("gallery")} />
            <DatabaseButton icon="tool" label="Tools" onPress={() => openCollection("tools")} />
            <DatabaseButton icon="image" label="Vision" onPress={() => openCollection("vision")} />
          </View>
        </DashboardModule>

        <DashboardModule icon="image" title="Vision board" action="Open" onAction={() => openCollection("vision")}>
          {workspace.life.vision.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.visionRow}>
              {workspace.life.vision.slice(0, 5).map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => openCollection("vision")}
                  style={[styles.visionTile, { backgroundColor: theme.soft }]}
                >
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.visionImage} />
                  ) : (
                    <Feather name="image" size={24} color={theme.accent} />
                  )}
                  <Text style={styles.visionLabel} numberOfLines={1}>
                    {item.title}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <ModuleEmpty text="Add images or links that keep the bigger picture visible." />
          )}
        </DashboardModule>
      </ScrollView>
      <PlanTomorrowModal visible={planTomorrowOpen} onClose={() => setPlanTomorrowOpen(false)} />
    </Page>
  );
}

function DatabaseButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const { theme } = useLifeOS();
  return (
    <Pressable onPress={onPress} style={[styles.databaseButton, { borderColor: theme.border }]}>
      <Feather name={icon} size={15} color={theme.blue} />
      <Text style={[styles.databaseText, { color: theme.text }]}>{label}</Text>
      <Feather name="chevron-right" size={14} color={theme.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 16, paddingBottom: 28, gap: 18 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  grow: { flex: 1, minWidth: 0 },
  title: { fontSize: 32, fontWeight: "800", marginTop: 2, letterSpacing: -0.4 },
  greeting: { fontSize: 15, marginTop: 4, fontWeight: "600" },
  subGreeting: { fontSize: 12, marginTop: 4, lineHeight: 17 },
  headerActions: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "#FFF", fontSize: 9, fontWeight: "800" },
  quickRow: { flexGrow: 1, justifyContent: "center", alignItems: "center", gap: 14 },
  areaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingVertical: 6 },
  areaCard: {
    width: "48.5%",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    minHeight: 88,
  },
  areaIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  areaTitle: { fontSize: 14, fontWeight: "800" },
  habitSummary: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    paddingVertical: 8,
  },
  habitCount: { fontSize: 22, fontWeight: "800", fontVariant: ["tabular-nums"] },
  habitMeta: { fontSize: 12, flex: 1 },
  habitPlus: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  databaseGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingVertical: 8 },
  databaseButton: {
    width: "48.5%",
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  databaseText: { flex: 1, fontSize: 12, fontWeight: "800" },
  visionRow: { gap: 10, paddingVertical: 8 },
  visionTile: {
    width: 142,
    height: 112,
    borderRadius: 10,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  visionImage: { width: "100%", height: "100%" },
  visionLabel: {
    position: "absolute",
    left: 6,
    right: 6,
    bottom: 6,
    borderRadius: 5,
    backgroundColor: "rgba(0,0,0,0.62)",
    color: "#FFF",
    padding: 6,
    fontSize: 11,
    fontWeight: "800",
  },
});
