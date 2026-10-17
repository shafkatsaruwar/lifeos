import { useEffect, useState, type ReactNode } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutRectangle,
  type ViewStyle,
} from "react-native";
import { useLifeOS } from "../lib/LifeOSContext";

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Screen-space rect of the anchor control (from measureInWindow). */
  anchor: LayoutRectangle | null;
  children: ReactNode;
  /** Preferred width of the menu card. */
  width?: number;
  /** Horizontal alignment of the card relative to the anchor. */
  align?: "trailing" | "center" | "leading";
  /** Transparent shell so a child can own the card chrome (Noteshelf tool trays). */
  bare?: boolean;
  style?: ViewStyle;
};

/**
 * Dropdown-style menu anchored under a toolbar/chrome button.
 * Stays near the control; flips above if it would go off the bottom edge.
 * Renders in a Modal so it overlays the note the same way the ⋯ menu does.
 */
export function AnchoredPopover({
  visible,
  onClose,
  anchor,
  children,
  width = 260,
  align = "trailing",
  bare = false,
  style,
}: Props) {
  const { theme } = useLifeOS();
  const { width: winW, height: winH } = useWindowDimensions();
  const [menuH, setMenuH] = useState(220);

  useEffect(() => {
    if (!visible) setMenuH(220);
  }, [visible]);

  if (!visible || !anchor) return null;

  const gap = 8;
  let left =
    align === "center"
      ? anchor.x + anchor.width / 2 - width / 2
      : align === "leading"
        ? anchor.x
        : anchor.x + anchor.width - width;
  left = Math.min(Math.max(12, left), winW - width - 12);
  let top = anchor.y + anchor.height + gap;
  if (top + menuH > winH - 16) {
    top = Math.max(16, anchor.y - menuH - gap);
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      {/* Backdrop and card are siblings — nesting Pressables eats row taps on iOS. */}
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} accessibilityLabel="Dismiss menu" />
        <View
          onLayout={(e) => setMenuH(e.nativeEvent.layout.height)}
          style={[
            styles.card,
            bare
              ? styles.bareCard
              : {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  shadowColor: "#0F172A",
                },
            {
              top,
              left,
              width,
            },
            style,
          ]}
        >
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  card: {
    position: "absolute",
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
    overflow: "hidden",
  },
  bareCard: {
    borderRadius: 0,
    borderWidth: 0,
    paddingVertical: 0,
    backgroundColor: "transparent",
    shadowOpacity: 0,
    elevation: 0,
    overflow: "visible",
  },
});
