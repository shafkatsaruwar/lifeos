import Feather from "@expo/vector-icons/Feather";
import { useMemo, useState } from "react";
import { Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ActionButton, Card, Empty, Eyebrow, IconButton, Page, SegmentedControl, Subtitle, Title } from "../components/UI";
import { useLifeOS } from "../lib/LifeOSContext";
import {
  eventOccursOnDate,
  formatEventRange,
  toDateKey,
} from "../lib/helpers";
import { fetchIcsFromUrl, parseIcsEvents } from "../lib/api";
import type { CalendarEvent } from "../types";

type Mode = "upcoming" | "month" | "day";

export function CalendarScreen() {
  const { theme, workspace, updateCalendar } = useLifeOS();
  const navigation = useNavigation<any>();
  const [mode, setMode] = useState<Mode>("upcoming");
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => toDateKey(new Date()));
  const [importOpen, setImportOpen] = useState(false);
  const [icalUrl, setIcalUrl] = useState("");
  const [importing, setImporting] = useState(false);

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
    const evItems = events
      .filter((e) => (e.end ?? e.start).slice(0, 10) >= todayKey)
      .map((e) => ({ id: e.id, kind: "event" as const, title: e.title, date: e.start, color: e.color || theme.accent, meta: `${formatEventRange(e)} · ${e.source ?? "LifeOS"}` }));
    const taskItems = workspace.tasks
      .filter((t) => !t.done && !t.canceled && t.due && /^\d{4}-\d{2}-\d{2}$/.test(t.due) && t.due >= todayKey)
      .map((t) => ({ id: String(t.id), kind: "task" as const, title: t.title, date: `${t.due}T${t.startTime || "09:00"}`, color: t.color || theme.accent, meta: `Task · due ${t.due === todayKey ? "today" : t.due} · ${t.focusMinutes ?? 30}m` }));
    return [...evItems, ...taskItems].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 40);
  }, [events, workspace.tasks, todayKey, theme.accent]);

  const readyToPlace = workspace.tasks.filter((t) => !t.startTime || t.due !== selected).slice(0, 6);

  const doImport = async () => {
    if (!icalUrl.trim()) return;
    setImporting(true);
    try {
      const ics = await fetchIcsFromUrl(icalUrl.trim());
      const parsed = parseIcsEvents(ics);
      const existingIds = new Set(events.map((e) => e.id));
      const merged = [...events.filter((e) => e.source !== "iCal" || !parsed.some((p) => p.id === e.id)), ...parsed.filter((p) => !existingIds.has(p.id) || true)];
      // Dedupe by id, preferring freshly imported events.
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
        <IconButton icon="link" label="Import iCal" onPress={() => setImportOpen(true)} />
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
                onPress={() => item.kind === "event" && setSelected(item.date.slice(0, 10))}
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
          ListEmptyComponent={<Empty title="Nothing upcoming yet." body="Import a calendar or give a task a due date." />}
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
            {days.map((day) => {
              const key = toDateKey(day);
              const dayEvents = events.filter((e) => eventOccursOnDate(e, key));
              const muted = day.getMonth() !== cursor.getMonth();
              return (
                <Pressable
                  key={key}
                  onPress={() => { setSelected(key); setMode("day"); }}
                  style={[
                    styles.dayCell,
                    { borderColor: key === selected ? theme.accent : "transparent", backgroundColor: key === todayKey ? theme.soft : "transparent" },
                  ]}
                >
                  <Text style={[styles.dayNum, { color: muted ? theme.muted : theme.text, opacity: muted ? 0.4 : 1 }]}>{day.getDate()}</Text>
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
              <View key={event.id} style={[styles.dayEventCard, { borderColor: event.color || theme.border, backgroundColor: theme.surface }]}>
                <Text style={[styles.dayEventTitle, { color: theme.text }]}>{event.title}</Text>
                <Text style={[styles.dayEventMeta, { color: theme.muted }]}>{formatEventRange(event)}</Text>
                {event.notes ? <Text style={[styles.dayEventNotes, { color: theme.muted }]}>{event.notes}</Text> : null}
              </View>
            ))
          ) : (
            <Card><Empty title="Nothing scheduled." body="That white space is not a bug. Protect it." /></Card>
          )}

          <Text style={[styles.sectionLabel, { color: theme.text }]}>Ready to place</Text>
          {readyToPlace.length ? (
            readyToPlace.map((task) => (
              <View key={task.id} style={[styles.readyRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={[styles.eventDot, { backgroundColor: task.color || theme.accent }]} />
                <View style={styles.grow}>
                  <Text style={{ color: theme.text, fontWeight: "700" }}>{task.title}</Text>
                  <Text style={{ color: theme.muted, fontSize: 12 }}>{task.focusMinutes ?? 30}m · {task.energy ?? "Medium"} energy</Text>
                </View>
              </View>
            ))
          ) : (
            <Card><Empty title="Everything has a place." body="Leave the rest unscheduled on purpose." /></Card>
          )}
        </ScrollView>
      )}

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
  grow: { flex: 1 },
  segmentWrap: { paddingHorizontal: 20, marginTop: 14 },
  list: { padding: 20, paddingBottom: 110, gap: 10 },
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
  importCard: { width: "100%", borderRadius: 18, padding: 20, gap: 12 },
  importTitle: { fontSize: 17, fontWeight: "800" },
  importSub: { fontSize: 13, lineHeight: 18 },
  importInput: { minHeight: 46, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 14 },
  row: { flexDirection: "row", gap: 10 },
  connectWebLink: { fontSize: 12, fontWeight: "700", textAlign: "center", marginTop: 4 },
});
