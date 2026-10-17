import Feather from "@expo/vector-icons/Feather";
import { useNavigation } from "@react-navigation/native";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { FocusModal } from "../components/FocusModal";
import { useFloatingTabBarContentPadding } from "../components/FloatingTabBar";
import { Eyebrow, IconButton, Page, SegmentedControl, Subtitle, Title } from "../components/UI";
import { useLifeOS } from "../lib/LifeOSContext";
import { SPACE_COLORS, type Theme } from "../lib/theme";
import { formatDueDate, taskIsOpen, toDateKey, uid } from "../lib/helpers";
import { parseSyllabusText, pickSyllabusFile, type SyllabusItem } from "../lib/syllabusImport";
import {
  computeCourseGrade,
  formatGradePercent,
  letterForPercent,
  normalizeGradeCategories,
  normalizeGradeScale,
  resolvePointsPossible,
} from "../lib/grades";
import {
  parseGradebookText,
  planGradebookApply,
  suggestCategoryDefaults,
} from "../lib/gradebookImport";
import type { CalendarEvent, ClassRecord, Task } from "../types";

type SchoolTab = "home" | "timetable" | "assignments" | "due" | "more";
type CaptureKind = "Task" | "Deadline" | "Note";
type WhenOpt = "today" | "tomorrow" | "custom";

const EVENT_TYPES = ["Club", "Appointment", "Study", "To-do", "Personal", "Deadline", "Shift", "Exam"] as const;
const EVENT_COLORS = SPACE_COLORS.slice(0, 7);

/** Always show code and class name together when both exist. */
function formatCourseLabel(course?: { code?: string; name?: string } | null) {
  if (!course) return "School";
  const code = (course.code || "").trim();
  const name = (course.name || "").trim();
  if (code && name && code.toLowerCase() !== name.toLowerCase()) return `${code} · ${name}`;
  return code || name || "School";
}

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

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const meetsOn = (course: ClassRecord, date: Date) => {
  if (!course.meetingDays?.length) return false;
  return course.meetingDays.includes(date.getDay());
};

const formatMeeting = (course: ClassRecord) => {
  if (!course.meetingDays?.length) return "No meeting time set";
  const days = [...course.meetingDays].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
    .map((d) => DAY_SHORT[d]).join(" · ");
  if (course.meetingStart && course.meetingEnd) return `${days} · ${course.meetingStart}–${course.meetingEnd}`;
  if (course.meetingStart) return `${days} · ${course.meetingStart}`;
  return days;
};


