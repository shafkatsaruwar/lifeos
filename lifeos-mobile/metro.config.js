const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Keep Metro rooted on lifeos-mobile so the parent Next.js tree is not watched.
// Also watch shared Focus Enforcer pure modules under ../lib/focusEnforcer.
config.projectRoot = __dirname;
config.watchFolders = [
  __dirname,
  path.resolve(__dirname, "../lib"),
  path.resolve(__dirname, "../lib/focusEnforcer"),
  path.resolve(__dirname, "../lib/focusFlow"),
  path.resolve(__dirname, "../lib/masteros"),
];

// Firebase Auth's React Native entry (getReactNativePersistence) only resolves
// correctly when Metro does not prefer package.json "exports" browser builds.
// See: https://docs.expo.dev/guides/using-firebase/
if (!config.resolver.sourceExts.includes("cjs")) {
  config.resolver.sourceExts.push("cjs");
}
config.resolver.unstable_enablePackageExports = false;

// Force the RN build of @firebase/auth so AsyncStorage persistence is available.
// Without this, Metro can resolve the node/browser build and sessions reset on launch.
const firebaseAuthRn = path.resolve(__dirname, "node_modules/@firebase/auth/dist/rn/index.js");
const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "@firebase/auth" || moduleName === "@firebase/auth/dist/rn/index.js") {
    return { filePath: firebaseAuthRn, type: "sourceFile" };
  }
  if (typeof upstreamResolveRequest === "function") {
    return upstreamResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Ignore the monorepo's Next.js `app/` directory if resolution ever walks up.
const parentApp = path.resolve(__dirname, "../app");
const previousBlockList = config.resolver.blockList;
const parentAppBlock = new RegExp(`${parentApp.replace(/[/\\]/g, "[/\\\\]")}(/|$)`);
config.resolver.blockList = previousBlockList
  ? Array.isArray(previousBlockList)
    ? [...previousBlockList, parentAppBlock]
    : [previousBlockList, parentAppBlock]
  : [parentAppBlock];

module.exports = config;
