/**
 * Expo app config. Merges app.json and injects the real EAS project UUID from env.
 * GitHub Actions / EAS builds set EAS_PROJECT_ID (or EXPO_PUBLIC_EAS_PROJECT_ID).
 * Without it, OTA publishes fail with "Invalid UUID appId".
 */
const appJson = require("./app.json");

const PLACEHOLDER = "YOUR_EAS_PROJECT_ID";

const fromEnv =
  process.env.EAS_PROJECT_ID?.trim() ||
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim() ||
  "";

const fromAppJson = appJson.expo?.extra?.eas?.projectId?.trim() || "";

const projectId =
  fromEnv && fromEnv !== PLACEHOLDER
    ? fromEnv
    : fromAppJson && fromAppJson !== PLACEHOLDER
      ? fromAppJson
      : "";

if (!projectId) {
  console.warn(
    "[app.config] Missing EAS projectId — set EAS_PROJECT_ID (or fix expo.extra.eas.projectId). OTA publishes will fail.",
  );
}

const plugins = [...(appJson.expo.plugins || [])];
if (!plugins.includes("expo-updates")) plugins.push("expo-updates");

module.exports = {
  expo: {
    ...appJson.expo,
    plugins,
    runtimeVersion: appJson.expo.runtimeVersion || { policy: "appVersion" },
    updates: projectId
      ? {
          url: `https://u.expo.dev/${projectId}`,
          checkAutomatically: "ON_LOAD",
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
