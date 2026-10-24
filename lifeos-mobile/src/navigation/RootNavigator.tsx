import Feather from "@expo/vector-icons/Feather";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { Text, View } from "react-native";
import { OnboardingFlow } from "../components/OnboardingFlow";
import { PaywallGate } from "../components/PaywallGate";
import { FloatingTabBar } from "../components/FloatingTabBar";
import { useLifeOS } from "../lib/LifeOSContext";
import { canAccessPaidHubs, isHubVisibleInNav } from "../lib/entitlement";
import { shouldPersistOnboardingComplete, shouldShowOnboarding } from "../lib/onboardingGate";
import { useLayout } from "../lib/layout";
import { buildLinking } from "../lib/notifications";
import type { OnboardingDestination } from "../types";
import { navigationRef } from "./navigationRef";
import { useNavigation } from "@react-navigation/native";

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
import { getCareerDashboardScreen, isCareerHubAvailable } from "../lib/careerGate";
import { FocusEnforcerSetupScreen } from "../screens/FocusEnforcerSetupScreen";
import { FocusEnforcerSessionScreen } from "../screens/FocusEnforcerSessionScreen";
import { FocusEnforcerHistoryScreen } from "../screens/FocusEnforcerHistoryScreen";
import { CareerPageScreen } from "../screens/CareerPageScreen";
import { ExecutiveHomeScreen } from "../screens/ExecutiveHomeScreen";
import { KeptScreen } from "../screens/KeptScreen";
import { MasterOSNavigator } from "./MasterOSNavigator";

const Tab = createBottomTabNavigator();
const NowStack = createNativeStackNavigator();
const LifeStack = createNativeStackNavigator();
const TasksStack = createNativeStackNavigator();
const CalendarStack = createNativeStackNavigator();
const KeptStack = createNativeStackNavigator();
const LibraryStack = createNativeStackNavigator();
const SchoolStack = createNativeStackNavigator();
const WorkStack = createNativeStackNavigator();
const CareerStack = createNativeStackNavigator();

/** Feather stroke icons — lighter and less boxy than filled Ionicons squares. */
const TAB_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  NowTab: "zap",
  TasksTab: "check-circle",
  CalendarTab: "calendar",
  KeptTab: "bookmark",
  LifeTab: "home",
  SchoolTab: "award",
  WorkTab: "briefcase",
  CareerTab: "target",
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
      <NowStack.Screen name="FocusEnforcerSetup" component={FocusEnforcerSetupScreen} />
      <NowStack.Screen name="FocusEnforcerSession" component={FocusEnforcerSessionScreen} />
      <NowStack.Screen name="FocusEnforcerHistory" component={FocusEnforcerHistoryScreen} />
      <NowStack.Screen name="CareerPage" component={CareerPageScreen} />
      <NowStack.Screen name="ExecutiveHome" component={ExecutiveHomeScreen} />
      <NowStack.Screen
        name="MasterOS"
        component={MasterOSNavigator}
        options={{ presentation: "fullScreenModal", animation: "fade" }}
      />
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
      <LifeStack.Screen
        name="MasterOS"
        component={MasterOSNavigator}
        options={{ presentation: "fullScreenModal", animation: "fade" }}
      />
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
  const { workspace, updateSettings } = useLifeOS();
  const navigation = useNavigation<any>();
  if (!canAccessPaidHubs(workspace.settings.entitlement)) {
    return (
      <PaywallGate
        onUnlock={(entitlement) => {
          void updateSettings({ ...workspace.settings, entitlement, enableWorkOS: true });
        }}
        onClose={() => navigation.navigate("NowTab")}
      />
    );
  }
  return (
    <WorkStack.Navigator screenOptions={screenOptions}>
      <WorkStack.Screen name="WorkDashboard" component={WorkDashboardScreen} />
      <WorkStack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
      <WorkStack.Screen name="TaskDetail" component={TaskDetailScreen} />
    </WorkStack.Navigator>
  );
}


/** Never return null from a tab stack — that can crash React Navigation. */
function CareerUnavailableScreen() {
  const { theme } = useLifeOS();
  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: theme.bg }}>
      <Text style={{ color: theme.text, fontWeight: "800", fontSize: 18 }}>Career unavailable</Text>
      <Text style={{ color: theme.muted, marginTop: 8 }}>
        Something went wrong loading Career. Your other hubs still work — try again after an update.
      </Text>
    </View>
  );
}

