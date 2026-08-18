/**
 * Copies LifeOS home-screen WidgetKit Swift into the LiveActivity extension
 * (injected into LiveActivityWidget.swift so EAS always compiles it) and
 * ensures App Group entitlements exist on both targets.
 */
const { createRunOncePlugin, withDangerousMod, withEntitlementsPlist } = require("@expo/config-plugins");
const { APP_GROUP, applyLifeOSWidgets } = require("../scripts/ensure-widget-app-group");

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
      applyLifeOSWidgets(cfg.modRequest.projectRoot);
      return cfg;
    },
  ]);

  return config;
}

module.exports = createRunOncePlugin(withLifeOSWidgets, "withLifeOSWidgets", "1.1.0");
