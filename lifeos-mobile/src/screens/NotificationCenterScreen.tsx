import Feather from "@expo/vector-icons/Feather";
import { useNavigation } from "@react-navigation/native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, Empty, Eyebrow, Page, Title } from "../components/UI";
import { useFloatingTabBarContentPadding } from "../components/FloatingTabBar";
import { useLifeOS } from "../lib/LifeOSContext";
import { buildInbox, navigateFromNotification, resolveNotificationPrefs } from "../lib/notifications";

export function NotificationCenterScreen() {
  const { theme, workspace } = useLifeOS();
  const tabBarPad = useFloatingTabBarContentPadding(28);
  const navigation = useNavigation<any>();
  const prefs = resolveNotificationPrefs(workspace.settings);
  const items = buildInbox(workspace);
  const today = items.filter((i) => i.bucket === "today");
  const upcoming = items.filter((i) => i.bucket === "upcoming");

  return (
    <Page>
      <ScrollView contentContainerStyle={[styles.screen, { paddingBottom: tabBarPad }]}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.back}>
            <Feather name="chevron-left" size={22} color={theme.accent} />
            <Text style={{ color: theme.accent, fontWeight: "700" }}>Life</Text>
          </Pressable>
          <Eyebrow>INBOX</Eyebrow>
          <Title>Notifications</Title>
          <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 18 }}>
            A light view of what needs attention — not another task list.
          </Text>
        </View>

        {!prefs.enabled ? (
          <Card>
            <Text style={{ color: theme.text, fontWeight: "800", marginBottom: 6 }}>Alerts are off</Text>
            <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 18, marginBottom: 12 }}>
              Turn on LifeOS notifications in Settings to get due dates, events, and focus alerts on this device.
            </Text>
            <Pressable
              onPress={() => navigation.navigate("NowTab", { screen: "Settings" })}
              style={[styles.linkBtn, { backgroundColor: theme.soft }]}
            >
              <Feather name="settings" size={16} color={theme.accent} />
              <Text style={{ color: theme.accent, fontWeight: "800" }}>Notification settings</Text>
            </Pressable>
          </Card>
        ) : null}

        <Text style={[styles.section, { color: theme.muted }]}>Today</Text>
        {today.length ? (
          today.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => navigateFromNotification(item.payload)}
              style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <View style={[styles.dot, { backgroundColor: theme.accent }]} />
              <View style={styles.grow}>
                <Text style={{ color: theme.text, fontWeight: "800" }}>{item.title}</Text>
                <Text style={{ color: theme.muted, fontSize: 13 }} numberOfLines={2}>
                  {item.subtitle}
                </Text>
              </View>
              <Text style={{ color: theme.muted, fontSize: 11, fontWeight: "700" }}>{item.whenLabel}</Text>
            </Pressable>
          ))
        ) : (
          <Empty title="Nothing urgent today." body="Due items and today’s events will show up here." />
        )}

        <Text style={[styles.section, { color: theme.muted, marginTop: 8 }]}>Upcoming</Text>
        {upcoming.length ? (
          upcoming.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => navigateFromNotification(item.payload)}
              style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <View style={[styles.dot, { backgroundColor: theme.blue }]} />
              <View style={styles.grow}>
                <Text style={{ color: theme.text, fontWeight: "800" }}>{item.title}</Text>
                <Text style={{ color: theme.muted, fontSize: 13 }} numberOfLines={2}>
                  {item.subtitle}
                </Text>
              </View>
              <Text style={{ color: theme.muted, fontSize: 11, fontWeight: "700" }}>{item.whenLabel}</Text>
            </Pressable>
          ))
        ) : (
          <Empty title="No upcoming alerts." body="This week’s deadlines and events appear here." />
        )}
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 16, paddingBottom: 40, gap: 10 },
  header: { gap: 4, marginBottom: 8 },
  back: { flexDirection: "row", alignItems: "center", gap: 2, marginLeft: -4, marginBottom: 4 },
  section: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase", marginTop: 6 },
  row: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  grow: { flex: 1, minWidth: 0, gap: 2 },
  linkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
});
