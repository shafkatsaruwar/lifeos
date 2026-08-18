import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Card, Empty, Eyebrow, IconButton, Page } from "../components/UI";
import { QuickCaptureModal } from "../components/QuickCaptureModal";
import { FocusModal } from "../components/FocusModal";
import { SearchModal } from "../components/SearchModal";
import { useLifeOS } from "../lib/LifeOSContext";
import { formatDueDate, getGreeting, toDateKey } from "../lib/helpers";

export function DashboardScreen() {
  const { theme, workspace, updateTasks } = useLifeOS();
  const navigation = useNavigation<any>();
  const [now, setNow] = useState(() => new Date());
  const [captureOpen, setCaptureOpen] = useState(false);
  const [focusTaskId, setFocusTaskId] = useState<number | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const activeTasks = workspace.tasks.filter((t) => !t.done && !t.canceled);
  const topThree = activeTasks.slice(0, 3);
  const todayKey = toDateKey(now);
  const todayEvents = workspace.calendar.filter((e) => e.start.slice(0, 10) === todayKey).sort((a, b) => a.start.localeCompare(b.start));
  const todayOther = activeTasks.filter((t) => t.due === todayKey && !topThree.includes(t));
  const nextTask = activeTasks[0];
  const spaceLabel = (task: (typeof activeTasks)[number]) => workspace.classes.find((c) => c.id === task.classId)?.code ?? task.project;

  const dashboardSpaces = [
    ...workspace.classes.slice(0, 3).map((c) => ({ key: `class-${c.id}`, name: c.code, detail: c.name, color: c.color || theme.accent, kind: "Class" as const, classId: c.id, projectName: null as string | null })),
    ...workspace.projects.map((p) => ({ key: `project-${p.name}`, name: p.name, detail: p.desc, color: p.color || theme.accent, kind: (p.kind === "maintenance" ? "Maintenance" : "Project") as "Maintenance" | "Project", classId: null as string | null, projectName: p.name })),
  ].slice(0, 3);

  const complete = (id: number) => updateTasks(workspace.tasks.map((t) => (t.id === id ? { ...t, done: true, status: "Done" } : t)));

  const focusTask = workspace.tasks.find((t) => t.id === focusTaskId);

  return (
    <Page>
      <ScrollView contentContainerStyle={styles.screen}>
        <View style={styles.welcomeRow}>
          <View style={styles.grow}>
            <Eyebrow>{now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</Eyebrow>
            <Text style={[styles.greeting, { color: theme.text }]}>{getGreeting(now, workspace.settings.preferredName || "there")}</Text>
            <Text style={[styles.sub, { color: theme.muted }]}>Here's what deserves your attention today.</Text>
          </View>
          <IconButton icon="zap" label="Now / ambient tracking" onPress={() => navigation.navigate("NowTab")} />
          <IconButton icon="search" label="Search LifeOS" onPress={() => setSearchOpen(true)} />
          <View style={[styles.dayScore, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.dayScoreLabel, { color: theme.muted }]}>TODAY</Text>
            {topThree.length === 0 && activeTasks.length === 0 ? (
              <Text style={[styles.dayScoreValue, { color: theme.text }]}>All done</Text>
            ) : (
              <Text style={[styles.dayScoreValue, { color: theme.text }]}>{topThree.length}/{activeTasks.length}</Text>
            )}
          </View>
        </View>

        <Card>
          <View style={styles.cardHead}>
            <View style={[styles.sectionIcon, { backgroundColor: "#665DF622" }]}><Feather name="zap" size={13} color="#665DF6" /></View>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Today's priorities</Text>
            <Pressable onPress={() => navigation.navigate("TasksTab")} style={styles.grow}>
              <Text style={[styles.cardAction, { color: theme.accent }]}>Plan day →</Text>
            </Pressable>
          </View>
          {topThree.length ? (
            topThree.map((task, i) => (
              <Pressable key={task.id} onPress={() => navigation.navigate("TasksTab", { screen: "TaskDetail", params: { taskId: task.id } })} style={styles.priorityRow}>
                <Pressable onPress={() => complete(task.id)} style={[styles.numberCheck, { borderColor: theme.border }]}>
                  <Text style={{ color: theme.muted, fontSize: 11, fontWeight: "800" }}>{i + 1}</Text>
                </Pressable>
                <View style={styles.grow}>
                  <Text style={[styles.priorityTitle, { color: theme.text }]} numberOfLines={1}>{task.title}</Text>
                  <Text style={[styles.priorityMeta, { color: theme.muted }]} numberOfLines={1}>
                    {spaceLabel(task)} · {formatDueDate(task.due)} · {task.focusMinutes ?? 30} min · {task.energy ?? "Medium"} energy
                  </Text>
                </View>
                <Pressable onPress={() => setFocusTaskId(task.id)} style={[styles.focusIconButton, { backgroundColor: theme.soft }]}>
                  <Feather name="target" size={14} color={theme.accent} />
                </Pressable>
              </Pressable>
            ))
          ) : (
            <Empty title="No priorities right now." body="Clean slate. Add one when your brain hands you the next thing." />
          )}
          {todayOther.length ? (
            <View style={[styles.otherBlock, { borderTopColor: theme.border }]}>
              <Text style={[styles.otherLabel, { color: theme.muted }]}>TODAY'S OTHER TASKS</Text>
              {todayOther.slice(0, 2).map((task) => (
                <Pressable key={task.id} onPress={() => navigation.navigate("TasksTab", { screen: "TaskDetail", params: { taskId: task.id } })} style={styles.otherRow}>
                  <Text style={{ color: theme.muted }}>•</Text>
                  <Text style={{ color: theme.text, flex: 1, fontSize: 13 }} numberOfLines={1}>{task.title}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </Card>

        <Pressable
          onPress={() => (nextTask ? setFocusTaskId(nextTask.id) : navigation.navigate("TasksTab"))}
          style={[styles.focusCard, { backgroundColor: "#16151C" }]}
        >
          <View style={styles.cardHeadDark}>
            <View style={[styles.sectionIcon, { backgroundColor: "#FFFFFF22" }]}><Feather name="target" size={13} color="#FFF" /></View>
            <Text style={styles.focusCardTitle}>Next focus</Text>
            <Text style={styles.focusReady}>{nextTask ? "Ready" : "Clear"}</Text>
          </View>
          <Text style={styles.focusSpace}>{nextTask ? spaceLabel(nextTask) : "You're all caught up"}</Text>
          <Text style={styles.focusTitle}>{nextTask?.title ?? "What should we work on next?"}</Text>
          {nextTask ? (
            <Text style={styles.focusMeta}>{nextTask.focusMinutes ?? 30} min · {nextTask.energy ?? "Medium"} energy</Text>
          ) : null}
          <View style={[styles.focusStartButton, { backgroundColor: theme.accent }]}>
            <Feather name="play" size={14} color="#FFF" />
            <Text style={styles.focusStartText}>{nextTask ? "Start focus session" : "Add priority"}</Text>
          </View>
        </Pressable>

        <Card>
          <View style={styles.cardHead}>
            <View style={[styles.sectionIcon, { backgroundColor: "#3F7ED722" }]}><Feather name="calendar" size={13} color="#3F7ED7" /></View>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Today's schedule</Text>
            <Pressable onPress={() => navigation.navigate("CalendarTab")} style={styles.grow}>
              <Text style={[styles.cardAction, { color: theme.accent }]}>View calendar →</Text>
            </Pressable>
          </View>
          {todayEvents.length ? (
            todayEvents.map((event) => {
              const start = new Date(event.start);
              const end = event.end ? new Date(event.end) : new Date(start.getTime() + 45 * 60000);
              return (
                <View key={event.id} style={styles.eventRow}>
                  <View style={styles.eventTime}>
                    <Text style={[styles.eventTimeText, { color: theme.text }]}>{start.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</Text>
                    <Text style={[styles.eventTimeSub, { color: theme.muted }]}>{end.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</Text>
                  </View>
                  <View style={[styles.eventLine, { backgroundColor: event.color || theme.accent }]} />
                  <View style={styles.grow}>
                    <Text style={[styles.eventTitle, { color: theme.text }]} numberOfLines={1}>{event.title}</Text>
                    <Text style={[styles.eventNotes, { color: theme.muted }]} numberOfLines={1}>
                      {event.source === "Synapse"
                        ? event.notes || "Synapse"
                        : event.notes || (event.source === "LifeOS" ? "Focus block" : event.source)}
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <Empty title="No events scheduled for today" body="Share a day plan from Synapse → Settings → LifeOS to see meds and appointments here." />
          )}
        </Card>

        <Card>
          <View style={styles.cardHead}>
            <View style={[styles.sectionIcon, { backgroundColor: "#D3823222" }]}><Feather name="grid" size={13} color="#D38232" /></View>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Active spaces</Text>
            <Pressable onPress={() => navigation.navigate("SpacesTab")} style={styles.grow}>
              <Text style={[styles.cardAction, { color: theme.accent }]}>All spaces →</Text>
            </Pressable>
          </View>
          {dashboardSpaces.length ? (
            dashboardSpaces.map((space) => (
              <Pressable
                key={space.key}
                onPress={() => (space.projectName
                  ? navigation.navigate("SpacesTab", { screen: "ProjectDetail", params: { projectName: space.projectName } })
                  : navigation.navigate("SpacesTab", { screen: "ClassDetail", params: { classId: space.classId } }))}
                style={styles.spaceRow}
              >
                <View style={[styles.spaceGlyph, { backgroundColor: `${space.color}22` }]}>
                  <Feather name={space.kind === "Class" ? "book-open" : "folder"} size={16} color={space.color} />
                </View>
                <View style={styles.grow}>
                  <Text style={{ color: theme.text, fontWeight: "800" }} numberOfLines={1}>{space.name}</Text>
                  <Text style={{ color: theme.muted, fontSize: 11 }}>{space.kind}</Text>
                </View>
              </Pressable>
            ))
          ) : (
            <Empty title="No spaces yet." body="Create a project or class to get started." />
          )}
        </Card>

        <Card>
          <View style={styles.cardHead}>
            <View style={[styles.sectionIcon, { backgroundColor: "#31926A22" }]}><Feather name="cpu" size={13} color="#31926A" /></View>
            <Text style={[styles.cardTitle, { color: theme.text }]}>MindDump</Text>
            <Pressable onPress={() => navigation.navigate("LibraryTab", { screen: "Brain" })} style={styles.grow}>
              <Text style={[styles.cardAction, { color: theme.accent, textAlign: "right" }]}>{workspace.brain.length} uncategorized →</Text>
            </Pressable>
          </View>
          <Pressable onPress={() => setCaptureOpen(true)} style={[styles.captureZone, { borderColor: theme.border, backgroundColor: theme.bg }]}>
            <Feather name="plus" size={16} color={theme.accent} />
            <View style={styles.grow}>
              <Text style={{ color: theme.text, fontWeight: "800" }}>Capture what's on your mind</Text>
              <Text style={{ color: theme.muted, fontSize: 12 }}>Idea, thought, link, anything…</Text>
            </View>
          </Pressable>
        </Card>

        <Text style={[styles.quote, { color: theme.muted }]}>"The main thing is to keep the main thing the main thing." — Stephen Covey</Text>
      </ScrollView>
      <QuickCaptureModal visible={captureOpen} onClose={() => setCaptureOpen(false)} />
      {focusTask ? <FocusModal visible={Boolean(focusTaskId)} task={focusTask} onClose={() => setFocusTaskId(null)} /> : null}
      <SearchModal visible={searchOpen} onClose={() => setSearchOpen(false)} />
    </Page>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 20, paddingBottom: 28, gap: 16 },
  welcomeRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  grow: { flex: 1 },
  greeting: { fontSize: 26, fontWeight: "700", marginTop: 4 },
  sub: { fontSize: 13, marginTop: 4 },
  dayScore: { alignItems: "center", borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, minWidth: 84 },
  dayScoreLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 0.6 },
  dayScoreValue: { fontSize: 20, fontWeight: "800", marginTop: 2 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  cardHeadDark: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  sectionIcon: { width: 24, height: 24, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 15, fontWeight: "800" },
  cardAction: { fontSize: 12, fontWeight: "700", textAlign: "right" },
  priorityRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  numberCheck: { width: 26, height: 26, borderRadius: 8, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  priorityTitle: { fontSize: 14, fontWeight: "800" },
  priorityMeta: { fontSize: 11, marginTop: 2 },
  focusIconButton: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  otherBlock: { borderTopWidth: 1, marginTop: 8, paddingTop: 10, gap: 4 },
  otherLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 0.6 },
  otherRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  focusCard: { borderRadius: 20, padding: 18, gap: 4 },
  focusCardTitle: { color: "#FFF", fontWeight: "800", fontSize: 15, flex: 1 },
  focusReady: { color: "#78E0AF", fontSize: 11, fontWeight: "800" },
  focusSpace: { color: "#A79DFF", fontSize: 12, fontWeight: "700" },
  focusTitle: { color: "#FFF", fontSize: 20, fontWeight: "800", marginTop: 2 },
  focusMeta: { color: "#B7B4C2", fontSize: 12, marginTop: 4 },
  focusStartButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 46, borderRadius: 12, marginTop: 12 },
  focusStartText: { color: "#FFF", fontWeight: "800", fontSize: 14 },
  eventRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  eventTime: { width: 56, alignItems: "flex-start" },
  eventTimeText: { fontSize: 12, fontWeight: "800" },
  eventTimeSub: { fontSize: 10 },
  eventLine: { width: 3, height: 30, borderRadius: 2 },
  eventTitle: { fontSize: 14, fontWeight: "800" },
  eventNotes: { fontSize: 11, marginTop: 1 },
  spaceRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  spaceGlyph: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  countLabel: { fontSize: 11, fontWeight: "700", textAlign: "right" },
  captureZone: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 14, borderStyle: "dashed", padding: 14 },
  quote: { fontSize: 12, fontStyle: "italic", textAlign: "center", marginTop: 6 },
});
