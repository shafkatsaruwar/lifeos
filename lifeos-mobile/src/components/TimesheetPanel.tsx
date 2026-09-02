import Feather from "@expo/vector-icons/Feather";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { ActionButton, Card, Empty } from "./UI";
import { SwipeDeleteRow } from "./SwipeDeleteRow";
import {
  addDaysToDateKey,
  addManualEntry,
  clockIn,
  clockOut,
  DEFAULT_WORK_HOURS,
  deleteTimeEntry,
  entriesForWeek,
  entryDurationMinutes,
  exportTimesheetCsv,
  formatClockDate,
  formatClockTime,
  formatDurationMinutes,
  formatHmFromMinutes,
  formatHmDisplay,
  getActiveEntry,
  parseHm,
  saveContractor,
  updateTimeEntry,
  updateWorkHours,
  weekStartKey,
  weekTotalMinutes,
  workHoursStripWindowLabel,
  type TimeEntry,
  type TimeTrackingState,
} from "../lib/timeTracking";
import type { WorkProject } from "../lib/workos";
import type { Theme } from "../lib/theme";

type Props = {
  theme: Theme;
  timeTracking: TimeTrackingState;
  projects: WorkProject[];
  weekStartsMonday?: boolean;
  onChange: (next: TimeTrackingState) => void;
};

type EditingTime = { entryId: string; field: "clockInAt" | "clockOutAt" } | null;

