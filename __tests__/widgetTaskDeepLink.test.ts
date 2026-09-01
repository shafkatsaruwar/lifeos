import { parseTaskRouteId } from "../lifeos-mobile/src/lib/helpers";
import {
  parseTaskIdFromWidgetPath,
  parseWidgetDeepLinkPath,
} from "../lifeos-mobile/src/lib/widgetDeepLinks";

describe("widget task deep links", () => {
  describe("parseTaskRouteId", () => {
    it("accepts numeric ids", () => {
      expect(parseTaskRouteId(42)).toBe(42);
    });

    it("coerces string ids from React Navigation", () => {
      expect(parseTaskRouteId("42")).toBe(42);
    });

    it("rejects empty or invalid values", () => {
      expect(parseTaskRouteId(undefined)).toBeNull();
      expect(parseTaskRouteId("")).toBeNull();
      expect(parseTaskRouteId("abc")).toBeNull();
    });
  });

  describe("parseWidgetDeepLinkPath", () => {
    it("extracts task paths from lifeos:// urls", () => {
      expect(parseWidgetDeepLinkPath("lifeos://task/123")).toBe("task/123");
    });

    it("extracts now/task paths", () => {
      expect(parseWidgetDeepLinkPath("lifeos://now/task/7")).toBe("now/task/7");
    });
  });

  describe("parseTaskIdFromWidgetPath", () => {
    it("parses task ids from widget paths", () => {
      expect(parseTaskIdFromWidgetPath("task/123")).toBe(123);
      expect(parseTaskIdFromWidgetPath("now/task/456")).toBe(456);
    });

    it("returns null for non-task paths", () => {
      expect(parseTaskIdFromWidgetPath("tasks")).toBeNull();
      expect(parseTaskIdFromWidgetPath("calendar")).toBeNull();
    });
  });

  it("matches widget snapshot deep links to numeric task ids", () => {
    const deepLink = "lifeos://task/99";
    const path = parseWidgetDeepLinkPath(deepLink);
    const taskId = parseTaskIdFromWidgetPath(path);
    expect(taskId).toBe(99);

    const tasks = [{ id: 99, title: "Check Bullhorn Access" }];
    expect(tasks.find((t) => t.id === taskId)).toBeDefined();
    expect(tasks.find((t) => t.id === String(taskId) as unknown as number)).toBeUndefined();
  });
});
