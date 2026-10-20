import { type ReactNode, useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

const MIN_SCALE = 0.9;
const MAX_SCALE = 2.5;
/** Double-tap / chip zoom-in target — stays readable, not extreme. */
const COMFORT_ZOOM = 1.35;

type Props = {
  children: ReactNode;
  /** Enabled when not in a mode that needs exclusive single-finger drag on overlays. */
  enabled?: boolean;
  scale: number;
  onScaleChange: (scale: number) => void;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Document-level pinch / pan / double-tap zoom for the Seamless note stage.
 * Uses RN Animated (no Reanimated) so Old Arch TestFlight builds stay stable.
 */
export function DocumentZoom({ children, enabled = true, scale, onScaleChange }: Props) {
  const scaleAnim = useRef(new Animated.Value(scale)).current;
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;
  const scaleRef = useRef(scale);
  const savedScale = useRef(scale);
  const savedTx = useRef(0);
  const savedTy = useRef(0);
  const txRef = useRef(0);
  const tyRef = useRef(0);

  useEffect(() => {
    scaleRef.current = scale;
    scaleAnim.setValue(scale);
    if (scale <= 1.01) {
      txRef.current = 0;
      tyRef.current = 0;
      Animated.timing(tx, { toValue: 0, duration: 160, useNativeDriver: true }).start();
      Animated.timing(ty, { toValue: 0, duration: 160, useNativeDriver: true }).start();
    }
  }, [scale, scaleAnim, tx, ty]);

  const pinch = Gesture.Pinch()
    .enabled(enabled)
    .onBegin(() => {
      savedScale.current = scaleRef.current;
    })
    .onUpdate((e) => {
      const next = clamp(savedScale.current * e.scale, MIN_SCALE, MAX_SCALE);
      scaleRef.current = next;
      scaleAnim.setValue(next);
    })
    .onEnd(() => {
      const next = clamp(scaleRef.current, MIN_SCALE, MAX_SCALE);
      scaleRef.current = next;
      scaleAnim.setValue(next);
      onScaleChange(next);
      if (next <= 1.01) {
        txRef.current = 0;
        tyRef.current = 0;
        Animated.timing(tx, { toValue: 0, duration: 160, useNativeDriver: true }).start();
        Animated.timing(ty, { toValue: 0, duration: 160, useNativeDriver: true }).start();
      }
    });

  const pan = Gesture.Pan()
    .enabled(enabled)
    .minPointers(2)
    .onBegin(() => {
      savedTx.current = txRef.current;
      savedTy.current = tyRef.current;
    })
    .onUpdate((e) => {
      if (scaleRef.current <= 1.01) return;
      txRef.current = savedTx.current + e.translationX;
      tyRef.current = savedTy.current + e.translationY;
      tx.setValue(txRef.current);
      ty.setValue(tyRef.current);
    });

  const doubleTap = Gesture.Tap()
    .enabled(enabled)
    .numberOfTaps(2)
    .onEnd(() => {
      const next = scaleRef.current > 1.05 ? 1 : COMFORT_ZOOM;
      scaleRef.current = next;
      Animated.timing(scaleAnim, { toValue: next, duration: 180, useNativeDriver: true }).start();
      if (next <= 1.01) {
        txRef.current = 0;
        tyRef.current = 0;
        Animated.timing(tx, { toValue: 0, duration: 180, useNativeDriver: true }).start();
        Animated.timing(ty, { toValue: 0, duration: 180, useNativeDriver: true }).start();
      }
      onScaleChange(next);
    });

  const gesture = Gesture.Simultaneous(pinch, pan, doubleTap);

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.root} collapsable={false}>
        <Animated.View
          style={[
            styles.content,
            {
              transform: [{ translateX: tx }, { translateY: ty }, { scale: scaleAnim }],
            },
          ]}
        >
          {children}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, overflow: "hidden" },
  content: { flex: 1, minHeight: 0 },
});
