import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { HandwritingCanvas, preferredDrawingPolicy } from "../../components/HandwritingCanvas";
import { MasterOSShell } from "../../components/masteros/MasterOSShell";
import { useLifeOS } from "../../lib/LifeOSContext";
import { useLayout } from "../../lib/layout";
import { useMasterOS } from "../../lib/masteros/MasterOSContext";
import type { NoteInk } from "../../types";
import type { MasterOSStackParamList } from "../../navigation/MasterOSNavigator";

type Props = NativeStackScreenProps<MasterOSStackParamList, "MasterOSWhiteboard">;

const TOOLS = ["Pen", "Marker", "Eraser"] as const;
const COLORS = ["#202124", "#625AF6", "#3F7ED7", "#D95754", "#31926A"];

export function MasterOSWhiteboardScreen({ navigation, route }: Props) {
  const { theme } = useLifeOS();
  const { isTablet } = useLayout();
  const { state } = useMasterOS();
  const lesson = state.lessons.find((item) => item.id === route.params.lessonId);
  const [tool, setTool] = useState<(typeof TOOLS)[number]>("Pen");
  const [color, setColor] = useState(COLORS[1]);
  const [ink, setInk] = useState<NoteInk | undefined>(undefined);
  const [showTemplate, setShowTemplate] = useState(true);

  const inkTool = tool === "Eraser" ? "eraser" : tool === "Marker" ? "marker" : "pen";

  return (
    <MasterOSShell active="lessons" onNavigate={() => undefined} onClose={() => navigation.goBack()} hideChrome>
      <View style={[styles.wrap, { borderColor: theme.border }]}>
        <View style={[styles.tools, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
          {TOOLS.map((item) => (
            <Pressable
              key={item}
              onPress={() => setTool(item)}
              style={[styles.tool, tool === item && { backgroundColor: theme.soft, borderColor: theme.border }]}
            >
              <Text style={{ color: tool === item ? theme.accent : theme.muted, fontWeight: tool === item ? "800" : "600", fontSize: 11 }}>
                {item}
              </Text>
            </Pressable>
          ))}
          <View style={{ width: 8 }} />
          {COLORS.map((swatch) => (
            <Pressable
              key={swatch}
              onPress={() => setColor(swatch)}
              style={[
                styles.dot,
                { backgroundColor: swatch, borderColor: color === swatch ? theme.text : theme.border, borderWidth: color === swatch ? 2 : 1 },
              ]}
            />
          ))}
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => setShowTemplate((value) => !value)}>
            <Text style={{ color: theme.accent, fontWeight: "800", fontSize: 11 }}>
              {showTemplate ? "Hide template" : "Insert template"}
            </Text>
          </Pressable>
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={{ color: theme.muted, fontWeight: "800", fontSize: 11, marginLeft: 14 }}>Done</Text>
          </Pressable>
        </View>

        <View style={[styles.board, { backgroundColor: theme.surface }]}>
          {showTemplate ? (
            <View style={styles.template} pointerEvents="none">
              <Text style={{ color: theme.muted, fontSize: 12, fontWeight: "600" }}>Part / whole · reverse percent</Text>
              <Text style={{ color: theme.text, fontSize: 15, fontWeight: "700", marginTop: 8 }}>$56 = 70% of original</Text>
              <View style={styles.barRow}>
                <View style={[styles.barLeft, { backgroundColor: `${theme.accent}59` }]}>
                  <Text style={{ color: theme.text, fontWeight: "700", fontSize: 13 }}>70% · $56</Text>
                </View>
                <View style={[styles.barRight, { backgroundColor: theme.border }]}>
                  <Text style={{ color: theme.muted, fontWeight: "700", fontSize: 12 }}>30%</Text>
                </View>
              </View>
              <Text style={{ color: theme.muted, fontSize: 12, marginTop: 12 }}>Whole = part ÷ percent → 56 ÷ 0.70</Text>
            </View>
          ) : null}
          <HandwritingCanvas
            ink={ink}
            onChange={setInk}
            documentKey={`masteros-wb-${route.params.lessonId}`}
            drawingPolicy={preferredDrawingPolicy(isTablet)}
            backgroundColor="transparent"
            inkTool={inkTool}
            inkColor={color.replace("#", "")}
            inkWidth={tool === "Marker" ? 8 : 2}
          />
        </View>

        <View style={[styles.footer, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>
          <Text style={{ color: theme.muted, fontSize: 12, flex: 1 }} numberOfLines={1}>
            {lesson?.title ?? "Whiteboard"} · draw over the bar, then return to the lesson
          </Text>
          <Pressable onPress={() => navigation.navigate("MasterOSTeach", { lessonId: route.params.lessonId })}>
            <Text style={{ color: theme.accent, fontWeight: "800", fontSize: 12 }}>Back to lesson</Text>
          </Pressable>
        </View>
      </View>
    </MasterOSShell>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, margin: 8, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  tools: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tool: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: "transparent" },
  dot: { width: 18, height: 18, borderRadius: 99 },
  board: { flex: 1 },
  template: { position: "absolute", left: 24, top: 24, right: 24, zIndex: 1 },
  barRow: { flexDirection: "row", marginTop: 28, height: 56, borderRadius: 8, overflow: "hidden" },
  barLeft: { flex: 7, justifyContent: "center", paddingHorizontal: 12 },
  barRight: { flex: 3, justifyContent: "center", paddingHorizontal: 10 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
