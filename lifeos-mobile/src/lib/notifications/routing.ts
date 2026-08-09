import type { NotifPayload } from "./types";
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

  if ((category === "task" || category === "deadline" || category === "important") && id) {
    const taskId = Number(id);
    if (!Number.isNaN(taskId)) {
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
