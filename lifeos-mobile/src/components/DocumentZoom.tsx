import { type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

type Props = {
  children: ReactNode;
  enabled?: boolean;
  scale: number;
  onScaleChange: (scale: number) => void;
};

/**
 * Passthrough stage wrapper. Pinch-zoom temporarily disabled — the Gesture
 * Handler v2 API required Reanimated worklets, which we removed for Old Arch
 * TestFlight stability. Scale props kept so call sites need no rewrite.
 */
export function DocumentZoom({ children }: Props) {
  return (
    <View style={styles.root} collapsable={false}>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, overflow: "hidden" },
  content: { flex: 1, minHeight: 0 },
});
