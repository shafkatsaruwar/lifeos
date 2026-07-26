import Feather from "@expo/vector-icons/Feather";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Empty, Page, SegmentedControl } from "../components/UI";
import { useLifeOS } from "../lib/LifeOSContext";
import { toDateKey, uid } from "../lib/helpers";
import type { HubRecord, LifeHubState, SchoolHubState } from "../types";

type LifeKey = keyof LifeHubState;
type SchoolKey = Exclude<keyof SchoolHubState, "profile">;

const CONFIG: Record<string, { title: string; subtitle: string; icon: keyof typeof Feather.glyphMap }> = {
  habits: { title: "Habits", subtitle: "Small actions worth repeating.", icon: "check-circle" },
  recipes: { title: "Recipes", subtitle: "Meals you want to make again.", icon: "coffee" },
  food: { title: "Food storage", subtitle: "What is on hand and what needs restocking.", icon: "archive" },
  exercises: { title: "Exercises", subtitle: "A reusable movement library.", icon: "activity" },
  trainings: { title: "Trainings", subtitle: "Workouts, movement, and recovery.", icon: "activity" },
  trips: { title: "Trips", subtitle: "Ideas, plans, and places ahead.", icon: "map" },
  media: { title: "Books & watchlist", subtitle: "What you are reading and watching.", icon: "book-open" },
  tools: { title: "Useful tools", subtitle: "Links and resources you reach for.", icon: "tool" },
  contacts: { title: "Contacts", subtitle: "People and details worth keeping close.", icon: "user" },
  documents: { title: "Documents", subtitle: "Important links and document references.", icon: "file-text" },
  vault: { title: "Vault references", subtitle: "Secure-manager links only. Never store passwords here.", icon: "lock" },
  gallery: { title: "Gallery", subtitle: "Images and memories you want to keep visible.", icon: "camera" },
  vision: { title: "Vision board", subtitle: "A visual home for what you are building toward.", icon: "image" },
  archive: { title: "Archive", subtitle: "Finished or inactive life records.", icon: "archive" },
  topics: { title: "Topics", subtitle: "Concepts to study, review, or explore.", icon: "bookmark" },
  professors: { title: "Professors", subtitle: "Office hours and contact context.", icon: "users" },
  goals: { title: "Academic goals", subtitle: "Targets for this week, semester, and year.", icon: "flag" },
};

