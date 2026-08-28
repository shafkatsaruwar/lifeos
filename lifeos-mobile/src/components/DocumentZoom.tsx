import { type ReactNode, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;
const COMFORT_ZOOM = 1.6;

type Props = {
  children: ReactNode;
  /** Enabled when not in a mode that needs exclusive single-finger drag on overlays. */
  enabled?: boolean;
  scale: number;
  onScaleChange: (scale: number) => void;
};

function clamp(n: number, min: number, max: number) {
  "worklet";
  return Math.max(min, Math.min(max, n));
}

/**
 * Document-level pinch / pan / double-tap zoom for the Seamless note stage.
 * Keeps page sheets + overlays in one transform tree.
 */
export function DocumentZoom({ children, enabled = true, scale, onScaleChange }: Props) {
  const scaleSV = useSharedValue(scale);
  const savedScale = useSharedValue(scale);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  useEffect(() => {
    scaleSV.value = scale;
    if (scale <= 1.01) {
      tx.value = withTiming(0, { duration: 160 });
      ty.value = withTiming(0, { duration: 160 });
    }
  }, [scale, scaleSV, tx, ty]);

  const reportScale = (next: number) => {
    onScaleChange(next);
  };

  const pinch = Gesture.Pinch()
    .enabled(enabled)
    .onBegin(() => {
      savedScale.value = scaleSV.value;
    })
    .onUpdate((e) => {
      scaleSV.value = clamp(savedScale.value * e.scale, MIN_SCALE, MAX_SCALE);
    })
    .onEnd(() => {
      const next = clamp(scaleSV.value, MIN_SCALE, MAX_SCALE);
      scaleSV.value = next;
      runOnJS(reportScale)(next);
      if (next <= 1.01) {
        tx.value = withTiming(0, { duration: 160 });
        ty.value = withTiming(0, { duration: 160 });
      }
    });

  const pan = Gesture.Pan()
    .enabled(enabled)
    .minPointers(2)
    .onBegin(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    })
    .onUpdate((e) => {
      if (scaleSV.value <= 1.01) return;
      tx.value = savedTx.value + e.translationX;
      ty.value = savedTy.value + e.translationY;
    });

  const doubleTap = Gesture.Tap()
    .enabled(enabled)
    .numberOfTaps(2)
    .onEnd(() => {
      const next = scaleSV.value > 1.05 ? 1 : COMFORT_ZOOM;
      scaleSV.value = withTiming(next, { duration: 180 });
      if (next <= 1.01) {
        tx.value = withTiming(0, { duration: 180 });
        ty.value = withTiming(0, { duration: 180 });
      }
      runOnJS(reportScale)(next);
    });

  const gesture = Gesture.Simultaneous(pinch, pan, doubleTap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scaleSV.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.root} collapsable={false}>
        <Animated.View style={[styles.content, animatedStyle]}>{children}</Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, overflow: "hidden" },
  content: { flex: 1, minHeight: 0 },
});
