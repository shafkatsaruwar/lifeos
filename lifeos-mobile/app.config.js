/**
 * Expo app config. Merges app.json and ensures expo-updates is plugged in.
 * EAS_PROJECT_ID comes from EAS environment variables (or local .env) at build time.
 */
const appJson = require("./app.json");

const projectId =
  process.env.EAS_PROJECT_ID?.trim() ||
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim() ||
  appJson.expo?.extra?.eas?.projectId?.trim() ||
  "";

if (!projectId) {
  console.warn("[app.config] Missing EAS projectId — OTA updates disabled for this build.");
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
      eas: { ...(appJson.expo.extra?.eas || {}), projectId },
    },
  },
};
