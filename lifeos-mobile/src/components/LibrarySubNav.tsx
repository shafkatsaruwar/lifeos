import Feather from "@expo/vector-icons/Feather";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useLifeOS } from "../lib/LifeOSContext";

type Tab = "notebooks" | "notes" | "brain" | "resources";

const TABS: { key: Tab; label: string; icon: keyof typeof Feather.glyphMap; route: string }[] = [
  { key: "notebooks", label: "Notebooks", icon: "book", route: "NotebooksList" },
  { key: "notes", label: "Notes", icon: "file-text", route: "NotesList" },
  { key: "brain", label: "Brain", icon: "zap", route: "Brain" },
  { key: "resources", label: "Files", icon: "paperclip", route: "Resources" },
];

export function LibrarySubNav({ active }: { active: Tab }) {
  const { theme } = useLifeOS();
  const navigation = useNavigation<any>();

  return (
    <View style={styles.subNav}>
      {TABS.map((tab) => {
        const on = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            onPress={() => {
              if (!on) navigation.navigate(tab.route);
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
  subNav: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 20, marginTop: 14 },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  pillActive: { borderWidth: 1.5 },
  text: { fontSize: 12, fontWeight: "800" },
});
