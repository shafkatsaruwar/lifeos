import Feather from "@expo/vector-icons/Feather";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLifeOS } from "../lib/LifeOSContext";

export function DashboardModule({
  icon,
  title,
  action,
  onAction,
  children,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  const { theme } = useLifeOS();
  return (
    <View style={styles.module}>
      <View style={[styles.band, { backgroundColor: theme.highlight }]}>
        <Feather name={icon} size={16} color={theme.text} />
        <Text style={[styles.bandTitle, { color: theme.text }]}>{title}</Text>
        {action && onAction ? (
          <Pressable onPress={onAction} style={styles.bandAction}>
            <Text style={[styles.bandActionText, { color: theme.accent }]}>{action}</Text>
            <Feather name="chevron-right" size={15} color={theme.accent} />
          </Pressable>
        ) : null}
      </View>
      <View style={[styles.moduleBody, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {children}
      </View>
    </View>
  );
}

export function QuickAction({
  icon,
  label,
  onPress,
  color,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
}) {
  const { theme } = useLifeOS();
  const tint = color ?? theme.accent;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAction,
        { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.65 : 1 },
      ]}
    >
      <Feather name={icon} size={20} color={tint} />
      <Text
        style={[styles.quickLabel, { color: theme.text }]}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.76}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function DashboardRow({
  icon,
  title,
  meta,
  onPress,
  color,
  trailing,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  meta?: string;
  onPress?: () => void;
  color?: string;
  trailing?: React.ReactNode;
}) {
  const { theme } = useLifeOS();
  const tint = color ?? theme.accent;
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.dataRow, { opacity: pressed ? 0.65 : 1 }]}
    >
      <View style={styles.dataIcon}>
        <Feather name={icon} size={20} color={tint} />
      </View>
      <View style={styles.grow}>
        <Text style={[styles.dataTitle, { color: theme.text }]} numberOfLines={1}>{title}</Text>
        {meta ? <Text style={[styles.dataMeta, { color: theme.muted }]} numberOfLines={1}>{meta}</Text> : null}
      </View>
      {trailing ?? (onPress ? <Feather name="chevron-right" size={15} color={theme.muted} /> : null)}
    </Pressable>
  );
}

export function ProgressBar({ label, value, color }: { label: string; value: number; color?: string }) {
  const { theme } = useLifeOS();
  const tint = color ?? theme.accent;
  const normalized = Math.max(0, Math.min(1, value));
  return (
    <View style={styles.progressRow}>
      <View style={styles.progressLabelRow}>
        <Text style={[styles.progressLabel, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.progressValue, { color: theme.muted }]}>{Math.round(normalized * 100)}%</Text>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
        <View style={[styles.progressFill, { backgroundColor: tint, width: `${normalized * 100}%` }]} />
      </View>
    </View>
  );
}

export function ModuleEmpty({ text }: { text: string }) {
  const { theme } = useLifeOS();
  return (
    <View style={styles.empty}>
      <Text style={[styles.emptyText, { color: theme.muted }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  module: { gap: 8 },
  band: { minHeight: 50, borderRadius: 8, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 9 },
  bandTitle: { fontSize: 16, fontWeight: "800", flex: 1 },
  bandAction: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 2, marginRight: -6, paddingHorizontal: 6 },
  bandActionText: { fontSize: 12, fontWeight: "800" },
  moduleBody: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  quickAction: {
    width: 72,
    minHeight: 64,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    justifyContent: "flex-start",
    gap: 6,
  },
  quickLabel: { fontSize: 11, lineHeight: 14, fontWeight: "800" },
  dataRow: { minHeight: 50, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 5 },
  dataIcon: { width: 22, alignItems: "center", justifyContent: "center" },
  grow: { flex: 1, minWidth: 0 },
  dataTitle: { fontSize: 13, fontWeight: "800" },
  dataMeta: { fontSize: 11, marginTop: 2 },
  progressRow: { paddingVertical: 8, gap: 7 },
  progressLabelRow: { flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { fontSize: 12, fontWeight: "800" },
  progressValue: { fontSize: 11, fontWeight: "700", fontVariant: ["tabular-nums"] },
  progressTrack: { height: 7, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  empty: { minHeight: 72, alignItems: "center", justifyContent: "center", padding: 12 },
  emptyText: { fontSize: 12, textAlign: "center", lineHeight: 17 },
});
