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
  style?: ViewStyle;
};

/**
 * Dropdown-style menu anchored under a toolbar/chrome button.
 * Stays near the control; flips above if it would go off the bottom edge.
 */
export function AnchoredPopover({ visible, onClose, anchor, children, width = 260, style }: Props) {
  const { theme } = useLifeOS();
  const { width: winW, height: winH } = useWindowDimensions();
  const [menuH, setMenuH] = useState(220);

  useEffect(() => {
    if (!visible) setMenuH(220);
  }, [visible]);

  if (!visible || !anchor) return null;

  const gap = 6;
  let left = Math.min(Math.max(12, anchor.x + anchor.width - width), winW - width - 12);
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
            {
              top,
              left,
              width,
              backgroundColor: theme.surface,
              borderColor: theme.border,
              shadowColor: "#0F172A",
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
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    overflow: "hidden",
  },
});
