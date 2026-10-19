import Feather from "@expo/vector-icons/Feather";
import { useNavigation } from "@react-navigation/native";
import { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ActionButton, Card, Empty, Eyebrow, Page, Title } from "../components/UI";
import { useFloatingTabBarContentPadding } from "../components/FloatingTabBar";
import { SwipeDeleteRow } from "../components/SwipeDeleteRow";
import { useLifeOS } from "../lib/LifeOSContext";
import {
  CAREER_STAGES,
  companyName,
  createApplication,
  dashboardMetrics,
  deleteApplication,
  filterApplications,
  moveApplicationStage,
  stageLabel,
  type ApplicationPriority,
  type CareerApplication,
  type CareerHub,
  type CareerStageId,
  type CareerView,
} from "../lib/career";

const VIEW_TABS: { id: CareerView; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "applications", label: "Apps" },
  { id: "pipeline", label: "Pipeline" },
  { id: "interviews", label: "Interviews" },
];

const PRIORITIES: ApplicationPriority[] = ["high", "medium", "low"];

const PIPELINE_STAGES = CAREER_STAGES.filter((s) => !s.isTerminal);

function priorityTone(priority?: ApplicationPriority) {
  if (priority === "high") return "#e25555";
  if (priority === "low") return "#6b8fd4";
  return "#e89b3a";
}

function applyHubResult(
  result: CareerHub | { error: string },
  onOk: (hub: CareerHub) => void,
) {
  if ("error" in result) {
    Alert.alert("Career", result.error);
    return;
  }
  onOk(result);
}

