import Feather from "@expo/vector-icons/Feather";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Page, SegmentedControl } from "../components/UI";
import { useLifeOS } from "../lib/LifeOSContext";
import { toDateKey, uid } from "../lib/helpers";
import type { AcademicItemType, Priority } from "../types";

type CreateKind = "course" | "task" | "assignment" | "lecture" | "topic";

const LABELS: Record<CreateKind, { title: string; prompt: string }> = {
  course: { title: "New course", prompt: "Add the class once, then connect its work and notes." },
  task: { title: "New school task", prompt: "Capture the next action for a course." },
  assignment: { title: "New assignment", prompt: "Track the deadline and grade impact." },
  lecture: { title: "New lecture note", prompt: "Start a note already filed to the right course." },
  topic: { title: "New topic", prompt: "Save a concept you need to understand or review." },
};

export function AcademicCreateScreen() {
  const { theme, workspace, updateClasses, updateTasks, updateNotes, updateSchool } = useLifeOS();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const kind = (route.params?.kind ?? "assignment") as CreateKind;
  const labels = LABELS[kind];
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [classId, setClassId] = useState(workspace.classes.find((course) => !course.archived)?.id ?? "");
  const [due, setDue] = useState(toDateKey(new Date()));
  const [priority, setPriority] = useState<Priority>("Medium");
  const [academicType, setAcademicType] = useState<AcademicItemType>(kind === "task" ? "Reading" : "Assignment");
  const [gradeWeight, setGradeWeight] = useState("");

  const needsClass = kind !== "course";

  const save = async () => {
    if (!title.trim()) return;
    if (needsClass && !classId) {
      Alert.alert("Add a course first", "School work and notes need a course so they stay organized.");
      return;
    }
    const course = workspace.classes.find((item) => item.id === classId);

    if (kind === "course") {
      const code = title.trim().toUpperCase();
      await updateClasses([
        ...workspace.classes,
        {
          id: uid(),
          code,
          name: detail.trim() || code,
          term: "Current term",
          color: theme.accent,
        },
      ]);
      navigation.goBack();
      return;
    }

    if (kind === "lecture") {
      const id = uid();
      await updateNotes([
        {
          id,
          title: title.trim(),
          body: detail.trim(),
          classId,
          template: "cornell",
          updatedAt: new Date().toISOString(),
        },
        ...workspace.notes,
      ]);
      navigation.navigate("LibraryTab", { screen: "NoteEditor", params: { noteId: id } });
      return;
    }

    if (kind === "topic") {
      await updateSchool({
        ...workspace.school,
        topics: [
          {
            id: uid(),
            title: title.trim(),
            subtitle: detail.trim() || course?.code,
            classId,
            createdAt: new Date().toISOString(),
          },
          ...workspace.school.topics,
        ],
      });
      navigation.goBack();
      return;
    }

    const id = Date.now();
    await updateTasks([
      ...workspace.tasks,
      {
        id,
        title: title.trim(),
        notes: detail.trim() || undefined,
        classId,
        color: course?.color ?? theme.accent,
        project: "Inbox",
        due,
        priority,
        academicType,
        gradeWeight: gradeWeight ? Math.max(0, Math.min(100, Number(gradeWeight))) : undefined,
        focusMinutes: workspace.settings.defaultFocusMinutes ?? 45,
        energy: workspace.settings.defaultEnergy ?? "Medium",
        status: "Not started",
        checklist: [],
        checklistProgress: [],
      },
    ]);
    navigation.navigate("TasksTab", { screen: "TaskDetail", params: { taskId: id } });
  };

  return (
    <Page edges={["top"]}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Go back" onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Feather name="chevron-left" size={22} color={theme.text} />
        </Pressable>
        <View style={styles.grow}>
          <Text style={[styles.eyebrow, { color: theme.muted }]}>SCHOOL OS</Text>
          <Text style={[styles.title, { color: theme.text }]}>{labels.title}</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>{labels.prompt}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        {needsClass ? (
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.text }]}>Course</Text>
            {workspace.classes.filter((course) => !course.archived).length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.courseRow}>
                {workspace.classes.filter((course) => !course.archived).map((course) => {
                  const active = course.id === classId;
                  return (
                    <Pressable
                      key={course.id}
                      onPress={() => setClassId(course.id)}
                      style={[
                        styles.courseChip,
                        { borderColor: active ? course.color ?? theme.accent : theme.border, backgroundColor: active ? `${course.color ?? theme.accent}18` : theme.surface },
                      ]}
                    >
                      <View style={[styles.courseDot, { backgroundColor: course.color ?? theme.accent }]} />
                      <Text style={[styles.courseText, { color: active ? course.color ?? theme.accent : theme.text }]}>{course.code}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : (
              <Pressable
                onPress={() => navigation.replace("AcademicCreate", { kind: "course" })}
                style={[styles.emptyCourse, { borderColor: theme.border, backgroundColor: theme.surface }]}
              >
                <Feather name="plus" size={17} color={theme.accent} />
                <Text style={{ color: theme.text, fontWeight: "800" }}>Add your first course</Text>
              </Pressable>
            )}
          </View>
        ) : null}

        <Field
          label={kind === "course" ? "Course code" : "Title"}
          value={title}
          onChangeText={setTitle}
          placeholder={kind === "course" ? "e.g. BIO 201" : `Name this ${kind}`}
          theme={theme}
          autoFocus
        />
        <Field
          label={kind === "course" ? "Course name" : "Details"}
          value={detail}
          onChangeText={setDetail}
          placeholder={kind === "course" ? "e.g. Cell Biology" : "Optional context"}
          theme={theme}
          multiline={kind !== "course"}
        />

        {kind === "task" || kind === "assignment" ? (
          <>
            <Field label="Due date" value={due} onChangeText={setDue} placeholder="YYYY-MM-DD" theme={theme} />
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.text }]}>Priority</Text>
              <SegmentedControl
                value={priority}
                onChange={setPriority}
                options={[{ key: "Low", label: "Low" }, { key: "Medium", label: "Medium" }, { key: "High", label: "High" }]}
              />
            </View>
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.text }]}>Work type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.courseRow}>
                {(["Assignment", "Project", "Exam", "Quiz", "Lab", "Reading", "Discussion"] as AcademicItemType[]).map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => setAcademicType(type)}
                    style={[
                      styles.typeChip,
                      {
                        borderColor: academicType === type ? theme.accent : theme.border,
                        backgroundColor: academicType === type ? theme.soft : theme.surface,
                      },
                    ]}
                  >
                    <Text style={{ color: academicType === type ? theme.accent : theme.text, fontWeight: "700", fontSize: 12 }}>{type}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <Field
              label="Grade weight (%)"
              value={gradeWeight}
              onChangeText={setGradeWeight}
              placeholder="Optional"
              theme={theme}
              keyboardType="decimal-pad"
            />
          </>
        ) : null}

        <Pressable
          disabled={!title.trim()}
          onPress={save}
          style={[styles.save, { backgroundColor: theme.text, opacity: title.trim() ? 1 : 0.45 }]}
        >
          <Text style={[styles.saveText, { color: theme.surface }]}>Create {kind}</Text>
        </Pressable>
      </ScrollView>
    </Page>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  theme,
  multiline = false,
  autoFocus = false,
  keyboardType = "default",
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  theme: any;
  multiline?: boolean;
  autoFocus?: boolean;
  keyboardType?: "default" | "decimal-pad";
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <TextInput
        autoFocus={autoFocus}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.muted}
        multiline={multiline}
        keyboardType={keyboardType}
        style={[
          styles.input,
          multiline && styles.multiline,
          { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 16, paddingTop: 8 },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  grow: { flex: 1, minWidth: 0 },
  eyebrow: { fontSize: 10, fontWeight: "800" },
  title: { fontSize: 24, fontWeight: "800", marginTop: 2 },
  subtitle: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  form: { padding: 20, paddingBottom: 80, gap: 18 },
  field: { gap: 7 },
  label: { fontSize: 13, fontWeight: "800" },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 8, paddingHorizontal: 13, fontSize: 15 },
  multiline: { minHeight: 96, paddingTop: 12, textAlignVertical: "top" },
  courseRow: { gap: 8, paddingRight: 20 },
  courseChip: { minHeight: 44, paddingHorizontal: 13, borderWidth: 1, borderRadius: 8, flexDirection: "row", alignItems: "center", gap: 7 },
  courseDot: { width: 8, height: 8, borderRadius: 4 },
  courseText: { fontSize: 12, fontWeight: "800" },
  emptyCourse: { minHeight: 50, borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 8 },
  typeChip: { minHeight: 44, borderWidth: 1, borderRadius: 8, paddingHorizontal: 13, alignItems: "center", justifyContent: "center" },
  save: { minHeight: 50, borderRadius: 8, alignItems: "center", justifyContent: "center", marginTop: 4 },
  saveText: { fontSize: 15, fontWeight: "800", textTransform: "capitalize" },
});
