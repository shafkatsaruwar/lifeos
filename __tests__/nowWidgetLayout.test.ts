import {
  DEFAULT_NOW_WIDGET_LAYOUT,
  isDefaultNowWidgetLayout,
  moveNowWidget,
  normalizeNowWidgetLayout,
  toggleNowWidgetHidden,
  visibleNowWidgets,
} from "../lib/nowWidgetLayout";

describe("nowWidgetLayout", () => {
  it("defaults to current Atelier order with nothing hidden", () => {
    expect(normalizeNowWidgetLayout(null)).toEqual(DEFAULT_NOW_WIDGET_LAYOUT);
    expect(isDefaultNowWidgetLayout(undefined)).toBe(true);
    expect(visibleNowWidgets(undefined)).toEqual(DEFAULT_NOW_WIDGET_LAYOUT.order);
  });

  it("fills missing ids and drops unknowns", () => {
    const normalized = normalizeNowWidgetLayout({
      order: ["copilot", "bogus" as never, "weather"],
      hidden: ["quote", "nope" as never],
    });
    expect(normalized.order[0]).toBe("copilot");
    expect(normalized.order[1]).toBe("weather");
    expect(normalized.order).toContain("today");
    expect(normalized.hidden).toEqual(["quote"]);
    expect(isDefaultNowWidgetLayout(normalized)).toBe(false);
  });

  it("toggles hidden and reorders", () => {
    let layout = DEFAULT_NOW_WIDGET_LAYOUT;
    layout = toggleNowWidgetHidden(layout, "weather");
    expect(layout.hidden).toContain("weather");
    expect(visibleNowWidgets(layout)).not.toContain("weather");
    layout = moveNowWidget(layout, "copilot", "up");
    const idx = layout.order.indexOf("copilot");
    expect(layout.order[idx + 1]).toBe("hubs");
  });
});