export function SchoolDashboardScreen() {
  const { workspace, theme, dark, updateTasks, updateNotes, updateCalendar, updateClasses, updateSchool } = useLifeOS();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const appearanceLabel =
    workspace.settings.themeMode === "system" ? "System" : dark ? "Dark" : "Light";
  const tabBarPad = useFloatingTabBarContentPadding(12);
  const navigation = useNavigation<any>();

  const [tab, setTab] = useState<SchoolTab>("home");
  const [sheet, setSheet] = useState<"capture" | "calendar" | "syllabus" | "schedule" | null>(null);
  const [panel, setPanel] = useState<"grades" | "exams" | "reading" | "progress" | "wellness" | null>(null);
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [scheduleClassId, setScheduleClassId] = useState<string | undefined>();
  const [scheduleDays, setScheduleDays] = useState<number[]>([1, 3, 5]);
  const [scheduleStart, setScheduleStart] = useState("09:00");
  const [scheduleEnd, setScheduleEnd] = useState("10:00");
  const [syllabusText, setSyllabusText] = useState("");
  const [syllabusClassId, setSyllabusClassId] = useState<string | undefined>();
  const [syllabusFileName, setSyllabusFileName] = useState<string | undefined>();
  const [syllabusBusy, setSyllabusBusy] = useState(false);
  const [syllabusPreview, setSyllabusPreview] = useState<SyllabusItem[]>([]);
  const [syllabusTermStart, setSyllabusTermStart] = useState(() => {
    const now = new Date();
    const day = (now.getDay() + 6) % 7;
    now.setDate(now.getDate() - day);
    return toDateKey(now);
  });
  const [wellnessNote, setWellnessNote] = useState("");
  const [gradesClassId, setGradesClassId] = useState<string | undefined>();
  const [gradeImportText, setGradeImportText] = useState("");
  const [gradeImportOpen, setGradeImportOpen] = useState(false);
  const [manualGradeTitle, setManualGradeTitle] = useState("");
  const [manualGradePoints, setManualGradePoints] = useState("");
  const [gradeImportNotice, setGradeImportNotice] = useState("");

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
  // Home "Coming up" should show the next open work even when nothing is due in the next 7 days.
  const comingUp = [...schoolTasks].sort((a, b) => {
    const aDue = a.due && a.due >= today ? a.due : a.due ? `9${a.due}` : "9999";
    const bDue = b.due && b.due >= today ? b.due : b.due ? `9${b.due}` : "9999";
    return aDue.localeCompare(bDue);
  });
  const assignments = schoolTasks
    .filter((task) => task.academicType && !["Reading", "Discussion"].includes(task.academicType))
    .sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));

  const courseFor = (classId?: string) => courses.find((c) => c.id === classId);
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
      color: course?.color ?? theme.accent,
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


  const exams = schoolTasks
    .filter((task) => task.academicType === "Exam" || task.academicType === "Quiz")
    .sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));
  const readingTasks = schoolTasks
    .filter((task) => task.academicType === "Reading")
    .sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));
  const completedThisWeek = workspace.tasks.filter(
    (task) => task.classId && task.done && task.completedAt && task.completedAt.slice(0, 10) >= today && task.completedAt.slice(0, 10) <= weekEndKey,
  );
  const weekDays = useMemo(() => {
    const start = startOfWeek(weekAnchor);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [weekAnchor]);

  const openSyllabus = () => {
    setSyllabusText("");
    setSyllabusFileName(undefined);
    setSyllabusPreview([]);
    setSyllabusClassId(courses[0]?.id);
    setSheet("syllabus");
  };

  const refreshSyllabusPreview = (text: string, termStart = syllabusTermStart) => {
    setSyllabusText(text);
    setSyllabusPreview(parseSyllabusText(text, { termStart: termStart || undefined }));
  };

  const importSyllabusFile = async () => {
    setSyllabusBusy(true);
    try {
      const picked = await pickSyllabusFile({ termStart: syllabusTermStart || undefined });
      if (!picked) return;
      setSyllabusFileName(picked.name);
      refreshSyllabusPreview(picked.text);
      if (!picked.items.length) {
        Alert.alert(
          "No coursework found yet",
          "We loaded the file. Set a term start for module schedules, or edit the text if needed.",
        );
      }
    } catch (error) {
      Alert.alert("Couldn't read file", error instanceof Error ? error.message : "Try another PDF, Word, or Markdown file.");
    } finally {
      setSyllabusBusy(false);
    }
  };

  const openSchedule = (classId: string) => {
    const course = courseFor(classId);
    setScheduleClassId(classId);
    setScheduleDays(course?.meetingDays?.length ? [...course.meetingDays] : [1, 3, 5]);
    setScheduleStart(course?.meetingStart ?? "09:00");
    setScheduleEnd(course?.meetingEnd ?? "10:00");
    setSheet("schedule");
  };

  const saveSchedule = async () => {
    if (!scheduleClassId) return;
    await updateClasses(
      workspace.classes.map((course) =>
        course.id === scheduleClassId
          ? {
              ...course,
              meetingDays: scheduleDays.length ? scheduleDays : undefined,
              meetingStart: scheduleDays.length ? scheduleStart : undefined,
              meetingEnd: scheduleDays.length ? scheduleEnd : undefined,
            }
          : course,
      ),
    );
    setSheet(null);
  };

  const submitSyllabus = async () => {
    if (!syllabusClassId) {
      Alert.alert("Add a course first", "Syllabus items need a course.", [
        { text: "Cancel", style: "cancel" },
        { text: "Add course", onPress: () => { setSheet(null); openCreate("course"); } },
      ]);
      return;
    }
    const items = syllabusPreview.length ? syllabusPreview : parseSyllabusText(syllabusText, { termStart: syllabusTermStart || undefined });
    if (!items.length) {
      Alert.alert("Nothing to add", "Add a term start for module schedules, or lines with assignment names and due dates.");
      return;
    }
    const course = courseFor(syllabusClassId);
    let stamp = Date.now();
    const created: Task[] = items.map((item) => {
      stamp += 1;
      return {
        id: stamp,
        title: item.title,
        classId: syllabusClassId,
        color: course?.color ?? theme.accent,
        project: "Inbox",
        due: item.due,
        priority: "Medium" as const,
        academicType: item.academicType,
        focusMinutes: workspace.settings.defaultFocusMinutes ?? 45,
        energy: workspace.settings.defaultEnergy ?? "Medium",
        status: "Not started" as const,
        checklist: [],
        checklistProgress: [],
        notes: syllabusFileName ? `Imported from ${syllabusFileName}` : "Imported from syllabus",
      };
    });
    const calendarEvents: CalendarEvent[] = items
      .filter((item) => item.due)
      .map((item, index) => ({
        id: `syllabus-${stamp}-${index}`,
        title: `${formatCourseLabel(course)} · ${item.title}`,
        start: `${item.due}T23:59:00`,
        source: "LifeOS" as const,
        color: course?.color ?? theme.accent,
        notes: `Due date from syllabus${syllabusFileName ? ` (${syllabusFileName})` : ""}`,
      }));
    await updateTasks([...workspace.tasks, ...created]);
    if (calendarEvents.length) {
      await updateCalendar([...calendarEvents, ...workspace.calendar]);
    }
    setSheet(null);
    setTab("assignments");
    Alert.alert(
      "Syllabus imported",
      `${created.length} task${created.length === 1 ? "" : "s"} added` +
        (calendarEvents.length ? ` · ${calendarEvents.length} due date${calendarEvents.length === 1 ? "" : "s"} on your calendar` : "") +
        ".",
    );
  };

  const saveWellness = async (mood: string) => {
    await updateSchool({
      ...workspace.school,
      goals: [
        {
          id: uid(),
          title: `Wellness: ${mood}`,
          subtitle: wellnessNote.trim() || undefined,
          category: "Wellness",
          date: today,
          createdAt: new Date().toISOString(),
        },
        ...workspace.school.goals,
      ],
    });
    setWellnessNote("");
    setPanel(null);
    Alert.alert("Logged", "Your check-in is saved under Goals → Wellness.");
  };

  const todayClasses = termCourses
    .filter((course) => meetsOn(course, now))
    .sort((a, b) => (a.meetingStart ?? "99").localeCompare(b.meetingStart ?? "99"));

  const renderHome = () => (
    <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]} showsVerticalScrollIndicator={false}>
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
        <Pressable style={styles.statCard} onPress={() => setTab("due")} testID="school-stat-due">
          <Text style={styles.statLabel}>Due this week</Text>
          <Text style={styles.statValue}>{dueThisWeek.length}</Text>
        </Pressable>
        <Pressable style={styles.statCard} onPress={() => setTab("timetable")} testID="school-stat-classes">
          <Text style={styles.statLabel}>Classes</Text>
          <Text style={styles.statValue}>{termCourses.length}</Text>
        </Pressable>
      </View>

      <Pressable style={styles.captureCard} onPress={openCapture} testID="school-open-capture">
        <Text style={styles.captureKicker}>Quick capture</Text>
        <Text style={styles.captureHint}>Type anything — a task, deadline, or note…</Text>
      </Pressable>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionKicker}>Today</Text>
          <Pressable onPress={() => setTab("timetable")}>
            <Text style={styles.sectionLink}>Timetable</Text>
          </Pressable>
        </View>
        {todayClasses.length ? (
          todayClasses.map((course) => (
            <Pressable
              key={course.id}
              style={styles.classRow}
              onPress={() => navigation.navigate("ClassDetail", { classId: course.id })}
              testID={`school-today-class-${course.id}`}
            >
              <View style={[styles.classDot, { backgroundColor: course.color ?? theme.accent }]} />
              <View style={styles.grow}>
                <Text style={styles.classCode}>
                  {formatCourseLabel(course)}
                  {course.meetingStart ? ` · ${course.meetingStart}${course.meetingEnd ? `–${course.meetingEnd}` : ""}` : ""}
                </Text>
                <Text style={styles.className}>{[course.instructor, course.location].filter(Boolean).join(" · ") || "Class meeting"}</Text>
              </View>
              <Feather name="chevron-right" size={16} color={theme.muted} />
            </Pressable>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              {termCourses.length
                ? "No class meetings today — good day to catch up."
                : "Add a class with meeting days to see today’s timetable here."}
            </Text>
            <Pressable style={styles.outlineBtnWide} onPress={() => (termCourses[0] ? openSchedule(termCourses[0].id) : openCreate("course"))}>
              <Text style={styles.outlineText}>{termCourses[0] ? "Set meeting time" : "Add a class"}</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionKicker}>Coming up</Text>
          <Pressable onPress={() => setTab("assignments")}>
            <Text style={styles.sectionLink}>Assignments</Text>
          </Pressable>
        </View>
        {comingUp.length ? (
          comingUp.slice(0, 5).map((task) => (
            <Pressable
              key={task.id}
              style={styles.taskRow}
              onPress={() => navigation.navigate("TasksTab", { screen: "TaskDetail", params: { taskId: task.id } })}
            >
              <View style={[styles.taskDot, { backgroundColor: courseFor(task.classId)?.color ?? theme.accent }]} />
              <View style={styles.grow}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <Text style={styles.taskMeta}>
                  {formatCourseLabel(courseFor(task.classId))} · {task.academicType ?? "Assignment"} · {formatDueDate(task.due)}
                  {task.pointsPossible != null ? ` · ${task.pointsPossible} pts` : ""}
                </Text>
              </View>
            </Pressable>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Nothing due yet. Import a syllabus or capture your next deadline.</Text>
            <View style={styles.emptyActions}>
              <Pressable style={styles.primaryBtn} onPress={openSyllabus} testID="school-home-import-syllabus">
                <Text style={styles.primaryBtnText}>Import syllabus</Text>
              </Pressable>
              <Pressable style={styles.outlineBtnWide} onPress={() => openCreate("assignment")}>
                <Text style={styles.outlineText}>Add assignment</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );


  const renderTimetable = () => {
    const dayCourses = termCourses
      .filter((course) => meetsOn(course, selectedDay))
      .sort((a, b) => (a.meetingStart ?? "99").localeCompare(b.meetingStart ?? "99"));
    const unscheduled = termCourses.filter((course) => !course.meetingDays?.length);
    const visible = timetableMode === "day" ? dayCourses : termCourses;

    return (
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHead}>
          <View style={styles.grow}>
            <Text style={styles.sectionKicker}>Your classes</Text>
            <Text style={styles.pageTitle} numberOfLines={1}>Timetable</Text>
          </View>
          <View style={styles.pageActions}>
            <Pressable style={styles.outlineBtn} onPress={() => openCreate("course")}>
              <Feather name="plus" size={14} color={theme.accent} />
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
            <Feather name="chevron-left" size={16} color={theme.text} />
          </Pressable>
          <Text style={styles.weekNavLabel}>This week {formatWeekRange(weekAnchor)}</Text>
          <Pressable onPress={() => shiftWeek(1)} style={styles.weekNavBtn} accessibilityLabel="Next week">
            <Feather name="chevron-right" size={16} color={theme.text} />
          </Pressable>
        </View>

        {timetableMode === "day" ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayStrip}>
            {weekDays.map((day) => {
              const key = toDateKey(day);
              const selected = toDateKey(selectedDay) === key;
              const count = termCourses.filter((course) => meetsOn(course, day)).length;
              return (
                <Pressable key={key} style={[styles.dayChip, selected && styles.dayChipSelected]} onPress={() => setSelectedDay(day)}>
                  <Text style={[styles.dayChipDow, selected && styles.dayChipSelectedText]}>{DAY_SHORT[day.getDay()]}</Text>
                  <Text style={[styles.dayChipNum, selected && styles.dayChipSelectedText]}>{day.getDate()}</Text>
                  {count ? <View style={[styles.dayDot, selected && { backgroundColor: "#FFF" }]} /> : <View style={styles.dayDotSpacer} />}
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

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
        ) : timetableMode === "week" ? (
          <View style={styles.listGap}>
            {weekDays.map((day) => {
              const rows = termCourses.filter((course) => meetsOn(course, day)).sort((a, b) => (a.meetingStart ?? "").localeCompare(b.meetingStart ?? ""));
              return (
                <View key={toDateKey(day)} style={styles.weekDayBlock}>
                  <Text style={styles.weekDayLabel}>{DAY_SHORT[day.getDay()]} {day.getDate()}</Text>
                  {rows.length ? rows.map((course) => (
                    <Pressable key={course.id} style={styles.classRow} onPress={() => navigation.navigate("ClassDetail", { classId: course.id })}>
                      <View style={[styles.classDot, { backgroundColor: course.color ?? theme.accent }]} />
                      <View style={styles.grow}>
                        <Text style={styles.classCode}>{formatCourseLabel(course)}{course.meetingStart ? ` · ${course.meetingStart}` : ""}</Text>
                        <Text style={styles.className}>{course.instructor || "Tap for class details"}</Text>
                      </View>
                      <Feather name="chevron-right" size={16} color={theme.muted} />
                    </Pressable>
                  )) : (
                    <Text style={styles.weekEmpty}>No classes</Text>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.listGap}>
            {visible.length ? visible.map((course) => (
              <Pressable key={course.id} style={styles.classRow} onPress={() => navigation.navigate("ClassDetail", { classId: course.id })}>
                <View style={[styles.classDot, { backgroundColor: course.color ?? theme.accent }]} />
                <View style={styles.grow}>
                  <Text style={styles.classCode}>{formatCourseLabel(course)}</Text>
                  <Text style={styles.className}>{course.instructor || "Tap for class details"}</Text>
                  <Text style={styles.classMeta}>{formatMeeting(course)}</Text>
                </View>
                <Feather name="chevron-right" size={16} color={theme.muted} />
              </Pressable>
            )) : (
              <View style={styles.dashedEmpty}>
                <Text style={styles.emptyText}>No classes meet on {DAY_SHORT[selectedDay.getDay()]}. Free block — drop a study session?</Text>
                <Pressable style={[styles.primaryBtn, { marginTop: 12 }]} onPress={openCapture}>
                  <Text style={styles.primaryBtnText}>Plan a study block</Text>
                </Pressable>
              </View>
            )}
            {unscheduled.length ? (
              <View style={styles.listGap}>
                <Text style={styles.sectionKicker}>Needs a meeting time</Text>
                {unscheduled.map((course) => (
                  <Pressable key={course.id} style={styles.classRow} onPress={() => openSchedule(course.id)}>
                    <View style={[styles.classDot, { backgroundColor: course.color ?? theme.accent }]} />
                    <View style={styles.grow}>
                      <Text style={styles.classCode}>{formatCourseLabel(course)}</Text>
                      <Text style={styles.className}>{course.instructor || "Tap for class details"}</Text>
                      <Text style={styles.classMeta}>Tap to set days and time</Text>
                    </View>
                    <Feather name="clock" size={16} color={theme.accent} />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        )}

        <Pressable style={styles.linkRow} onPress={openCapture}>
          <View style={styles.alertDot} />
          <Text style={[styles.linkRowText, { color: theme.accent, flex: 1 }]}>Free blocks this week, drop a study session?</Text>
        </Pressable>
        <Pressable style={styles.linkRow} onPress={() => navigation.navigate("CoursesDirectory")}>
          <Text style={[styles.linkRowText, { flex: 1 }]}>Semester overview</Text>
          <Feather name="chevron-right" size={16} color={theme.muted} />
        </Pressable>
        <Pressable style={styles.linkRow} onPress={openCalendarSheet}>
          <Text style={[styles.linkRowText, { flex: 1 }]}>Clubs, appointments and everything else</Text>
          <Text style={styles.linkRowAction}>Calendar ›</Text>
        </Pressable>
      </ScrollView>
    );
  };

  const renderAssignments = () => (
    <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]} showsVerticalScrollIndicator={false}>
      <View style={styles.pageHead}>
        <View style={styles.grow}>
          <Text style={styles.pageTitle} numberOfLines={1}>Assignments</Text>
          <Text style={styles.pageSub}>Soonest due first · {assignments.length} to do</Text>
        </View>
        <View style={styles.pageActions}>
          <Pressable style={styles.outlineBtn} onPress={openSyllabus}>
            <Text style={styles.outlineText}>Import syllabus</Text>
          </Pressable>
          <Pressable style={styles.outlineBtn} onPress={() => openCreate("assignment")} testID="school-new-assignment">
            <Feather name="plus" size={14} color={theme.accent} />
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
              <Pressable
                onPress={() => completeTask(task.id)}
                hitSlop={10}
                accessibilityLabel={`Complete ${task.title}`}
                style={styles.checkHit}
              >
                <Feather name="circle" size={20} color={theme.accent} />
              </Pressable>
              <View style={[styles.taskDot, { backgroundColor: courseFor(task.classId)?.color ?? theme.accent }]} />
              <View style={styles.grow}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <Text style={styles.taskMeta}>
                  {formatCourseLabel(courseFor(task.classId))} · {task.academicType ?? "Assignment"} · {formatDueDate(task.due)}
                  {task.pointsPossible != null ? ` · ${task.pointsPossible} pts` : ""}
                  {task.gradeWeight ? ` · ${task.gradeWeight}%` : ""}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.dashedEmpty}>
          <Text style={styles.emptyText}>No assignments yet. Tap + New or import a syllabus to add your first.</Text>
        </View>
      )}
    </ScrollView>
  );

  const renderDue = () => (
    <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]} showsVerticalScrollIndicator={false}>
      <Pressable style={styles.backLink} onPress={() => setTab("home")}>
        <Feather name="chevron-left" size={14} color={theme.muted} />
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
              <View style={[styles.taskDot, { backgroundColor: courseFor(task.classId)?.color ?? theme.accent }]} />
              <View style={styles.grow}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <Text style={styles.taskMeta}>
                  {formatCourseLabel(courseFor(task.classId))} · {formatDueDate(task.due)}
                </Text>
              </View>
              <Pressable onPress={() => completeTask(task.id)} hitSlop={10} accessibilityLabel={`Complete ${task.title}`}>
                <Feather name="check-square" size={18} color={theme.muted} />
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

  const renderPanel = () => {
    if (!panel) return null;
    const title =
      panel === "grades" ? "Grades & what-if"
        : panel === "exams" ? "Exam tracker"
          : panel === "reading" ? "Reading tracker"
            : panel === "progress" ? "Weekly progress"
              : "Wellness check-in";

    return (
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.backLink} onPress={() => setPanel(null)}>
          <Feather name="chevron-left" size={14} color={theme.muted} />
          <Text style={styles.backLinkText}>More</Text>
        </Pressable>
        <Text style={styles.pageTitle}>{title}</Text>

        {panel === "grades" ? (
          (() => {
            const gradesCourse =
              courses.find((course) => course.id === (gradesClassId ?? courses[0]?.id)) ?? courses[0];
            const courseTasks = workspace.tasks.filter(
              (task) => task.classId === gradesCourse?.id && !task.canceled,
            );
            const categories = normalizeGradeCategories(gradesCourse?.gradeCategories);
            const scale = normalizeGradeScale(gradesCourse?.gradingScale);
            const gradeResult = gradesCourse
              ? computeCourseGrade(courseTasks, {
                  categories,
                  scale,
                  mode: gradesCourse.gradingMode === "items" ? "items" : "categories",
                })
              : null;
            const importPreview = parseGradebookText(gradeImportText);

            const applyGradeRows = async (raw: string) => {
              if (!gradesCourse) return;
              const rows = parseGradebookText(raw);
              if (!rows.length) {
                setGradeImportNotice("Paste from Canvas, Blackboard, Moodle, or Brightspace — or add a title + points.");
                return;
              }
              const plan = planGradebookApply(courseTasks, rows);
              let nextTasks = workspace.tasks.map((task) => {
                const update = plan.updates.find((row) => row.id === task.id);
                if (!update) return task;
                return {
                  ...task,
                  pointsPossible: update.pointsPossible,
                  academicType: (update.academicType as Task["academicType"]) ?? task.academicType,
                  ...(update.pointsEarned != null ? { pointsEarned: update.pointsEarned } : {}),
                };
              });
              const stamp = Date.now();
              const created: Task[] = plan.creates.map((row, index) => ({
                id: stamp + index,
                title: row.title,
                classId: gradesCourse.id,
                color: gradesCourse.color ?? theme.accent,
                project: "Inbox",
                due: today,
                priority: "Medium",
                academicType: row.academicType as Task["academicType"],
                pointsPossible: row.pointsPossible,
                pointsEarned: row.pointsEarned,
                focusMinutes: workspace.settings.defaultFocusMinutes ?? 45,
                energy: workspace.settings.defaultEnergy ?? "Medium",
                status: "Not started",
                checklist: [],
                checklistProgress: [],
              }));
              if (created.length) nextTasks = [...nextTasks, ...created];
              await updateTasks(nextTasks);

              const suggested = suggestCategoryDefaults(rows);
              let nextCategories = categories.map((cat) =>
                suggested[cat.id] != null && cat.defaultPoints == null
                  ? { ...cat, defaultPoints: suggested[cat.id] }
                  : cat,
              );
              if (suggested.discussions != null && !nextCategories.some((cat) => cat.id === "discussions")) {
                nextCategories = [
                  ...nextCategories,
                  { id: "discussions", name: "Discussions", weight: 10, defaultPoints: suggested.discussions },
                ];
              }
              await updateClasses(
                workspace.classes.map((course) =>
                  course.id === gradesCourse.id
                    ? { ...course, gradeCategories: nextCategories }
                    : course,
                ),
              );
              setGradeImportNotice(
                `Updated ${plan.updates.length} · added ${plan.creates.length}`,
              );
              setGradeImportText("");
              setManualGradeTitle("");
              setManualGradePoints("");
            };

            return (
              <>
                <Text style={styles.pageSub}>
                  Letter standing, points, and what-if — paste from Canvas, Blackboard, Moodle, or Brightspace.
                </Text>
                {courses.length ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }} contentContainerStyle={styles.pillRow}>
                    {courses.map((course) => {
                      const on = course.id === gradesCourse?.id;
                      return (
                        <Pressable
                          key={course.id}
                          style={[styles.pill, on && styles.subjectPillSelected]}
                          onPress={() => setGradesClassId(course.id)}
                        >
                          <Text style={[styles.pillText, on && { color: "#FFF" }]}>{course.code}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                ) : null}

                {gradesCourse ? (
                  <View style={[styles.statCard, { marginTop: 16 }]}>
                    <Text style={styles.statLabel}>{formatCourseLabel(gradesCourse)}</Text>
                    <Text style={styles.statValue}>
                      {gradeResult?.letter ?? "—"}{" "}
                      <Text style={[styles.pageSub, { fontSize: 18 }]}>
                        {formatGradePercent(gradeResult?.percent)}
                      </Text>
                    </Text>
                    <Text style={styles.helper}>
                      {gradeResult
                        ? `${gradeResult.gradedWeight.toFixed(0)}% logged · ${gradeResult.remainingWeight.toFixed(0)}% open`
                        : "Add points to see standing"}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.dashedEmpty, { marginTop: 16 }]}>
                    <Text style={styles.emptyText}>Add a class first, then import your gradebook points.</Text>
                  </View>
                )}

                <Pressable
                  style={[styles.primaryBtn, { marginTop: 14 }]}
                  onPress={() => {
                    setGradeImportOpen((value) => !value);
                    setGradeImportNotice("");
                  }}
                  testID="school-grades-import-points"
                >
                  <Text style={styles.primaryBtnText}>
                    {gradeImportOpen ? "Close import" : "Import points from LMS"}
                  </Text>
                </Pressable>

                {gradeImportOpen ? (
                  <View style={[styles.menuCard, { marginTop: 12, padding: 14, gap: 10 }]}>
                    <Text style={styles.helper}>
                      Add one item, or paste a gradebook table from Canvas / Blackboard / Moodle / Brightspace.
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Title (e.g. 1-1 Discussion)"
                      placeholderTextColor={theme.muted}
                      value={manualGradeTitle}
                      onChangeText={setManualGradeTitle}
                    />
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        placeholder="Pts"
                        placeholderTextColor={theme.muted}
                        keyboardType="decimal-pad"
                        value={manualGradePoints}
                        onChangeText={setManualGradePoints}
                      />
                      <Pressable
                        style={styles.outlineBtn}
                        onPress={() =>
                          void applyGradeRows(`${manualGradeTitle.trim()}\t${manualGradePoints.trim()}`)
                        }
                      >
                        <Text style={styles.outlineText}>Add</Text>
                      </Pressable>
                    </View>
                    <TextInput
                      style={[styles.textarea, { minHeight: 120 }]}
                      placeholder={"Assignment Name\tPoints\nDiscussion 1\t20\nEssay 1\t100"}
                      placeholderTextColor={theme.muted}
                      multiline
                      value={gradeImportText}
                      onChangeText={setGradeImportText}
                      testID="school-grades-import-text"
                    />
                    {importPreview.length ? (
                      <Text style={styles.helper}>
                        Preview · {importPreview.length} item{importPreview.length === 1 ? "" : "s"}
                      </Text>
                    ) : null}
                    <Pressable
                      style={[styles.primaryBtn, !importPreview.length && styles.primaryDisabled]}
                      disabled={!importPreview.length}
                      onPress={() => void applyGradeRows(gradeImportText)}
                      testID="school-grades-import-apply"
                    >
                      <Text style={styles.primaryBtnText}>
                        Apply to {gradesCourse?.code ?? "class"}
                      </Text>
                    </Pressable>
                    {gradeImportNotice ? <Text style={styles.helper}>{gradeImportNotice}</Text> : null}
                  </View>
                ) : null}

                {courseTasks.length ? (
                  <View style={[styles.listGap, { marginTop: 16 }]}>
                    {courseTasks.map((task) => {
                      const line = gradeResult?.items.find((item) => item.id === task.id);
                      const possible =
                        task.pointsPossible ??
                        resolvePointsPossible(task, categories) ??
                        "";
                      return (
                        <View key={task.id} style={styles.taskRow}>
                          <View style={styles.grow}>
                            <Text style={styles.taskTitle}>{task.title}</Text>
                            <Text style={styles.taskMeta}>
                              {task.academicType ?? "Task"}
                              {line ? ` · ${line.categoryName}` : ""}
                              {line?.percent != null
                                ? ` · ${formatGradePercent(line.percent)} (${letterForPercent(line.percent, scale)})`
                                : " · not scored"}
                            </Text>
                            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                              <TextInput
                                style={[styles.input, { flex: 1 }]}
                                placeholder="Earned"
                                placeholderTextColor={theme.muted}
                                keyboardType="decimal-pad"
                                defaultValue={task.pointsEarned != null ? String(task.pointsEarned) : ""}
                                onEndEditing={(event) => {
                                  const raw = event.nativeEvent.text.trim();
                                  const pointsEarned =
                                    raw === "" ? undefined : Math.max(0, Number(raw) || 0);
                                  void updateTasks(
                                    workspace.tasks.map((item) =>
                                      item.id === task.id ? { ...item, pointsEarned } : item,
                                    ),
                                  );
                                }}
                              />
                              <TextInput
                                style={[styles.input, { flex: 1 }]}
                                placeholder="Possible"
                                placeholderTextColor={theme.muted}
                                keyboardType="decimal-pad"
                                defaultValue={possible === "" ? "" : String(possible)}
                                onEndEditing={(event) => {
                                  const raw = event.nativeEvent.text.trim();
                                  const pointsPossible =
                                    raw === "" ? undefined : Math.max(0, Number(raw) || 0) || undefined;
                                  void updateTasks(
                                    workspace.tasks.map((item) =>
                                      item.id === task.id ? { ...item, pointsPossible } : item,
                                    ),
                                  );
                                }}
                              />
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View style={[styles.dashedEmpty, { marginTop: 16 }]}>
                    <Text style={styles.emptyText}>
                      No coursework on this class yet. Import points from your LMS or add an assignment.
                    </Text>
                  </View>
                )}
              </>
            );
          })()
        ) : null}

        {panel === "exams" ? (
          <>
            <Text style={styles.pageSub}>{exams.length} exams & quizzes ahead</Text>
            <View style={[styles.pageActions, { marginTop: 12 }]}>
              <Pressable style={styles.outlineBtn} onPress={() => openCreate("assignment")}>
                <Feather name="plus" size={14} color={theme.accent} />
                <Text style={styles.outlineText}>Add exam</Text>
              </Pressable>
            </View>
            {exams.length ? (
              <View style={[styles.listGap, { marginTop: 12 }]}>
                {exams.map((task) => (
                  <Pressable key={task.id} style={styles.taskRow} onPress={() => navigation.navigate("TasksTab", { screen: "TaskDetail", params: { taskId: task.id } })}>
                    <View style={styles.grow}>
                      <Text style={styles.taskTitle}>{task.title}</Text>
                      <Text style={styles.taskMeta}>{formatCourseLabel(courseFor(task.classId))} · {task.academicType} · {formatDueDate(task.due)}</Text>
                    </View>
                    <Pressable onPress={() => setFocusTaskId(task.id)} hitSlop={8}>
                      <Feather name="play-circle" size={20} color={theme.accent} />
                    </Pressable>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={[styles.dashedEmpty, { marginTop: 16 }]}>
                <Text style={styles.emptyText}>No exams yet. Add one with type Exam or Quiz.</Text>
              </View>
            )}
          </>
        ) : null}

        {panel === "reading" ? (
          <>
            <Text style={styles.pageSub}>{readingTasks.length} readings on your list</Text>
            <View style={[styles.pageActions, { marginTop: 12 }]}>
              <Pressable style={styles.outlineBtn} onPress={() => openCreate("task")}>
                <Feather name="plus" size={14} color={theme.accent} />
                <Text style={styles.outlineText}>Add reading</Text>
              </Pressable>
            </View>
            {readingTasks.length ? (
              <View style={[styles.listGap, { marginTop: 12 }]}>
                {readingTasks.map((task) => (
                  <Pressable key={task.id} style={styles.taskRow} onPress={() => completeTask(task.id)}>
                    <Feather name="book-open" size={16} color={theme.accent} />
                    <View style={styles.grow}>
                      <Text style={styles.taskTitle}>{task.title}</Text>
                      <Text style={styles.taskMeta}>{formatCourseLabel(courseFor(task.classId))} · {formatDueDate(task.due)}</Text>
                    </View>
                    <Text style={styles.linkRowAction}>Done</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={[styles.dashedEmpty, { marginTop: 16 }]}>
                <Text style={styles.emptyText}>Nothing to read yet. Capture chapters as Reading tasks.</Text>
              </View>
            )}
          </>
        ) : null}

        {panel === "progress" ? (
          <>
            <Text style={styles.pageSub}>This week at a glance</Text>
            <View style={[styles.statRow, { marginTop: 16 }]}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Due</Text>
                <Text style={styles.statValue}>{dueThisWeek.length}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Finished</Text>
                <Text style={styles.statValue}>{completedThisWeek.length}</Text>
              </View>
            </View>
            <View style={[styles.statRow, { marginTop: 12 }]}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Classes</Text>
                <Text style={styles.statValue}>{termCourses.filter((c) => c.meetingDays?.length).length}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Open work</Text>
                <Text style={styles.statValue}>{schoolTasks.length}</Text>
              </View>
            </View>
            <Pressable style={[styles.primaryBtn, { marginTop: 18 }]} onPress={() => (schoolTasks[0] ? setFocusTaskId(schoolTasks[0].id) : openCapture())}>
              <Text style={styles.primaryBtnText}>{schoolTasks[0] ? "Start a focus block" : "Capture next task"}</Text>
            </Pressable>
          </>
        ) : null}

        {panel === "wellness" ? (
          <>
            <Text style={styles.pageSub}>How are you feeling about school today?</Text>
            <View style={[styles.pillRow, { marginTop: 16 }]}>
              {["Great", "Okay", "Stressed", "Tired", "Stuck"].map((mood) => (
                <Pressable key={mood} style={styles.pill} onPress={() => saveWellness(mood)}>
                  <Text style={styles.pillText}>{mood}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={[styles.textarea, { marginTop: 14 }]}
              placeholder="Optional note..."
              placeholderTextColor={theme.muted}
              value={wellnessNote}
              onChangeText={setWellnessNote}
              multiline
            />
            <Text style={styles.helper}>Check-ins save to Goals with the Wellness tag.</Text>
          </>
        ) : null}
      </ScrollView>
    );
  };

  const moreLinks: { key: string; label: string; icon: keyof typeof Feather.glyphMap; onPress: () => void }[] = [
    { key: "study", label: "Study", icon: "clock", onPress: () => (schoolTasks[0] ? setFocusTaskId(schoolTasks[0].id) : openCapture()) },
    { key: "grades", label: "Grades & what-if", icon: "pie-chart", onPress: () => setPanel("grades") },
    { key: "exams", label: "Exam tracker", icon: "grid", onPress: () => setPanel("exams") },
    { key: "goals", label: "Goals", icon: "target", onPress: () => navigation.navigate("HubCollection", { scope: "school", collection: "goals" }) },
    { key: "wellness", label: "Wellness check-in", icon: "heart", onPress: () => setPanel("wellness") },
    { key: "reminders", label: "Reminders", icon: "bell", onPress: () => openCreate("task") },
    { key: "reading", label: "Reading tracker", icon: "book", onPress: () => setPanel("reading") },
    { key: "subjects", label: "Subjects", icon: "star", onPress: () => navigation.navigate("HubCollection", { scope: "school", collection: "topics" }) },
    { key: "progress", label: "Weekly progress", icon: "activity", onPress: () => setPanel("progress") },
  ];

  const renderMore = () => {
    if (panel) return renderPanel();
    return (
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]} showsVerticalScrollIndicator={false}>
        <View style={styles.menuCard}>
          {moreLinks.map((item) => (
            <Pressable key={item.key} style={styles.menuRow} onPress={item.onPress}>
              <View style={styles.menuIcon}><Feather name={item.icon} size={16} color={theme.accent} /></View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Feather name="chevron-right" size={16} color={theme.muted} />
            </Pressable>
          ))}
        </View>

        <View style={styles.menuCard}>
          <Pressable style={styles.menuRow} onPress={() => navigation.navigate("NowTab", { screen: "Settings" })}>
            <View style={styles.menuIcon}><Feather name="sun" size={16} color={theme.accent} /></View>
            <Text style={styles.menuLabel}>Appearance</Text>
            <Text style={styles.menuMeta}>{appearanceLabel}</Text>
          </Pressable>
          <Pressable style={styles.menuRow} onPress={() => navigation.navigate("SchoolProfile")}>
            <View style={styles.menuIcon}><Feather name="user" size={16} color={theme.accent} /></View>
            <Text style={styles.menuLabel}>Academic profile</Text>
            <Feather name="chevron-right" size={16} color={theme.muted} />
          </Pressable>
          <Pressable style={styles.menuRow} onPress={() => openCreate("lecture")}>
            <View style={styles.menuIcon}><Feather name="book-open" size={16} color={theme.accent} /></View>
            <Text style={styles.menuLabel}>Lecture notes</Text>
            <Feather name="chevron-right" size={16} color={theme.muted} />
          </Pressable>
        </View>
      </ScrollView>
    );
  };

  const body =

    tab === "timetable" ? renderTimetable()
      : tab === "assignments" ? renderAssignments()
        : tab === "due" ? renderDue()
          : tab === "more" ? renderMore()
            : renderHome();

  const segmentTab: Exclude<SchoolTab, "due"> = tab === "due" ? "home" : tab;

  return (
    <Page>
      <View style={styles.screen} testID="school-planner">
        <View style={styles.header} testID="school-top-nav">
          <View style={styles.grow}>
            <Eyebrow>SCHOOL OS</Eyebrow>
            <Title>School</Title>
            <Subtitle>Classes, assignments, and your week — same shell as the rest of LifeOS.</Subtitle>
          </View>
          <View style={styles.headerActions}>
            <IconButton icon="calendar" label="Add to calendar" onPress={openCalendarSheet} />
            <IconButton icon="plus" label="Quick capture" onPress={openCapture} />
          </View>
        </View>

        <View style={styles.segmentWrap}>
          <SegmentedControl
            value={segmentTab}
            onChange={(next) => setTab(next)}
            options={[
              { key: "home", label: "Home" },
              { key: "timetable", label: "Timetable" },
              { key: "assignments", label: "Assignments" },
              { key: "more", label: "More" },
            ]}
          />
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
                placeholderTextColor={theme.muted}
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
                        <View style={[styles.miniDot, { backgroundColor: course.color ?? theme.accent }]} />
                        <Text style={[styles.subjectPillText, captureClassId === course.id && { color: "#FFF" }]} numberOfLines={1}>
                          {formatCourseLabel(course)}
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
                placeholderTextColor={theme.muted}
                value={eventTitle}
                onChangeText={setEventTitle}
                autoFocus
              />
              <TextInput
                style={[styles.input, { marginTop: 10 }]}
                placeholder="e.g. Club, Appointment, Gym"
                placeholderTextColor={theme.muted}
                value={eventLabel}
                onChangeText={setEventLabel}
              />
              <Text style={styles.helper}>Your own category name, shown instead of the type.</Text>
              <Text style={[styles.fieldLabel, { color: theme.muted }]}>Type</Text>
              <View style={styles.typeGrid}>
                {EVENT_TYPES.map((type) => (
                  <Pressable key={type} style={[styles.typeChip, eventType === type && styles.typeChipSelected]} onPress={() => setEventType(type)}>
                    <Text style={[styles.typeChipText, eventType === type && { color: "#FFF" }]}>{type}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[styles.fieldLabel, { color: theme.muted }]}>Colour</Text>
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
              <Text style={[styles.fieldLabel, { color: theme.muted }]}>Date</Text>
              <TextInput style={styles.input} value={eventDate} onChangeText={setEventDate} placeholder="YYYY-MM-DD" placeholderTextColor={theme.muted} />
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


      <Modal visible={sheet === "syllabus"} animationType="slide" transparent onRequestClose={() => setSheet(null)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setSheet(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.grabber} />
            <Text style={styles.sheetTitle}>Import syllabus</Text>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.helper}>
                Import a PDF, Word (.docx), or Markdown file — or paste text. Dated lines become calendar events; module schedules (like 1-1 Discussion) use your term start.
              </Text>

              <Pressable
                style={[styles.outlineBtnWide, { marginTop: 8 }]}
                onPress={importSyllabusFile}
                disabled={syllabusBusy}
                testID="school-syllabus-import-file"
              >
                {syllabusBusy ? (
                  <ActivityIndicator color={theme.accent} />
                ) : (
                  <>
                    <Feather name="upload" size={16} color={theme.accent} />
                    <Text style={styles.outlineText}>{syllabusFileName ? "Choose another file" : "Import PDF / Word / Markdown"}</Text>
                  </>
                )}
              </Pressable>
              {syllabusFileName ? (
                <Text style={[styles.helper, { marginTop: 8 }]}>Loaded: {syllabusFileName}</Text>
              ) : null}

              <Text style={styles.fieldLabel}>Term start (Module 1)</Text>
              <TextInput
                style={[styles.textarea, { minHeight: 44, paddingTop: 10 }]}
                value={syllabusTermStart}
                onChangeText={(value) => {
                  setSyllabusTermStart(value);
                  refreshSyllabusPreview(syllabusText, value);
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.muted}
                autoCapitalize="none"
                testID="school-syllabus-term-start"
              />
              <Text style={[styles.helper, { marginTop: 6 }]}>
                Module N is due at the end of that week (term start + (N−1) weeks + 6 days).
              </Text>

              <Text style={styles.fieldLabel}>Course</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                {courses.map((course) => (
                  <Pressable
                    key={course.id}
                    style={[styles.subjectPill, syllabusClassId === course.id && styles.subjectPillSelected]}
                    onPress={() => setSyllabusClassId(course.id)}
                  >
                    <View style={[styles.miniDot, { backgroundColor: course.color ?? theme.accent }]} />
                    <Text style={[styles.subjectPillText, syllabusClassId === course.id && { color: "#FFF" }]} numberOfLines={1}>
                          {formatCourseLabel(course)}
                        </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Text</Text>
              <TextInput
                style={[styles.textarea, { minHeight: 140 }]}
                placeholder={"Essay 1 — Oct 1, 2026\nMidterm due 10/15\nLab report 2026-11-03"}
                placeholderTextColor={theme.muted}
                value={syllabusText}
                onChangeText={refreshSyllabusPreview}
                multiline
              />

              {syllabusPreview.length ? (
                <View style={{ marginTop: 14, gap: 8 }}>
                  <Text style={styles.fieldLabel}>
                    Preview · {syllabusPreview.length} item{syllabusPreview.length === 1 ? "" : "s"} · {syllabusPreview.filter((item) => item.due).length} with dates
                  </Text>
                  {syllabusPreview.slice(0, 12).map((item, index) => (
                    <View key={`${item.title}-${index}`} style={styles.previewRow}>
                      <View style={styles.grow}>
                        <Text style={styles.taskTitle}>{item.title}</Text>
                        <Text style={styles.taskMeta}>
                          {item.academicType}
                          {item.due ? ` · due ${item.due}` : " · no date"}
                          {item.due ? " · calendar" : ""}
                        </Text>
                      </View>
                    </View>
                  ))}
                  {syllabusPreview.length > 12 ? (
                    <Text style={styles.helper}>+{syllabusPreview.length - 12} more…</Text>
                  ) : null}
                </View>
              ) : null}

              <Pressable
                style={[styles.primaryBtn, { marginTop: 18 }, !syllabusPreview.length && styles.primaryDisabled]}
                disabled={!syllabusPreview.length || syllabusBusy}
                onPress={submitSyllabus}
                testID="school-syllabus-submit"
              >
                <Text style={styles.primaryBtnText}>
                  {syllabusPreview.length
                    ? `Add ${syllabusPreview.length} task${syllabusPreview.length === 1 ? "" : "s"}` +
                      (syllabusPreview.some((item) => item.due)
                        ? ` · ${syllabusPreview.filter((item) => item.due).length} to calendar`
                        : "")
                    : "Add items"}
                </Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={sheet === "schedule"} animationType="slide" transparent onRequestClose={() => setSheet(null)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setSheet(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.grabber} />
            <Text style={styles.sheetTitle}>Class meeting time</Text>
            <Text style={styles.helper}>{formatCourseLabel(courseFor(scheduleClassId))} · set days and hours for the timetable</Text>
            <Text style={styles.fieldLabel}>Days</Text>
            <View style={styles.pillRow}>
              {[
                { d: 1, label: "Mon" }, { d: 2, label: "Tue" }, { d: 3, label: "Wed" },
                { d: 4, label: "Thu" }, { d: 5, label: "Fri" }, { d: 6, label: "Sat" }, { d: 0, label: "Sun" },
              ].map((day) => {
                const on = scheduleDays.includes(day.d);
                return (
                  <Pressable key={day.d} style={[styles.pill, on && styles.pillSelected]} onPress={() => setScheduleDays((cur) => on ? cur.filter((v) => v !== day.d) : [...cur, day.d])}>
                    <Text style={[styles.pillText, on && styles.pillTextSelected]}>{day.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.fieldLabel}>Starts</Text>
            <TextInput style={styles.input} value={scheduleStart} onChangeText={setScheduleStart} placeholder="09:00" placeholderTextColor={theme.muted} />
            <Text style={styles.fieldLabel}>Ends</Text>
            <TextInput style={styles.input} value={scheduleEnd} onChangeText={setScheduleEnd} placeholder="10:00" placeholderTextColor={theme.muted} />
            <Pressable style={[styles.primaryBtn, { marginTop: 18 }]} onPress={saveSchedule}>
              <Text style={styles.primaryBtnText}>Save schedule</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>


      {focusTask ? (
        <FocusModal visible={Boolean(focusTaskId)} task={focusTask} onClose={() => setFocusTaskId(null)} />
      ) : null}
      </View>
    </Page>
  );
}


function createStyles(theme: Theme) {
  return StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 18, paddingTop: 4, paddingBottom: 8 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 4 },
  segmentWrap: { paddingHorizontal: 18, paddingBottom: 8 },
  scroll: { paddingHorizontal: 18, paddingTop: 8, gap: 14 },
  grow: { flex: 1, minWidth: 0 },
  dateKicker: { color: theme.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1.2, marginBottom: 6 },
  greeting: { fontSize: 30, fontWeight: "700", color: theme.text, letterSpacing: -1.1, lineHeight: 34 },
  homeActions: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 4 },
  ghostBtn: {
    height: 36, borderRadius: 999, borderWidth: 1, borderColor: theme.border,
    backgroundColor: theme.surface, paddingHorizontal: 14, justifyContent: "center",
  },
  ghostBtnText: { fontSize: 12, fontWeight: "600", color: theme.text },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: theme.surface,
    alignItems: "center", justifyContent: "center",
  },
  alert: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    borderWidth: 1, borderColor: theme.border, backgroundColor: theme.soft,
    borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16,
  },
  alertDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.accent, marginTop: 5 },
  alertText: { flex: 1, color: theme.accent, fontSize: 13, lineHeight: 18 },
  alertStrong: { fontWeight: "700", textDecorationLine: "underline" },
  statRow: { flexDirection: "row", gap: 12 },
  statCard: {
    flex: 1, backgroundColor: theme.surface, borderRadius: 22, paddingVertical: 18, paddingHorizontal: 16,
    borderWidth: 1, borderColor: theme.border,
  },
  statLabel: { color: theme.muted, fontSize: 10, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  statValue: { fontSize: 36, fontWeight: "700", color: theme.text, marginTop: 8, letterSpacing: -1 },
  captureCard: {
    backgroundColor: theme.surface, borderRadius: 22, padding: 18,
    borderWidth: 1, borderColor: theme.border,
  },
  captureKicker: { color: theme.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase" },
  captureHint: { color: theme.muted, fontSize: 14, marginTop: 6 },
  section: { gap: 10 },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionKicker: { color: theme.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase" },
  sectionLink: { color: theme.accent, fontSize: 13, fontWeight: "600" },
  emptyCard: {
    backgroundColor: theme.surface, borderRadius: 18, padding: 18, gap: 14,
    borderWidth: 1, borderColor: theme.border,
  },
  emptyActions: { gap: 10 },
  pageHead: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingTop: 4 },
  pageTitle: { fontSize: 30, fontWeight: "700", color: theme.text, letterSpacing: -1.1 },
  pageSub: { color: theme.muted, fontSize: 13, marginTop: 4 },
  pageActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" },
  outlineBtn: {
    height: 38, borderRadius: 12, borderWidth: 1, borderColor: theme.border,
    backgroundColor: theme.surface, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 6,
  },
  outlineBtnWide: {
    height: 42, borderRadius: 12, borderWidth: 1, borderColor: theme.border,
    backgroundColor: theme.surface, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", alignSelf: "stretch",
  },
  outlineText: { color: theme.text, fontSize: 12, fontWeight: "700" },
  toolbarRow: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  toggle: { flexDirection: "row", backgroundColor: theme.soft, borderRadius: 999, padding: 3, gap: 2 },
  toggleBtn: { height: 32, borderRadius: 999, paddingHorizontal: 14, justifyContent: "center" },
  toggleSelected: { backgroundColor: theme.accent },
  toggleText: { fontSize: 12, fontWeight: "600", color: theme.muted },
  toggleTextSelected: { color: "#FFF" },
  termChip: {
    height: 36, borderRadius: 999, borderWidth: 1, borderColor: theme.border,
    backgroundColor: theme.surface, paddingHorizontal: 12, justifyContent: "center",
  },
  termChipSelected: { backgroundColor: theme.accent, borderColor: theme.accent },
  termChipText: { fontSize: 12, fontWeight: "600", color: theme.text },
  termChipTextSelected: { color: "#FFF" },
  weekNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  weekNavBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: theme.surface,
    alignItems: "center", justifyContent: "center",
  },
  weekNavLabel: { color: theme.muted, fontSize: 13, fontWeight: "500" },
  emptyPanel: {
    backgroundColor: theme.surface, borderRadius: 24, paddingVertical: 36, paddingHorizontal: 22,
    alignItems: "center", gap: 14,
    borderWidth: 1, borderColor: theme.border,
  },
  dashedEmpty: {
    minHeight: 160, borderWidth: 1.5, borderStyle: "dashed", borderColor: theme.border,
    borderRadius: 28, alignItems: "center", justifyContent: "center", padding: 28,
  },
  emptyText: { color: theme.muted, fontSize: 15, textAlign: "center" },
  hint: { color: theme.muted, fontSize: 12, lineHeight: 18, textAlign: "center" },
  primaryBtn: {
    minHeight: 48, borderRadius: 12, backgroundColor: theme.text, paddingHorizontal: 22,
    alignItems: "center", justifyContent: "center",
  },
  primaryDisabled: { opacity: 0.45 },
  primaryBtnText: { color: theme.surface, fontSize: 15, fontWeight: "800" },
  listGap: { gap: 10 },
  classRow: {
    flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: theme.surface,
    borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16,
    borderWidth: 1, borderColor: theme.border,
  },
  classDot: { width: 12, height: 12, borderRadius: 6 },
  classCode: { fontSize: 14, fontWeight: "700", color: theme.text },
  className: { fontSize: 12, color: theme.muted, marginTop: 2 },
  linkRow: {
    flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: theme.surface,
    borderRadius: 18, paddingVertical: 16, paddingHorizontal: 16,
    borderWidth: 1, borderColor: theme.border,
  },
  linkRowText: { fontSize: 14, fontWeight: "500", color: theme.text },
  linkRowAction: { color: theme.accent, fontWeight: "600", fontSize: 13 },
  taskRow: {
    flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: theme.surface,
    borderRadius: 18, paddingVertical: 14, paddingHorizontal: 14,
    borderWidth: 1, borderColor: theme.border,
  },
  taskDot: { width: 10, height: 10, borderRadius: 5 },
  taskTitle: { fontSize: 14, fontWeight: "600", color: theme.text },
  taskMeta: { fontSize: 12, color: theme.muted, marginTop: 3 },
  backLink: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 },
  backLinkText: { color: theme.muted, fontSize: 13, fontWeight: "600" },
  menuCard: {
    backgroundColor: theme.surface, borderRadius: 24, overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 1,
  },
  menuRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 15, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border,
  },
  menuIcon: {
    width: 34, height: 34, borderRadius: 12, backgroundColor: theme.soft,
    alignItems: "center", justifyContent: "center",
  },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: "500", color: theme.text },
  menuMeta: { color: theme.accent, fontSize: 13, fontWeight: "600" },
  topChrome: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border,
    backgroundColor: theme.bg,
  },
  segmentRow: {
    flex: 1, flexDirection: "row", backgroundColor: theme.soft, borderRadius: 999, padding: 3, gap: 2,
  },
  segmentItem: {
    flex: 1, height: 34, borderRadius: 999, alignItems: "center", justifyContent: "center", paddingHorizontal: 6,
  },
  segmentItemSelected: {
    backgroundColor: theme.surface,
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  segmentLabel: { fontSize: 12, fontWeight: "600", color: theme.muted },
  segmentLabelSelected: { color: theme.accent },
  calendarChip: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: theme.accent,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: theme.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 18, paddingTop: 10, paddingBottom: 28, maxHeight: "92%",
  },
  grabber: { width: 42, height: 4, borderRadius: 999, backgroundColor: theme.border, alignSelf: "center", marginBottom: 14 },
  sheetTitle: {
    textAlign: "center", color: theme.text, fontSize: 18, fontWeight: "800",
    marginBottom: 14,
  },
  textarea: {
    minHeight: 92, borderRadius: 18, backgroundColor: theme.bg, padding: 16,
    borderWidth: 1, borderColor: theme.border,
    fontSize: 15, color: theme.text, textAlignVertical: "top",
  },
  input: {
    height: 48, borderRadius: 18, backgroundColor: theme.bg, paddingHorizontal: 16,
    borderWidth: 1, borderColor: theme.border,
    fontSize: 15, color: theme.text,
  },
  fieldLabel: {
    marginTop: 14, marginBottom: 8, color: theme.muted, fontSize: 12, fontWeight: "800",
  },
  helper: { color: theme.muted, fontSize: 12, marginTop: 8 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  pill: {
    height: 38, borderRadius: 999, backgroundColor: theme.soft, paddingHorizontal: 16, justifyContent: "center",
  },
  pillSelected: { backgroundColor: theme.accent },
  pillText: { fontSize: 13, fontWeight: "600", color: theme.text },
  pillTextSelected: { color: "#FFF" },
  subjectPill: {
    height: 46, borderRadius: 999, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10, maxWidth: 260,
  },
  subjectPillSelected: { backgroundColor: theme.accent, borderColor: theme.accent },
  subjectPillText: { fontSize: 14, fontWeight: "600", color: theme.text, maxWidth: 200 },
  miniDot: { width: 8, height: 8, borderRadius: 4 },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: {
    height: 40, borderRadius: 999, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface,
    paddingHorizontal: 14, justifyContent: "center",
  },
  typeChipSelected: { backgroundColor: theme.accent, borderColor: theme.accent },
  typeChipText: { fontSize: 13, fontWeight: "600", color: theme.accent },
  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  swatch: { width: 40, height: 40, borderRadius: 12, borderWidth: 2, borderColor: "transparent" },
  swatchSelected: { borderColor: theme.text },
  swatchAuto: {
    width: 40, height: 40, borderRadius: 12, borderWidth: 2, borderColor: theme.text,
    backgroundColor: theme.surface, alignItems: "center", justifyContent: "center",
  },
  swatchAutoText: { fontSize: 9, fontWeight: "700", color: theme.text },
  dayStrip: { gap: 8, paddingVertical: 4 },
  dayChip: {
    width: 48, height: 64, borderRadius: 16, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    alignItems: "center", justifyContent: "center", gap: 2,
  },
  dayChipSelected: { backgroundColor: theme.accent, borderColor: theme.accent },
  dayChipDow: { fontSize: 10, fontWeight: "700", color: theme.muted, letterSpacing: 0.4 },
  dayChipNum: { fontSize: 16, fontWeight: "700", color: theme.text },
  dayChipSelectedText: { color: "#FFF" },
  dayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: theme.accent, marginTop: 2 },
  dayDotSpacer: { width: 5, height: 5, marginTop: 2 },
  weekDayBlock: { gap: 8, marginBottom: 8 },
  weekDayLabel: { color: theme.muted, fontSize: 12, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
  weekEmpty: { color: theme.muted, fontSize: 13, paddingVertical: 8, paddingHorizontal: 4 },
  classMeta: { color: theme.muted, fontSize: 12, marginTop: 3 },
  checkHit: { paddingRight: 4, justifyContent: "center" },
  previewRow: {
    flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: theme.surface,
    borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14,
  },
  moodRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  moodChip: {
    height: 40, borderRadius: 999, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    paddingHorizontal: 14, justifyContent: "center",
  },
  moodChipText: { color: theme.text, fontWeight: "600", fontSize: 13 },
  sectionLabel: { color: theme.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1.1, textTransform: "uppercase", marginTop: 8 },
});
}
