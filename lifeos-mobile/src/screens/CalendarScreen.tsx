import Feather from "@expo/vector-icons/Feather";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useEffect, useMemo, useState } from "react";
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
  useColorScheme,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ActionButton, Card, Empty, Eyebrow, IconButton, Page, SegmentedControl, Subtitle, Title } from "../components/UI";
import { useFloatingTabBarContentPadding } from "../components/FloatingTabBar";
import { useLifeOS } from "../lib/LifeOSContext";
import {
  CAL_PERSONAL_ID,
  eventCalendarId,
  eventDisplayColor,
  findCalendar,
  isEventVisible,
  newCalendarId,
  normalizeCalendars,
} from "../lib/calendars";
import {
  eventOccursOnDate,
  formatEventRange,
  toDateKey,
} from "../lib/helpers";
import { fetchIcsFromUrl, parseIcsEvents } from "../lib/api";
import {
  expandEventsInRange,
  parseOccurrenceId,
  REPEAT_OPTIONS,
  repeatLabel,
} from "../lib/recurrence";
import { SPACE_COLORS } from "../lib/theme";
import { mergeCalendarWithWorkMeetings } from "../lib/workos";
import type { CalendarDefaultView, CalendarEvent, EventRepeatFrequency, UserCalendar } from "../types";

type Mode = CalendarDefaultView;

function normalizeCalendarDefaultView(value: unknown): Mode {
  return value === "month" || value === "day" || value === "upcoming" ? value : "upcoming";
}

function normalizeTime(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return "09:00";
  const hours = Math.min(23, Math.max(0, Number(match[1])));
  const minutes = Math.min(59, Math.max(0, Number(match[2])));
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function dateFromDayKey(day: string) {
  const match = day.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0);
}

function dateFromTime(time: string, day = toDateKey(new Date())) {
  const normalized = normalizeTime(time);
  const [hours, minutes] = normalized.split(":").map(Number);
  const base = dateFromDayKey(day);
  base.setHours(hours, minutes, 0, 0);
  return base;
}

