import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, Eyebrow, Page, Title } from "../components/UI";
import { useFloatingTabBarContentPadding } from "../components/FloatingTabBar";
import { useLifeOS } from "../lib/LifeOSContext";
import { CAREER_PAGE_ACCENT, careerPageStats } from "../lib/careerPage";

export function CareerPageScreen() {
  const { theme, workspace } = useLifeOS();
  const tabBarPad = useFloatingTabBarContentPadding(28);
  const stats = careerPageStats(workspace.career);

  const blocks = [
    { label: "Total Applications", value: stats.total },
    { label: "Rejected", value: stats.rejected },
    { label: "First-step", value: stats.firstStep },
    { label: "Awaiting Response", value: stats.awaiting },
  ];

  return (
    <Page>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: tabBarPad }}>
        <Eyebrow>JOB SEARCH</Eyebrow>
        <Title>Careers</Title>

        <View style={styles.grid}>
          {blocks.map((block) => (
            <Card key={block.label} style={styles.block}>
              <View style={styles.blockHeader}>
                <View style={[styles.dot, { backgroundColor: CAREER_PAGE_ACCENT }]} />
                <Text style={[styles.blockLabel, { color: theme.muted }]}>{block.label}</Text>
              </View>
              <Text style={[styles.blockValue, { color: theme.text }]}>{block.value}</Text>
            </Card>
          ))}
        </View>
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 16 },
  block: { width: "48%", marginBottom: 12 },
  blockHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  blockLabel: { fontSize: 12, fontWeight: "700" },
  blockValue: { fontSize: 30, fontWeight: "800", marginTop: 10 },
});
