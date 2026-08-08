/**
 * Expo app config. Prefer this over editing app.json for EAS Update fields.
 *
 * One-time: set EAS_PROJECT_ID (or EXPO_PUBLIC_EAS_PROJECT_ID) after
 * `npx eas-cli update:configure` / Expo dashboard → Project settings.
 * Until then, OTA is disabled so local Metro still works.
 */
const appJson = require("./app.json");

const projectId =
  process.env.EAS_PROJECT_ID?.trim() ||
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim() ||
  appJson.expo?.extra?.eas?.projectId?.trim() ||
  "";

const expo = {
  ...appJson.expo,
  runtimeVersion: {
    policy: "appVersion",
  },
  plugins: [...(appJson.expo.plugins || []), "expo-updates"],
  updates: projectId
    ? {
        url: `https://u.expo.dev/${projectId}`,
        checkAutomatically: "ON_LOAD",
        fallbackToCacheTimeout: 0,
      }
    : {
        enabled: false,
      },
  extra: {
    ...(appJson.expo.extra || {}),
    ...(projectId ? { eas: { projectId } } : {}),
  },
};

module.exports = { expo };
