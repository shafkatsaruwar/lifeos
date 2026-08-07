const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Keep Metro rooted on lifeos-mobile so the parent Next.js `app/` folder
// (and other monorepo packages) never get pulled into the iOS bundle.
config.projectRoot = __dirname;
config.watchFolders = [__dirname];
config.resolver.nodeModulesPaths = [path.resolve(__dirname, "node_modules")];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
