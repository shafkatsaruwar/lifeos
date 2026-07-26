import { StatusBar } from "expo-status-bar";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import Feather from "@expo/vector-icons/Feather";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { onAuthStateChanged, GoogleAuthProvider, signInWithCredential, signOut, type User } from "firebase/auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { auth, firebaseConfigured, loadWorkspace, saveWorkspacePart } from "./src/lib/firebase";
import type { CalendarEvent, Note, Project, SettingsState, Task, Workspace } from "./src/types";

WebBrowser.maybeCompleteAuthSession();

const Tab = createBottomTabNavigator();

const LIGHT = { bg: "#F7F7F5", surface: "#FFFFFF", text: "#242326", muted: "#77747E", border: "#E8E6EC", accent: "#6D5DFB", danger: "#D95754", soft: "#F1EFFF" };
const DARK = { bg: "#121216", surface: "#1C1C22", text: "#F7F5FA", muted: "#B4B0BD", border: "#313038", accent: "#9A8DFF", danger: "#FF7770", soft: "#29243C" };

type Theme = typeof LIGHT;
type AppState = {
  user: User;
  workspace: Workspace;
  theme: Theme;
  dark: boolean;
  sync: () => Promise<void>;
  updateTasks: (next: Task[]) => Promise<void>;
  updateProjects: (next: Project[]) => Promise<void>;
  updateNotes: (next: Note[]) => Promise<void>;
  updateSettings: (next: SettingsState) => Promise<void>;
};

let sharedState: AppState | null = null;
function useLifeOS() {
  if (!sharedState) throw new Error("LifeOS has not loaded yet");
  return sharedState;
}

function formatDate(value?: string) {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function taskIsOpen(task: Task) {
  return !task.done && !task.canceled && task.status !== "Done" && task.status !== "Canceled";
}

function taskRemaining(task: Task) {
  const baseline = task.focusRemainingSeconds ?? (task.focusMinutes ?? 25) * 60;
  if (!task.focusSessionRunning || !task.focusUpdatedAt) return Math.max(0, baseline);
  const elapsed = Math.floor((Date.now() - new Date(task.focusUpdatedAt).getTime()) / 1000);
  return Math.max(0, baseline - elapsed);
}

function durationText(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function Page({ children }: { children: React.ReactNode }) {
  const { theme } = useLifeOS();
  return <SafeAreaView style={[styles.page, { backgroundColor: theme.bg }]} edges={["top"]}>{children}</SafeAreaView>;
}

function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  const { theme } = useLifeOS();
  return <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, style]}>{children}</View>;
}

function ActionButton({ label, icon, onPress, quiet = false }: { label: string; icon?: keyof typeof Feather.glyphMap; onPress: () => void; quiet?: boolean }) {
  const { theme } = useLifeOS();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.action, { backgroundColor: quiet ? theme.surface : theme.text, borderColor: quiet ? theme.border : theme.text, opacity: pressed ? 0.75 : 1 }]}>
      {icon ? <Feather name={icon} size={16} color={quiet ? theme.text : theme.surface} /> : null}
      <Text style={[styles.actionText, { color: quiet ? theme.text : theme.surface }]}>{label}</Text>
    </Pressable>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  const { theme } = useLifeOS();
  return <View style={styles.empty}><Text style={[styles.emptyTitle, { color: theme.text }]}>{title}</Text><Text style={[styles.emptyBody, { color: theme.muted }]}>{body}</Text></View>;
}

function GoogleSignInButton() {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type !== "success") return;
    const idToken = response.params.id_token;
    if (!idToken) {
      Alert.alert("Google sign-in did not return an ID token", "Check that the mobile OAuth client IDs are in your .env file.");
      return;
    }
    signInWithCredential(auth, GoogleAuthProvider.credential(idToken)).catch((error) => Alert.alert("Could not sign in", error.message));
  }, [response]);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={!request}
      onPress={() => promptAsync()}
      style={({ pressed }) => [styles.signInButton, { opacity: pressed ? 0.8 : (!request ? 0.45 : 1) }]}
    >
      <Feather name="log-in" size={18} color="#FFF" />
      <Text style={styles.signInButtonText}>Continue with Google</Text>
    </Pressable>
  );
}

