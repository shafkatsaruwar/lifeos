/**
 * Adopts UIKit scene lifecycle (required by iOS 27 SDK / Xcode 27).
 * Copies SceneDelegate + AppDelegate templates and registers the scene manifest.
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

const SCENE_REL = "LifeOS/SceneDelegate.swift";
const APP_DELEGATE_REL = "LifeOS/AppDelegate.swift";

function withLifeOSSceneLifecycle(config) {
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: "Default Configuration",
            UISceneDelegateClassName: "$(PRODUCT_MODULE_NAME).SceneDelegate",
          },
        ],
      },
    };
    return cfg;
  });

  config = withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const iosRoot = path.join(projectRoot, "ios");
      const templates = path.join(projectRoot, "targets/scene");

      for (const [srcName, destRel] of [
        ["SceneDelegate.swift", SCENE_REL],
        ["AppDelegate.swift", APP_DELEGATE_REL],
      ]) {
        const source = path.join(templates, srcName);
        const dest = path.join(iosRoot, destRel);
        if (!fs.existsSync(source)) continue;
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(source, dest);
      }
      return cfg;
    },
  ]);

  config = withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const projectName = cfg.modRequest.projectName || "LifeOS";

    const already = Object.values(project.pbxFileReferenceSection() || {}).some(
      (ref) => ref && typeof ref === "object" && ref.path === "SceneDelegate.swift",
    );
    if (already) return cfg;

    try {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath: SCENE_REL,
        groupName: projectName,
        project,
        verbose: true,
      });
    } catch (error) {
      console.warn("[withLifeOSSceneLifecycle] addBuildSourceFileToGroup failed, retrying", error);
      try {
        project.addSourceFile(SCENE_REL, null, project.findPBXGroupKey({ name: projectName }));
      } catch (error2) {
        console.warn("[withLifeOSSceneLifecycle] could not link SceneDelegate.swift", error2);
      }
    }
    return cfg;
  });

  return config;
}

module.exports = createRunOncePlugin(withLifeOSSceneLifecycle, "withLifeOSSceneLifecycle", "1.0.0");
