import Feather from "@expo/vector-icons/Feather";
import { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ActionButton, Card, Empty, Eyebrow, IconButton, Page, SegmentedControl, Subtitle, Title } from "../components/UI";
import { useLifeOS } from "../lib/LifeOSContext";
import {
  eventOccursOnDate,
  formatEventRange,
  toDateKey,
} from "../lib/helpers";
import { fetchIcsFromUrl, parseIcsEvents } from "../lib/api";
import { SPACE_COLORS } from "../lib/theme";
import type { CalendarEvent } from "../types";

type Mode = "upcoming" | "month" | "day";

function normalizeTime(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return "09:00";
  const hours = Math.min(23, Math.max(0, Number(match[1])));
  const minutes = Math.min(59, Math.max(0, Number(match[2])));
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function CalendarScreen() {
  const { theme, workspace, updateCalendar, updateTasks } = useLifeOS();
  const navigation = useNavigation<any>();
  const [mode, setMode] = useState<Mode>("upcoming");
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => toDateKey(new Date()));
  const [importOpen, setImportOpen] = useState(false);
  const [icalUrl, setIcalUrl] = useState("");
  const [importing, setImporting] = useState(false);

  const [composerOpen, setComposerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [day, setDay] = useState(() => toDateKey(new Date()));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [color, setColor] = useState<string>(SPACE_COLORS[0]);

  const todayKey = toDateKey(new Date());
  const events = workspace.calendar;

  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const firstDayOffset = monthStart.getDay();
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - firstDayOffset);
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });

  const selectedEvents = useMemo(
    () => events.filter((e) => eventOccursOnDate(e, selected)).sort((a, b) => a.start.localeCompare(b.start)),
    [events, selected]
  );

  const upcomingItems = useMemo(() => {
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + 6);
    const horizonKey = toDateKey(horizon);
    const evItems = events
      .filter((e) => {
        const start = e.start.slice(0, 10);
        const end = (e.end ?? e.start).slice(0, 10);
        return end >= todayKey && start <= horizonKey;
      })
      .map((e) => ({ id: e.id, kind: "event" as const, title: e.title, date: e.start, color: e.color || theme.accent, meta: `${formatEventRange(e)} · ${e.source ?? "LifeOS"}` }));
    const taskItems = workspace.tasks
      .filter((t) => !t.done && !t.canceled && t.due && /^\d{4}-\d{2}-\d{2}$/.test(t.due) && t.due >= todayKey && t.due <= horizonKey)
      .map((t) => ({ id: String(t.id), kind: "task" as const, title: t.title, date: `${t.due}T${t.startTime || "09:00"}`, color: t.color || theme.accent, meta: `Task · due ${t.due === todayKey ? "today" : t.due} · ${t.focusMinutes ?? 30}m` }));
    return [...evItems, ...taskItems].sort((a, b) => a.date.localeCompare(b.date));
  }, [events, workspace.tasks, todayKey, theme.accent]);

  const readyToPlace = workspace.tasks
    .filter((t) => !t.done && !t.canceled && (!t.startTime || t.due !== selected))
    .slice(0, 6);

  const openComposer = (event?: CalendarEvent, defaultDay?: string) => {
    if (event) {
      setEditingId(event.id);
      setTitle(event.title);
      setDay(event.start.slice(0, 10));
      setStartTime(event.start.slice(11, 16) || "09:00");
      setEndTime(event.end?.slice(11, 16) || "10:00");
      setNotes(event.notes ?? "");
      setColor(event.color || theme.accent);
    } else {
      setEditingId(null);
      setTitle("");
      setDay(defaultDay || selected || todayKey);
      setStartTime("09:00");
      setEndTime("10:00");
      setNotes("");
      setColor(theme.accent);
    }
    setComposerOpen(true);
  };

  const saveEvent = async () => {
    const clean = title.trim();
    if (!clean) {
      Alert.alert("Title needed", "Give the event a name.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day.trim())) {
      Alert.alert("Invalid date", "Use YYYY-MM-DD for the date.");
      return;
    }
    const start = `${day.trim()}T${normalizeTime(startTime)}`;
    const end = `${day.trim()}T${normalizeTime(endTime)}`;
    const payload: CalendarEvent = {
      id: editingId ?? `lifeos-${Date.now()}`,
      title: clean,
      start,
      end,
      source: "LifeOS",
      color,
      notes: notes.trim() || undefined,
    };
    if (editingId) {
      await updateCalendar(
        events.map((event) =>
          event.id === editingId
            ? { ...event, ...payload, source: event.source ?? "LifeOS" }
            : event
        )
      );
    } else {
      await updateCalendar([...events, payload]);
    }
    setSelected(day.trim());
    setComposerOpen(false);
  };

  const deleteEvent = () => {
    if (!editingId) return;
    Alert.alert("Delete event?", "This removes it from your LifeOS calendar.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await updateCalendar(events.filter((event) => event.id !== editingId));
          setComposerOpen(false);
        },
      },
    ]);
  };

  const scheduleTask = async (taskId: string | number) => {
    await updateTasks(
      workspace.tasks.map((task) =>
        task.id === taskId
          ? { ...task, due: selected, startTime: task.startTime || "09:00" }
          : task
      )
    );
  };

  const doImport = async () => {
    if (!icalUrl.trim()) return;
    setImporting(true);
    try {
      const ics = await fetchIcsFromUrl(icalUrl.trim());
      const parsed = parseIcsEvents(ics);
      const existingIds = new Set(events.map((e) => e.id));
      const merged = [...events.filter((e) => e.source !== "iCal" || !parsed.some((p) => p.id === e.id)), ...parsed.filter((p) => !existingIds.has(p.id) || true)];
      const byId = new Map<string, CalendarEvent>();
      merged.forEach((e) => byId.set(e.id, e));
      await updateCalendar(Array.from(byId.values()));
      setImportOpen(false);
      setIcalUrl("");
      Alert.alert("Calendar imported", `Added ${parsed.length} event${parsed.length === 1 ? "" : "s"} from the feed.`);
    } catch (err: any) {
      Alert.alert("Import failed", err?.message || "Could not read that calendar link.");
    } finally {
      setImporting(false);
    }
  };

  const goConnectWeb = () => {
    setImportOpen(false);
    navigation.navigate("ConnectWeb");
  };

  return (
    <Page edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.grow}>
          <Eyebrow>PROTECT YOUR TIME</Eyebrow>
          <Title>Calendar</Title>
          <Subtitle>Your timeline and ready work in one calm layer.</Subtitle>
        </View>
        <View style={styles.headerActions}>
          <IconButton icon="plus" label="Add event" onPress={() => openComposer(undefined, selected)} />
          <IconButton icon="link" label="Import iCal" onPress={() => setImportOpen(true)} />
        </View>
      </View>

      <View style={styles.segmentWrap}>
        <SegmentedControl
          value={mode}
          onChange={setMode}
          options={[{ key: "upcoming", label: "Upcoming", icon: "list" }, { key: "month", label: "Month", icon: "calendar" }, { key: "day", label: "Day", icon: "clock" }]}
        />
      </View>

      {mode === "upcoming" ? (
        <FlatList
          data={upcomingItems}
          keyExtractor={(item) => `${item.kind}-${item.id}`}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const date = new Date(`${item.date.slice(0, 10)}T12:00`);
            return (
              <Pressable
                onPress={() => {
                  if (item.kind === "event") {
                    const event = events.find((e) => e.id === item.id);
                    if (event) openComposer(event);
                    return;
                  }
                  navigation.navigate("TasksTab", { screen: "TaskDetail", params: { taskId: item.id } });
                }}
                style={[styles.upcomingRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <View style={styles.dateBlock}>
                  <Text style={[styles.dateDay, { color: theme.text }]}>{date.toLocaleDateString("en-US", { day: "numeric" })}</Text>
                  <Text style={[styles.dateMonth, { color: theme.muted }]}>{date.toLocaleDateString("en-US", { month: "short" })}</Text>
                </View>
                <View style={[styles.eventDot, { backgroundColor: item.color }]} />
                <View style={styles.grow}>
                  <Text style={[styles.kindLabel, { color: theme.muted }]}>{item.kind === "event" ? "Calendar event" : "Task"}</Text>
                  <Text style={[styles.upcomingTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
                  <Text style={[styles.upcomingMeta, { color: theme.muted }]} numberOfLines={1}>{item.meta}</Text>
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={<Empty title="Nothing upcoming yet." body="Tap + to schedule an event, or give a task a due date." />}
        />
      ) : mode === "month" ? (
        <ScrollView contentContainerStyle={styles.list}>
          <View style={styles.monthToolbar}>
            <Pressable onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}><Feather name="chevron-left" size={20} color={theme.text} /></Pressable>
            <Text style={[styles.monthLabel, { color: theme.text }]}>{cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</Text>
            <Pressable onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}><Feather name="chevron-right" size={20} color={theme.text} /></Pressable>
          </View>
          <View style={styles.weekRow}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <Text key={d} style={[styles.weekDay, { color: theme.muted }]}>{d}</Text>
            ))}
          </View>
          <View style={styles.grid}>
            {days.map((dayCell) => {
              const key = toDateKey(dayCell);
              const dayEvents = events.filter((e) => eventOccursOnDate(e, key));
              const muted = dayCell.getMonth() !== cursor.getMonth();
              return (
                <Pressable
                  key={key}
                  onPress={() => { setSelected(key); setMode("day"); }}
                  onLongPress={() => openComposer(undefined, key)}
                  style={[
                    styles.dayCell,
                    { borderColor: key === selected ? theme.accent : "transparent", backgroundColor: key === todayKey ? theme.soft : "transparent" },
                  ]}
                >
                  <Text style={[styles.dayNum, { color: muted ? theme.muted : theme.text, opacity: muted ? 0.4 : 1 }]}>{dayCell.getDate()}</Text>
                  <View style={styles.dayDots}>
                    {dayEvents.slice(0, 3).map((e, i) => (
                      <View key={i} style={[styles.miniDot, { backgroundColor: e.color || theme.accent }]} />
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          <View style={styles.dayToolbar}>
            <Pressable onPress={() => { const d = new Date(`${selected}T12:00`); d.setDate(d.getDate() - 1); setSelected(toDateKey(d)); }}>
              <Feather name="chevron-left" size={20} color={theme.text} />
            </Pressable>
            <Text style={[styles.monthLabel, { color: theme.text }]}>
              {new Date(`${selected}T12:00`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </Text>
            <Pressable onPress={() => { const d = new Date(`${selected}T12:00`); d.setDate(d.getDate() + 1); setSelected(toDateKey(d)); }}>
              <Feather name="chevron-right" size={20} color={theme.text} />
            </Pressable>
          </View>
          {selectedEvents.length ? (
            selectedEvents.map((event) => (
              <Pressable
                key={event.id}
                onPress={() => openComposer(event)}
                style={[styles.dayEventCard, { borderColor: event.color || theme.border, backgroundColor: theme.surface }]}
              >
                <Text style={[styles.dayEventTitle, { color: theme.text }]}>{event.title}</Text>
                <Text style={[styles.dayEventMeta, { color: theme.muted }]}>{formatEventRange(event)}</Text>
                {event.notes ? <Text style={[styles.dayEventNotes, { color: theme.muted }]}>{event.notes}</Text> : null}
              </Pressable>
            ))
          ) : (
            <Card>
              <Empty title="Nothing scheduled." body="That white space is not a bug. Protect it — or add something." />
              <ActionButton label="Add event" icon="plus" onPress={() => openComposer(undefined, selected)} />
            </Card>
          )}

          <Text style={[styles.sectionLabel, { color: theme.text }]}>Ready to place</Text>
          {readyToPlace.length ? (
            readyToPlace.map((task) => (
              <Pressable
                key={task.id}
                onPress={() => scheduleTask(task.id)}
                style={[styles.readyRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <View style={[styles.eventDot, { backgroundColor: task.color || theme.accent }]} />
                <View style={styles.grow}>
                  <Text style={{ color: theme.text, fontWeight: "700" }}>{task.title}</Text>
                  <Text style={{ color: theme.muted, fontSize: 12 }}>
                    Tap to schedule on this day · {task.focusMinutes ?? 30}m
                  </Text>
                </View>
                <Feather name="calendar" size={16} color={theme.accent} />
              </Pressable>
            ))
          ) : (
            <Card><Empty title="Everything has a place." body="Leave the rest unscheduled on purpose." /></Card>
          )}
        </ScrollView>
      )}

      <Modal visible={composerOpen} transparent animationType="fade" onRequestClose={() => setComposerOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalBackdrop}>
          <View style={[styles.importCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.importTitle, { color: theme.text }]}>{editingId ? "Edit event" : "New event"}</Text>
            <ScrollView keyboardShouldPersistTaps="handled" style={styles.composerScroll} contentContainerStyle={styles.composerContent}>
              <Text style={[styles.fieldLabel, { color: theme.muted }]}>Title</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="What’s happening?"
                placeholderTextColor={theme.muted}
                style={[styles.importInput, { color: theme.text, borderColor: theme.border }]}
              />
              <Text style={[styles.fieldLabel, { color: theme.muted }]}>Date</Text>
              <TextInput
                value={day}
                onChangeText={setDay}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.muted}
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.importInput, { color: theme.text, borderColor: theme.border }]}
              />
              <View style={styles.timeRow}>
                <View style={styles.timeField}>
                  <Text style={[styles.fieldLabel, { color: theme.muted }]}>Start</Text>
                  <TextInput
                    value={startTime}
                    onChangeText={setStartTime}
                    placeholder="HH:mm"
                    placeholderTextColor={theme.muted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[styles.importInput, { color: theme.text, borderColor: theme.border }]}
                  />
                </View>
                <View style={styles.timeField}>
                  <Text style={[styles.fieldLabel, { color: theme.muted }]}>End</Text>
                  <TextInput
                    value={endTime}
                    onChangeText={setEndTime}
                    placeholder="HH:mm"
                    placeholderTextColor={theme.muted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[styles.importInput, { color: theme.text, borderColor: theme.border }]}
                  />
                </View>
              </View>
              <Text style={[styles.fieldLabel, { color: theme.muted }]}>Notes</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Optional details"
                placeholderTextColor={theme.muted}
                multiline
                style={[styles.notesInput, { color: theme.text, borderColor: theme.border }]}
              />
              <Text style={[styles.fieldLabel, { color: theme.muted }]}>Color</Text>
              <View style={styles.colorRow}>
                {SPACE_COLORS.slice(0, 8).map((swatch) => (
                  <Pressable
                    key={swatch}
                    onPress={() => setColor(swatch)}
                    style={[
                      styles.colorChip,
                      { backgroundColor: swatch, borderColor: color === swatch ? theme.text : "transparent" },
                    ]}
                  />
                ))}
              </View>
            </ScrollView>
            <View style={styles.row}>
              <ActionButton label="Cancel" quiet onPress={() => setComposerOpen(false)} />
              <ActionButton label={editingId ? "Save" : "Add event"} onPress={saveEvent} />
            </View>
            {editingId ? (
              <Pressable onPress={deleteEvent}>
                <Text style={[styles.deleteLink, { color: theme.danger }]}>Delete event</Text>
              </Pressable>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={importOpen} transparent animationType="fade" onRequestClose={() => setImportOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.importCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.importTitle, { color: theme.text }]}>Import iCal feed</Text>
            <Text style={[styles.importSub, { color: theme.muted }]}>Paste a public .ics subscription URL (Google Calendar, Outlook, Apple Calendar public link, etc).</Text>
            <TextInput
              value={icalUrl}
              onChangeText={setIcalUrl}
              placeholder="https://calendar.example.com/feed.ics"
              placeholderTextColor={theme.muted}
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.importInput, { color: theme.text, borderColor: theme.border }]}
            />
            <View style={styles.row}>
              <ActionButton label="Cancel" quiet onPress={() => setImportOpen(false)} />
              <ActionButton label={importing ? "Importing…" : "Import"} onPress={doImport} disabled={importing || !icalUrl.trim()} />
            </View>
            <Pressable onPress={goConnectWeb}>
              <Text style={[styles.connectWebLink, { color: theme.accent }]}>Connect Gmail / Outlook / iCloud on web →</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Page>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 20, paddingTop: 8, gap: 12 },
  headerActions: { flexDirection: "row", gap: 8 },
  grow: { flex: 1 },
  segmentWrap: { paddingHorizontal: 20, marginTop: 14 },
  list: { padding: 20, paddingBottom: 28, gap: 10 },
  upcomingRow: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 14, padding: 12 },
  dateBlock: { width: 44, alignItems: "center" },
  dateDay: { fontSize: 18, fontWeight: "800" },
  dateMonth: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  eventDot: { width: 8, height: 8, borderRadius: 4 },
  kindLabel: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  upcomingTitle: { fontSize: 15, fontWeight: "800", marginTop: 2 },
  upcomingMeta: { fontSize: 12, marginTop: 2 },
  monthToolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  monthLabel: { fontSize: 16, fontWeight: "800" },
  weekRow: { flexDirection: "row", marginBottom: 4 },
  weekDay: { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "700" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: { width: "14.28%", aspectRatio: 0.85, borderWidth: 1, alignItems: "center", paddingTop: 8, borderRadius: 10 },
  dayNum: { fontSize: 13, fontWeight: "700" },
  dayDots: { flexDirection: "row", gap: 2, marginTop: 4 },
  miniDot: { width: 4, height: 4, borderRadius: 2 },
  dayToolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  dayEventCard: { borderWidth: 1.5, borderRadius: 14, padding: 14, gap: 4 },
  dayEventTitle: { fontSize: 15, fontWeight: "800" },
  dayEventMeta: { fontSize: 13 },
  dayEventNotes: { fontSize: 12, marginTop: 2 },
  sectionLabel: { fontSize: 16, fontWeight: "800", marginTop: 10 },
  readyRow: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 14, padding: 12 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  importCard: { width: "100%", maxHeight: "88%", borderRadius: 18, padding: 20, gap: 12 },
  composerScroll: { maxHeight: 420 },
  composerContent: { gap: 4, paddingBottom: 4 },
  importTitle: { fontSize: 17, fontWeight: "800" },
  importSub: { fontSize: 13, lineHeight: 18 },
  fieldLabel: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4, marginTop: 6 },
  importInput: { minHeight: 46, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 14 },
  notesInput: { minHeight: 72, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, textAlignVertical: "top" },
  timeRow: { flexDirection: "row", gap: 10 },
  timeField: { flex: 1 },
  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4, marginBottom: 4 },
  colorChip: { width: 28, height: 28, borderRadius: 14, borderWidth: 2 },
  row: { flexDirection: "row", gap: 10 },
  connectWebLink: { fontSize: 12, fontWeight: "700", textAlign: "center", marginTop: 4 },
  deleteLink: { fontSize: 13, fontWeight: "700", textAlign: "center", marginTop: 2 },
});
