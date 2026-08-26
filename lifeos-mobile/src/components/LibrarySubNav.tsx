import Feather from "@expo/vector-icons/Feather";
import { StackActions, useNavigation } from "@react-navigation/native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLifeOS } from "../lib/LifeOSContext";

export type LibraryTab = "handwritten" | "text" | "brain" | "resources";

const TABS: {
  key: LibraryTab;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  route: string;
}[] = [
  { key: "handwritten", label: "Handwritten", icon: "edit-3", route: "NotebooksList" },
  { key: "text", label: "Text", icon: "type", route: "NotesList" },
  { key: "brain", label: "MindDump", icon: "mic", route: "Brain" },
  { key: "resources", label: "Files", icon: "paperclip", route: "Resources" },
];

/** Peer Library sections — swap with fade instead of stacking push slides. */
export function useLibrarySectionNavigate() {
  const navigation = useNavigation<any>();
  return (route: string) => {
    const state = navigation.getState?.();
    const current = state?.routes?.[state.index ?? 0]?.name;
    if (current === route) return;
    navigation.dispatch(StackActions.replace(route));
  };
}

export function LibrarySubNav({ active, compact = false }: { active: LibraryTab; compact?: boolean }) {
  const { theme } = useLifeOS();
  const go = useLibrarySectionNavigate();

  return (
    <View style={[styles.subNav, compact ? styles.subNavCompact : styles.subNavPage]}>
      {TABS.map((tab) => {
        const on = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            onPress={() => {
              if (!on) go(tab.route);
            }}
            style={[
              styles.pill,
              {
                borderColor: on ? theme.accent : theme.border,
                backgroundColor: on ? theme.soft : "transparent",
              },
              on && styles.pillActive,
            ]}
          >
            <Feather name={tab.icon} size={13} color={on ? theme.accent : theme.muted} />
            <Text style={[styles.text, { color: on ? theme.accent : theme.text }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  subNav: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  subNavPage: { paddingHorizontal: 20, marginTop: 14 },
  subNavCompact: { paddingHorizontal: 6, marginTop: 2 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
  },
  pillActive: { borderWidth: 1.5 },
  text: { fontSize: 12, fontWeight: "800" },
});
