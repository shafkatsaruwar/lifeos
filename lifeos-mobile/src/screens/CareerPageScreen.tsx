import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, Eyebrow, Page, Title } from "../components/UI";
import { useFloatingTabBarContentPadding } from "../components/FloatingTabBar";
import { useLifeOS } from "../lib/LifeOSContext";
import {
  CAREER_PAGE_ACCENT,
  careerAttention,
  careerPageStats,
  careerPipeline,
  careerRecent,
} from "../lib/careerPage";

function SectionTitle({ children }: { children: string }) {
  const { theme } = useLifeOS();
  return <Text style={[styles.sectionTitle, { color: theme.text }]}>{children}</Text>;
}

export function CareerPageScreen() {
  const { theme, workspace } = useLifeOS();
  const tabBarPad = useFloatingTabBarContentPadding(28);
  const career = workspace.career;
  const stats = careerPageStats(career);
  const attention = careerAttention(career);
  const pipeline = careerPipeline(career);
  const recent = careerRecent(career);

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

        <SectionTitle>Needs your attention</SectionTitle>
        <Card style={styles.section}>
          {attention ? (
            <>
              <Text style={[styles.dueLabel, { color: theme.danger }]}>{attention.dueLabel}</Text>
              <Text style={[styles.rowTitle, { color: theme.text }]}>{attention.title}</Text>
              {attention.subtitle ? (
                <Text style={[styles.rowSub, { color: theme.muted }]}>{attention.subtitle}</Text>
              ) : null}
            </>
          ) : (
            <Text style={[styles.rowSub, { color: theme.muted }]}>Nothing due today.</Text>
          )}
        </Card>

        <SectionTitle>Your pipeline</SectionTitle>
        <Card style={styles.section}>
          {pipeline.map((row, index) => (
            <View key={row.key} style={index > 0 ? styles.pipeRowGap : undefined}>
              <View style={styles.pipeHeader}>
                <Text style={[styles.rowTitle, { color: theme.text }]}>{row.label}</Text>
                <Text style={[styles.rowTitle, { color: theme.text }]}>{row.count}</Text>
              </View>
              <View style={[styles.track, { backgroundColor: theme.border }]}>
                <View
                  style={[
                    styles.fill,
                    { backgroundColor: CAREER_PAGE_ACCENT, width: `${Math.round(row.ratio * 100)}%` },
                  ]}
                />
              </View>
            </View>
          ))}
        </Card>

        <SectionTitle>Recent activity</SectionTitle>
        <Card style={styles.section}>
          {recent.length === 0 ? (
            <Text style={[styles.rowSub, { color: theme.muted }]}>No applications yet.</Text>
          ) : (
            recent.map((row, index) => (
              <View key={row.id} style={index > 0 ? styles.activityRowGap : undefined}>
                <Text style={[styles.rowTitle, { color: theme.text }]}>{row.title}</Text>
                <Text style={[styles.rowSub, { color: theme.muted }]}>
                  {[row.company, "Application added"].filter(Boolean).join(" · ")}
                </Text>
              </View>
            ))
          )}
        </Card>
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
  sectionTitle: { fontSize: 18, fontWeight: "800", marginTop: 24, marginBottom: 10 },
  section: { marginBottom: 4 },
  dueLabel: { fontSize: 12, fontWeight: "800", marginBottom: 6 },
  rowTitle: { fontSize: 15, fontWeight: "700" },
  rowSub: { fontSize: 13, marginTop: 4 },
  pipeHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  pipeRowGap: { marginTop: 14 },
  track: { height: 6, borderRadius: 3, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3 },
  activityRowGap: { marginTop: 14, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(0,0,0,0.08)" },
});
