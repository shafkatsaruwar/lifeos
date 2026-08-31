import Feather from "@expo/vector-icons/Feather";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { ActionButton, Card, Empty, Eyebrow, Page, SegmentedControl, Title } from "../components/UI";
import { TimesheetPanel } from "../components/TimesheetPanel";
import { useFloatingTabBarContentPadding } from "../components/FloatingTabBar";
import { SwipeDeleteRow } from "../components/SwipeDeleteRow";
import { useLifeOS } from "../lib/LifeOSContext";
import { formatDueDate, toDateKey } from "../lib/helpers";
import {
  allOpenWorkAreaTasks,
  bridgeWorkTaskToLife,
  ensureLifeProjectForWork,
  formatWorkMeetingWhere,
  openTaskCountForWorkProject,
  projectForDeliverable,
  projectForTask,
  removeWorkProject,
  uidWork,
  WORK_COLORS,
  type WorkDeliverable,
  type WorkMeeting,
  type WorkMeetingFormat,
  type WorkProject,
  type WorkTask,
  type WorkView,
} from "../lib/workos";
import type { Task } from "../types";

type CreateKind = "project" | "deliverable" | "task" | "meeting";

const VIEW_TABS: { id: WorkView; label: string }[] = [
  { id: "dashboard", label: "Home" },
  { id: "tasks", label: "Tasks" },
  { id: "projects", label: "Projects" },
  { id: "deliverables", label: "Deliverables" },
  { id: "kanban", label: "Board" },
  { id: "calendar", label: "Meetings" },
  { id: "timesheet", label: "Timesheet" },
];

const PRIORITY_OPTIONS = [
  { key: "high", label: "High" },
  { key: "medium", label: "Medium" },
  { key: "low", label: "Low" },
] as const;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toLocalInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function priorityColor(priority: string) {
  if (priority === "high") return "#e25555";
  if (priority === "medium") return "#e89b3a";
  return "#6b8fd4";
}

