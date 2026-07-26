import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { signOut } from "firebase/auth";
import { ActionButton, Card, Eyebrow, Page, SegmentedControl, Title } from "../components/UI";
import { useLifeOS } from "../lib/LifeOSContext";
import { auth } from "../lib/firebase";
import type { EnergyLevel, ThemeMode } from "../types";

export function SettingsScreen() {
  const { user, workspace, theme, dark, updateSettings, sync } = useLifeOS();
  const [name, setName] = useState(workspace.settings.preferredName ?? "");
  const themeMode = workspace.settings.themeMode ?? "system";

  const saveName = () => updateSettings({ ...workspace.settings, preferredName: name.trim() || undefined });

  return (
    <Page>
      <ScrollView contentContainerStyle={styles.screen}>
        <Eyebrow>YOUR LIFEOS</Eyebrow>
        <Title>Settings</Title>

        <Card>
          <Text style={[styles.cardLabel, { color: theme.text }]}>Profile</Text>
          <Text style={{ color: theme.muted, fontSize: 13 }}>{user.email}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            onBlur={saveName}
            placeholder="What should we call you?"
            placeholderTextColor={theme.muted}
            style={[styles.input, { color: theme.text, borderColor: theme.border, marginTop: 12 }]}
          />
        </Card>

        <Card>
          <View style={styles.settingRow}>
            <View style={styles.grow}>
              <Text style={{ color: theme.text, fontWeight: "800" }}>Match device theme</Text>
              <Text style={{ color: theme.muted, fontSize: 12 }}>LifeOS follows your phone's appearance.</Text>
            </View>
            <Switch
              value={themeMode === "system"}
              onValueChange={(matchesDevice) =>
                updateSettings({ ...workspace.settings, themeMode: matchesDevice ? "system" : dark ? "dark" : "light" })
              }
              trackColor={{ true: theme.accent }}
            />
          </View>
          {themeMode !== "system" ? (
            <View style={styles.appearanceChoice}>
              <Text style={[styles.choiceLabel, { color: theme.text }]}>Appearance</Text>
              <SegmentedControl
                value={themeMode}
                onChange={(value) => updateSettings({ ...workspace.settings, themeMode: value as ThemeMode })}
                options={[{ key: "light", label: "Light" }, { key: "dark", label: "Dark" }]}
              />
            </View>
          ) : null}
        </Card>

        <Card>
          <Text style={[styles.cardLabel, { color: theme.text }]}>Focus defaults</Text>
          <Text style={{ color: theme.muted, fontSize: 12, marginBottom: 8 }}>Used when converting ambient activity or AI tasks into full tasks.</Text>
          <Text style={{ color: theme.text, fontSize: 12, fontWeight: "700", marginBottom: 6 }}>Default energy</Text>
          <SegmentedControl
            value={(workspace.settings.defaultEnergy ?? "Medium") as EnergyLevel}
            onChange={(v) => updateSettings({ ...workspace.settings, defaultEnergy: v })}
            options={[{ key: "Low", label: "Low" }, { key: "Medium", label: "Medium" }, { key: "High", label: "High" }]}
          />
          <Text style={{ color: theme.text, fontSize: 12, fontWeight: "700", marginTop: 12, marginBottom: 6 }}>Default focus minutes</Text>
          <TextInput
            value={String(workspace.settings.defaultFocusMinutes ?? 45)}
            onChangeText={(v) => updateSettings({ ...workspace.settings, defaultFocusMinutes: Number(v.replace(/\D/g, "")) || 30 })}
            keyboardType="number-pad"
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          />
        </Card>

        <Card>
          <View style={styles.settingRow}>
            <View style={styles.grow}>
              <Text style={{ color: theme.text, fontWeight: "800" }}>Week starts Monday</Text>
              <Text style={{ color: theme.muted, fontSize: 12 }}>Applies to the Calendar month grid.</Text>
            </View>
            <Switch
              value={Boolean(workspace.settings.weekStartsMonday)}
              onValueChange={(v) => updateSettings({ ...workspace.settings, weekStartsMonday: v })}
              trackColor={{ true: theme.accent }}
            />
          </View>
        </Card>

        <Card>
          <Text style={[styles.cardLabel, { color: theme.text }]}>Data</Text>
          <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 18 }}>
            Your mobile app reads and updates the exact same private Firebase data as LifeOS on the web (
            <Text style={{ color: theme.accent }}>lifeos-mu-three.vercel.app</Text>).
          </Text>
          <View style={[styles.row, { marginTop: 14 }]}>
            <ActionButton label="Sync now" icon="refresh-cw" quiet onPress={sync} />
            <ActionButton label="Sign out" icon="log-out" quiet danger onPress={() => signOut(auth)} />
          </View>
        </Card>
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 20, paddingBottom: 110, gap: 16 },
  cardLabel: { fontSize: 16, fontWeight: "800" },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 15 },
  settingRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  appearanceChoice: { marginTop: 14, gap: 7 },
  choiceLabel: { fontSize: 12, fontWeight: "700" },
  grow: { flex: 1 },
  row: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
});