export function HubCollectionScreen() {
  const { theme, workspace, updateLife, updateSchool } = useLifeOS();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const scope = (route.params?.scope ?? "life") as "life" | "school";
  const collection = route.params?.collection as LifeKey | SchoolKey;
  const config = CONFIG[String(collection)] ?? CONFIG.tools;
  const records = (scope === "life"
    ? workspace.life[collection as LifeKey]
    : workspace.school[collection as SchoolKey]) as HubRecord[];
  const [adding, setAdding] = useState(Boolean(route.params?.startAdd));
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState(
    collection === "media" ? "Reading" : collection === "goals" ? "This week" : "",
  );

  const saveRecords = (next: HubRecord[]) => {
    if (scope === "life") {
      return updateLife({ ...workspace.life, [collection]: next });
    }
    return updateSchool({ ...workspace.school, [collection]: next });
  };

  const reset = () => {
    setTitle("");
    setSubtitle("");
    setUrl("");
    setAdding(false);
  };

  const addRecord = async () => {
    if (!title.trim()) return;
    const record: HubRecord = {
      id: uid(),
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      category: category || undefined,
      url: collection === "tools" || collection === "media" || collection === "documents" || collection === "vault" ? url.trim() || undefined : undefined,
      imageUrl: collection === "vision" || collection === "gallery" ? url.trim() || undefined : undefined,
      completedDates: collection === "habits" ? [] : undefined,
      createdAt: new Date().toISOString(),
    };
    await saveRecords([record, ...records]);
    reset();
  };

  const toggleHabit = (record: HubRecord) => {
    const today = toDateKey(new Date());
    const dates = record.completedDates ?? [];
    const nextDates = dates.includes(today) ? dates.filter((date) => date !== today) : [...dates, today];
    saveRecords(records.map((item) => (item.id === record.id ? { ...item, completedDates: nextDates } : item)));
  };

  const remove = (record: HubRecord) => {
    Alert.alert(`Delete ${record.title}?`, "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => saveRecords(records.filter((item) => item.id !== record.id)) },
    ]);
  };

  const today = toDateKey(new Date());
  const isVisual = collection === "vision" || collection === "gallery";

  return (
    <Page edges={["top"]}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Go back" onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Feather name="chevron-left" size={22} color={theme.text} />
        </Pressable>
        <View style={styles.grow}>
          <Text style={[styles.eyebrow, { color: theme.muted }]}>{scope === "life" ? "LIFE OS" : "SCHOOL OS"}</Text>
          <Text style={[styles.title, { color: theme.text }]}>{config.title}</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>{config.subtitle}</Text>
        </View>
        <Pressable
          accessibilityLabel={`Add to ${config.title}`}
          onPress={() => setAdding((value) => !value)}
          style={[styles.addButton, { backgroundColor: theme.text }]}
        >
          <Feather name={adding ? "x" : "plus"} size={19} color={theme.surface} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        {adding ? (
          <View style={[styles.composer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.composerTitle, { color: theme.text }]}>New {config.title.toLowerCase().replace(/s$/, "")}</Text>
            <Text style={[styles.fieldLabel, { color: theme.muted }]}>Name</Text>
            <TextInput
              autoFocus
              value={title}
              onChangeText={setTitle}
              placeholder="Give it a clear name"
              placeholderTextColor={theme.muted}
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            />
            <Text style={[styles.fieldLabel, { color: theme.muted }]}>Details</Text>
            <TextInput
              value={subtitle}
              onChangeText={setSubtitle}
              placeholder={collection === "professors" ? "Email, office hours, or course" : "Optional details"}
              placeholderTextColor={theme.muted}
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            />
            {collection === "media" ? (
              <SegmentedControl
                value={category}
                onChange={setCategory}
                options={[{ key: "Reading", label: "Reading" }, { key: "Watching", label: "Watching" }, { key: "Listening", label: "Listening" }]}
              />
            ) : null}
            {collection === "goals" ? (
              <SegmentedControl
                value={category}
                onChange={setCategory}
                options={[
                  { key: "This week", label: "Week" },
                  { key: "This semester", label: "Semester" },
                  { key: "This year", label: "Year" },
                ]}
              />
            ) : null}
            {collection === "tools" || collection === "media" || collection === "documents" || collection === "vault" || collection === "vision" || collection === "gallery" ? (
              <>
                <Text style={[styles.fieldLabel, { color: theme.muted }]}>
                  {collection === "vision" || collection === "gallery" ? "Image URL" : "Link"}
                </Text>
                <TextInput
                  value={url}
                  onChangeText={setUrl}
                  autoCapitalize="none"
                  keyboardType="url"
                  placeholder="https://"
                  placeholderTextColor={theme.muted}
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                />
              </>
            ) : null}
            <Pressable
              disabled={!title.trim()}
              onPress={addRecord}
              style={[styles.saveButton, { backgroundColor: theme.text, opacity: title.trim() ? 1 : 0.45 }]}
            >
              <Text style={[styles.saveText, { color: theme.surface }]}>Add to {config.title}</Text>
            </Pressable>
          </View>
        ) : null}

        {records.length ? (
          isVisual ? (
            <View style={styles.visionGrid}>
              {records.map((record) => (
                <Pressable
                  key={record.id}
                  onLongPress={() => remove(record)}
                  accessibilityLabel={`${record.title}. Hold to delete.`}
                  style={[styles.visionTile, { backgroundColor: theme.soft, borderColor: theme.border }]}
                >
                  {record.imageUrl ? (
                    <Image source={{ uri: record.imageUrl }} style={styles.visionImage} resizeMode="cover" />
                  ) : (
                    <Feather name="image" size={28} color={theme.accent} />
                  )}
                  <View style={styles.visionLabel}>
                    <Text style={styles.visionText} numberOfLines={2}>{record.title}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={[styles.list, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {records.map((record, index) => {
                const complete = record.completedDates?.includes(today);
                return (
                  <Pressable
                    key={record.id}
                    onPress={() => collection === "habits" ? toggleHabit(record) : record.url ? Linking.openURL(record.url) : undefined}
                    style={[styles.row, index > 0 && { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth }]}
                  >
                    <View style={[
                      styles.rowIcon,
                      { backgroundColor: complete ? `${theme.success}22` : theme.soft },
                    ]}>
                      <Feather
                        name={complete ? "check" : config.icon}
                        size={17}
                        color={complete ? theme.success : theme.accent}
                      />
                    </View>
                    <View style={styles.grow}>
                      <Text style={[styles.rowTitle, { color: theme.text }, complete && styles.done]}>{record.title}</Text>
                      <Text style={[styles.rowMeta, { color: theme.muted }]} numberOfLines={2}>
                        {[record.category, record.subtitle].filter(Boolean).join(" · ") || "No details yet"}
                      </Text>
                    </View>
                    {record.url ? <Feather name="external-link" size={16} color={theme.muted} /> : null}
                    <Pressable
                      accessibilityLabel={`Delete ${record.title}`}
                      hitSlop={10}
                      onPress={() => remove(record)}
                      style={styles.deleteButton}
                    >
                      <Feather name="trash-2" size={16} color={theme.danger} />
                    </Pressable>
                  </Pressable>
                );
              })}
            </View>
          )
        ) : (
          <View style={[styles.emptyWrap, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Empty title={`No ${config.title.toLowerCase()} yet.`} body="Use the plus button to add the first one." />
          </View>
        )}
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 16, paddingTop: 8 },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  addButton: { width: 44, height: 44, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  grow: { flex: 1, minWidth: 0 },
  eyebrow: { fontSize: 10, fontWeight: "800" },
  title: { fontSize: 24, fontWeight: "800", marginTop: 2 },
  subtitle: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  screen: { padding: 16, paddingBottom: 120, gap: 14 },
  composer: { borderWidth: 1, borderRadius: 8, padding: 16, gap: 8 },
  composerTitle: { fontSize: 16, fontWeight: "800", marginBottom: 2 },
  fieldLabel: { fontSize: 11, fontWeight: "700", marginTop: 3 },
  input: { minHeight: 44, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 15 },
  saveButton: { minHeight: 46, borderRadius: 8, alignItems: "center", justifyContent: "center", marginTop: 5 },
  saveText: { fontSize: 14, fontWeight: "800" },
  list: { borderWidth: 1, borderRadius: 8, overflow: "hidden" },
  row: { minHeight: 68, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  rowIcon: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontSize: 14, fontWeight: "800" },
  rowMeta: { fontSize: 12, lineHeight: 16, marginTop: 2 },
  done: { textDecorationLine: "line-through", opacity: 0.65 },
  deleteButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginRight: -10 },
  emptyWrap: { borderWidth: 1, borderRadius: 8, padding: 20 },
  visionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  visionTile: { width: "48.5%", aspectRatio: 0.9, borderWidth: 1, borderRadius: 8, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  visionImage: { width: "100%", height: "100%" },
  visionLabel: { position: "absolute", left: 8, right: 8, bottom: 8, backgroundColor: "rgba(0,0,0,0.62)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6 },
  visionText: { color: "#FFF", fontSize: 12, fontWeight: "800" },
});