function SignIn() {
  const dark = useColorScheme() === "dark";
  const theme = dark ? DARK : LIGHT;
  const googleConfigured = Boolean(
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
    && process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  );

  return (
    <SafeAreaView style={[styles.signIn, { backgroundColor: "#111115" }]}>
      <StatusBar style="light" />
      <View style={styles.signInInner}>
        <View style={[styles.logo, { backgroundColor: "#6D5DFB" }]}><Feather name="activity" size={26} color="#FFF" /></View>
        <Text style={styles.signInTitle}>LifeOS</Text>
        <Text style={styles.signInCopy}>Your life, in focus. The same private cloud data you already use on the web.</Text>
        {firebaseConfigured && googleConfigured ? <GoogleSignInButton /> : <View style={[styles.signInButton, { opacity: 0.45 }]}><Feather name="log-in" size={18} color="#FFF" /><Text style={styles.signInButtonText}>Continue with Google</Text></View>}
        {!firebaseConfigured ? <Text style={[styles.setupText, { color: theme.muted }]}>Add the Firebase values to your local .env file first.</Text> : null}
        {firebaseConfigured && !googleConfigured ? <Text style={[styles.setupText, { color: theme.muted }]}>Firebase is connected. Add your iPhone and web Google client IDs to enable sign-in.</Text> : null}
      </View>
    </SafeAreaView>
  );
}

