import Feather from "@expo/vector-icons/Feather";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLifeOS } from "../../lib/LifeOSContext";
import { mos } from "../../lib/masteros/ui";

const NAV: { key: string; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: "hub", label: "Home", icon: "home" },
  { key: "students", label: "Students", icon: "users" },
  { key: "courses", label: "Courses", icon: "book" },
  { key: "lessons", label: "Lessons", icon: "layers" },
  { key: "assignments", label: "Assignments", icon: "clipboard" },
  { key: "bank", label: "Bank", icon: "archive" },
];

export function MasterOSShell({
  active,
  onNavigate,
  onClose,
  children,
  hideChrome,
}: {
  active: string;
  onNavigate: (key: string) => void;
  onClose: () => void;
  children: React.ReactNode;
  hideChrome?: boolean;
}) {
  const { theme } = useLifeOS();
  const insets = useSafeAreaInsets();

  if (hideChrome) {
    return <View style={[styles.fill, { backgroundColor: theme.bg, paddingTop: insets.top }]}>{children}</View>;
  }

  return (
    <View style={[styles.fill, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
      <View style={styles.row}>
        <View style={[styles.sidebar, { borderRightColor: theme.border, backgroundColor: theme.surface, paddingBottom: insets.bottom + 12 }]}>
          <Text style={[styles.eyebrow, { color: theme.muted }]}>MASTEROS</Text>
          <Text style={[styles.brand, { color: theme.text }]}>Classroom</Text>
          {NAV.map((item) => {
            const on = item.key === active;
            return (
              <Pressable
                key={item.key}
                onPress={() => onNavigate(item.key)}
                style={[styles.navItem, on && { backgroundColor: theme.soft }]}
              >
                <Feather name={item.icon} size={15} color={on ? theme.accent : theme.muted} />
                <Text style={{ color: on ? theme.accent : theme.muted, fontWeight: on ? "800" : "600", fontSize: 12 }}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
          <View style={{ flex: 1 }} />
          <Pressable onPress={onClose} style={styles.navItem}>
            <Feather name="arrow-left" size={15} color={theme.muted} />
            <Text style={{ color: theme.muted, fontWeight: "700", fontSize: 12 }}>LifeOS</Text>
          </Pressable>
        </View>
        <View style={styles.main}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  row: { flex: 1, flexDirection: "row" },
  sidebar: {
    width: mos.sidebarWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingTop: 12,
  },
  eyebrow: { fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  brand: { fontSize: 15, fontWeight: "800", marginTop: 4, marginBottom: 12 },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 2,
  },
  main: { flex: 1, minWidth: 0 },
});
