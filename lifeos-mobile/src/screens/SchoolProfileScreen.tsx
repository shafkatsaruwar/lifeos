import Feather from "@expo/vector-icons/Feather";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Page } from "../components/UI";
import { useFloatingTabBarContentPadding } from "../components/FloatingTabBar";
import { useLifeOS } from "../lib/LifeOSContext";

export function SchoolProfileScreen() {
  const tabBarPad = useFloatingTabBarContentPadding(28);
  const { theme, workspace, updateSchool } = useLifeOS();
  const navigation = useNavigation<any>();
  const [major, setMajor] = useState(workspace.school.profile.major ?? "");
  const [minor, setMinor] = useState(workspace.school.profile.minor ?? "");
  const [classOf, setClassOf] = useState(workspace.school.profile.classOf ?? "");

  const save = async () => {
    await updateSchool({
      ...workspace.school,
      profile: {
        major: major.trim() || undefined,
        minor: minor.trim() || undefined,
        classOf: classOf.trim() || undefined,
      },
    });
    navigation.goBack();
  };

  return (
    <Page edges={["top"]}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Go back" onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Feather name="chevron-left" size={22} color={theme.text} />
        </Pressable>
        <View style={styles.grow}>
          <Text style={[styles.eyebrow, { color: theme.muted }]}>SCHOOL OS</Text>
          <Text style={[styles.title, { color: theme.text }]}>Academic profile</Text>
        </View>
      </View>
      <View style={[styles.form, { paddingBottom: tabBarPad }]}>
        <Field label="Major" value={major} onChangeText={setMajor} theme={theme} placeholder="e.g. Computer Science" />
        <Field label="Minor" value={minor} onChangeText={setMinor} theme={theme} placeholder="Optional" />
        <Field label="Class of" value={classOf} onChangeText={setClassOf} theme={theme} placeholder="e.g. 2028" />
        <Pressable onPress={save} style={[styles.save, { backgroundColor: theme.text }]}>
          <Text style={[styles.saveText, { color: theme.surface }]}>Save profile</Text>
        </Pressable>
      </View>
    </Page>
  );
}

function Field({ label, value, onChangeText, placeholder, theme }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; theme: any }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.muted}
        style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingTop: 8 },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  grow: { flex: 1 },
  eyebrow: { fontSize: 10, fontWeight: "800" },
  title: { fontSize: 24, fontWeight: "800", marginTop: 2 },
  form: { padding: 20, gap: 18 },
  field: { gap: 7 },
  label: { fontSize: 13, fontWeight: "800" },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 8, paddingHorizontal: 13, fontSize: 15 },
  save: { minHeight: 50, borderRadius: 8, alignItems: "center", justifyContent: "center", marginTop: 6 },
  saveText: { fontSize: 15, fontWeight: "800" },
});
