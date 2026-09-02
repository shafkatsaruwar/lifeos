import Feather from "@expo/vector-icons/Feather";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ActionButton, Eyebrow, IconButton, Page, Title } from "../components/UI";
import { TimesheetNowStrip } from "../components/TimesheetNowStrip";
import { useFloatingTabBarContentPadding } from "../components/FloatingTabBar";
import { SearchModal } from "../components/SearchModal";
import { useLifeOS } from "../lib/LifeOSContext";
import { formatAmbientDuration, getGreeting, taskIsOpen, toDateKey } from "../lib/helpers";
import { useLayout } from "../lib/layout";
import { clockIn, clockOut, getActiveEntry } from "../lib/timeTracking";
import { FocusModal } from "../components/FocusModal";
import { TodayBriefSection } from "../components/TodayBriefSection";
import { buildNowGlance } from "../lib/nowGlance";
import { AmbientStartModal, AmbientWrapupModal, BreakModal } from "../components/AmbientModals";
import { AiTaskModal } from "../components/AiTaskModal";
import { RecordMemoryModal } from "../components/RecordMemoryModal";
import {
  buildCaptureCommands,
  filterCaptureCommands,
  isInstantCaptureShortcut,
  resolveCaptureAction,
} from "../lib/captureCommands";
import { createNotebook, createPage } from "../lib/notebooks";
import {
  captureAddWorkDeliverable,
  captureAddWorkMeeting,
  captureAddWorkProject,
  captureAddWorkTask,
} from "../lib/workos";
import type { Project, Task } from "../types";

