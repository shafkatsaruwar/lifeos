import Feather from "@expo/vector-icons/Feather";
import { useNavigation } from "@react-navigation/native";
import { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FocusModal } from "../components/FocusModal";
import { useFloatingTabBarContentPadding } from "../components/FloatingTabBar";
import { useLifeOS } from "../lib/LifeOSContext";
import { formatDueDate, taskIsOpen, toDateKey, uid } from "../lib/helpers";
import type { CalendarEvent, Task } from "../types";

/** SchoolOS-only palette — mist canvas + teal accent (not the web cream/pink refs). */
const SP = {
  mist: "#EEF3F6",
  mistDeep: "#E2EAEF",
  panel: "#FFFFFF",
  ink: "#1A2B33",
  muted: "#6B7C86",
  line: "#D5E0E7",
  teal: "#0F8A7A",
  tealSoft: "#D4EFE9",
  tealDeep: "#0B6B5E",
  alert: "#DFF3EE",
};

type SchoolTab = "home" | "timetable" | "assignments" | "due" | "more";
type CaptureKind = "Task" | "Deadline" | "Note";
type WhenOpt = "today" | "tomorrow" | "custom";

const EVENT_TYPES = ["Club", "Appointment", "Study", "To-do", "Personal", "Deadline", "Shift", "Exam"] as const;
const EVENT_COLORS = ["#3AA8C5", "#2BB8A4", "#5B9AD8", "#6DB58A", "#4F8F9E", "#7EC4B8", "#4A7EA8"] as const;

const greetingFor = (date = new Date()) => {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

const firstName = (name?: string) => (name?.trim().split(/\s+/)[0] || "there");

const startOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(12, 0, 0, 0);
  return d;
};

const formatWeekRange = (anchor: Date) => {
  const start = startOfWeek(anchor);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const left = start.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  const right = end.toLocaleDateString(undefined, sameMonth ? { day: "numeric" } : { day: "numeric", month: "short" });
  return `${left} to ${right}`;
};

