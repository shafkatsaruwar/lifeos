/**
 * EAS / local prep for WidgetKit home-screen widgets.
 *
 * Home widgets are injected into LiveActivityWidget.swift (a file Xcode always
 * compiles). Relying on LifeOSHomeWidgets.swift failed on EAS — that file was
 * listed in the pbxproj but never appeared in the Swift compile inputs.
 */
const fs = require("fs");
const path = require("path");

const APP_GROUP = "group.com.shafkatsaruwar.lifeos";
const BEGIN = "// MARK: - BEGIN LifeOS Home Widgets (generated)";
const END = "// MARK: - END LifeOS Home Widgets (generated)";

const ENTITLEMENTS = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>com.apple.security.application-groups</key>
    <array>
      <string>${APP_GROUP}</string>
    </array>
  </dict>
</plist>
`;

const WIDGET_BUNDLE = `import SwiftUI
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
`;

function ensureEntitlements(filePath) {
  if (!fs.existsSync(path.dirname(filePath))) {
    console.log(`[widgets] skip missing dir for ${filePath}`);
    return;
  }
  const prev = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  if (prev.includes(APP_GROUP)) {
    console.log(`[widgets] App Group already present in ${filePath}`);
    return;
  }
  fs.writeFileSync(filePath, ENTITLEMENTS);
  console.log(`[widgets] wrote App Group entitlements → ${filePath}`);
}

function stripMainBundle(swiftSource) {
  const marker = "@main\nstruct LifeOSWidgetsBundle";
  const idx = swiftSource.indexOf(marker);
  if (idx === -1) return swiftSource;
  return `${swiftSource.slice(0, idx).trimEnd()}\n`;
}

function stripGenerated(content) {
  const start = content.indexOf(BEGIN);
  if (start === -1) return content.trimEnd();
  const end = content.indexOf(END, start);
  if (end === -1) return content.slice(0, start).trimEnd();
  return `${content.slice(0, start).trimEnd()}\n${content.slice(end + END.length).trimStart()}`.trimEnd();
}

function ensureWidgetSources(root) {
  const liveDir = path.join(root, "ios/LiveActivity");
  const source = path.join(root, "targets/widget/LifeOSWidget.swift");
  const hostPath = path.join(liveDir, "LiveActivityWidget.swift");
  const bundlePath = path.join(liveDir, "LiveActivityWidgetBundle.swift");
  const orphanPath = path.join(liveDir, "LifeOSHomeWidgets.swift");

  if (!fs.existsSync(liveDir)) {
    console.log("[widgets] ios/LiveActivity missing — skip Swift inject");
    return false;
  }
  if (!fs.existsSync(source)) {
    console.error(`[widgets] missing widget source: ${source}`);
    throw new Error(`missing widget source: ${source}`);
  }
  if (!fs.existsSync(hostPath)) {
    console.error(`[widgets] missing host file: ${hostPath}`);
    throw new Error(`missing host file: ${hostPath}`);
  }

  let widgets = stripMainBundle(fs.readFileSync(source, "utf8"));
  // Host file already imports SwiftUI / WidgetKit / ActivityKit.
  widgets = widgets
    .replace(/^import SwiftUI\s*/m, "")
    .replace(/^import WidgetKit\s*/m, "")
    .trim();

  for (const name of [
    "LifeOSAttentionWidget",
    "LifeOSNowFocusWidget",
    "LifeOSTasksWidget",
    "LifeOSDeadlineWidget",
    "LifeOSCalendarWidget",
    "LifeOSTodayWidget",
  ]) {
    if (!widgets.includes(`struct ${name}`)) {
      throw new Error(`[widgets] missing ${name} in source`);
    }
  }

  const hostBase = stripGenerated(fs.readFileSync(hostPath, "utf8"));
  const injected = `${hostBase}\n\n${BEGIN}\n${widgets}\n${END}\n`;
  fs.writeFileSync(hostPath, injected);
  console.log(`[widgets] injected home widgets into ${hostPath} (${injected.length} bytes)`);

  fs.writeFileSync(bundlePath, WIDGET_BUNDLE);
  console.log(`[widgets] wrote ${bundlePath}`);

  // Keep orphan file empty so a stale pbxproj entry can't redefine types.
  fs.writeFileSync(
    orphanPath,
    "// Generated placeholder — home widgets live in LiveActivityWidget.swift\n",
  );
  console.log(`[widgets] neutralized ${orphanPath}`);
  return true;
}

function removeHomeWidgetsFromPbxproj(root) {
  const pbxPath = path.join(root, "ios/LifeOS.xcodeproj/project.pbxproj");
  if (!fs.existsSync(pbxPath)) return;
  const original = fs.readFileSync(pbxPath, "utf8");
  const next = original.replace(
    /^\s*D8D0859D71B74BA794B1065C \/\* LifeOSHomeWidgets\.swift in Sources \*\/,\n/m,
    "",
  );
  if (next !== original) {
    fs.writeFileSync(pbxPath, next);
    console.log("[widgets] removed LifeOSHomeWidgets.swift from LiveActivity Sources");
  } else {
    console.log("[widgets] LifeOSHomeWidgets.swift already absent from Sources");
  }
}

function applyLifeOSWidgets(root) {
  ensureEntitlements(path.join(root, "ios/LiveActivity/LiveActivity.entitlements"));
  ensureWidgetSources(root);
  removeHomeWidgetsFromPbxproj(root);

  const mainEnt = path.join(root, "ios/LifeOS/LifeOS.entitlements");
  if (fs.existsSync(mainEnt)) {
    let xml = fs.readFileSync(mainEnt, "utf8");
    if (!xml.includes(APP_GROUP)) {
      if (xml.includes("<dict/>") || /<dict>\s*<\/dict>/.test(xml)) {
        fs.writeFileSync(mainEnt, ENTITLEMENTS);
        console.log(`[widgets] rewrote empty main entitlements → ${mainEnt}`);
      } else if (xml.includes("</dict>")) {
        xml = xml.replace(
          "</dict>",
          `    <key>com.apple.security.application-groups</key>
    <array>
      <string>${APP_GROUP}</string>
    </array>
  </dict>`,
        );
        fs.writeFileSync(mainEnt, xml);
        console.log(`[widgets] injected App Group into ${mainEnt}`);
      }
    }
  }
}

module.exports = {
  APP_GROUP,
  applyLifeOSWidgets,
  ensureWidgetSources,
};

if (require.main === module) {
  applyLifeOSWidgets(process.cwd());
}
