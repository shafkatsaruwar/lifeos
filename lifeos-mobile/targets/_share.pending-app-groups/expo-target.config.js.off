/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "share",
  name: "Share",
  displayName: "LifeOS",
  bundleIdentifier: ".Share",
  icon: "../../assets/icon.png",
  frameworks: ["UniformTypeIdentifiers"],
  deploymentTarget: "16.0",
  entitlements: {
    "com.apple.security.application-groups":
      config.ios?.entitlements?.["com.apple.security.application-groups"] ?? [
        "group.com.shafkatsaruwar.lifeos",
      ],
  },
});