export function SchoolDashboardScreen() {
  const { workspace, updateTasks, updateNotes, updateCalendar } = useLifeOS();
  const tabBarPad = useFloatingTabBarContentPadding(12);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [tab, setTab] = useState<SchoolTab>("home");
  const [sheet, setSheet] = useState<"capture" | "calendar" | null>(null);
  const [timetableMode, setTimetableMode] = useState<"day" | "week">("day");
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [focusTaskId, setFocusTaskId] = useState<number | null>(null);

  const [captureTitle, setCaptureTitle] = useState("");
  const [captureKind, setCaptureKind] = useState<CaptureKind>("Task");
  const [captureClassId, setCaptureClassId] = useState<string | undefined>();
  const [captureWhen, setCaptureWhen] = useState<WhenOpt>("today");

  const [eventTitle, setEventTitle] = useState("");
  const [eventLabel, setEventLabel] = useState("");
  const [eventType, setEventType] = useState<string>("Club");
  const [eventColor, setEventColor] = useState<string>("auto");
  const [eventDate, setEventDate] = useState(toDateKey(new Date()));

  const now = new Date();
  const today = toDateKey(now);
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() + 7);
  const weekEndKey = toDateKey(weekEnd);

  const courses = useMemo(() => workspace.classes.filter((c) => !c.archived), [workspace.classes]);
  const terms = useMemo(() => {
    const unique = Array.from(
      new Set(courses.map((c) => c.term).filter((value): value is string => Boolean(value))),
    );
    return unique.length ? unique : ["Fall"];
  }, [courses]);
  const [term, setTerm] = useState(terms[0] ?? "Fall");
  const termCourses = courses.filter((c) => !c.term || c.term === term || terms.length === 1);

  const schoolTasks = workspace.tasks.filter((task) => task.classId && taskIsOpen(task));
  const dueThisWeek = schoolTasks.filter((task) => task.due && task.due >= today && task.due <= weekEndKey);
  const assignments = schoolTasks
    .filter((task) => task.academicType && !["Reading", "Discussion"].includes(task.academicType))
    .sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));

  const courseFor = (classId?: string) => courses.find((c) => c.id === classId);
  const displayName = workspace.settings.preferredName || "there";
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "U";
  const focusTask = workspace.tasks.find((task) => task.id === focusTaskId);

  const openCreate = (kind: string) => navigation.navigate("AcademicCreate", { kind });

  const shiftWeek = (delta: number) => {
    setWeekAnchor((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + delta * 7);
      return next;
    });
  };

  const openCapture = () => {
    setCaptureTitle("");
    setCaptureKind("Task");
    setCaptureClassId(courses[0]?.id);
    setCaptureWhen("today");
    setSheet("capture");
  };

  const openCalendarSheet = () => {
    setEventTitle("");
    setEventLabel("");
    setEventType("Club");
    setEventColor("auto");
    setEventDate(today);
    setSheet("calendar");
  };

  const submitCapture = async () => {
    const title = captureTitle.trim();
    if (!title) return;

    if (captureKind === "Note") {
      await updateNotes([
        {
          id: uid(),
          title,
          body: "",
          classId: captureClassId,
          updatedAt: new Date().toISOString(),
        },
        ...workspace.notes,
      ]);
      setSheet(null);
      return;
    }

    if (!captureClassId) {
      Alert.alert("Add a course first", "School tasks need a course so they stay organized.", [
        { text: "Cancel", style: "cancel" },
        { text: "Add course", onPress: () => { setSheet(null); openCreate("course"); } },
      ]);
      return;
    }

    const dueBase = new Date();
    if (captureWhen === "tomorrow") dueBase.setDate(dueBase.getDate() + 1);
    const due = toDateKey(dueBase);
    const course = courseFor(captureClassId);
    const id = Date.now();
    const next: Task = {
      id,
      title,
      classId: captureClassId,
      color: course?.color ?? SP.teal,
      project: "Inbox",
      due,
      priority: "Medium",
      academicType: captureKind === "Deadline" ? "Assignment" : "Assignment",
      focusMinutes: workspace.settings.defaultFocusMinutes ?? 45,
      energy: workspace.settings.defaultEnergy ?? "Medium",
      status: "Not started",
      checklist: [],
      checklistProgress: [],
    };
    await updateTasks([...workspace.tasks, next]);
    setSheet(null);
  };

  const submitEvent = async () => {
    const title = eventTitle.trim();
    if (!title) return;
    const color = eventColor === "auto"
      ? EVENT_COLORS[EVENT_TYPES.indexOf(eventType as typeof EVENT_TYPES[number])] || EVENT_COLORS[0]
      : eventColor;
    const event: CalendarEvent = {
      id: `school-${Date.now()}`,
      title: eventLabel.trim() ? `${title} · ${eventLabel.trim()}` : title,
      start: `${eventDate}T09:00:00`,
      source: "LifeOS",
      color,
      notes: eventType,
    };
    await updateCalendar([event, ...workspace.calendar]);
    setSheet(null);
  };

  const completeTask = (id: number) =>
    updateTasks(
      workspace.tasks.map((task) =>
        task.id === id ? { ...task, done: true, status: "Done", completedAt: new Date().toISOString() } : task,
      ),
    );

  const renderHome = () => (
    <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]} showsVerticalScrollIndicator={false}>
      <View style={styles.homeHeader}>
        <View style={styles.grow}>
          <Text style={styles.dateKicker}>
            {now.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" }).toUpperCase()}
          </Text>
          <Text style={styles.greeting}>{greetingFor(now)}, {firstName(displayName)}</Text>
        </View>
        <View style={styles.homeActions}>
          <Pressable style={styles.ghostBtn} onPress={() => navigation.navigate("SchoolProfile")}>
            <Text style={styles.ghostBtnText}>Customize</Text>
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={openCapture} accessibilityLabel="Search / capture">
            <Feather name="search" size={16} color={SP.ink} />
          </Pressable>
          <Pressable style={styles.avatar} onPress={() => setTab("more")} accessibilityLabel="More">
            <Text style={styles.avatarText}>{initials.slice(0, 1)}</Text>
          </Pressable>
        </View>
      </View>

      {courses.length === 0 ? (
        <Pressable style={styles.alert} onPress={() => setTab("timetable")}>
          <View style={styles.alertDot} />
          <Text style={styles.alertText}>
            No classes on your timetable yet.{" "}
            <Text style={styles.alertStrong}>Add one from Timetable.</Text>
          </Text>
        </Pressable>
      ) : null}

      <View style={styles.statRow}>
        <Pressable style={styles.statCard} onPress={() => setTab("due")}>
          <Text style={styles.statLabel}>Due this week</Text>
          <Text style={styles.statValue}>{dueThisWeek.length}</Text>
        </Pressable>
        <Pressable style={styles.statCard} onPress={() => setTab("timetable")}>
          <Text style={styles.statLabel}>Class this week</Text>
          <Text style={styles.statValue}>{termCourses.length}</Text>
        </Pressable>
      </View>

      <Pressable style={styles.captureCard} onPress={openCapture} testID="school-open-capture">
        <Text style={styles.captureKicker}>Quick capture</Text>
        <Text style={styles.captureHint}>Type anything, a task, deadline, note...</Text>
      </Pressable>

      {dueThisWeek.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionKicker}>Coming up</Text>
          {dueThisWeek.slice(0, 5).map((task) => (
            <Pressable
              key={task.id}
              style={styles.taskRow}
              onPress={() => navigation.navigate("TasksTab", { screen: "TaskDetail", params: { taskId: task.id } })}
            >
              <View style={[styles.taskDot, { backgroundColor: courseFor(task.classId)?.color ?? SP.teal }]} />
              <View style={styles.grow}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <Text style={styles.taskMeta}>
                  {courseFor(task.classId)?.code ?? "School"} · {formatDueDate(task.due)}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );

  const renderTimetable = () => (
    <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]} showsVerticalScrollIndicator={false}>
      <View style={styles.pageHead}>
        <View style={styles.grow}>
          <Text style={styles.sectionKicker}>Your classes</Text>
          <Text style={styles.pageTitle}>Timetable</Text>
        </View>
        <View style={styles.pageActions}>
          <Pressable style={styles.outlineBtn} onPress={() => openCreate("course")}>
            <Feather name="plus" size={14} color={SP.teal} />
            <Text style={styles.outlineText}>Class</Text>
          </Pressable>
          <Pressable style={styles.outlineBtn} onPress={() => navigation.navigate("CalendarTab")}>
            <Text style={styles.outlineText}>Import</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.toolbarRow}>
        <View style={styles.toggle}>
          <Pressable style={[styles.toggleBtn, timetableMode === "day" && styles.toggleSelected]} onPress={() => setTimetableMode("day")}>
            <Text style={[styles.toggleText, timetableMode === "day" && styles.toggleTextSelected]}>Day</Text>
          </Pressable>
          <Pressable style={[styles.toggleBtn, timetableMode === "week" && styles.toggleSelected]} onPress={() => setTimetableMode("week")}>
            <Text style={[styles.toggleText, timetableMode === "week" && styles.toggleTextSelected]}>Week</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {terms.map((item) => (
            <Pressable key={item} style={[styles.termChip, term === item && styles.termChipSelected]} onPress={() => setTerm(item)}>
              <Text style={[styles.termChipText, term === item && styles.termChipTextSelected]}>{item}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.weekNav}>
        <Pressable onPress={() => shiftWeek(-1)} style={styles.weekNavBtn} accessibilityLabel="Previous week">
          <Feather name="chevron-left" size={16} color={SP.ink} />
        </Pressable>
        <Text style={styles.weekNavLabel}>This week {formatWeekRange(weekAnchor)}</Text>
        <Pressable onPress={() => shiftWeek(1)} style={styles.weekNavBtn} accessibilityLabel="Next week">
          <Feather name="chevron-right" size={16} color={SP.ink} />
        </Pressable>
      </View>

      {termCourses.length === 0 ? (
        <View style={styles.emptyPanel}>
          <Text style={styles.emptyText}>Nothing in your {term} term yet.</Text>
          <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate("CalendarTab")}>
            <Text style={styles.primaryBtnText}>Import my timetable</Text>
          </Pressable>
          <Text style={styles.hint}>Most universities export an .ics from Moodle, Canvas, TimeEdit or Outlook.</Text>
          <Pressable style={styles.outlineBtnWide} onPress={() => openCreate("course")}>
            <Text style={styles.outlineText}>Or add a class by hand</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.listGap}>
          {termCourses.map((course) => (
            <Pressable
              key={course.id}
              style={styles.classRow}
              onPress={() => navigation.navigate("ClassDetail", { classId: course.id })}
            >
              <View style={[styles.classDot, { backgroundColor: course.color ?? SP.teal }]} />
              <View style={styles.grow}>
                <Text style={styles.classCode}>{course.code}</Text>
                <Text style={styles.className}>{course.name}{course.instructor ? ` · ${course.instructor}` : ""}</Text>
              </View>
              <Feather name="chevron-right" size={16} color={SP.muted} />
            </Pressable>
          ))}
        </View>
      )}

      <Pressable style={styles.linkRow} onPress={openCapture}>
        <View style={styles.alertDot} />
        <Text style={[styles.linkRowText, { color: SP.tealDeep, flex: 1 }]}>Free blocks this week, drop a study session?</Text>
      </Pressable>
      <Pressable style={styles.linkRow} onPress={() => navigation.navigate("CoursesDirectory")}>
        <Text style={[styles.linkRowText, { flex: 1 }]}>Semester overview</Text>
        <Feather name="chevron-right" size={16} color={SP.muted} />
      </Pressable>
      <Pressable style={styles.linkRow} onPress={openCalendarSheet}>
        <Text style={[styles.linkRowText, { flex: 1 }]}>Clubs, appointments and everything else</Text>
        <Text style={styles.linkRowAction}>Calendar ›</Text>
      </Pressable>
    </ScrollView>
  );

  const renderAssignments = () => (
    <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]} showsVerticalScrollIndicator={false}>
      <View style={styles.pageHead}>
        <View style={styles.grow}>
          <Text style={styles.pageTitle}>Assignments</Text>
          <Text style={styles.pageSub}>Soonest due first · {assignments.length} to do</Text>
        </View>
        <View style={styles.pageActions}>
          <Pressable style={styles.outlineBtn} onPress={() => openCreate("assignment")}>
            <Text style={styles.outlineText}>Paste syllabus</Text>
          </Pressable>
          <Pressable style={styles.outlineBtn} onPress={() => openCreate("assignment")} testID="school-new-assignment">
            <Feather name="plus" size={14} color={SP.teal} />
            <Text style={styles.outlineText}>New</Text>
          </Pressable>
        </View>
      </View>
      {assignments.length ? (
        <View style={styles.listGap}>
          {assignments.map((task) => (
            <Pressable
              key={task.id}
              style={styles.taskRow}
              onPress={() => navigation.navigate("TasksTab", { screen: "TaskDetail", params: { taskId: task.id } })}
            >
              <View style={[styles.taskDot, { backgroundColor: courseFor(task.classId)?.color ?? SP.teal }]} />
              <View style={styles.grow}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <Text style={styles.taskMeta}>
                  {courseFor(task.classId)?.code ?? "School"} · {task.academicType ?? "Assignment"} · {formatDueDate(task.due)}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.dashedEmpty}>
          <Text style={styles.emptyText}>No assignments yet. Tap &apos;+ New&apos; to add your first.</Text>
        </View>
      )}
    </ScrollView>
  );

  const renderDue = () => (
    <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]} showsVerticalScrollIndicator={false}>
      <Pressable style={styles.backLink} onPress={() => setTab("home")}>
        <Feather name="chevron-left" size={14} color={SP.muted} />
        <Text style={styles.backLinkText}>Home</Text>
      </Pressable>
      <Text style={styles.pageTitle}>What&apos;s due</Text>
      <Text style={styles.pageSub}>{dueThisWeek.length} due this week</Text>
      {dueThisWeek.length ? (
        <View style={[styles.listGap, { marginTop: 16 }]}>
          {dueThisWeek.map((task) => (
            <Pressable
              key={task.id}
              style={styles.taskRow}
              onPress={() => navigation.navigate("TasksTab", { screen: "TaskDetail", params: { taskId: task.id } })}
            >
              <View style={[styles.taskDot, { backgroundColor: courseFor(task.classId)?.color ?? SP.teal }]} />
              <View style={styles.grow}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <Text style={styles.taskMeta}>
                  {courseFor(task.classId)?.code ?? "School"} · {formatDueDate(task.due)}
                </Text>
              </View>
              <Pressable onPress={() => completeTask(task.id)} hitSlop={10} accessibilityLabel={`Complete ${task.title}`}>
                <Feather name="check-square" size={18} color={SP.muted} />
              </Pressable>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={[styles.dashedEmpty, { marginTop: 16 }]}>
          <Text style={styles.emptyText}>Nothing due. Enjoy it ♥</Text>
        </View>
      )}
    </ScrollView>
  );

  const moreLinks: { key: string; label: string; icon: keyof typeof Feather.glyphMap; onPress: () => void }[] = [
    { key: "study", label: "Study", icon: "clock", onPress: () => (schoolTasks[0] ? setFocusTaskId(schoolTasks[0].id) : openCapture()) },
    { key: "grades", label: "Grades & what-if", icon: "pie-chart", onPress: () => setTab("due") },
    { key: "exams", label: "Exam tracker", icon: "grid", onPress: () => setTab("assignments") },
    { key: "goals", label: "Goals", icon: "target", onPress: () => navigation.navigate("HubCollection", { scope: "school", collection: "goals" }) },
    { key: "wellness", label: "Wellness check-in", icon: "heart", onPress: () => navigation.navigate("SchoolProfile") },
    { key: "reminders", label: "Reminders", icon: "bell", onPress: () => openCreate("task") },
    { key: "reading", label: "Reading tracker", icon: "book", onPress: () => openCreate("lecture") },
    { key: "subjects", label: "Subjects", icon: "star", onPress: () => navigation.navigate("HubCollection", { scope: "school", collection: "topics" }) },
    { key: "progress", label: "Weekly progress", icon: "activity", onPress: () => setTab("due") },
  ];

  const renderMore = () => (
    <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]} showsVerticalScrollIndicator={false}>
      <View style={styles.moreProfile}>
        <View style={[styles.avatar, { width: 48, height: 48 }]}>
          <Text style={[styles.avatarText, { fontSize: 16 }]}>{initials.slice(0, 1)}</Text>
        </View>
        <View style={styles.grow}>
          <Text style={styles.moreName}>{displayName}</Text>
          <Text style={styles.moreEmail}>
            {workspace.school.profile.major || "Personal workspace"} · synced ♥
          </Text>
        </View>
      </View>

      <View style={styles.menuCard}>
        {moreLinks.map((item) => (
          <Pressable key={item.key} style={styles.menuRow} onPress={item.onPress}>
            <View style={styles.menuIcon}><Feather name={item.icon} size={16} color={SP.teal} /></View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Feather name="chevron-right" size={16} color={SP.muted} />
          </Pressable>
        ))}
      </View>

      <View style={styles.menuCard}>
        <Pressable style={styles.menuRow} onPress={() => navigation.navigate("NowTab", { screen: "Settings" })}>
          <View style={styles.menuIcon}><Feather name="sun" size={16} color={SP.teal} /></View>
          <Text style={styles.menuLabel}>Appearance</Text>
          <Text style={styles.menuMeta}>Mist</Text>
        </Pressable>
        <Pressable style={styles.menuRow} onPress={() => navigation.navigate("SchoolProfile")}>
          <View style={styles.menuIcon}><Feather name="user" size={16} color={SP.teal} /></View>
          <Text style={styles.menuLabel}>Academic profile</Text>
          <Feather name="chevron-right" size={16} color={SP.muted} />
        </Pressable>
        <Pressable style={styles.menuRow} onPress={() => openCreate("lecture")}>
          <View style={styles.menuIcon}><Feather name="book-open" size={16} color={SP.teal} /></View>
          <Text style={styles.menuLabel}>Lecture notes</Text>
          <Feather name="chevron-right" size={16} color={SP.muted} />
        </Pressable>
      </View>
    </ScrollView>
  );

  const body =
    tab === "timetable" ? renderTimetable()
      : tab === "assignments" ? renderAssignments()
        : tab === "due" ? renderDue()
          : tab === "more" ? renderMore()
            : renderHome();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]} testID="school-planner">
      <View style={styles.topChrome} testID="school-top-nav">
        <View style={styles.segmentRow}>
          <SegmentItem label="Home" selected={tab === "home" || tab === "due"} onPress={() => setTab("home")} testID="school-nav-home" />
          <SegmentItem label="Timetable" selected={tab === "timetable"} onPress={() => setTab("timetable")} testID="school-nav-timetable" />
          <SegmentItem label="Assignments" selected={tab === "assignments"} onPress={() => setTab("assignments")} testID="school-nav-assignments" />
          <SegmentItem label="More" selected={tab === "more"} onPress={() => setTab("more")} testID="school-nav-more" />
        </View>
        <Pressable
          style={styles.calendarChip}
          onPress={openCalendarSheet}
          accessibilityLabel="Add to calendar"
          testID="school-nav-calendar"
        >
          <Feather name="plus" size={18} color="#FFF" />
        </Pressable>
      </View>

      {body}

      <Modal visible={sheet === "capture"} animationType="slide" transparent onRequestClose={() => setSheet(null)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setSheet(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.grabber} />
            <Text style={styles.sheetTitle}>Quick capture</Text>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <TextInput
                testID="school-capture-input"
                style={styles.textarea}
                placeholder="Type anything, a task, deadline, note..."
                placeholderTextColor={SP.muted}
                value={captureTitle}
                onChangeText={setCaptureTitle}
                multiline
                autoFocus
              />
              <View style={styles.pillRow}>
                {(["Task", "Deadline", "Note"] as CaptureKind[]).map((kind) => (
                  <Pressable key={kind} style={[styles.pill, captureKind === kind && styles.pillSelected]} onPress={() => setCaptureKind(kind)}>
                    <Text style={[styles.pillText, captureKind === kind && styles.pillTextSelected]}>{kind}</Text>
                  </Pressable>
                ))}
              </View>
              {captureKind !== "Note" ? (
                <>
                  <Text style={styles.fieldLabel}>Subject</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                    {courses.length ? courses.map((course) => (
                      <Pressable
                        key={course.id}
                        style={[styles.subjectPill, captureClassId === course.id && styles.subjectPillSelected]}
                        onPress={() => setCaptureClassId(course.id)}
                      >
                        <View style={[styles.miniDot, { backgroundColor: course.color ?? SP.teal }]} />
                        <Text style={[styles.subjectPillText, captureClassId === course.id && { color: "#FFF" }]} numberOfLines={1}>
                          {course.name || course.code}
                        </Text>
                      </Pressable>
                    )) : (
                      <Pressable style={styles.outlineBtn} onPress={() => { setSheet(null); openCreate("course"); }}>
                        <Text style={styles.outlineText}>Add a course</Text>
                      </Pressable>
                    )}
                  </ScrollView>
                  <Text style={styles.fieldLabel}>When</Text>
                  <View style={styles.pillRow}>
                    <Pressable style={[styles.pill, captureWhen === "today" && styles.pillSelected]} onPress={() => setCaptureWhen("today")}>
                      <Text style={[styles.pillText, captureWhen === "today" && styles.pillTextSelected]}>Today</Text>
                    </Pressable>
                    <Pressable style={[styles.pill, captureWhen === "tomorrow" && styles.pillSelected]} onPress={() => setCaptureWhen("tomorrow")}>
                      <Text style={[styles.pillText, captureWhen === "tomorrow" && styles.pillTextSelected]}>Tomorrow</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.helper}>A to-do for today, or pick a day ahead.</Text>
                </>
              ) : null}
              <Pressable
                style={[styles.primaryBtn, { marginTop: 18 }, !captureTitle.trim() && styles.primaryDisabled]}
                disabled={!captureTitle.trim()}
                onPress={submitCapture}
                testID="school-capture-submit"
              >
                <Text style={styles.primaryBtnText}>Capture it</Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={sheet === "calendar"} animationType="slide" transparent onRequestClose={() => setSheet(null)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setSheet(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.grabber} />
            <Text style={styles.sheetTitle}>Add to calendar</Text>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <TextInput
                testID="school-event-title"
                style={styles.input}
                placeholder="Event title"
                placeholderTextColor={SP.muted}
                value={eventTitle}
                onChangeText={setEventTitle}
                autoFocus
              />
              <TextInput
                style={[styles.input, { marginTop: 10 }]}
                placeholder="e.g. Club, Appointment, Gym"
                placeholderTextColor={SP.muted}
                value={eventLabel}
                onChangeText={setEventLabel}
              />
              <Text style={styles.helper}>Your own category name, shown instead of the type.</Text>
              <Text style={[styles.fieldLabel, { color: SP.muted }]}>Type</Text>
              <View style={styles.typeGrid}>
                {EVENT_TYPES.map((type) => (
                  <Pressable key={type} style={[styles.typeChip, eventType === type && styles.typeChipSelected]} onPress={() => setEventType(type)}>
                    <Text style={[styles.typeChipText, eventType === type && { color: "#FFF" }]}>{type}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[styles.fieldLabel, { color: SP.muted }]}>Colour</Text>
              <View style={styles.colorRow}>
                <Pressable style={[styles.swatchAuto, eventColor === "auto" && styles.swatchSelected]} onPress={() => setEventColor("auto")}>
                  <Text style={styles.swatchAutoText}>Auto</Text>
                </Pressable>
                {EVENT_COLORS.map((swatch) => (
                  <Pressable
                    key={swatch}
                    style={[styles.swatch, { backgroundColor: swatch }, eventColor === swatch && styles.swatchSelected]}
                    onPress={() => setEventColor(swatch)}
                  />
                ))}
              </View>
              <Text style={[styles.fieldLabel, { color: SP.muted }]}>Date</Text>
              <TextInput style={styles.input} value={eventDate} onChangeText={setEventDate} placeholder="YYYY-MM-DD" placeholderTextColor={SP.muted} />
              <Pressable
                style={[styles.primaryBtn, { marginTop: 18 }, !eventTitle.trim() && styles.primaryDisabled]}
                disabled={!eventTitle.trim()}
                onPress={submitEvent}
                testID="school-event-submit"
              >
                <Text style={styles.primaryBtnText}>Add to calendar</Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {focusTask ? (
        <FocusModal visible={Boolean(focusTaskId)} task={focusTask} onClose={() => setFocusTaskId(null)} />
      ) : null}
    </View>
  );
}

function SegmentItem({
  label,
  selected,
  onPress,
  testID,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      style={[styles.segmentItem, selected && styles.segmentItemSelected]}
      onPress={onPress}
      testID={testID}
    >
      <Text style={[styles.segmentLabel, selected && styles.segmentLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

const serif = Platform.OS === "ios" ? "Georgia" : "serif";

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SP.mist },
  scroll: { paddingHorizontal: 18, paddingTop: 8, gap: 14 },
  grow: { flex: 1, minWidth: 0 },
  homeHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingTop: 4 },
  dateKicker: { color: SP.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1.2, marginBottom: 6 },
  greeting: { fontFamily: serif, fontSize: 30, fontWeight: "500", color: SP.ink, letterSpacing: -0.5, lineHeight: 34 },
  homeActions: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 4 },
  ghostBtn: {
    height: 36, borderRadius: 999, borderWidth: 1, borderColor: SP.line,
    backgroundColor: "rgba(255,255,255,0.8)", paddingHorizontal: 14, justifyContent: "center",
  },
  ghostBtnText: { fontSize: 12, fontWeight: "600", color: SP.ink },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: SP.panel,
    alignItems: "center", justifyContent: "center",
  },
  avatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: SP.teal,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { color: "#FFF", fontSize: 13, fontWeight: "700" },
  alert: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    borderWidth: 1, borderColor: "rgba(15,138,122,0.35)", backgroundColor: SP.alert,
    borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16,
  },
  alertDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: SP.teal, marginTop: 5 },
  alertText: { flex: 1, color: SP.tealDeep, fontSize: 13, lineHeight: 18 },
  alertStrong: { fontWeight: "700", textDecorationLine: "underline" },
  statRow: { flexDirection: "row", gap: 12 },
  statCard: {
    flex: 1, backgroundColor: SP.panel, borderRadius: 22, paddingVertical: 18, paddingHorizontal: 16,
    shadowColor: "#0F5A64", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2,
  },
  statLabel: { color: SP.muted, fontSize: 10, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  statValue: { fontFamily: serif, fontSize: 40, fontWeight: "500", color: SP.ink, marginTop: 8, letterSpacing: -1 },
  captureCard: {
    backgroundColor: SP.panel, borderRadius: 22, padding: 18,
    shadowColor: "#0F5A64", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1,
  },
  captureKicker: { color: SP.teal, fontSize: 11, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase" },
  captureHint: { color: SP.muted, fontSize: 14, marginTop: 6 },
  section: { gap: 10 },
  sectionKicker: { color: SP.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase" },
  pageHead: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingTop: 4 },
  pageTitle: { fontFamily: serif, fontSize: 30, fontWeight: "500", color: SP.ink, letterSpacing: -0.5 },
  pageSub: { color: SP.muted, fontSize: 13, marginTop: 4 },
  pageActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" },
  outlineBtn: {
    height: 38, borderRadius: 999, borderWidth: 1.5, borderColor: "rgba(15,138,122,0.55)",
    paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 6,
  },
  outlineBtnWide: {
    height: 42, borderRadius: 999, borderWidth: 1.5, borderColor: "rgba(15,138,122,0.55)",
    paddingHorizontal: 18, alignItems: "center", justifyContent: "center", alignSelf: "center",
  },
  outlineText: { color: SP.teal, fontSize: 12, fontWeight: "600" },
  toolbarRow: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  toggle: { flexDirection: "row", backgroundColor: SP.mistDeep, borderRadius: 999, padding: 3, gap: 2 },
  toggleBtn: { height: 32, borderRadius: 999, paddingHorizontal: 14, justifyContent: "center" },
  toggleSelected: { backgroundColor: SP.teal },
  toggleText: { fontSize: 12, fontWeight: "600", color: SP.muted },
  toggleTextSelected: { color: "#FFF" },
  termChip: {
    height: 36, borderRadius: 999, borderWidth: 1, borderColor: SP.line,
    backgroundColor: SP.panel, paddingHorizontal: 12, justifyContent: "center",
  },
  termChipSelected: { backgroundColor: SP.teal, borderColor: SP.teal },
  termChipText: { fontSize: 12, fontWeight: "600", color: SP.ink },
  termChipTextSelected: { color: "#FFF" },
  weekNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  weekNavBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: SP.panel,
    alignItems: "center", justifyContent: "center",
  },
  weekNavLabel: { color: SP.muted, fontSize: 13, fontWeight: "500" },
  emptyPanel: {
    backgroundColor: SP.panel, borderRadius: 24, paddingVertical: 36, paddingHorizontal: 22,
    alignItems: "center", gap: 14,
    shadowColor: "#0F5A64", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 1,
  },
  dashedEmpty: {
    minHeight: 160, borderWidth: 1.5, borderStyle: "dashed", borderColor: SP.line,
    borderRadius: 28, alignItems: "center", justifyContent: "center", padding: 28,
  },
  emptyText: { color: SP.muted, fontSize: 15, textAlign: "center" },
  hint: { color: SP.muted, fontSize: 12, lineHeight: 18, textAlign: "center" },
  primaryBtn: {
    minHeight: 48, borderRadius: 999, backgroundColor: SP.teal, paddingHorizontal: 22,
    alignItems: "center", justifyContent: "center",
    shadowColor: SP.teal, shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3,
  },
  primaryDisabled: { opacity: 0.45 },
  primaryBtnText: { color: "#FFF", fontSize: 15, fontWeight: "600" },
  listGap: { gap: 10 },
  classRow: {
    flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: SP.panel,
    borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16,
  },
  classDot: { width: 12, height: 12, borderRadius: 6 },
  classCode: { fontSize: 14, fontWeight: "700", color: SP.ink },
  className: { fontSize: 12, color: SP.muted, marginTop: 2 },
  linkRow: {
    flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: SP.panel,
    borderRadius: 18, paddingVertical: 16, paddingHorizontal: 16,
  },
  linkRowText: { fontSize: 14, fontWeight: "500", color: SP.ink },
  linkRowAction: { color: SP.teal, fontWeight: "600", fontSize: 13 },
  taskRow: {
    flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: SP.panel,
    borderRadius: 18, paddingVertical: 14, paddingHorizontal: 14,
  },
  taskDot: { width: 10, height: 10, borderRadius: 5 },
  taskTitle: { fontSize: 14, fontWeight: "600", color: SP.ink },
  taskMeta: { fontSize: 12, color: SP.muted, marginTop: 3 },
  backLink: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 },
  backLinkText: { color: SP.muted, fontSize: 13, fontWeight: "600" },
  moreProfile: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  moreName: { fontSize: 15, fontWeight: "700", color: SP.ink },
  moreEmail: { fontSize: 12, color: SP.muted, marginTop: 3 },
  menuCard: {
    backgroundColor: SP.panel, borderRadius: 24, overflow: "hidden",
    shadowColor: "#0F5A64", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 1,
  },
  menuRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 15, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: SP.line,
  },
  menuIcon: {
    width: 34, height: 34, borderRadius: 12, backgroundColor: SP.mistDeep,
    alignItems: "center", justifyContent: "center",
  },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: "500", color: SP.ink },
  menuMeta: { color: SP.teal, fontSize: 13, fontWeight: "600" },
  topChrome: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: SP.line,
    backgroundColor: SP.mist,
  },
  segmentRow: {
    flex: 1, flexDirection: "row", backgroundColor: SP.mistDeep, borderRadius: 999, padding: 3, gap: 2,
  },
  segmentItem: {
    flex: 1, height: 34, borderRadius: 999, alignItems: "center", justifyContent: "center", paddingHorizontal: 6,
  },
  segmentItemSelected: {
    backgroundColor: SP.panel,
    shadowColor: "#0F5A64", shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  segmentLabel: { fontSize: 12, fontWeight: "600", color: SP.muted },
  segmentLabelSelected: { color: SP.teal },
  calendarChip: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: SP.teal,
    alignItems: "center", justifyContent: "center",
    shadowColor: SP.teal, shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(26, 43, 51, 0.35)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: SP.mist, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 18, paddingTop: 10, paddingBottom: 28, maxHeight: "92%",
  },
  grabber: { width: 42, height: 4, borderRadius: 999, backgroundColor: "#B7C7D0", alignSelf: "center", marginBottom: 14 },
  sheetTitle: {
    textAlign: "center", color: SP.teal, fontSize: 11, fontWeight: "700",
    letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 14,
  },
  textarea: {
    minHeight: 92, borderRadius: 18, backgroundColor: SP.panel, padding: 16,
    fontSize: 15, color: SP.ink, textAlignVertical: "top",
  },
  input: {
    height: 48, borderRadius: 18, backgroundColor: SP.panel, paddingHorizontal: 16,
    fontSize: 15, color: SP.ink,
  },
  fieldLabel: {
    marginTop: 14, marginBottom: 8, color: SP.teal, fontSize: 11, fontWeight: "700",
    letterSpacing: 1.2, textTransform: "uppercase",
  },
  helper: { color: SP.muted, fontSize: 12, marginTop: 8 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  pill: {
    height: 38, borderRadius: 999, backgroundColor: SP.mistDeep, paddingHorizontal: 16, justifyContent: "center",
  },
  pillSelected: { backgroundColor: SP.teal },
  pillText: { fontSize: 13, fontWeight: "600", color: SP.ink },
  pillTextSelected: { color: "#FFF" },
  subjectPill: {
    height: 46, borderRadius: 999, backgroundColor: SP.panel, borderWidth: 1, borderColor: SP.line,
    paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10, maxWidth: 260,
  },
  subjectPillSelected: { backgroundColor: SP.teal, borderColor: SP.teal },
  subjectPillText: { fontSize: 14, fontWeight: "600", color: SP.ink, maxWidth: 200 },
  miniDot: { width: 8, height: 8, borderRadius: 4 },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: {
    height: 40, borderRadius: 999, borderWidth: 1, borderColor: SP.line, backgroundColor: SP.panel,
    paddingHorizontal: 14, justifyContent: "center",
  },
  typeChipSelected: { backgroundColor: "#1A7F72", borderColor: "#1A7F72" },
  typeChipText: { fontSize: 13, fontWeight: "600", color: SP.teal },
  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  swatch: { width: 40, height: 40, borderRadius: 12, borderWidth: 2, borderColor: "transparent" },
  swatchSelected: { borderColor: SP.ink },
  swatchAuto: {
    width: 40, height: 40, borderRadius: 12, borderWidth: 2, borderColor: SP.ink,
    backgroundColor: SP.panel, alignItems: "center", justifyContent: "center",
  },
  swatchAutoText: { fontSize: 9, fontWeight: "700", color: SP.ink },
});
