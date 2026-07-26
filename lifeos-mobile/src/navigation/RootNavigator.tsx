import Ionicons from "@expo/vector-icons/Ionicons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLifeOS } from "../lib/LifeOSContext";
import { OnboardingName } from "../components/Auth";

import { LifeDashboardScreen } from "../screens/LifeDashboardScreen";
import { SchoolDashboardScreen } from "../screens/SchoolDashboardScreen";
import { NowScreen } from "../screens/NowScreen";
import { TasksScreen } from "../screens/TasksScreen";
import { TaskDetailScreen } from "../screens/TaskDetailScreen";
import { CalendarScreen } from "../screens/CalendarScreen";
import { ConnectWebScreen } from "../screens/ConnectWebScreen";
import { ProjectDetailScreen } from "../screens/ProjectDetailScreen";
import { ClassDetailScreen } from "../screens/ClassDetailScreen";
import { HubCollectionScreen } from "../screens/HubCollectionScreen";
import { AcademicCreateScreen } from "../screens/AcademicCreateScreen";
import { SchoolProfileScreen } from "../screens/SchoolProfileScreen";
import { CoursesDirectoryScreen, ProjectsDirectoryScreen } from "../screens/DirectoriesScreen";
import { NotesScreen } from "../screens/NotesScreen";
import { NoteEditorScreen } from "../screens/NoteEditorScreen";
import { BrainScreen } from "../screens/BrainScreen";
import { ResourcesScreen } from "../screens/ResourcesScreen";
import { SettingsScreen } from "../screens/SettingsScreen";

const Tab = createBottomTabNavigator();
const LifeStack = createNativeStackNavigator();
const TasksStack = createNativeStackNavigator();
const CalendarStack = createNativeStackNavigator();
const LibraryStack = createNativeStackNavigator();
const SchoolStack = createNativeStackNavigator();

const TAB_ICONS: Record<string, { idle: keyof typeof Ionicons.glyphMap; active: keyof typeof Ionicons.glyphMap }> = {
  LifeTab: { idle: "sparkles-outline", active: "sparkles" },
  TasksTab: { idle: "checkbox-outline", active: "checkbox" },
  CalendarTab: { idle: "calendar-outline", active: "calendar" },
  SchoolTab: { idle: "school-outline", active: "school" },
  LibraryTab: { idle: "book-outline", active: "book" },
  SettingsTab: { idle: "options-outline", active: "options" },
};

function GlassTabBarBackground({ dark }: { dark: boolean }) {
  return (
    <View style={styles.glassClip}>
      <View style={[styles.glassFill, dark && styles.glassFillDark]} />
      <View style={[styles.glassEdge, dark && styles.glassEdgeDark]} />
    </View>
  );
}

function LifeStackNavigator() {
  return (
    <LifeStack.Navigator screenOptions={{ headerShown: false }}>
      <LifeStack.Screen name="LifeDashboard" component={LifeDashboardScreen} />
      <LifeStack.Screen name="Now" component={NowScreen} />
      <LifeStack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
      <LifeStack.Screen name="ProjectsDirectory" component={ProjectsDirectoryScreen} />
      <LifeStack.Screen name="HubCollection" component={HubCollectionScreen} />
    </LifeStack.Navigator>
  );
}

function TasksStackNavigator() {
  return (
    <TasksStack.Navigator screenOptions={{ headerShown: false }}>
      <TasksStack.Screen name="TasksList" component={TasksScreen} />
      <TasksStack.Screen name="TaskDetail" component={TaskDetailScreen} />
    </TasksStack.Navigator>
  );
}

function SchoolStackNavigator() {
  return (
    <SchoolStack.Navigator screenOptions={{ headerShown: false }}>
      <SchoolStack.Screen name="SchoolDashboard" component={SchoolDashboardScreen} />
      <SchoolStack.Screen name="ClassDetail" component={ClassDetailScreen} />
      <SchoolStack.Screen name="CoursesDirectory" component={CoursesDirectoryScreen} />
      <SchoolStack.Screen name="AcademicCreate" component={AcademicCreateScreen} />
      <SchoolStack.Screen name="SchoolProfile" component={SchoolProfileScreen} />
      <SchoolStack.Screen name="HubCollection" component={HubCollectionScreen} />
    </SchoolStack.Navigator>
  );
}