export function NowScreen() {
  const {
    workspace,
    theme,
    updateSettings,
    updateTasks,
    updateProjects,
    updateWork,
    updateTimeTracking,
    upsertNotebookPage,
    updateNotebookHub,
  } = useLifeOS();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { isTablet } = useLayout();
  const tabBarPad = useFloatingTabBarContentPadding(28);
  const [focusOpen, setFocusOpen] = useState(false);
  const [aiTaskOpen, setAiTaskOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [ambientWrapupOpen, setAmbientWrapupOpen] = useState(false);
  const [ambientStartOpen, setAmbientStartOpen] = useState(false);
  const [breakOpen, setBreakOpen] = useState(false);
  const [captureInput, setCaptureInput] = useState("");
  const [captureFocused, setCaptureFocused] = useState(false);
  const captureBlurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const openTimesheet = () =>
    navigation.navigate("WorkTab", { screen: "WorkDashboard", params: { openTimesheet: true } });

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(
    () => () => {
      if (captureBlurTimer.current) clearTimeout(captureBlurTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!route.params?.openFocus) return;
    const focusTask =
      workspace.tasks.find((t) => t.focusSessionRunning && taskIsOpen(t)) ||
      workspace.tasks.find((t) => t.focusSessionStarted && taskIsOpen(t) && (t.focusRemainingSeconds ?? 0) > 0);
    if (focusTask) {
      if (workspace.settings.nowTaskId !== focusTask.id) {
        void updateSettings({ ...workspace.settings, nowTaskId: focusTask.id });
      }
      setFocusOpen(true);
    }
    navigation.setParams?.({ openFocus: undefined });
  }, [route.params?.openFocus, workspace.tasks]);

  const current = workspace.tasks.find((task) => task.id === workspace.settings.nowTaskId && taskIsOpen(task));
  const focusTask =
    current ||
    workspace.tasks.find((t) => t.focusSessionRunning && taskIsOpen(t)) ||
    workspace.tasks.find((t) => t.focusSessionStarted && taskIsOpen(t) && (t.focusRemainingSeconds ?? 0) > 0);

  const showCaptureCommands = workspace.settings.showCaptureCommands !== false;
  const enableWorkOS = workspace.settings.enableWorkOS !== false;
  const enableStudyAbroad = workspace.settings.enableStudyAbroad !== false;
  const enableMasterOS = workspace.settings.enableMasterOS !== false;
  const commands = useMemo(
    () => buildCaptureCommands({ enableWorkOS, enableStudyAbroad, enableMasterOS }),
    [enableWorkOS, enableStudyAbroad, enableMasterOS],
  );
  const captureQuery = captureInput.startsWith("/") ? captureInput.trim().toLowerCase() : "";
  const filteredCommands = useMemo(() => {
    if (!captureQuery) return showCaptureCommands && captureFocused ? commands : [];
    return filterCaptureCommands(commands, captureQuery);
  }, [captureQuery, captureFocused, commands, showCaptureCommands]);
  const showSuggestions =
    filteredCommands.length > 0 && (captureFocused || Boolean(captureQuery));

  const finishCaptureCommand = () => {
    if (captureBlurTimer.current) clearTimeout(captureBlurTimer.current);
    setCaptureInput("");
    setCaptureFocused(false);
  };

  const addCapturedTask = (title: string, minor?: boolean) => {
    const id = Date.now();
    const task: Task = {
      id,
      title: title.trim() || "New task",
      project: "Inbox",
      priority: minor ? "Low" : "Medium",
      focusMinutes: minor ? 5 : workspace.settings.defaultFocusMinutes ?? 30,
      energy: minor ? "Low" : workspace.settings.defaultEnergy ?? "Medium",
      status: "Not started",
      checklist: [],
      checklistProgress: [],
    };
    void updateTasks([...workspace.tasks, task]);
    if (!workspace.settings.nowTaskId) {
      void updateSettings({ ...workspace.settings, nowTaskId: id });
    }
  };

  const addCapturedAssignment = (title: string) => {
    const activeClasses = workspace.classes.filter((course) => !course.archived);
    if (!activeClasses.length) {
      Alert.alert("Add a course first", "Assignments need a course in School OS.");
      navigation.navigate("SchoolTab", { screen: "AcademicCreate", params: { kind: "course" } });
      return;
    }
    const course = activeClasses[0];
    void updateTasks([
      ...workspace.tasks,
      {
        id: Date.now(),
        title: title.trim() || "New assignment",
        classId: course.id,
        project: "Inbox",
        color: course.color ?? theme.accent,
        due: toDateKey(new Date()),
        priority: "Medium",
        academicType: "Assignment",
        focusMinutes: workspace.settings.defaultFocusMinutes ?? 45,
        energy: workspace.settings.defaultEnergy ?? "Medium",
        status: "Not started",
        checklist: [],
        checklistProgress: [],
      },
    ]);
  };

  const runCaptureCommand = (raw: string) => {
    const action = resolveCaptureAction(raw, { enableWorkOS, enableStudyAbroad, enableMasterOS });
    if (action.type === "none") return false;
    if (action.type === "insertPrefix") {
      setCaptureInput(action.text);
      return true;
    }
    if (action.type === "workDisabled") {
      Alert.alert("Work OS off", "Enable Work OS in Settings to use /w work commands.");
      finishCaptureCommand();
      return true;
    }
    if (action.type === "studyAbroadWebOnly") {
      Alert.alert("Study Abroad", "Study Abroad capture commands are available on the LifeOS web app.");
      finishCaptureCommand();
      return true;
    }
    if (action.type === "instant") {
      switch (action.command) {
        case "clock": {
          const active = getActiveEntry(workspace.timeTracking);
          if (active) void updateTimeTracking(clockOut(workspace.timeTracking));
          else {
            void updateTimeTracking(
              clockIn(workspace.timeTracking, {
                clientName: workspace.timeTracking.defaultClientName,
                title: current?.title || "Work session",
              }),
            );
          }
          break;
        }
        case "timesheet":
          openTimesheet();
          break;
        case "focus":
          if (focusTask) setFocusOpen(true);
          break;
        case "break":
          setBreakOpen(true);
          break;
        case "ambient":
          setAmbientStartOpen(true);
          break;
        case "ai":
          setAiTaskOpen(true);
          break;
        case "spaces":
          navigation.navigate("LifeTab", { screen: "ProjectsDirectory" });
          break;
        case "masteros":
          if (isTablet) navigation.navigate("MasterOS");
          else Alert.alert("MasterOS", "MasterOS is available on iPad and at lifeos web /masteros.");
          break;
      }
      finishCaptureCommand();
      return true;
    }
    if (action.type === "addTask") {
      addCapturedTask(action.title, action.minor);
      finishCaptureCommand();
      return true;
    }
    if (action.type === "addAssignment") {
      addCapturedAssignment(action.title);
      finishCaptureCommand();
      return true;
    }
    if (action.type === "addProject") {
      const name = action.name.trim() || "New project";
      if (workspace.projects.some((p) => p.name === name)) {
        Alert.alert("Name taken", "Another project already uses that name.");
      } else {
        const project: Project = {
          name,
          color: workspace.projects.length % 2 === 0 ? "#625af6" : "#4b8bdc",
          kind: "finishable",
        };
        void updateProjects([...workspace.projects, project]);
      }
      finishCaptureCommand();
      return true;
    }
    if (action.type === "addNote") {
      const notebook = createNotebook(action.title.trim() || "Untitled note", {
        context: { type: "personal", label: "Personal" },
      });
      const page = createPage(notebook.id, 0, "ruled");
      void updateNotebookHub({
        ...workspace.notebookHub,
        notebooks: [notebook, ...workspace.notebookHub.notebooks],
      }).then(() => upsertNotebookPage(page));
      finishCaptureCommand();
      navigation.navigate("LibraryTab", {
        screen: "PageCanvas",
        params: { notebookId: notebook.id, pageId: page.id },
      });
      return true;
    }
    if (action.type === "addWorkTask") {
      void updateWork(captureAddWorkTask(workspace.work, action.title));
      finishCaptureCommand();
      return true;
    }
    if (action.type === "addWorkProject") {
      void updateWork(captureAddWorkProject(workspace.work, action.name));
      finishCaptureCommand();
      return true;
    }
    if (action.type === "addWorkDeliverable") {
      void updateWork(captureAddWorkDeliverable(workspace.work, action.title));
      finishCaptureCommand();
      return true;
    }
    if (action.type === "addWorkMeeting") {
      void updateWork(captureAddWorkMeeting(workspace.work, action.title));
      finishCaptureCommand();
      return true;
    }
    return false;
  };

  const handleCaptureFocus = () => {
    if (captureBlurTimer.current) clearTimeout(captureBlurTimer.current);
    setCaptureFocused(true);
  };

  const handleCaptureBlur = () => {
    captureBlurTimer.current = setTimeout(() => setCaptureFocused(false), 160);
  };

  const greeting = getGreeting(new Date(), workspace.settings.preferredName || "there");
  const ambient = workspace.settings.ambientActivity;
  const glance = useMemo(
    () =>
      buildNowGlance({
        tasks: workspace.tasks,
        calendar: workspace.calendar,
        habits: workspace.life.habits,
        settings: workspace.settings,
        memories: workspace.settings.dayMemories,
      }),
    [workspace.tasks, workspace.calendar, workspace.life.habits, workspace.settings],
  );

  const shell = {
    backgroundColor: theme.surface,
    borderColor: theme.border,
  };

  return (
    <Page>
      <ScrollView contentContainerStyle={[styles.screen, { paddingBottom: tabBarPad }]}>
        <View style={styles.headerRow}>
          <View style={styles.grow}>
            <Eyebrow>ONE THING, ON PURPOSE</Eyebrow>
            <Title>{greeting}</Title>
          </View>
          <IconButton icon="search" label="Search LifeOS" onPress={() => setSearchOpen(true)} />
          <IconButton icon="settings" label="Settings" onPress={() => navigation.navigate("Settings")} />
        </View>
        <Text style={[styles.lede, { color: theme.muted }]}>
          One thing in front of you. The rest of the house is a glance away.
        </Text>

        {!ambient ? (
          <View style={styles.captureWrap}>
            <View style={[styles.captureBar, { borderColor: theme.border, backgroundColor: theme.surface }]}>
              <Feather name="terminal" size={16} color={theme.accent} />
              <TextInput
                value={captureInput}
                onChangeText={setCaptureInput}
                placeholder="Tap for commands, or type /"
                placeholderTextColor={theme.muted}
                returnKeyType="go"
                onFocus={handleCaptureFocus}
                onBlur={handleCaptureBlur}
                onSubmitEditing={() => {
                  if (runCaptureCommand(captureInput)) return;
                  if (captureInput.trim()) {
                    addCapturedTask(captureInput.trim());
                    finishCaptureCommand();
                  }
                }}
                style={[styles.captureInput, { color: theme.text }]}
              />
            </View>
            <Text style={[styles.captureHint, { color: theme.muted }]}>
              /t · /tm · /asg · /break · /focus · /a · /clock
              {enableWorkOS ? " · /w task" : ""}
              {enableMasterOS ? " · /mos" : ""}
            </Text>
            {showSuggestions ? (
              <View style={[styles.captureSuggestions, { borderColor: theme.border, backgroundColor: theme.surface }]}>
                {filteredCommands.map((cmd) => (
                  <Pressable
                    key={cmd.shortcut}
                    onPress={() => {
                      if (isInstantCaptureShortcut(cmd.shortcut)) {
                        runCaptureCommand(cmd.shortcut);
                      } else {
                        setCaptureInput(`${cmd.shortcut} `);
                        handleCaptureFocus();
                      }
                    }}
                    style={({ pressed }) => [styles.captureSuggestionRow, pressed && { opacity: 0.65 }]}
                  >
                    <Text style={[styles.captureShortcut, { color: theme.accent }]}>{cmd.shortcut}</Text>
                    <Text style={[styles.captureDesc, { color: theme.muted }]} numberOfLines={1}>
                      {cmd.desc}
                    </Text>
                  </Pressable>
                ))}
                {showCaptureCommands ? (
                  <Pressable
                    onPress={() => void updateSettings({ ...workspace.settings, showCaptureCommands: false })}
                    style={styles.captureDismiss}
                  >
                    <Text style={{ color: theme.muted, fontSize: 11, fontWeight: "700" }}>Hide command hints</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}

        <TimesheetNowStrip
          theme={theme}
          timeTracking={workspace.timeTracking}
          workTitle={current?.title}
          onChange={(next) => void updateTimeTracking(next)}
          onOpenTimesheet={openTimesheet}
        />

        {ambient ? (
          <Pressable
            onPress={() => setAmbientWrapupOpen(true)}
            style={[styles.ambientStrip, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <Feather name="clock" size={16} color={theme.accent} />
            <View style={styles.grow}>
              <Text style={[styles.ambientTitle, { color: theme.text }]}>{ambient.title}</Text>
              <Text style={[styles.ambientMeta, { color: theme.muted }]}>
                {formatAmbientDuration(now - new Date(ambient.startedAt).getTime())} so far
              </Text>
            </View>
            <Feather name="arrow-right" size={16} color={theme.muted} />
          </Pressable>
        ) : null}

        <View style={[styles.block, shell]}>
          <View style={styles.nowHead}>
            <View style={styles.grow}>
              <Text style={[styles.kicker, { color: theme.muted }]}>NOW</Text>
              {current ? (
                <>
                  <Text style={[styles.nowTitle, { color: theme.text }]}>{current.title}</Text>
                  <Text style={[styles.nowMeta, { color: theme.muted }]}>
                    {current.project || "Personal"} · {current.focusMinutes ?? 25} min
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[styles.nowTitle, { color: theme.text }]}>Nothing claiming you</Text>
                  <Text style={[styles.nowMeta, { color: theme.muted }]}>
                    Pick a next choice when you’re ready.
                  </Text>
                </>
              )}
            </View>
            {current ? (
              <Pressable onPress={() => updateSettings({ ...workspace.settings, nowTaskId: null })} hitSlop={8}>
                <Text style={{ color: theme.accent, fontWeight: "800", fontSize: 12 }}>Clear</Text>
              </Pressable>
            ) : null}
          </View>
          {current ? (
            <View style={[styles.nowActions, { borderTopColor: theme.border }]}>
              <ActionButton label="Focus" icon="target" onPress={() => setFocusOpen(true)} />
              <ActionButton
                label="Open"
                icon="external-link"
                quiet
                onPress={() => navigation.navigate("TaskDetail", { taskId: current.id })}
              />
              <ActionButton
                label="Done"
                icon="check"
                quiet
                onPress={() => {
                  updateTasks(
                    workspace.tasks.map((task) =>
                      task.id === current.id
                        ? { ...task, done: true, completedAt: new Date().toISOString(), status: "Done" }
                        : task,
                    ),
                  );
                  updateSettings({ ...workspace.settings, nowTaskId: null });
                }}
              />
            </View>
          ) : null}
          <TodayBriefSection variant="inset" onOpenFocus={() => setFocusOpen(true)} />
        </View>

        <View style={[styles.block, shell]}>
          <View style={[styles.weekHead, { borderBottomColor: theme.border }]}>
            <View style={styles.grow}>
              <Text style={[styles.kicker, { color: theme.muted }]}>THIS WEEK · {glance.rangeLabel}</Text>
              <Text style={[styles.weekLine, { color: theme.text }]}>{glance.line}</Text>
            </View>
            <View style={styles.percentWrap}>
              <Text style={[styles.percent, { color: theme.text }]}>{glance.percent}%</Text>
              <Text style={[styles.percentHint, { color: theme.muted }]}>kept</Text>
            </View>
          </View>
          <View style={styles.grid}>
            <Tile
              title="Tasks"
              count={glance.tasksOpen === 1 ? "1 open" : `${glance.tasksOpen} open`}
              borderColor={theme.border}
              textColor={theme.text}
              mutedColor={theme.muted}
              onPress={() => navigation.navigate("TasksTab")}
            />
            <Tile
              title="Habits"
              count={
                glance.habitsTotal
                  ? `${glance.habitsKept} of ${glance.habitsTotal} kept`
                  : "none yet"
              }
              borderColor={theme.border}
              textColor={theme.text}
              mutedColor={theme.muted}
              lastCol
              onPress={() =>
                navigation.navigate("LifeTab", {
                  screen: "HubCollection",
                  params: { scope: "life", collection: "habits" },
                })
              }
            />
            <Tile
              title="Calendar"
              count={glance.nextEventLabel}
              borderColor={theme.border}
              textColor={theme.text}
              mutedColor={theme.muted}
              lastRow
              onPress={() => navigation.navigate("CalendarTab")}
            />
            <Tile
              title="Memories"
              count={
                glance.memoriesToday === 0
                  ? "none yet today"
                  : glance.memoriesToday === 1
                    ? "1 today"
                    : `${glance.memoriesToday} today`
              }
              borderColor={theme.border}
              textColor={theme.text}
              mutedColor={theme.muted}
              lastCol
              lastRow
              onPress={() => setMemoryOpen(true)}
            />
          </View>
        </View>
      </ScrollView>

      {focusTask ? <FocusModal visible={focusOpen} task={focusTask} onClose={() => setFocusOpen(false)} /> : null}
      <SearchModal visible={searchOpen} onClose={() => setSearchOpen(false)} />
      <RecordMemoryModal visible={memoryOpen} onClose={() => setMemoryOpen(false)} />
      <AmbientWrapupModal
        visible={ambientWrapupOpen}
        activity={ambient ?? null}
        onClose={() => setAmbientWrapupOpen(false)}
      />
      <AmbientStartModal visible={ambientStartOpen} onClose={() => setAmbientStartOpen(false)} />
      <BreakModal visible={breakOpen} onClose={() => setBreakOpen(false)} />
      <AiTaskModal visible={aiTaskOpen} onClose={() => setAiTaskOpen(false)} />
    </Page>
  );
}

function Tile({
  title,
  count,
  onPress,
  borderColor,
  textColor,
  mutedColor,
  lastCol,
  lastRow,
}: {
  title: string;
  count: string;
  onPress: () => void;
  borderColor: string;
  textColor: string;
  mutedColor: string;
  lastCol?: boolean;
  lastRow?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          borderRightColor: borderColor,
          borderBottomColor: borderColor,
          borderRightWidth: lastCol ? 0 : StyleSheet.hairlineWidth,
          borderBottomWidth: lastRow ? 0 : StyleSheet.hairlineWidth,
          opacity: pressed ? 0.65 : 1,
        },
      ]}
    >
      <Text style={[styles.tileTitle, { color: textColor }]}>{title}</Text>
      <Text style={[styles.tileCount, { color: mutedColor }]} numberOfLines={2}>
        {count}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0 },
  screen: { padding: 20, paddingBottom: 36, gap: 14 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  lede: { fontSize: 13, lineHeight: 18, marginTop: -6 },
  captureWrap: { gap: 6 },
  captureBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  captureInput: { flex: 1, fontSize: 14, minHeight: 28, padding: 0 },
  captureHint: { fontSize: 11, fontWeight: "600", paddingHorizontal: 4 },
  captureSuggestions: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  captureSuggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(15,23,42,0.08)",
  },
  captureShortcut: { fontSize: 13, fontWeight: "800", minWidth: 72 },
  captureDesc: { flex: 1, fontSize: 12, fontWeight: "600" },
  captureDismiss: { paddingHorizontal: 14, paddingVertical: 10, alignItems: "center" },
  block: { borderWidth: 1, borderRadius: 16, overflow: "hidden" },
  weekHead: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  kicker: { fontSize: 10, fontWeight: "800", letterSpacing: 0.7 },
  weekLine: { fontSize: 14, fontWeight: "600", marginTop: 5 },
  percentWrap: { alignItems: "flex-end" },
  percent: { fontSize: 22, fontWeight: "800", lineHeight: 24 },
  percentHint: { fontSize: 10, fontWeight: "700", marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  tile: { width: "50%", paddingHorizontal: 14, paddingVertical: 12, minHeight: 72 },
  tileTitle: { fontSize: 13, fontWeight: "800" },
  tileCount: { fontSize: 12, marginTop: 3, lineHeight: 16 },
  nowHead: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14 },
  nowTitle: { fontSize: 20, fontWeight: "800", marginTop: 6, lineHeight: 24 },
  nowMeta: { fontSize: 13, marginTop: 3, lineHeight: 18 },
  nowActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  ambientStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  ambientTitle: { fontSize: 15, fontWeight: "800" },
  ambientMeta: { fontSize: 12, marginTop: 2 },
});
