import Feather from "@expo/vector-icons/Feather";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { OnboardingFlow } from "../components/OnboardingFlow";
import { FloatingTabBar, FLOATING_TAB_BAR_HEIGHT } from "../components/FloatingTabBar";
import { useLifeOS } from "../lib/LifeOSContext";
import { useLayout } from "../lib/layout";
import { linking } from "../lib/notifications";
import type { OnboardingDestination } from "../types";
import { navigationRef } from "./navigationRef";

import { LifeDashboardScreen } from "../screens/LifeDashboardScreen";
import { LifeDayScreen } from "../screens/LifeDayScreen";
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
import { NotificationSettingsScreen } from "../screens/NotificationSettingsScreen";
import { NotificationCenterScreen } from "../screens/NotificationCenterScreen";
import { WorkDashboardScreen } from "../screens/WorkDashboardScreen";

const Tab = createBottomTabNavigator();
const NowStack = createNativeStackNavigator();
const LifeStack = createNativeStackNavigator();
const TasksStack = createNativeStackNavigator();
const CalendarStack = createNativeStackNavigator();
const LibraryStack = createNativeStackNavigator();
const SchoolStack = createNativeStackNavigator();
const WorkStack = createNativeStackNavigator();

/** Feather stroke icons — lighter and less boxy than filled Ionicons squares. */
const TAB_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  NowTab: "zap",
  TasksTab: "check-circle",
  CalendarTab: "calendar",
  LifeTab: "home",
  SchoolTab: "award",
  WorkTab: "briefcase",
  LibraryTab: "book-open",
};

function useStackScreenOptions() {
  const { workspace } = useLifeOS();
  const reduceMotion = Boolean(workspace.settings.reduceMotion);
  return {
    headerShown: false as const,
    animation: reduceMotion ? ("fade" as const) : ("default" as const),
  };
}

function NowStackNavigator() {
  const screenOptions = useStackScreenOptions();
  return (
    <NowStack.Navigator screenOptions={screenOptions}>
      <NowStack.Screen name="NowHome" component={NowScreen} />
      <NowStack.Screen name="Focus" component={NowScreen} initialParams={{ openFocus: true }} />
      <NowStack.Screen name="TaskDetail" component={TaskDetailScreen} />
      <NowStack.Screen name="Settings" component={SettingsScreen} />
      <NowStack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
    </NowStack.Navigator>
  );
}

function LifeStackNavigator() {
  const screenOptions = useStackScreenOptions();
  return (
    <LifeStack.Navigator screenOptions={screenOptions}>
      <LifeStack.Screen name="LifeDashboard" component={LifeDashboardScreen} />
      <LifeStack.Screen name="LifeDay" component={LifeDayScreen} />
      <LifeStack.Screen name="NotificationCenter" component={NotificationCenterScreen} />
      <LifeStack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
      <LifeStack.Screen name="ProjectsDirectory" component={ProjectsDirectoryScreen} />
      <LifeStack.Screen name="HubCollection" component={HubCollectionScreen} />
    </LifeStack.Navigator>
  );
}

function TasksStackNavigator() {
  const screenOptions = useStackScreenOptions();
  return (
    <TasksStack.Navigator screenOptions={screenOptions}>
      <TasksStack.Screen name="TasksList" component={TasksScreen} />
      <TasksStack.Screen name="TaskDetail" component={TaskDetailScreen} />
    </TasksStack.Navigator>
  );
}

function SchoolStackNavigator() {
  const screenOptions = useStackScreenOptions();
  return (
    <SchoolStack.Navigator screenOptions={screenOptions}>
      <SchoolStack.Screen name="SchoolDashboard" component={SchoolDashboardScreen} />
      <SchoolStack.Screen name="ClassDetail" component={ClassDetailScreen} />
      <SchoolStack.Screen name="CoursesDirectory" component={CoursesDirectoryScreen} />
      <SchoolStack.Screen name="AcademicCreate" component={AcademicCreateScreen} />
      <SchoolStack.Screen name="SchoolProfile" component={SchoolProfileScreen} />
      <SchoolStack.Screen name="HubCollection" component={HubCollectionScreen} />
    </SchoolStack.Navigator>
  );
}

function WorkStackNavigator() {
  const screenOptions = useStackScreenOptions();
  return (
    <WorkStack.Navigator screenOptions={screenOptions}>
      <WorkStack.Screen name="WorkDashboard" component={WorkDashboardScreen} />
      <WorkStack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
      <WorkStack.Screen name="TaskDetail" component={TaskDetailScreen} />
    </WorkStack.Navigator>
  );
}

function CalendarStackNavigator() {
  const screenOptions = useStackScreenOptions();
  return (
    <CalendarStack.Navigator screenOptions={screenOptions}>
      <CalendarStack.Screen name="CalendarMain" component={CalendarScreen} />
      <CalendarStack.Screen name="ConnectWeb" component={ConnectWebScreen} />
    </CalendarStack.Navigator>
  );
}

function LibraryStackNavigator() {
  const { workspace } = useLifeOS();
  const reduceMotion = Boolean(workspace.settings.reduceMotion);
  const screenOptions = useStackScreenOptions();
  return (
    <LibraryStack.Navigator screenOptions={screenOptions}>
      <LibraryStack.Screen name="NotebooksList" component={NotebooksScreen} />
      <LibraryStack.Screen name="NotebookDetail" component={NotebookDetailScreen} />
      <LibraryStack.Screen
        name="PageCanvas"
        component={PageCanvasScreen}
        options={{
          presentation: "fullScreenModal",
          animation: reduceMotion ? "fade" : "slide_from_bottom",
        }}
      />
      <LibraryStack.Screen name="NotesList" component={NotesScreen} />
      <LibraryStack.Screen name="NoteEditor" component={NoteEditorScreen} />
      <LibraryStack.Screen name="Brain" component={BrainScreen} />
      <LibraryStack.Screen name="Resources" component={ResourcesScreen} />
    </LibraryStack.Navigator>
  );
}

