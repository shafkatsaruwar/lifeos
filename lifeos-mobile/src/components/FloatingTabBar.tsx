import Feather from "@expo/vector-icons/Feather";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useEffect } from "react";
import { Gesture, GestureDetector, Pressable } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLifeOS } from "../lib/LifeOSContext";
import { useLayout } from "../lib/layout";

const PILL_H = 64;
const LIGHT_INSET = 5;
const INACTIVE = "#8E8E93";

/** Each tab gets its own pop — Now follows the user’s accent. */
function tabTint(routeName: string, accent: string): string {
  switch (routeName) {
    case "NowTab":
      return accent;
    case "TasksTab":
      return "#31926A";
    case "CalendarTab":
      return "#3F7ED7";
    case "LifeTab":
      return "#D99B38";
    case "SchoolTab":
      return "#8B5CF6";
    case "WorkTab":
      return "#4338CA";
    case "LibraryTab":
      return "#DB2777";
    default:
      return accent;
  }
}

function tintFill(hex: string, dark: boolean) {
  return dark ? `${hex}33` : `${hex}22`;
}

function isHidden(options: BottomTabBarProps["descriptors"][string]["options"]) {
  const style = options.tabBarItemStyle as { display?: string } | undefined;
  return style?.display === "none";
}

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { theme, workspace } = useLifeOS();
  const insets = useSafeAreaInsets();
  const { isTablet } = useLayout();
  const reduceMotion = Boolean(workspace.settings.reduceMotion);

  const visible = state.routes.filter((route) => !isHidden(descriptors[route.key].options));
  const activeKey = state.routes[state.index]?.key;
  const activeIndex = Math.max(
    0,
    visible.findIndex((route) => route.key === activeKey),
  );

  const widthSV = useSharedValue(0);
  const indexSV = useSharedValue(activeIndex);
  const dragX = useSharedValue(0);
  const dragging = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      indexSV.value = activeIndex;
      dragX.value = 0;
      return;
    }
    indexSV.value = withSpring(activeIndex, { damping: 18, stiffness: 220, mass: 0.7 });
    dragX.value = 0;
  }, [activeIndex, dragX, indexSV, reduceMotion]);

  const goTo = (nextIndex: number) => {
    const route = visible[nextIndex];
    if (!route) return;
    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });
    if (!event.defaultPrevented && state.routes[state.index]?.key !== route.key) {
      navigation.navigate(route.name);
    }
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-16, 16])
    .onBegin(() => {
      dragging.value = 1;
    })
    .onChange((e) => {
      dragX.value += e.changeX;
    })
    .onEnd(() => {
      const count = visible.length;
      const w = widthSV.value;
      if (count < 1 || w <= 0) {
        dragging.value = 0;
        dragX.value = 0;
        return;
      }
      const tabW = w / count;
      const raw = indexSV.value + dragX.value / tabW;
      const snapped = Math.max(0, Math.min(count - 1, Math.round(raw)));
      dragging.value = 0;
      dragX.value = 0;
      runOnJS(goTo)(snapped);
    });

  const countSV = useSharedValue(Math.max(visible.length, 1));
  countSV.value = Math.max(visible.length, 1);

  const lightStyle = useAnimatedStyle(() => {
    const count = Math.max(countSV.value, 1);
    const w = widthSV.value;
    const tabW = count > 0 && w > 0 ? w / count : 0;
    const x = indexSV.value * tabW + dragX.value;
    return {
      width: Math.max(0, tabW - LIGHT_INSET * 2),
      transform: [{ translateX: x + LIGHT_INSET }],
    };
  });

  const dark = theme.bg === "#111214" || theme.surface === "#191A1D";
  const pillBg = dark ? theme.surface : "#FFFFFF";
  const activeRoute = visible[activeIndex]?.name ?? "NowTab";
  const activeTint = tabTint(activeRoute, theme.accent);

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <GestureDetector gesture={pan}>
        <View
          style={[
            styles.pill,
            {
              backgroundColor: pillBg,
              borderColor: activeTint,
            },
          ]}
        >
          <View
            onLayout={(e) => {
              widthSV.value = e.nativeEvent.layout.width;
            }}
            style={styles.track}
          >
            <Animated.View
              pointerEvents="none"
              style={[
                styles.light,
                { borderColor: activeTint, backgroundColor: tintFill(activeTint, dark) },
                lightStyle,
              ]}
            />
            {visible.map((route, index) => {
              const { options } = descriptors[route.key];
              const label =
                typeof options.tabBarLabel === "string"
                  ? options.tabBarLabel
                  : options.title ?? route.name;
              const focused = index === activeIndex;
              const color = focused ? tabTint(route.name, theme.accent) : INACTIVE;
              const iconName = (options.tabBarIcon
                ? undefined
                : "circle") as keyof typeof Feather.glyphMap;
              return (
                <Pressable
                  key={route.key}
                  accessibilityRole="button"
                  accessibilityState={focused ? { selected: true } : {}}
                  accessibilityLabel={options.tabBarAccessibilityLabel ?? String(label)}
                  onPress={() => goTo(index)}
                  onLongPress={() =>
                    navigation.emit({ type: "tabLongPress", target: route.key })
                  }
                  style={styles.item}
                >
                  {options.tabBarIcon
                    ? options.tabBarIcon({ focused, color, size: isTablet ? 22 : 20 })
                    : (
                      <Feather name={iconName} size={20} color={color} />
                    )}
                  <Text numberOfLines={1} style={[styles.label, { color }]}>
                    {String(label)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </GestureDetector>
    </View>
  );
}

export const FLOATING_TAB_BAR_HEIGHT = PILL_H + 22;

/**
 * Extra scroll padding so the last controls clear the floating tab pill + home indicator.
 * Matches the bar wrap: pill height + safe-area paddingBottom + breathing room.
 */
export function useFloatingTabBarContentPadding(extra = 32) {
  const insets = useSafeAreaInsets();
  return PILL_H + Math.max(insets.bottom, 10) + extra;
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    paddingHorizontal: 14,
  },
  pill: {
    height: PILL_H,
    width: "100%",
    borderRadius: 999,
    borderWidth: 1,
    overflow: "hidden",
    paddingHorizontal: 6,
    paddingVertical: 6,
    justifyContent: "center",
  },
  track: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  light: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  item: {
    flex: 1,
    minWidth: 0,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    zIndex: 1,
  },
  label: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
});
