import Feather from "@expo/vector-icons/Feather";
import * as WebBrowser from "expo-web-browser";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Card, Page, Subtitle, Title } from "../components/UI";
import { useFloatingTabBarContentPadding } from "../components/FloatingTabBar";
import { useLifeOS } from "../lib/LifeOSContext";
import { API_BASE } from "../lib/api";

// Deliberate simplification: Gmail / Outlook / iCloud calendar sync all rely
// on server-side OAuth flows (app/api/gmail/*, app/api/outlook/*,
// app/api/icloud/*) that expect a browser redirect back to
// https://lifeos-mu-three.vercel.app. Reimplementing three separate OAuth
// consent screens natively (with app-specific redirect URIs registered with
// Google/Microsoft/Apple) is out of scope for this pass, so mobile instead
// opens the already-working web flow in an in-app browser via
// expo-web-browser and lets the user finish connecting there. Once connected
// on web, the account's calendar/task sync operates through Firebase, so
// mobile picks up the synced data automatically — no separate mobile-side
// OAuth is required for the *data* to reach mobile, only for *initiating*
// the connection.
export function ConnectWebScreen() {
  const { theme } = useLifeOS();
  const tabBarPad = useFloatingTabBarContentPadding(28);
  const navigation = useNavigation<any>();

  const openSettings = () => WebBrowser.openBrowserAsync(`${API_BASE}/?view=Settings`);

  const items = [
    { icon: "mail" as const, title: "Gmail", body: "Sync your inbox summary into the Dashboard's Gmail card." },
    { icon: "calendar" as const, title: "Outlook Calendar", body: "Two-way sync with your Microsoft 365 calendar." },
    { icon: "cloud" as const, title: "iCloud Calendar", body: "Connect Apple Calendar via CalDAV credentials." },
  ];

  return (
    <Page>
      <ScrollView contentContainerStyle={[styles.screen, { paddingBottom: tabBarPad }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="chevron-left" size={22} color={theme.text} />
        </Pressable>
        <Title>Connect on web</Title>
        <Subtitle>These integrations use OAuth sign-in that only runs in a full browser. Connect them once on the web app — your mobile app reads the same synced data automatically.</Subtitle>
        {items.map((item) => (
          <Card key={item.title}>
            <View style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: theme.soft }]}>
                <Feather name={item.icon} size={18} color={theme.accent} />
              </View>
              <View style={styles.grow}>
                <Text style={[styles.itemTitle, { color: theme.text }]}>{item.title}</Text>
                <Text style={[styles.itemBody, { color: theme.muted }]}>{item.body}</Text>
              </View>
            </View>
          </Card>
        ))}
        <Pressable onPress={openSettings} style={[styles.cta, { backgroundColor: theme.text }]}>
          <Feather name="external-link" size={16} color={theme.surface} />
          <Text style={[styles.ctaText, { color: theme.surface }]}>Open LifeOS Settings on web</Text>
        </Pressable>
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 20, paddingBottom: 28, gap: 14 },
  backButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center", marginLeft: -8 },
  grow: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  itemTitle: { fontSize: 15, fontWeight: "800" },
  itemBody: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  cta: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", minHeight: 50, borderRadius: 14, marginTop: 6 },
  ctaText: { fontWeight: "800", fontSize: 14 },
});
