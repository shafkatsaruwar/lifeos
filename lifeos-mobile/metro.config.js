const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Keep Metro rooted on lifeos-mobile so the parent Next.js tree is not watched.
config.projectRoot = __dirname;
config.watchFolders = [__dirname];

// Ignore the monorepo's Next.js `app/` directory if resolution ever walks up.
const parentApp = path.resolve(__dirname, "../app");
const previousBlockList = config.resolver.blockList;
config.resolver.blockList = previousBlockList
  ? Array.isArray(previousBlockList)
    ? [...previousBlockList, new RegExp(`${parentApp.replace(/[/\\]/g, "[/\\\\]")}(/|$)`)]
    : [previousBlockList, new RegExp(`${parentApp.replace(/[/\\]/g, "[/\\\\]")}(/|$)`)]
  : [new RegExp(`${parentApp.replace(/[/\\]/g, "[/\\\\]")}(/|$)`)];

module.exports = config;
