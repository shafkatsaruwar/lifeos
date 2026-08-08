import Ionicons from "@expo/vector-icons/Ionicons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLifeOS } from "../lib/LifeOSContext";
import { useLayout } from "../lib/layout";
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
import { NotebooksScreen } from "../screens/NotebooksScreen";
import { NotebookDetailScreen } from "../screens/NotebookDetailScreen";
import { PageCanvasScreen } from "../screens/PageCanvasScreen";
import { BrainScreen } from "../screens/BrainScreen";
import { ResourcesScreen } from "../screens/ResourcesScreen";
import { SettingsScreen } from "../screens/SettingsScreen";

const Tab = createBottomTabNavigator();
const NowStack = createNativeStackNavigator();
const LifeStack = createNativeStackNavigator();
const TasksStack = createNativeStackNavigator();
const CalendarStack = createNativeStackNavigator();
const LibraryStack = createNativeStackNavigator();
const SchoolStack = createNativeStackNavigator();

const TAB_ICONS: Record<string, { idle: keyof typeof Ionicons.glyphMap; active: keyof typeof Ionicons.glyphMap }> = {
  NowTab: { idle: "flash-outline", active: "flash" },
  TasksTab: { idle: "checkbox-outline", active: "checkbox" },
  CalendarTab: { idle: "calendar-outline", active: "calendar" },
  LifeTab: { idle: "sparkles-outline", active: "sparkles" },
  SchoolTab: { idle: "school-outline", active: "school" },
  LibraryTab: { idle: "book-outline", active: "book" },
};

function NowStackNavigator() {
  return (
    <NowStack.Navigator screenOptions={{ headerShown: false }}>
      <NowStack.Screen name="NowHome" component={NowScreen} />
      <NowStack.Screen name="TaskDetail" component={TaskDetailScreen} />
      <NowStack.Screen name="Settings" component={SettingsScreen} />
    </NowStack.Navigator>
  );
}

function LifeStackNavigator() {
  return (
    <LifeStack.Navigator screenOptions={{ headerShown: false }}>
      <LifeStack.Screen name="LifeDashboard" component={LifeDashboardScreen} />
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

function LibraryStackNavigator() {
  return (
    <LibraryStack.Navigator screenOptions={{ headerShown: false }}>
      <LibraryStack.Screen name="NotebooksList" component={NotebooksScreen} />
      <LibraryStack.Screen name="NotebookDetail" component={NotebookDetailScreen} />
      <LibraryStack.Screen
        name="PageCanvas"
        component={PageCanvasScreen}
        options={{ presentation: "fullScreenModal", animation: "slide_from_bottom" }}
      />
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
  const { isTablet } = useLayout();
  const tabHeight = isTablet ? 64 : 56;
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
          tabBarStyle: {
            position: "relative",
            left: 0,
            right: 0,
            bottom: 0,
            height: tabHeight + insets.bottom,
            backgroundColor: theme.surface,
            borderTopWidth: 1,
            borderTopColor: theme.border,
            borderRadius: 0,
            elevation: 0,
            shadowOpacity: 0,
            paddingTop: isTablet ? 8 : 6,
            paddingBottom: Math.max(insets.bottom, 8),
            paddingHorizontal: isTablet ? 24 : 4,
          },
          tabBarItemStyle: {
            height: isTablet ? 52 : 48,
            minWidth: isTablet ? 72 : 44,
            paddingVertical: 0,
            justifyContent: "center",
            alignItems: "center",
          },
          tabBarIconStyle: {
            marginTop: 0,
          },
          tabBarLabelStyle: {
            fontSize: isTablet ? 11 : 10,
            lineHeight: 12,
            fontWeight: "600",
            marginTop: 2,
            marginBottom: 0,
          },
          tabBarActiveTintColor: theme.accent,
          tabBarInactiveTintColor: "#8E8E93",
          tabBarIcon: ({ color, focused }) => {
            const icon = TAB_ICONS[route.name];
            return <Ionicons name={focused ? icon.active : icon.idle} size={isTablet ? 24 : 22} color={color} />;
          },
        })}
      >
        <Tab.Screen name="NowTab" component={NowStackNavigator} options={{ title: "Now" }} />
        <Tab.Screen name="TasksTab" component={TasksStackNavigator} options={{ title: "Tasks" }} />
        <Tab.Screen name="CalendarTab" component={CalendarStackNavigator} options={{ title: "Calendar" }} />
        <Tab.Screen name="LifeTab" component={LifeStackNavigator} options={{ title: "Life" }} />
        <Tab.Screen name="SchoolTab" component={SchoolStackNavigator} options={{ title: "School" }} />
        <Tab.Screen name="LibraryTab" component={LibraryStackNavigator} options={{ title: "Library" }} />
      </Tab.Navigator>
      <OnboardingName />
    </NavigationContainer>
  );
}
