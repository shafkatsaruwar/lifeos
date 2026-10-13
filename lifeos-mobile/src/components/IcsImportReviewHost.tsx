import Feather from "@expo/vector-icons/Feather";
import { useEffect, useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ActionButton } from "./UI";
import { useLifeOS } from "../lib/LifeOSContext";
import { mergeCalendarEvents } from "../lib/api";
import { formatEventRange } from "../lib/helpers";
import {
  clearPendingIcsImport,
  selectedIcsImportEvents,
  subscribeIcsImportQueue,
  toggleIcsImportSelection,
  type IcsImportBatch,
} from "../lib/icsImportQueue";
import { navigationRef } from "../navigation/navigationRef";

/** Global review sheet: stage ICS → pick events → only then write calendar. */
export function IcsImportReviewHost() {
  const { theme, workspace, updateCalendar } = useLifeOS();
  const [batch, setBatch] = useState<IcsImportBatch | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribeIcsImportQueue(setBatch), []);

  const existingIds = useMemo(
    () => new Set(workspace.calendar.map((event) => event.id)),
    [workspace.calendar],
  );
  const selected = selectedIcsImportEvents(batch);

  const discard = () => {
    clearPendingIcsImport();
  };

  const approve = async () => {
    if (!batch || !selected.length || busy) return;
    setBusy(true);
    try {
      const next = mergeCalendarEvents(workspace.calendar, selected);
      await updateCalendar(next);
      clearPendingIcsImport();
      const go = (attempt: number) => {
        if (navigationRef.isReady()) {
          navigationRef.navigate("CalendarTab" as never, { screen: "CalendarMain" } as never);
          return;
        }
        if (attempt < 12) setTimeout(() => go(attempt + 1), 80);
      };
      go(0);
      Alert.alert(
        "Added to calendar",
        `${selected.length} event${selected.length === 1 ? "" : "s"} from ${batch.sourceLabel}.`,
      );
    } catch (error) {
      Alert.alert(
        "Could not add events",
        error instanceof Error ? error.message : "Try again in a moment.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (!batch) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={discard}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.title, { color: theme.text }]}>Review imported events</Text>
          <Text style={[styles.sub, { color: theme.muted }]}>
            Parsed from {batch.sourceLabel}. Nothing is added until you approve.
          </Text>
          <ScrollView style={styles.list} contentContainerStyle={{ gap: 8 }}>
            {batch.events.map((event) => {
              const on = batch.selectedIds.includes(event.id);
              const duplicate = existingIds.has(event.id);
              return (
                <Pressable
                  key={event.id}
                  onPress={() => toggleIcsImportSelection(event.id)}
                  style={[
                    styles.row,
                    {
                      borderColor: on ? theme.accent : theme.border,
                      backgroundColor: on ? theme.soft : theme.bg,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.check,
                      {
                        borderColor: on ? theme.accent : theme.border,
                        backgroundColor: on ? theme.accent : "transparent",
                      },
                    ]}
                  >
                    {on ? <Feather name="check" size={12} color="#fff" /> : null}
                  </View>
                  <View style={styles.grow}>
                    <Text style={{ color: theme.text, fontWeight: "800" }} numberOfLines={2}>
                      {event.title}
                    </Text>
                    <Text style={{ color: theme.muted, fontSize: 12, marginTop: 2 }}>
                      {formatEventRange(event)}
                      {duplicate ? " · already on calendar" : ""}
                    </Text>
                    {event.notes ? (
                      <Text style={{ color: theme.muted, fontSize: 12, marginTop: 2 }} numberOfLines={2}>
                        {event.notes}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.actions}>
            <ActionButton label="Discard" quiet onPress={discard} disabled={busy} />
            <ActionButton
              label={
                busy
                  ? "Adding…"
                  : selected.length
                    ? `Add ${selected.length}`
                    : "Select events"
              }
              icon="check"
              onPress={() => void approve()}
              disabled={busy || !selected.length}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxHeight: "86%",
    borderRadius: 18,
    padding: 18,
    gap: 10,
  },
  title: { fontSize: 18, fontWeight: "800" },
  sub: { fontSize: 13, lineHeight: 18 },
  list: { maxHeight: 420 },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 12,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  grow: { flex: 1 },
  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
});