function formatTime(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatDayLabel(day: string) {
  return dateFromDayKey(day).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeLabel(time: string) {
  return dateFromTime(time).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CalendarScreen() {
  const tabBarPad = useFloatingTabBarContentPadding(28);
  const { theme, workspace, updateCalendar, updateCalendars, updateTasks } = useLifeOS();
  const navigation = useNavigation<any>();
  const colorScheme = useColorScheme();
  const pickerTheme = colorScheme === "dark" ? "dark" : "light";
  const defaultView = normalizeCalendarDefaultView(workspace.settings.defaultCalendarView);
  const [mode, setMode] = useState<Mode>(defaultView);
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => toDateKey(new Date()));
  const [importOpen, setImportOpen] = useState(false);
  const [icalUrl, setIcalUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [calendarsOpen, setCalendarsOpen] = useState(false);

  const [composerOpen, setComposerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [day, setDay] = useState(() => toDateKey(new Date()));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [calendarId, setCalendarId] = useState(CAL_PERSONAL_ID);
  const [repeat, setRepeat] = useState<EventRepeatFrequency>("never");
  const [repeatUntil, setRepeatUntil] = useState<string | undefined>();
  const [occurrenceKey, setOccurrenceKey] = useState<string | undefined>();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showUntilPicker, setShowUntilPicker] = useState(false);

  useEffect(() => {
    setMode(defaultView);
  }, [defaultView]);

  const calendars = useMemo(() => normalizeCalendars(workspace.calendars), [workspace.calendars]);

  // Persist default Personal / Work / School once so they sync across devices.
  useEffect(() => {
    if (!Array.isArray(workspace.calendars) || workspace.calendars.length === 0) {
      void updateCalendars(calendars);
    }
  }, [workspace.calendars, calendars, updateCalendars]);

  const applyStartTime = (next: string) => {
    const normalized = normalizeTime(next);
    setStartTime(normalized);
    const startDate = dateFromTime(normalized, day);
    const endDate = dateFromTime(endTime, day);
    if (endDate <= startDate) {
      const bumped = new Date(startDate);
      bumped.setHours(bumped.getHours() + 1);
      setEndTime(formatTime(bumped));
    }
  };

  const todayKey = toDateKey(new Date());
  const masters = useMemo(() => {
    if (workspace.settings.enableWorkOS === false) return workspace.calendar;
    return mergeCalendarWithWorkMeetings(workspace.calendar, workspace.work);
  }, [workspace.calendar, workspace.work, workspace.settings.enableWorkOS]);

  const events = useMemo(() => {
    const monthPadStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    monthPadStart.setDate(monthPadStart.getDate() - 7);
    const monthPadEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    monthPadEnd.setDate(monthPadEnd.getDate() + 14);
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + 366);
    const rangeStart = [toDateKey(monthPadStart), todayKey, selected].sort()[0];
    const rangeEnd = [toDateKey(monthPadEnd), toDateKey(horizon), selected].sort().at(-1)!;
    return expandEventsInRange(masters, rangeStart, rangeEnd).filter((e) => isEventVisible(e, calendars));
  }, [masters, calendars, cursor, todayKey, selected]);

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
    return events
      .filter((e) => (e.end ?? e.start).slice(0, 10) >= todayKey)
      .sort((a, b) => a.start.localeCompare(b.start))
      .slice(0, 7)
      .map((e) => {
        const cal = findCalendar(calendars, eventCalendarId(e));
        const series = e.repeat && e.repeat !== "never" ? ` · ${repeatLabel(e.repeat)}` : "";
        return {
          id: e.id,
          kind: "event" as const,
          title: e.title,
          date: e.start,
          color: eventDisplayColor(e, calendars),
          meta: `${formatEventRange(e)} · ${cal?.name || e.source || "LifeOS"}${series}`,
        };
      });
  }, [events, calendars, todayKey]);

  const readyToPlace = workspace.tasks
    .filter((t) => !t.done && !t.canceled && (!t.startTime || t.due !== selected))
    .slice(0, 6);

  const openComposer = (event?: CalendarEvent, defaultDay?: string) => {
    if (event) {
      const { seriesId, dateKey } = parseOccurrenceId(event.id);
      const master = workspace.calendar.find((item) => item.id === seriesId) || event;
      const id = eventCalendarId(master);
      const cal = findCalendar(calendars, id);
      setEditingId(seriesId);
      setOccurrenceKey(dateKey);
      setTitle(master.title);
      setDay(master.start.slice(0, 10));
      setStartTime(master.start.slice(11, 16) || "09:00");
      setEndTime(master.end?.slice(11, 16) || "10:00");
      setNotes(master.notes ?? "");
      setCalendarId(cal?.id || CAL_PERSONAL_ID);
      setRepeat(master.repeat && master.repeat !== "never" ? master.repeat : "never");
      setRepeatUntil(master.repeatUntil);
    } else {
      const fallback = calendars.find((c) => c.visible !== false) || calendars[0];
      setEditingId(null);
      setOccurrenceKey(undefined);
      setTitle("");
      setDay(defaultDay || selected || todayKey);
      setStartTime("09:00");
      setEndTime("10:00");
      setNotes("");
      setCalendarId(fallback?.id || CAL_PERSONAL_ID);
      setRepeat("never");
      setRepeatUntil(undefined);
    }
    setShowDatePicker(false);
    setShowStartPicker(false);
    setShowEndPicker(false);
    setShowUntilPicker(false);
    setComposerOpen(true);
  };

  const pickRepeat = () => {
    Alert.alert(
      "Repeat",
      undefined,
      [
        ...REPEAT_OPTIONS.map((option) => ({
          text: option.label,
          onPress: () => {
            setRepeat(option.key);
            if (option.key === "never") setRepeatUntil(undefined);
          },
        })),
        { text: "Cancel", style: "cancel" as const },
      ],
    );
  };

  const toggleCalendarVisible = (id: string) => {
    void updateCalendars(
      calendars.map((c) => (c.id === id ? { ...c, visible: c.visible === false } : c)),
    );
  };

  const addCalendar = () => {
    const create = (name?: string, color?: string) => {
      const trimmed = (name || "").trim() || `Calendar ${calendars.length + 1}`;
      const next: UserCalendar = {
        id: newCalendarId(),
        name: trimmed,
        color: color || SPACE_COLORS[calendars.length % SPACE_COLORS.length],
        visible: true,
      };
      void updateCalendars([...calendars, next]);
    };
    if (Platform.OS === "ios" && typeof Alert.prompt === "function") {
      Alert.prompt("New calendar", "Name this calendar", [
        { text: "Cancel", style: "cancel" },
        { text: "Add", onPress: (value?: string) => create(value) },
      ], "plain-text");
      return;
    }
    create();
  };

  const deleteCalendar = (cal: UserCalendar) => {
    if (calendars.length <= 1) {
      Alert.alert("Keep one calendar", "You need at least one calendar.");
      return;
    }
    Alert.alert("Delete calendar?", `Events on “${cal.name}” move to Personal.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          const fallback = calendars.find((c) => c.id !== cal.id)?.id || CAL_PERSONAL_ID;
          void updateCalendar(
            workspace.calendar.map((event) =>
              eventCalendarId(event) === cal.id ? { ...event, calendarId: fallback, color: findCalendar(calendars, fallback)?.color } : event,
            ),
          );
          void updateCalendars(calendars.filter((c) => c.id !== cal.id));
          if (calendarId === cal.id) setCalendarId(fallback);
        },
      },
    ]);
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
    const cal = findCalendar(calendars, calendarId) || calendars[0];
    const start = `${day.trim()}T${normalizeTime(startTime)}`;
    const end = `${day.trim()}T${normalizeTime(endTime)}`;
    const master = workspace.calendar.find((event) => event.id === editingId);
    const payload: CalendarEvent = {
      id: editingId ?? `lifeos-${Date.now()}`,
      title: clean,
      start,
      end,
      source: master?.source ?? "LifeOS",
      calendarId: cal?.id || CAL_PERSONAL_ID,
      color: cal?.color,
      notes: notes.trim() || undefined,
      repeat: repeat === "never" ? undefined : repeat,
      repeatUntil: repeat === "never" ? undefined : repeatUntil,
      repeatExceptions: repeat === "never" ? undefined : master?.repeatExceptions,
    };
    if (editingId) {
      // Don't rewrite Work-bridged masters from this editor.
      if (editingId.startsWith("work-meet-")) {
        Alert.alert("Work meeting", "Edit this meeting from WorkOS.");
        return;
      }
      await updateCalendar(
        workspace.calendar.map((event) =>
          event.id === editingId ? { ...event, ...payload } : event,
        ),
      );
    } else {
      await updateCalendar([...workspace.calendar, payload]);
    }
    setSelected(day.trim());
    setComposerOpen(false);
  };

  const deleteSeries = async () => {
    if (!editingId) return;
    if (editingId.startsWith("work-meet-")) {
      Alert.alert("Work meeting", "Remove this meeting from WorkOS.");
      return;
    }
    await updateCalendar(workspace.calendar.filter((event) => event.id !== editingId));
    setComposerOpen(false);
  };

  const deleteThisOccurrence = async () => {
    if (!editingId || !occurrenceKey) return;
    const master = workspace.calendar.find((event) => event.id === editingId);
    if (!master) return;
    const exceptions = Array.from(new Set([...(master.repeatExceptions || []), occurrenceKey]));
    await updateCalendar(
      workspace.calendar.map((event) =>
        event.id === editingId ? { ...event, repeatExceptions: exceptions } : event,
      ),
    );
    setComposerOpen(false);
  };

  const deleteEvent = () => {
    if (!editingId) return;
    const isSeries = repeat !== "never" || Boolean(occurrenceKey);
    if (isSeries && occurrenceKey) {
      Alert.alert("Delete event?", "This is part of a repeating series.", [
        { text: "Cancel", style: "cancel" },
        { text: "This event only", style: "destructive", onPress: () => void deleteThisOccurrence() },
        { text: "All events", style: "destructive", onPress: () => void deleteSeries() },
      ]);
      return;
    }
    Alert.alert("Delete event?", "This removes it from your LifeOS calendar.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void deleteSeries() },
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
      const merged = [
        ...workspace.calendar.filter((e) => e.source !== "iCal" || !parsed.some((p) => p.id === e.id)),
        ...parsed,
      ];
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
          <IconButton icon="layers" label="Calendars" onPress={() => setCalendarsOpen(true)} />
          <IconButton icon="plus" label="Add event" onPress={() => openComposer(undefined, selected)} />
          <IconButton icon="link" label="Import iCal" onPress={() => setImportOpen(true)} />
        </View>
      </View>

      <View style={styles.calFilterRow}>
        {calendars.map((cal) => {
          const on = cal.visible !== false;
          return (
            <Pressable
              key={cal.id}
              onPress={() => toggleCalendarVisible(cal.id)}
              onLongPress={() => setCalendarsOpen(true)}
              style={[
                styles.calFilterChip,
                {
                  borderColor: on ? cal.color : theme.border,
                  backgroundColor: on ? `${cal.color}22` : theme.surface,
                  opacity: on ? 1 : 0.55,
                },
              ]}
            >
              <View style={[styles.calFilterDot, { backgroundColor: cal.color }]} />
              <Text style={{ color: theme.text, fontSize: 12, fontWeight: "700" }}>{cal.name}</Text>
            </Pressable>
          );
        })}
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
          contentContainerStyle={[styles.list, { paddingBottom: tabBarPad }]}
          renderItem={({ item }) => {
            const date = new Date(`${item.date.slice(0, 10)}T12:00`);
            return (
              <Pressable
                onPress={() => {
                  const event = events.find((e) => e.id === item.id);
                  if (event) openComposer(event);
                }}
                style={[styles.upcomingRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <View style={styles.dateBlock}>
                  <Text style={[styles.dateDay, { color: theme.text }]}>{date.toLocaleDateString("en-US", { day: "numeric" })}</Text>
                  <Text style={[styles.dateMonth, { color: theme.muted }]}>{date.toLocaleDateString("en-US", { month: "short" })}</Text>
                </View>
                <View style={[styles.eventDot, { backgroundColor: item.color }]} />
                <View style={styles.grow}>
                  <Text style={[styles.kindLabel, { color: theme.muted }]}>Calendar event</Text>
                  <Text style={[styles.upcomingTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
                  <Text style={[styles.upcomingMeta, { color: theme.muted }]} numberOfLines={1}>{item.meta}</Text>
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={<Empty title="Nothing upcoming yet." body="Tap + to schedule an event." />}
        />
      ) : mode === "month" ? (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: tabBarPad }]}>
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
                      <View key={i} style={[styles.miniDot, { backgroundColor: eventDisplayColor(e, calendars) }]} />
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: tabBarPad }]}>
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
                style={[styles.dayEventCard, { borderColor: eventDisplayColor(event, calendars), backgroundColor: theme.surface }]}
              >
                <Text style={[styles.dayEventTitle, { color: theme.text }]}>{event.title}</Text>
                <Text style={[styles.dayEventMeta, { color: theme.muted }]}>
                  {formatEventRange(event)}
                  {" · "}
                  {findCalendar(calendars, eventCalendarId(event))?.name || event.source || "LifeOS"}
                </Text>
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
              {Platform.OS === "ios" ? (
                <View style={styles.pickerRow}>
                  <DateTimePicker
                    value={dateFromDayKey(day)}
                    mode="date"
                    display="compact"
                    themeVariant={pickerTheme}
                    onChange={(_, date) => {
                      if (date) setDay(toDateKey(date));
                    }}
                  />
                </View>
              ) : (
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Pick date"
                    onPress={() => setShowDatePicker(true)}
                    style={[styles.pickerButton, { borderColor: theme.border }]}
                  >
                    <Feather name="calendar" size={16} color={theme.accent} />
                    <Text style={{ color: theme.text, fontSize: 15, fontWeight: "600" }}>{formatDayLabel(day)}</Text>
                  </Pressable>
                  {showDatePicker ? (
                    <DateTimePicker
                      value={dateFromDayKey(day)}
                      mode="date"
                      display="default"
                      onChange={(event, date) => {
                        setShowDatePicker(false);
                        if (event.type !== "dismissed" && date) setDay(toDateKey(date));
                      }}
                    />
                  ) : null}
                </>
              )}
              <View style={styles.timeRow}>
                <View style={styles.timeField}>
                  <Text style={[styles.fieldLabel, { color: theme.muted }]}>Start</Text>
                  {Platform.OS === "ios" ? (
                    <View style={styles.pickerRow}>
                      <DateTimePicker
                        value={dateFromTime(startTime, day)}
                        mode="time"
                        display="compact"
                        minuteInterval={5}
                        themeVariant={pickerTheme}
                        onChange={(_, date) => {
                          if (date) applyStartTime(formatTime(date));
                        }}
                      />
                    </View>
                  ) : (
                    <>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Pick start time"
                        onPress={() => setShowStartPicker(true)}
                        style={[styles.pickerButton, { borderColor: theme.border }]}
                      >
                        <Feather name="clock" size={16} color={theme.accent} />
                        <Text style={{ color: theme.text, fontSize: 15, fontWeight: "600" }}>
                          {formatTimeLabel(startTime)}
                        </Text>
                      </Pressable>
                      {showStartPicker ? (
                        <DateTimePicker
                          value={dateFromTime(startTime, day)}
                          mode="time"
                          display="default"
                          minuteInterval={5}
                          onChange={(event, date) => {
                            setShowStartPicker(false);
                            if (event.type !== "dismissed" && date) applyStartTime(formatTime(date));
                          }}
                        />
                      ) : null}
                    </>
                  )}
                </View>
                <View style={styles.timeField}>
                  <Text style={[styles.fieldLabel, { color: theme.muted }]}>End</Text>
                  {Platform.OS === "ios" ? (
                    <View style={styles.pickerRow}>
                      <DateTimePicker
                        value={dateFromTime(endTime, day)}
                        mode="time"
                        display="compact"
                        minuteInterval={5}
                        themeVariant={pickerTheme}
                        onChange={(_, date) => {
                          if (date) setEndTime(formatTime(date));
                        }}
                      />
                    </View>
                  ) : (
                    <>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Pick end time"
                        onPress={() => setShowEndPicker(true)}
                        style={[styles.pickerButton, { borderColor: theme.border }]}
                      >
                        <Feather name="clock" size={16} color={theme.accent} />
                        <Text style={{ color: theme.text, fontSize: 15, fontWeight: "600" }}>
                          {formatTimeLabel(endTime)}
                        </Text>
                      </Pressable>
                      {showEndPicker ? (
                        <DateTimePicker
                          value={dateFromTime(endTime, day)}
                          mode="time"
                          display="default"
                          minuteInterval={5}
                          onChange={(event, date) => {
                            setShowEndPicker(false);
                            if (event.type !== "dismissed" && date) setEndTime(formatTime(date));
                          }}
                        />
                      ) : null}
                    </>
                  )}
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
              <Text style={[styles.fieldLabel, { color: theme.muted }]}>Calendar</Text>
              <View style={styles.calPickRow}>
                {calendars.map((cal) => {
                  const on = calendarId === cal.id;
                  return (
                    <Pressable
                      key={cal.id}
                      onPress={() => setCalendarId(cal.id)}
                      style={[
                        styles.calPickChip,
                        {
                          borderColor: on ? cal.color : theme.border,
                          backgroundColor: on ? `${cal.color}22` : theme.bg,
                        },
                      ]}
                    >
                      <View style={[styles.calFilterDot, { backgroundColor: cal.color }]} />
                      <Text style={{ color: theme.text, fontSize: 13, fontWeight: "700" }}>{cal.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={[styles.fieldLabel, { color: theme.muted }]}>Repeat</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Pick repeat frequency"
                onPress={pickRepeat}
                style={[styles.pickerButton, { borderColor: theme.border }]}
              >
                <Feather name="repeat" size={16} color={theme.accent} />
                <Text style={{ color: theme.text, fontSize: 15, fontWeight: "600" }}>{repeatLabel(repeat)}</Text>
              </Pressable>
              {repeat !== "never" ? (
                <>
                  <View style={styles.cardHeadRow}>
                    <Text style={[styles.fieldLabel, { color: theme.muted, marginTop: 0 }]}>End repeat</Text>
                    {repeatUntil ? (
                      <Pressable onPress={() => setRepeatUntil(undefined)}>
                        <Text style={{ color: theme.muted, fontSize: 12, fontWeight: "700" }}>Clear</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  {Platform.OS === "ios" ? (
                    repeatUntil ? (
                      <View style={styles.pickerRow}>
                        <DateTimePicker
                          value={dateFromDayKey(repeatUntil)}
                          mode="date"
                          display="compact"
                          minimumDate={dateFromDayKey(day)}
                          themeVariant={pickerTheme}
                          onChange={(_, date) => {
                            if (date) setRepeatUntil(toDateKey(date));
                          }}
                        />
                      </View>
                    ) : (
                      <Pressable
                        onPress={() => setRepeatUntil(day)}
                        style={[styles.pickerButton, { borderColor: theme.border }]}
                      >
                        <Feather name="calendar" size={16} color={theme.accent} />
                        <Text style={{ color: theme.muted, fontSize: 15, fontWeight: "600" }}>Never — tap to end on a date</Text>
                      </Pressable>
                    )
                  ) : (
                    <>
                      <Pressable
                        onPress={() => setShowUntilPicker(true)}
                        style={[styles.pickerButton, { borderColor: theme.border }]}
                      >
                        <Feather name="calendar" size={16} color={theme.accent} />
                        <Text style={{ color: theme.text, fontSize: 15, fontWeight: "600" }}>
                          {repeatUntil ? formatDayLabel(repeatUntil) : "Never"}
                        </Text>
                      </Pressable>
                      {showUntilPicker ? (
                        <DateTimePicker
                          value={dateFromDayKey(repeatUntil || day)}
                          mode="date"
                          display="default"
                          minimumDate={dateFromDayKey(day)}
                          onChange={(event, date) => {
                            setShowUntilPicker(false);
                            if (event.type !== "dismissed" && date) setRepeatUntil(toDateKey(date));
                          }}
                        />
                      ) : null}
                    </>
                  )}
                </>
              ) : null}
            </ScrollView>
            <View style={styles.row}>
              <ActionButton
                label="Cancel"
                quiet
                onPress={() => {
                  setShowDatePicker(false);
                  setShowStartPicker(false);
                  setShowEndPicker(false);
                  setComposerOpen(false);
                }}
              />
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

      <Modal visible={calendarsOpen} transparent animationType="fade" onRequestClose={() => setCalendarsOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.importCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.importTitle, { color: theme.text }]}>Calendars</Text>
            <Text style={[styles.importSub, { color: theme.muted }]}>
              Show or hide calendars like iOS. Tap a chip on the calendar screen to toggle visibility.
            </Text>
            <ScrollView style={styles.composerScroll} contentContainerStyle={{ gap: 8 }}>
              {calendars.map((cal) => {
                const on = cal.visible !== false;
                return (
                  <View
                    key={cal.id}
                    style={[styles.calManageRow, { borderColor: theme.border, backgroundColor: theme.bg }]}
                  >
                    <Pressable onPress={() => toggleCalendarVisible(cal.id)} style={styles.calManageMain}>
                      <View style={[styles.calManageSwatch, { backgroundColor: cal.color, opacity: on ? 1 : 0.35 }]} />
                      <View style={styles.grow}>
                        <Text style={{ color: theme.text, fontWeight: "800" }}>{cal.name}</Text>
                        <Text style={{ color: theme.muted, fontSize: 12 }}>{on ? "Visible" : "Hidden"}</Text>
                      </View>
                      <Feather name={on ? "eye" : "eye-off"} size={18} color={theme.muted} />
                    </Pressable>
                    <Pressable
                      accessibilityLabel={`Delete ${cal.name}`}
                      onPress={() => deleteCalendar(cal)}
                      hitSlop={8}
                      style={styles.calManageDelete}
                    >
                      <Feather name="trash-2" size={16} color={theme.danger} />
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
            <View style={styles.row}>
              <ActionButton label="Done" quiet onPress={() => setCalendarsOpen(false)} />
              <ActionButton label="Add calendar" icon="plus" onPress={addCalendar} />
            </View>
          </View>
        </View>
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
  calFilterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    paddingRight: 28,
    marginTop: 12,
    gap: 8,
    alignItems: "center",
  },
  calFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
  },
  calFilterDot: { width: 8, height: 8, borderRadius: 4 },
  calPickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4, marginBottom: 4 },
  calPickChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 38,
  },
  calManageRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  calManageMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  calManageSwatch: { width: 18, height: 18, borderRadius: 9 },
  calManageDelete: { padding: 6 },
  cardHeadRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
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
  pickerRow: { flexDirection: "row", alignItems: "center", minHeight: 36, marginVertical: 4 },
  pickerButton: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  row: { flexDirection: "row", gap: 10 },
  connectWebLink: { fontSize: 12, fontWeight: "700", textAlign: "center", marginTop: 4 },
  deleteLink: { fontSize: 13, fontWeight: "700", textAlign: "center", marginTop: 2 },
});
