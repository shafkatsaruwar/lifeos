/**
 * Copies LifeOS home-screen WidgetKit Swift into the LiveActivity extension
 * (injected into LiveActivityWidget.swift so EAS always compiles it) and
 * ensures App Group entitlements exist on both targets.
 */
const {
  createRunOncePlugin,
  withEntitlementsPlist,
  withFinalizedMod,
} = require("@expo/config-plugins");
const { APP_GROUP, applyLifeOSWidgets } = require("../scripts/ensure-widget-app-group");

function withLiveActivityAppGroupConfig(config) {
  const bundleIdentifier = `${config.ios?.bundleIdentifier}.LiveActivity`;
  const extra = config.extra ?? {};
  const eas = extra.eas ?? {};
  const build = eas.build ?? {};
  const experimental = build.experimental ?? {};
  const iosExp = experimental.ios ?? {};
  const appExtensions = [...(iosExp.appExtensions ?? [])];

  const stamp = (ext) => {
    ext.entitlements = {
      ...(ext.entitlements ?? {}),
      "com.apple.security.application-groups": [APP_GROUP],
    };
    return ext;
  };

  let found = false;
  for (const ext of appExtensions) {
    if (ext.targetName === "LiveActivity" || ext.bundleIdentifier === bundleIdentifier) {
      stamp(ext);
      found = true;
    }
  }
  if (!found) {
    appExtensions.push(
      stamp({
        targetName: "LiveActivity",
        bundleIdentifier,
      }),
    );
  }

  config.extra = {
    ...extra,
    eas: {
      ...eas,
      build: {
        ...build,
        experimental: {
          ...experimental,
          ios: {
            ...iosExp,
            appExtensions,
          },
        },
      },
    },
  };
  return config;
}

function withLifeOSWidgets(config) {
  // Runs after expo-live-activity. Stamp App Groups onto every LiveActivity
  // appExtensions entry so EAS does not treat a duplicate as "turn App Groups off".
  config = withLiveActivityAppGroupConfig(config);

  config = withEntitlementsPlist(config, (cfg) => {
    const groups = cfg.modResults["com.apple.security.application-groups"] || [];
    if (!groups.includes(APP_GROUP)) {
      cfg.modResults["com.apple.security.application-groups"] = [...groups, APP_GROUP];
    }
    return cfg;
  });

  // finalized runs after expo-live-activity's withXcodeProject copies ios-files.
  // dangerous mods run first, so injecting there skips on a clean EAS prebuild.
  config = withFinalizedMod(config, [
    "ios",
    async (cfg) => {
      applyLifeOSWidgets(cfg.modRequest.projectRoot);
      return cfg;
    },
  ]);

  return config;
}

module.exports = createRunOncePlugin(withLifeOSWidgets, "withLifeOSWidgets", "1.3.0");
