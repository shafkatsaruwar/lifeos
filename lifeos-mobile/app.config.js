/**
 * Expo app config. Merges app.json and prefers a valid EAS project UUID from env.
 * Invalid env values (placeholders / slugs) are ignored so a baked app.json id wins.
 */
const appJson = require("./app.json");

const PLACEHOLDER = "YOUR_EAS_PROJECT_ID";
// Public Expo project UUID (also embedded in client updates URL).
const BAKED_EAS_PROJECT_ID = "[REDACTED]"; // pragma: allowlist secret
const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function validProjectId(value) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed || trimmed === PLACEHOLDER) return "";
  return UUID_RE.test(trimmed) ? trimmed : "";
}

const projectId =
  validProjectId(process.env.EAS_PROJECT_ID) ||
  validProjectId(process.env.EXPO_PUBLIC_EAS_PROJECT_ID) ||
  validProjectId(appJson.expo?.extra?.eas?.projectId) ||
  validProjectId(BAKED_EAS_PROJECT_ID) ||
  "";

if (!projectId) {
  console.warn(
    "[app.config] Missing EAS project UUID — set EAS_PROJECT_ID or expo.extra.eas.projectId. OTA publishes will fail.",
  );
}

const profile = (process.env.EAS_BUILD_PROFILE || "").trim();
const isDevClientProfile =
  profile === "development" || profile === "development-device";

const plugins = [...(appJson.expo.plugins || [])].filter(
  (plugin) => plugin !== "expo-dev-client",
);
if (!plugins.includes("expo-updates")) plugins.push("expo-updates");
// Keep expo-dev-client off production / preview binaries — its AppDelegate
// bootstrap window pattern regresses UIScene launch on iOS 26/27.
if (isDevClientProfile && !plugins.includes("expo-dev-client")) {
  plugins.splice(2, 0, "expo-dev-client");
}

module.exports = {
  expo: {
    ...appJson.expo,
    plugins,
    newArchEnabled: false,
    ios: {
      ...(appJson.expo.ios || {}),
      newArchEnabled: false,
    },
    runtimeVersion: appJson.expo.runtimeVersion || { policy: "appVersion" },
    // Keep updates.url so EAS CLI can still publish rollbacks for old binaries
    // (build 58). enabled:false removes ErrorRecovery from native binaries.
    updates: projectId
      ? {
          url: `https://u.expo.dev/${projectId}`,
          enabled: false,
          checkAutomatically: "NEVER",
          fallbackToCacheTimeout: 0,
        }
      : { enabled: false },
    extra: {
      ...(appJson.expo.extra || {}),
      eas: {
        ...(appJson.expo.extra?.eas || {}),
        projectId: projectId || PLACEHOLDER,
      },
    },
  },
};