export function CareerDashboardScreen() {
  const { theme, workspace, updateCareer } = useLifeOS();
  const navigation = useNavigation<any>();
  const tabBarPad = useFloatingTabBarContentPadding(40);
  const hub = workspace.career;

  const [view, setView] = useState<CareerView>("overview");
  const [query, setQuery] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [stageId, setStageId] = useState<CareerStageId>("saved");
  const [priority, setPriority] = useState<ApplicationPriority>("medium");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const metrics = useMemo(() => dashboardMetrics(hub), [hub]);
  const apps = useMemo(
    () => filterApplications(hub, { query, sort: "updated" }),
    [hub, query],
  );
  const selected = hub.applications.find((a) => a.id === selectedId) ?? null;
  const upcoming = metrics.upcomingInterviewList;

  const resetComposer = () => {
    setComposerOpen(false);
    setJobTitle("");
    setCompany("");
    setStageId("saved");
    setPriority("medium");
  };

  const persist = (next: CareerHub) => {
    void updateCareer(next);
  };

  const submitApplication = () => {
    applyHubResult(
      createApplication(hub, { jobTitle, companyName: company, stageId, priority }),
      (next) => {
        persist(next);
        resetComposer();
      },
    );
  };

  const removeApp = (app: CareerApplication) => {
    persist(deleteApplication(hub, app.id));
    if (selectedId === app.id) setSelectedId(null);
  };

  const confirmRemoveApp = (app: CareerApplication) => {
    Alert.alert("Delete application?", `${app.jobTitle} at ${companyName(hub, app.companyId)}`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => removeApp(app) },
    ]);
  };

  const changeStage = (app: CareerApplication, nextStage: CareerStageId) => {
    applyHubResult(moveApplicationStage(hub, app.id, nextStage), persist);
  };

  const openStagePicker = (app: CareerApplication) => {
    Alert.alert(
      "Move stage",
      `${app.jobTitle} · ${stageLabel(app.stageId)}`,
      [
        ...CAREER_STAGES.map((stage) => ({
          text: stage.name + (stage.id === app.stageId ? " ✓" : ""),
          onPress: () => changeStage(app, stage.id),
        })),
        { text: "Cancel", style: "cancel" as const },
      ],
    );
  };

  const renderAppRow = (app: CareerApplication) => {
    const tone = priorityTone(app.priority);
    const companyLabel = companyName(hub, app.companyId);
    return (
      <SwipeDeleteRow key={app.id} label={app.jobTitle} onDelete={() => removeApp(app)}>
        <Pressable
          onPress={() => setSelectedId(selectedId === app.id ? null : app.id)}
          onLongPress={() => openStagePicker(app)}
          style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <View style={[styles.stageDot, { backgroundColor: theme.accent }]} />
          <View style={styles.grow}>
            <Text style={{ color: theme.text, fontWeight: "800" }}>{app.jobTitle}</Text>
            <Text style={{ color: theme.muted, fontSize: 12 }}>
              {companyLabel} · {stageLabel(app.stageId)}
              {app.nextAction ? ` · ${app.nextAction}` : ""}
            </Text>
          </View>
          <Text style={[styles.priorityTag, { color: tone, backgroundColor: `${tone}18` }]}>
            {app.priority || "medium"}
          </Text>
        </Pressable>
      </SwipeDeleteRow>
    );
  };

  const overview = (
    <>
      <View style={styles.statRow}>
        {[
          { label: "Active", count: metrics.active, onPress: () => setView("applications") },
          { label: "Interviews", count: metrics.upcomingInterviews, onPress: () => setView("interviews") },
          { label: "Follow-ups", count: metrics.followUpsDue, onPress: () => setView("applications") },
        ].map((stat) => (
          <Pressable
            key={stat.label}
            onPress={stat.onPress}
            style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <Text style={{ color: theme.text, fontSize: 22, fontWeight: "800" }}>{stat.count}</Text>
            <Text style={{ color: theme.muted, fontSize: 11, fontWeight: "700" }}>{stat.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.section, { color: theme.text }]}>Needs attention</Text>
      {metrics.needsAttention.length ? (
        metrics.needsAttention.slice(0, 6).map(renderAppRow)
      ) : (
        <Card>
          <Empty title="Pipeline is clear" body="Add an application or move one that needs a follow-up." />
        </Card>
      )}

      <Text style={[styles.section, { color: theme.text }]}>Upcoming interviews</Text>
      {upcoming.length ? (
        upcoming.map((interview) => {
          const app = hub.applications.find((a) => a.id === interview.applicationId);
          return (
            <View
              key={interview.id}
              style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <Feather name="calendar" size={16} color={theme.accent} />
              <View style={styles.grow}>
                <Text style={{ color: theme.text, fontWeight: "700" }}>{interview.title}</Text>
                <Text style={{ color: theme.muted, fontSize: 12 }}>
                  {new Date(interview.startsAt).toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {app ? ` · ${app.jobTitle}` : ""}
                </Text>
              </View>
            </View>
          );
        })
      ) : (
        <Card>
          <Empty title="No upcoming interviews" body="Schedule interviews on web Career — they sync here." />
        </Card>
      )}

      <Text style={[styles.section, { color: theme.text }]}>Recent activity</Text>
      {metrics.recentActivity.length ? (
        metrics.recentActivity.slice(0, 8).map((entry) => (
          <View
            key={entry.id}
            style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <Feather name="activity" size={16} color={theme.muted} />
            <View style={styles.grow}>
              <Text style={{ color: theme.text, fontWeight: "600" }}>{entry.summary}</Text>
              <Text style={{ color: theme.muted, fontSize: 11 }}>
                {new Date(entry.occurredAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          </View>
        ))
      ) : (
        <Card>
          <Empty title="No activity yet" body="Creating or moving applications will show up here." />
        </Card>
      )}
    </>
  );

  const applicationsView = (
    <>
      <View style={[styles.searchRow, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        <Feather name="search" size={16} color={theme.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search title or company"
          placeholderTextColor={theme.muted}
          style={[styles.searchInput, { color: theme.text }]}
        />
      </View>
      {apps.length ? (
        apps.map(renderAppRow)
      ) : (
        <Card>
          <Empty title="No applications" body="Track a role to start your job search pipeline." />
          <View style={{ marginTop: 12 }}>
            <ActionButton label="Add application" icon="plus" quiet onPress={() => setComposerOpen(true)} />
          </View>
        </Card>
      )}
      {selected ? (
        <Card>
          <Text style={{ color: theme.text, fontWeight: "800" }}>{selected.jobTitle}</Text>
          <Text style={{ color: theme.muted, fontSize: 13, marginTop: 4 }}>
            {companyName(hub, selected.companyId)} · {stageLabel(selected.stageId)}
          </Text>
          {selected.nextAction ? (
            <Text style={{ color: theme.text, marginTop: 8 }}>Next: {selected.nextAction}</Text>
          ) : null}
          <View style={[styles.quickRow, { marginTop: 12 }]}>
            <ActionButton label="Move stage" icon="git-branch" quiet onPress={() => openStagePicker(selected)} />
            <ActionButton label="Delete" icon="trash-2" quiet danger onPress={() => confirmRemoveApp(selected)} />
          </View>
        </Card>
      ) : null}
    </>
  );

  const pipelineView = (
    <>
      {PIPELINE_STAGES.map((stage) => {
        const stageApps = hub.applications.filter((a) => a.stageId === stage.id);
        return (
          <View key={stage.id} style={{ gap: 8 }}>
            <View style={styles.sectionRow}>
              <Text style={[styles.section, { color: theme.text, marginTop: 0 }]}>{stage.name}</Text>
              <Text style={{ color: theme.muted, fontWeight: "700", fontSize: 12 }}>{stageApps.length}</Text>
            </View>
            {stageApps.length ? (
              stageApps.map(renderAppRow)
            ) : (
              <View style={[styles.emptyLane, { borderColor: theme.border }]}>
                <Text style={{ color: theme.muted, fontSize: 12 }}>Empty</Text>
              </View>
            )}
          </View>
        );
      })}
    </>
  );

  const interviewsView = (
    <>
      {upcoming.length || hub.interviews.length ? (
        [...hub.interviews]
          .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
          .map((interview) => {
            const app = hub.applications.find((a) => a.id === interview.applicationId);
            return (
              <View
                key={interview.id}
                style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <Feather name="video" size={16} color={theme.accent} />
                <View style={styles.grow}>
                  <Text style={{ color: theme.text, fontWeight: "700" }}>{interview.title}</Text>
                  <Text style={{ color: theme.muted, fontSize: 12 }}>
                    {new Date(interview.startsAt).toLocaleString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {app ? ` · ${app.jobTitle} @ ${companyName(hub, app.companyId)}` : ""}
                    {interview.outcome ? ` · ${interview.outcome}` : ""}
                  </Text>
                </View>
              </View>
            );
          })
      ) : (
        <Card>
          <Empty
            title="No interviews yet"
            body="Add interviews from the web Career hub for now — they sync to this list."
          />
        </Card>
      )}
    </>
  );

  const body =
    view === "overview"
      ? overview
      : view === "applications"
        ? applicationsView
        : view === "pipeline"
          ? pipelineView
          : interviewsView;

  return (
    <Page>
      <ScrollView
        contentContainerStyle={[styles.screen, { paddingBottom: tabBarPad }]}
        scrollIndicatorInsets={{ bottom: tabBarPad }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.grow}>
            <Eyebrow>CAREER · JOB SEEKER OS</Eyebrow>
            <Title>Career</Title>
            <Text style={{ color: theme.muted, marginTop: 4 }}>
              {metrics.active} active · {metrics.upcomingInterviews} upcoming interviews
            </Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate("NowTab", { screen: "Settings" })}
            style={[styles.iconBtn, { backgroundColor: theme.soft }]}
          >
            <Feather name="settings" size={18} color={theme.accent} />
          </Pressable>
        </View>

        <View style={styles.quickRow}>
          <ActionButton label="Add application" icon="plus" quiet onPress={() => setComposerOpen(true)} />
          <ActionButton label="Pipeline" icon="columns" quiet onPress={() => setView("pipeline")} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {VIEW_TABS.map((tab) => {
            const on = view === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setView(tab.id)}
                style={[
                  styles.filterChip,
                  {
                    borderColor: on ? theme.accent : theme.border,
                    backgroundColor: on ? theme.soft : "transparent",
                  },
                ]}
              >
                <Text style={{ color: theme.text, fontWeight: "700", fontSize: 12 }}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {body}
        <View style={{ height: tabBarPad }} />
      </ScrollView>

      <Modal visible={composerOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={resetComposer}>
        <View style={[styles.modalPage, { backgroundColor: theme.bg }]}>
          <View style={styles.modalHead}>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: "800" }}>New application</Text>
            <Pressable onPress={resetComposer} hitSlop={10}>
              <Feather name="x" size={22} color={theme.muted} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={[styles.fieldLabel, { color: theme.muted }]}>Job title</Text>
            <TextInput
              value={jobTitle}
              onChangeText={setJobTitle}
              placeholder="Software engineer"
              placeholderTextColor={theme.muted}
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
              autoFocus
            />
            <Text style={[styles.fieldLabel, { color: theme.muted }]}>Company</Text>
            <TextInput
              value={company}
              onChangeText={setCompany}
              placeholder="Acme Inc."
              placeholderTextColor={theme.muted}
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
            />
            <Text style={[styles.fieldLabel, { color: theme.muted }]}>Stage</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {CAREER_STAGES.filter((s) => !s.isTerminal || s.id === "offer").map((stage) => {
                const on = stageId === stage.id;
                return (
                  <Pressable
                    key={stage.id}
                    onPress={() => setStageId(stage.id)}
                    style={[
                      styles.filterChip,
                      {
                        borderColor: on ? theme.accent : theme.border,
                        backgroundColor: on ? theme.soft : theme.surface,
                      },
                    ]}
                  >
                    <Text style={{ color: theme.text, fontWeight: "700", fontSize: 12 }}>{stage.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Text style={[styles.fieldLabel, { color: theme.muted }]}>Priority</Text>
            <View style={styles.quickRow}>
              {PRIORITIES.map((p) => {
                const on = priority === p;
                return (
                  <Pressable
                    key={p}
                    onPress={() => setPriority(p)}
                    style={[
                      styles.filterChip,
                      {
                        borderColor: on ? theme.accent : theme.border,
                        backgroundColor: on ? theme.soft : theme.surface,
                      },
                    ]}
                  >
                    <Text style={{ color: theme.text, fontWeight: "700", fontSize: 12 }}>{p}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ marginTop: 16 }}>
              <ActionButton label="Save application" icon="check" onPress={submitApplication} />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </Page>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  grow: { flex: 1 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterRow: { flexDirection: "row", gap: 8, paddingVertical: 2 },
  filterChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statRow: { flexDirection: "row", gap: 8 },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  section: { fontSize: 15, fontWeight: "800", marginTop: 8 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  // Solid Calendar/Kept border language — 1px theme.border, radius 14.
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  stageDot: { width: 8, height: 8, borderRadius: 4 },
  priorityTag: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "capitalize",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: "hidden",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  emptyLane: {
    borderWidth: 1,
    borderRadius: 14,
    borderStyle: "dashed",
    paddingVertical: 14,
    alignItems: "center",
  },
  modalPage: { flex: 1, paddingTop: 16 },
  modalHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  modalBody: { paddingHorizontal: 16, paddingBottom: 40, gap: 4 },
  fieldLabel: { fontSize: 12, fontWeight: "700", marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
});
