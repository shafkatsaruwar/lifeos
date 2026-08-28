/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "widget",
  name: "LifeOSWidgets",
  icon: "../../assets/icon.png",
  colors: {
    $accent: "#3B82F6",
    $widgetBackground: "#F7F6F3",
  },
  entitlements: {
    "com.apple.security.application-groups":
      config.ios?.entitlements?.["com.apple.security.application-groups"] ?? [
        "group.com.shafkatsaruwar.lifeos",
      ],
  },
});
