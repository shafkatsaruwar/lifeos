import Feather from "@expo/vector-icons/Feather";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLifeOS } from "../lib/LifeOSContext";
import { CAREER_IOS_ENABLED } from "../lib/careerFlag";
import { useLayout } from "../lib/layout";
import { workspaceColorFor } from "../lib/theme";
import type { SettingsState } from "../types";

const PILL_H = 64;
const LIGHT_INSET = 5;
const INACTIVE = "#8E8E93";

function tabTint(routeName: string, accent: string, settings: SettingsState): string {
  switch (routeName) {
    case "NowTab":
      return "#3F7ED7";
    case "TasksTab":
      return "#31926A";
    case "CalendarTab":
      return "#3F7ED7";
    case "KeptTab":
      return "#3F7ED7";
    case "LifeTab":
      return workspaceColorFor(settings, "life");
    case "SchoolTab":
      return workspaceColorFor(settings, "school");
    case "WorkTab":
      return workspaceColorFor(settings, "work");
    case "CareerTab":
      return CAREER_IOS_ENABLED ? workspaceColorFor(settings, "career") : accent;
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

/**
 * Floating tab bar — Pressable + RN Animated only.
 * No react-native-gesture-handler Gesture API (needs Reanimated worklets).
 */
export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { theme, workspace } = useLifeOS();
  const insets = useSafeAreaInsets();
  const { isTablet } = useLayout();
  const reduceMotion = Boolean(workspace.settings.reduceMotion);

  const visible = state.routes.filter((route) => {
    if (!CAREER_IOS_ENABLED && route.name === "CareerTab") return false;
    return !isHidden(descriptors[route.key]?.options);
  });
  const activeKey = state.routes[state.index]?.key;
  const activeHidden = Boolean(activeKey) && !visible.some((route) => route.key === activeKey);
  const activeIndex = Math.max(
    0,
    visible.findIndex((route) => route.key === activeKey),
  );

  const [trackWidth, setTrackWidth] = useState(0);
  const indexAnim = useRef(new Animated.Value(activeIndex)).current;
  const count = Math.max(visible.length, 1);
  const tabW = trackWidth > 0 ? trackWidth / count : 0;

  const firstVisibleName = visible[0]?.name;
  useEffect(() => {
    if (!activeHidden || !firstVisibleName) return;
    navigation.navigate(firstVisibleName);
  }, [activeHidden, firstVisibleName, navigation]);

  useEffect(() => {
    if (reduceMotion) {
      indexAnim.setValue(activeIndex);
      return;
    }
    Animated.spring(indexAnim, {
      toValue: activeIndex,
      useNativeDriver: true,
      friction: 7,
      tension: 80,
    }).start();
  }, [activeIndex, indexAnim, reduceMotion]);

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

  const lightTranslateX = Animated.add(
    Animated.multiply(indexAnim, tabW || 0),
    LIGHT_INSET,
  );

  const dark = theme.bg === "#111214" || theme.surface === "#191A1D";
  const pillBg = dark ? theme.surface : "#FFFFFF";
  const activeRoute = visible[activeIndex]?.name ?? "NowTab";
  const activeTint = tabTint(activeRoute, theme.accent, workspace.settings);
  const lightWidth = Math.max(0, tabW - LIGHT_INSET * 2);

  const onTrackLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: theme.bg,
          paddingBottom: Math.max(insets.bottom, 10),
          borderTopColor: theme.border,
        },
      ]}
    >
      <View
        style={[
          styles.pill,
          {
            backgroundColor: pillBg,
            borderColor: activeTint,
          },
        ]}
      >
        <View onLayout={onTrackLayout} style={styles.track}>
          {tabW > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.light,
                {
                  width: lightWidth,
                  borderColor: activeTint,
                  backgroundColor: tintFill(activeTint, dark),
                  transform: [{ translateX: lightTranslateX }],
                },
              ]}
            />
          ) : null}
          {visible.map((route, index) => {
            const options = descriptors[route.key]?.options ?? {};
            const label =
              typeof options.tabBarLabel === "string"
                ? options.tabBarLabel
                : options.title ?? route.name;
            const focused = index === activeIndex;
            const color = focused ? tabTint(route.name, theme.accent, workspace.settings) : INACTIVE;
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
    </View>
  );
}

export const FLOATING_TAB_BAR_HEIGHT = PILL_H + 22;

export function useFloatingTabBarContentPadding(extra = 16) {
  return Math.max(8, extra);
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
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