function NowScreen() {
  const { workspace, theme, updateSettings, updateTasks } = useLifeOS();
  const [focusOpen, setFocusOpen] = useState(false);
  const current = workspace.tasks.find((task) => task.id === workspace.settings.nowTaskId && taskIsOpen(task));
  const suggestions = workspace.tasks.filter(taskIsOpen).filter((task) => task.id !== current?.id).sort((a, b) => {
    const priority = { High: 0, Medium: 1, Low: 2 };
    return (priority[a.priority ?? "Medium"] - priority[b.priority ?? "Medium"]) || String(a.due ?? "9999").localeCompare(String(b.due ?? "9999"));
  }).slice(0, 4);
  const greeting = workspace.settings.preferredName ? `Hey, ${workspace.settings.preferredName}.` : "Hey there.";

  return <Page><ScrollView contentContainerStyle={styles.screen}>
    <Text style={[styles.eyebrow, { color: theme.muted }]}>ONE THING, ON PURPOSE</Text>
    <Text style={[styles.title, { color: theme.text }]}>{greeting}</Text>
    <Text style={[styles.subtitle, { color: theme.muted }]}>LifeOS can suggest the next move. You still choose what gets your attention.</Text>
    <Card>
      <View style={styles.cardHeader}><Text style={[styles.cardLabel, { color: theme.text }]}>Now</Text>{current ? <Pressable onPress={() => updateSettings({ ...workspace.settings, nowTaskId: null })}><Text style={[styles.link, { color: theme.accent }]}>Clear</Text></Pressable> : null}</View>
      {current ? <>
        <Text style={[styles.taskTitle, { color: theme.text }]}>{current.title}</Text>
        <Text style={[styles.taskMeta, { color: theme.muted }]}>{current.project || "Personal"} · {current.focusMinutes ?? 25} min · {current.energy ?? "Medium"} energy</Text>
        <View style={styles.row}><ActionButton label="Focus" icon="target" onPress={() => setFocusOpen(true)} /><ActionButton label="Mark done" icon="check" quiet onPress={() => updateTasks(workspace.tasks.map(task => task.id === current.id ? { ...task, done: true, status: "Done", focusSessionRunning: false } : task))} /></View>
      </> : <Empty title="Nothing is claiming your attention." body="Pick a good next choice when you’re ready." />}
    </Card>
    <Text style={[styles.sectionTitle, { color: theme.text }]}>Good next choices</Text>
    {suggestions.length ? suggestions.map((task) => <Pressable key={task.id} onPress={() => updateSettings({ ...workspace.settings, nowTaskId: task.id })} style={({ pressed }) => [styles.choice, { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}>
      <View style={[styles.dot, { backgroundColor: task.color || theme.accent }]} /><View style={styles.grow}><Text style={[styles.choiceTitle, { color: theme.text }]}>{task.title}</Text><Text style={[styles.choiceMeta, { color: theme.muted }]}>{task.project || "Personal"} · Due {formatDate(task.due)} · {task.focusMinutes ?? 25} min</Text></View><Feather name="arrow-up-right" size={18} color={theme.muted} />
    </Pressable>) : <Card><Empty title="You’re clear." body="Add a task on the web or capture a thought when something new arrives." /></Card>}
    {current ? <FocusModal visible={focusOpen} task={current} onClose={() => setFocusOpen(false)} /> : null}
  </ScrollView></Page>;
}

function FocusModal({ visible, task, onClose }: { visible: boolean; task: Task; onClose: () => void }) {
  const { workspace, theme, updateTasks } = useLifeOS();
  const [remaining, setRemaining] = useState(taskRemaining(task));
  const [running, setRunning] = useState(Boolean(task.focusSessionRunning));
  useEffect(() => { setRemaining(taskRemaining(task)); setRunning(Boolean(task.focusSessionRunning)); }, [task, visible]);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);
  useEffect(() => { if (remaining === 0 && running) { setRunning(false); } }, [remaining, running]);
  const persist = (nextRemaining: number, nextRunning: boolean) => updateTasks(workspace.tasks.map(item => item.id === task.id ? { ...item, focusRemainingSeconds: nextRemaining, focusSessionRunning: nextRunning, focusUpdatedAt: new Date().toISOString() } : item));
  const toggle = () => { const next = !running; setRunning(next); persist(remaining, next); };
  const finish = () => { updateTasks(workspace.tasks.map(item => item.id === task.id ? { ...item, done: true, status: "Done", focusSessionRunning: false, focusRemainingSeconds: remaining } : item)); onClose(); };
  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
    <SafeAreaView style={[styles.focusPage, { backgroundColor: "#111115" }]}><StatusBar style="light" />
      <View style={styles.focusHeader}><Pressable onPress={onClose} style={styles.closeButton}><Feather name="chevron-down" color="#FFF" size={24} /></Pressable><Text style={styles.focusHeaderText}>Focus in progress</Text><View style={{ width: 44 }} /></View>
      <View style={styles.focusBody}><Text style={styles.focusSpace}>{task.project || "Personal"}</Text><Text style={styles.focusTitle}>{task.title}</Text><Text style={styles.focusSub}>Stay with this one thing. You can leave this screen without pausing the timer.</Text>
        <View style={[styles.timerRing, { borderColor: theme.accent }]}><Text style={styles.timer}>{durationText(remaining)}</Text><Text style={styles.timerSub}>{running ? "In progress" : "Paused"}</Text></View>
        <Pressable onPress={toggle} style={[styles.focusMainButton, { backgroundColor: theme.accent }]}><Feather name={running ? "pause" : "play"} size={20} color="#FFF" /><Text style={styles.focusMainText}>{running ? "Pause & save" : "Resume focus"}</Text></Pressable>
        <Pressable onPress={finish} style={styles.focusDoneButton}><Feather name="check" size={18} color="#78E0AF" /><Text style={styles.focusDoneText}>Mark task as done</Text></Pressable>
      </View>
    </SafeAreaView>
  </Modal>;
}

function TodayScreen() {
  const { workspace, theme, updateTasks } = useLifeOS();
  const now = new Date();
  const upcoming = workspace.calendar.filter((event) => new Date(event.start).getTime() >= now.getTime() - 86400000).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()).slice(0, 10);
  const datedTasks = workspace.tasks.filter(taskIsOpen).filter((task) => task.due).sort((a,b) => String(a.due).localeCompare(String(b.due))).slice(0, 8);
  const eventToTask = (event: CalendarEvent) => {
    const already = workspace.tasks.some((task) => task.calendarEventId === event.id);
    if (already) return Alert.alert("Already added", "This calendar event already has a LifeOS task.");
    Alert.alert("Create a task?", `Make “${event.title}” an optional LifeOS task?`, [{ text: "Not now", style: "cancel" }, { text: "Create task", onPress: () => updateTasks([...workspace.tasks, { id: Date.now(), title: event.title, due: event.start, startTime: new Date(event.start).toISOString(), project: "Personal", priority: "Medium", energy: "Medium", focusMinutes: 30, status: "Not started", calendarEventId: event.id, color: event.color || theme.accent }]) }]);
  };
  return <Page><ScrollView contentContainerStyle={styles.screen}>
    <Text style={[styles.eyebrow, { color: theme.muted }]}>PROTECT YOUR TIME</Text><Text style={[styles.title, { color: theme.text }]}>Today</Text><Text style={[styles.subtitle, { color: theme.muted }]}>Your timeline, calendar, and ready work in one calm planning layer.</Text>
    <Card><Text style={[styles.sectionTitle, { color: theme.text }]}>What’s coming up</Text>{upcoming.length ? upcoming.map((event) => <Pressable key={event.id} onPress={() => eventToTask(event)} style={[styles.eventRow, { borderColor: theme.border }]}><View style={[styles.eventDay, { backgroundColor: theme.soft }]}><Text style={[styles.eventDate, { color: theme.accent }]}>{formatDate(event.start)}</Text></View><View style={styles.grow}><Text style={[styles.choiceTitle, { color: theme.text }]}>{event.title}</Text><Text style={[styles.choiceMeta, { color: theme.muted }]}>{new Date(event.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · {event.source || "Calendar"} · Tap to make task</Text></View><Feather name="plus" size={18} color={theme.accent} /></Pressable>) : <Empty title="Nothing scheduled." body="Your imported calendars and due tasks will show up here." />}</Card>
    <Text style={[styles.sectionTitle, { color: theme.text }]}>Due tasks</Text><Card>{datedTasks.length ? datedTasks.map(task => <View key={task.id} style={[styles.eventRow, { borderColor: theme.border }]}><View style={[styles.dot, { backgroundColor: task.color || theme.accent }]} /><View style={styles.grow}><Text style={[styles.choiceTitle, { color: theme.text }]}>{task.title}</Text><Text style={[styles.choiceMeta, { color: theme.muted }]}>Due {formatDate(task.due)} · {task.project || "Personal"}</Text></View></View>) : <Empty title="No dated tasks." body="Keep the day breathable." />}</Card>
  </ScrollView></Page>;
}

function SpacesScreen() {
  const { workspace, theme, updateProjects } = useLifeOS();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const addProject = () => { const clean = name.trim(); if (!clean) return; updateProjects([...workspace.projects, { name: clean, desc: "", color: theme.accent, iconName: "folder", kind: "finishable", progress: 0 }]); setName(""); setModalOpen(false); };
  return <Page><ScrollView contentContainerStyle={styles.screen}>
    <View style={styles.titleRow}><View><Text style={[styles.eyebrow, { color: theme.muted }]}>EVERYTHING HAS ONE HOME</Text><Text style={[styles.title, { color: theme.text }]}>Spaces</Text></View><ActionButton label="New" icon="plus" onPress={() => setModalOpen(true)} /></View>
    <Text style={[styles.subtitle, { color: theme.muted }]}>Projects, classes, and ongoing life areas—without making you use a million folders.</Text>
    <View style={styles.spaceGrid}>{workspace.projects.map((project) => <Card key={project.name} style={styles.spaceCard}><View style={[styles.iconBox, { backgroundColor: `${project.color || theme.accent}20` }]}><Feather name="folder" size={22} color={project.color || theme.accent} /></View><Text style={[styles.spaceTitle, { color: theme.text }]}>{project.name}</Text><Text style={[styles.choiceMeta, { color: theme.muted }]}>{workspace.tasks.filter(t => t.project === project.name && taskIsOpen(t)).length} open tasks · {project.kind || "project"}</Text></Card>)}</View>
    <Text style={[styles.sectionTitle, { color: theme.text }]}>Classes</Text><Card>{workspace.classes.length ? workspace.classes.map((course) => <View key={course.id} style={[styles.eventRow, { borderColor: theme.border }]}><View style={[styles.iconBox, { backgroundColor: `${course.color || theme.accent}20` }]}><Feather name="book-open" size={20} color={course.color || theme.accent} /></View><View style={styles.grow}><Text style={[styles.choiceTitle, { color: theme.text }]}>{course.code} · {course.name}</Text><Text style={[styles.choiceMeta, { color: theme.muted }]}>{course.term || "Current class"}</Text></View></View>) : <Empty title="No classes yet." body="Your web classes will appear here automatically." />}</Card>
    <Modal visible={modalOpen} transparent animationType="fade"><View style={styles.modalBackdrop}><View style={[styles.modalCard, { backgroundColor: theme.surface }]}><Text style={[styles.modalTitle, { color: theme.text }]}>New space</Text><Text style={[styles.subtitle, { color: theme.muted }]}>Give it a simple name. You can fine-tune it later on the web.</Text><TextInput value={name} onChangeText={setName} autoFocus placeholder="e.g. Photography" placeholderTextColor={theme.muted} style={[styles.input, { color: theme.text, borderColor: theme.border }]} /><View style={styles.row}><ActionButton label="Cancel" quiet onPress={() => setModalOpen(false)} /><ActionButton label="Create space" onPress={addProject} /></View></View></View></Modal>
  </ScrollView></Page>;
}

function LibraryScreen() {
  const { workspace, theme, updateNotes } = useLifeOS();
  const [selectedId, setSelectedId] = useState<string | null>(workspace.notes[0]?.id ?? null);
  const selected = workspace.notes.find((note) => note.id === selectedId);
  const createNote = () => { const note: Note = { id: String(Date.now()), title: "Untitled note", body: "", template: "blank", updatedAt: new Date().toISOString() }; updateNotes([note, ...workspace.notes]); setSelectedId(note.id); };
  const editNote = (patch: Partial<Note>) => { if (!selected) return; updateNotes(workspace.notes.map(note => note.id === selected.id ? { ...note, ...patch, updatedAt: new Date().toISOString() } : note)); };
  return <Page><View style={styles.libraryPage}>
    <View style={[styles.noteList, { backgroundColor: theme.surface, borderColor: theme.border }]}><View style={styles.noteListHead}><Text style={[styles.sectionTitle, { color: theme.text }]}>Notes</Text><Pressable accessibilityLabel="Create note" onPress={createNote} style={[styles.smallRound, { backgroundColor: theme.text }]}><Feather name="plus" color={theme.surface} size={19} /></Pressable></View><FlatList data={workspace.notes} keyExtractor={item => item.id} renderItem={({ item }) => <Pressable onPress={() => setSelectedId(item.id)} style={[styles.noteItem, selectedId === item.id && { borderLeftColor: theme.accent, backgroundColor: theme.soft }]}><Text numberOfLines={1} style={[styles.choiceTitle, { color: theme.text }]}>{item.title}</Text><Text numberOfLines={2} style={[styles.choiceMeta, { color: theme.muted }]}>{item.body || "Empty note"}</Text></Pressable>} ListEmptyComponent={<Empty title="No notes yet." body="Start with a tiny thought." />} /></View>
    <View style={[styles.noteEditor, { backgroundColor: theme.bg }]}>{selected ? <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.grow}><TextInput value={selected.title} onChangeText={(title) => editNote({ title })} placeholder="Untitled note" placeholderTextColor={theme.muted} style={[styles.noteTitleInput, { color: theme.text }]} /><Text style={[styles.noteHint, { color: theme.muted }]}>Saved to your private LifeOS cloud</Text><TextInput value={selected.body} onChangeText={(body) => editNote({ body })} placeholder="Start writing…" placeholderTextColor={theme.muted} multiline textAlignVertical="top" style={[styles.noteBody, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]} /></KeyboardAvoidingView> : <Empty title="Pick or create a note." body="Your existing web notes show up here." />}</View>
  </View></Page>;
}

function SettingsScreen() {
  const { user, workspace, theme, dark, updateSettings, sync } = useLifeOS();
  const [name, setName] = useState(workspace.settings.preferredName ?? "");
  const saveName = () => updateSettings({ ...workspace.settings, preferredName: name.trim() || undefined });
  return <Page><ScrollView contentContainerStyle={styles.screen}>
    <Text style={[styles.eyebrow, { color: theme.muted }]}>YOUR LIFEOS</Text><Text style={[styles.title, { color: theme.text }]}>Settings</Text>
    <Card><Text style={[styles.cardLabel, { color: theme.text }]}>Profile</Text><Text style={[styles.choiceMeta, { color: theme.muted }]}>{user.email}</Text><TextInput value={name} onChangeText={setName} onBlur={saveName} placeholder="What should we call you?" placeholderTextColor={theme.muted} style={[styles.input, { color: theme.text, borderColor: theme.border, marginTop: 16 }]} /></Card>
    <Card><View style={styles.settingRow}><View style={styles.grow}><Text style={[styles.choiceTitle, { color: theme.text }]}>Match device theme</Text><Text style={[styles.choiceMeta, { color: theme.muted }]}>LifeOS follows your phone’s appearance.</Text></View><Switch value={dark} disabled /></View></Card>
    <Card><Text style={[styles.cardLabel, { color: theme.text }]}>Data</Text><Text style={[styles.choiceMeta, { color: theme.muted }]}>Your mobile app reads and updates the exact same private Firebase data as LifeOS on the web.</Text><View style={[styles.row, { marginTop: 16 }]}><ActionButton label="Sync now" icon="refresh-cw" quiet onPress={sync} /><ActionButton label="Sign out" icon="log-out" quiet onPress={() => signOut(auth)} /></View></Card>
  </ScrollView></Page>;
}

function OnboardingName() {
  const { workspace, theme, updateSettings } = useLifeOS();
  const [name, setName] = useState("");
  if (workspace.settings.preferredName) return null;
  return <Modal visible transparent animationType="fade"><View style={styles.modalBackdrop}><View style={[styles.modalCard, { backgroundColor: theme.surface }]}><View style={[styles.iconBox, { backgroundColor: theme.soft }]}><Feather name="smile" size={22} color={theme.accent} /></View><Text style={[styles.modalTitle, { color: theme.text }]}>What should we call you?</Text><Text style={[styles.subtitle, { color: theme.muted }]}>LifeOS will use this in your greeting. You can change it anytime.</Text><TextInput value={name} onChangeText={setName} autoFocus placeholder="Your name" placeholderTextColor={theme.muted} style={[styles.input, { color: theme.text, borderColor: theme.border }]} /><ActionButton label="Continue" onPress={() => { if (name.trim()) updateSettings({ ...workspace.settings, preferredName: name.trim() }); }} /></View></View></Modal>;
}

function MainApp({ state }: { state: AppState }) {
  sharedState = state;
  const navTheme = state.dark ? DarkTheme : DefaultTheme;
  navTheme.colors.background = state.theme.bg;
  navTheme.colors.card = state.theme.surface;
  navTheme.colors.text = state.theme.text;
  return <NavigationContainer theme={navTheme}><StatusBar style={state.dark ? "light" : "dark"} /><Tab.Navigator screenOptions={({ route }) => ({ headerShown: false, tabBarStyle: { backgroundColor: state.theme.surface, borderTopColor: state.theme.border, height: 72, paddingTop: 8 }, tabBarActiveTintColor: state.theme.accent, tabBarInactiveTintColor: state.theme.muted, tabBarLabelStyle: { fontWeight: "700", fontSize: 11 }, tabBarIcon: ({ color, size }) => { const icons: Record<string, keyof typeof Feather.glyphMap> = { Now: "target", Today: "calendar", Spaces: "grid", Library: "book-open", Settings: "sliders" }; return <Feather name={icons[route.name]} size={size} color={color} />; } })}><Tab.Screen name="Now" component={NowScreen} /><Tab.Screen name="Today" component={TodayScreen} /><Tab.Screen name="Spaces" component={SpacesScreen} /><Tab.Screen name="Library" component={LibraryScreen} /><Tab.Screen name="Settings" component={SettingsScreen} /></Tab.Navigator><OnboardingName /></NavigationContainer>;
}

export default function App() {
  const systemDark = useColorScheme() === "dark";
  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const theme = systemDark ? DARK : LIGHT;
  useEffect(() => onAuthStateChanged(auth, (nextUser) => { setUser(nextUser); setLoading(false); if (!nextUser) setWorkspace(null); }), []);
  const sync = useCallback(async () => { if (!user) return; setWorkspace(await loadWorkspace(user.uid)); }, [user]);
  useEffect(() => { if (user) sync().catch((error) => Alert.alert("Could not load LifeOS", error.message)); }, [user, sync]);
  const savePart = useCallback(async <K extends keyof Workspace>(key: K, value: Workspace[K]) => { if (!user || !workspace) return; setWorkspace({ ...workspace, [key]: value }); try { await saveWorkspacePart(user.uid, key, value); } catch (error: any) { Alert.alert("Could not save", error.message); } }, [user, workspace]);
  if (loading || (user && !workspace)) return <SafeAreaProvider><SafeAreaView style={[styles.loader, { backgroundColor: theme.bg }]}><ActivityIndicator color={theme.accent} /><Text style={[styles.choiceMeta, { color: theme.muted, marginTop: 12 }]}>Opening LifeOS…</Text></SafeAreaView></SafeAreaProvider>;
  if (!user) return <SafeAreaProvider><SignIn /></SafeAreaProvider>;
  const state: AppState = { user, workspace: workspace!, theme, dark: systemDark, sync, updateTasks: (value) => savePart("tasks", value), updateProjects: (value) => savePart("projects", value), updateNotes: (value) => savePart("notes", value), updateSettings: (value) => savePart("settings", value) };
  return <SafeAreaProvider><MainApp state={state} /></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  page: { flex: 1 }, screen: { padding: 20, paddingBottom: 42, gap: 16 }, loader: { flex: 1, alignItems: "center", justifyContent: "center" }, signIn: { flex: 1, justifyContent: "center", padding: 28 }, signInInner: { alignItems: "center", gap: 18 }, logo: { width: 58, height: 58, borderRadius: 19, alignItems: "center", justifyContent: "center" }, signInTitle: { color: "#FFF", fontSize: 42, fontWeight: "800" }, signInCopy: { color: "#B8B5C0", fontSize: 16, lineHeight: 24, textAlign: "center", maxWidth: 310 }, signInButton: { minHeight: 54, alignSelf: "stretch", borderRadius: 15, backgroundColor: "#6D5DFB", flexDirection: "row", gap: 10, alignItems: "center", justifyContent: "center", marginTop: 8 }, signInButtonText: { color: "#FFF", fontWeight: "800", fontSize: 16 }, setupText: { textAlign: "center", fontSize: 13 }, eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.5 }, title: { fontSize: 38, lineHeight: 43, fontWeight: "700", letterSpacing: -1.2 }, subtitle: { fontSize: 15, lineHeight: 22 }, card: { borderWidth: 1, borderRadius: 20, padding: 18, gap: 12 }, cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, cardLabel: { fontSize: 16, fontWeight: "800" }, taskTitle: { fontSize: 26, fontWeight: "700", lineHeight: 32 }, taskMeta: { fontSize: 14, lineHeight: 20 }, row: { flexDirection: "row", gap: 10, flexWrap: "wrap" }, action: { minHeight: 44, paddingHorizontal: 15, borderRadius: 12, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, actionText: { fontSize: 14, fontWeight: "800" }, link: { fontWeight: "800", fontSize: 14 }, empty: { alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 24, paddingHorizontal: 10 }, emptyTitle: { fontSize: 16, fontWeight: "800", textAlign: "center" }, emptyBody: { fontSize: 14, lineHeight: 20, textAlign: "center" }, sectionTitle: { fontSize: 20, fontWeight: "800", marginTop: 8 }, choice: { minHeight: 74, borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }, dot: { width: 10, height: 10, borderRadius: 5 }, grow: { flex: 1 }, choiceTitle: { fontSize: 15, fontWeight: "800", lineHeight: 20 }, choiceMeta: { fontSize: 13, lineHeight: 19, marginTop: 2 }, focusPage: { flex: 1 }, focusHeader: { height: 64, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#303039" }, closeButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" }, focusHeaderText: { color: "#CBC7D4", fontSize: 14, fontWeight: "800" }, focusBody: { flex: 1, padding: 28, alignItems: "center", gap: 18, justifyContent: "center" }, focusSpace: { color: "#A79DFF", fontSize: 13, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1.2 }, focusTitle: { color: "#FFF", fontSize: 34, fontWeight: "700", lineHeight: 42, textAlign: "center" }, focusSub: { color: "#AAA6B3", fontSize: 15, textAlign: "center", lineHeight: 22 }, timerRing: { width: 240, height: 240, borderRadius: 120, borderWidth: 7, alignItems: "center", justifyContent: "center", marginVertical: 12 }, timer: { color: "#FFF", fontSize: 58, fontWeight: "800", fontVariant: ["tabular-nums"] }, timerSub: { color: "#AAA6B3", marginTop: 8 }, focusMainButton: { minHeight: 58, borderRadius: 16, alignSelf: "stretch", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10 }, focusMainText: { color: "#FFF", fontSize: 16, fontWeight: "800" }, focusDoneButton: { minHeight: 48, alignSelf: "stretch", borderRadius: 14, borderWidth: 1, borderColor: "#255A47", flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" }, focusDoneText: { color: "#78E0AF", fontWeight: "800" }, eventRow: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, paddingVertical: 10 }, eventDay: { width: 58, paddingVertical: 8, borderRadius: 10, alignItems: "center" }, eventDate: { fontSize: 12, fontWeight: "800", textAlign: "center" }, titleRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }, spaceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 }, spaceCard: { width: "47%", minHeight: 152, justifyContent: "space-between" }, iconBox: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" }, spaceTitle: { fontSize: 18, fontWeight: "800" }, modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", padding: 24, justifyContent: "center" }, modalCard: { borderRadius: 22, padding: 22, gap: 16 }, modalTitle: { fontSize: 25, fontWeight: "800" }, input: { minHeight: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 16 }, libraryPage: { flex: 1, flexDirection: "row" }, noteList: { width: "39%", borderRightWidth: 1 }, noteListHead: { padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, smallRound: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" }, noteItem: { padding: 14, gap: 4, borderLeftWidth: 3, borderLeftColor: "transparent" }, noteEditor: { flex: 1, padding: 18 }, noteTitleInput: { fontSize: 28, fontWeight: "700", padding: 0, marginBottom: 8 }, noteHint: { fontSize: 12, marginBottom: 14 }, noteBody: { flex: 1, minHeight: 300, borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 16, lineHeight: 25 }, settingRow: { flexDirection: "row", alignItems: "center", gap: 12 },
});
