import Feather from "@expo/vector-icons/Feather";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLifeOS } from "../lib/LifeOSContext";
import { useLayout } from "../lib/layout";

export function Page({
  children,
  edges = ["top"] as ("top" | "bottom" | "left" | "right")[],
  /** Skip the iPad reading-width cap — used by the notebook writing surface. */
  fullBleed = false,
}: {
  children: React.ReactNode;
  edges?: ("top" | "bottom" | "left" | "right")[];
  fullBleed?: boolean;
}) {
  const { theme } = useLifeOS();
  const { contentMaxWidth } = useLayout();
  const capped = !fullBleed && contentMaxWidth ? { maxWidth: contentMaxWidth, width: "100%" as const, alignSelf: "center" as const } : null;
  return (
    <SafeAreaView style={[styles.page, { backgroundColor: theme.bg }]} edges={edges}>
      <View style={[styles.pageInner, capped]}>{children}</View>
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  const { theme, workspace } = useLifeOS();
  const compact = Boolean(workspace.settings.compactMode);
  return (
    <View
      style={[
        styles.card,
        compact && styles.cardCompact,
        { backgroundColor: theme.surface, borderColor: theme.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function ActionButton({
  label,
  icon,
  onPress,
  quiet = false,
  danger = false,
  disabled = false,
}: {
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  onPress: () => void;
  quiet?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  const { theme } = useLifeOS();
  const bg = danger ? theme.danger : quiet ? theme.surface : theme.text;
  const fg = quiet && !danger ? theme.text : theme.surface;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.action,
        { backgroundColor: bg, borderColor: quiet && !danger ? theme.border : bg, opacity: disabled ? 0.5 : pressed ? 0.75 : 1 },
      ]}
    >
      {icon ? <Feather name={icon} size={16} color={fg} /> : null}
      <Text style={[styles.actionText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label, size = 20 }: { icon: keyof typeof Feather.glyphMap; onPress: () => void; label: string; size?: number }) {
  const { theme } = useLifeOS();
  return (
    <Pressable accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.iconButton, { backgroundColor: theme.soft, opacity: pressed ? 0.7 : 1 }]}>
      <Feather name={icon} size={size} color={theme.accent} />
    </Pressable>
  );
}

export function Empty({ title, body }: { title: string; body: string }) {
  const { theme } = useLifeOS();
  return (
    <View style={styles.empty}>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.emptyBody, { color: theme.muted }]}>{body}</Text>
    </View>
  );
}

export function Pill({ label, color }: { label: string; color?: string }) {
  const { theme } = useLifeOS();
  const tint = color || theme.accent;
  return (
    <View style={[styles.pill, { backgroundColor: `${tint}20` }]}>
      <View style={[styles.pillDot, { backgroundColor: tint }]} />
      <Text style={[styles.pillText, { color: tint }]}>{label}</Text>
    </View>
  );
}

export function SectionTitle({ children, style }: { children: React.ReactNode; style?: object }) {
  const { theme } = useLifeOS();
  return <Text style={[styles.sectionTitle, { color: theme.text }, style]}>{children}</Text>;
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  const { theme } = useLifeOS();
  return <Text style={[styles.eyebrow, { color: theme.muted }]}>{children}</Text>;
}

export function Title({ children }: { children: React.ReactNode }) {
  const { theme } = useLifeOS();
  return <Text style={[styles.title, { color: theme.text }]}>{children}</Text>;
}

export function Subtitle({ children }: { children: React.ReactNode }) {
  const { theme } = useLifeOS();
  return <Text style={[styles.subtitle, { color: theme.muted }]}>{children}</Text>;
}

export function SegmentedControl<T extends string>({ value, options, onChange }: { value: T; options: { key: T; label: string; icon?: keyof typeof Feather.glyphMap }[]; onChange: (value: T) => void }) {
  const { theme } = useLifeOS();
  return (
    <View style={[styles.segment, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      {options.map((option) => {
        const active = option.key === value;
        return (
          <Pressable key={option.key} onPress={() => onChange(option.key)} style={[styles.segmentItem, active && { backgroundColor: theme.text }]}>
            {option.icon ? <Feather name={option.icon} size={13} color={active ? theme.surface : theme.muted} /> : null}
            <Text style={[styles.segmentText, { color: active ? theme.surface : theme.muted }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  pageInner: { flex: 1, width: "100%" },
  card: { borderWidth: 1, borderRadius: 20, padding: 18, gap: 12 },
  cardCompact: { borderRadius: 16, padding: 14, gap: 8 },
  action: { minHeight: 44, paddingHorizontal: 15, borderRadius: 12, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  actionText: { fontSize: 14, fontWeight: "800" },
  iconButton: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 24, paddingHorizontal: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "800", textAlign: "center" },
  emptyBody: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, alignSelf: "flex-start" },
  pillDot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { fontSize: 12, fontWeight: "800" },
  sectionTitle: { fontSize: 20, fontWeight: "800", marginTop: 8 },
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  title: { fontSize: 34, lineHeight: 39, fontWeight: "700", letterSpacing: -1.1 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  segment: { flexDirection: "row", borderWidth: 1, borderRadius: 12, padding: 3, gap: 3 },
  segmentItem: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, borderRadius: 9 },
  segmentText: { fontSize: 12, fontWeight: "800" },
});
