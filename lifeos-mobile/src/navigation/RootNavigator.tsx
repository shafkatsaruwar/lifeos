import Feather from "@expo/vector-icons/Feather";
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

/** Feather stroke icons — lighter and less boxy than filled Ionicons squares. */
const TAB_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  NowTab: "zap",
  TasksTab: "check-circle",
  CalendarTab: "calendar",
  LifeTab: "heart",
  SchoolTab: "award",
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
      <NowStack.Screen name="TaskDetail" component={TaskDetailScreen} />
      <NowStack.Screen name="Settings" component={SettingsScreen} />
    </NowStack.Navigator>
  );
}

function LifeStackNavigator() {
  const screenOptions = useStackScreenOptions();
  return (
    <LifeStack.Navigator screenOptions={screenOptions}>
      <LifeStack.Screen name="LifeDashboard" component={LifeDashboardScreen} />
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
            const name = TAB_ICONS[route.name];
            return (
              <Feather
                name={name}
                size={isTablet ? 23 : 21}
                color={color}
                style={{ opacity: focused ? 1 : 0.85 }}
              />
            );
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