/** Career is free (like Home / School) — no paywall gate. */
function CareerStackNavigator() {
  const screenOptions = useStackScreenOptions();
  const Screen = getCareerDashboardScreen() ?? CareerUnavailableScreen;
  return (
    <CareerStack.Navigator screenOptions={screenOptions}>
      <CareerStack.Screen name="CareerDashboard" component={Screen} />
    </CareerStack.Navigator>
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

function KeptStackNavigator() {
  const screenOptions = useStackScreenOptions();
  return (
    <KeptStack.Navigator screenOptions={screenOptions}>
      <KeptStack.Screen name="KeptHome" component={KeptScreen} />
    </KeptStack.Navigator>
  );
}

function LibraryStackNavigator() {
  const { workspace } = useLifeOS();
  const reduceMotion = Boolean(workspace.settings.reduceMotion);
  const screenOptions = useStackScreenOptions();
  /** Peer Library sections crossfade so Handwritten ↔ Text ↔ MindDump ↔ Files don't slide/jump. */
  const sectionOptions = { ...screenOptions, animation: "fade" as const, animationDuration: 180 };
  return (
    <LibraryStack.Navigator screenOptions={screenOptions}>
      <LibraryStack.Screen name="NotebooksList" component={NotebooksScreen} options={sectionOptions} />
      <LibraryStack.Screen name="NotebookDetail" component={NotebookDetailScreen} />
      <LibraryStack.Screen
        name="PageCanvas"
        component={PageCanvasScreen}
        options={{
          presentation: "fullScreenModal",
          animation: reduceMotion ? "fade" : "slide_from_bottom",
        }}
      />
      <LibraryStack.Screen name="NotesList" component={NotesScreen} options={sectionOptions} />
      <LibraryStack.Screen name="NoteEditor" component={NoteEditorScreen} />
      <LibraryStack.Screen name="Brain" component={BrainScreen} options={sectionOptions} />
      <LibraryStack.Screen name="Resources" component={ResourcesScreen} options={sectionOptions} />
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
  const { isTablet } = useLayout();
  const pendingDest = useRef<OnboardingDestination | null>(null);
  const migrated = useRef(false);

  const settings = workspace.settings;
  // Replay is local state — Firebase silent sync cannot cancel “Show intro again”.
  const needsOnboarding = shouldShowOnboarding({
    signedIn: true,
    replay: onboardingReplay,
    settings,
    workspace,
  });
  // Heal a missing Firebase flag for returning accounts (web once stripped
  // onboardingCompletedAt on save). Never run during an explicit replay.
  useEffect(() => {
    if (onboardingReplay) return;
    if (migrated.current) return;
    if (!shouldPersistOnboardingComplete({ settings, workspace })) return;
    migrated.current = true;
    void updateSettings({
      ...settings,
      onboardingCompletedAt: new Date().toISOString(),
      onboardingVersion: settings.onboardingVersion ?? 1,
    });
  }, [onboardingReplay, settings, workspace, updateSettings]);

  // After onboarding completes, tabs mount — then honor the chosen first move.
  useEffect(() => {
    if (needsOnboarding || !pendingDest.current) return;
    const dest = pendingDest.current;
    pendingDest.current = null;
    const timer = setTimeout(() => navigateAfterOnboarding(dest), 50);
    return () => clearTimeout(timer);
  }, [needsOnboarding]);

  const showLife = isHubVisibleInNav("Life", settings);
  const showSchool = isHubVisibleInNav("School", settings);
  const showWork = isHubVisibleInNav("Work", settings);
  // Never register CareerTab if the screen module failed to load (OTA-safe).
  const careerReady = isCareerHubAvailable();
  const showCareer = careerReady && isHubVisibleInNav("Career", settings);
  const linking = buildLinking({ includeCareer: careerReady });

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
              backgroundColor: theme.bg,
              borderTopWidth: 0,
              elevation: 0,
              shadowOpacity: 0,
            },
            tabBarActiveTintColor: theme.accent,
            tabBarInactiveTintColor: "#8E8E93",
            tabBarIcon: ({ color }) => {
              const name = TAB_ICONS[route.name] ?? "circle";
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
            name="KeptTab"
            component={KeptStackNavigator}
            options={{ title: "Kept", tabBarLabel: "Kept" }}
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
          {careerReady ? (
            <Tab.Screen
              name="CareerTab"
              component={CareerStackNavigator}
              options={{
                title: "Career",
                tabBarLabel: "Career",
                tabBarButton: showCareer ? undefined : () => null,
                tabBarItemStyle: showCareer
                  ? undefined
                  : { display: "none", width: 0, height: 0, minWidth: 0, flex: 0, padding: 0 },
              }}
            />
          ) : null}
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
