import type { NotifPayload } from "./types";
import { parseTaskRouteId } from "../helpers";
import { parseTaskIdFromWidgetPath, parseWidgetDeepLinkPath } from "../widgetDeepLinks";
import { navigationRef } from "../../navigation/navigationRef";

/** Navigate from a notification tap. Uses React Navigation (not expo-router). */
export function navigateFromNotification(payload: Partial<NotifPayload> | null | undefined) {
  if (!navigationRef.isReady() || !payload?.category) return;

  const category = payload.category;
  const id = payload.targetId;

  if (category === "focus") {
    navigationRef.navigate("NowTab" as never, {
      screen: "NowHome",
      params: { openFocus: true },
    } as never);
    return;
  }

  if (category === "focusEnforcer" && id) {
    navigationRef.navigate("NowTab" as never, {
      screen: "FocusEnforcerSession",
      params: { sessionId: id },
    } as never);
    return;
  }

  if ((category === "task" || category === "deadline" || category === "important") && id) {
    const taskId = parseTaskRouteId(id);
    if (taskId != null) {
      navigationRef.navigate("TasksTab" as never, {
        screen: "TaskDetail",
        params: { taskId },
      } as never);
      return;
    }
  }

  if (category === "event") {
    navigationRef.navigate("CalendarTab" as never, { screen: "CalendarMain" } as never);
    return;
  }

  navigationRef.navigate("LifeTab" as never, { screen: "LifeDashboard" } as never);
}

/**
 * Handle home-screen widget taps (`lifeos://…`).
 * Explicit navigation is more reliable than path config alone for tab+stack apps.
 */
export function navigateFromWidgetUrl(url: string | null | undefined): boolean {
  if (!url || !navigationRef.isReady()) return false;
  if (!url.startsWith("lifeos://") && !url.startsWith("exp+lifeos-mobile://")) return false;

  let path = "";
  try {
    path = parseWidgetDeepLinkPath(url);
  } catch {
    path = "";
  }

  if (!path || path === "now") {
    navigationRef.navigate("NowTab" as never, { screen: "NowHome" } as never);
    return true;
  }
  if (path === "focus") {
    navigationRef.navigate("NowTab" as never, {
      screen: "Focus",
      params: { openFocus: true },
    } as never);
    return true;
  }
  if (path === "tasks" || path === "add-task" || path.startsWith("add-task?")) {
    // SiriTaskBridge creates the task; here we just land on Tasks.
    navigationRef.navigate("TasksTab" as never, { screen: "TasksList" } as never);
    return true;
  }
  if (path === "calendar") {
    navigationRef.navigate("CalendarTab" as never, { screen: "CalendarMain" } as never);
    return true;
  }
  if (path === "life" || path === "life/inbox") {
    navigationRef.navigate(
      "LifeTab" as never,
      {
        screen: path === "life/inbox" ? "NotificationCenter" : "LifeDashboard",
      } as never,
    );
    return true;
  }

  const taskId = parseTaskIdFromWidgetPath(path);
  if (taskId != null) {
    navigationRef.navigate("TasksTab" as never, {
      screen: "TaskDetail",
      params: { taskId },
    } as never);
    return true;
  }

  return false;
}

export const linking = {
  prefixes: ["lifeos://", "exp+lifeos-mobile://"],
  config: {
    screens: {
      NowTab: {
        screens: {
          NowHome: "now",
          Focus: "focus",
          Settings: "settings",
          TaskDetail: "now/task/:taskId",
          FocusEnforcerSession: "focus-enforcer/:sessionId",
          FocusEnforcerSetup: "focus-enforcer/setup",
          FocusEnforcerHistory: "focus-enforcer/history",
        },
      },
      TasksTab: {
        screens: {
          TasksList: "tasks",
          TaskDetail: "task/:taskId",
        },
      },
      CalendarTab: {
        screens: {
          CalendarMain: "calendar",
          ConnectWeb: "calendar/connect",
        },
      },
      LifeTab: {
        screens: {
          LifeDashboard: "life",
          NotificationCenter: "life/inbox",
          ProjectDetail: "life/project/:projectName",
        },
      },
      SchoolTab: {
        path: "school",
      },
      WorkTab: {
        screens: {
          WorkDashboard: "work",
        },
      },
      LibraryTab: {
        path: "library",
      },
    },
  },
};
