import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ActionButton } from "./UI";
import {
  clockIn,
  clockOut,
  entryDurationMinutes,
  formatClockTime,
  formatDurationMinutes,
  getActiveEntry,
  type TimeTrackingState,
} from "../lib/timeTracking";
import type { Theme } from "../lib/theme";

type Props = {
  theme: Theme;
  timeTracking: TimeTrackingState;
  workTitle?: string;
  onChange: (next: TimeTrackingState) => void;
  onOpenTimesheet: () => void;
};

export function TimesheetNowStrip({ theme, timeTracking, workTitle, onChange, onOpenTimesheet }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const active = getActiveEntry(timeTracking);
  const client = timeTracking.defaultClientName;

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active?.id]);

  const handleToggle = () => {
    if (active) onChange(clockOut(timeTracking));
    else {
      onChange(
        clockIn(timeTracking, {
          clientName: client,
          title: workTitle?.trim() || "Work session",
        }),
      );
    }
  };

  return (
    <View style={[styles.strip, { backgroundColor: theme.soft, borderColor: theme.border }]}>
      <View style={styles.grow}>
        <Text style={[styles.title, { color: theme.text }]}>{active ? (active.title || "Work session") : "Timesheet"}</Text>
        <Text style={[styles.meta, { color: theme.muted }]}>
          {active
            ? `${active.clientName || client || "Contractor"} · started ${formatClockTime(active.clockInAt)} · ${formatDurationMinutes(entryDurationMinutes(active, now))} so far`
            : client
              ? `${client} · ready to clock in`
              : "Track billable hours for your contractor"}
        </Text>
      </View>
      <View style={styles.actions}>
        <ActionButton
          label={active ? "Clock out" : "Clock in"}
          icon="clock"
          danger={Boolean(active)}
          onPress={handleToggle}
        />
        <Pressable onPress={onOpenTimesheet} style={styles.linkBtn} hitSlop={8}>
          <Text style={{ color: theme.accent, fontWeight: "800", fontSize: 12 }}>
            {active ? "Timesheet" : "Open timesheet"}
          </Text>
          <Feather name="arrow-right" size={14} color={theme.accent} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  grow: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, fontWeight: "800" },
  meta: { fontSize: 12, marginTop: 4, lineHeight: 17 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  linkBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6 },
});
