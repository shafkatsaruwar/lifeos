import Feather from "@expo/vector-icons/Feather";
import { type ReactNode, useRef } from "react";
import { Alert, Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";

type Props = {
  children: ReactNode;
  /** Label used in the confirm dialog */
  label: string;
  onDelete: () => void;
  enabled?: boolean;
  confirmTitle?: string;
  confirmBody?: string;
};

export function SwipeDeleteRow({
  children,
  label,
  onDelete,
  enabled = true,
  confirmTitle = "Delete",
  confirmBody,
}: Props) {
  const ref = useRef<Swipeable>(null);

  if (!enabled) return <>{children}</>;

  const confirm = () => {
    ref.current?.close();
    Alert.alert(confirmTitle, confirmBody ?? `Delete "${label}"? This can't be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: onDelete },
    ]);
  };

  const renderRight = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.6],
      extrapolate: "clamp",
    });
    return (
      <Pressable onPress={confirm} style={styles.deleteBtn} accessibilityRole="button" accessibilityLabel="Delete">
        <Animated.View style={[styles.deleteInner, { transform: [{ scale }] }]}>
          <Feather name="trash-2" size={18} color="#fff" />
          <Text style={styles.deleteText}>Delete</Text>
        </Animated.View>
      </Pressable>
    );
  };

  return (
    <Swipeable
      ref={ref}
      friction={2}
      overshootRight={false}
      rightThreshold={40}
      renderRightActions={renderRight}
    >
      <View>{children}</View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  deleteBtn: {
    width: 84,
    marginVertical: 0,
    marginLeft: 8,
    borderRadius: 14,
    backgroundColor: "#dc2626",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteInner: { alignItems: "center", gap: 4 },
  deleteText: { color: "#fff", fontSize: 12, fontWeight: "800" },
});
