/**
 * Copies LifeOS home-screen WidgetKit Swift into the LiveActivity extension
 * and ensures App Group entitlements exist on both targets.
 */
const {
  createRunOncePlugin,
  withDangerousMod,
  withEntitlementsPlist,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const APP_GROUP = "group.com.shafkatsaruwar.lifeos";

function stripMainBundle(swiftSource) {
  const marker = "@main\nstruct LifeOSWidgetsBundle";
  const idx = swiftSource.indexOf(marker);
  if (idx === -1) return swiftSource;
  return `${swiftSource.slice(0, idx).trimEnd()}\n`;
}

function withLifeOSWidgets(config) {
  config = withEntitlementsPlist(config, (cfg) => {
    const groups = cfg.modResults["com.apple.security.application-groups"] || [];
    if (!groups.includes(APP_GROUP)) {
      cfg.modResults["com.apple.security.application-groups"] = [...groups, APP_GROUP];
    }
    return cfg;
  });

  config = withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const iosRoot = path.join(cfg.modRequest.projectRoot, "ios");
      const liveDir = path.join(iosRoot, "LiveActivity");
      const source = path.join(cfg.modRequest.projectRoot, "targets/widget/LifeOSWidget.swift");
      if (!fs.existsSync(liveDir) || !fs.existsSync(source)) return cfg;

      const swift = stripMainBundle(fs.readFileSync(source, "utf8"));
      fs.writeFileSync(path.join(liveDir, "LifeOSHomeWidgets.swift"), swift);

      const bundlePath = path.join(liveDir, "LiveActivityWidgetBundle.swift");
      if (fs.existsSync(bundlePath)) {
        fs.writeFileSync(
          bundlePath,
          `import SwiftUI
import WidgetKit

@main
struct LiveActivityWidgetBundle: WidgetBundle {
  var body: some Widget {
    LiveActivityWidget()
    LifeOSAttentionWidget()
    LifeOSNowFocusWidget()
    LifeOSTasksWidget()
    LifeOSDeadlineWidget()
    LifeOSCalendarWidget()
    LifeOSTodayWidget()
  }
}
`,
        );
      }

      const entPath = path.join(liveDir, "LiveActivity.entitlements");
      if (fs.existsSync(entPath)) {
        let ent = fs.readFileSync(entPath, "utf8");
        if (!ent.includes(APP_GROUP)) {
          if (ent.includes("<dict/>")) {
            ent = ent.replace(
              "<dict/>",
              `<dict>
    <key>com.apple.security.application-groups</key>
    <array>
      <string>${APP_GROUP}</string>
    </array>
  </dict>`,
            );
          } else if (ent.includes("</dict>")) {
            ent = ent.replace(
              "</dict>",
              `    <key>com.apple.security.application-groups</key>
    <array>
      <string>${APP_GROUP}</string>
    </array>
  </dict>`,
            );
          }
          fs.writeFileSync(entPath, ent);
        }
      }

      return cfg;
    },
  ]);

  return config;
}

module.exports = createRunOncePlugin(withLifeOSWidgets, "withLifeOSWidgets", "1.0.0");
