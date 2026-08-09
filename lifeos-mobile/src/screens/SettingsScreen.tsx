import Feather from "@expo/vector-icons/Feather";
import { useNavigation } from "@react-navigation/native";
import * as WebBrowser from "expo-web-browser";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { signOut } from "firebase/auth";
import { ActionButton, Card, Eyebrow, Page, SegmentedControl, Title } from "../components/UI";
import { useLifeOS } from "../lib/LifeOSContext";
import { API_BASE } from "../lib/api";
import { auth } from "../lib/firebase";
import { resolveNotificationPrefs } from "../lib/notifications";
import { mergeSynapseCalendarEvents, parseSynapseDayPlan } from "../lib/synapseImport";
import { SPACE_COLORS } from "../lib/theme";
import type { EnergyLevel, ThemeMode } from "../types";

export function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { user, workspace, theme, dark, updateSettings, updateCalendar, sync, startOnboardingReplay } = useLifeOS();
  const notifPrefs = resolveNotificationPrefs(workspace.settings);
  const [name, setName] = useState(workspace.settings.preferredName ?? "");
  const [synapsePaste, setSynapsePaste] = useState("");
  const [synapseBusy, setSynapseBusy] = useState(false);
  const themeMode = workspace.settings.themeMode ?? "system";
  const accent = workspace.settings.accent?.trim() || theme.accent;
  const synapseEventCount = workspace.calendar.filter((event) => event.id.startsWith("synapse-")).length;

  const importSynapsePlan = () => {
    setSynapseBusy(true);
    try {
      const events = parseSynapseDayPlan(synapsePaste);
      if (!events.length) {
        Alert.alert("Synapse", "No Synapse events found in that paste.");
        return;
      }
      const merged = mergeSynapseCalendarEvents(workspace.calendar, events);
      void updateCalendar(merged as typeof workspace.calendar);
      setSynapsePaste("");
      Alert.alert(
        "Imported",
        `${events.length} Synapse event${events.length === 1 ? "" : "s"} added. Previous Synapse events were replaced.`,
      );
    } catch (error) {
      Alert.alert("Synapse import", error instanceof Error ? error.message : "Could not import day plan.");
    } finally {
      setSynapseBusy(false);
    }
  };
  const accentOptions = useMemo(() => {
    const normalized = accent.toLowerCase();
    if (SPACE_COLORS.some((color) => color.toLowerCase() === normalized)) return [...SPACE_COLORS];
    return [accent, ...SPACE_COLORS];
  }, [accent]);

  const saveName = () => updateSettings({ ...workspace.settings, preferredName: name.trim() || undefined });
  const patchSettings = (patch: Partial<typeof workspace.settings>) =>
    updateSettings({ ...workspace.settings, ...patch });

  return (
    <Page>
      <ScrollView contentContainerStyle={[styles.screen, workspace.settings.compactMode && styles.screenCompact]}>
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
          <View style={styles.sectionHead}>
            <View style={[styles.sectionIcon, { backgroundColor: theme.soft }]}>
              <Feather name="sliders" size={14} color={theme.accent} />
            </View>
            <Text style={[styles.cardLabel, { color: theme.text }]}>Appearance</Text>
          </View>

          <View style={styles.themeRow}>
            <ThemeChoice
              label="Light"
              icon="sun"
              selected={themeMode === "light" || (themeMode === "system" && !dark)}
              activeColor={theme.accent}
              onPress={() => patchSettings({ themeMode: "light" as ThemeMode })}
              theme={theme}
            />
            <ThemeChoice
              label="Dark"
              icon="moon"
              selected={themeMode === "dark" || (themeMode === "system" && dark)}
              activeColor={theme.accent}
              onPress={() => patchSettings({ themeMode: "dark" as ThemeMode })}
              theme={theme}
            />
          </View>

          <Pressable
            onPress={() => patchSettings({ themeMode: "system" })}
            style={[
              styles.deviceRow,
              {
                borderColor: themeMode === "system" ? theme.accent : theme.border,
                backgroundColor: themeMode === "system" ? theme.soft : theme.bg,
              },
            ]}
          >
            <Feather name="smartphone" size={15} color={themeMode === "system" ? theme.accent : theme.muted} />
            <Text style={{ color: themeMode === "system" ? theme.accent : theme.text, fontWeight: "700", fontSize: 13, flex: 1 }}>
              Match device
            </Text>
            {themeMode === "system" ? <Feather name="check" size={16} color={theme.accent} /> : null}
          </Pressable>

          <Text style={[styles.swatchLabel, { color: theme.muted }]}>Accent color</Text>
          <View style={styles.swatchGrid}>
            {accentOptions.map((color) => {
              const selected = color.toLowerCase() === accent.toLowerCase();
              return (
                <Pressable
                  key={color}
                  accessibilityLabel={`Accent ${color}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => patchSettings({ accent: color })}
                  style={[
                    styles.swatch,
                    { backgroundColor: color },
                    selected && { borderColor: theme.text, borderWidth: 3 },
                  ]}
                />
              );
            })}
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.settingRow}>
            <View style={styles.grow}>
              <Text style={{ color: theme.text, fontWeight: "800" }}>Compact mode</Text>
              <Text style={{ color: theme.muted, fontSize: 12 }}>Tighten spacing when you want more on screen.</Text>
            </View>
            <Switch
              value={Boolean(workspace.settings.compactMode)}
              onValueChange={(value) => patchSettings({ compactMode: value })}
              trackColor={{ true: theme.accent }}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.settingRow}>
            <View style={styles.grow}>
              <Text style={{ color: theme.text, fontWeight: "800" }}>Reduce motion</Text>
              <Text style={{ color: theme.muted, fontSize: 12 }}>Calmer transitions for lower sensory load.</Text>
            </View>
            <Switch
              value={Boolean(workspace.settings.reduceMotion)}
              onValueChange={(value) => patchSettings({ reduceMotion: value })}
              trackColor={{ true: theme.accent }}
            />
          </View>
        </Card>

        <Card>
          <Text style={[styles.cardLabel, { color: theme.text }]}>Focus defaults</Text>
          <Text style={{ color: theme.muted, fontSize: 12, marginBottom: 8 }}>Used when converting ambient activity or AI tasks into full tasks.</Text>
          <Text style={{ color: theme.text, fontSize: 12, fontWeight: "700", marginBottom: 6 }}>Default energy</Text>
          <SegmentedControl
            value={(workspace.settings.defaultEnergy ?? "Medium") as EnergyLevel}
            onChange={(v) => patchSettings({ defaultEnergy: v })}
            options={[{ key: "Low", label: "Low" }, { key: "Medium", label: "Medium" }, { key: "High", label: "High" }]}
          />
          <Text style={{ color: theme.text, fontSize: 12, fontWeight: "700", marginTop: 12, marginBottom: 6 }}>Default focus minutes</Text>
          <TextInput
            value={String(workspace.settings.defaultFocusMinutes ?? 45)}
            onChangeText={(v) => patchSettings({ defaultFocusMinutes: Number(v.replace(/\D/g, "")) || 30 })}
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
              onValueChange={(v) => patchSettings({ weekStartsMonday: v })}
              trackColor={{ true: theme.accent }}
            />
          </View>
        </Card>

        <Card>
          <View style={styles.sectionHead}>
            <View style={[styles.sectionIcon, { backgroundColor: theme.soft }]}>
              <Feather name="bell" size={14} color={theme.accent} />
            </View>
            <Text style={[styles.cardLabel, { color: theme.text }]}>Notifications</Text>
          </View>
          <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 18 }}>
            Due dates, deadlines, calendar, and focus — without spam.
          </Text>
          <Pressable
            onPress={() => navigation.navigate("NotificationSettings")}
            style={[styles.notifRow, { borderColor: theme.border, backgroundColor: theme.bg }]}
          >
            <View style={styles.grow}>
              <Text style={{ color: theme.text, fontWeight: "800" }}>
                {notifPrefs.enabled ? "Alerts on" : "Alerts off"}
              </Text>
              <Text style={{ color: theme.muted, fontSize: 12 }}>Categories, timing, and system permission</Text>
            </View>
            <Feather name="chevron-right" size={18} color={theme.muted} />
          </Pressable>
        </Card>

        <Card>
          <View style={styles.sectionHead}>
            <View style={[styles.sectionIcon, { backgroundColor: theme.soft }]}>
              <Feather name="heart" size={14} color={theme.accent} />
            </View>
            <Text style={[styles.cardLabel, { color: theme.text }]}>Synapse</Text>
          </View>
          <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 18 }}>
            Import upcoming medications and appointments from Synapse so they show on Today&apos;s schedule. Re-import replaces earlier Synapse events.
          </Text>
          <Text style={{ color: theme.muted, fontSize: 12, marginTop: 8 }}>
            {synapseEventCount
              ? `${synapseEventCount} Synapse event${synapseEventCount === 1 ? "" : "s"} on your calendar`
              : "No Synapse events yet"}
          </Text>
          <TextInput
            value={synapsePaste}
            onChangeText={setSynapsePaste}
            placeholder='Paste Synapse day-plan JSON {"v":1,"events":[...]}'
            placeholderTextColor={theme.muted}
            multiline
            style={[
              styles.input,
              {
                color: theme.text,
                borderColor: theme.border,
                marginTop: 12,
                minHeight: 96,
                paddingTop: 10,
                textAlignVertical: "top",
              },
            ]}
          />
          <View style={[styles.row, { marginTop: 12 }]}>
            <ActionButton
              label={synapseBusy ? "Importing…" : "Import Synapse plan"}
              icon="download"
              quiet
              onPress={importSynapsePlan}
            />
          </View>
        </Card>

        <Card>
          <View style={styles.sectionHead}>
            <View style={[styles.sectionIcon, { backgroundColor: theme.soft }]}>
              <Feather name="layers" size={14} color={theme.accent} />
            </View>
            <Text style={[styles.cardLabel, { color: theme.text }]}>Environments</Text>
          </View>
          <Text style={{ color: theme.muted, fontSize: 12, marginBottom: 8 }}>
            Show or hide Life, School, and Work tabs. Data stays in sync with the web app.
          </Text>
          <View style={styles.settingRow}>
            <View style={styles.grow}>
              <Text style={{ color: theme.text, fontWeight: "800" }}>Life</Text>
            </View>
            <Switch
              value={workspace.settings.enableLifeOS !== false}
              onValueChange={(value) => patchSettings({ enableLifeOS: value })}
              trackColor={{ true: theme.accent }}
            />
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.settingRow}>
            <View style={styles.grow}>
              <Text style={{ color: theme.text, fontWeight: "800" }}>School</Text>
            </View>
            <Switch
              value={workspace.settings.enableSchoolOS !== false}
              onValueChange={(value) => patchSettings({ enableSchoolOS: value })}
              trackColor={{ true: theme.accent }}
            />
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.settingRow}>
            <View style={styles.grow}>
              <Text style={{ color: theme.text, fontWeight: "800" }}>Work</Text>
              <Text style={{ color: theme.muted, fontSize: 12 }}>Show the Work tab and hub</Text>
            </View>
            <Switch
              value={workspace.settings.enableWorkOS !== false}
              onValueChange={(value) => patchSettings({ enableWorkOS: value })}
              trackColor={{ true: theme.accent }}
            />
          </View>
        </Card>

        <Card>
          <View style={styles.sectionHead}>
            <View style={[styles.sectionIcon, { backgroundColor: theme.soft }]}>
              <Feather name="map" size={14} color={theme.accent} />
            </View>
            <Text style={[styles.cardLabel, { color: theme.text }]}>Intro</Text>
          </View>
          <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 18 }}>
            Replay the short first-run walkthrough — name, spaces, and a first move.
          </Text>
          <View style={{ marginTop: 14 }}>
            <ActionButton
              label="Show intro again"
              icon="play"
              quiet
              onPress={() => {
                // Local replay flag — do not rely on clearing Firebase settings
                // (silent sync was restoring onboardingCompletedAt and killing the flow).
                startOnboardingReplay();
              }}
            />
          </View>
        </Card>

        <Card>
          <View style={styles.sectionHead}>
            <View style={[styles.sectionIcon, { backgroundColor: theme.soft }]}>
              <Feather name="archive" size={14} color={theme.accent} />
            </View>
            <Text style={[styles.cardLabel, { color: theme.text }]}>Archives</Text>
          </View>
          <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 18 }}>
            Done and canceled tasks are kept in Settings → Archives on the web. Go to the web to see archived tasks.
          </Text>
          <View style={{ marginTop: 14 }}>
            <ActionButton
              label="Open archives on web"
              icon="external-link"
              quiet
              onPress={() => WebBrowser.openBrowserAsync(`${API_BASE}/?view=Settings`)}
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

function ThemeChoice({
  label,
  icon,
  selected,
  activeColor,
  onPress,
  theme,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  selected: boolean;
  activeColor: string;
  onPress: () => void;
  theme: { text: string; muted: string; border: string; surface: string; soft: string };
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.themeChoice,
        {
          borderColor: selected ? activeColor : theme.border,
          backgroundColor: selected ? `${activeColor}18` : theme.surface,
        },
      ]}
    >
      <Feather name={icon} size={16} color={selected ? activeColor : theme.muted} />
      <Text style={{ color: selected ? activeColor : theme.text, fontWeight: "800", fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 20, paddingBottom: 28, gap: 16 },
  screenCompact: { padding: 14, gap: 12 },
  cardLabel: { fontSize: 16, fontWeight: "800" },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  sectionIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  notifRow: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  themeRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  themeChoice: {
    flex: 1,
    minHeight: 52,
    borderWidth: 1.5,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  deviceRow: {
    marginTop: 10,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  swatchLabel: { fontSize: 12, fontWeight: "700", marginTop: 14, marginBottom: 8 },
  swatchGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: "transparent" },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 14 },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 15 },
  settingRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  grow: { flex: 1 },
  row: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
});
