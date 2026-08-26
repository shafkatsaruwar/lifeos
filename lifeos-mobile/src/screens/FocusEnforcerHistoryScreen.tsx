import Feather from "@expo/vector-icons/Feather";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, Page, Title } from "../components/UI";
import { useFloatingTabBarContentPadding } from "../components/FloatingTabBar";
import { useLifeOS } from "../lib/LifeOSContext";
import {
  computeFocusEnforcerMetrics,
  sessionsInLastDays,
  subscribeFocusEnforcerSessions,
  type FocusEnforcerSession,
} from "../lib/focusEnforcer";

export function FocusEnforcerHistoryScreen() {
  const { user, theme } = useLifeOS();
  const tabBarPad = useFloatingTabBarContentPadding(28);
  const navigation = useNavigation<any>();
  const [sessions, setSessions] = useState<FocusEnforcerSession[]>([]);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeFocusEnforcerSessions(user.uid, setSessions);
  }, [user?.uid]);

  const windowed = useMemo(() => sessionsInLastDays(sessions, 30), [sessions]);
  const metrics = useMemo(() => computeFocusEnforcerMetrics(sessions, 30), [sessions]);
  const sorted = useMemo(
    () =>
      [...windowed].sort(
        (a, b) => new Date(b.scheduledStartAt).getTime() - new Date(a.scheduledStartAt).getTime(),
      ),
    [windowed],
  );

  return (
    <Page>
      <ScrollView contentContainerStyle={[styles.screen, { paddingBottom: tabBarPad }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.back}>
          <Feather name="chevron-left" size={22} color={theme.accent} />
          <Text style={{ color: theme.accent, fontWeight: "700" }}>Settings</Text>
        </Pressable>
        <Title>Focus history</Title>
        <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 18 }}>
          Last 30 days. Primary metric is on-time starts among all planned sessions (never-started counts against you).
        </Text>

        <Card>
          <Text style={[styles.metricPrimary, { color: theme.text }]}>
            {metrics.onTimePlannedPercent}%
          </Text>
          <Text style={{ color: theme.text, fontWeight: "800", fontSize: 15 }}>
            On-time planned
          </Text>
          <Text style={{ color: theme.muted, fontSize: 12, marginTop: 4 }}>
            Started within 2 min of schedule ÷ all planned
          </Text>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Text style={[styles.metricSecondary, { color: theme.text }]}>
            {metrics.onTimeAmongStartedPercent}% among started
          </Text>
          <Text style={{ color: theme.muted, fontSize: 12 }}>
            {metrics.planned} planned · {metrics.started} started · {metrics.completed} completed
          </Text>
          <Text style={{ color: theme.muted, fontSize: 12 }}>
            Avg delay {metrics.averageStartDelayMin} min · checks {metrics.checksPassed} pass /{" "}
            {metrics.checksFailed} fail · recoveries {metrics.distractionRecoveries}
          </Text>
          <Text style={{ color: theme.muted, fontSize: 12 }}>
            Verified focus {metrics.verifiedFocusPercent}% · overrides {metrics.manualOverrideCount}
          </Text>
        </Card>

        {sorted.length === 0 ? (
          <Card>
            <Text style={{ color: theme.muted }}>No Focus Enforcer sessions in the last 30 days.</Text>
          </Card>
        ) : (
          sorted.map((session) => (
            <Pressable
              key={session.id}
              onPress={() => navigation.navigate("FocusEnforcerSession", { sessionId: session.id })}
              style={[styles.rowCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <View style={styles.grow}>
                <Text style={{ color: theme.text, fontWeight: "800" }} numberOfLines={1}>
                  {session.taskTitle}
                </Text>
                <Text style={{ color: theme.muted, fontSize: 12 }}>
                  {new Date(session.scheduledStartAt).toLocaleString()} · {session.status}
                  {session.startDelayMin != null ? ` · +${session.startDelayMin}m` : ""}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={theme.muted} />
            </Pressable>
          ))
        )}
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 20, paddingBottom: 40, gap: 14 },
  back: { flexDirection: "row", alignItems: "center", gap: 2, alignSelf: "flex-start" },
  metricPrimary: { fontSize: 48, fontWeight: "700", letterSpacing: -1.5, lineHeight: 52 },
  metricSecondary: { fontSize: 18, fontWeight: "800", marginBottom: 6 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 12 },
  rowCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  grow: { flex: 1, gap: 2 },
});
