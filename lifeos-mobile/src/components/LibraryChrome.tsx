import { StyleSheet, Text, View } from "react-native";
import { useLifeOS } from "../lib/LifeOSContext";
import { LibrarySubNav, type LibraryTab } from "./LibrarySubNav";

/** Shared Library top chrome so Handwritten / Text / MindDump / Files keep the same header height. */
export function LibraryChrome({ active }: { active: LibraryTab }) {
  const { theme } = useLifeOS();
  return (
    <View style={styles.wrap}>
      <Text style={[styles.brand, { color: theme.text }]}>Library</Text>
      <LibrarySubNav active={active} compact />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingTop: 4, gap: 10 },
  brand: { fontSize: 28, fontWeight: "800", letterSpacing: -0.4 },
});
