/**
 * Production/preview binaries must not autolink expo-dev-client.
 * Plugin gating in app.config.js is not enough — CocoaPods still links
 * transitive expo-dev-* pods from package.json dependencies.
 */
const profile = (process.env.EAS_BUILD_PROFILE || "").trim();
const isDevClientProfile =
  profile === "development" || profile === "development-device";

const disableNative = { platforms: { ios: null, android: null } };

module.exports = {
  dependencies: isDevClientProfile
    ? {}
    : {
        "expo-dev-client": disableNative,
        "expo-dev-launcher": disableNative,
        "expo-dev-menu": disableNative,
        "expo-dev-menu-interface": disableNative,
      },
};
