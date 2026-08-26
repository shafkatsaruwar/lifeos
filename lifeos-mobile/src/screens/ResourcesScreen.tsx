import Feather from "@expo/vector-icons/Feather";
import * as DocumentPicker from "expo-document-picker";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Empty, Eyebrow, Page, Subtitle, Title } from "../components/UI";
import { useFloatingTabBarContentPadding } from "../components/FloatingTabBar";
import { LibrarySubNav } from "../components/LibrarySubNav";
import { useLifeOS } from "../lib/LifeOSContext";
import { formatResourceSize, uid } from "../lib/helpers";
import type { Resource } from "../types";

// Viewing/opening resources is fully implemented (opens the stored URL in
// the system browser / viewer). Uploading is the stretch goal called out in
// the task spec: this mobile build supports PICKING a file via
// expo-document-picker and recording its local metadata, but does not
// upload bytes to Firebase Storage the way the web client's fileStorage.ts
// does (that requires wiring a Storage bucket + resumable upload, which is
// out of scope for a code-only pass with no way to test against a live
// bucket). The picked file is stored with storage:"local" and its on-device
// URI so a future pass can wire the actual upload.
export function ResourcesScreen() {
  const { theme, workspace, updateResources } = useLifeOS();
  const tabBarPad = useFloatingTabBarContentPadding(28);
  const [uploading, setUploading] = useState(false);

  const grouped = groupByClassOrProject(workspace.resources, workspace);

  const openResource = async (resource: Resource) => {
    try {
      await WebBrowser.openBrowserAsync(resource.url);
    } catch {
      Alert.alert("Could not open file", "This resource's link could not be opened.");
    }
  };

  const deleteResource = (resource: Resource) => {
    Alert.alert("Delete file", `Delete ${resource.name}? This removes it permanently.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => updateResources(workspace.resources.filter((r) => r.id !== resource.id)) },
    ]);
  };

  const pickAndAdd = async () => {
    setUploading(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({ multiple: false, copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const resource: Resource = {
        id: uid(),
        name: asset.name,
        type: asset.mimeType || "application/octet-stream",
        size: asset.size ?? 0,
        url: asset.uri,
        uploadedAt: new Date().toISOString(),
        storage: "local",
      };
      updateResources([resource, ...workspace.resources]);
    } catch {
      Alert.alert("Couldn't add file", "Try picking the file again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Page>
      <View style={styles.header}>
        <View style={styles.grow}>
          <Eyebrow>EVERYTHING YOU NEED</Eyebrow>
          <Title>Resources</Title>
          <Subtitle>Syllabi, slides, readings, and reference files.</Subtitle>
        </View>
        <Pressable onPress={pickAndAdd} disabled={uploading} style={[styles.addButton, { backgroundColor: theme.text, opacity: uploading ? 0.6 : 1 }]}>
          <Feather name="upload" size={17} color={theme.surface} />
        </Pressable>
      </View>

      <LibrarySubNav active="resources" />

      <FlatList
        data={grouped}
        keyExtractor={(g) => g.label}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarPad }]}
        renderItem={({ item: group }) => (
          <View style={styles.groupBlock}>
            <Text style={[styles.groupLabel, { color: theme.muted }]}>{group.label}</Text>
            {group.resources.map((resource) => (
              <View key={resource.id} style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={[styles.iconWrap, { backgroundColor: theme.soft }]}>
                  <Feather name="file-text" size={16} color={theme.accent} />
                </View>
                <Pressable style={styles.grow} onPress={() => openResource(resource)}>
                  <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{resource.name}</Text>
                  <Text style={[styles.meta, { color: theme.muted }]}>
                    {formatResourceSize(resource.size)} · {new Date(resource.uploadedAt).toLocaleDateString()} · {resource.storage === "local" ? "This device" : "Cloud"}
                  </Text>
                </Pressable>
                <Pressable onPress={() => deleteResource(resource)} style={styles.iconButtonSmall}>
                  <Feather name="trash-2" size={15} color={theme.danger} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
        ListEmptyComponent={<Empty title="No files yet." body="Upload a syllabus, slide deck, or reference file." />}
      />
    </Page>
  );
}

function groupByClassOrProject(resources: Resource[], workspace: { classes: { id: string; code: string }[] }) {
  const groups = new Map<string, Resource[]>();
  resources.forEach((resource) => {
    const cls = workspace.classes.find((c) => c.id === resource.classId);
    const label = cls?.code || resource.projectName || "Unfiled";
    groups.set(label, [...(groups.get(label) ?? []), resource]);
  });
  return Array.from(groups.entries()).map(([label, list]) => ({ label, resources: list }));
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 20, gap: 12 },
  grow: { flex: 1 },
  addButton: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  list: { padding: 20, paddingBottom: 28, gap: 18 },
  groupBlock: { gap: 8 },
  groupLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 14, padding: 12 },
  iconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 14, fontWeight: "700" },
  meta: { fontSize: 11, marginTop: 2 },
  iconButtonSmall: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
});