export function WorkDashboardScreen() {
  const { theme, workspace, updateWork, updateTasks, updateProjects, updateTimeTracking } = useLifeOS();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const tabBarPad = useFloatingTabBarContentPadding(40);
  const work = workspace.work;
  const weekStartsMonday = workspace.settings.weekStartsMonday ?? false;
  const today = toDateKey(new Date());
  const colorScheme = useColorScheme();

  const [view, setView] = useState<WorkView>("dashboard");
  const [taskFilter, setTaskFilter] = useState<"all" | "high" | "medium" | "low" | "blocked" | "completed">("all");
  const [composer, setComposer] = useState<CreateKind | null>(null);

  useEffect(() => {
    if (!route.params?.openTimesheet) return;
    setView("timesheet");
    navigation.setParams?.({ openTimesheet: undefined });
  }, [navigation, route.params?.openTimesheet]);

  // Shared create fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [deliverableId, setDeliverableId] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [dueDate, setDueDate] = useState(today);
  const [showDuePicker, setShowDuePicker] = useState(false);

  // Meeting fields
  const [meetingStart, setMeetingStart] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30 - (now.getMinutes() % 30), 0, 0);
    return now;
  });
  const [meetingType, setMeetingType] = useState<WorkMeeting["type"]>("other");
  const [meetingFormat, setMeetingFormat] = useState<WorkMeetingFormat>("in_person");
  const [location, setLocation] = useState("");
  const [virtualUrl, setVirtualUrl] = useState("");
  const [showStartPicker, setShowStartPicker] = useState(false);

  const activeProjects = useMemo(
    () => work.projects.filter((p) => p.status === "active"),
    [work.projects],
  );
  const { workTasks: openWorkTasks, lifeTasks: openLifeWorkTasks } = useMemo(
    () => allOpenWorkAreaTasks(work, workspace.tasks),
    [work, workspace.tasks],
  );
  const openTasks = openWorkTasks;
  const openTaskTotal = openWorkTasks.length + openLifeWorkTasks.length;
  const blockedTasks = useMemo(
    () => openTasks.filter((t) => t.status === "blocked"),
    [openTasks],
  );
  const deliverables = useMemo(
    () =>
      work.deliverables
        .filter((d) => d.status !== "delivered" && d.status !== "canceled")
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [work.deliverables],
  );
  const upcomingMeetings = useMemo(
    () =>
      [...work.meetings]
        .filter((m) => m.start.slice(0, 10) >= today)
        .sort((a, b) => a.start.localeCompare(b.start)),
    [work.meetings, today],
  );
  const filteredTasks = useMemo(() => {
    if (taskFilter === "all") return openTasks;
    if (taskFilter === "completed") return work.tasks.filter((t) => t.status === "done");
    if (taskFilter === "blocked") return blockedTasks;
    return openTasks.filter((t) => t.priority === taskFilter);
  }, [taskFilter, openTasks, work.tasks, blockedTasks]);

  const focusTask =
    openTasks.find((t) => t.priority === "high") ?? openTasks[0] ?? null;

  const resetComposer = () => {
    setComposer(null);
    setTitle("");
    setDescription("");
    setPriority("medium");
    setDueDate(today);
    setLocation("");
    setVirtualUrl("");
    setShowDuePicker(false);
    setShowStartPicker(false);
  };

  const openComposer = (kind: CreateKind) => {
    const firstProject = activeProjects[0];
    const firstDel =
      work.deliverables.find((d) => d.projectId === firstProject?.id) ?? work.deliverables[0];
    setProjectId(firstProject?.id ?? "");
    setDeliverableId(firstDel?.id ?? "");
    setTitle("");
    setDescription("");
    setPriority("medium");
    setDueDate(today);
    setMeetingType("other");
    setMeetingFormat("in_person");
    setLocation("");
    setVirtualUrl("");
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30 - (now.getMinutes() % 30), 0, 0);
    setMeetingStart(now);
    setComposer(kind);
  };

  const completeTask = (taskId: string) => {
    void updateWork({
      ...work,
      tasks: work.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: "done",
              completedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : t,
      ),
    });
  };

  const setTaskStatus = (taskId: string, status: WorkTask["status"]) => {
    void updateWork({
      ...work,
      tasks: work.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status,
              completedAt: status === "done" ? new Date().toISOString() : t.completedAt,
              updatedAt: new Date().toISOString(),
            }
          : t,
      ),
    });
  };

  const deleteTask = (id: string) =>
    void updateWork({ ...work, tasks: work.tasks.filter((t) => t.id !== id) });

  const deleteProject = (project: WorkProject) => {
    Alert.alert(
      `Delete “${project.name}”?`,
      "Its deliverables, tasks, and meetings will be removed from Work OS.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void updateWork(removeWorkProject(work, project.id));
            if (workspace.projects.some((entry) => entry.name === project.name)) {
              void updateProjects(workspace.projects.filter((entry) => entry.name !== project.name));
            }
          },
        },
      ],
    );
  };

  const openWorkProject = async (workProject: WorkProject) => {
    const nextProjects = ensureLifeProjectForWork(workspace.projects, workProject);
    if (nextProjects !== workspace.projects) await updateProjects(nextProjects);
    navigation.navigate("ProjectDetail", { projectName: workProject.name });
  };

  const openWorkTask = async (workTaskId: string) => {
    const bridged = bridgeWorkTaskToLife(
      work,
      workspace.tasks,
      workspace.projects,
      workTaskId,
      {
        focusMinutes: workspace.settings.defaultFocusMinutes,
        energy: workspace.settings.defaultEnergy,
      },
    );
    if (!bridged) return;
    if (bridged.projects !== workspace.projects) await updateProjects(bridged.projects);
    if (bridged.tasks !== workspace.tasks) await updateTasks(bridged.tasks);
    navigation.navigate("TaskDetail", { taskId: bridged.lifeTaskId });
  };

  const saveComposer = () => {
    const stamp = new Date().toISOString();
    const name = title.trim();

    if (composer === "project") {
      if (!name) return;
      const project: WorkProject = {
        id: uidWork("proj"),
        name,
        description: description.trim() || undefined,
        color: WORK_COLORS[work.projects.length % WORK_COLORS.length],
        status: "active",
        createdAt: stamp,
      };
      // Work hub only — do not mirror into Life Spaces on create (web parity).
      void updateWork({ ...work, projects: [project, ...work.projects] });
      resetComposer();
      return;
    }

    if (composer === "deliverable") {
      if (!name) return;
      if (!projectId) {
        Alert.alert("Add a project first", "Create a work project, then add a deliverable.");
        return;
      }
      const deliverable: WorkDeliverable = {
        id: uidWork("del"),
        projectId,
        title: name,
        type: "document",
        status: "planned",
        priority,
        dueDate,
        createdAt: stamp,
      };
      void updateWork({ ...work, deliverables: [deliverable, ...work.deliverables] });
      resetComposer();
      return;
    }

    if (composer === "task") {
      if (!name) return;
      if (!deliverableId) {
        Alert.alert("Add a deliverable first", "Create a deliverable, then add tasks under it.");
        return;
      }
      const task: WorkTask = {
        id: uidWork("task"),
        deliverableId,
        title: name,
        status: "open",
        priority,
        dueDate,
        createdAt: stamp,
        updatedAt: stamp,
      };
      void updateWork({ ...work, tasks: [task, ...work.tasks] });
      resetComposer();
      return;
    }

    if (composer === "meeting") {
      if (!name) return;
      const startIso = meetingStart.toISOString();
      const end = new Date(meetingStart);
      end.setMinutes(end.getMinutes() + 30);
      const meeting: WorkMeeting = {
        id: uidWork("meet"),
        title: name,
        start: startIso,
        end: end.toISOString(),
        type: meetingType,
        format: meetingFormat,
        location:
          (meetingFormat === "in_person" || meetingFormat === "hybrid") && location.trim()
            ? location.trim()
            : undefined,
        virtualUrl:
          (meetingFormat === "virtual" || meetingFormat === "hybrid") && virtualUrl.trim()
            ? virtualUrl.trim()
            : undefined,
        projectId: projectId || undefined,
        createdAt: stamp,
      };
      void updateWork({ ...work, meetings: [meeting, ...work.meetings] });
      resetComposer();
    }
  };

  const renderLifeTaskRow = (task: Task) => {
    const tone = priorityColor((task.priority ?? "medium").toLowerCase());
    return (
      <SwipeDeleteRow
        key={`life-${task.id}`}
        label={task.title}
        onDelete={() => void updateTasks(workspace.tasks.filter((t) => t.id !== task.id))}
      >
        <View style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Complete ${task.title}`}
            onPress={() =>
              void updateTasks(
                workspace.tasks.map((t) =>
                  t.id === task.id ? { ...t, done: true, status: "Done", completedAt: new Date().toISOString() } : t,
                ),
              )
            }
            style={[styles.check, { borderColor: theme.border }]}
          />
          <Pressable
            style={styles.grow}
            onPress={() => navigation.navigate("TaskDetail", { taskId: task.id })}
          >
            <Text style={{ color: theme.text, fontWeight: "700" }}>{task.title}</Text>
            <Text style={{ color: theme.muted, fontSize: 12 }}>
              {task.project || "Work"} · Due {formatDueDate(task.due)}
            </Text>
          </Pressable>
          <Text style={[styles.priorityTag, { color: tone, backgroundColor: `${tone}18` }]}>
            {(task.priority ?? "Medium").toLowerCase()}
          </Text>
        </View>
      </SwipeDeleteRow>
    );
  };

  const renderTaskRow = (task: WorkTask) => {
    const project = projectForTask(work, task);
    const tone = priorityColor(task.priority);
    return (
      <SwipeDeleteRow key={task.id} label={task.title} onDelete={() => deleteTask(task.id)}>
        <View style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Complete ${task.title}`}
            onPress={() => completeTask(task.id)}
            style={[styles.check, { borderColor: theme.border }]}
          />
          <Pressable style={styles.grow} onPress={() => void openWorkTask(task.id)}>
            <Text style={{ color: theme.text, fontWeight: "700" }}>{task.title}</Text>
            <Text style={{ color: theme.muted, fontSize: 12 }}>
              {project?.name || "Work"} · Due {formatDueDate(task.dueDate)}
            </Text>
          </Pressable>
          <Text style={[styles.priorityTag, { color: tone, backgroundColor: `${tone}18` }]}>
            {task.priority}
          </Text>
        </View>
      </SwipeDeleteRow>
    );
  };

  const dashboard = (
    <>
      <View style={styles.statRow}>
        {[
          { label: "Active tasks", count: openTaskTotal, onPress: () => { setTaskFilter("all"); setView("tasks"); } },
          { label: "Deliverables", count: deliverables.length, onPress: () => setView("deliverables") },
          { label: "Blocked", count: blockedTasks.length, onPress: () => { setTaskFilter("blocked"); setView("tasks"); } },
        ].map((stat) => (
          <Pressable
            key={stat.label}
            onPress={stat.onPress}
            style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <Text style={{ color: theme.text, fontSize: 22, fontWeight: "800" }}>{stat.count}</Text>
            <Text style={{ color: theme.muted, fontSize: 11, fontWeight: "700" }}>{stat.label}</Text>
          </Pressable>
        ))}
      </View>

      {focusTask ? (
        <Card>
          <Text style={[styles.sectionInline, { color: theme.text }]}>Focus today</Text>
          <Text style={{ color: theme.text, fontWeight: "800", fontSize: 17, marginTop: 4 }}>
            {focusTask.title}
          </Text>
          <Text style={{ color: theme.muted, fontSize: 12, marginTop: 2 }}>
            {projectForTask(work, focusTask)?.name || "Work"} · {focusTask.priority} priority
          </Text>
          <View style={[styles.quickRow, { marginTop: 12 }]}>
            <ActionButton label="Open task" icon="external-link" quiet onPress={() => void openWorkTask(focusTask.id)} />
            <ActionButton
              label="Mark done"
              icon="check"
              quiet
              onPress={() => completeTask(focusTask.id)}
            />
          </View>
        </Card>
      ) : null}

      <Text style={[styles.section, { color: theme.text }]}>Active projects</Text>
      {activeProjects.length ? (
        activeProjects.map((p) => {
          const count = openTaskCountForWorkProject(work, workspace.tasks, p);
          return (
            <SwipeDeleteRow key={p.id} label={p.name} onDelete={() => deleteProject(p)}>
              <Pressable
                onPress={() => void openWorkProject(p)}
                style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <View style={[styles.dot, { backgroundColor: p.color || theme.accent }]} />
                <View style={styles.grow}>
                  <Text style={{ color: theme.text, fontWeight: "800" }}>{p.name}</Text>
                  <Text style={{ color: theme.muted, fontSize: 12 }}>
                    {count} open task{count === 1 ? "" : "s"}
                    {p.description ? ` · ${p.description}` : ""}
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={theme.muted} />
              </Pressable>
            </SwipeDeleteRow>
          );
        })
      ) : (
        <Card>
          <Empty title="No active projects" body="Create a work project to organize deliverables." />
        </Card>
      )}

      <Text style={[styles.section, { color: theme.text }]}>Open work tasks</Text>
      {openTaskTotal ? (
        <>
          {openWorkTasks.slice(0, 6).map(renderTaskRow)}
          {openLifeWorkTasks.slice(0, Math.max(0, 6 - openWorkTasks.length)).map(renderLifeTaskRow)}
        </>
      ) : (
        <Card>
          <Empty title="Clear board" body="Add a work task when something lands." />
        </Card>
      )}

      <View style={styles.sectionRow}>
        <Text style={[styles.section, { color: theme.text, marginTop: 0 }]}>Deliverables</Text>
        <Pressable onPress={() => openComposer("deliverable")} style={styles.sectionAdd} hitSlop={8}>
          <Feather name="plus" size={16} color={theme.accent} />
          <Text style={{ color: theme.accent, fontWeight: "800", fontSize: 13 }}>New</Text>
        </Pressable>
      </View>
      {deliverables.length ? (
        deliverables.slice(0, 6).map((d) => {
          const project = projectForDeliverable(work, d);
          return (
            <Pressable
              key={d.id}
              onPress={() => project && void openWorkProject(project)}
              style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <Feather name="package" size={16} color={theme.accent} />
              <View style={styles.grow}>
                <Text style={{ color: theme.text, fontWeight: "700" }}>{d.title}</Text>
                <Text style={{ color: theme.muted, fontSize: 12 }}>
                  {project?.name || "Work"} · {d.status.replace("_", " ")} · Due {formatDueDate(d.dueDate)}
                </Text>
              </View>
            </Pressable>
          );
        })
      ) : (
        <Card>
          <Empty title="No open deliverables" body="Create one here — it syncs with the web Work hub." />
          <View style={{ marginTop: 12 }}>
            <ActionButton label="New deliverable" icon="plus" quiet onPress={() => openComposer("deliverable")} />
          </View>
        </Card>
      )}

      <View style={styles.sectionRow}>
        <Text style={[styles.section, { color: theme.text, marginTop: 0 }]}>Upcoming meetings</Text>
        <Pressable onPress={() => openComposer("meeting")} style={styles.sectionAdd} hitSlop={8}>
          <Feather name="plus" size={16} color={theme.accent} />
          <Text style={{ color: theme.accent, fontWeight: "800", fontSize: 13 }}>New</Text>
        </Pressable>
      </View>
      {upcomingMeetings.length ? (
        upcomingMeetings.slice(0, 5).map((m) => (
          <View key={m.id} style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Feather name="video" size={16} color={theme.accent} />
            <View style={styles.grow}>
              <Text style={{ color: theme.text, fontWeight: "700" }}>{m.title}</Text>
              <Text style={{ color: theme.muted, fontSize: 12 }}>
                {new Date(m.start).toLocaleString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
                {formatWorkMeetingWhere(m) ? ` · ${formatWorkMeetingWhere(m)}` : ""}
              </Text>
            </View>
          </View>
        ))
      ) : (
        <Card>
          <Empty title="No upcoming meetings" body="Schedule a meeting — it also shows on Calendar." />
          <View style={{ marginTop: 12 }}>
            <ActionButton label="Schedule meeting" icon="calendar" quiet onPress={() => openComposer("meeting")} />
          </View>
        </Card>
      )}
    </>
  );

  const subview = (() => {
    if (view === "tasks") {
      return (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {(["all", "high", "medium", "low", "blocked", "completed"] as const).map((key) => {
              const on = taskFilter === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setTaskFilter(key)}
                  style={[
                    styles.filterChip,
                    { borderColor: on ? theme.accent : theme.border, backgroundColor: on ? theme.soft : "transparent" },
                  ]}
                >
                  <Text style={{ color: theme.text, fontWeight: "700", fontSize: 12 }}>{key}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {filteredTasks.length || (taskFilter === "all" && openLifeWorkTasks.length) ? (
            <>
              {filteredTasks.map(renderTaskRow)}
              {taskFilter === "all" ? openLifeWorkTasks.map(renderLifeTaskRow) : null}
            </>
          ) : (
            <Card><Empty title="No tasks here" body="Try another filter or create a task." /></Card>
          )}
        </>
      );
    }
    if (view === "projects") {
      return activeProjects.length ? (
        activeProjects.map((p) => (
          <SwipeDeleteRow key={p.id} label={p.name} onDelete={() => deleteProject(p)}>
            <Pressable
              onPress={() => void openWorkProject(p)}
              style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <View style={[styles.dot, { backgroundColor: p.color || theme.accent }]} />
              <View style={styles.grow}>
                <Text style={{ color: theme.text, fontWeight: "800" }}>{p.name}</Text>
                {p.description ? <Text style={{ color: theme.muted, fontSize: 12 }}>{p.description}</Text> : null}
              </View>
              <Feather name="chevron-right" size={18} color={theme.muted} />
            </Pressable>
          </SwipeDeleteRow>
        ))
      ) : (
        <Card><Empty title="No projects" body="Create a work project to get started." /></Card>
      );
    }
    if (view === "deliverables") {
      return deliverables.length ? (
        deliverables.map((d) => {
          const project = projectForDeliverable(work, d);
          return (
            <Pressable
              key={d.id}
              onPress={() => project && void openWorkProject(project)}
              style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <Feather name="package" size={16} color={theme.accent} />
              <View style={styles.grow}>
                <Text style={{ color: theme.text, fontWeight: "700" }}>{d.title}</Text>
                <Text style={{ color: theme.muted, fontSize: 12 }}>
                  {project?.name || "Work"} · {d.status.replace("_", " ")} · Due {formatDueDate(d.dueDate)}
                </Text>
              </View>
            </Pressable>
          );
        })
      ) : (
        <Card><Empty title="No deliverables" body="Create a deliverable under a project." /></Card>
      );
    }
    if (view === "kanban") {
      const columns: { key: WorkTask["status"]; label: string }[] = [
        { key: "open", label: "Open" },
        { key: "in_progress", label: "In progress" },
        { key: "blocked", label: "Blocked" },
        { key: "done", label: "Done" },
      ];
      return columns.map((col) => {
        const items = work.tasks.filter((t) => t.status === col.key);
        return (
          <View key={col.key} style={{ gap: 8 }}>
            <Text style={[styles.section, { color: theme.text }]}>
              {col.label} · {items.length}
            </Text>
            {items.length ? (
              items.map((task) => (
                <Pressable
                  key={task.id}
                  onPress={() => {
                    const order: WorkTask["status"][] = ["open", "in_progress", "blocked", "done"];
                    const next = order[(order.indexOf(task.status) + 1) % order.length];
                    setTaskStatus(task.id, next);
                  }}
                  onLongPress={() => void openWorkTask(task.id)}
                  style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}
                >
                  <View style={styles.grow}>
                    <Text style={{ color: theme.text, fontWeight: "700" }}>{task.title}</Text>
                    <Text style={{ color: theme.muted, fontSize: 11 }}>Tap to advance · hold to open</Text>
                  </View>
                </Pressable>
              ))
            ) : (
              <Text style={{ color: theme.muted, fontSize: 12, paddingHorizontal: 4 }}>Empty</Text>
            )}
          </View>
        );
      });
    }
    if (view === "calendar") {
      return upcomingMeetings.length ? (
        upcomingMeetings.map((m) => (
          <View key={m.id} style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Feather name="calendar" size={16} color={theme.accent} />
            <View style={styles.grow}>
              <Text style={{ color: theme.text, fontWeight: "700" }}>{m.title}</Text>
              <Text style={{ color: theme.muted, fontSize: 12 }}>
                {new Date(m.start).toLocaleString()}
                {formatWorkMeetingWhere(m) ? ` · ${formatWorkMeetingWhere(m)}` : ""}
              </Text>
            </View>
          </View>
        ))
      ) : (
        <Card>
          <Empty title="No meetings" body="Schedule one — it syncs into Calendar." />
          <View style={{ marginTop: 12 }}>
            <ActionButton label="Schedule meeting" icon="plus" quiet onPress={() => openComposer("meeting")} />
          </View>
        </Card>
      );
    }
    if (view === "timesheet") {
      return (
        <TimesheetPanel
          theme={theme}
          timeTracking={workspace.timeTracking}
          projects={work.projects}
          weekStartsMonday={weekStartsMonday}
          onChange={(next) => void updateTimeTracking(next)}
        />
      );
    }
    return null;
  })();

  const composerTitle =
    composer === "project"
      ? "New project"
      : composer === "deliverable"
        ? "New deliverable"
        : composer === "meeting"
          ? "Schedule meeting"
          : "New task";

  return (
    <Page>
      <ScrollView
        contentContainerStyle={[styles.screen, styles.screenGrow, { paddingBottom: tabBarPad }]}
        scrollIndicatorInsets={{ bottom: tabBarPad }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.grow}>
            <Eyebrow>WORK OS</Eyebrow>
            <Title>Work</Title>
            <Text style={{ color: theme.muted, marginTop: 4 }}>
              Projects, deliverables, tasks, and meetings — synced with the web hub.
            </Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate("NowTab", { screen: "Settings" })}
            style={[styles.iconBtn, { backgroundColor: theme.soft }]}
          >
            <Feather name="settings" size={18} color={theme.accent} />
          </Pressable>
        </View>

        <View style={styles.quickRow}>
          <ActionButton label="New project" icon="briefcase" quiet onPress={() => openComposer("project")} />
          <ActionButton label="New deliverable" icon="package" quiet onPress={() => openComposer("deliverable")} />
          <ActionButton label="New task" icon="check-square" quiet onPress={() => openComposer("task")} />
          <ActionButton label="Timesheet" icon="clock" quiet onPress={() => setView("timesheet")} />
          <ActionButton label="Meeting" icon="calendar" quiet onPress={() => openComposer("meeting")} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {VIEW_TABS.map((tab) => {
            const on = view === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setView(tab.id)}
                style={[
                  styles.filterChip,
                  { borderColor: on ? theme.accent : theme.border, backgroundColor: on ? theme.soft : "transparent" },
                ]}
              >
                <Text style={{ color: theme.text, fontWeight: "700", fontSize: 12 }}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {view === "dashboard" ? dashboard : subview}
        <View style={{ height: tabBarPad }} />
      </ScrollView>

      <Modal visible={Boolean(composer)} animationType="slide" presentationStyle="pageSheet" onRequestClose={resetComposer}>
        <View style={[styles.modalPage, { backgroundColor: theme.bg }]}>
          <View style={styles.modalHead}>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: "800" }}>{composerTitle}</Text>
            <Pressable onPress={resetComposer} hitSlop={10}>
              <Feather name="x" size={22} color={theme.muted} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={[styles.fieldLabel, { color: theme.muted }]}>Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={
                composer === "project"
                  ? "WorkOS Redesign"
                  : composer === "meeting"
                    ? "Q3 planning"
                    : "Design landing page"
              }
              placeholderTextColor={theme.muted}
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              autoFocus
            />

            {composer === "project" ? (
              <>
                <Text style={[styles.fieldLabel, { color: theme.muted }]}>Description</Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="What is this project about?"
                  placeholderTextColor={theme.muted}
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                />
              </>
            ) : null}

            {composer === "deliverable" || composer === "meeting" ? (
              <>
                <Text style={[styles.fieldLabel, { color: theme.muted }]}>Project</Text>
                {activeProjects.length ? (
                  <View style={styles.chipWrap}>
                    {(composer === "meeting"
                      ? [{ id: "", name: "No project" } as WorkProject, ...activeProjects]
                      : activeProjects
                    ).map((p) => {
                      const on = projectId === p.id;
                      return (
                        <Pressable
                          key={p.id || "none"}
                          onPress={() => setProjectId(p.id)}
                          style={[
                            styles.chip,
                            {
                              borderColor: on ? theme.accent : theme.border,
                              backgroundColor: on ? theme.soft : "transparent",
                            },
                          ]}
                        >
                          <Text style={{ color: theme.text, fontSize: 12, fontWeight: "700" }}>{p.name}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={{ color: theme.muted, marginBottom: 10 }}>Create a project first.</Text>
                )}
              </>
            ) : null}

            {composer === "task" ? (
              <>
                <Text style={[styles.fieldLabel, { color: theme.muted }]}>Deliverable</Text>
                {work.deliverables.length ? (
                  <View style={styles.chipWrap}>
                    {work.deliverables.map((d) => {
                      const on = deliverableId === d.id;
                      const project = projectForDeliverable(work, d);
                      return (
                        <Pressable
                          key={d.id}
                          onPress={() => setDeliverableId(d.id)}
                          style={[
                            styles.chip,
                            {
                              borderColor: on ? theme.accent : theme.border,
                              backgroundColor: on ? theme.soft : "transparent",
                            },
                          ]}
                        >
                          <Text style={{ color: theme.text, fontSize: 12, fontWeight: "700" }}>
                            {d.title}
                            {project ? ` · ${project.name}` : ""}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={{ color: theme.muted, marginBottom: 10 }}>Create a deliverable first.</Text>
                )}
              </>
            ) : null}

            {composer === "deliverable" || composer === "task" ? (
              <>
                <Text style={[styles.fieldLabel, { color: theme.muted }]}>Priority</Text>
                <SegmentedControl
                  value={priority}
                  onChange={setPriority}
                  options={PRIORITY_OPTIONS.map((p) => ({ key: p.key, label: p.label }))}
                />
                <Text style={[styles.fieldLabel, { color: theme.muted, marginTop: 12 }]}>Due date</Text>
                {Platform.OS === "ios" ? (
                  <DateTimePicker
                    value={new Date(`${dueDate}T12:00:00`)}
                    mode="date"
                    display="compact"
                    themeVariant={colorScheme === "dark" ? "dark" : "light"}
                    onChange={(_, date) => {
                      if (date) setDueDate(toDateKey(date));
                    }}
                  />
                ) : (
                  <>
                    <Pressable
                      onPress={() => setShowDuePicker(true)}
                      style={[styles.input, styles.pickerBtn, { borderColor: theme.border }]}
                    >
                      <Text style={{ color: theme.text, fontWeight: "600" }}>{dueDate}</Text>
                    </Pressable>
                    {showDuePicker ? (
                      <DateTimePicker
                        value={new Date(`${dueDate}T12:00:00`)}
                        mode="date"
                        onChange={(event, date) => {
                          setShowDuePicker(false);
                          if (event.type !== "dismissed" && date) setDueDate(toDateKey(date));
                        }}
                      />
                    ) : null}
                  </>
                )}
              </>
            ) : null}

            {composer === "meeting" ? (
              <>
                <Text style={[styles.fieldLabel, { color: theme.muted }]}>Starts</Text>
                {Platform.OS === "ios" ? (
                  <DateTimePicker
                    value={meetingStart}
                    mode="datetime"
                    display="compact"
                    themeVariant={colorScheme === "dark" ? "dark" : "light"}
                    onChange={(_, date) => {
                      if (date) setMeetingStart(date);
                    }}
                  />
                ) : (
                  <>
                    <Pressable
                      onPress={() => setShowStartPicker(true)}
                      style={[styles.input, styles.pickerBtn, { borderColor: theme.border }]}
                    >
                      <Text style={{ color: theme.text, fontWeight: "600" }}>
                        {toLocalInputValue(meetingStart).replace("T", " ")}
                      </Text>
                    </Pressable>
                    {showStartPicker ? (
                      <DateTimePicker
                        value={meetingStart}
                        mode="datetime"
                        onChange={(event, date) => {
                          setShowStartPicker(false);
                          if (event.type !== "dismissed" && date) setMeetingStart(date);
                        }}
                      />
                    ) : null}
                  </>
                )}

                <Text style={[styles.fieldLabel, { color: theme.muted, marginTop: 12 }]}>Type</Text>
                <View style={styles.chipWrap}>
                  {(["other", "standup", "planning", "review", "retrospective"] as const).map((t) => {
                    const on = meetingType === t;
                    return (
                      <Pressable
                        key={t}
                        onPress={() => setMeetingType(t)}
                        style={[
                          styles.chip,
                          {
                            borderColor: on ? theme.accent : theme.border,
                            backgroundColor: on ? theme.soft : "transparent",
                          },
                        ]}
                      >
                        <Text style={{ color: theme.text, fontSize: 12, fontWeight: "700" }}>{t}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={[styles.fieldLabel, { color: theme.muted }]}>Format</Text>
                <SegmentedControl
                  value={meetingFormat}
                  onChange={setMeetingFormat}
                  options={[
                    { key: "in_person", label: "In person" },
                    { key: "virtual", label: "Virtual" },
                    { key: "hybrid", label: "Hybrid" },
                  ]}
                />

                {meetingFormat === "in_person" || meetingFormat === "hybrid" ? (
                  <>
                    <Text style={[styles.fieldLabel, { color: theme.muted, marginTop: 12 }]}>Location</Text>
                    <TextInput
                      value={location}
                      onChangeText={setLocation}
                      placeholder="Office 4B…"
                      placeholderTextColor={theme.muted}
                      style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                    />
                  </>
                ) : null}
                {meetingFormat === "virtual" || meetingFormat === "hybrid" ? (
                  <>
                    <Text style={[styles.fieldLabel, { color: theme.muted }]}>Video call URL</Text>
                    <TextInput
                      value={virtualUrl}
                      onChangeText={setVirtualUrl}
                      placeholder="https://meet.google.com/…"
                      placeholderTextColor={theme.muted}
                      autoCapitalize="none"
                      style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                    />
                  </>
                ) : null}
              </>
            ) : null}

            <View style={[styles.quickRow, { marginTop: 16 }]}>
              <ActionButton label="Save" icon="check" onPress={saveComposer} />
              <ActionButton label="Cancel" quiet onPress={resetComposer} />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </Page>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 20, paddingBottom: 20, gap: 12 },
  screenGrow: { flexGrow: 1 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  grow: { flex: 1, minWidth: 0 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterRow: { gap: 8, paddingVertical: 2 },
  filterChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  section: { fontSize: 17, fontWeight: "800", marginTop: 8 },
  sectionInline: { fontSize: 13, fontWeight: "800" },
  sectionRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionAdd: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4 },
  statRow: { flexDirection: "row", gap: 8 },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  check: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5 },
  priorityTag: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "capitalize",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, minHeight: 46, marginBottom: 10 },
  pickerBtn: { justifyContent: "center" },
  fieldLabel: { fontSize: 12, fontWeight: "800", marginBottom: 6 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  modalPage: { flex: 1, paddingTop: 16 },
  modalHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  modalBody: { paddingHorizontal: 20, paddingBottom: 40 },
});