function navigateAfterOnboarding(dest: OnboardingDestination) {
  if (!navigationRef.isReady()) return;
  if (dest.tab === "NowTab" || dest.tab === "TasksTab") {
    navigationRef.navigate(dest.tab as never);
    return;
  }
  if (dest.screen === "Brain") {
    navigationRef.navigate("LibraryTab" as never, { screen: "Brain" } as never);
    return;
  }
  navigationRef.navigate(
    "LibraryTab" as never,
    { screen: "PageCanvas", params: dest.params } as never,
  );
}

export function RootNavigator() {
  const { theme, dark, workspace, updateSettings, onboardingReplay, clearOnboardingReplay } = useLifeOS();
  const insets = useSafeAreaInsets();
  const { isTablet } = useLayout();
  const pendingDest = useRef<OnboardingDestination | null>(null);
  const migrated = useRef(false);

  const settings = workspace.settings;
  // Replay is local state — Firebase silent sync cannot cancel “Show intro again”.
  const needsOnboarding = onboardingReplay || !settings.onboardingCompletedAt;

  // One-time legacy skip: accounts that predate onboarding shouldn't be forced
  // through the intro. Never run during an explicit replay.
  useEffect(() => {
    if (onboardingReplay) return;
    if (migrated.current || settings.onboardingCompletedAt) return;
    if (settings.onboardingVersion != null) return;
    const hasName = Boolean(settings.preferredName?.trim());
    const hasData =
      workspace.tasks.length > 0 ||
      workspace.brain.length > 0 ||
      workspace.notebookHub.notebooks.length > 0 ||
      Object.keys(workspace.notebookPages || {}).length > 0;
    if (!hasName && !hasData) return;
    migrated.current = true;
    void updateSettings({
      ...settings,
      onboardingCompletedAt: new Date().toISOString(),
      onboardingVersion: 1,
    });
  }, [
    onboardingReplay,
    settings,
    workspace.tasks.length,
    workspace.brain.length,
    workspace.notebookHub.notebooks.length,
    workspace.notebookPages,
    updateSettings,
  ]);

  // After onboarding completes, tabs mount — then honor the chosen first move.
  useEffect(() => {
    if (needsOnboarding || !pendingDest.current) return;
    const dest = pendingDest.current;
    pendingDest.current = null;
    const timer = setTimeout(() => navigateAfterOnboarding(dest), 50);
    return () => clearTimeout(timer);
  }, [needsOnboarding]);

  const showLife = settings.enableLifeOS !== false;
  const showSchool = settings.enableSchoolOS !== false;
  const showWork = settings.enableWorkOS !== false;

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
    <NavigationContainer ref={navigationRef} theme={navTheme} linking={linking}>
      <StatusBar style={dark ? "light" : "dark"} />
      {needsOnboarding ? (
        <OnboardingFlow
          onFinished={(destination) => {
            pendingDest.current = destination ?? { tab: "NowTab" };
            clearOnboardingReplay();
          }}
        />
      ) : (
        <Tab.Navigator
          tabBar={(props) => <FloatingTabBar {...props} />}
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarShowLabel: true,
            tabBarHideOnKeyboard: true,
            tabBarStyle: {
              position: "absolute",
              backgroundColor: "transparent",
              borderTopWidth: 0,
              elevation: 0,
              height: FLOATING_TAB_BAR_HEIGHT + insets.bottom,
            },
            tabBarActiveTintColor: theme.accent,
            tabBarInactiveTintColor: "#8E8E93",
            tabBarIcon: ({ color }) => {
              const name = TAB_ICONS[route.name];
              return <Feather name={name} size={isTablet ? 22 : 20} color={color} />;
            },
          })}
        >
          <Tab.Screen name="NowTab" component={NowStackNavigator} options={{ title: "Now", tabBarLabel: "Now" }} />
          <Tab.Screen name="TasksTab" component={TasksStackNavigator} options={{ title: "Tasks", tabBarLabel: "Tasks" }} />
          <Tab.Screen
            name="CalendarTab"
            component={CalendarStackNavigator}
            options={{ title: "Calendar", tabBarLabel: "Cal" }}
          />
          <Tab.Screen
            name="LifeTab"
            component={LifeStackNavigator}
            options={{
              title: "HomeOS",
              tabBarLabel: "Home",
              tabBarButton: showLife ? undefined : () => null,
              tabBarItemStyle: showLife
                ? undefined
                : { display: "none", width: 0, height: 0, minWidth: 0, flex: 0, padding: 0 },
            }}
          />
          <Tab.Screen
            name="SchoolTab"
            component={SchoolStackNavigator}
            options={{
              title: "School",
              tabBarLabel: "School",
              tabBarButton: showSchool ? undefined : () => null,
              tabBarItemStyle: showSchool
                ? undefined
                : { display: "none", width: 0, height: 0, minWidth: 0, flex: 0, padding: 0 },
            }}
          />
          <Tab.Screen
            name="WorkTab"
            component={WorkStackNavigator}
            options={{
              title: "Work",
              tabBarLabel: "Work",
              tabBarButton: showWork ? undefined : () => null,
              tabBarItemStyle: showWork
                ? undefined
                : { display: "none", width: 0, height: 0, minWidth: 0, flex: 0, padding: 0 },
            }}
          />
          <Tab.Screen
            name="LibraryTab"
            component={LibraryStackNavigator}
            options={{ title: "Library", tabBarLabel: "Library" }}
          />
        </Tab.Navigator>
      )}
    </NavigationContainer>
  );
}
