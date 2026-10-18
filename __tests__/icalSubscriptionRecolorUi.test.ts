import { readFileSync } from "fs";
import { join } from "path";

const pageSrc = readFileSync(join(__dirname, "../app/page.tsx"), "utf8");
const mobileSrc = readFileSync(
  join(__dirname, "../lifeos-mobile/src/screens/CalendarScreen.tsx"),
  "utf8",
);
const apiSrc = readFileSync(join(__dirname, "../lifeos-mobile/src/lib/api.ts"), "utf8");

describe("iCal subscription recolor UI wiring", () => {
  it("exposes a recolor helper on mobile", () => {
    expect(apiSrc).toContain("export function recolorIcalSubscriptionEvents");
    expect(apiSrc).toContain("event.id.startsWith(prefix)");
  });

  it("shows swatches on existing mobile subscription cards", () => {
    expect(mobileSrc).toContain("changeFeedColor");
    expect(mobileSrc).toContain("recolorIcalSubscriptionEvents");
    expect(mobileSrc).toMatch(/subscriptions\.map\(\(feed\)[\s\S]*SPACE_COLORS\.slice\(0, 8\)/);
    expect(mobileSrc).toContain("Set ${feed.name} color to ${swatch}");
  });

  it("mirrors recolor on web feeds panel and parents", () => {
    expect(pageSrc).toContain("const recolorIcalSubscriptionEvents");
    expect(pageSrc).toContain("changeFeedColor");
    expect(pageSrc).toContain("ical-feed-recolor");
    expect(pageSrc).toContain("onRecolorSubscriptionEvents={recolorIcalSubscriptionEvents}");
    expect(pageSrc).toContain("onRecolorIcalSubscriptionEvents={recolorIcalSubscriptionEvents}");
  });
});
