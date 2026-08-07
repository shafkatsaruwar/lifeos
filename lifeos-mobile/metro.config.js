const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Keep Metro rooted on lifeos-mobile so the parent Next.js tree is not watched.
config.projectRoot = __dirname;
config.watchFolders = [__dirname];

// Firebase Auth's React Native entry (getReactNativePersistence) only resolves
// correctly when Metro does not prefer package.json "exports" browser builds.
// See: https://docs.expo.dev/guides/using-firebase/
if (!config.resolver.sourceExts.includes("cjs")) {
  config.resolver.sourceExts.push("cjs");
}
config.resolver.unstable_enablePackageExports = false;

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
