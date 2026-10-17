import Feather from "@expo/vector-icons/Feather";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLifeOS } from "../lib/LifeOSContext";
import type { Notebook } from "../types";

type ActionKey =
  | "open"
  | "share"
  | "move"
  | "trash"
  | "star"
  | "rename"
  | "duplicate"
  | "cover"
  | "info"
  | "organize"
  | "restore"
  | "purge";

type Props = {
  visible: boolean;
  notebook: Notebook | null;
  onClose: () => void;
  onAction: (action: ActionKey) => void;
};

/**
 * Noteshelf-style notebook menu: quick icons + rename / cover / duplicate / …
 */
export function NotebookActionsSheet({ visible, notebook, onClose, onAction }: Props) {
  const { theme } = useLifeOS();
  const insets = useSafeAreaInsets();
  if (!notebook) return null;

  const trashed = Boolean(notebook.trashedAt);
  const run = (action: ActionKey) => {
    onClose();
    // Defer so the sheet dismisses before the next modal/alert.
    requestAnimationFrame(() => onAction(action));
  };

  const row = (
    label: string,
    icon: keyof typeof Feather.glyphMap,
    action: ActionKey,
    opts?: { danger?: boolean; muted?: boolean },
  ) => (
    <Pressable
      key={action + label}
      onPress={() => run(action)}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.soft }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Feather
        name={icon}
        size={18}
        color={opts?.danger ? theme.danger : opts?.muted ? theme.muted : theme.text}
      />
      <Text
        style={[
          styles.rowLabel,
          { color: opts?.danger ? theme.danger : opts?.muted ? theme.muted : theme.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              paddingBottom: Math.max(16, insets.bottom + 8),
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: theme.border }]} />
          </View>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {notebook.name}
          </Text>

          {trashed ? (
            <View style={styles.list}>
              {row("Restore", "rotate-ccw", "restore")}
              {row("Delete forever", "trash-2", "purge", { danger: true })}
            </View>
          ) : (
            <>
              <View style={styles.quickRow}>
                <QuickIcon
                  label="Share"
                  icon="share"
                  color={theme.text}
                  bg={theme.soft}
                  onPress={() => run("share")}
                />
                <QuickIcon
                  label="Move"
                  icon="folder"
                  color={theme.text}
                  bg={theme.soft}
                  onPress={() => run("move")}
                />
                <QuickIcon
                  label="Trash"
                  icon="trash-2"
                  color={theme.danger}
                  bg={`${theme.danger}18`}
                  onPress={() => run("trash")}
                />
              </View>

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              <View style={styles.list}>
                {row("Open", "book-open", "open")}
                {row(notebook.starred ? "Remove from Starred" : "Add to Starred", "star", "star")}
                {row("Rename", "edit-2", "rename")}
                {row("Duplicate", "copy", "duplicate")}
                {row("Change Cover", "image", "cover")}
                {row("Organize pages", "layers", "organize", { muted: true })}
                {row("Get Info", "info", "info", { muted: true })}
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function QuickIcon({
  label,
  icon,
  color,
  bg,
  onPress,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  bg: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.quickItem} accessibilityRole="button" accessibilityLabel={label}>
      <View style={[styles.quickCircle, { backgroundColor: bg }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.quickLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 4,
  },
  handleWrap: { alignItems: "center", paddingBottom: 6 },
  handle: { width: 36, height: 4, borderRadius: 2 },
  title: { fontSize: 17, fontWeight: "800", paddingHorizontal: 4, paddingBottom: 10 },
  quickRow: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 8 },
  quickItem: { alignItems: "center", gap: 6, minWidth: 72 },
  quickCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: { fontSize: 12, fontWeight: "700" },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 6 },
  list: { gap: 2, paddingBottom: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 10,
  },
  rowLabel: { fontSize: 16, fontWeight: "600" },
});