function parseIso(iso?: string) {
  const date = iso ? new Date(iso) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function dateFromHm(hm: string): Date {
  const minutes = parseHm(hm) ?? parseHm(DEFAULT_WORK_HOURS.start)!;
  const date = new Date();
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return date;
}

export function TimesheetPanel({ theme, timeTracking, projects, weekStartsMonday = false, onChange }: Props) {
  const colorScheme = useColorScheme();
  const activeProjects = useMemo(() => projects.filter((p) => p.status === "active"), [projects]);
  const [weekKey, setWeekKey] = useState(() => weekStartKey(new Date(), weekStartsMonday));
  const [draftTitle, setDraftTitle] = useState("");
  const [draftClient, setDraftClient] = useState(() => timeTracking.defaultClientName ?? "");
  const [draftProjectId, setDraftProjectId] = useState("");
  const [editingTime, setEditingTime] = useState<EditingTime>(null);
  const savedClients = timeTracking.savedClients ?? [];
  const active = getActiveEntry(timeTracking);
  const [tick, setTick] = useState(() => Date.now());
  const weekEntries = useMemo(() => entriesForWeek(timeTracking, weekKey), [timeTracking, weekKey]);
  const weekTotal = weekTotalMinutes(weekEntries);
  const projectName = (projectId?: string) => projects.find((item) => item.id === projectId)?.name ?? "";
  const workHours = timeTracking.workHours ?? DEFAULT_WORK_HOURS;
  const [editingWorkTime, setEditingWorkTime] = useState<"start" | "end" | null>(null);

  useEffect(() => {
    if (timeTracking.defaultClientName) setDraftClient(timeTracking.defaultClientName);
  }, [timeTracking.defaultClientName]);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active?.id]);

  useEffect(() => {
    if (!active) return;
    setDraftClient(active.clientName ?? timeTracking.defaultClientName ?? "");
    setDraftTitle(active.title ?? "");
    setDraftProjectId(active.projectId ?? "");
  }, [active?.id, active?.clientName, active?.title, active?.projectId, timeTracking.defaultClientName]);

  const handleSaveContractor = () => {
    const trimmed = draftClient.trim();
    if (!trimmed) {
      Alert.alert("Enter a contractor name", "Type the client or contractor name first.");
      return;
    }
    onChange(saveContractor(timeTracking, trimmed));
  };

  const handleExport = async () => {
    const csv = exportTimesheetCsv(weekEntries, projectName);
    await Share.share({ message: csv, title: `lifeos-timesheet-${weekKey}.csv` });
  };

  const renderProjectChips = (selectedId: string, onSelect: (id: string) => void) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      <Pressable
        onPress={() => onSelect("")}
        style={[styles.chip, { borderColor: !selectedId ? theme.accent : theme.border, backgroundColor: !selectedId ? theme.soft : "transparent" }]}
      >
        <Text style={{ color: theme.text, fontWeight: "700", fontSize: 12 }}>No project</Text>
      </Pressable>
      {activeProjects.map((project) => {
        const on = selectedId === project.id;
        return (
          <Pressable
            key={project.id}
            onPress={() => onSelect(project.id)}
            style={[styles.chip, { borderColor: on ? theme.accent : theme.border, backgroundColor: on ? theme.soft : "transparent" }]}
          >
            <Text style={{ color: theme.text, fontWeight: "700", fontSize: 12 }}>{project.name}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  const renderTimeEditor = (entry: TimeEntry, field: "clockInAt" | "clockOutAt", label: string) => {
    const iso = field === "clockInAt" ? entry.clockInAt : entry.clockOutAt;
    const open = editingTime?.entryId === entry.id && editingTime.field === field;
    return (
      <View style={{ marginTop: 8 }}>
        <Text style={[styles.fieldLabel, { color: theme.muted }]}>{label}</Text>
        {Platform.OS === "ios" ? (
          <DateTimePicker
            value={parseIso(iso)}
            mode="datetime"
            display="compact"
            themeVariant={colorScheme === "dark" ? "dark" : "light"}
            onChange={(_, date) => {
              if (date) onChange(updateTimeEntry(timeTracking, entry.id, { [field]: date.toISOString() }));
            }}
          />
        ) : (
          <>
            <Pressable
              onPress={() => setEditingTime({ entryId: entry.id, field })}
              style={[styles.input, styles.pickerBtn, { borderColor: theme.border }]}
            >
              <Text style={{ color: theme.text, fontWeight: "600" }}>
                {iso ? formatClockTime(iso) : "Set time"}
              </Text>
            </Pressable>
            {open ? (
              <DateTimePicker
                value={parseIso(iso)}
                mode="datetime"
                onChange={(event, date) => {
                  setEditingTime(null);
                  if (event.type !== "dismissed" && date) {
                    onChange(updateTimeEntry(timeTracking, entry.id, { [field]: date.toISOString() }));
                  }
                }}
              />
            ) : null}
          </>
        )}
      </View>
    );
  };

  return (
    <View style={{ gap: 12 }}>
      <Card>
        <Text style={[styles.sectionInline, { color: theme.text }]}>
          {active ? "Clocked in" : "Ready to clock in"}
        </Text>
        <Text style={{ color: theme.muted, fontSize: 12, marginTop: 4 }}>
          {active
            ? `${formatClockDate(active.clockInAt)} · ${formatClockTime(active.clockInAt)} · ${formatDurationMinutes(entryDurationMinutes(active, tick))} so far`
            : "Track billable hours for your contractor timesheet."}
        </Text>
        <TextInput
          value={draftClient}
          onChangeText={setDraftClient}
          placeholder="Client / contractor"
          placeholderTextColor={theme.muted}
          style={[styles.input, { color: theme.text, borderColor: theme.border, marginTop: 12 }]}
        />
        {savedClients.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {savedClients.map((name) => (
              <Pressable
                key={name}
                onPress={() => setDraftClient(name)}
                style={[styles.chip, { borderColor: draftClient === name ? theme.accent : theme.border, backgroundColor: draftClient === name ? theme.soft : "transparent" }]}
              >
                <Text style={{ color: theme.text, fontWeight: "700", fontSize: 12 }}>{name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
        <View style={[styles.quickRow, { marginTop: 8 }]}>
          <ActionButton label="Save contractor" icon="bookmark" quiet onPress={handleSaveContractor} />
        </View>
        {activeProjects.length ? renderProjectChips(draftProjectId, setDraftProjectId) : null}
        <TextInput
          value={draftTitle}
          onChangeText={setDraftTitle}
          placeholder="What are you working on?"
          placeholderTextColor={theme.muted}
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
        />
        <View style={[styles.quickRow, { marginTop: 8 }]}>
          <ActionButton
            label={active ? "Clock out" : "Clock in"}
            icon="clock"
            danger={Boolean(active)}
            onPress={() => {
              if (active) onChange(clockOut(timeTracking));
              else {
                onChange(
                  clockIn(timeTracking, {
                    projectId: draftProjectId || undefined,
                    clientName: draftClient,
                    title: draftTitle || "Work session",
                  }),
                );
              }
            }}
          />
          <ActionButton
            label="Manual entry"
            icon="plus"
            quiet
            onPress={() => {
              const now = new Date();
              const start = new Date(now);
              start.setHours(9, 0, 0, 0);
              const end = new Date(now);
              end.setHours(10, 0, 0, 0);
              onChange(
                addManualEntry(timeTracking, {
                  clockInAt: start.toISOString(),
                  clockOutAt: end.toISOString(),
                  projectId: draftProjectId || undefined,
                  clientName: draftClient,
                  title: draftTitle || "Manual entry",
                }),
              );
            }}
          />
          <ActionButton label="Export CSV" icon="share" quiet onPress={() => void handleExport()} />
        </View>
      </Card>

      <Card>
        <Text style={[styles.sectionInline, { color: theme.text }]}>Now page strip</Text>
        <Text style={{ color: theme.muted, fontSize: 12, marginTop: 4, lineHeight: 17 }}>
          Hide the clock-in bar on Now outside your work window. You’re always shown while clocked in.
        </Text>
        <View style={[styles.scheduleRow, { borderColor: theme.border }]}>
          <Text style={{ color: theme.text, fontWeight: "700", flex: 1 }}>Only during work hours</Text>
          <Switch
            value={workHours.enabled}
            onValueChange={(enabled) => onChange(updateWorkHours(timeTracking, { enabled }))}
            trackColor={{ false: theme.border, true: theme.accent }}
          />
        </View>
        {workHours.enabled ? (
          <View style={{ gap: 10, marginTop: 10 }}>
            <Text style={{ color: theme.muted, fontSize: 12 }}>
              Shows on Now {workHoursStripWindowLabel(workHours)} ({formatHmDisplay(workHours.start)}–{formatHmDisplay(workHours.end)} work, ±{workHours.paddingMinutes ?? 60}m)
            </Text>
            <View style={styles.scheduleTimes}>
              <View style={styles.scheduleTimeCol}>
                <Text style={[styles.fieldLabel, { color: theme.muted }]}>Start</Text>
                {Platform.OS === "ios" ? (
                  <DateTimePicker
                    value={dateFromHm(workHours.start)}
                    mode="time"
                    display="compact"
                    themeVariant={colorScheme === "dark" ? "dark" : "light"}
                    onChange={(_, date) => {
                      if (!date) return;
                      onChange(
                        updateWorkHours(timeTracking, {
                          start: formatHmFromMinutes(date.getHours() * 60 + date.getMinutes()),
                        }),
                      );
                    }}
                  />
                ) : (
                  <>
                    <Pressable
                      onPress={() => setEditingWorkTime("start")}
                      style={[styles.input, styles.pickerBtn, { borderColor: theme.border }]}
                    >
                      <Text style={{ color: theme.text, fontWeight: "600" }}>{formatHmDisplay(workHours.start)}</Text>
                    </Pressable>
                    {editingWorkTime === "start" ? (
                      <DateTimePicker
                        value={dateFromHm(workHours.start)}
                        mode="time"
                        onChange={(event, date) => {
                          setEditingWorkTime(null);
                          if (event.type !== "dismissed" && date) {
                            onChange(
                              updateWorkHours(timeTracking, {
                                start: formatHmFromMinutes(date.getHours() * 60 + date.getMinutes()),
                              }),
                            );
                          }
                        }}
                      />
                    ) : null}
                  </>
                )}
              </View>
              <View style={styles.scheduleTimeCol}>
                <Text style={[styles.fieldLabel, { color: theme.muted }]}>End</Text>
                {Platform.OS === "ios" ? (
                  <DateTimePicker
                    value={dateFromHm(workHours.end)}
                    mode="time"
                    display="compact"
                    themeVariant={colorScheme === "dark" ? "dark" : "light"}
                    onChange={(_, date) => {
                      if (!date) return;
                      onChange(
                        updateWorkHours(timeTracking, {
                          end: formatHmFromMinutes(date.getHours() * 60 + date.getMinutes()),
                        }),
                      );
                    }}
                  />
                ) : (
                  <>
                    <Pressable
                      onPress={() => setEditingWorkTime("end")}
                      style={[styles.input, styles.pickerBtn, { borderColor: theme.border }]}
                    >
                      <Text style={{ color: theme.text, fontWeight: "600" }}>{formatHmDisplay(workHours.end)}</Text>
                    </Pressable>
                    {editingWorkTime === "end" ? (
                      <DateTimePicker
                        value={dateFromHm(workHours.end)}
                        mode="time"
                        onChange={(event, date) => {
                          setEditingWorkTime(null);
                          if (event.type !== "dismissed" && date) {
                            onChange(
                              updateWorkHours(timeTracking, {
                                end: formatHmFromMinutes(date.getHours() * 60 + date.getMinutes()),
                              }),
                            );
                          }
                        }}
                      />
                    ) : null}
                  </>
                )}
              </View>
            </View>
          </View>
        ) : null}
      </Card>

      <View style={styles.sectionRow}>
        <Pressable onPress={() => setWeekKey(addDaysToDateKey(weekKey, -7))} hitSlop={8}>
          <Feather name="chevron-left" size={18} color={theme.accent} />
        </Pressable>
        <View style={{ alignItems: "center", flex: 1 }}>
          <Text style={{ color: theme.text, fontWeight: "800" }}>Week of {formatClockDate(`${weekKey}T12:00:00`)}</Text>
          <Text style={{ color: theme.muted, fontSize: 12 }}>{formatDurationMinutes(weekTotal)} logged</Text>
        </View>
        <Pressable onPress={() => setWeekKey(addDaysToDateKey(weekKey, 7))} hitSlop={8}>
          <Feather name="chevron-right" size={18} color={theme.accent} />
        </Pressable>
      </View>

      {weekEntries.length ? (
        weekEntries.map((entry) => (
          <SwipeDeleteRow
            key={entry.id}
            label={entry.title || "Time entry"}
            onDelete={() => onChange(deleteTimeEntry(timeTracking, entry.id))}
          >
            <View style={[styles.entryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={{ color: theme.text, fontWeight: "800" }}>{entry.title || "Work session"}</Text>
              <Text style={{ color: theme.muted, fontSize: 12, marginTop: 2 }}>
                {entry.clockInAt.slice(0, 10)} · {(entryDurationMinutes(entry) / 60).toFixed(2)}h
              </Text>
              <TextInput
                value={entry.clientName ?? ""}
                onChangeText={(value) => onChange(updateTimeEntry(timeTracking, entry.id, { clientName: value }))}
                placeholder="Client"
                placeholderTextColor={theme.muted}
                style={[styles.input, { color: theme.text, borderColor: theme.border, marginTop: 10 }]}
              />
              {activeProjects.length ? (
                <View style={{ marginTop: 8 }}>
                  <Text style={[styles.fieldLabel, { color: theme.muted }]}>Project</Text>
                  {renderProjectChips(entry.projectId ?? "", (projectId) =>
                    onChange(updateTimeEntry(timeTracking, entry.id, { projectId: projectId || undefined }))
                  )}
                </View>
              ) : null}
              <TextInput
                value={entry.title ?? ""}
                onChangeText={(value) => onChange(updateTimeEntry(timeTracking, entry.id, { title: value }))}
                placeholder="Work description"
                placeholderTextColor={theme.muted}
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              />
              {renderTimeEditor(entry, "clockInAt", "Clock in")}
              {renderTimeEditor(entry, "clockOutAt", "Clock out")}
              <TextInput
                value={entry.note ?? ""}
                onChangeText={(value) => onChange(updateTimeEntry(timeTracking, entry.id, { note: value }))}
                placeholder="Notes"
                placeholderTextColor={theme.muted}
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              />
            </View>
          </SwipeDeleteRow>
        ))
      ) : (
        <Card>
          <Empty title="No time entries this week" body="Clock in when you start work, or add a manual row." />
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionInline: { fontSize: 13, fontWeight: "800" },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, minHeight: 46, marginBottom: 8 },
  pickerBtn: { justifyContent: "center" },
  fieldLabel: { fontSize: 12, fontWeight: "800", marginBottom: 6 },
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chipRow: { gap: 8, paddingVertical: 4 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  sectionRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  entryCard: { borderWidth: 1, borderRadius: 14, padding: 14 },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  scheduleTimes: { flexDirection: "row", gap: 12 },
  scheduleTimeCol: { flex: 1 },
});
