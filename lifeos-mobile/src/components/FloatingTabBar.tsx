import Feather from "@expo/vector-icons/Feather";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useEffect, useState } from "react";
import { LayoutAnimation, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLifeOS } from "../lib/LifeOSContext";
import { CAREER_IOS_ENABLED } from "../lib/careerFlag";
import { useLayout } from "../lib/layout";

const BAR_H = 60;
const ICON_INACTIVE = "rgba(255,255,255,0.72)";

function isHidden(options: BottomTabBarProps["descriptors"][string]["options"]) {
  const style = options.tabBarItemStyle as { display?: string } | undefined;
  return style?.display === "none";
}

/**
 * Bottom bar: one solid accent pill. The active tab turns into a white pill
 * with its icon and label; the other tabs show icons only.
 * Pressable + LayoutAnimation only (no Reanimated).
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

  const firstVisibleName = visible[0]?.name;
  useEffect(() => {
    if (!activeHidden || !firstVisibleName) return;
    navigation.navigate(firstVisibleName);
  }, [activeHidden, firstVisibleName, navigation]);

  const goTo = (nextIndex: number) => {
    const route = visible[nextIndex];
    if (!route) return;
    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });
    if (!event.defaultPrevented && state.routes[state.index]?.key !== route.key) {
      if (!reduceMotion) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      navigation.navigate(route.name);
    }
  };

  const size = isTablet ? 22 : 20;
  // Each active label is measured once, off-screen, so the pill can be sized
  // to fit it. Letting flex size the label cut names down to "K...".
  const [labelWidths, setLabelWidths] = useState<Record<string, number>>({});
  const labelFor = (route: (typeof visible)[number]) => {
    const options = descriptors[route.key]?.options ?? {};
    return typeof options.tabBarLabel === "string" ? options.tabBarLabel : options.title ?? route.name;
  };
  const recordLabelWidth = (key: string, width: number) => {
    setLabelWidths((prev) => (prev[key] === width ? prev : { ...prev, [key]: width }));
  };

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: theme.bg,
          paddingBottom: Math.max(insets.bottom, 10),
        },
      ]}
    >
      <View style={[styles.bar, { backgroundColor: theme.accent }]}>
        {visible.map((route) => (
          <Text
            key={`measure-${route.key}`}
            pointerEvents="none"
            onLayout={(e) => recordLabelWidth(route.key, e.nativeEvent.layout.width)}
            style={[styles.activeLabel, styles.measure]}
          >
            {String(labelFor(route))}
          </Text>
        ))}
        {visible.map((route, index) => {
          const options = descriptors[route.key]?.options ?? {};
          const label =
            typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : options.title ?? route.name;
          const focused = index === activeIndex;
          const iconColor = focused ? theme.accent : ICON_INACTIVE;
          const icon = options.tabBarIcon ? (
            options.tabBarIcon({ focused, color: iconColor, size })
          ) : (
            <Feather name="circle" size={size} color={iconColor} />
          );
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
              <View
                style={
                  focused
                    ? [
                        styles.activePill,
                        labelWidths[route.key] !== undefined
                          ? { width: size + 6 + labelWidths[route.key] + 28 }
                          : null,
                      ]
                    : styles.content
                }
              >
                {icon}
                {focused ? (
                  <Text style={[styles.activeLabel, { color: theme.accent }]}>{String(label)}</Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export const FLOATING_TAB_BAR_HEIGHT = BAR_H + 22;

export function useFloatingTabBarContentPadding(extra = 16) {
  return Math.max(8, extra);
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  bar: {
    height: BAR_H,
    width: "100%",
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  item: {
    flex: 1,
    minWidth: 0,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  activePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: BAR_H - 14,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 4,
  },
  activeLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  measure: {
    position: "absolute",
    top: 0,
    left: 0,
    opacity: 0,
  },
});
