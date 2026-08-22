/**
 * Copies AddTaskIntent.swift into the LifeOS app target and registers it
 * in the Xcode project so Siri / Shortcuts can create tasks.
 */
const {
  createRunOncePlugin,
  withDangerousMod,
  withInfoPlist,
  withXcodeProject,
  IOSConfig,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const RELATIVE_SWIFT = "LifeOS/AddTaskIntent.swift";

function withLifeOSSiri(config) {
  config = withInfoPlist(config, (cfg) => {
    if (!cfg.modResults.NSSiriUsageDescription) {
      cfg.modResults.NSSiriUsageDescription =
        "LifeOS uses Siri so you can add tasks with your voice.";
    }
    return cfg;
  });

  config = withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const source = path.join(projectRoot, "targets/siri/AddTaskIntent.swift");
      const dest = path.join(projectRoot, "ios", RELATIVE_SWIFT);
      if (!fs.existsSync(source)) return cfg;
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(source, dest);
      return cfg;
    },
  ]);

  config = withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const projectName = cfg.modRequest.projectName || "LifeOS";

    // Skip if already linked (idempotent prebuild / re-run).
    const already = Object.values(project.pbxFileReferenceSection() || {}).some(
      (ref) => ref && typeof ref === "object" && ref.path === "AddTaskIntent.swift",
    );
    if (already) return cfg;

    try {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath: RELATIVE_SWIFT,
        groupName: projectName,
        project,
        verbose: true,
      });
    } catch (error) {
      // Fallback: try the LifeOS PBX group path used by Expo prebuild.
      console.warn("[withLifeOSSiri] addBuildSourceFileToGroup failed, retrying", error);
      try {
        project.addSourceFile(RELATIVE_SWIFT, null, project.findPBXGroupKey({ name: projectName }));
      } catch (error2) {
        console.warn("[withLifeOSSiri] could not link AddTaskIntent.swift", error2);
      }
    }
    return cfg;
  });

  return config;
}

module.exports = createRunOncePlugin(withLifeOSSiri, "withLifeOSSiri", "1.0.0");