function CalendarStackNavigator() {
  return (
    <CalendarStack.Navigator screenOptions={{ headerShown: false }}>
      <CalendarStack.Screen name="CalendarMain" component={CalendarScreen} />
      <CalendarStack.Screen name="ConnectWeb" component={ConnectWebScreen} />
    </CalendarStack.Navigator>
  );
}

// Library tab hosts Notes, Brain, and Resources — the three "knowledge
// library" views from the web app — plus the note editor drill-in.
function LibraryStackNavigator() {
  return (
    <LibraryStack.Navigator screenOptions={{ headerShown: false }}>
      <LibraryStack.Screen name="NotesList" component={NotesScreen} />
      <LibraryStack.Screen name="NoteEditor" component={NoteEditorScreen} />
      <LibraryStack.Screen name="Brain" component={BrainScreen} />
      <LibraryStack.Screen name="Resources" component={ResourcesScreen} />
    </LibraryStack.Navigator>
  );
}

export function RootNavigator() {
  const { theme, dark } = useLifeOS();
  const insets = useSafeAreaInsets();
  // Clone (don't mutate) the base navigation theme — DarkTheme/DefaultTheme
  // are shared singleton objects from @react-navigation/native, so writing
  // into their .colors directly would leak across every screen/app that
  // imports them.
  const base = dark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: theme.bg,
      card: theme.surface,
      text: theme.text,
      border: theme.border,
      primary: theme.accent,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={dark ? "light" : "dark"} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarShowLabel: true,
          tabBarHideOnKeyboard: true,
          tabBarBackground: () => <GlassTabBarBackground dark={dark} />,
          tabBarStyle: {
            position: "absolute",
            left: 20,
            right: 20,
            bottom: insets.bottom + 16,
            height: 70,
            borderRadius: 28,
            backgroundColor: "transparent",
            borderTopWidth: 0,
            shadowColor: "#6F766C",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: dark ? 0.4 : 0.2,
            shadowRadius: 22,
            elevation: 12,
            paddingHorizontal: 8,
            paddingTop: 4,
            paddingBottom: 4,
          },
          tabBarItemStyle: {
            height: 62,
            minWidth: 44,
            paddingVertical: 0,
            justifyContent: "center",
            alignItems: "center",
          },
          tabBarIconStyle: {
            marginTop: 4,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            lineHeight: 12,
            fontWeight: "600",
            marginTop: 2,
            marginBottom: 5,
          },
          tabBarActiveTintColor: theme.accent,
          tabBarInactiveTintColor: "#8E8E93",
          tabBarIcon: ({ color, focused }) => {
            const icon = TAB_ICONS[route.name];
            return <Ionicons name={focused ? icon.active : icon.idle} size={22} color={color} />;
          },
        })}
      >
        <Tab.Screen name="LifeTab" component={LifeStackNavigator} options={{ title: "Life" }} />
        <Tab.Screen name="TasksTab" component={TasksStackNavigator} options={{ title: "Tasks" }} />
        <Tab.Screen name="CalendarTab" component={CalendarStackNavigator} options={{ title: "Calendar" }} />
        <Tab.Screen name="SchoolTab" component={SchoolStackNavigator} options={{ title: "School" }} />
        <Tab.Screen name="LibraryTab" component={LibraryStackNavigator} options={{ title: "Library" }} />
        <Tab.Screen name="SettingsTab" component={SettingsScreen} options={{ title: "Settings" }} />
      </Tab.Navigator>
      <OnboardingName />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  glassClip: {
    position: "absolute",
    inset: 0,
    borderRadius: 28,
    overflow: "hidden",
  },
  glassFill: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(255,255,255,0.88)",
  },
  glassFillDark: {
    backgroundColor: "rgba(28,28,30,0.9)",
  },
  glassEdge: {
    position: "absolute",
    inset: 0,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.92)",
  },
  glassEdgeDark: {
    borderColor: "rgba(255,255,255,0.14)",
  },
});
