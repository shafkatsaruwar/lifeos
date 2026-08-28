import Feather from "@expo/vector-icons/Feather";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { Card, Eyebrow, Page, Title } from "../components/UI";
import { useFloatingTabBarContentPadding } from "../components/FloatingTabBar";
import { useLifeOS } from "../lib/LifeOSContext";
import {
  LEAD_LABELS,
  disableAllNotifications,
  getNotificationPermission,
  markPermissionAsked,
  openSystemNotificationSettings,
  requestNotificationPermission,
  resolveNotificationPrefs,
  scheduleWorkspaceNotificationSync,
  withNotificationPrefs,
} from "../lib/notifications";
import type { NotificationLead, NotificationPrefs } from "../types";

const LEAD_OPTIONS: NotificationLead[] = ["exact", "5m", "15m", "30m", "1h", "1d"];

export function NotificationSettingsScreen() {
  const { theme, workspace, updateSettings } = useLifeOS();
  const tabBarPad = useFloatingTabBarContentPadding(28);
  const navigation = useNavigation<any>();
  const prefs = resolveNotificationPrefs(workspace.settings);
  const [permission, setPermission] = useState<"undetermined" | "granted" | "denied">("undetermined");

  useEffect(() => {
    void getNotificationPermission().then(setPermission);
  }, []);

  const patch = async (next: Partial<NotificationPrefs>) => {
    const merged = withNotificationPrefs(workspace.settings, next);
    await updateSettings(merged);
    if (merged.notifications?.enabled) {
      scheduleWorkspaceNotificationSync({ ...workspace, settings: merged });
    } else if (next.enabled === false) {
      await disableAllNotifications();
    }
  };

  const enableMaster = async (value: boolean) => {
    if (!value) {
      await patch({ enabled: false });
      return;
    }
    const status = await requestNotificationPermission();
    setPermission(status);
    await updateSettings(markPermissionAsked(workspace.settings));
    if (status !== "granted") {
      Alert.alert(
        "Notifications are off",
        "LifeOS still works. You can enable alerts later in system Settings.",
        [
          { text: "Not now", style: "cancel" },
          { text: "Open Settings", onPress: () => void openSystemNotificationSettings() },
        ],
      );
      await patch({ enabled: false });
      return;
    }
    await patch({ enabled: true });
  };

  const toggleLead = (lead: NotificationLead) => {
    const current = prefs.leads;
    const next = current.includes(lead) ? current.filter((l) => l !== lead) : [...current, lead];
    if (!next.length) return;
    void patch({ leads: next });
  };

  return (
    <Page>
      <ScrollView contentContainerStyle={[styles.screen, { paddingBottom: tabBarPad }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.back}>
          <Feather name="chevron-left" size={22} color={theme.accent} />
          <Text style={{ color: theme.accent, fontWeight: "700" }}>Settings</Text>
        </Pressable>
        <Eyebrow>ALERTS</Eyebrow>
        <Title>Notifications</Title>
        <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 18, marginBottom: 8 }}>
          Only the things that matter — due dates, deadlines, events, and focus. No spam.
        </Text>

        <Card>
          <View style={styles.row}>
            <View style={styles.grow}>
              <Text style={[styles.label, { color: theme.text }]}>Enable notifications</Text>
              <Text style={{ color: theme.muted, fontSize: 12 }}>
                {permission === "granted"
                  ? "Permission granted"
                  : permission === "denied"
                    ? "Permission denied — open system Settings"
                    : "We’ll ask when you turn this on"}
              </Text>
            </View>
            <Switch value={prefs.enabled && permission === "granted"} onValueChange={(v) => void enableMaster(v)} trackColor={{ true: theme.accent }} />
          </View>
          {permission === "denied" ? (
            <Pressable onPress={() => void openSystemNotificationSettings()} style={[styles.sysBtn, { borderColor: theme.border }]}>
              <Feather name="external-link" size={14} color={theme.accent} />
              <Text style={{ color: theme.accent, fontWeight: "700" }}>Open system notification settings</Text>
            </Pressable>
          ) : null}
        </Card>

        <Card>
          <Text style={[styles.cardLabel, { color: theme.text }]}>Categories</Text>
          {(
            [
              ["tasks", "Tasks", "Open personal and work tasks"],
              ["dueDates", "Due dates", "Due today / soon / overdue"],
              ["deadlines", "Deadlines", "Assignments, exams, applications"],
              ["calendar", "Calendar / events", "Upcoming events and reminders"],
              ["focus", "Focus sessions", "Session end and wrap-up"],
              ["important", "Important reminders", "High-priority items"],
            ] as const
          ).map(([key, label, hint], index, arr) => (
            <View key={key}>
              {index > 0 ? <View style={[styles.divider, { backgroundColor: theme.border }]} /> : null}
              <View style={styles.row}>
                <View style={styles.grow}>
                  <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
                  <Text style={{ color: theme.muted, fontSize: 12 }}>{hint}</Text>
                </View>
                <Switch
                  value={prefs[key]}
                  disabled={!prefs.enabled}
                  onValueChange={(v) => void patch({ [key]: v })}
                  trackColor={{ true: theme.accent }}
                />
              </View>
              {index === arr.length - 1 ? null : null}
            </View>
          ))}
        </Card>

        <Card>
          <Text style={[styles.cardLabel, { color: theme.text }]}>Remind me</Text>
          <Text style={{ color: theme.muted, fontSize: 12, marginBottom: 8 }}>
            LifeOS schedules at most a few reminders per item.
          </Text>
          {LEAD_OPTIONS.map((lead) => {
            const on = prefs.leads.includes(lead);
            return (
              <Pressable
                key={lead}
                disabled={!prefs.enabled}
                onPress={() => toggleLead(lead)}
                style={[
                  styles.leadChip,
                  {
                    borderColor: on ? theme.accent : theme.border,
                    backgroundColor: on ? theme.soft : theme.bg,
                    opacity: prefs.enabled ? 1 : 0.5,
                  },
                ]}
              >
                <Feather name={on ? "check-circle" : "circle"} size={16} color={on ? theme.accent : theme.muted} />
                <Text style={{ color: on ? theme.accent : theme.text, fontWeight: "700" }}>{LEAD_LABELS[lead]}</Text>
              </Pressable>
            );
          })}
        </Card>
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 16, paddingBottom: 40, gap: 14 },
  back: { flexDirection: "row", alignItems: "center", gap: 2, marginLeft: -4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48 },
  grow: { flex: 1, minWidth: 0 },
  label: { fontWeight: "800", fontSize: 15 },
  cardLabel: { fontWeight: "800", fontSize: 15, marginBottom: 8 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  sysBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 44,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  leadChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 44,
    marginBottom: 8,
  },
});
